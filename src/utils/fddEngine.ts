import {
  FddAsset,
  FddRule,
  FddActiveFault,
  FddFaultHistoryRecord,
  FddWorkOrder,
  FddState,
  FddKpis
} from './fddTypes';

const STORAGE_KEY_RULES = 'tasc_fdd_rules_v1';
const STORAGE_KEY_ACTIVE = 'tasc_fdd_active_v1';
const STORAGE_KEY_HISTORY = 'tasc_fdd_history_v1';
const STORAGE_KEY_ASSETS = 'tasc_fdd_assets_v1';
const STORAGE_KEY_WORK_ORDERS = 'tasc_fdd_work_orders_v1';

// Default Pre-seeded Assets
export const DEFAULT_FDD_ASSETS: FddAsset[] = [
  {
    assetId: 'asset_chiller_1',
    name: 'Chiller Unit #1 (York 450 TR)',
    category: 'chiller',
    location: 'Central Utility Plant - Bay 1',
    primaryTags: {
      temperature: 'Chiller.DischargeTemp',
      flow: 'Chiller.WaterFlow',
      current: 'Chiller.MotorCurrent',
      pressure: 'Chiller.EvaporatorPressure'
    },
    healthIndex: 88,
    activeFaultCount: 0
  },
  {
    assetId: 'asset_ahu_2',
    name: 'AHU-02 Cleanroom Air Handler',
    category: 'ahu',
    location: 'Cleanroom Building B - Mezzanine',
    primaryTags: {
      pressure: 'AHU.FilterDiffPressure',
      current: 'AHU.FanCurrent',
      temperature: 'AHU.SupplyAirTemp',
      speed: 'AHU.VFD_Speed'
    },
    healthIndex: 94,
    activeFaultCount: 0
  },
  {
    assetId: 'asset_air_washer_1',
    name: 'Industrial Air Washer Unit #1',
    category: 'air_washer',
    location: 'Production Floor A - East Duct',
    primaryTags: {
      humidity: 'AirWasher.RelHumidity',
      status: 'AirWasher.PumpStatus',
      temperature: 'AirWasher.WaterTemp'
    },
    healthIndex: 96,
    activeFaultCount: 0
  },
  {
    assetId: 'asset_exhaust_fan_4',
    name: 'Main Exhaust Fan #4',
    category: 'exhaust_fan',
    location: 'Roof Exhaust Station - Block D',
    primaryTags: {
      vibration: 'ExhaustFan.VibrationRMS',
      temperature: 'ExhaustFan.BearingTemp',
      current: 'ExhaustFan.Current'
    },
    healthIndex: 82,
    activeFaultCount: 0
  },
  {
    assetId: 'asset_compressor_2',
    name: 'Atlas Copco Screw Compressor #2',
    category: 'compressor',
    location: 'Utility Basement - Compressor Room',
    primaryTags: {
      pressure: 'Compressor.DischargePress',
      current: 'Compressor.MotorCurrent',
      temperature: 'Compressor.OilTemp'
    },
    healthIndex: 78,
    activeFaultCount: 0
  }
];

