/**
 * TASC IIoT Studio — Mitsubishi MELSEC / SLMP (MC Protocol) Native C Bridge Header
 *
 * Standalone clean-room C module implementing MC Protocol 3E Binary Frame stack.
 * Operates over TCP (port 5007) and UDP (port 5006).
 */

#ifndef MELSEC_BRIDGE_H
#define MELSEC_BRIDGE_H

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    MELSEC_FRAME_3E_BINARY = 0,
    MELSEC_FRAME_3E_ASCII  = 1,
    MELSEC_FRAME_1E_BINARY = 2,
    MELSEC_FRAME_4E_BINARY = 3
} MelsecFrameType;

typedef struct {
    char connectionId[64];
    char host[128];
    int port;                  /* Standard: 5007 (TCP) / 5006 (UDP) */
    MelsecFrameType frameType;
    uint8_t networkNumber;     /* Standard: 0 */
    uint8_t pcNumber;          /* Standard: 255 (0xFF) */
    uint16_t destModuleIo;     /* Standard: 0x03FF */
    uint8_t destStation;       /* Standard: 0 */
    int connectTimeoutMs;
    int socketFd;
    bool isConnected;
    char lastError[256];
} MelsecClientConfig;

typedef struct {
    char tagId[64];
    char melsecAddress[64];    /* e.g. "D100", "M100", "X0", "Y0", "W100" */
    uint8_t deviceCode;        /* 0xA8 for D, 0x90 for M, etc. */
    bool isBitDevice;
    uint32_t headDeviceNumber;
    int wordCount;
    char dataType[16];         /* "float", "int16", "int32", "boolean", "string" */
} MelsecTagRequest;

typedef struct {
    char tagId[64];
    double numericValue;
    bool boolValue;
    char stringValue[128];
    bool isSuccess;
    char quality[32];
    uint64_t timestampMs;
    char errorMessage[128];
} MelsecReadResult;

/* ─── Lifecycle Declarations ───────────────────────────────────────────────── */

int mitsubishi_init(void);
int mitsubishi_connect(MelsecClientConfig* config);
int mitsubishi_poll(MelsecClientConfig* config, const MelsecTagRequest* tag, MelsecReadResult* result);
int mitsubishi_write(MelsecClientConfig* config, const MelsecTagRequest* tag, const char* valueStr);
void mitsubishi_disconnect(MelsecClientConfig* config);
void mitsubishi_shutdown(void);

#ifdef __cplusplus
}
#endif

#endif /* MELSEC_BRIDGE_H */
