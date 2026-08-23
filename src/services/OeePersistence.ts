import {
  MachineLineConfig,
  ShiftConfig,
  DowntimeReasonCode,
  DowntimeCategory,
  DowntimeEvent,
  ShiftOeeRecord
} from '../types/production';

const STORAGE_KEY_LINES = 'tasc_oee_lines_v2';
const STORAGE_KEY_SHIFTS = 'tasc_oee_shifts_v2';
const STORAGE_KEY_REASONS = 'tasc_oee_reasons_v2';
const STORAGE_KEY_EVENTS = 'tasc_oee_events_v2';
const STORAGE_KEY_SHIFT_RECORDS = 'tasc_oee_shift_records_v2';
const STORAGE_KEY_ACTIVE_LINE = 'tasc_oee_active_line_id_v2';

export const DEFAULT_SHIFTS: ShiftConfig[] = [
  {
    id: 'shift_morning',
    name: 'Shift A (Morning)',
    code: 'SHIFT_A',
    startTime: '06:00',
    endTime: '14:00',
    durationHours: 8,
    plannedBreaksMinutes: 45,
    targetOeePct: 85.0
  },
  {
    id: 'shift_afternoon',
    name: 'Shift B (Afternoon)',
    code: 'SHIFT_B',
    startTime: '14:00',
    endTime: '22:00',
    durationHours: 8,
    plannedBreaksMinutes: 45,
    targetOeePct: 82.0
  },
  {
    id: 'shift_night',
    name: 'Shift C (Night)',
    code: 'SHIFT_C',
    startTime: '22:00',
    endTime: '06:00',
    durationHours: 8,
    plannedBreaksMinutes: 45,
    targetOeePct: 78.0
  }
];

export const DEFAULT_REASON_CODES: DowntimeReasonCode[] = [
  { id: 'R-MEC-01', category: DowntimeCategory.MECHANICAL, name: 'Conveyor Jam / Jammed Part', isPlanned: false },
  { id: 'R-MEC-02', category: DowntimeCategory.MECHANICAL, name: 'Drive Motor / Belt Failure', isPlanned: false },
  { id: 'R-MEC-03', category: DowntimeCategory.MECHANICAL, name: 'Pneumatic Pressure Low', isPlanned: false },
  { id: 'R-ELE-01', category: DowntimeCategory.ELECTRICAL, name: 'Photoelectric Sensor Misaligned', isPlanned: false },
  { id: 'R-ELE-02', category: DowntimeCategory.ELECTRICAL, name: 'PLC / VFD Fault Trip', isPlanned: false },
  { id: 'R-ELE-03', category: DowntimeCategory.ELECTRICAL, name: 'E-Stop Triggered', isPlanned: false },
  { id: 'R-MAT-01', category: DowntimeCategory.MATERIAL_SHORTAGE, name: 'Empty Infeed Hopper / Raw Material Out', isPlanned: false },
  { id: 'R-MAT-02', category: DowntimeCategory.MATERIAL_SHORTAGE, name: 'Packaging Film / Label Roll Out', isPlanned: false },
  { id: 'R-QAL-01', category: DowntimeCategory.QUALITY_INSPECTION, name: 'Inline Quality Sampling & Check', isPlanned: false },
  { id: 'R-QAL-02', category: DowntimeCategory.QUALITY_INSPECTION, name: 'Vision System Rejection Burst', isPlanned: false },
  { id: 'R-CHG-01', category: DowntimeCategory.CHANGEOVER_SETUP, name: 'Tooling & Guide Changeover', isPlanned: true },
  { id: 'R-CHG-02', category: DowntimeCategory.CHANGEOVER_SETUP, name: 'Product Recipe / Size Setup', isPlanned: true },
  { id: 'R-BRK-01', category: DowntimeCategory.OPERATOR_BREAK, name: 'Scheduled Tea / Meal Break', isPlanned: true },
  { id: 'R-BRK-02', category: DowntimeCategory.OPERATOR_BREAK, name: 'Shift Handover Meeting', isPlanned: true },
  { id: 'R-UTL-01', category: DowntimeCategory.UTILITY_FAILURE, name: 'Compressed Air Failure', isPlanned: false },
  { id: 'R-UTL-02', category: DowntimeCategory.UTILITY_FAILURE, name: 'Power Outage / Grid Fluctuation', isPlanned: false }
];