// Default Pre-seeded FDD Rules
export const DEFAULT_FDD_RULES: FddRule[] = [
  {
    ruleId: 'rule_chiller_overheat',
    name: 'Chiller Overheat with Low Water Flow',
    assetId: 'asset_chiller_1',
    assetName: 'Chiller Unit #1 (York 450 TR)',
    category: 'chiller',
    expression: 'Chiller.DischargeTemp > 85 && Chiller.WaterFlow < 25',
    severity: 'CRITICAL',
    debounceSeconds: 5,
    deadband: 2.0,
    energyWasteKw: 45.0,
    costPerHour: 120.0,
    enabled: true,
    description: 'Chiller discharge temperature exceeded 85°C while chilled water flow rate dropped below 25 m³/h, risking compressor trip and thermal stress.',
    createdIso: new Date().toISOString()
  },
  {
    ruleId: 'rule_ahu_filter_clog',
    name: 'AHU Filter Clogging & High Fan Power',
    assetId: 'asset_ahu_2',
    assetName: 'AHU-02 Cleanroom Air Handler',
    category: 'ahu',
    expression: 'AHU.FilterDiffPressure > 250 && AHU.FanCurrent > 18',
    severity: 'HIGH',
    debounceSeconds: 8,
    deadband: 15.0,
    energyWasteKw: 14.5,
    costPerHour: 45.0,
    enabled: true,
    description: 'Filter differential pressure exceeded 250 Pa while fan motor current is above 18A, indicating severe particulate clogging and HVAC efficiency degradation.',
    createdIso: new Date().toISOString()
  },
  {
    ruleId: 'rule_air_washer_saturation',
    name: 'Air Washer High Humidity Over-Saturation',
    assetId: 'asset_air_washer_1',
    assetName: 'Industrial Air Washer Unit #1',
    category: 'air_washer',
    expression: 'AirWasher.RelHumidity > 92 && AirWasher.PumpStatus == 1',
    severity: 'MEDIUM',
    debounceSeconds: 10,
    deadband: 3.0,
    energyWasteKw: 6.0,
    costPerHour: 20.0,
    enabled: true,
    description: 'Relative humidity exceeded 92% with spray pump active, causing condensation risk and product moisture damage.',
    createdIso: new Date().toISOString()
  },
  {
    ruleId: 'rule_fan_vibration_creep',
    name: 'Exhaust Fan Bearing Vibration Creep',
    assetId: 'asset_exhaust_fan_4',
    assetName: 'Main Exhaust Fan #4',
    category: 'exhaust_fan',
    expression: 'ExhaustFan.VibrationRMS > 4.5',
    severity: 'HIGH',
    debounceSeconds: 6,
    deadband: 0.5,
    energyWasteKw: 8.0,
    costPerHour: 60.0,
    enabled: true,
    description: 'Radial bearing vibration exceeded ISO 10816 Zone C threshold (4.5 mm/s RMS), indicating mechanical unbalance or imminent bearing race degradation.',
    createdIso: new Date().toISOString()
  },
  {
    ruleId: 'rule_compressor_pressure_drop',
    name: 'Air Compressor High Current with Low Discharge Pressure',
    assetId: 'asset_compressor_2',
    assetName: 'Atlas Copco Screw Compressor #2',
    category: 'compressor',
    expression: 'Compressor.DischargePress < 5.5 && Compressor.MotorCurrent > 42',
    severity: 'CRITICAL',
    debounceSeconds: 5,
    deadband: 0.3,
    energyWasteKw: 38.0,
    costPerHour: 95.0,
    enabled: true,
    description: 'Air discharge pressure fell below 5.5 bar while motor draw exceeds 42A, indicating severe airline leakage, air-end slippage, or unloader valve fault.',
    createdIso: new Date().toISOString()
  }
];

// Debounce state tracking in memory
const ruleDebounceMap = new Map<string, number>();

// In-Memory Fallback State (for server or browser)
let stateRules: FddRule[] = [];
let stateActiveFaults: FddActiveFault[] = [];
let stateHistory: FddFaultHistoryRecord[] = [];
let stateAssets: FddAsset[] = [];
let stateWorkOrders: FddWorkOrder[] = [];

/**
 * Initializes FDD State from storage or defaults.
 */
export function initFddState(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const savedRules = localStorage.getItem(STORAGE_KEY_RULES);
      stateRules = savedRules ? JSON.parse(savedRules) : DEFAULT_FDD_RULES;

      const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE);
      stateActiveFaults = savedActive ? JSON.parse(savedActive) : [];

      const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      stateHistory = savedHistory ? JSON.parse(savedHistory) : [];

      const savedAssets = localStorage.getItem(STORAGE_KEY_ASSETS);
      stateAssets = savedAssets ? JSON.parse(savedAssets) : DEFAULT_FDD_ASSETS;

      const savedWorkOrders = localStorage.getItem(STORAGE_KEY_WORK_ORDERS);
      stateWorkOrders = savedWorkOrders ? JSON.parse(savedWorkOrders) : [];
      return;
    }
  } catch (e) {
    console.warn('[FDD Engine] Storage load fallback to memory:', e);
  }

  stateRules = [...DEFAULT_FDD_RULES];
  stateActiveFaults = [];
  stateHistory = [];
  stateAssets = [...DEFAULT_FDD_ASSETS];
  stateWorkOrders = [];
}

