/**
 * TASC IIoT Studio — Hybrid Multi-Agent Orchestration Engine
 *
 * Implements high-performance synchronous multi-agent coordination:
 *  1. Supervisor Router: Classifies user prompt into domain tasks.
 *  2. Deterministic Code-Specialists (<5ms execution):
 *     - `MemorySpecialist`: Schema-validated alias resolution & plant SOP lookup.
 *     - `TelemetrySpecialist`: Pre-computed chunk lookup & historian math.
 *     - `FddSpecialist`: Equipment rule checks & financial waste diagnostics ($/hr).
 *     - `DiagnosticSpecialist`: Modbus/OPC UA driver communication health & packet loss.
 *  3. Synthesis LLM Agent: Synthesizes specialist evidence in a single turn for 1–2s responses.
 *  4. Live Status Dispatcher: Emits `tasc_agent_activity` events to animate chat progress.
 */

import { AppState, ActiveAlarm, MultiAgentEvent, MultiAgentSpecialistType } from '../types';
import { getAllLearnedAliases, getAllPlantKnowledgeNotes, getPrecomputedChunk } from './aiMemoryStore';
import { resolveValidatedAlias } from './aiAliasValidator';
import { queryHistoricalRange } from './trendHistorianEngine';
import { getFddState } from './fddEngine';
import { OeePersistence } from '../services/OeePersistence';
import { OeeCalculationEngine } from '../services/OeeCalculationEngine';
import { TraceabilityService } from '../services/TraceabilityService';

export interface MultiAgentContext {
  appState: AppState;
  activeAlarms: ActiveAlarm[];
  latestValues: Record<string, { val: any; time: string; timestampMs?: number; quality?: string }>;
}

export function emitAgentActivity(
  agentType: MultiAgentSpecialistType,
  agentName: string,
  status: MultiAgentEvent['status'],
  actionDescription: string,
  activeAgentCount?: number
): void {
  const event: MultiAgentEvent = {
    agentType,
    agentName,
    status,
    actionDescription,
    timestamp: Date.now(),
    activeAgentCount
  };
  try {
    window.dispatchEvent(new CustomEvent('tasc_agent_activity', { detail: event }));
  } catch {}
}

// ─── 1. Specialist Micro-Agents (<5ms Execution) ──────────────────────────────

export async function runMemorySpecialist(queryText: string, appState: AppState): Promise<{
  resolvedAliases: Array<{ term: string; tagId: string; tagName: string }>;
  relevantNotes: string[];
}> {
  emitAgentActivity('memory', 'Memory Specialist', 'running', 'Searching plant SOPs & validating tag aliases...');

  const [aliases, notes] = await Promise.all([
    getAllLearnedAliases(),
    getAllPlantKnowledgeNotes()
  ]);

  // Resolve aliases with schema validation
  const resolvedAliases: Array<{ term: string; tagId: string; tagName: string }> = [];
  const words = queryText.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const chunk = words.slice(i, i + 4).join(' ');
    const res = resolveValidatedAlias(chunk, aliases, appState);
    if (res.resolvedTagId && res.resolvedTagName && !resolvedAliases.some(a => a.tagId === res.resolvedTagId)) {
      resolvedAliases.push({
        term: chunk,
        tagId: res.resolvedTagId,
        tagName: res.resolvedTagName
      });
    }
  }

  // Find relevant plant SOP notes
  const cleanQ = queryText.toLowerCase();
  const relevantNotes = notes
    .filter(n => cleanQ.includes(n.topic.toLowerCase()) || cleanQ.includes(n.category.toLowerCase()) || n.note.toLowerCase().includes(cleanQ))
    .slice(0, 3)
    .map(n => `[${n.category.toUpperCase()}] ${n.topic}: ${n.note}`);

  emitAgentActivity('memory', 'Memory Specialist', 'completed', `Found ${resolvedAliases.length} aliases, ${relevantNotes.length} SOP notes`);
  return { resolvedAliases, relevantNotes };
}

export interface TelemetryTimeHorizon {
  fromMs: number;
  toMs: number;
  isArchive: boolean;
  label: string;
  storageTier: 'hot_raw' | 'compressed_archive_chunk' | '1hour_rollup' | '1day_rollup';
}

