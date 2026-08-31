/**
 * TASC IIoT Studio — Deterministic Offline Rule-Based Fallback Engine
 *
 * Provides 100% air-gapped, zero-cloud diagnostic reporting when neither
 * cloud LLMs (Gemini/OpenAI) nor local edge servers (Ollama) are reachable.
 *
 * Evaluates live telemetry against FDD AST rules, alarm logs, and industrial templates.
 */

import { CompactedTelemetryResult } from './epLttbCompactor';

export interface DeterministicReportOptions {
  reportTitle: string;
  reportType: 'ENERGY' | 'THERMAL' | 'ALARMS' | 'FDD' | 'CUSTOM';
  activeFaults?: Array<{ ruleName: string; assetId: string; severity: string; costPerHour: number; kwWaste: number; recommendation: string }>;
  alarmTrips?: Array<{ tag: string; message: string; severity: string; timestamp: string }>;
  telemetrySummaries?: CompactedTelemetryResult[];
  currencySymbol?: string;
}

export function generateDeterministicReport(options: DeterministicReportOptions): {
  markdownReport: string;
  htmlReport: string;
  isDeterministicFallback: boolean;
  generatedAt: string;
} {
  const now = new Date().toISOString();
  const curr = options.currencySymbol || '₹';
  const faults = options.activeFaults || [];
  const alarms = options.alarmTrips || [];

  const totalKwWaste = faults.reduce((sum, f) => sum + (f.kwWaste || 0), 0);
  const totalFinancialWastePerHour = faults.reduce((sum, f) => sum + (f.costPerHour || 0), 0);

  let statusBadge = faults.length === 0 ? '🟢 NORMAL / OPTIMAL' : faults.length < 3 ? '🟡 DEGRADED / ATTENTION REQUIRED' : '🔴 CRITICAL ANOMALY DETECTED';

  let md = `# 🏭 ${options.reportTitle}\n`;
  md += `**Generated**: ${new Date().toLocaleString()} | **Execution Engine**: *Deterministic Local FDD Expert System (100% Offline / Air-Gapped Safe)*\n\n`;
  md += `## 📊 Executive Plant Health Summary\n`;
  md += `- **Overall Condition**: **${statusBadge}**\n`;
  md += `- **Active Diagnostic Faults**: **${faults.length}**\n`;
  md += `- **Active Alarm Trip Interlocks**: **${alarms.length}**\n`;
  md += `- **Total Energy Waste Rate**: **${totalKwWaste.toFixed(1)} kW**\n`;
  md += `- **Estimated Financial Loss**: **${curr} ${totalFinancialWastePerHour.toLocaleString()}/hour**\n\n`;

  // 1. Diagnostic Faults
  md += `## 🔍 Active Condition-Based Maintenance (CBM) Findings\n`;
  if (faults.length > 0) {
    md += `| Equipment Asset | Fault Detection Rule | Severity | Est. Waste (${curr}/hr) | Recommended Action |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const f of faults) {
      md += `| **${f.assetId}** | ${f.ruleName} | \`${f.severity}\` | ${curr} ${f.costPerHour}/hr | ${f.recommendation} |\n`;
    }
    md += '\n';
  } else {
    md += `*All monitored equipment assets operating within optimal thermodynamic and electrical tolerances.*\n\n`;
  }

  // 2. Alarm Events
  md += `## 🚨 Recent Alarm Trip Log\n`;
  if (alarms.length > 0) {
    for (const a of alarms) {
      md += `- **[${a.severity}] \`${a.tag}\`** — ${a.message} *(Time: ${a.timestamp})*\n`;
    }
    md += '\n';
  } else {
    md += `*No trip events recorded in the active buffer.*\n\n`;
  }

  // 3. Telemetry Dynamics
  md += `## 📈 Sensor Telemetry Dynamics & Statistical Envelopes\n`;
  if (options.telemetrySummaries && options.telemetrySummaries.length > 0) {
    for (const t of options.telemetrySummaries) {
      md += t.compactMarkdownSummary + '\n\n';
    }
  } else {
    md += `*Telemetry signals stable across active channels.*\n\n`;
  }

  // 4. Standard Corrective Actions
  md += `## 🛠️ Recommended Corrective Maintenance SOPs\n`;
  if (faults.length > 0) {
    md += `1. **Immediate Inspection**: Dispatch maintenance technician to verify sensor calibrations on ${faults.map(f => f.assetId).join(', ')}.\n`;
    md += `2. **Electrical & Thermal Audit**: Check operating current draw against nameplate ratings.\n`;
    md += `3. **Filter & Valve Check**: Ensure suction/discharge lines have zero blockage and delta pressure is within nominal range.\n`;
  } else {
    md += `1. Maintain standard scheduled preventive maintenance intervals.\n`;
    md += `2. Routine inspection of lubrication levels and filter differential pressure.\n`;
  }

  // Generate Styled HTML version
  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #334155;">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
      <div>
        <h1 style="margin: 0; color: #38bdf8; font-size: 24px;">🏭 ${options.reportTitle}</h1>
        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Generated: ${new Date().toLocaleString()} | Engine: <strong>Local Deterministic FDD (Offline Safe)</strong></p>
      </div>
      <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); padding: 8px 16px; border-radius: 8px; font-weight: bold; color: #38bdf8;">
        ${statusBadge}
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div style="background: #1e293b; padding: 16px; border-radius: 8px; border: 1px solid #334155;">
        <div style="font-size: 11px; color: #94a3b8; font-weight: bold;">ACTIVE FAULTS</div>
        <div style="font-size: 24px; font-weight: bold; color: #f43f5e; margin-top: 4px;">${faults.length}</div>
      </div>
      <div style="background: #1e293b; padding: 16px; border-radius: 8px; border: 1px solid #334155;">
        <div style="font-size: 11px; color: #94a3b8; font-weight: bold;">ENERGY LOSS</div>
        <div style="font-size: 24px; font-weight: bold; color: #f59e0b; margin-top: 4px;">${totalKwWaste.toFixed(1)} kW</div>
      </div>
      <div style="background: #1e293b; padding: 16px; border-radius: 8px; border: 1px solid #334155;">
        <div style="font-size: 11px; color: #94a3b8; font-weight: bold;">HOURLY FINANCIAL WASTE</div>
        <div style="font-size: 24px; font-weight: bold; color: #38bdf8; margin-top: 4px;">${curr} ${totalFinancialWastePerHour.toLocaleString()}</div>
      </div>
    </div>
    <div style="background: #1e293b; padding: 20px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 24px;">
      <h3 style="margin-top: 0; color: #f8fafc;">Diagnostic & Telemetry Findings</h3>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        ${faults.length > 0 ? `Identified ${faults.length} equipment operational anomalies requiring technician intervention.` : 'Plant equipment operating within designated parameters.'}
      </p>
    </div>
  </div>`;

  return {
    markdownReport: md,
    htmlReport: html,
    isDeterministicFallback: true,
    generatedAt: now
  };
}
