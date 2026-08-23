import {
  BatchRecord,
  BatchStatus,
  RawMaterialLot,
  BatchProcessParameter,
  FinishedGoodSerial,
  AuditTrailEntry,
  RecallSearchResult
} from '../types/traceability';

const STORAGE_KEY_BATCHES = 'tasc_traceability_batches_v1';
const STORAGE_KEY_ACTIVE_BATCH = 'tasc_traceability_active_batch_id_v1';

export const SEED_BATCHES: BatchRecord[] = [
  {
    id: 'batch_pharma_088',
    batchNumber: 'BATCH-2026-088',
    workOrderNumber: 'WO-7492-MED',
    recipeName: 'Pediatric Sterile Suspension (Formulation-A4)',
    recipeVersion: 'v2.4',
    lineId: 'line_reactor_1',
    lineName: 'Aseptic Reactor & Formulation Suite #1',
    status: BatchStatus.IN_PROGRESS,
    targetQuantity: 5000,
    actualQuantity: 3840,
    scrapQuantity: 18,
    yieldPercentage: 99.53,
    unit: 'Liters',
    startTimestamp: Date.now() - 4.5 * 3600 * 1000,
    durationMinutes: 270,
    leadOperator: 'Dr. Marcus Vance (ID: OP-412)',
    supervisorName: 'Elena Rostova (Lead QA)',
    rawMaterials: [
      {
        id: 'RM-LOT-01',
        lotNumber: 'LOT-API-9941',
        materialCode: 'API-PARACET-99',
        materialName: 'USP Grade Active Pharmaceutical Ingredient',
        supplierName: 'Lonza Chemical Global Ltd.',
        supplierLotNumber: 'LON-2026-X88',
        inwardDate: '2026-07-15',
        expiryDate: '2028-07-15',
        quantityUsed: 250.0,
        unit: 'kg',
        coaAttached: true,
        qualityGrade: 'A',
        passedInspection: true
      },
      {
        id: 'RM-LOT-02',
        lotNumber: 'LOT-SOLV-4019',
        materialCode: 'SOLV-GLYC-01',
        materialName: 'Glycerin BP/EP 99.7% Pure',
        supplierName: 'BASF Pharma Solutions',
        supplierLotNumber: 'BASF-GER-902',
        inwardDate: '2026-08-01',
        expiryDate: '2027-08-01',
        quantityUsed: 1200.0,
        unit: 'kg',
        coaAttached: true,
        qualityGrade: 'A',
        passedInspection: true
      },
      {
        id: 'RM-LOT-03',
        lotNumber: 'LOT-STAB-8102',
        materialCode: 'STAB-CITRIC-04',
        materialName: 'Anhydrous Citric Acid Buffer',
        supplierName: 'Jungbunzlauer AG',
        supplierLotNumber: 'JBL-CH-4411',
        inwardDate: '2026-07-28',
        expiryDate: '2029-01-10',
        quantityUsed: 45.0,
        unit: 'kg',
        coaAttached: true,
        qualityGrade: 'A',
        passedInspection: true
      }
    ],
    parameters: [
      {
        id: 'PARAM-TEMP',
        name: 'Reactor Core Temperature',
        unit: '°C',
        tagAddress: 'reactor1/temp_c',
        setpoint: 68.0,
        minLimit: 65.0,
        maxLimit: 71.0,
        currentValue: 68.2,
        avgValue: 68.1,
        minValue: 65.8,
        maxValue: 69.4,
        oosViolationCount: 0,
        telemetryHistory: Array.from({ length: 24 }, (_, i) => ({
          timestamp: Date.now() - (24 - i) * 600000,
          value: Number((67.8 + 0.8 * Math.sin(i * 0.6)).toFixed(1)),
          isOos: false
        }))
      },
      {
        id: 'PARAM-PRESSURE',
        name: 'Vessel Seal Pressure',
        unit: 'bar',
        tagAddress: 'reactor1/pressure_bar',
        setpoint: 2.50,
        minLimit: 2.20,
        maxLimit: 2.80,
        currentValue: 2.52,
        avgValue: 2.49,
        minValue: 2.31,
        maxValue: 2.68,
        oosViolationCount: 0,
        telemetryHistory: Array.from({ length: 24 }, (_, i) => ({
          timestamp: Date.now() - (24 - i) * 600000,
          value: Number((2.48 + 0.12 * Math.cos(i * 0.5)).toFixed(2)),
          isOos: false
        }))
      },
      {
        id: 'PARAM-AGITATOR',
        name: 'Impeller Agitation Speed',
        unit: 'RPM',
        tagAddress: 'reactor1/agitator_rpm',
        setpoint: 320,
        minLimit: 290,
        maxLimit: 350,
        currentValue: 318,
        avgValue: 319,
        minValue: 305,
        maxValue: 332,
        oosViolationCount: 0,
        telemetryHistory: Array.from({ length: 24 }, (_, i) => ({
          timestamp: Date.now() - (24 - i) * 600000,
          value: Math.round(320 + 8 * Math.sin(i * 0.8)),
          isOos: false
        }))
      },
      {
        id: 'PARAM-PH',
        name: 'In-Line Solution pH',
        unit: 'pH',
        tagAddress: 'reactor1/ph_level',
        setpoint: 5.80,
        minLimit: 5.50,
        maxLimit: 6.10,
        currentValue: 5.82,
        avgValue: 5.81,
        minValue: 5.68,
        maxValue: 5.95,
        oosViolationCount: 0,
        telemetryHistory: Array.from({ length: 24 }, (_, i) => ({
          timestamp: Date.now() - (24 - i) * 600000,
          value: Number((5.80 + 0.08 * Math.sin(i * 0.4)).toFixed(2)),
          isOos: false
        }))
      }
    ],
    finishedSerials: Array.from({ length: 12 }, (_, i) => ({
      serialNumber: `SN-B088-${1000 + i}`,
      barcodeQrPayload: `https://app.tascautomation.com/trace?sn=SN-B088-${1000 + i}&batch=BATCH-2026-088`,
      packTimestamp: Date.now() - (12 - i) * 900000,
      weightGrams: 502.4 + (i % 3) * 0.2,
      inspectionResult: 'PASS',
      operatorId: 'OP-412'
    })),
    auditTrail: [
      {
        id: 'AUD-01',
        timestamp: Date.now() - 4.5 * 3600 * 1000,
        action: 'Work Order Initialized & Raw Materials Dispensed',
        performedBy: 'Dr. Marcus Vance',
        role: 'Formulation Chemist',
        signatureMeaning: 'CREATE',
        details: 'Verified LOT-API-9941, LOT-SOLV-4019, and LOT-STAB-8102 weights against master formula.'
      },
      {
        id: 'AUD-02',
        timestamp: Date.now() - 4.3 * 3600 * 1000,
        action: 'Clean-in-Place (CIP) & Sterilization Sign-off',
        performedBy: 'Elena Rostova',
        role: 'Quality Assurance Supervisor',
        signatureMeaning: 'START',
        details: 'Pre-batch bioburden swab verified negative. Steam-in-Place completed at 121.5°C.'
      }
    ],
    qrVerificationUrl: 'https://app.tascautomation.com/trace/BATCH-2026-088'
  },
  {
    id: 'batch_bev_087',
    batchNumber: 'BATCH-2026-087',
    workOrderNumber: 'WO-6831-BEV',
    recipeName: 'Premium Sparkling Citrus Concentrate',
    recipeVersion: 'v1.8',
    lineId: 'line_bottling_1',
    lineName: 'Beverage Bottling & Capping Line #1',
    status: BatchStatus.APPROVED,
    targetQuantity: 10000,
    actualQuantity: 9940,
    scrapQuantity: 60,
    yieldPercentage: 99.40,
    unit: 'Bottles',
    startTimestamp: Date.now() - 28 * 3600 * 1000,
    endTimestamp: Date.now() - 20 * 3600 * 1000,
    durationMinutes: 480,
    leadOperator: 'Carlos Gomez',
    supervisorName: 'Sarah Jenkins (Plant QA)',
    qaApprover: 'Dr. Arthur Pendelton',
    rawMaterials: [
      {
        id: 'RM-LOT-11',
        lotNumber: 'LOT-CITRUS-552',
        materialCode: 'ING-CITRUS-OIL',
        materialName: 'Natural Sicilian Lemon & Lime Essential Oil',
        supplierName: 'Symrise Flavor Ingredients',
        supplierLotNumber: 'SYM-IT-8841',
        inwardDate: '2026-07-20',
        expiryDate: '2027-07-20',
        quantityUsed: 180.0,
        unit: 'kg',
        coaAttached: true,
        qualityGrade: 'A',
        passedInspection: true
      },
      {
        id: 'RM-LOT-12',
        lotNumber: 'LOT-SUGAR-9941',
        materialCode: 'ING-CANE-SYRUP',
        materialName: 'Refined Pure Cane Liquid Sugar 67 Brix',
        supplierName: 'Tate & Lyle Sugar Refineries',
        supplierLotNumber: 'TL-UK-1099',
        inwardDate: '2026-08-02',
        expiryDate: '2027-02-02',
        quantityUsed: 3500.0,
        unit: 'Liters',
        coaAttached: true,
        qualityGrade: 'A',
        passedInspection: true
      }
    ],
    parameters: [
      {
        id: 'PARAM-BRIX',
        name: 'Refractometer Brix Concentration',
        unit: '°Bx',
        setpoint: 11.20,
        minLimit: 11.00,
        maxLimit: 11.40,
        currentValue: 11.22,
        avgValue: 11.21,
        minValue: 11.08,
        maxValue: 11.34,
        oosViolationCount: 0,
        telemetryHistory: []
      },
      {
        id: 'PARAM-CARBONATION',
        name: 'CO2 Carbonation Volume',
        unit: 'Vol',
        setpoint: 3.80,
        minLimit: 3.60,
        maxLimit: 4.00,
        currentValue: 3.81,
        avgValue: 3.82,
        minValue: 3.65,
        maxValue: 3.96,
        oosViolationCount: 0,
        telemetryHistory: []
      }
    ],
    finishedSerials: Array.from({ length: 8 }, (_, i) => ({
      serialNumber: `SN-BEV-${8800 + i}`,
      barcodeQrPayload: `https://app.tascautomation.com/trace?sn=SN-BEV-${8800 + i}`,
      packTimestamp: Date.now() - (24 - i) * 3600000,
      weightGrams: 330.0,
      inspectionResult: 'PASS',
      operatorId: 'OP-104'
    })),
    auditTrail: [
      {
        id: 'AUD-11',
        timestamp: Date.now() - 28 * 3600 * 1000,
        action: 'Batch Release & Production Start',
        performedBy: 'Carlos Gomez',
        role: 'Line Operator',
        signatureMeaning: 'START',
        details: 'Sanitization and recipe verification complete.'
      },
      {
        id: 'AUD-12',
        timestamp: Date.now() - 20 * 3600 * 1000,
        action: 'Final Quality Release & Commercial Approval',
        performedBy: 'Dr. Arthur Pendelton',
        role: 'Quality Director',
        signatureMeaning: 'QUALITY_SIGN_OFF',
        details: 'All micro and chemical assays conform to specification. Approved for shipment.'
      }
    ]
  }
];

