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
  HISTORIAN_TREND = 'historian_trend',
  DRIVER_CONNECTIONS = 'driver_connections',
  DRIVER_TAG_MANAGER = 'driver_tag_manager',
  OPC_UA_BROWSER = 'opc_ua_browser',
  DRIVER_DIAGNOSTICS = 'driver_diagnostics',
  AI_ASSISTANT = 'ai_assistant',
  USER_MANUAL = 'user_manual',
  REPORTING = 'reporting'
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

export type DynamicPropertyType = 
  | 'color_shift'          // Threshold / state-based fill/stroke/text color change
  | 'rotation'             // Continuous rotation speed by tag or angular deflection
  | 'discrete_motion'      // 2D linear or multi-node motion path translation
  | 'level_fill'           // Analog liquid/fluid percentage level filling (tanks, pipes)
  | 'visibility_blink'     // Tag condition based hide/show or flashing strobe
  | 'size_scale'           // Dynamic scaling (W/H stretch)
  | 'opacity_fade';        // Dynamic alpha fading

export interface DynamicBehaviorRule {
  id: string;
  type: DynamicPropertyType;
  name: string;
  enabled: boolean;
  dataSourceMode: 'driver' | 'mqtt';
  driverTagId?: string;
  topic?: string;
  jsonPath?: string;            // Per-rule JSONPath query when dataSourceMode === 'mqtt'

  // Tag Data Format: 'analog' (Continuous / Threshold / Range) vs 'digital' (2-State Discrete)
  tagDataType?: 'analog' | 'digital';

  // 2-State Digital (Discrete) Settings (Default State 1 = '0', State 2 = '1'):
  state1Value?: string | number; // Default '0'
  state2Value?: string | number; // Default '1'
  state1Label?: string;          // e.g. "State 0 / Off"
  state2Label?: string;          // e.g. "State 1 / On"

  // Digital State 1 Actions:
  state1Visibility?: 'show' | 'hide' | 'blink';
  state1Fill?: string;
  state1Stroke?: string;
  state1Opacity?: number;
  state1Rotate?: boolean;
  state1RotationSpeed?: number;
  state1RotationDirection?: 'cw' | 'ccw';

  // Digital State 2 Actions:
  state2Visibility?: 'show' | 'hide' | 'blink';
  state2Fill?: string;
  state2Stroke?: string;
  state2Opacity?: number;
  state2Rotate?: boolean;
  state2RotationSpeed?: number;
  state2RotationDirection?: 'cw' | 'ccw';

  // Analog Trigger & Condition Settings
  conditionType: 'always' | 'threshold' | 'digital_state' | 'range' | 'continuous_analog';
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
  conditionValue?: number | string;
  conditionValueHigh?: number; // for range
  actionOnMatch?: 'show' | 'hide' | 'blink'; // For analog visibility
  actionOnElse?: 'show' | 'hide';            // For analog visibility

  // Action / Visual targets
  targetFill?: string;
  targetStroke?: string;
  targetTextColor?: string;
  targetOpacity?: number;
  targetVisible?: boolean;
  isBlinking?: boolean;
  blinkSpeed?: 'slow' | 'medium' | 'fast';

  // Motion & Rotation parameters
  rotationMode?: 'continuous_spin' | 'angle_deflection';
  rotationSpeed?: number; // RPM or duration
  rotationDirection?: 'cw' | 'ccw';
  minAngle?: number; // e.g. 0 deg
  maxAngle?: number; // e.g. 90 deg
  minTagValue?: number; // e.g. 0
  maxTagValue?: number; // e.g. 100

  // Level fill parameters
  fillDirection?: 'bottom_to_top' | 'top_to_bottom' | 'left_to_right' | 'right_to_left';
  fillColor?: string;
  fillMin?: number;
  fillMax?: number;
  showPercentage?: boolean;

  // Motion Translation
  motionPathPoints?: Array<{ x: number; y: number }>;
}

export interface SvgSubPartConfig {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  isHidden?: boolean;
  animType?: 'none' | 'spin' | 'pulse' | 'level_fill' | 'flow' | 'color_shift';
  rotationSpeed?: number;
  dataSourceMode?: 'mqtt' | 'driver';
  topic?: string;
  driverTagId?: string;
  lowThreshold?: number;
  highThreshold?: number;
  alarmColor?: string;
  // Multiple Dynamic Behaviors Pipeline
  dynamics?: DynamicBehaviorRule[];
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
  groupName?: string;
  isLocked?: boolean;
  isHidden?: boolean;
  svgSubParts?: Record<string, SvgSubPartConfig>;
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

  // --- Tag-Based Motion Dynamics ---
  enableMotionDynamics?: boolean;
  motionTagMode?: 'same' | 'custom';
  motionDataSourceMode?: 'mqtt' | 'driver';
  motionTopic?: string;
  motionDriverTagId?: string;
  motionTagMin?: number;
  motionTagMax?: number;
  motionStartX?: number;
  motionStartY?: number;
  motionEndX?: number;
  motionEndY?: number;
  motionPathPoints?: { x: number; y: number }[]; // Multi-node bending motion path points
  motionOrientToPath?: boolean; // Turn / orient object along path heading direction

