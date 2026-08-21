/**
 * TASC IIoT Studio — Dual Reporting Engine
 *
 * Handles two reporting modes:
 *  1. AI On-Demand: Collects historian data, generates styled HTML report with
 *     inline Chart.js line trend + bar charts, AI narrative summary, and results.
 *  2. Template Injection: Reads client Excel template, injects historian raw data
 *     into the designated "raw data" sheet, preserving all client formulas/MIS sheets.
 *
 * Architecture decisions:
 *  - SheetJS (xlsx) for reading/writing .xlsx (Apache 2.0 license)
 *  - HTML+Chart.js for rich AI reports (no SheetJS Pro required for charts)
 *  - IndexedDB via templateReportEngine for template storage
 *  - PC detection: uses larger in-memory buffer for data alignment
 */

import * as XLSX from 'xlsx';
import type { ReportDataResolution, ReportFieldMap, ReportSuggestion, ReportJob } from '../types';
import { queryHistoricalRange } from './trendHistorianEngine';
import { getAlarmHistory } from './alarmHistorianEngine';
import { getDeviceStorageProfile } from './deviceDetector';
import { getFddState } from './fddEngine';

// ─── Data Structures ─────────────────────────────────────────────────────────

export interface HistorianTagResult {
  pen: string;
  tagName: string;
  unit?: string;
  points: Array<{ ts: number; val: number }>;
  stats: { min: number; max: number; avg: number; stdDev: number; p90: number; count: number };
}

export interface ReportDataSet {
  title: string;
  fromMs: number;
  toMs: number;
  resolution: ReportDataResolution;
  tags: HistorianTagResult[];
  alarms: any[];
  fddFaults?: any[];
  includedSuggestions: ReportSuggestion[];
}

export const ROW_CAP_DEFAULT = 5000;
export const ROW_CAP_PC = 50000; // PC detected → larger cap

// ─── PC Detection Helper ──────────────────────────────────────────────────────

export function isDesktopPc(): boolean {
  try {
    const profile = getDeviceStorageProfile();
    // Profile returns 'pc' | 'mobile' | 'tablet'
    return (profile as any)?.deviceType === 'pc' || (profile as any)?.deviceType === 'desktop';
  } catch {
    // Fallback: check user agent
    const ua = navigator.userAgent || '';
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    return !isMobile;
  }
}

export function getRowCap(bypassCap: boolean = false): number {
  if (bypassCap) return 200000;
  return isDesktopPc() ? ROW_CAP_PC : ROW_CAP_DEFAULT;
}

// ─── Historian Data Collector ────────────────────────────────────────────────

/**
 * Collects data points for a list of tags over [fromMs, toMs], downsamples/aggregates,
 * and computes statistics. Also fetches alarms and FDD faults within the period if requested.
 */