export function parseQueryTimeHorizon(queryText: string): TelemetryTimeHorizon {
  const clean = queryText.toLowerCase();
  const now = Date.now();
  const ONE_HOUR = 3600 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;
  const ONE_MONTH = 30 * ONE_DAY;

  if (clean.includes('6 month') || clean.includes('six month') || clean.includes('half year') || clean.includes('180 day')) {
    return {
      fromMs: now - (6 * ONE_MONTH),
      toMs: now,
      isArchive: true,
      label: '6 Months (Long-Term Archive)',
      storageTier: 'compressed_archive_chunk'
    };
  }

  if (clean.includes('1 year') || clean.includes('one year') || clean.includes('365 day') || clean.includes('last year')) {
    return {
      fromMs: now - (12 * ONE_MONTH),
      toMs: now,
      isArchive: true,
      label: '1 Year (Long-Term Archive)',
      storageTier: '1day_rollup'
    };
  }

  if (clean.includes('3 month') || clean.includes('quarter') || clean.includes('90 day')) {
    return {
      fromMs: now - (3 * ONE_MONTH),
      toMs: now,
      isArchive: true,
      label: '3 Months (Quarterly Archive)',
      storageTier: 'compressed_archive_chunk'
    };
  }

  if (clean.includes('month') || clean.includes('30 day')) {
    return {
      fromMs: now - ONE_MONTH,
      toMs: now,
      isArchive: true,
      label: '1 Month Archive',
      storageTier: 'compressed_archive_chunk'
    };
  }

  if (clean.includes('week') || clean.includes('7 day')) {
    return {
      fromMs: now - (7 * ONE_DAY),
      toMs: now,
      isArchive: false,
      label: '7 Days',
      storageTier: 'hot_raw'
    };
  }

  // Default: 24 Hours
  return {
    fromMs: now - ONE_DAY,
    toMs: now,
    isArchive: false,
    label: '24 Hours',
    storageTier: 'hot_raw'
  };
}

export async function runTelemetrySpecialist(
  tagIds: string[],
  timeHorizon?: TelemetryTimeHorizon
): Promise<Array<{
  tagId: string;
  source: 'precomputed_chunk' | 'historian_raw' | 'compressed_archive_chunk' | '1hour_rollup' | '1day_rollup';
  timeframe: string;
  stats: { min: number; max: number; avg: number; delta: number; count: number };
}>> {
  const horizon = timeHorizon || {
    fromMs: Date.now() - (24 * 3600 * 1000),
    toMs: Date.now(),
    isArchive: false,
    label: '24 Hours',
    storageTier: 'hot_raw'
  };

  const isArchive = horizon.isArchive;
  const statusMsg = isArchive
    ? `Decompressing archive partition clusters & querying rollups (${horizon.label}) for ${tagIds.length} tags...`
    : `Analyzing time-series data (${horizon.label}) for ${tagIds.length} tags...`;

  emitAgentActivity('telemetry', 'Telemetry Specialist', 'running', statusMsg);

  const results: Array<any> = [];

  for (const tagId of tagIds) {
    // 1. Check if a precomputed 1-day chunk exists in TascAiMemoryDB for recent queries
    if (!isArchive) {
      const dateStr = new Date(horizon.toMs).toISOString().slice(0, 10);
      const chunkKey = `chunk_${tagId}_1d_${dateStr}`;
      const cached = await getPrecomputedChunk(chunkKey);

      if (cached && cached.stats) {
        results.push({
          tagId,
          source: 'precomputed_chunk',
          timeframe: horizon.label,
          stats: cached.stats
        });
        continue;
      }
    }

    // 2. Query Historian Range directly (routes through hot raw + decompressing cluster partition archives)
    const points = await queryHistoricalRange(tagId, horizon.fromMs, horizon.toMs, 1000);
    const values = points.map(p => p.v).filter(v => typeof v === 'number' && isFinite(v));

    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = Math.round((sum / values.length) * 100) / 100;
      const delta = Math.max(0, values[values.length - 1] - values[0]);

      const sourceTier = isArchive ? (horizon.storageTier || 'compressed_archive_chunk') : 'historian_raw';

      results.push({
        tagId,
        source: sourceTier,
        timeframe: horizon.label,
        stats: { min, max, avg, delta, count: values.length }
      });
    }
  }

  const completionMsg = isArchive
    ? `Archive data retrieved & decompressed for ${results.length} tags (${horizon.label})`
    : `Telemetry computed for ${results.length} tags (${horizon.label})`;

  emitAgentActivity('telemetry', 'Telemetry Specialist', 'completed', completionMsg);
  return results;
}