/**
 * Persists current FDD state to localStorage.
 */
function persistState(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(stateRules));
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(stateActiveFaults));
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(stateHistory));
    localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(stateAssets));
    localStorage.setItem(STORAGE_KEY_WORK_ORDERS, JSON.stringify(stateWorkOrders));
  } catch (e) {
    console.warn('[FDD Engine] Storage persist error:', e);
  }
}

/**
 * Safe Mathematical & Boolean Expression Evaluator (Zero eval)
 */
export function evaluateFddExpression(
  expression: string,
  tagValues: Record<string, any>
): { result: boolean; triggerValues: Record<string, any>; error?: string } {
  const triggerValues: Record<string, any> = {};
  if (!expression || !expression.trim()) {
    return { result: false, triggerValues, error: 'Empty expression' };
  }

  try {
    // Extract variable identifiers (words like Chiller.DischargeTemp, tag_123, AHU_Pressure)
    const tokenRegex = /([a-zA-Z_][a-zA-Z0-9_\.]*)/g;
    const reservedWords = new Set(['true', 'false', 'null', 'undefined', 'abs', 'min', 'max', 'round', 'Math']);

    let sanitizedExpression = expression;
    const matches = expression.match(tokenRegex) || [];

    for (const token of matches) {
      if (reservedWords.has(token) || !isNaN(Number(token))) continue;

      // Lookup token in tagValues (exact, case-insensitive, or partial key match)
      let val: any = undefined;
      if (tagValues[token] !== undefined) {
        val = typeof tagValues[token] === 'object' && tagValues[token] !== null ? tagValues[token].val : tagValues[token];
      } else {
        const lowerToken = token.toLowerCase();
        const foundKey = Object.keys(tagValues).find(k => k.toLowerCase() === lowerToken || k.toLowerCase().endsWith(lowerToken));
        if (foundKey) {
          const raw = tagValues[foundKey];
          val = typeof raw === 'object' && raw !== null ? raw.val : raw;
        }
      }

      // If value is boolean or numeric
      if (typeof val === 'boolean') {
        sanitizedExpression = sanitizedExpression.replaceAll(token, val ? 'true' : 'false');
        triggerValues[token] = val;
      } else if (val !== undefined && val !== null && !isNaN(Number(val))) {
        const numVal = Number(val);
        sanitizedExpression = sanitizedExpression.replaceAll(token, numVal.toString());
        triggerValues[token] = numVal;
      } else {
        // Tag value not found or offline/bad
        return { result: false, triggerValues, error: `Unresolved or offline tag: ${token}` };
      }
    }

    // Evaluate sanitized boolean arithmetic expression safely using standard precedence parser
    const isTriggered = safeComputeBoolean(sanitizedExpression);
    return { result: isTriggered, triggerValues };
  } catch (err: any) {
    return { result: false, triggerValues, error: err.message };
  }
}

/**
 * Safe Recursive Descent / Token Boolean Arithmetic Evaluator (Safe AST without eval)
 */
