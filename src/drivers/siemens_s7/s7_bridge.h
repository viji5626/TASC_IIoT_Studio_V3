/**
 * TASC IIoT Studio — Siemens S7 (Snap7 / S7Comm) Native C Bridge Header
 *
 * Standalone clean-room C module linking against open-source Snap7.
 * Provides ISO-on-TCP (RFC 1006) / COTP connection handshakes and S7Comm read/write.
 */

#ifndef SIEMENS_S7_BRIDGE_H
#define SIEMENS_S7_BRIDGE_H

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    S7_AREA_DB = 0x84,
    S7_AREA_I  = 0x81,
    S7_AREA_Q  = 0x82,
    S7_AREA_M  = 0x83,
    S7_AREA_T  = 0x1D,
    S7_AREA_C  = 0x1C
} S7MemoryArea;

typedef struct {
    char connectionId[64];
    char host[128];
    int port;                  /* Standard: 102 */
    int rack;                  /* Standard: 0 */
    int slot;                  /* Standard: 1 (S7-1200/1500) or 2 (S7-300) */
    uint16_t localTsap;        /* e.g. 0x1000 or 0x0100 for S7-200/LOGO */
    uint16_t remoteTsap;       /* e.g. 0x1000 or 0x0200 for S7-200/LOGO */
    int pduLength;             /* Negotiated: 240, 480, 960 */
    int connectTimeoutMs;
    void* clientHandle;
    bool isConnected;
    char lastError[256];
} S7ClientConfig;

typedef struct {
    char tagId[64];
    char s7Address[64];        /* e.g. "DB1.DBD0", "M0.0" */
    S7MemoryArea area;
    int dbNumber;
    int byteOffset;
    int bitOffset;
    int sizeBytes;             /* 1 for Byte, 2 for Word/Int, 4 for DWord/DInt/Real */
    char dataType[16];         /* "float", "int16", "int32", "boolean", "string" */
} S7TagRequest;

typedef struct {
    char tagId[64];
    double numericValue;
    bool boolValue;
    char stringValue[128];
    bool isSuccess;
    char quality[32];
    uint64_t timestampMs;
    char errorMessage[128];
} S7ReadResult;

/* ─── Lifecycle Declarations ───────────────────────────────────────────────── */

int siemens_init(void);
int siemens_connect(S7ClientConfig* config);
int siemens_poll(S7ClientConfig* config, const S7TagRequest* tag, S7ReadResult* result);
int siemens_write(S7ClientConfig* config, const S7TagRequest* tag, const char* valueStr);
void siemens_disconnect(S7ClientConfig* config);
void siemens_shutdown(void);

#ifdef __cplusplus
}
#endif

#endif /* SIEMENS_S7_BRIDGE_H */