  // --- Tag-Based Rotation Dynamics ---
  enableRotationDynamics?: boolean;
  rotationMode?: 'continuous' | 'variable';
  rotationTagMode?: 'same' | 'custom';
  rotationDataSourceMode?: 'mqtt' | 'driver';
  rotationTopic?: string;
  rotationDriverTagId?: string;
  // Continuous Rotation
  rotationSpeed?: 'slow' | 'medium' | 'fast' | 'custom';
  rotationDurationSeconds?: number;
  rotationDirection?: 'cw' | 'ccw';
  rotationTriggerType?: 'digital' | 'analog_compare';
  rotationOperator?: '=' | '!=' | '>' | '>=' | '<' | '<=';
  rotationTriggerValue?: number | string;
  // Variable Rotation
  rotationTagMin?: number;
  rotationTagMax?: number;
  rotationAngleMin?: number;
  rotationAngleMax?: number;

  // Multiple Dynamic Behaviors Pipeline
  dynamics?: DynamicBehaviorRule[];
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

export interface HistorianConfig {
  enabled: boolean;
  logIntervalSeconds: number; // Global default sampling rate (e.g. 10s)
  retentionValue: number;     // e.g. 30, 6, 1, 5
  retentionUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  logStorageCapMb: number;    // Hard storage cap (e.g. 1000 MB)
  archiveAfterMonths: number; // Clustered archiving start threshold (e.g. 1 month)
  archiveClusterDuration: ArchiveClusterDuration;
}

export interface HistorianTag {
  id: string;                    // Unique identifier (e.g. 'htag_1718000000_abc')
  name: string;                  // Display name
  sourceType: 'mqtt' | 'driver'; // Data source ('mqtt' or 'driver')
  topic?: string;                // MQTT topic
  jsonPath?: string;             // JSONPath query (e.g. '$.level')
  driverTagId?: string;          // Master tag link to appState.driverTags
  connectionId?: string;         // Connection ID
  dataType?: 'number' | 'boolean' | 'string';
  unit?: string;                 // e.g. '°C', 'bar', 'RPM'
  min?: number;
  max?: number;
  enabled: boolean;              // Logging active toggle (Play/Pause)
  color?: string;                // Preferred pen color
  description?: string;
  
  // Per-Tag Override Settings (Optional — inherits global when omitted)
  useCustomInterval?: boolean;
  customIntervalSeconds?: number; // e.g. 1s, 2s, 5s, 60s
  deadband?: number;              // Value change % threshold (e.g. 0.5% to suppress static noise)

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
  currency?: '$' | '₹';

