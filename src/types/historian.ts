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

export interface HistorianStorageMetrics {
  usedBytes: number;
  formattedSize: string;
  totalRows: number;
  maxRows: number;
  maxStorageMb: number;
  percentUsed: number;
  engineType: string;
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
