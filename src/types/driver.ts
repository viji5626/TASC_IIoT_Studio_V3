export type DriverProtocol =
  | 'opcua'
  | 'opcda'
  | 'modbus_tcp'
  | 'modbus_rtu'
  | 'iec61850'
  | 's7'
  | 'melsec'
  | 'rs485'
  | 'rs232'
  | 'usb_serial'
  | 'tcp_custom'
  | 'custom';

export type DriverTagSourceType = 'browsed' | 'generated' | 'manual' | 'imported';
export type DriverAccessType = 'read' | 'write' | 'read-write';
export type ModbusRegisterType = 'coil' | 'discrete_input' | 'holding_register' | 'input_register';
export type DriverTagDataType = 'boolean' | 'int16' | 'int32' | 'uint16' | 'uint32' | 'float' | 'double' | 'string';
export type DriverTagQuality = 'good' | 'bad' | 'uncertain' | 'unknown';

export interface DriverTagScaling {
  enabled: boolean;
  rawMin: number;
  rawMax: number;
  engMin: number;
  engMax: number;
  clamp?: boolean;
}

export interface DriverConnection {
  connectionId: string;
  connectionName: string;
  protocol: DriverProtocol;
  enabled: boolean;
  // Siemens S7 Driver Settings
  s7Model?: 's7_300' | 's7_400' | 's7_1200' | 's7_1500' | 's7_200' | 'logo';
  rack?: number;             // Default: 0
  slot?: number;             // Default: 1 (S7-1200/1500) or 2 (S7-300/400)
  localTsap?: string;        // For S7-200 / CP243-1 (e.g. "0x1000", "01.00")
  remoteTsap?: string;       // For S7-200 / CP243-1 (e.g. "0x1000", "02.00")
  pduSize?: number;          // Negotiated PDU size (default: 240 / 480)
  // Mitsubishi MELSEC / SLMP Driver Settings
  melsecSeries?: 'iq_r' | 'iq_f' | 'q_series' | 'l_series' | 'fx_series';
  melsecFrame?: '3e_binary' | '3e_ascii' | '1e_binary' | '4e_binary';
  networkNumber?: number;    // Default: 0
  pcNumber?: number;         // Default: 255 (0xFF)
  destinationModuleIoNumber?: number; // Default: 0x03FF (1023)
  destinationModuleStationNumber?: number; // Default: 0
  // IEC 61850 (MMS & GOOSE) Substation Driver Settings
  iedName?: string;
  apTitle?: string;
  aeQualifier?: number;
  mmsPort?: number;
  enableGoose?: boolean;
  gooseInterface?: string;
  gooseAppId?: string;
  reportControlBlocks?: string[];
  // OPC UA / OPC DA Advanced Configuration
  endpointUrl?: string;
  secondaryEndpointUrl?: string;
  overrideThumbprint?: string;
  preferredEndpoint?: string;
  securityFallback?: 'no_security' | 'max_security';
  disableDomainCheck?: boolean;
  browsingMode?: 'browse_path' | 'node_id';
  // OPC UA Security & Encryption
  securityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy?: 'None' | 'Basic128Rsa15' | 'Basic256' | 'Basic256Sha256' | 'Aes128_Sha256_RsaOaep' | 'Aes256_Sha256_RsaPss';
  // OPC UA Authentication
  authMode?: 'anonymous' | 'username_password' | 'certificate';
  username?: string;
  password?: string;
  userCertificateThumbprint?: string;
  userCertificatePem?: string;
  userPrivateKeyPem?: string;
  // OPC UA Subscription & Telemetry
  enableSubscription?: boolean;
  subscriptionMode?: 'read_attributes' | 'monitor_items';
  publishIntervalMs?: number;
  maxQueueSize?: number;
  readMaximumAgeMs?: number;
  maxPointsPerBatch?: number;
  browseMaxItemsAtATime?: number;
  workPeriodMs?: number;
  logComplianceErrors?: boolean;
  // OPC UA Timeouts
  requestTimeoutMs?: number;
  sessionTimeoutMs?: number;
  connectTimeoutMs?: number;
  // TCP / Modbus TCP Channel Settings
  host?: string;
  port?: number;
  unitId?: number;
  timeout?: number;
  retryInterval?: number;
  tcpSockets?: number;
  reopenSockets?: boolean;
  sendTimeoutMs?: number;
  recvTimeoutMs?: number;
  sendRecvDelayMs?: number;
  frameRetryCount?: number;
  // Addressing & Swapping Options
  zeroBasedAddressing?: boolean;
  zeroBasedBitAddressing?: boolean;
  byteSwap?: boolean;
  wordSwap?: boolean;
  dwordSwap?: boolean;
  useSingleCoilWrite?: boolean;
  useSingleRegisterWrite?: boolean;
  // Serial / RS-485 / RS-232 / USB / Modbus RTU
  portPath?: string;
  baudRate?: number;
  dataBits?: 5 | 6 | 7 | 8;
  parity?: 'none' | 'even' | 'odd' | 'mark' | 'space';
  stopBits?: 1 | 1.5 | 2;
  flowControl?: 'none' | 'rts/cts' | 'xon/xoff';
  rtsToggle?: boolean;
  // Runtime status (not persisted in snapshot)
  connected?: boolean;
  connectionState?: 'connected' | 'reconnecting' | 'disconnected' | 'stale' | 'unavailable' | 'error';
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  lastError?: string;
  retryCount?: number;
  consecutiveFailureCount?: number;
}