  // Centralized Historian & Persistence Settings
  historianConfig?: HistorianConfig;
  historianTags?: HistorianTag[];

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

// ─── Reporting Module Types ────────────────────────────────────────────────────

export type ReportDataResolution = 'raw' | '1min' | '1hour' | '1day';
export type ReportFormat = 'html' | 'xlsx' | 'csv';
export type ReportScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'interval';
export type ReportStatus = 'idle' | 'suggesting' | 'generating' | 'ready' | 'error';

export type FieldTransformType =
  | 'none'
  | 'delta_consumption'
  | 'scale_kilo'
  | 'scale_milli'
  | 'c_to_f'
  | 'f_to_c'
  | 'bar_to_psi'
  | 'psi_to_bar'
  | 'abs'
  | 'invert'
  | 'custom_math';

/** One column ↔ tag mapping in a template report */
export interface ReportFieldMap {
  columnIndex: number;      // 0-based column index in sheet
  columnLetter: string;     // 'A', 'B', 'C', ...
  columnHeader: string;     // Detected header text from template
  tagId?: string;           // Historian pen / driver tag ID
  tagName?: string;         // Human readable name
  aggregation: 'raw' | 'avg' | 'min' | 'max' | 'sum' | 'last'; // How to aggregate
  isTimestamp?: boolean;    // true = this column gets the timestamp
  transform?: FieldTransformType; // Applied transformation before writing into cell
  customFormula?: string;   // Formula expression e.g. "val * 1.5 + 10" (when transform === 'custom_math')
  clampMin?: number;        // Minimum allowed value clamp
  clampMax?: number;        // Maximum allowed value clamp
}

/** Schedule definition for recurring report generation */
export interface ReportSchedule {
  enabled: boolean;         // Whether this schedule is actively executing
  frequency: ReportScheduleFrequency;
  intervalMinutes?: number; // e.g. 15, 30, 60, 120 (for frequency === 'interval')
  hour?: number;            // 0-23 for daily/weekly/monthly (local time)
  minute?: number;          // 0-59
  weekday?: number;         // 0=Sunday, 1=Monday... for weekly
  dayOfMonth?: number;      // 1-31 for monthly
  lookbackHours?: number;   // Lookback window to query (e.g. 24 for daily, 168 for weekly)
  lastRunAt?: string;       // ISO string of last execution
  nextRunAt?: string;       // ISO string of next scheduled run
  autoDownload?: boolean;   // Whether to trigger immediate download upon generation
}

/** A saved standard template report configuration */
export interface ReportTemplate {
  templateId: string;
  templateName: string;
  description?: string;
  xlsxBase64?: string;        // Stored in IndexedDB (not in this object for localStorage)
  targetSheet: string;        // Which sheet to inject data into (e.g. 'Sheet1')
  dataStartRow: number;       // Row number where data rows begin (e.g. 2)
  fieldMaps: ReportFieldMap[];
  defaultResolution: ReportDataResolution;
  defaultFromOffsetHours?: number; // Default lookback (e.g. -24 = last 24h)
  schedule?: ReportSchedule;
  lastGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** A generated/completed report record for history */
export interface ReportJob {
  jobId: string;
  templateId?: string;        // If from template
  title: string;
  type: 'template' | 'ai_ondemand';
  status: 'generating' | 'ready' | 'error';
  fromMs: number;
  toMs: number;
  rowCount?: number;
  errorMessage?: string;
  htmlContent?: string;       // For AI reports: inline HTML
  isScheduled?: boolean;      // True if triggered automatically by background scheduler
  unread?: boolean;           // True if user hasn't opened/acknowledged the generated report
  createdAt: string;
  completedAt?: string;
}

/** Batch generation progress tracking */
export interface BatchReportProgress {
  total: number;
  current: number;
  currentName: string;
  completedJobs: ReportJob[];
  isRunning: boolean;
  error?: string;
}

/** Suggestion from AI before generating on-demand report */
export interface ReportSuggestion {
  id: number;
  title: string;
  description: string;
  addsTags?: string[];
  addsSection?: string;
}

/** Pending AI report request state tracked in AiChatPanel */
export interface PendingReportRequest {
  requestId: string;
  title: string;
  fromMs: number;
  toMs: number;
  tags: string[];
  resolution: ReportDataResolution;
  includeAlarms: boolean;
  includeFdd: boolean;
  suggestions: ReportSuggestion[];
  selectedSuggestionIds: number[];
  status: ReportStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDICATED CLIENT-SIDE AI MEMORY & MULTI-AGENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface LearnedTagAlias {
  id: string;
  alias: string;              // e.g. "Main Incomer" or "Chiller Outflow"
  tagId: string;             // physical tag ID e.g. "htag_123" or "modbus_holding_40001"
  tagName: string;           // readable physical tag name
  source: 'operator_chat' | 'manual_entry' | 'inferred';
  confidence: number;        // 0.0 to 1.0
  notes?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export type PlantKnowledgeCategory = 'energy' | 'hvac' | 'electrical' | 'safety' | 'production' | 'general';

export interface PlantKnowledgeNote {
  id: string;
  category: PlantKnowledgeCategory;
  topic: string;             // e.g. "Boiler Steam Limit", "Shift Timings"
  note: string;              // e.g. "Boiler max steam pressure is 10.5 bar. Shift 1 runs from 06:00 to 14:00."
  tagsLinked?: string[];
  author?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueryPattern {
  queryHash: string;
  querySample: string;
  intentType: 'telemetry_stats' | 'report_gen' | 'alarm_audit' | 'fdd_rca' | 'driver_diag' | 'general';
  tagIds: string[];
  frequency: number;
  lastQueriedAt: string;
}

export interface PrecomputedTelemetryChunk {
  chunkKey: string;           // e.g. "chunk_htag_123_1d_2026-08-20"
  tagId: string;
  resolution: ReportDataResolution;
  startTime: number;
  endTime: number;
  stats: {
    min: number;
    max: number;
    avg: number;
    delta: number;
    sum: number;
    count: number;
    peakTimestamp?: number;
  };
  pointsSummary?: Array<{ ts: number; val: number }>;
  generatedAt: string;
}

export interface EventTelemetrySnapshot {
  eventId: string;
  alarmId: string;
  tagId: string;
  alarmMessage: string;
  severity: 'HIGH' | 'CRITICAL' | 'MEDIUM' | 'LOW';
  tripTimestamp: number;
  preFaultPoints: Array<{ ts: number; val: number }>;  // 30 min before
  postFaultPoints?: Array<{ ts: number; val: number }>; // 15 min after
  snapshotAt: string;
}

export interface AiMemoryStats {
  aliasCount: number;
  noteCount: number;
  queryPatternCount: number;
  cachedChunkCount: number;
  alarmSnapshotCount: number;
  estimatedStorageMb: number;
  isPersistentStorage: boolean;
  lastChunkedAt?: string;
}

export type MultiAgentSpecialistType = 'supervisor' | 'telemetry' | 'fdd' | 'diagnostic' | 'memory' | 'reporting';

export interface MultiAgentEvent {
  agentType: MultiAgentSpecialistType;
  agentName: string;
  status: 'starting' | 'running' | 'completed' | 'error';
  actionDescription: string;
  timestamp: number;
}



