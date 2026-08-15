export enum PanelType {
  GAUGE = 'gauge',
  LED = 'led',
  LOG = 'log',
  BUTTON = 'button',
  SWITCH = 'switch',
  SLIDER = 'slider',
  TEXT_INPUT = 'text_input',
  TEXT_OUTPUT = 'text_output',
  NODE_STATUS = 'node_status',
  COMBO_BOX = 'combo_box',
  RADIO_BUTTONS = 'radio_buttons',
  MULTI_STATE = 'multi_state',
  PROGRESS = 'progress',
  COLOR_PICKER = 'color_picker',
  DATE_PICKER = 'date_picker',
  LINE_GRAPH = 'line_graph',
  STATIC_TEXT = 'static_text',
  SCREEN_JUMP = 'screen_jump',
  IMAGE = 'image',
  CLOCK = 'clock',
  PIPE = 'pipe',
  SHAPE = 'shape',
  ALARM_LOG = 'alarm_log'
}

export enum AppView {
  DASHBOARD = 'dashboard',
  WEB_HMI = 'web_hmi',
  CONNECTIONS = 'connections',
  ADD_CONNECTION = 'add_connection',
  LAYOUT_EDITOR = 'layout_editor',
  ADD_DASHBOARD = 'add_dashboard',
  SETTINGS = 'settings',
  BACKUP = 'backup',
  TOPIC_MANAGER = 'topic_manager',
  TAG_MANAGER = 'tag_manager',
  DRIVER_CONNECTIONS = 'driver_connections',
  DRIVER_TAG_MANAGER = 'driver_tag_manager',
  OPC_UA_BROWSER = 'opc_ua_browser',
  DRIVER_DIAGNOSTICS = 'driver_diagnostics',
  AI_ASSISTANT = 'ai_assistant'
}

export interface MqttConnection {
  connectionId: string;
  connectionName: string;
  brokerAddress: string;
  port: number;
  protocol: 'TCP' | 'TCP-SSL' | 'WebSocket' | 'WebSocket-SSL' | 'Websocket';
  clientId?: string;
  username?: string;
  password?: string;
  autoConnect: boolean;
  cleanSession: boolean;
  keepAlive: number;
  enableWillMessage: boolean;
  connected?: boolean;
}

export interface Dashboard {
  dashboardId: string;
  dashboardName: string;
  connectionId: string;
  isHome?: boolean;
  prefixTopic?: string;
  themeColor?: string;
  icon?: string;
  legacyLayout?: boolean;
  bgColor?: string;
  canvasBgColor?: string;
}

export interface OptionItem {
  label: string;
  value: string;
}

export interface TrendPen {
  id: string;
  name: string;
  topic: string;
  jsonPath?: string;        // Per-pen JSONPath query (e.g. $.d.value[0]) for JSON payload extraction
  driverTagId?: string;     // Per-pen driver tag ID when Data Source is Driver Tag
  color: string;
  thickness?: number;
  unit?: string;
  min?: number;
  max?: number;
  visible?: boolean;
  showNodeMarkers?: boolean;   // Show/hide data point dot markers on the trend line
  loggingEnabled?: boolean;    // Enable/disable historian logging for this specific pen
}

/**
 * A single compressed telemetry log point stored in IndexedDB.
 * Compact key names (~80 bytes/record) to maximise mobile storage efficiency.
 */
export interface TrendLogPoint {
  /** Compound unique key: `${topic}_${timestampMs}` */
  id: string;
  /** Panel ID that owns this pen */
  pid: string;
  /** MQTT topic / pen identifier */
  pen: string;
  /** Numeric telemetry value */
  v: number;
  /** UTC timestamp in milliseconds (IDB indexed) */
  t: number;
}

/**
 * Placeholder record written to IndexedDB when historian sampling is interrupted
 * (e.g. app went to background, screen locked on mobile).
 */
export interface HistorianGapRecord extends TrendLogPoint {
  isGap: true;
  /** Timestamp when app went to background (ms) */
  gapStartMs: number;
  /** Timestamp when app came back to foreground (ms) */
  gapEndMs: number;
}

/**
 * A pre-aggregated rollup data point stored in IndexedDB (1-min, 1-hour, 1-day tiers).
 * Preserves Min/Max envelope so peaks, valleys, and averages across 5+ years are never lost.
 */