export function runFddSpecialist(): {
  activeFaultsCount: number;
  criticalCount: number;
  totalCostPerHour: number;
  excessKw: number;
  topFaultSummaries: string[];
} {
  emitAgentActivity('fdd', 'FDD Diagnostic Specialist', 'running', 'Evaluating equipment degradation & financial waste...');
  const fddState = getFddState();

  const topFaultSummaries = fddState.activeFaults.slice(0, 3).map(f => 
    `- [${f.severity}] ${f.assetName || 'Equipment'}: ${f.ruleName} (Waste: $${f.costPerHour || 0}/hr, ${f.energyWasteKw || 0} kW)`
  );

  emitAgentActivity('fdd', 'FDD Diagnostic Specialist', 'completed', `${fddState.activeFaults.length} active faults analyzed`);

  return {
    activeFaultsCount: fddState.activeFaults.length,
    criticalCount: fddState.kpis?.criticalCount || 0,
    totalCostPerHour: fddState.kpis?.totalCostPerHour || 0,
    excessKw: fddState.kpis?.totalEnergyWasteKw || 0,
    topFaultSummaries
  };
}

export function runDiagnosticSpecialist(appState: AppState): {
  connectedDrivers: number;
  totalDrivers: number;
  badQualityTagsCount: number;
  driverSummaries: string[];
} {
  emitAgentActivity('diagnostic', 'Protocol & Driver Specialist', 'running', 'Checking industrial PLC communication health...');
  const drivers = appState.driverConnections || [];
  const driverTags = appState.driverTags || [];

  const connectedDrivers = drivers.filter(d => d.connected).length;
  const badQualityTagsCount = driverTags.filter(t => t.quality === 'bad').length;

  const driverSummaries = drivers.map(d => 
    `- Driver "${d.connectionName}" (${d.protocol}): ${d.connected ? 'ONLINE' : 'OFFLINE'}`
  );

  emitAgentActivity('diagnostic', 'Protocol & Driver Specialist', 'completed', `Drivers: ${connectedDrivers}/${drivers.length} online`);
  return {
    connectedDrivers,
    totalDrivers: drivers.length,
    badQualityTagsCount,
    driverSummaries
  };
}

// ─── Supervisor Coordinated Pipeline ──────────────────────────────────────────

/**
 * Runs the Multi-Agent Evidence Gathering Pipeline before the final Synthesis LLM turn.
 */