export class TraceabilityService {
  public static loadBatches(): BatchRecord[] {
    if (typeof localStorage === 'undefined') return SEED_BATCHES;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BATCHES);
      if (!raw) {
        this.saveBatches(SEED_BATCHES);
        return SEED_BATCHES;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_BATCHES;
    } catch {
      return SEED_BATCHES;
    }
  }

  public static saveBatches(batches: BatchRecord[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(batches));
    } catch (e) {
      console.error('[TraceabilityService] Failed to save batches:', e);
    }
  }

  public static getActiveBatchId(): string {
    if (typeof localStorage === 'undefined') return SEED_BATCHES[0].id;
    return localStorage.getItem(STORAGE_KEY_ACTIVE_BATCH) || SEED_BATCHES[0].id;
  }

  public static setActiveBatchId(id: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_ACTIVE_BATCH, id);
  }

  /**
   * Forward Recall: Searches all batches that consumed a specific raw material lot.
   */
  public static forwardRecall(lotNumberQuery: string): RecallSearchResult[] {
    const q = lotNumberQuery.trim().toUpperCase();
    const batches = this.loadBatches();
    const results: RecallSearchResult[] = [];

    batches.forEach(b => {
      const matchedLot = b.rawMaterials.find(rm => 
        rm.lotNumber.toUpperCase().includes(q) || 
        rm.supplierLotNumber.toUpperCase().includes(q) ||
        rm.materialName.toUpperCase().includes(q)
      );

      if (matchedLot) {
        results.push({
          searchQuery: lotNumberQuery,
          searchType: 'FORWARD_LOT',
          matchedBatch: b,
          affectedSerialsCount: b.finishedSerials.length,
          affectedSerials: b.finishedSerials.map(s => s.serialNumber),
          rawMaterialsSummary: b.rawMaterials.map(rm => ({
            materialName: rm.materialName,
            lotNumber: rm.lotNumber,
            supplier: rm.supplierName
          })),
          processCompliancePct: b.yieldPercentage,
          recallRiskLevel: b.status === BatchStatus.APPROVED ? 'HIGH' : 'MEDIUM'
        });
      }
    });

    return results;
  }

  /**
   * Backward Recall: Searches a specific finished serial or QR code to trace its full genealogy.
   */
  public static backwardRecall(serialNumberQuery: string): RecallSearchResult | null {
    const q = serialNumberQuery.trim().toUpperCase();
    const batches = this.loadBatches();

    for (const b of batches) {
      const matchedSerial = b.finishedSerials.find(s => s.serialNumber.toUpperCase().includes(q));
      if (matchedSerial || b.batchNumber.toUpperCase().includes(q)) {
        return {
          searchQuery: serialNumberQuery,
          searchType: 'BACKWARD_SERIAL',
          matchedBatch: b,
          affectedSerialsCount: b.finishedSerials.length,
          affectedSerials: [matchedSerial ? matchedSerial.serialNumber : b.finishedSerials[0]?.serialNumber || 'SN-UNKNOWN'],
          rawMaterialsSummary: b.rawMaterials.map(rm => ({
            materialName: rm.materialName,
            lotNumber: rm.lotNumber,
            supplier: rm.supplierName
          })),
          processCompliancePct: b.yieldPercentage,
          recallRiskLevel: 'LOW'
        };
      }
    }

    return null;
  }
}