export const DEFAULT_PRODUCTION_LINES: MachineLineConfig[] = [
  {
    id: 'line_bottling_1',
    name: 'Beverage Bottling & Capping Line #1',
    code: 'BOT-LINE-01',
    department: 'Packaging & Filling',
    category: 'continuous',
    idealCycleTimeSec: 0.50, // 120 Bottles / min
    targetOeePct: 85.0,
    plannedShiftHours: 8,
    plannedDowntimeSec: 2700, // 45 min
    microStopThresholdSec: 300,
    debounceDelaySec: 3,
    tags: {
      statusTag: 'PLC_Line1_Running',
      speedTag: 'PLC_Line1_Speed_BPM',
      totalCountTag: 'PLC_Line1_Total_Bottles',
      rejectCountTag: 'PLC_Line1_Reject_Bottles',
      faultCodeTag: 'PLC_Line1_Fault_Code'
    }
  },
  {
    id: 'line_cnc_milling_2',
    name: '5-Axis Precision CNC Machining Cell #2',
    code: 'CNC-CELL-02',
    department: 'Machine Shop',
    category: 'discrete',
    idealCycleTimeSec: 45.0, // 45 sec per finished component
    targetOeePct: 80.0,
    plannedShiftHours: 8,
    plannedDowntimeSec: 2700,
    microStopThresholdSec: 300,
    debounceDelaySec: 3,
    tags: {
      statusTag: 'CNC2_Spindle_Active',
      speedTag: 'CNC2_Spindle_RPM',
      totalCountTag: 'CNC2_Total_Parts',
      rejectCountTag: 'CNC2_Scrap_Parts',
      faultCodeTag: 'CNC2_Alarm_Code'
    }
  },
  {
    id: 'line_cartoning_3',
    name: 'Automatic Case Packer & Cartoning Line #3',
    code: 'CARTON-03',
    department: 'Secondary Packaging',
    category: 'discrete',
    idealCycleTimeSec: 1.20, // 50 Cartons / min
    targetOeePct: 88.0,
    plannedShiftHours: 8,
    plannedDowntimeSec: 2700,
    microStopThresholdSec: 300,
    debounceDelaySec: 3,
    tags: {
      statusTag: 'Cartoner3_Running',
      speedTag: 'Cartoner3_Speed_CPM',
      totalCountTag: 'Cartoner3_Total_Cartons',
      rejectCountTag: 'Cartoner3_Reject_Cartons',
      faultCodeTag: 'Cartoner3_Fault_Code'
    }
  }
];

export class OeePersistence {
  public static loadLines(): MachineLineConfig[] {
    if (typeof localStorage === 'undefined') return DEFAULT_PRODUCTION_LINES;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LINES);
      if (!raw) {
        this.saveLines(DEFAULT_PRODUCTION_LINES);
        return DEFAULT_PRODUCTION_LINES;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRODUCTION_LINES;
    } catch {
      return DEFAULT_PRODUCTION_LINES;
    }
  }

  public static saveLines(lines: MachineLineConfig[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_LINES, JSON.stringify(lines));
    } catch (e) {
      console.error('[OeePersistence] Failed to save lines:', e);
    }
  }

  public static loadShifts(): ShiftConfig[] {
    if (typeof localStorage === 'undefined') return DEFAULT_SHIFTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SHIFTS);
      if (!raw) {
        this.saveShifts(DEFAULT_SHIFTS);
        return DEFAULT_SHIFTS;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SHIFTS;
    } catch {
      return DEFAULT_SHIFTS;
    }
  }

  public static saveShifts(shifts: ShiftConfig[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
    } catch (e) {
      console.error('[OeePersistence] Failed to save shifts:', e);
    }
  }

  public static loadReasons(): DowntimeReasonCode[] {
    if (typeof localStorage === 'undefined') return DEFAULT_REASON_CODES;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REASONS);
      if (!raw) {
        this.saveReasons(DEFAULT_REASON_CODES);
        return DEFAULT_REASON_CODES;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_REASON_CODES;
    } catch {
      return DEFAULT_REASON_CODES;
    }
  }

  public static saveReasons(reasons: DowntimeReasonCode[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_REASONS, JSON.stringify(reasons));
    } catch (e) {
      console.error('[OeePersistence] Failed to save reasons:', e);
    }
  }

  public static loadEvents(lineId?: string): DowntimeEvent[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (!raw) return [];
      const parsed: DowntimeEvent[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return lineId ? parsed.filter(e => e.lineId === lineId) : parsed;
    } catch {
      return [];
    }
  }

  public static saveEvent(event: DowntimeEvent): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const events = this.loadEvents();
      const idx = events.findIndex(e => e.id === event.id);
      if (idx >= 0) {
        events[idx] = event;
      } else {
        events.push(event);
      }
      // Cap at 1000 events to maintain compact storage
      const trimmed = events.slice(-1000);
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(trimmed));
    } catch (e) {
      console.error('[OeePersistence] Failed to save event:', e);
    }
  }

  public static getActiveLineId(): string {
    if (typeof localStorage === 'undefined') return DEFAULT_PRODUCTION_LINES[0].id;
    return localStorage.getItem(STORAGE_KEY_ACTIVE_LINE) || DEFAULT_PRODUCTION_LINES[0].id;
  }

  public static setActiveLineId(id: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_ACTIVE_LINE, id);
  }

  public static loadShiftRecords(lineId?: string): ShiftOeeRecord[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SHIFT_RECORDS);
      if (!raw) return [];
      const parsed: ShiftOeeRecord[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return lineId ? parsed.filter(r => r.lineId === lineId) : parsed;
    } catch {
      return [];
    }
  }

  public static saveShiftRecord(record: ShiftOeeRecord): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const records = this.loadShiftRecords();
      const idx = records.findIndex(r => r.id === record.id);
      if (idx >= 0) {
        records[idx] = record;
      } else {
        records.push(record);
      }
      const trimmed = records.slice(-100);
      localStorage.setItem(STORAGE_KEY_SHIFT_RECORDS, JSON.stringify(trimmed));
    } catch (e) {
      console.error('[OeePersistence] Failed to save shift record:', e);
    }
  }
}
