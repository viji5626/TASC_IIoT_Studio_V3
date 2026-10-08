export type ReportDataResolution = 'raw' | '1sec' | '1min' | '5min' | '15min' | '30min' | '1hour' | '1day';
export type ReportFormat = 'html' | 'xlsx' | 'csv' | 'pdf';
export type ReportScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'interval';
export type ReportStatus = 'idle' | 'suggesting' | 'generating' | 'ready' | 'error';
export type ReportColumnType = 'timestamp' | 'tag' | 'computed';

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

/** One column definition in a custom or template report */
export interface ReportColumnConfig {
  columnId: string;         // Unique immutable ID (e.g. 'col_1', 'col_ts')
  columnType: ReportColumnType;
  columnHeader: string;     // Header display text
  columnIndex?: number;     // 0-based column index in sheet (for Excel templates)
  columnLetter?: string;    // 'A', 'B', 'C', ...
  tagId?: string;           // Historian pen / driver tag ID
  tagName?: string;         // Human readable name
  aggregation: 'raw' | 'avg' | 'min' | 'max' | 'sum' | 'last' | 'delta';
  deltaRolloverMax?: number;// e.g. 65535 or 4294967295 for counter rollover handling
  dateFormat?: string;      // e.g. 'YYYY-MM-DD HH:mm:ss' | 'DD/MM/YYYY HH:mm:ss'
  resolution?: ReportDataResolution;
  unitSuffix?: string;      // e.g. 'kW', '°C', 'bar', 'm³/h'
  decimals?: number;        // Number of decimal places (0 to 6)
  formula?: string;         // Safe math formula referencing stable IDs (e.g. "col_1 * 1.732 * 415 / 1000")
  customFormula?: string;   // Backward compatibility alias for formula
  footerAggregation?: 'none' | 'sum' | 'avg' | 'min' | 'max';
  isTimestamp?: boolean;    // Legacy backwards compatibility flag
  transform?: FieldTransformType; // Legacy transform type
  clampMin?: number;
  clampMax?: number;
}

/** Backward compatibility alias for ReportFieldMap */
export type ReportFieldMap = ReportColumnConfig;

/** Summary KPI Card displayed at the top of the report */
export interface ReportKpiConfig {
  kpiId: string;
  title: string;
  tagId: string;
  tagName?: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'last' | 'delta';
  unit?: string;
  decimals?: number;
}

/** Header & Organization Metadata */
export interface ReportHeaderConfig {
  title: string;
  subtitle?: string;
  facilityName?: string;
  department?: string;
  logoUrl?: string;
  showDateRange?: boolean;
  showGeneratedAt?: boolean;
}

/** Industrial Shift Configuration with cross-midnight support */
export interface ReportShiftItem {
  id: string;
  name: string;
  startTime: string; // "06:00"
  endTime: string;   // "14:00"
  crossMidnight?: boolean;
}

export interface ReportShiftConfig {
  enabled: boolean;
  shifts: ReportShiftItem[];
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
  shiftId?: string;         // Optional shift binding
  lastRunAt?: string;       // ISO string of last execution
  nextRunAt?: string;       // ISO string of next scheduled run
  autoDownload?: boolean;   // Trigger browser download when generated
}

/** Event-Driven Trigger Configuration (Tag Edge, Analog Threshold, Alarm) */
export interface ReportTriggerConfig {
  enabled: boolean;
  type: 'tag_edge' | 'tag_threshold' | 'alarm_event';
  cooldownMinutes: number;  // Minimum minutes between trigger fires (prevents storms)
  edgeTagId?: string;
  edgeExpectedValue?: number; // e.g. 1 for rising edge (0 -> 1 with GOOD quality)
  thresholdTagId?: string;
  thresholdOperator?: '>' | '<' | '>=' | '<=' | '==';
  thresholdValue?: number;
  alarmKey?: string;        // Specific alarm key or 'any_critical'
  lookbackHours?: number;   // Duration window to capture for triggered report
  lastTriggeredAt?: string;
}

