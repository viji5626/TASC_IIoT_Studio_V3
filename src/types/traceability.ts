/**
 * Data Models & Types for End-to-End Batch & Lot Traceability Studio
 * Conforms to FDA 21 CFR Part 11 and ISO 9001 Quality Standards
 */

export enum BatchStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  QUARANTINED = 'QUARANTINED',
  REJECTED = 'REJECTED',
  APPROVED = 'APPROVED'
}

export interface RawMaterialLot {
  id: string;
  lotNumber: string;
  materialCode: string;
  materialName: string;
  supplierName: string;
  supplierLotNumber: string;
  inwardDate: string;
  expiryDate: string;
  quantityUsed: number;
  unit: string;
  coaAttached: boolean;
  qualityGrade: 'A' | 'B' | 'C' | 'REJECT';
  passedInspection: boolean;
}

export interface TelemetryPoint {
  timestamp: number; // Epoch ms
  value: number;
  isOos?: boolean;   // True if Out-of-Specification
}

export interface BatchProcessParameter {
  id: string;
  name: string;
  unit: string;
  tagAddress?: string;
  setpoint: number;
  minLimit: number;  // Lower Specification Limit (LSL)
  maxLimit: number;  // Upper Specification Limit (USL)
  currentValue: number;
  avgValue: number;
  minValue: number;
  maxValue: number;
  oosViolationCount: number; // Out of spec violation occurrences
  telemetryHistory: TelemetryPoint[];
}

export interface FinishedGoodSerial {
  serialNumber: string;
  barcodeQrPayload: string;
  packTimestamp: number;
  weightGrams?: number;
  inspectionResult: 'PASS' | 'FAIL' | 'REWORK';
  operatorId: string;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: number;
  action: string;
  performedBy: string;
  role: string;
  signatureMeaning: 'CREATE' | 'START' | 'PAUSE' | 'COMPLETE' | 'QUALITY_SIGN_OFF' | 'QUARANTINE';
  details: string;
}

export interface BatchRecord {
  id: string;
  batchNumber: string;
  workOrderNumber: string;
  recipeName: string;
  recipeVersion: string;
  lineId: string;
  lineName: string;
  status: BatchStatus;
  
  targetQuantity: number;
  actualQuantity: number;
  scrapQuantity: number;
  yieldPercentage: number;
  unit: string;

  startTimestamp: number;
  endTimestamp?: number;
  durationMinutes: number;

  leadOperator: string;
  supervisorName: string;
  qaApprover?: string;

  rawMaterials: RawMaterialLot[];
  parameters: BatchProcessParameter[];
  finishedSerials: FinishedGoodSerial[];
  auditTrail: AuditTrailEntry[];

  qualityNotes?: string;
  qrVerificationUrl?: string;
}

export interface RecallSearchResult {
  searchQuery: string;
  searchType: 'FORWARD_LOT' | 'BACKWARD_SERIAL';
  matchedBatch: BatchRecord;
  affectedSerialsCount: number;
  affectedSerials: string[];
  rawMaterialsSummary: {
    materialName: string;
    lotNumber: string;
    supplier: string;
  }[];
  processCompliancePct: number;
  recallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