export async function collectHistorianData(
  penIds: string[],
  fromMs: number,
  toMs: number,
  resolution: ReportDataResolution,
  includeAlarms: boolean,
  bypassCap: boolean = false,
  includeFdd: boolean = false
): Promise<ReportDataSet & { rowLimitApplied?: boolean; actualRowCount?: number }> {
  const cap = getRowCap(bypassCap);
  const tagResults: HistorianTagResult[] = [];
  let rowLimitApplied = false;

  for (const pen of penIds) {
    try {
      const raw: any[] = await queryHistoricalRange(pen, fromMs, toMs);
      let points: Array<{ ts: number; val: number }> = (raw || [])
        .map((p: any) => ({ ts: p.ts || p.timestamp || p.timestampMs || 0, val: Number(p.val ?? p.value ?? 0) }))
        .filter(p => p.ts > 0);

      // Apply row cap per tag
      if (points.length > cap) {
        points = points.slice(0, cap);
        rowLimitApplied = true;
      }

      // Compute statistics
      const vals = points.map(p => p.val).filter(v => isFinite(v));
      const stats = computeStats(vals);

      tagResults.push({ pen, tagName: pen, points, stats });
    } catch (e) {
      // Tag query failed — include empty result
      tagResults.push({ pen, tagName: pen, points: [], stats: computeStats([]) });
    }
  }

  let alarms: any[] = [];
  if (includeAlarms) {
    try {
      const allAlarms = getAlarmHistory();
      alarms = (allAlarms || []).filter((a: any) => {
        const t = new Date(a.triggerTime).getTime();
        return t >= fromMs && t <= toMs;
      });
    } catch {
      alarms = [];
    }
  }

  let fddFaults: any[] = [];
  if (includeFdd) {
    try {
      const fdd = getFddState();
      const active = (fdd.activeFaults || []).filter(f => {
        const t = f.triggerTimestampMs || (f.triggerTimestamp ? new Date(f.triggerTimestamp).getTime() : 0);
        return (t >= fromMs && t <= toMs) || !f.ackStatus;
      }).map(f => ({
        timestamp: f.triggerTimestampMs || (f.triggerTimestamp ? new Date(f.triggerTimestamp).getTime() : Date.now()),
        asset: f.assetName || f.assetId,
        ruleName: f.ruleName,
        category: f.category,
        severity: f.severity,
        durationSeconds: f.durationSeconds,
        costImpact: f.totalCostImpact,
        status: f.ackStatus ? 'ACKNOWLEDGED' : 'ACTIVE',
        rootCause: f.rootCauseAnalysis?.probableCauses?.[0]?.cause || ''
      }));

      const history = (fdd.history || []).filter(h => {
        const t = h.triggerTimestamp ? new Date(h.triggerTimestamp).getTime() : 0;
        return t >= fromMs && t <= toMs;
      }).map(h => ({
        timestamp: h.triggerTimestamp ? new Date(h.triggerTimestamp).getTime() : Date.now(),
        asset: h.assetName || h.assetId,
        ruleName: h.ruleName,
        category: h.category,
        severity: h.severity,
        durationSeconds: h.durationSeconds,
        costImpact: h.totalCostImpact,
        status: 'RESOLVED',
        rootCause: h.rootCauseSummary || ''
      }));

      fddFaults = [...active, ...history];
    } catch {
      fddFaults = [];
    }
  }

  const totalRows = tagResults.reduce((s, t) => s + t.points.length, 0);

  return {
    title: '',
    fromMs,
    toMs,
    resolution,
    tags: tagResults,
    alarms,
    includedSuggestions: [],
    rowLimitApplied,
    actualRowCount: totalRows
  };
}

function computeStats(vals: number[]) {
  if (vals.length === 0) {
    return { min: 0, max: 0, avg: 0, stdDev: 0, p90: 0, count: 0 };
  }
  const sorted = [...vals].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length;
  const stdDev = Math.sqrt(variance);
  const p90Idx = Math.min(Math.floor(vals.length * 0.9), vals.length - 1);
  const p90 = sorted[p90Idx];
  return { min: round(min), max: round(max), avg: round(avg), stdDev: round(stdDev), p90: round(p90), count: vals.length };
}

function round(v: number, decimals = 3): number {
  return Math.round(v * 10 ** decimals) / 10 ** decimals;
}

// ─── AI On-Demand HTML Report Builder ─────────────────────────────────────────

/**
 * Builds a full rich HTML report with inline Chart.js charts, summary table,
 * statistics section, alarm log, and AI-authored narrative sections.
 */
