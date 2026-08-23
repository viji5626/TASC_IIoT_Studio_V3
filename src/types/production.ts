/**
 * Types & Data Models for OEE & Downtime Intelligence Studio
 * Conforms to International TPM (Total Productive Maintenance) Standards
 */

export enum MachineState {
  RUNNING = 'RUNNING',
  IDLE_MICRO_STOP = 'IDLE_MICRO_STOP',
  UNPLANNED_BREAKDOWN = 'UNPLANNED_BREAKDOWN',
  PLANNED_MAINTENANCE = 'PLANNED_MAINTENANCE',
  CHANGEOVER = 'CHANGEOVER',
  COMM_FAULT = 'COMM_FAULT'
}

export enum DowntimeCategory {
  MECHANICAL = 'MECHANICAL',
  ELECTRICAL = 'ELECTRICAL',
  MATERIAL_SHORTAGE = 'MATERIAL_SHORTAGE',
  QUALITY_INSPECTION = 'QUALITY_INSPECTION',
  CHANGEOVER_SETUP = 'CHANGEOVER_SETUP',
  OPERATOR_BREAK = 'OPERATOR_BREAK',
  UTILITY_FAILURE = 'UTILITY_FAILURE',
  UNASSIGNED = 'UNASSIGNED'
}

export interface DowntimeReasonCode {
  id: string;
  category: DowntimeCategory;
  name: string;
  description?: string;
  isPlanned: boolean;
}

export interface DowntimeEvent {
  id: string;
  lineId: string;
  state: MachineState;
  startTime: number; // Epoch timestamp (ms)
  endTime?: number;  // Epoch timestamp (ms), undefined if active
  durationSec: number;
  category: DowntimeCategory;
  reasonCodeId?: string;
  reasonText: string;
  operatorName?: string;
  shiftId: string;
  isPlanned: boolean;
  notes?: string;
}

export interface MachineLineTagMapping {
  statusTag?: string;       // Digital bit: 1 = Running, 0 = Stopped
  speedTag?: string;        // Analog rate: Parts / min or RPM
  totalCountTag?: string;   // Totalizer counter tag (Parts produced)
  rejectCountTag?: string;  // Reject counter tag (Defects)
  goodCountTag?: string;    // Optional explicit good parts counter
  faultCodeTag?: string;    // PLC fault alarm word / integer code
}

export interface MachineLineConfig {
  id: string;
  name: string;
  code: string;
  department: string;
  category: 'discrete' | 'continuous' | 'batch';
  idealCycleTimeSec: number;      // e.g. 0.5 sec / part (Target maximum speed)
  targetOeePct: number;           // Benchmark target (e.g. 85.0%)
  plannedShiftHours: number;      // e.g. 8 hours
  plannedDowntimeSec: number;     // e.g. 30 min (1800 sec) for breaks / cleanings
  microStopThresholdSec: number;  // e.g. 300 sec (under 5 min is micro-stop)
  debounceDelaySec: number;       // e.g. 3 sec (anti-chatter filter)
  tags: MachineLineTagMapping;
  linked2dDashboardId?: string;   // Link to 2D SCADA HMI
  linked3dEquipmentId?: string;   // Link to 3D Digital Twin object
}

export interface ShiftConfig {
  id: string;
  name: string;
  code: 'SHIFT_A' | 'SHIFT_B' | 'SHIFT_C';
  startTime: string; // e.g. "06:00"
  endTime: string;   // e.g. "14:00"
  durationHours: number;
  plannedBreaksMinutes: number;
  targetOeePct: number;
}

export interface OeeMetrics {
  availabilityPct: number;       // (Operating Time / Planned Time) * 100
  performancePct: number;        // ((Ideal Cycle Time * Total Parts) / Operating Time) * 100
  qualityPct: number;            // (Good Parts / Total Parts) * 100
  oeePct: number;                // (Availability * Performance * Quality) / 10000

  plannedProductionTimeSec: number;
  operatingTimeSec: number;
  unplannedDowntimeSec: number;
  plannedDowntimeSec: number;
  microStopsSec: number;

  totalCount: number;
  goodCount: number;
  rejectCount: number;
  scrapRatePct: number;

  actualRunRatePpm: number;      // Parts per minute
  targetRunRatePpm: number;      // Ideal parts per minute
}

export interface SixBigLossesBreakdown {
  // 1. Availability Losses
  unplannedBreakdownsSec: number;
  setupAndAdjustmentsSec: number;
  
  // 2. Performance Losses
  smallStopsAndIdlingSec: number;
  reducedSpeedLossSec: number;

  // 3. Quality Losses
  startupRejectsCount: number;
  productionRejectsCount: number;

  // Financial / Lost Time Equivalence
  totalLostHours: number;
}

export interface ShiftOeeRecord {
  id: string;
  lineId: string;
  shiftId: string;
  date: string; // YYYY-MM-DD
  metrics: OeeMetrics;
  losses: SixBigLossesBreakdown;
  downtimeEventCount: number;
  operatorNotes?: string;
  isClosed: boolean;
  closedAt?: number;
}