function safeComputeBoolean(expr: string): boolean {
  // Support standard logic operators: &&, ||, ==, !=, >=, <=, >, <
  // Handle OR clauses (lowest precedence)
  const orClauses = splitRespectingParens(expr, '||');
  if (orClauses.length > 1) {
    return orClauses.some(clause => safeComputeBoolean(clause.trim()));
  }

  // Handle AND clauses
  const andClauses = splitRespectingParens(expr, '&&');
  if (andClauses.length > 1) {
    return andClauses.every(clause => safeComputeBoolean(clause.trim()));
  }

  const clean = expr.trim();
  if (clean.startsWith('(') && clean.endsWith(')') && checkParensMatch(clean.slice(1, -1))) {
    return safeComputeBoolean(clean.slice(1, -1).trim());
  }

  // Comparisons
  const compOps = ['==', '!=', '>=', '<=', '>', '<'];
  for (const op of compOps) {
    const parts = splitRespectingParens(clean, op);
    if (parts.length === 2) {
      const left = evaluateNumericValue(parts[0].trim());
      const right = evaluateNumericValue(parts[1].trim());

      switch (op) {
        case '==': return left === right;
        case '!=': return left !== right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '>': return left > right;
        case '<': return left < right;
      }
    }
  }

  if (clean === 'true') return true;
  if (clean === 'false') return false;
  return evaluateNumericValue(clean) !== 0;
}

function evaluateNumericValue(expr: string): number {
  const clean = expr.trim();
  if (!isNaN(Number(clean))) return Number(clean);
  if (clean.startsWith('abs(') && clean.endsWith(')')) {
    return Math.abs(evaluateNumericValue(clean.slice(4, -1)));
  }
  // Basic math additions/subtractions
  if (clean.includes('+')) {
    const parts = clean.split('+');
    return parts.reduce((acc, p) => acc + evaluateNumericValue(p.trim()), 0);
  }
  if (clean.includes('-') && !clean.startsWith('-')) {
    const parts = clean.split('-');
    return parts.slice(1).reduce((acc, p) => acc - evaluateNumericValue(p.trim()), evaluateNumericValue(parts[0].trim()));
  }
  return Number(clean) || 0;
}

function splitRespectingParens(str: string, delimiter: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (depth === 0 && str.startsWith(delimiter, i)) {
      result.push(current);
      current = '';
      i += delimiter.length - 1;
      continue;
    }
    current += char;
  }
  if (current.length > 0) result.push(current);
  return result;
}

