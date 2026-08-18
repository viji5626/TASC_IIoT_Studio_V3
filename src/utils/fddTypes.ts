export type FddSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type FddWorkOrderStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface FddAsset {
  assetId: string;
  name: string;
  category: 'chiller' | 'ahu' | 'air_washer' | 'exhaust_fan' | 'compressor' | 'boiler' | 'pump' | 'transformer' | 'conveyor' | 'custom';
  location: string;
  parentAssetId?: string;
  primaryTags: {
    temperature?: string;
    vibration?: string;
    pressure?: string;
    current?: string;
    flow?: string;
    humidity?: string;
    speed?: string;
    status?: string;
  };
  healthIndex: number; // 0 - 100%
  activeFaultCount: number;
}

export interface FddRule {
  ruleId: string;
  name: string;
  assetId: string;
  assetName: string;
  category: string;
  expression: string; // e.g. "Chiller.DischargeTemp > 85 && Chiller.WaterFlow < 25"
  severity: FddSeverity;
  debounceSeconds: number; // Time condition must persist
  deadband?: number; // Hysteresis to prevent sensor chatter
  energyWasteKw: number; // Excess power draw during fault in kW
  costPerHour: number; // Estimated financial waste in $/hr or local currency/hr
  enabled: boolean;
  description: string;
  createdIso: string;
}

export interface FddActiveFault {
  faultId: string;
  ruleId: string;
  ruleName: string;
  assetId: string;
  assetName: string;
  category: string;
  severity: FddSeverity;
  triggerTimestamp: string;
  triggerTimestampMs: number;
  triggerValues: Record<string, number | string | boolean>;
  durationSeconds: number;
  energyWasteKw: number;
  costPerHour: number;
  totalCostImpact: number;
  ackStatus: boolean;
  ackTimestamp?: string;
  ackUser?: string;
  ackNote?: string;
  rootCauseAnalysis?: FddAiDiagnosticReport;
}

export interface FddFaultHistoryRecord {
  historyId: string;
  faultId: string;
  ruleId: string;
  ruleName: string;
  assetId: string;
  assetName: string;
  category: string;
  severity: FddSeverity;
  triggerTimestamp: string;
  clearTimestamp: string;
  durationSeconds: number;
  totalCostImpact: number;
  rootCauseSummary?: string;
  workOrderId?: string;
}

export interface FddWorkOrderChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface FddSparePart {
  partNumber: string;
  name: string;
  quantity: number;
}

export interface FddWorkOrder {
  orderId: string;
  faultId?: string;
  assetId: string;
  assetName: string;
  title: string;
  description: string;
  priority: FddSeverity;
  status: FddWorkOrderStatus;
  createdIso: string;
  dueIso: string;
  completedIso?: string;
  assignedTechnician: string;
  estimatedDowntimeMinutes: number;
  checklist: FddWorkOrderChecklistItem[];
  spareParts: FddSparePart[];
  resolutionNotes?: string;
}

export interface FddAiDiagnosticReport {
  reportId: string;
  faultId: string;
  assetName: string;
  timestamp: string;
  probableCauses: Array<{
    cause: string;
    confidence: number; // 0 - 100
    evidence: string;
  }>;
  immediateActions: string[];
  preventiveRecommendations: string[];
  estimatedCostAvoidance: number;
}

export interface FddKpis {
  activeCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalCostPerHour: number;
  totalEnergyWasteKw: number;
  accumulatedDailyCost: number;
  avgHealthIndex: number;
  openWorkOrdersCount: number;
}

export interface FddState {
  rules: FddRule[];
  activeFaults: FddActiveFault[];
  history: FddFaultHistoryRecord[];
  assets: FddAsset[];
  workOrders: FddWorkOrder[];
  kpis: FddKpis;
  lastEvaluatedIso: string;
}