export function buildAiHtmlReport(
  dataset: ReportDataSet,
  aiSummary: string,
  aiResults: string,
  suggestions: ReportSuggestion[],
  selectedSuggestionIds: number[]
): string {
  const fromLabel = new Date(dataset.fromMs).toLocaleString();
  const toLabel = new Date(dataset.toMs).toLocaleString();
  const generatedAt = new Date().toLocaleString();

  // Chart data preparation — downsample to 200 points max for chart rendering
  const chartTags = dataset.tags.filter(t => t.points.length > 0);
  const chartLabels = buildChartLabels(dataset.fromMs, dataset.toMs, 60);
  const chartDatasets = chartTags.map((t, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const downsampled = lttbDownsample(t.points, 60);
    return {
      label: t.tagName,
      data: downsampled.map(p => ({ x: p.ts, y: p.val })),
      borderColor: color,
      backgroundColor: color + '22',
      borderWidth: 2,
      pointRadius: downsampled.length < 30 ? 3 : 0,
      tension: 0.3,
      fill: false
    };
  });

  // Bar chart stats data
  const barLabels = dataset.tags.map(t => t.tagName);
  const barAvgs = dataset.tags.map(t => t.stats.avg);
  const barMins = dataset.tags.map(t => t.stats.min);
  const barMaxs = dataset.tags.map(t => t.stats.max);

  // Statistics table rows
  const statsRows = dataset.tags.map(t => `
    <tr>
      <td>${escHtml(t.tagName)}</td>
      <td>${t.stats.count.toLocaleString()}</td>
      <td>${t.stats.min}</td>
      <td>${t.stats.max}</td>
      <td>${t.stats.avg}</td>
      <td>${t.stats.stdDev}</td>
      <td>${t.stats.p90}</td>
    </tr>
  `).join('');

  // Alarm log rows
  const alarmRows = dataset.alarms.slice(0, 200).map((a: any) => `
    <tr>
      <td>${escHtml(new Date(a.triggerTime).toLocaleString())}</td>
      <td>${escHtml(a.panelName || '-')}</td>
      <td>${escHtml(a.category || '-')}</td>
      <td style="color:#f87171">${escHtml(a.message || '-')}</td>
      <td>${escHtml(String(a.triggerValue ?? '-'))}</td>
      <td>${escHtml(a.status || '-')}</td>
    </tr>
  `).join('');

  // FDD Faults log rows
  const fddRows = (dataset.fddFaults || []).slice(0, 200).map((f: any) => `
    <tr>
      <td>${escHtml(new Date(f.timestamp).toLocaleString())}</td>
      <td>${escHtml(f.asset || '-')}</td>
      <td>${escHtml(f.ruleName || '-')}</td>
      <td><span class="badge ${f.severity === 'CRITICAL' ? 'badge-red' : f.severity === 'HIGH' ? 'badge-orange' : 'badge-blue'}">${escHtml(f.severity || '-')}</span></td>
      <td>${escHtml(f.durationSeconds ? Math.round(f.durationSeconds / 60) + 'm' : '-')}</td>
      <td>${escHtml(f.costImpact ? '$' + Number(f.costImpact).toFixed(2) : '$0.00')}</td>
      <td>${escHtml(f.status || '-')}</td>
      <td>${escHtml(f.rootCause || '-')}</td>
    </tr>
  `).join('');

  // Applied suggestions note
  const suggestionNote = selectedSuggestionIds.length > 0
    ? `<p style="color:#94a3b8;font-size:13px;margin-top:8px">
        <strong>AI-Enhanced Analysis Applied:</strong> 
        ${suggestions.filter(s => selectedSuggestionIds.includes(s.id)).map(s => s.title).join(' • ')}
       </p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(dataset.title)} — TASC IIoT Studio Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
  h1 { font-size: 26px; font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
  h2 { font-size: 18px; font-weight: 600; color: #38bdf8; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #1e3a5f; }
  .header { background: linear-gradient(135deg,#1e3a5f,#0c2340); border-radius: 12px; padding: 24px 28px; margin-bottom: 24px; border: 1px solid #1d4ed8; }
  .meta { font-size: 12px; color: #64748b; margin-top: 8px; }
  .meta span { margin-right: 18px; }
  .section { background: #1e293b; border-radius: 10px; padding: 20px 24px; margin-bottom: 20px; border: 1px solid #334155; }
  .chart-container { position: relative; height: 300px; margin-bottom: 20px; }
  .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  @media (max-width: 800px) { .chart-row { grid-template-columns: 1fr; } }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #0f172a; color: #38bdf8; padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #1d4ed8; }
  td { padding: 8px 12px; border-bottom: 1px solid #334155; color: #cbd5e1; }
  tr:hover td { background: #0f172a; }
  .narrative { font-size: 14px; line-height: 1.7; color: #cbd5e1; white-space: pre-wrap; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
  .badge-blue { background: #1d4ed8; color: white; }
  .badge-green { background: #15803d; color: white; }
  .badge-red { background: #b91c1c; color: white; }
  .badge-orange { background: #d97706; color: white; }
  .footer { text-align: center; color: #475569; font-size: 11px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #1e293b; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .kpi-card { background: #0f172a; border: 1px solid #1e3a5f; border-radius: 8px; padding: 14px; text-align: center; }
  .kpi-value { font-size: 24px; font-weight: 700; color: #38bdf8; }
  .kpi-label { font-size: 11px; color: #64748b; margin-top: 4px; }
  .no-data { color: #475569; font-size: 13px; text-align: center; padding: 24px; }

  /* ─── High-DPI Print & PDF Styles ─────────────────────────────────────────── */
  @media print {
    body { background: #ffffff !important; color: #0f172a !important; padding: 0 !important; font-size: 12px !important; }
    .header { background: #f8fafc !important; border: 1px solid #cbd5e1 !important; color: #0f172a !important; padding: 16px !important; }
    h1 { color: #0f172a !important; font-size: 22px !important; }
    h2 { color: #0369a1 !important; border-color: #cbd5e1 !important; font-size: 15px !important; }
    .meta { color: #475569 !important; }
    .section { background: #ffffff !important; border: 1px solid #e2e8f0 !important; break-inside: avoid; page-break-inside: avoid; margin-bottom: 16px !important; }
    .kpi-card { background: #f8fafc !important; border: 1px solid #cbd5e1 !important; }
    .kpi-value { color: #0284c7 !important; }
    .kpi-label { color: #64748b !important; }
    table { font-size: 11px !important; }
    th { background: #f1f5f9 !important; color: #0f172a !important; border-bottom: 2px solid #94a3b8 !important; }
    td { color: #334155 !important; border-bottom: 1px solid #e2e8f0 !important; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .narrative { color: #1e293b !important; }
    .no-print { display: none !important; }
    .chart-container { height: 220px !important; break-inside: avoid; page-break-inside: avoid; }
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
</style>
</head>
<body>

<div class="no-print" style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:16px;">
  <button onclick="window.print()" style="background:#0284c7;color:#ffffff;border:none;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
    🖨️ Print / Save to PDF
  </button>
</div>

<div class="header">

  <h1>📊 ${escHtml(dataset.title)}</h1>
  <div class="meta">
    <span>📅 Period: <strong>${fromLabel}</strong> → <strong>${toLabel}</strong></span>
    <span>⚙️ Resolution: <strong>${dataset.resolution}</strong></span>
    <span>🏷 Tags: <strong>${dataset.tags.length}</strong></span>
    <span>🚨 Alarms: <strong>${dataset.alarms.length}</strong></span>
    ${dataset.fddFaults && dataset.fddFaults.length > 0 ? `<span>🛡️ FDD Faults: <strong>${dataset.fddFaults.length}</strong></span>` : ''}
  </div>
  <div class="meta" style="margin-top:6px">Generated: ${generatedAt} · TASC IIoT Studio</div>
  ${suggestionNote}
</div>

<!-- KPI Summary Cards -->
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-value">${dataset.tags.reduce((s, t) => s + t.stats.count, 0).toLocaleString()}</div>
    <div class="kpi-label">Total Data Points</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-value">${dataset.tags.length}</div>
    <div class="kpi-label">Monitored Tags</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-value">${dataset.alarms.length}</div>
    <div class="kpi-label">Alarm Events</div>
  </div>
  ${dataset.fddFaults && dataset.fddFaults.length > 0 ? `
  <div class="kpi-card">
    <div class="kpi-value" style="color:#fbbf24">${dataset.fddFaults.length}</div>
    <div class="kpi-label">FDD Fault Events</div>
  </div>` : ''}
  <div class="kpi-card">
    <div class="kpi-value">${Math.round((dataset.toMs - dataset.fromMs) / 3600000)}h</div>
    <div class="kpi-label">Report Span</div>
  </div>
</div>

<!-- Section 1: AI Executive Summary -->
<div class="section">
  <h2>🤖 Executive Summary</h2>
  <div class="narrative">${escHtml(aiSummary)}</div>
</div>

<!-- Section 2: Line Trend Charts -->
${chartTags.length > 0 ? `
<div class="section">
  <h2>📈 Process Trend Analysis</h2>
  <div class="chart-container">
    <canvas id="lineChart"></canvas>
  </div>
</div>
` : ''}

<!-- Section 3: Statistical Comparison Bar Chart -->
${dataset.tags.length > 0 ? `
<div class="chart-row">
  <div class="section">
    <h2>📊 Average Values</h2>
    <div class="chart-container" style="height:220px">
      <canvas id="barAvgChart"></canvas>
    </div>
  </div>
  <div class="section">
    <h2>📉 Min / Max Range</h2>
    <div class="chart-container" style="height:220px">
      <canvas id="barMinMaxChart"></canvas>
    </div>
  </div>
</div>
` : ''}

<!-- Section 4: Statistical Table -->
<div class="section">
  <h2>📋 Statistical Summary</h2>
  ${dataset.tags.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Tag Name</th>
        <th>Points</th>
        <th>Min</th>
        <th>Max</th>
        <th>Average</th>
        <th>Std Dev</th>
        <th>P90</th>
      </tr>
    </thead>
    <tbody>${statsRows}</tbody>
  </table>` : '<div class="no-data">No historian data available for the selected period.</div>'}