export async function gatherMultiAgentEvidence(
  promptText: string,
  ctx: MultiAgentContext
): Promise<string> {
  const cleanPrompt = promptText.toLowerCase();

  // Dynamically determine required specialists for this specific query
  const plannedSpecialists: string[] = ['Memory Specialist'];

  const needsTelemetry =
    cleanPrompt.includes('energy') ||
    cleanPrompt.includes('power') ||
    cleanPrompt.includes('temp') ||
    cleanPrompt.includes('trend') ||
    cleanPrompt.includes('yesterday') ||
    cleanPrompt.includes('today') ||
    cleanPrompt.includes('last') ||
    cleanPrompt.includes('month') ||
    cleanPrompt.includes('archive') ||
    cleanPrompt.includes('history') ||
    cleanPrompt.includes('historical') ||
    cleanPrompt.includes('year') ||
    cleanPrompt.includes('quarter');
  if (needsTelemetry) plannedSpecialists.push('Telemetry Specialist');

  const needsFdd =
    cleanPrompt.includes('fault') ||
    cleanPrompt.includes('fdd') ||
    cleanPrompt.includes('chiller') ||
    cleanPrompt.includes('waste') ||
    cleanPrompt.includes('maintenance') ||
    cleanPrompt.includes('trip');
  if (needsFdd) plannedSpecialists.push('FDD Diagnostic Specialist');

  const needsDiag =
    cleanPrompt.includes('driver') ||
    cleanPrompt.includes('modbus') ||
    cleanPrompt.includes('opc') ||
    cleanPrompt.includes('connection') ||
    cleanPrompt.includes('offline') ||
    cleanPrompt.includes('quality');
  if (needsDiag) plannedSpecialists.push('Protocol & Driver Specialist');

  const needsOee =
    cleanPrompt.includes('oee') ||
    cleanPrompt.includes('downtime') ||
    cleanPrompt.includes('bottling') ||
    cleanPrompt.includes('cnc') ||
    cleanPrompt.includes('carton') ||
    cleanPrompt.includes('availability') ||
    cleanPrompt.includes('performance') ||
    cleanPrompt.includes('pareto') ||
    cleanPrompt.includes('shift');
  if (needsOee) plannedSpecialists.push('OEE Production Specialist');

  const needsTrace =
    cleanPrompt.includes('batch') ||
    cleanPrompt.includes('recipe') ||
    cleanPrompt.includes('genealogy') ||
    cleanPrompt.includes('lot') ||
    cleanPrompt.includes('recall') ||
    cleanPrompt.includes('coa') ||
    cleanPrompt.includes('cfr') ||
    cleanPrompt.includes('serial');
  if (needsTrace) plannedSpecialists.push('Batch Traceability Specialist');

  const activeCount = plannedSpecialists.length;

  emitAgentActivity(
    'supervisor',
    'Supervisor Orchestrator',
    'running',
    `Activating ${activeCount} domain specialist(s): ${plannedSpecialists.join(', ')}`,
    activeCount
  );

  // 1. Run Memory Specialist on every prompt
  const memoryEvidence = await runMemorySpecialist(promptText, ctx.appState);

  // 2. Identify target tags (from resolved aliases, or fallback to all registered driver tags)
  let targetTagIds: string[] = memoryEvidence.resolvedAliases.map(a => a.tagId);
  if (targetTagIds.length === 0 && ctx.appState.driverTags && ctx.appState.driverTags.length > 0) {
    targetTagIds = ctx.appState.driverTags.slice(0, 5).map(t => t.tagId);
  }

  // 3. Time Horizon Intent Analysis (Detects 6-Month, 1-Year, Archive requests)
  const timeHorizon = parseQueryTimeHorizon(promptText);

  // 4. Run Telemetry Specialist if needed
  let telemetryEvidence: Array<any> = [];
  if (needsTelemetry) {
    telemetryEvidence = await runTelemetrySpecialist(targetTagIds, timeHorizon);
  }

  // 5. Run FDD Specialist if needed
  let fddEvidence: any = null;
  if (needsFdd) {
    fddEvidence = runFddSpecialist();
  }

  // 6. Run Diagnostic Specialist if needed
  let diagEvidence: any = null;
  if (needsDiag) {
    diagEvidence = runDiagnosticSpecialist(ctx.appState);
  }

  // 7. Run OEE Specialist if needed
  let oeeEvidence: string | null = null;
  if (needsOee) {
    try {
      const oeeLines = OeePersistence.loadLines();
      const activeLineId = OeePersistence.getActiveLineId();
      const activeLine = oeeLines.find(l => l.id === activeLineId) || oeeLines[0];
      if (activeLine) {
        const events = OeePersistence.loadEvents(activeLine.id);
        const tags = activeLine.tags || {};
        const rawTotal = tags.totalCountTag && ctx.latestValues[tags.totalCountTag] !== undefined
          ? Number(ctx.latestValues[tags.totalCountTag]?.val || 0)
          : 0;
        const rawReject = tags.rejectCountTag && ctx.latestValues[tags.rejectCountTag] !== undefined
          ? Number(ctx.latestValues[tags.rejectCountTag]?.val || 0)
          : 0;
        const metrics = OeeCalculationEngine.calculateOee(activeLine, activeLine.plannedShiftHours * 3600, 0, activeLine.plannedDowntimeSec, 0, rawTotal, rawReject);
        oeeEvidence = `Line "${activeLine.name}" (Code: ${activeLine.code}): OEE=${metrics.oeePct.toFixed(1)}% (A=${metrics.availabilityPct.toFixed(1)}%, P=${metrics.performancePct.toFixed(1)}%, Q=${metrics.qualityPct.toFixed(1)}%), Produced=${metrics.totalCount} units, Rejects=${metrics.rejectCount}, Ideal Cycle=${activeLine.idealCycleTimeSec}s, Target=${activeLine.targetOeePct}%. Downtime Events: ${events.length}.`;
      }
    } catch {}
  }

  // 8. Run Batch Traceability Specialist if needed
  let traceEvidence: string | null = null;
  if (needsTrace) {
    try {
      const batches = TraceabilityService.loadBatches();
      const activeBatchId = TraceabilityService.getActiveBatchId();
      const activeBatch = batches.find(b => b.id === activeBatchId) || batches[0];
      if (activeBatch) {
        traceEvidence = `Batch ${activeBatch.batchNumber} (WO: ${activeBatch.workOrderNumber}, Recipe: "${activeBatch.recipeName}"): Status=${activeBatch.status}, Target=${activeBatch.targetQuantity} ${activeBatch.unit}, Actual=${activeBatch.actualQuantity}, Yield=${activeBatch.yieldPercentage}%, Raw Materials Bound=${activeBatch.rawMaterials.length} lots, Monitored CPPs=${activeBatch.parameters.length}, Finished Serials=${activeBatch.finishedSerials.length}. Total Batches in system: ${batches.length}.`;
      }
    } catch {}
  }

  emitAgentActivity(
    'supervisor',
    'Supervisor Orchestrator',
    'completed',
    `Evidence gathered across ${activeCount} active specialist domain(s)`,
    activeCount
  );

  // Format into structured evidence block
  const lines: string[] = ['[MULTI-AGENT DOMAIN SPECIALIST EVIDENCE]'];

  if (timeHorizon.isArchive) {
    lines.push(`- Time Horizon Analysis: ${timeHorizon.label} (Storage Tier: ${timeHorizon.storageTier.toUpperCase()} — Decompressed from persistent archive partitions)`);
  }

  if (memoryEvidence.resolvedAliases.length > 0) {
    lines.push(`- Learned Tag Aliases Resolved: ${memoryEvidence.resolvedAliases.map(a => `"${a.term}" ➔ ${a.tagName} (${a.tagId})`).join(', ')}`);
  }
  if (memoryEvidence.relevantNotes.length > 0) {
    lines.push(`- Plant SOP Notes Applied:\n  ${memoryEvidence.relevantNotes.join('\n  ')}`);
  }
  if (telemetryEvidence.length > 0) {
    lines.push(`- Telemetry Pre-Computed Stats (${timeHorizon.label}):\n  ${telemetryEvidence.map(t => `Tag ${t.tagId} [Source: ${t.source} | Window: ${t.timeframe}]: Min=${t.stats.min}, Max=${t.stats.max}, Avg=${t.stats.avg}, Delta=${t.stats.delta}, Samples=${t.stats.count}`).join('\n  ')}`);
  }
  if (fddEvidence) {
    lines.push(`- FDD Equipment Diagnostics: ${fddEvidence.activeFaultsCount} Active Faults (${fddEvidence.criticalCount} Critical, $${fddEvidence.totalCostPerHour}/hr waste)`);
    if (fddEvidence.topFaultSummaries.length > 0) {
      lines.push(`  ${fddEvidence.topFaultSummaries.join('\n  ')}`);
    }
  }
  if (diagEvidence) {
    lines.push(`- PLC Driver Health: ${diagEvidence.connectedDrivers}/${diagEvidence.totalDrivers} Drivers Online, ${diagEvidence.badQualityTagsCount} Bad Quality Tags`);
  }
  if (oeeEvidence) {
    lines.push(`- OEE Production Intelligence: ${oeeEvidence}`);
  }
  if (traceEvidence) {
    lines.push(`- Regulated Batch Traceability: ${traceEvidence}`);
  }

  return lines.length > 1 ? lines.join('\n') : '';
}