/** Email and Local File System Delivery Configuration */
export interface ReportDeliveryConfig {
  email: {
    enabled: boolean;
    recipients: string[];
    cc?: string[];
    bcc?: string[];
    subjectTemplate: string;
    bodyTemplate: string;
    attachFormats: Array<'xlsx' | 'pdf' | 'csv' | 'html'>;
  };
  localSave: {
    enabled: boolean;
    directoryPath: string; // e.g. "D:\\SCADA_Reports\\Daily"
    filenameTemplate?: string; // e.g. "{{reportName}}_{{timestamp}}"
    formats: Array<'xlsx' | 'pdf' | 'csv' | 'html'>;
  };
}

/** Static Cell Binding for Excel Template Mode */
export interface ReportStaticCellMap {
  cellAddr: string;         // e.g. 'B2', 'E3'
  type: 'metadata' | 'tag_kpi';
  valueKey?: 'title' | 'date' | 'shift' | 'facility' | 'author';
  tagId?: string;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'last' | 'delta';
  format?: string;
}

/** Unified Report Definition (Supports both Custom Grid and Excel Template modes) */
export interface CustomReportDefinition {
  reportId: string;
  reportName: string;
  description?: string;
  mode: 'custom_grid' | 'excel_template';
  header: ReportHeaderConfig;
  kpis: ReportKpiConfig[];
  columns: ReportColumnConfig[];
  targetSheet?: string;      // For Excel template mode
  dataStartRow?: number;     // Row number where dynamic table data begins (e.g. 2)
  staticCells?: ReportStaticCellMap[];
  defaultResolution: ReportDataResolution;
  defaultFromOffsetHours?: number;
  shifts?: ReportShiftConfig;
  schedule?: ReportSchedule;
  trigger?: ReportTriggerConfig;
  delivery: ReportDeliveryConfig;
  createdAt: string;
  updatedAt: string;
  lastGeneratedAt?: string;
}

/** Backward compatibility interface for ReportTemplate */
export interface ReportTemplate {
  templateId: string;
  templateName: string;
  description?: string;
  xlsxBase64?: string;
  targetSheet: string;
  dataStartRow: number;
  fieldMaps: ReportColumnConfig[];
  defaultResolution: ReportDataResolution;
  defaultFromOffsetHours?: number;
  schedule?: ReportSchedule;
  trigger?: ReportTriggerConfig;
  delivery?: ReportDeliveryConfig;
  createdAt: string;
  updatedAt: string;
  lastGeneratedAt?: string;
}

/** Global SMTP Configuration */
export interface SmtpServerConfig {
  host: string;
  port: number;
  secure: boolean;          // true for 465, false for 587 / 25
  user?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
  authType?: 'login' | 'anonymous';
}

/** A generated/completed report record for history */
export interface ReportJob {
  jobId: string;
  reportId?: string;
  templateId?: string;      // Legacy compatibility
  title: string;
  type: 'custom' | 'template' | 'ai_ondemand';
  status: 'generating' | 'ready' | 'error';
  fromMs: number;
  toMs: number;
  rowCount?: number;
  errorMessage?: string;
  htmlContent?: string;     // For AI reports / preview: inline HTML
  generatedFiles?: Array<{ format: string; filename: string; path?: string; sizeBytes?: number }>;
  emailStatus?: 'not_configured' | 'queued' | 'sent' | 'failed';
  emailError?: string;
  localSaveStatus?: 'not_configured' | 'saved' | 'failed';
  localSavePaths?: string[];
  localSaveError?: string;
  isScheduled?: boolean;    // True if triggered automatically by background scheduler
  triggerType?: 'manual' | 'schedule' | 'tag_edge' | 'tag_threshold' | 'alarm';
  unread?: boolean;         // True if user hasn't opened/acknowledged the generated report
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
