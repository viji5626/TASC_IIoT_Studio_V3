import { ReportDataResolution } from './reporting';

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