export interface DriverTag {
  tagId: string;
  tagName: string;
  protocol: DriverProtocol;
  sourceType: DriverTagSourceType;
  connectionId: string;
  // Siemens S7 Addressing
  s7Area?: 'DB' | 'I' | 'Q' | 'M' | 'T' | 'C';
  dbNumber?: number;           // e.g. 1 for DB1
  byteOffset?: number;         // e.g. 0, 4, 10
  bitOffset?: number;          // e.g. 0..7
  s7Address?: string;          // Formatted e.g. "DB1.DBD0", "DB1.DBW4", "M0.0", "IW0", "QD0"
  // Mitsubishi MELSEC Addressing
  melsecDeviceCode?: 'D' | 'W' | 'M' | 'X' | 'Y' | 'R' | 'ZR' | 'SD' | 'SM' | 'TN' | 'CN' | number;
  melsecAddress?: string;      // Formatted e.g. "D100", "M100", "X000", "Y000", "W100", "ZR1000"
  melsecHeadDeviceNumber?: number; // e.g. 100
  // IEC 61850 Logical Device / Logical Node / Data Attribute addressing
  logicalDevice?: string;       // e.g. "LD0", "PROT", "CTRL"
  logicalNode?: string;         // e.g. "MMXU1", "CSWI1", "XCBR1", "PTOC1"
  functionalConstraint?: string;// e.g. "MX", "ST", "CO", "SP", "SV", "CF"
  dataObject?: string;          // e.g. "TotW", "A", "PhV", "Pos", "Op"
  dataAttribute?: string;       // e.g. "phsA.cVal.mag.f", "stVal", "q", "t"
  iecPath?: string;             // Full path e.g. "LD0/MMXU1.A.phsA.cVal.mag.f"
  // OPC UA
  nodeId?: string;
  namespace?: number;
  browsePath?: string;
  // OPC DA
  itemId?: string;
  // Modbus / TCP / Serial
  channel?: string;
  deviceId?: string;
  slaveId?: number;
  registerType?: ModbusRegisterType;
  address?: number;
  wordCount?: number;
  // Common
  dataType: DriverTagDataType;
  accessType: DriverAccessType;
  byteSwap?: boolean;
  wordSwap?: boolean;
  scaling?: DriverTagScaling;
  pollRate: number;
  deadband?: number;
  unit?: string;
  description?: string;
  category?: string;
  enabled: boolean;
  // Runtime (not persisted)
  quality?: DriverTagQuality;
  runtimeState?: 'healthy' | 'stale' | 'bad' | 'unavailable';
  lastValue?: any;
  lastGoodValue?: any;
  lastGoodTimestamp?: string;
  lastReadAttemptAt?: string;
  lastReadSuccessAt?: string;
  lastErrorAt?: string;
  staleSince?: string;
  qualityCode?: string;
  qualityText?: string;
  lastTimestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DriverTagValue {
  tagId: string;
  tagName?: string;
  panelId: string;
  value: any;
  quality: DriverTagQuality;
  timestamp: string;
  // Additive Runtime Health Metadata
  lastGoodValue?: any;
  lastGoodTimestamp?: string;
  connectionState?: 'connected' | 'reconnecting' | 'disconnected' | 'stale' | 'unavailable' | 'error';
  qualityCode?: string;
  qualityText?: string;
}

export interface DriverConnectionHealthPayload {
  type: 'connection_health';
  connectionId: string;
  connectionState: 'connected' | 'reconnecting' | 'disconnected' | 'stale' | 'unavailable' | 'error';
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  lastError?: string;
  retryCount?: number;
  consecutiveFailureCount?: number;
}