</div>

<!-- Section 5: Alarm Log -->
${dataset.alarms.length > 0 ? `
<div class="section">
  <h2>🚨 Alarm Events Log (${dataset.alarms.length} events)</h2>
  <table>
    <thead>
      <tr><th>Trigger Time</th><th>Equipment</th><th>Category</th><th>Message</th><th>Value</th><th>Status</th></tr>
    </thead>
    <tbody>${alarmRows}</tbody>
  </table>
</div>
` : ''}

<!-- Section 6: FDD Predictive Maintenance & Faults Log -->
${dataset.fddFaults && dataset.fddFaults.length > 0 ? `
<div class="section">
  <h2>🛡️ FDD Predictive Maintenance & Faults Log (${dataset.fddFaults.length} events)</h2>
  <table>
    <thead>
      <tr><th>Trigger Time</th><th>Asset</th><th>Fault / Rule</th><th>Severity</th><th>Duration</th><th>Est. Cost Impact</th><th>Status</th><th>Root Cause Summary</th></tr>
    </thead>
    <tbody>${fddRows}</tbody>
  </table>
</div>
` : ''}

<!-- Section 7: AI Results & Recommendations -->
<div class="section">
  <h2>✅ Results & Recommendations</h2>
  <div class="narrative">${escHtml(aiResults)}</div>
