/**
 * TASC IIoT Studio — Siemens S7 (Snap7 / S7Comm) Native C Bridge Source
 *
 * Implements S7Comm client over ISO-on-TCP (RFC 1006 / TCP Port 102)
 * Compatible with S7-300, S7-400, S7-1200, and S7-1500 (PUT/GET enabled).
 */

#include "s7_bridge.h"
#include <time.h>

#ifdef USE_SNAP7
#include "snap7.h"
#endif

static bool g_s7_initialized = false;

static uint64_t get_time_ms(void) {
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    return (uint64_t)(ts.tv_sec) * 1000 + (uint64_t)(ts.tv_nsec) / 1000000;
}

int siemens_init(void) {
    g_s7_initialized = true;
    fprintf(stderr, "[Siemens_S7_Bridge] S7Comm protocol subsystem initialized.\n");
    return 0;
}

int siemens_connect(S7ClientConfig* config) {
    if (!config || strlen(config->host) == 0) return -1;

    int port = config->port > 0 ? config->port : 102;
    int rack = config->rack >= 0 ? config->rack : 0;
    int slot = config->slot >= 0 ? config->slot : 1;

    fprintf(stderr, "[Siemens_S7_Bridge] Connecting to S7 PLC at %s:%d (Rack: %d, Slot: %d)...\n",
            config->host, port, rack, slot);

#ifdef USE_SNAP7
    S7Object client = Cli_Create();
    if (!client) {
        snprintf(config->lastError, sizeof(config->lastError), "Failed to allocate Snap7 client object");
        return -2;
    }

    int res;
    if (config->localTsap > 0 && config->remoteTsap > 0) {
        Cli_SetConnectionParams(client, config->host, config->localTsap, config->remoteTsap);
        res = Cli_Connect(client);
    } else {
        res = Cli_ConnectTo(client, config->host, rack, slot);
    }

    if (res != 0) {
        char errBuf[256];
        Cli_ErrorText(res, errBuf, sizeof(errBuf));
        snprintf(config->lastError, sizeof(config->lastError), "S7 Connect Error (%d): %s", res, errBuf);
        Cli_Destroy(&client);
        config->isConnected = false;
        return -3;
    }

    config->clientHandle = (void*)client;
    config->isConnected = true;
    config->pduLength = Cli_GetPduLength(client);
    fprintf(stderr, "[Siemens_S7_Bridge] ✓ Connected to S7 PLC at %s (Negotiated PDU: %d bytes)\n",
            config->host, config->pduLength);
    return 0;
#else
    /* Dynamic mock simulation mode when compiled without native snap7 dynamic lib */
    config->clientHandle = (void*)0x57;
    config->isConnected = true;
    config->pduLength = 480;
    fprintf(stderr, "[Siemens_S7_Bridge] [MOCK] Connected to simulated S7 PLC at %s:%d (Rack %d, Slot %d)\n",
            config->host, port, rack, slot);
    return 0;
#endif
}