export interface HistorianRollupPoint {
  id: string;        // `${pen}_${timestampMs}`
  pen: string;       // Pen or topic identifier
  t: number;         // Start timestamp of the rollup bucket (ms)
  min: number;       // Minimum value in bucket
  max: number;       // Maximum value in bucket
  avg: number;       // Time-weighted or arithmetic average value
  first?: number;    // First sample value in bucket
  last?: number;     // Last sample value in bucket
  count: number;     // Number of raw samples aggregated
  total?: number;    // Integral/sum for totalizers (energy, flow, etc.)
}

/** Archive Cluster partition chunk duration */
export type ArchiveClusterDuration = '1_DAY' | '1_WEEK' | '1_MONTH' | '2_MONTHS';

/**
 * A compressed partition archive chunk stored in IndexedDB (`telemetry_archives`).
 * Holds lossless stream-compressed raw 1-second telemetry for a specific cluster window.
 */
export interface HistorianArchiveChunk {
  id: string; // `${pen}_${startMs}`
  pen: string;
  startMs: number;
  endMs: number;
  clusterDuration: ArchiveClusterDuration;
  pointCount: number;
  minVal?: number;
  maxVal?: number;
  avgVal?: number;
  compressedBlob: Uint8Array | ArrayBuffer | string;
  format: 'deflate-raw' | 'gzip' | 'json-packed';
  createdAt: number;
}

/** Dynamic cluster file size calculation for UI estimator */
export interface ClusterFileSizeEstimate {
  clusterDuration: ArchiveClusterDuration;
  clusterDurationLabel: string;
  pointsPerFile: number;
  uncompressedBytesPerFile: number;
  compressedBytesPerFile: number;
  formattedFileSize: string;
  totalArchiveFiles: number;
  totalArchiveCompressedBytes: number;
  formattedTotalArchiveSize: string;
}

/** Storage tier for live estimator badge in configuration UI */
export type HistorianStorageTier = 'safe' | 'warn' | 'critical';

export interface HistorianStorageEstimate {
  totalPoints: number;
  estimatedBytes: number;
  estimatedMb: number;
  formattedSize: string;
  tier: HistorianStorageTier;
  isPC?: boolean;
  effectiveRetentionLabel?: string;
  isClampedForMobile?: boolean;
  clusterEstimate?: ClusterFileSizeEstimate;
  uncompressedHotMb?: number;
  compressedArchiveMb?: number;
}

