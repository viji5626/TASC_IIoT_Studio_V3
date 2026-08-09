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
  TAG_MANAGER = 'tag_manager'
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
  graphType?: 'line' | 'bar' | 'hbar' | 'area'; // Type of chart
  showGrid?: boolean;
  fillArea?: boolean;
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
  clearPassword?: string;
  isLocked?: boolean;
  isLockedPackage?: boolean;
  appTheme?: string;
  userRole?: 'admin' | 'client' | 'gate' | 'community';
  productEdition?: ProductEdition;
  clientInfo?: ClientSessionInfo;
  customTags?: TagRegistryEntry[];
}

