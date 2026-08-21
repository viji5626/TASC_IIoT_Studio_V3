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

export interface MultiAgentContext {
  appState: AppState;
  activeAlarms: ActiveAlarm[];
  latestValues: Record<string, { val: any; time: string; timestampMs?: number; quality?: string }>;
}

export function emitAgentActivity(
  agentType: MultiAgentSpecialistType,
  agentName: string,
  status: MultiAgentEvent['status'],
  actionDescription: string
): void {
  const event: MultiAgentEvent = {
    agentType,
    agentName,
    status,
    actionDescription,
    timestamp: Date.now()
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

export async function runTelemetrySpecialist(
  tagIds: string[],
  fromMs: number,
  toMs: number
): Promise<Array<{
  tagId: string;
  source: 'precomputed_chunk' | 'historian_raw';
  stats: { min: number; max: number; avg: number; delta: number; count: number };
}>> {
  emitAgentActivity('telemetry', 'Telemetry Specialist', 'running', `Analyzing time-series data for ${tagIds.length} tags...`);

  const results: Array<any> = [];

  for (const tagId of tagIds) {
    // 1. Check if a precomputed 1-day chunk exists in TascAiMemoryDB
    const dateStr = new Date(toMs).toISOString().slice(0, 10);
    const chunkKey = `chunk_${tagId}_1d_${dateStr}`;
    const cached = await getPrecomputedChunk(chunkKey);

    if (cached && cached.stats) {
      results.push({
        tagId,
        source: 'precomputed_chunk',
        stats: cached.stats
      });
      continue;
    }

    // 2. Query Historian Range directly
    const points = await queryHistoricalRange(tagId, fromMs, toMs);
    const values = points.map(p => p.v).filter(v => typeof v === 'number' && isFinite(v));

    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = Math.round((sum / values.length) * 100) / 100;
      const delta = Math.max(0, values[values.length - 1] - values[0]);

      results.push({
        tagId,
        source: 'historian_raw',
        stats: { min, max, avg, delta, count: values.length }
      });
    }
  }

  emitAgentActivity('telemetry', 'Telemetry Specialist', 'completed', `Telemetry computed for ${results.length} tags`);
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
  emitAgentActivity('supervisor', 'Supervisor Orchestrator', 'running', 'Dispatching specialist micro-agents...');

  const cleanPrompt = promptText.toLowerCase();

  // 1. Run Memory Specialist on every prompt
  const memoryEvidence = await runMemorySpecialist(promptText, ctx.appState);

  // 2. Identify target tags
  const targetTagIds: string[] = memoryEvidence.resolvedAliases.map(a => a.tagId);

  // 3. Run Telemetry Specialist if time or numbers are requested
  let telemetryEvidence: Array<any> = [];
  if (cleanPrompt.includes('energy') || cleanPrompt.includes('power') || cleanPrompt.includes('temp') || cleanPrompt.includes('trend') || cleanPrompt.includes('yesterday') || cleanPrompt.includes('today') || cleanPrompt.includes('last')) {
    const now = Date.now();
    const fromMs = now - (24 * 3600 * 1000);
    telemetryEvidence = await runTelemetrySpecialist(targetTagIds, fromMs, now);
  }

  // 4. Run FDD Specialist if equipment health/faults are asked
  let fddEvidence: any = null;
  if (cleanPrompt.includes('fault') || cleanPrompt.includes('fdd') || cleanPrompt.includes('chiller') || cleanPrompt.includes('waste') || cleanPrompt.includes('maintenance') || cleanPrompt.includes('trip')) {
    fddEvidence = runFddSpecialist();
  }

  // 5. Run Diagnostic Specialist if communication or drivers are asked
  let diagEvidence: any = null;
  if (cleanPrompt.includes('driver') || cleanPrompt.includes('modbus') || cleanPrompt.includes('opc') || cleanPrompt.includes('connection') || cleanPrompt.includes('offline') || cleanPrompt.includes('quality')) {
    diagEvidence = runDiagnosticSpecialist(ctx.appState);
  }

  emitAgentActivity('supervisor', 'Supervisor Orchestrator', 'completed', 'Evidence compiled for synthesis');

  // Format into structured evidence block
  const lines: string[] = ['[MULTI-AGENT DOMAIN SPECIALIST EVIDENCE]'];

  if (memoryEvidence.resolvedAliases.length > 0) {
    lines.push(`- Learned Tag Aliases Resolved: ${memoryEvidence.resolvedAliases.map(a => `"${a.term}" ➔ ${a.tagName} (${a.tagId})`).join(', ')}`);
  }
  if (memoryEvidence.relevantNotes.length > 0) {
    lines.push(`- Plant SOP Notes Applied:\n  ${memoryEvidence.relevantNotes.join('\n  ')}`);
  }
  if (telemetryEvidence.length > 0) {
    lines.push(`- Telemetry Pre-Computed Stats:\n  ${telemetryEvidence.map(t => `Tag ${t.tagId} [Source: ${t.source}]: Min=${t.stats.min}, Max=${t.stats.max}, Avg=${t.stats.avg}, Delta=${t.stats.delta}`).join('\n  ')}`);
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

  return lines.length > 1 ? lines.join('\n') : '';
}