export interface Panel {
  panelId: string;
  dashboardId: string;
  connectionId: string;
  panelName: string;
  type: PanelType | string;
  topic: string;
  unit?: string;
  decimalPrecision?: number | string;
  isJSONPayload?: boolean;
  jsonPath?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  payloadMin?: number;
  payloadMax?: number;
  payloadOn?: string | number;
  payloadOff?: string | number;
  payloadOnText?: string;
  payloadOffText?: string;
  disableDashboardPrefix?: boolean;
  messageFactor?: number;
  iconOn?: string;
  iconOff?: string;
  iconColorOn?: string;
  iconColorOff?: string;
  flashOn?: boolean;
  rotateOn?: boolean;
  animSpeedOn?: 'slow' | 'medium' | 'fast';
  flashOff?: boolean;
  rotateOff?: boolean;
  animSpeedOff?: 'slow' | 'medium' | 'fast';
  fontSize?: number | string;
  digitalDisplay?: boolean;
  showReceivedTimeStamp?: boolean;
  showSentTimeStamp?: boolean;
  qos?: 0 | 1 | 2;
  retain?: boolean;
  colSpan?: number;
  rowSpan?: number;
  lowThreshold?: number;
  highThreshold?: number;
  enableLowAlarm?: boolean;
  enableMidAlarm?: boolean;
  enableHighAlarm?: boolean;
  lowAlarmMsg?: string;
  midAlarmMsg?: string;
  highAlarmMsg?: string;
  enableTrip?: boolean;
  tripTopic?: string;
  tripJsonPath?: string;
  payloadTrip?: string | number;
  tripColor?: string;
  tripMessage?: string;
  tripAnimStyle?: 'flash_strobe' | 'warning_pulse' | 'red_hazard_border' | 'trip_badge';
  layouts?: any;
  options?: string[]; // For Combo Box & Radio Buttons
  optionItems?: OptionItem[]; // Explicit option items with Label and Value
  penColor?: string; // Pen color for Line Graph / Bar Graph
  penThickness?: number; // Pen thickness for Line Graph (1-6)
  graphType?: 'line' | 'curve' | 'stepped' | 'bar' | 'hbar' | 'area'; // Type of chart
  showGrid?: boolean;
  fillArea?: boolean;
  pens?: TrendPen[]; // Multi-pen trend configuration
  showMonitoringTable?: boolean; // Show/hide legend monitoring window
  enableDualCursor?: boolean; // Enable dual cursors by default
  showNodeMarkers?: boolean;  // Show/hide data point node dot markers (default: false = clean lines)
  autoScaleY?: boolean;       // Enable auto Y-axis scaling (disables manual min/max limits)
  tableColumns?: {
    status?: boolean;
    lastVal?: boolean;
    lastTime?: boolean;
    c1Time?: boolean;
    c1Val?: boolean;
    c2Time?: boolean;
    c2Val?: boolean;
    valDiff?: boolean; // Cursor 1 and 2 value difference Δv
    timeDiff?: boolean; // Cursor 1 and 2 time difference Δt
    minVal?: boolean; // Min of visible time frame
    maxVal?: boolean; // Max of visible time frame
    avgVal?: boolean; // Avg of visible time frame
  };
  // --- Historian Logging Config ---
  enableHistorianLogging?: boolean;  // Persist telemetry to IndexedDB
  logIntervalSeconds?: number;       // Sampling interval (>= 1 sec enforced)
  retentionValue?: number;           // e.g. 7, 30, 6, 1
  retentionUnit?: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'; // Retention window unit
  logStorageCapMb?: number;          // Hard storage quota cap in MB (safety valve)
  archiveAfterMonths?: number;       // Start archiving after X months (e.g. 1, 2, 3, 6, 12; 0 = never)
  archiveClusterDuration?: ArchiveClusterDuration; // '1_DAY' | '1_WEEK' | '1_MONTH' | '2_MONTHS'
  // --- Telemetry Stale / Disconnection Watchdog ---
  enableStaleTimeout?: boolean;     // Enable/disable element telemetry timeout detection
  staleTimeoutSeconds?: number;    // Timeout threshold in seconds (default: 10s)
  showOfflineBadge?: boolean;       // Display glowing OFFLINE badge overlay on element
  buttonPayload?: string; // For Button
  sliderStep?: number; // For Slider
  publishPattern?: string; // JSON pattern for publish, e.g. { "d": { "data_vijay": [<payload>] } }
  publishTopic?: string; // Separate publish topic for write actions (if different from subscribe topic)
  clearOnPublish?: boolean;
  confirmPublish?: boolean;
  // Web HMI Canvas absolute positioning & styling
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  screenId?: string;
  targetScreenId?: string;
  staticText?: string;
  fontFamily?: string;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  textAlign?: 'left' | 'center' | 'right';
  isHmiMode?: boolean;
  groupId?: string;
  imageUrl?: string;
  imageFit?: 'contain' | 'cover' | 'fill';
  opacity?: number;
  rotation?: number;
  dataType?: 'number' | 'text';
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowIntensity?: number;
  buttonStyle?: 'square' | 'rounded' | 'pill' | 'bevel' | 'glossy' | 'circular';
  shapeType?: 'rectangle' | 'circle' | 'line' | 'pipe' | 'polygon' | 'triangle' | 'star' | 'arrow' | 'polyline' | 'custom_polygon' | 'arc';
  shapePoints?: Array<{ x: number; y: number }>;
  clockFormat?: '12h' | '24h' | 'date_time' | 'time_only';
  pipeFlowDirection?: 'ltr' | 'rtl';
  pipeEndType?: 'flange' | 'round' | 'triangle';
  pipeAnimCondition?: 'always' | 'tag_condition';
  pipeAnimOperator?: '=' | '!=' | '>' | '<' | '>=' | '<=';
  pipeAnimValue?: string | number;
  pipeAnimStyle?: 'bubbles' | 'dashes' | 'solid';
  pipeCornerRadius?: number;
  symbolId?: string;
  symbolCategory?: string;
  symbolAnimType?: 'digital_on_off' | 'analog_level' | 'analog_valve_angle' | 'motor_rotation' | 'none';
  alarmViewMode?: 'live' | 'historian';
  pageSize?: number;
  maxDisplayRows?: number;

