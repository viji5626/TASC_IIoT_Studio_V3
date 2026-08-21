/**
 * TASC IIoT Studio — IEC 61850 Substation & Smart Grid Driver Bridge
 *
 * Standalone clean-room sidecar process linking against open-source libIEC61850.
 * Operates over standard OS IPC / JSON-RPC to provide absolute GPLv3 licensing
 * isolation from the core proprietary HMI software stack.
 *
 * Capabilities:
 *  - MMS Client: Connects to remote IEDs (Relays, RTUs, PMUs, Bay Controllers)
 *  - Dynamic Model Discovery: Enumerates Logical Devices, Logical Nodes, and Data Objects
 *  - Cyclical FC Polling: Reads Measurands (MX), Status (ST), Setpoints (SP) with Quality/Time
 *  - MMS Controls: Operates circuit breakers (XCBR), switches (CSWI), setpoints (SP)
 *  - GOOSE Subscriber: Subscribes to high-speed Layer 2 Ethernet multicast protection trips
 */

#ifndef IEC61850_BRIDGE_H
#define IEC61850_BRIDGE_H

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ─── Data Structures & Enums ──────────────────────────────────────────────── */

typedef enum {
    IEC61850_STATUS_DISCONNECTED = 0,
    IEC61850_STATUS_CONNECTING   = 1,
    IEC61850_STATUS_CONNECTED    = 2,
    IEC61850_STATUS_ERROR        = 3
} Iec61850ConnectionStatus;

typedef enum {
    IEC61850_QUALITY_GOOD        = 0,
    IEC61850_QUALITY_INVALID     = 1,
    IEC61850_QUALITY_QUESTIONABLE= 2,
    IEC61850_QUALITY_OVERFLOW    = 3
} Iec61850QualityCode;

typedef struct {
    char connectionId[64];
    char host[128];
    int port;
    char iedName[64];
    char apTitle[64];
    int aeQualifier;
    int requestTimeoutMs;
    int connectTimeoutMs;
    bool enableGoose;
    char gooseInterface[32];
    char gooseAppId[16];
    void* iedConnectionHandle;
    Iec61850ConnectionStatus status;
    char lastError[256];
} Iec61850ClientConfig;

typedef struct {
    char tagId[64];
    char connectionId[64];
    char iecPath[128];             /* e.g. "LD0/MMXU1.A.phsA.cVal.mag.f" */
    char functionalConstraint[8];  /* e.g. "MX", "ST", "CO", "SP" */
    char dataType[16];             /* "float", "int32", "boolean", "string" */
    int pollRateMs;
} Iec61850TagSubscription;

typedef struct {
    char tagId[64];
    char connectionId[64];
    double numericValue;
    bool boolValue;
    char stringValue[128];
    Iec61850QualityCode quality;
    char qualityText[32];
    uint64_t timestampMs;
    bool isSuccess;
    char errorMessage[128];
} Iec61850ReadResult;

/* ─── Core Function Declarations ───────────────────────────────────────────── */

/**
 * Initializes the IEC 61850 driver runtime, memory pools, and signal handlers.
 * @return 0 on success, negative error code on failure.
 */
int driver_init(void);

/**
 * Establishes an MMS client connection to a target Intelligent Electronic Device (IED).
 * @param config Pointer to IED connection configuration.
 * @return 0 on success, non-zero error code if connection fails.
 */
int ied_connect(Iec61850ClientConfig* config);

/**
 * Disconnects an active MMS connection and releases network socket handles.
 * @param config Pointer to IED connection configuration.
 */
void ied_disconnect(Iec61850ClientConfig* config);

/**
 * Reads a single IEC 61850 Data Attribute from an IED via MMS.
 * @param config Pointer to active connection.
 * @param tag Pointer to tag subscription definition.
 * @param result Pointer to result structure to populate.
 * @return 0 on success, negative error code on failure.
 */
int ied_read_attribute(Iec61850ClientConfig* config, const Iec61850TagSubscription* tag, Iec61850ReadResult* result);

/**
 * Writes/Operates a control object or setpoint in an IED via MMS.
 * @param config Pointer to active connection.
 * @param iecPath Target Data Attribute path (e.g. "LD0/CSWI1.Pos.Oper.ctlVal").
 * @param fc Functional constraint (e.g. "CO" or "SP").
 * @param valueString String representation of value to write.
 * @return 0 on success, non-zero error code on failure.
 */
int ied_write_attribute(Iec61850ClientConfig* config, const char* iecPath, const char* fc, const char* valueString);

/**
 * Initializes the Layer 2 Ethernet GOOSE subscriber worker.
 * @param interfaceName Network interface name (e.g. "eth0" or "enp3s0").
 * @param appId Optional GOOSE AppID filter (e.g. "0x0001").
 * @return 0 on success, non-zero error code on failure.
 */
int goose_subscriber_init(const char* interfaceName, const char* appId);

/**
 * Gracefully shuts down all active IED connections and terminates the driver.
 */
void driver_shutdown(void);

#ifdef __cplusplus
}
#endif

#endif /* IEC61850_BRIDGE_H */