</div>

<div class="footer">
  TASC IIoT Studio — Automated Industrial Report · ${new Date().getFullYear()}
</div>

<script>
// ─── Line Trend Chart ─────────────────────────────────────────────────────────
${chartTags.length > 0 ? `
const lineCtx = document.getElementById('lineChart').getContext('2d');
new Chart(lineCtx, {
  type: 'line',
  data: {
    datasets: ${JSON.stringify(chartDatasets)}
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
      tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#f8fafc', bodyColor: '#94a3b8' }
    },
    scales: {
      x: {
        type: 'linear',
        ticks: { color: '#64748b', font: { size: 10 }, callback: function(v) { return new Date(v).toLocaleTimeString(); }, maxTicksLimit: 12 },
        grid: { color: '#1e293b' }
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: '#1e293b' }
      }
    }
  }
});
` : ''}

// ─── Average Bar Chart ───────────────────────────────────────────────────────
${dataset.tags.length > 0 ? `
const barAvgCtx = document.getElementById('barAvgChart').getContext('2d');
new Chart(barAvgCtx, {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(barLabels)},
    datasets: [{
      label: 'Average',
      data: ${JSON.stringify(barAvgs)},
      backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'].slice(0, ${barLabels.length}),
      borderRadius: 4
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 30 }, grid: { display: false } },
      y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e293b' } }
    }
  }
});

const barMinMaxCtx = document.getElementById('barMinMaxChart').getContext('2d');
new Chart(barMinMaxCtx, {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(barLabels)},
    datasets: [
      { label: 'Min', data: ${JSON.stringify(barMins)}, backgroundColor: '#1d4ed8', borderRadius: 4 },
      { label: 'Max', data: ${JSON.stringify(barMaxs)}, backgroundColor: '#dc2626', borderRadius: 4 }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 30 }, grid: { display: false } },
      y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e293b' } }
    }
  }
});
` : ''}
<\/script>
</body>
</html>`;

  return html;
}

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7'
];

function escHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildChartLabels(fromMs: number, toMs: number, count: number): number[] {
  const step = (toMs - fromMs) / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.floor(fromMs + i * step));
}

function lttbDownsample(points: Array<{ ts: number; val: number }>, threshold: number) {
  if (points.length <= threshold) return points;
  const sampled: typeof points = [points[0]];
  const bucketSize = (points.length - 2) / (threshold - 2);
  let a = 0;
  for (let i = 1; i < threshold - 1; i++) {
    const bucketStart = Math.floor((i - 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor(i * bucketSize) + 1, points.length - 1);
    const nextBucketStart = Math.floor(i * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, points.length - 1);
    let avgX = 0, avgY = 0;
    const nextCount = nextBucketEnd - nextBucketStart;
    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += points[j].ts;
      avgY += points[j].val;
    }
    avgX = nextCount > 0 ? avgX / nextCount : points[nextBucketStart]?.ts || 0;
    avgY = nextCount > 0 ? avgY / nextCount : points[nextBucketStart]?.val || 0;
    let maxArea = -1, maxIdx = bucketStart;
    const aPoint = points[a];
    for (let j = bucketStart; j < bucketEnd; j++) {
      const area = Math.abs((aPoint.ts - avgX) * (points[j].val - aPoint.val) - (aPoint.ts - points[j].ts) * (avgY - aPoint.val));
      if (area > maxArea) { maxArea = area; maxIdx = j; }
    }
    sampled.push(points[maxIdx]);
    a = maxIdx;
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}

// ─── Excel (XLSX) Download Helpers ───────────────────────────────────────────

/**
 * Builds a multi-sheet Excel workbook from a ReportDataSet (for raw data download).
 */
export function buildDataExcelWorkbook(dataset: ReportDataSet): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Statistical Summary
  const statsAoA: any[][] = [
    ['Tag Name', 'Data Points', 'Min', 'Max', 'Average', 'Std Dev', 'P90'],
    ...dataset.tags.map(t => [
      t.tagName, t.stats.count, t.stats.min, t.stats.max, t.stats.avg, t.stats.stdDev, t.stats.p90
    ])
  ];
  const wsStats = XLSX.utils.aoa_to_sheet(statsAoA);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Statistics');

  // Sheet 2: Raw Trend Data (time-indexed)
  if (dataset.tags.length > 0) {
    const allTs = new Set<number>();
    dataset.tags.forEach(t => t.points.forEach(p => allTs.add(p.ts)));
    const sortedTs = Array.from(allTs).sort();
    const header = ['Timestamp', 'DateTime', ...dataset.tags.map(t => t.tagName)];
    const tsMap: Record<string, Record<string, number>> = {};
    dataset.tags.forEach(t => {
      t.points.forEach(p => {
        if (!tsMap[p.ts]) tsMap[p.ts] = {};
        tsMap[p.ts][t.tagName] = p.val;
      });
    });
    const rows = sortedTs.slice(0, 50000).map(ts => [
      ts,
      new Date(ts).toLocaleString(),
      ...dataset.tags.map(t => tsMap[ts]?.[t.tagName] ?? '')
    ]);
    const wsTrend = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, wsTrend, 'Trend Data');
  }

  // Sheet 3: Alarm Log
  if (dataset.alarms.length > 0) {
    const alarmHeader = ['Trigger Time', 'Equipment', 'Category', 'Message', 'Value', 'Duration', 'Status'];
    const alarmRows = dataset.alarms.map((a: any) => [
      new Date(a.triggerTime).toLocaleString(),
      a.panelName || '',
      a.category || '',
      a.message || '',
      a.triggerValue ?? '',
      a.duration || 'ACTIVE',
      a.status || ''
    ]);
    const wsAlarms = XLSX.utils.aoa_to_sheet([alarmHeader, ...alarmRows]);
    XLSX.utils.book_append_sheet(wb, wsAlarms, 'Alarms');
  }

  // Sheet 4: FDD Fault Log
  if (dataset.fddFaults && dataset.fddFaults.length > 0) {
    const fddHeader = ['Trigger Time', 'Asset', 'Fault / Rule', 'Category', 'Severity', 'Duration (s)', 'Cost Impact', 'Status', 'Root Cause'];
    const fddRows = dataset.fddFaults.map((f: any) => [
      new Date(f.timestamp).toLocaleString(),
      f.asset || '',
      f.ruleName || '',
      f.category || '',
      f.severity || '',
      f.durationSeconds ?? '',
      f.costImpact ?? 0,
      f.status || '',
      f.rootCause || ''
    ]);
    const wsFdd = XLSX.utils.aoa_to_sheet([fddHeader, ...fddRows]);
    XLSX.utils.book_append_sheet(wb, wsFdd, 'FDD Faults');
  }

  return wb;
}


/**
 * Triggers browser download of an HTML file.
 */
export function downloadHtmlReport(html: string, title: string): void {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeName = title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').slice(0, 60);
  const filename = `${safeName}_${dateStr}.html`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, filename);
}

/**
 * Triggers browser download of an XLSX workbook.
 */
export function downloadExcelReport(wb: XLSX.WorkBook, title: string): void {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeName = title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').slice(0, 60);
  const filename = `${safeName}_${dateStr}.xlsx`;
  const wbBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, filename);
}

/**
 * Triggers browser download of CSV content.
 */
export function downloadCsvReport(csvContent: string, title: string): void {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeName = title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').slice(0, 60);
  const filename = `${safeName}_${dateStr}.csv`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ─── Report History (IndexedDB + localStorage fallback) ───────────────────────

const HISTORY_KEY = 'tasc_report_history';
const MAX_HISTORY = 50;

export function saveReportJob(job: ReportJob): void {
  try {
    const existing: ReportJob[] = getReportHistory();
    const updated = [job, ...existing.filter(j => j.jobId !== job.jobId)].slice(0, MAX_HISTORY);
    // Strip htmlContent before saving to localStorage (store separately or omit)
    const compact = updated.map(j => ({ ...j, htmlContent: undefined }));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(compact));

    // Store full HTML in IndexedDB for PC (larger storage), sessionStorage for mobile
    if (job.htmlContent) {
      storeReportHtml(job.jobId, job.htmlContent);
    }
  } catch (e) {
    console.warn('[ReportEngine] Failed to save report job to history:', e);
  }
}

export function getReportHistory(): ReportJob[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteReportJob(jobId: string): void {
  try {
    const existing = getReportHistory().filter(j => j.jobId !== jobId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
  } catch {}
}

// ─── HTML Storage (IndexedDB for PC, sessionStorage for mobile) ──────────────

const HTML_STORE_DB = 'TascReportHtmlDB';
const HTML_STORE_NAME = 'report_html';

export function storeReportHtml(jobId: string, html: string): void {
  if (isDesktopPc()) {
    // Store in IndexedDB for PC
    openHtmlDb().then(db => {
      const tx = db.transaction(HTML_STORE_NAME, 'readwrite');
      tx.objectStore(HTML_STORE_NAME).put({ jobId, html, savedAt: Date.now() });
    }).catch(() => {
      // Fallback to sessionStorage
      try { sessionStorage.setItem(`tasc_report_html_${jobId}`, html); } catch {}
    });
  } else {
    try { sessionStorage.setItem(`tasc_report_html_${jobId}`, html); } catch {}
  }
}

export function getStoredReportHtml(jobId: string): Promise<string | null> {
  if (isDesktopPc()) {
    return openHtmlDb().then(db => new Promise<string | null>((resolve) => {
      const tx = db.transaction(HTML_STORE_NAME, 'readonly');
      const req = tx.objectStore(HTML_STORE_NAME).get(jobId);
      req.onsuccess = () => resolve(req.result?.html || null);
      req.onerror = () => resolve(null);
    })).catch(() => {
      return sessionStorage.getItem(`tasc_report_html_${jobId}`);
    });
  }
  return Promise.resolve(sessionStorage.getItem(`tasc_report_html_${jobId}`));
}

function openHtmlDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HTML_STORE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HTML_STORE_NAME)) {
        db.createObjectStore(HTML_STORE_NAME, { keyPath: 'jobId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