  // Driver Tag Source Mode (additive — default 'mqtt' when absent)
  dataSourceMode?: 'mqtt' | 'driver';
  driverTagId?: string;
  driverWriteTagId?: string;
}

export interface MqttMessageLog {
  id: string;
  topic: string;
  payload: string;
  timestamp: string;
  qos?: number;
  retain?: boolean;
}

export enum ProductEdition {
  COMMUNITY = 'community',
  CLIENT_RUNTIME = 'client_runtime',
  ENGINEERING = 'engineering',
  LANDING = 'landing'
}

export interface ClientSessionInfo {
  clientName: string;
  generatedAt?: string;
  expiresAt?: string;
  clearPassword?: string;
  isSignedPackage?: boolean;
  fileName?: string;
}

export interface ActiveAlarm {
  alarmKey: string; // `${panelId}_${zone}`
  panelId: string;
  panelName: string;
  dashboardId: string;
  zone: 'LOW' | 'MID' | 'HIGH' | 'TRIP' | 'FAULT';
  value: number;
  unit?: string;
  threshold: number;
  message: string;
  color: string;
  timestamp: string;
  acknowledged?: boolean;
}

export interface HistorianAlarmEntry {
  id: string; // Unique GUID/timestamp ID
  alarmKey: string; // Unique key (`${panelId}_${zone}`)
  panelId: string;
  panelName: string;
  dashboardId: string;
  category: 'TRIP' | 'FAULT' | 'HIGH' | 'MID' | 'LOW';
  tagTopic: string; // Topic & JSONPath
  triggerValue: any;
  threshold?: number;
  unit?: string;
  message: string;
  color: string;
  triggerTime: string; // ISO / Local timestamp
  ackTime?: string | null;
  resolvedTime?: string | null;
  duration?: string; // Active duration (e.g. 00:04:12 or 'ACTIVE')
  status: 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'RESOLVED_UNACK' | 'RESOLVED_ACK';
}

export interface HistorianStorageMetrics {
  usedBytes: number;
  formattedSize: string;
  totalRows: number;
  maxRows: number;
  maxStorageMb: number;
  percentUsed: number;
  engineType: string;
}

export type TagType = 'read' | 'write';
export type TagSourceType = 'detected' | 'imported' | 'manual';

export interface TagRegistryEntry {
  tagId: string;
  tagName: string;
  tagType: TagType;
  sourceType: TagSourceType;
  parsingDefinition: string;
  description?: string;
  category?: string;
  usageCount?: number;
  widgetsCount?: number;
  dashboardsCount?: number;
  linkedWidgets?: {
    panelId: string;
    panelName: string;
    dashboardName: string;
    field: 'jsonPath' | 'publishPattern';
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AppState {
  connections: MqttConnection[];
  dashboards: Dashboard[];
  panels: Panel[];
  editPin?: string;
  runtimePinTimeoutMinutes?: number; // Auto-lock timeout in minutes (default: 2)
  clearPassword?: string;
  isLocked?: boolean;
  isLockedPackage?: boolean;
  appTheme?: string;
  userRole?: 'admin' | 'client' | 'gate' | 'community';
  productEdition?: ProductEdition;
  clientInfo?: ClientSessionInfo;
  customTags?: TagRegistryEntry[];
  packageOrigin?: 'community' | 'commercial' | 'engineering';

  // Industrial Driver Support (additive)
  driverConnections?: DriverConnection[];
  driverTags?: DriverTag[];
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRIAL DRIVER SUPPORT — Phase 0 Type Definitions
// These are purely additive. Nothing existing is changed.
// ─────────────────────────────────────────────────────────────────────────────

export type DriverProtocol =
  | 'opcua'
  | 'opcda'
  | 'modbus_tcp'
  | 'modbus_rtu'
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
  // OPC UA / OPC DA
  endpointUrl?: string;
  securityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy?: string;
  username?: string;
  password?: string;
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
  bitOffset?: number;
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