int siemens_poll(S7ClientConfig* config, const S7TagRequest* tag, S7ReadResult* result) {
    if (!config || !tag || !result) return -1;

    memset(result, 0, sizeof(S7ReadResult));
    strncpy(result->tagId, tag->tagId, sizeof(result->tagId) - 1);
    result->timestampMs = get_time_ms();

    if (!config->isConnected) {
        result->isSuccess = false;
        strncpy(result->quality, "PLC Disconnected", sizeof(result->quality) - 1);
        strncpy(result->errorMessage, "PLC not connected", sizeof(result->errorMessage) - 1);
        return -2;
    }

#ifdef USE_SNAP7
    S7Object client = (S7Object)config->clientHandle;
    uint8_t buffer[64] = {0};
    int size = tag->sizeBytes > 0 ? tag->sizeBytes : 4;

    int res = Cli_ReadArea(client, tag->area, tag->dbNumber, tag->byteOffset, size, S7WLByte, buffer);
    if (res != 0) {
        result->isSuccess = false;
        strncpy(result->quality, "Read Error", sizeof(result->quality) - 1);
        snprintf(result->errorMessage, sizeof(result->errorMessage), "Cli_ReadArea failed with code %d", res);
        return -3;
    }

    result->isSuccess = true;
    strncpy(result->quality, "Good", sizeof(result->quality) - 1);

    if (strcmp(tag->dataType, "boolean") == 0) {
        uint8_t b = buffer[0];
        result->boolValue = (b & (1 << tag->bitOffset)) != 0;
        result->numericValue = result->boolValue ? 1.0 : 0.0;
    } else if (strcmp(tag->dataType, "int16") == 0) {
        int16_t val = (int16_t)((buffer[0] << 8) | buffer[1]);
        result->numericValue = (double)val;
    } else if (strcmp(tag->dataType, "int32") == 0) {
        int32_t val = (int32_t)((buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3]);
        result->numericValue = (double)val;
    } else if (strcmp(tag->dataType, "float") == 0) {
        uint32_t raw = ((uint32_t)buffer[0] << 24) | ((uint32_t)buffer[1] << 16) | ((uint32_t)buffer[2] << 8) | (uint32_t)buffer[3];
        float fVal;
        memcpy(&fVal, &raw, sizeof(float));
        result->numericValue = (double)fVal;
    }
    return 0;
#else
    /* Mock simulation telemetry values */
    result->isSuccess = true;
    strncpy(result->quality, "Good (Simulated)", sizeof(result->quality) - 1);

    if (strcmp(tag->dataType, "boolean") == 0) {
        result->boolValue = true;
        result->numericValue = 1.0;
    } else if (strstr(tag->s7Address, "DBD") || strcmp(tag->dataType, "float") == 0) {
        result->numericValue = 72.4 + (rand() % 40) / 10.0;
    } else {
        result->numericValue = 1450.0 + (rand() % 50);
    }
    return 0;
#endif
}

int siemens_write(S7ClientConfig* config, const S7TagRequest* tag, const char* valueStr) {
    if (!config || !tag || !valueStr) return -1;

#ifdef USE_SNAP7
    if (!config->isConnected || !config->clientHandle) return -2;
    S7Object client = (S7Object)config->clientHandle;

    uint8_t buffer[8] = {0};
    int size = tag->sizeBytes > 0 ? tag->sizeBytes : 4;

    if (strcmp(tag->dataType, "boolean") == 0) {
        bool b = (strcmp(valueStr, "true") == 0 || strcmp(valueStr, "1") == 0);
        int bitVal = b ? 1 : 0;
        int res = Cli_WriteArea(client, tag->area, tag->dbNumber, (tag->byteOffset * 8) + tag->bitOffset, 1, S7WLBit, &bitVal);
        return res;
    } else if (strcmp(tag->dataType, "float") == 0) {
        float fVal = (float)atof(valueStr);
        uint32_t raw;
        memcpy(&raw, &fVal, sizeof(float));
        buffer[0] = (raw >> 24) & 0xFF;
        buffer[1] = (raw >> 16) & 0xFF;
        buffer[2] = (raw >> 8) & 0xFF;
        buffer[3] = raw & 0xFF;
        return Cli_WriteArea(client, tag->area, tag->dbNumber, tag->byteOffset, 4, S7WLByte, buffer);
    }
    return 0;
#else
    fprintf(stderr, "[Siemens_S7_Bridge] [MOCK] Write %s = %s\n", tag->s7Address, valueStr);
    return 0;
#endif
}

void siemens_disconnect(S7ClientConfig* config) {
    if (!config) return;
#ifdef USE_SNAP7
    if (config->clientHandle) {
        S7Object client = (S7Object)config->clientHandle;
        Cli_Disconnect(client);
        Cli_Destroy(&client);
        config->clientHandle = NULL;
    }
#else
    config->clientHandle = NULL;
#endif
    config->isConnected = false;
    fprintf(stderr, "[Siemens_S7_Bridge] Disconnected S7 connection %s\n", config->connectionId);
}

void siemens_shutdown(void) {
    g_s7_initialized = false;
    fprintf(stderr, "[Siemens_S7_Bridge] S7 subsystem shutdown complete.\n");
}
