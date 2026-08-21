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