function checkParensMatch(str: string): boolean {
  let depth = 0;
  for (const c of str) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/**
 * Main Real-Time FDD Rule Evaluation Cycle
 * Evaluates all enabled rules against live tag telemetry.
 */
export function evaluateAllFddRules(
  latestValues: Record<string, any>
): FddState {
  if (stateRules.length === 0) {
    initFddState();
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  for (const rule of stateRules) {
    if (!rule.enabled) {
      ruleDebounceMap.delete(rule.ruleId);
      continue;
    }

    const { result, triggerValues } = evaluateFddExpression(rule.expression, latestValues);
    const existingActiveIndex = stateActiveFaults.findIndex(f => f.ruleId === rule.ruleId);

    if (result) {
      // Condition is currently true
      let debounceStart = ruleDebounceMap.get(rule.ruleId);
      if (!debounceStart) {
        debounceStart = nowMs;
        ruleDebounceMap.set(rule.ruleId, debounceStart);
      }

      const elapsedSec = (nowMs - debounceStart) / 1000;

      // If debounce duration satisfied and not yet in active faults
      if (elapsedSec >= rule.debounceSeconds && existingActiveIndex === -1) {
        const newFault: FddActiveFault = {
          faultId: `fault_${rule.ruleId}_${nowMs}`,
          ruleId: rule.ruleId,
          ruleName: rule.name,
          assetId: rule.assetId,
          assetName: rule.assetName,
          category: rule.category,
          severity: rule.severity,
          triggerTimestamp: nowIso,
          triggerTimestampMs: nowMs,
          triggerValues,
          durationSeconds: Math.floor(elapsedSec),
          energyWasteKw: rule.energyWasteKw,
          costPerHour: rule.costPerHour,
          totalCostImpact: Math.round(((elapsedSec / 3600) * rule.costPerHour) * 100) / 100,
          ackStatus: false
        };

        stateActiveFaults.push(newFault);
      } else if (existingActiveIndex !== -1) {
        // Update duration and accumulated financial waste on existing active fault
        const fault = stateActiveFaults[existingActiveIndex];
        const durationSec = Math.max(1, Math.floor((nowMs - fault.triggerTimestampMs) / 1000));
        fault.durationSeconds = durationSec;
        fault.totalCostImpact = Math.round(((durationSec / 3600) * fault.costPerHour) * 100) / 100;
        fault.triggerValues = triggerValues;
      }
    } else {
      // Condition is currently false
      ruleDebounceMap.delete(rule.ruleId);

      // If was previously active, resolve and move to history
      if (existingActiveIndex !== -1) {
        const resolvedFault = stateActiveFaults[existingActiveIndex];
        stateActiveFaults.splice(existingActiveIndex, 1);

        const historyRecord: FddFaultHistoryRecord = {
          historyId: `hist_${resolvedFault.faultId}`,
          faultId: resolvedFault.faultId,
          ruleId: resolvedFault.ruleId,
          ruleName: resolvedFault.ruleName,
          assetId: resolvedFault.assetId,
          assetName: resolvedFault.assetName,
          category: resolvedFault.category,
          severity: resolvedFault.severity,
          triggerTimestamp: resolvedFault.triggerTimestamp,
          clearTimestamp: nowIso,
          durationSeconds: resolvedFault.durationSeconds,
          totalCostImpact: resolvedFault.totalCostImpact,
          rootCauseSummary: resolvedFault.rootCauseAnalysis?.probableCauses[0]?.cause
        };

        // Keep last 100 history records
        stateHistory = [historyRecord, ...stateHistory.slice(0, 99)];
      }
    }
  }

  // Update Asset Health Index & Active Fault Counts
  for (const asset of stateAssets) {
    const assetFaults = stateActiveFaults.filter(f => f.assetId === asset.assetId);
    asset.activeFaultCount = assetFaults.length;

    let penalty = 0;
    for (const f of assetFaults) {
      if (f.severity === 'CRITICAL') penalty += 35;
      else if (f.severity === 'HIGH') penalty += 20;
      else if (f.severity === 'MEDIUM') penalty += 10;
      else penalty += 5;
    }
    asset.healthIndex = Math.max(15, 100 - penalty);
  }

  // Compute Overall KPIs
  const criticalCount = stateActiveFaults.filter(f => f.severity === 'CRITICAL').length;
  const highCount = stateActiveFaults.filter(f => f.severity === 'HIGH').length;
  const mediumCount = stateActiveFaults.filter(f => f.severity === 'MEDIUM').length;
  const lowCount = stateActiveFaults.filter(f => f.severity === 'LOW').length;
  const totalCostPerHour = stateActiveFaults.reduce((acc, f) => acc + f.costPerHour, 0);
  const totalEnergyWasteKw = stateActiveFaults.reduce((acc, f) => acc + f.energyWasteKw, 0);
  const accumulatedDailyCost = stateActiveFaults.reduce((acc, f) => acc + f.totalCostImpact, 0);
  const avgHealthIndex = stateAssets.length > 0 
    ? Math.round(stateAssets.reduce((acc, a) => acc + a.healthIndex, 0) / stateAssets.length)
    : 100;
  const openWorkOrdersCount = stateWorkOrders.filter(w => w.status === 'SCHEDULED' || w.status === 'IN_PROGRESS').length;

  const kpis: FddKpis = {
    activeCount: stateActiveFaults.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalCostPerHour: Math.round(totalCostPerHour * 100) / 100,
    totalEnergyWasteKw: Math.round(totalEnergyWasteKw * 10) / 10,
    accumulatedDailyCost: Math.round(accumulatedDailyCost * 100) / 100,
    avgHealthIndex,
    openWorkOrdersCount
  };

  persistState();

  return {
    rules: stateRules,
    activeFaults: stateActiveFaults,
    history: stateHistory,
    assets: stateAssets,
    workOrders: stateWorkOrders,
    kpis,
    lastEvaluatedIso: nowIso
  };
}

/**
 * Get current FDD state snapshot.
 */
export function getFddState(): FddState {
  if (stateRules.length === 0) initFddState();
  const criticalCount = stateActiveFaults.filter(f => f.severity === 'CRITICAL').length;
  const highCount = stateActiveFaults.filter(f => f.severity === 'HIGH').length;
  const mediumCount = stateActiveFaults.filter(f => f.severity === 'MEDIUM').length;
  const lowCount = stateActiveFaults.filter(f => f.severity === 'LOW').length;
  const totalCostPerHour = stateActiveFaults.reduce((acc, f) => acc + f.costPerHour, 0);
  const totalEnergyWasteKw = stateActiveFaults.reduce((acc, f) => acc + f.energyWasteKw, 0);
  const accumulatedDailyCost = stateActiveFaults.reduce((acc, f) => acc + f.totalCostImpact, 0);
  const avgHealthIndex = stateAssets.length > 0 
    ? Math.round(stateAssets.reduce((acc, a) => acc + a.healthIndex, 0) / stateAssets.length)
    : 100;
  const openWorkOrdersCount = stateWorkOrders.filter(w => w.status === 'SCHEDULED' || w.status === 'IN_PROGRESS').length;

  return {
    rules: stateRules,
    activeFaults: stateActiveFaults,
    history: stateHistory,
    assets: stateAssets,
    workOrders: stateWorkOrders,
    kpis: {
      activeCount: stateActiveFaults.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      totalCostPerHour: Math.round(totalCostPerHour * 100) / 100,
      totalEnergyWasteKw: Math.round(totalEnergyWasteKw * 10) / 10,
      accumulatedDailyCost: Math.round(accumulatedDailyCost * 100) / 100,
      avgHealthIndex,
      openWorkOrdersCount
    },
    lastEvaluatedIso: new Date().toISOString()
  };
}

/**
 * Acknowledge an active fault.
 */
export function acknowledgeFddFault(faultId: string, user: string, note?: string): boolean {
  const fault = stateActiveFaults.find(f => f.faultId === faultId);
  if (!fault) return false;

  fault.ackStatus = true;
  fault.ackTimestamp = new Date().toISOString();
  fault.ackUser = user || 'Operator';
  fault.ackNote = note;
  persistState();
  return true;
}

/**
 * Add or update an FDD rule.
 */
export function saveFddRule(rule: FddRule): void {
  const idx = stateRules.findIndex(r => r.ruleId === rule.ruleId);
  if (idx >= 0) {
    stateRules[idx] = rule;
  } else {
    stateRules.push(rule);
  }
  persistState();
}

/**
 * Delete an FDD rule.
 */
export function deleteFddRule(ruleId: string): void {
  stateRules = stateRules.filter(r => r.ruleId !== ruleId);
  stateActiveFaults = stateActiveFaults.filter(f => f.ruleId !== ruleId);
  ruleDebounceMap.delete(ruleId);
  persistState();
}

/**
 * Create or update a Maintenance Work Order.
 */
export function saveFddWorkOrder(order: FddWorkOrder): void {
  const idx = stateWorkOrders.findIndex(w => w.orderId === order.orderId);
  if (idx >= 0) {
    stateWorkOrders[idx] = order;
  } else {
    stateWorkOrders.unshift(order);
  }
  persistState();
}

/**
 * Attach AI Diagnostic Report to active fault.
 */
export function attachFddAiReport(faultId: string, report: any): void {
  const fault = stateActiveFaults.find(f => f.faultId === faultId);
  if (fault) {
    fault.rootCauseAnalysis = report;
    persistState();
  }
}

/**
 * Reset and re-seed default sample rules and assets.
 */
export function resetFddDefaults(): void {
  stateRules = [...DEFAULT_FDD_RULES];
  stateAssets = [...DEFAULT_FDD_ASSETS];
  stateActiveFaults = [];
  stateHistory = [];
  stateWorkOrders = [];
  ruleDebounceMap.clear();
  persistState();
}
