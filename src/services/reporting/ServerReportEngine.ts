import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
// @ts-ignore
import pdfmake from 'pdfmake';
import type {
  CustomReportDefinition,
  ReportJob,
  ReportColumnConfig,
  ReportKpiConfig,
  ReportSchedule,
  ReportTriggerConfig,
  ReportDeliveryConfig
} from '../../types/reporting';
import { serverEmailService } from '../email/ServerEmailService';
import { ServerHistorian } from '../historian/ServerHistorian';
import { pollingManager } from '../pollingManager';

// Standard PDF 14 fonts for pdfmake (zero external font files required)
const PDF_FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

try {
  (pdfmake as any).addFonts?.(PDF_FONTS);
} catch {}

export interface UnifiedDataPoint {
  ts: number;
  formattedTime: string;
  values: Record<string, number | null>; // columnId -> value
}

export interface UnifiedReportDataset {
  title: string;
  facility: string;
  fromMs: number;
  toMs: number;
  columns: ReportColumnConfig[];
  rows: UnifiedDataPoint[];
  kpis: Array<{ title: string; value: number | string; unit?: string }>;
  footerSummary: Record<string, number | string>; // columnId -> summary
}

export class ServerReportEngine {
  private db: DatabaseSync;
  private serverHistorian: ServerHistorian;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private triggersByTag: Map<string, { reportId: string; trigger: ReportTriggerConfig; prevVal: number; lastTriggeredMs: number }[]> = new Map();
  private isProcessingQueue = false;
  private executedSchedulePeriods = new Set<string>();

  constructor(serverHistorian: ServerHistorian) {
    this.serverHistorian = serverHistorian;

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'tasc_reports.db');
    this.db = new DatabaseSync(dbPath);
    this.initDatabase();
    this.reloadTriggers();
    this.startScheduler();
  }

  private initDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS report_configs (
        report_id TEXT PRIMARY KEY,
        report_name TEXT NOT NULL,
        mode TEXT NOT NULL,
        config_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS report_jobs (
        job_id TEXT PRIMARY KEY,
        report_id TEXT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        from_ms INTEGER NOT NULL,
        to_ms INTEGER NOT NULL,
        row_count INTEGER,
        error_message TEXT,
        generated_files_json TEXT,
        email_status TEXT,
        email_error TEXT,
        local_save_status TEXT,
        local_save_paths_json TEXT,
        is_scheduled INTEGER DEFAULT 0,
        trigger_type TEXT DEFAULT 'manual',
        unread INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_created ON report_jobs(created_at);
      CREATE INDEX IF NOT EXISTS idx_jobs_report ON report_jobs(report_id);
    `);
  }

  // ─── CRUD Report Configurations ─────────────────────────────────────────────

  public getAllConfigs(): CustomReportDefinition[] {
    try {
      const stmt = this.db.prepare(`SELECT config_json FROM report_configs ORDER BY updated_at DESC`);
      const rows = stmt.all() as { config_json: string }[];
      return rows.map(r => JSON.parse(r.config_json));
    } catch (err: any) {
      console.error('[ServerReportEngine] Error getting report configs:', err.message);
      return [];
    }
  }

  public getConfigById(reportId: string): CustomReportDefinition | null {
    try {
      const stmt = this.db.prepare(`SELECT config_json FROM report_configs WHERE report_id = ?`);
      const row = stmt.get(reportId) as { config_json: string } | undefined;
      return row ? JSON.parse(row.config_json) : null;
    } catch {
      return null;
    }
  }

  public saveConfig(config: CustomReportDefinition): void {
    const now = new Date().toISOString();
    const existing = this.getConfigById(config.reportId);
    const createdAt = existing?.createdAt || config.createdAt || now;
    const updated: CustomReportDefinition = {
      ...config,
      createdAt,
      updatedAt: now
    };

    const stmt = this.db.prepare(`
      INSERT INTO report_configs (report_id, report_name, mode, config_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(report_id) DO UPDATE SET
        report_name = excluded.report_name,
        mode = excluded.mode,
        config_json = excluded.config_json,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      updated.reportId,
      updated.reportName,
      updated.mode || 'custom_grid',
      JSON.stringify(updated),
      createdAt,
      now
    );

    this.reloadTriggers();
  }

  public deleteConfig(reportId: string): boolean {
    try {
      const stmt = this.db.prepare(`DELETE FROM report_configs WHERE report_id = ?`);
      stmt.run(reportId);
      this.reloadTriggers();
      return true;
    } catch {
      return false;
    }
  }

  // ─── Trigger Indexing & Evaluation ──────────────────────────────────────────

  private reloadTriggers(): void {
    this.triggersByTag.clear();
    const configs = this.getAllConfigs();

    for (const cfg of configs) {
      if (cfg.trigger?.enabled) {
        const t = cfg.trigger;
        const tagId = t.edgeTagId || t.thresholdTagId;
        if (tagId) {
          const list = this.triggersByTag.get(tagId) || [];
          list.push({
            reportId: cfg.reportId,
            trigger: t,
            prevVal: 0,
            lastTriggeredMs: t.lastTriggeredAt ? new Date(t.lastTriggeredAt).getTime() : 0
          });
          this.triggersByTag.set(tagId, list);
        }
      }
    }
  }

  public evaluateTagChange(tagId: string, value: number, quality: number): void {
    const triggers = this.triggersByTag.get(tagId);
    if (!triggers || triggers.length === 0) return;
    if (quality !== 192 /* GOOD quality */) return;

    const now = Date.now();

    for (const item of triggers) {
      const cooldownMs = (item.trigger.cooldownMinutes || 15) * 60000;
      if (now - item.lastTriggeredMs < cooldownMs) {
        item.prevVal = value;
        continue;
      }

      let shouldFire = false;

      // 1. Digital Edge Trigger (0 -> expectedValue)
      if (item.trigger.type === 'tag_edge') {
        const expected = item.trigger.edgeExpectedValue ?? 1;
        if (item.prevVal !== expected && value === expected) {
          shouldFire = true;
        }
      }

      // 2. Analog Threshold Trigger
      if (item.trigger.type === 'tag_threshold') {
        const op = item.trigger.thresholdOperator || '>';
        const thresh = item.trigger.thresholdValue ?? 0;
        if (op === '>' && value > thresh && item.prevVal <= thresh) shouldFire = true;
        else if (op === '>=' && value >= thresh && item.prevVal < thresh) shouldFire = true;
        else if (op === '<' && value < thresh && item.prevVal >= thresh) shouldFire = true;
        else if (op === '<=' && value <= thresh && item.prevVal > thresh) shouldFire = true;
        else if (op === '==' && value === thresh && item.prevVal !== thresh) shouldFire = true;
      }

      item.prevVal = value;

      if (shouldFire) {
        item.lastTriggeredMs = now;
        const config = this.getConfigById(item.reportId);
        if (config) {
          const lookbackHours = item.trigger.lookbackHours || 8;
          const fromMs = now - lookbackHours * 3600000;
          this.executeReport(config, fromMs, now, { isScheduled: true, triggerType: item.trigger.type }).catch(err => {
            console.error(`[ServerReportEngine] Trigger execution error for ${config.reportName}:`, err.message);
          });
        }
      }
    }
  }

  // ─── 24/7 Headless Scheduler ───────────────────────────────────────────────

  private startScheduler(): void {
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    this.schedulerTimer = setInterval(() => {
      this.checkScheduledRuns().catch(err => console.error('[ServerReportEngine] Scheduler error:', err.message));
    }, 30000); // Check every 30 seconds
  }

  private async checkScheduledRuns(): Promise<void> {
    const configs = this.getAllConfigs();
    const now = Date.now();

    for (const config of configs) {
      const schedule = config.schedule;
      if (!schedule || !schedule.enabled) continue;

      // Grace delay: 30s delay after scheduled period to allow raw data commit
      const nextRunMs = schedule.nextRunAt ? new Date(schedule.nextRunAt).getTime() : 0;
      if (nextRunMs && now >= nextRunMs + 30000) {
        // Idempotency check: scheduleId + period
        const periodKey = `${config.reportId}_${schedule.nextRunAt}`;
        if (this.executedSchedulePeriods.has(periodKey)) continue;
        this.executedSchedulePeriods.add(periodKey);

        const lookbackHours = schedule.lookbackHours || (schedule.frequency === 'weekly' ? 168 : schedule.frequency === 'monthly' ? 720 : 24);
        const fromMs = nextRunMs - lookbackHours * 3600000;
        const toMs = nextRunMs;

        // Calculate next run time
        schedule.lastRunAt = new Date(nextRunMs).toISOString();
        schedule.nextRunAt = this.calculateNextRunTime(schedule, now);
        this.saveConfig({ ...config, schedule });

        // Execute report in background
        this.executeReport(config, fromMs, toMs, { isScheduled: true, triggerType: 'schedule' }).catch(err => {
          console.error(`[ServerReportEngine] Scheduled execution error for ${config.reportName}:`, err.message);
        });
      } else if (!schedule.nextRunAt) {
        schedule.nextRunAt = this.calculateNextRunTime(schedule, now);
        this.saveConfig({ ...config, schedule });
      }
    }
  }

  public calculateNextRunTime(schedule: ReportSchedule, fromTimeMs = Date.now()): string {
    const fromDate = new Date(fromTimeMs);
    const targetHour = schedule.hour ?? 6;
    const targetMinute = schedule.minute ?? 0;

    if (schedule.frequency === 'interval') {
      const mins = Math.max(1, schedule.intervalMinutes ?? 60);
      return new Date(fromTimeMs + mins * 60000).toISOString();
    }

    if (schedule.frequency === 'daily') {
      const next = new Date(fromDate);
      next.setHours(targetHour, targetMinute, 0, 0);
      if (next.getTime() <= fromTimeMs) next.setDate(next.getDate() + 1);
      return next.toISOString();
    }

    if (schedule.frequency === 'weekly') {
      const targetWeekday = schedule.weekday ?? 1;
      const next = new Date(fromDate);
      next.setHours(targetHour, targetMinute, 0, 0);
      let daysUntil = (targetWeekday - next.getDay() + 7) % 7;
      if (daysUntil === 0 && next.getTime() <= fromTimeMs) daysUntil = 7;
      next.setDate(next.getDate() + daysUntil);
      return next.toISOString();
    }

    if (schedule.frequency === 'monthly') {
      const targetDay = schedule.dayOfMonth ?? 1;
      const next = new Date(fromDate);
      next.setDate(targetDay);
      next.setHours(targetHour, targetMinute, 0, 0);
      if (next.getTime() <= fromTimeMs) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(targetDay);
      }
      return next.toISOString();
    }

    return new Date(fromTimeMs + 86400000).toISOString();
  }

  // ─── Unified Dataset Builder ───────────────────────────────────────────────

  public async buildUnifiedDataset(
    config: CustomReportDefinition,
    fromMs: number,
    toMs: number
  ): Promise<UnifiedReportDataset> {
    const resolution = config.defaultResolution || '1hour';
    const bucketSeconds = this.resolutionToSeconds(resolution);

    // Collect all tag IDs needed for columns and KPIs
    const tagIds = new Set<string>();
    config.columns.forEach(col => {
      if (col.tagId) tagIds.add(col.tagId);
    });
    config.kpis.forEach(kpi => {
      if (kpi.tagId) tagIds.add(kpi.tagId);
    });

    // Query historian for each tag
    const tagDataMap: Record<string, Array<{ ts: number; val: number }>> = {};

    for (const tagId of tagIds) {
      if (bucketSeconds > 0) {
        const rawBuckets = this.serverHistorian.queryTagHistory(tagId, fromMs, toMs, bucketSeconds * 1000);
        tagDataMap[tagId] = rawBuckets.map((b: any) => ({ ts: b.timestamp, val: b.avgValue ?? 0 }));
      } else {
        const rawPoints = this.serverHistorian.queryTagHistory(tagId, fromMs, toMs);
        tagDataMap[tagId] = rawPoints.map((p: any) => ({ ts: p.timestamp, val: p.value ?? 0 }));
      }
    }

    // Generate continuous timestamp axis
    const allTimestamps = new Set<number>();
    Object.values(tagDataMap).forEach(pts => pts.forEach(p => allTimestamps.add(p.ts)));

    // If downsampled, fill any gaps so rows are aligned
    let sortedTs = Array.from(allTimestamps).sort((a, b) => a - b);
    if (sortedTs.length === 0) {
      // Create at least one point if no data
      sortedTs = [fromMs, toMs];
    }

    // Build unified rows with counter rollover protection & safe formula evaluation
    const rows: UnifiedDataPoint[] = [];
    const prevValues: Record<string, number> = {};

    for (const ts of sortedTs) {
      const formattedTime = this.formatTimestamp(ts, config.columns.find(c => c.columnType === 'timestamp')?.dateFormat);
      const values: Record<string, number | null> = {};

      for (const col of config.columns) {
        if (col.columnType === 'timestamp') {
          continue;
        } else if (col.columnType === 'tag' && col.tagId) {
          const rawVal = tagDataMap[col.tagId]?.find(p => p.ts === ts)?.val ?? null;

          if (rawVal !== null && isFinite(rawVal)) {
            if (col.aggregation === 'delta') {
              const prev = prevValues[col.tagId];
              if (prev !== undefined) {
                if (rawVal < prev) {
                  // Totalizer rollover or reset
                  const maxWrap = col.deltaRolloverMax || (rawVal < 65535 && prev > 60000 ? 65536 : 4294967296);
                  values[col.columnId] = rawVal + maxWrap - prev;
                } else {
                  values[col.columnId] = rawVal - prev;
                }
              } else {
                values[col.columnId] = 0;
              }
              prevValues[col.tagId] = rawVal;
            } else {
              values[col.columnId] = rawVal;
            }
          } else {
            values[col.columnId] = null;
          }
        }
      }

      // Second pass for computed formula columns
      for (const col of config.columns) {
        if (col.columnType === 'computed' && col.formula) {
          values[col.columnId] = this.evaluateSafeFormula(col.formula, values);
        }
      }

      rows.push({ ts, formattedTime, values });
    }

    // Compute KPI cards
    const kpiResults: Array<{ title: string; value: number | string; unit?: string }> = [];
    for (const kpi of config.kpis) {
      const pts = tagDataMap[kpi.tagId] || [];
      const vals = pts.map(p => p.val).filter(v => isFinite(v));
      let kpiVal = 0;

      if (vals.length > 0) {
        if (kpi.aggregation === 'sum') kpiVal = vals.reduce((a, b) => a + b, 0);
        else if (kpi.aggregation === 'avg') kpiVal = vals.reduce((a, b) => a + b, 0) / vals.length;
        else if (kpi.aggregation === 'min') kpiVal = Math.min(...vals);
        else if (kpi.aggregation === 'max') kpiVal = Math.max(...vals);
        else if (kpi.aggregation === 'last') kpiVal = vals[vals.length - 1];
        else if (kpi.aggregation === 'delta') {
          const first = vals[0];
          const last = vals[vals.length - 1];
          kpiVal = last >= first ? last - first : last;
        }
      }

      const dec = kpi.decimals !== undefined ? kpi.decimals : 2;
      kpiResults.push({
        title: kpi.title,
        value: Number(kpiVal.toFixed(dec)),
        unit: kpi.unit
      });
    }

    // Compute per-column footer summary
    const footerSummary: Record<string, number | string> = {};
    for (const col of config.columns) {
      if (col.footerAggregation && col.footerAggregation !== 'none') {
        const vals = rows.map(r => r.values[col.columnId]).filter((v): v is number => v !== null && isFinite(v));
        if (vals.length > 0) {
          let sumVal = 0;
          if (col.footerAggregation === 'sum') sumVal = vals.reduce((a, b) => a + b, 0);
          else if (col.footerAggregation === 'avg') sumVal = vals.reduce((a, b) => a + b, 0) / vals.length;
          else if (col.footerAggregation === 'min') sumVal = Math.min(...vals);
          else if (col.footerAggregation === 'max') sumVal = Math.max(...vals);

          const dec = col.decimals !== undefined ? col.decimals : 2;
          footerSummary[col.columnId] = Number(sumVal.toFixed(dec));
        } else {
          footerSummary[col.columnId] = '-';
        }
      }
    }

    return {
      title: config.header?.title || config.reportName,
      facility: config.header?.facilityName || 'Main Facility',
      fromMs,
      toMs,
      columns: config.columns,
      rows,
      kpis: kpiResults,
      footerSummary
    };
  }

  // ─── Safe Formula Parser (Zero eval / RCE risk) ─────────────────────────────

  private evaluateSafeFormula(formula: string, values: Record<string, number | null>): number | null {
    try {
      // Replace column IDs like col_1 with their numeric values
      let expr = formula;
      for (const [colId, val] of Object.entries(values)) {
        const numVal = val !== null && isFinite(val) ? val : 0;
        const regex = new RegExp(`\\b${colId}\\b`, 'g');
        expr = expr.replace(regex, String(numVal));
      }

      // Security check: only allow numbers, whitespace, and math operators + - * / ( ) .
      if (!/^[0-9+\-*/().\s^]+$/.test(expr)) {
        return null;
      }

      // Safe arithmetic evaluation using simple tokenized evaluator
      return this.tokenizeAndEvaluateMath(expr);
    } catch {
      return null;
    }
  }

  private tokenizeAndEvaluateMath(expr: string): number {
    // Simple recursive-descent math evaluator
    let pos = 0;
    const clean = expr.replace(/\s+/g, '');

    function parsePrimary(): number {
      if (clean[pos] === '(') {
        pos++;
        const val = parseAddSub();
        if (clean[pos] === ')') pos++;
        return val;
      }
      const match = clean.slice(pos).match(/^([0-9]+(\.[0-9]+)?)/);
      if (match) {
        pos += match[0].length;
        return parseFloat(match[0]);
      }
      return 0;
    }

    function parseMulDiv(): number {
      let val = parsePrimary();
      while (pos < clean.length && (clean[pos] === '*' || clean[pos] === '/')) {
        const op = clean[pos++];
        const next = parsePrimary();
        if (op === '*') val *= next;
        else if (op === '/') val = next !== 0 ? val / next : 0;
      }
      return val;
    }

    function parseAddSub(): number {
      let val = parseMulDiv();
      while (pos < clean.length && (clean[pos] === '+' || clean[pos] === '-')) {
        const op = clean[pos++];
        const next = parseMulDiv();
        if (op === '+') val += next;
        else if (op === '-') val -= next;
      }
      return val;
    }

    return parseAddSub();
  }

  // ─── File Renderers: ExcelJS, PDFMake, CSV, HTML ────────────────────────────

  public async renderXlsx(dataset: UnifiedReportDataset): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    const ws = workbook.addWorksheet('Report Data', {
      views: [{ state: 'frozen', ySplit: 6 }]
    });

    // 1. Title & Header Block
    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = dataset.title;
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { vertical: 'middle' };
    ws.getRow(1).height = 30;

    ws.getCell('A2').value = `Facility: ${dataset.facility} | Period: ${new Date(dataset.fromMs).toLocaleString()} to ${new Date(dataset.toMs).toLocaleString()} | Generated: ${new Date().toLocaleString()}`;
    ws.getCell('A2').font = { name: 'Segoe UI', size: 9, color: { argb: 'FF64748B' } };

    // 2. KPI Summary Cards (Row 4)
    if (dataset.kpis.length > 0) {
      let kpiCol = 1;
      dataset.kpis.forEach(kpi => {
        const cellTitle = ws.getRow(4).getCell(kpiCol);
        const cellVal = ws.getRow(5).getCell(kpiCol);

        cellTitle.value = kpi.title;
        cellTitle.font = { size: 9, bold: true, color: { argb: 'FF475569' } };
        cellTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

        cellVal.value = `${kpi.value} ${kpi.unit || ''}`.trim();
        cellVal.font = { size: 12, bold: true, color: { argb: 'FF0284C7' } };
        cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

        kpiCol++;
      });
    }

    // 3. Table Column Headers (Row 6)
    const headerRow = ws.getRow(6);
    headerRow.height = 24;

    dataset.columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.unitSuffix ? `${col.columnHeader} (${col.unitSuffix})` : col.columnHeader;
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: col.columnType === 'timestamp' ? 'left' : 'right' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
      };
    });

    // 4. Data Rows
    let currentRowIdx = 7;
    for (const row of dataset.rows) {
      const dataRow = ws.getRow(currentRowIdx);
      dataset.columns.forEach((col, cIdx) => {
        const cell = dataRow.getCell(cIdx + 1);
        if (col.columnType === 'timestamp') {
          cell.value = row.formattedTime;
          cell.alignment = { horizontal: 'left' };
        } else {
          const val = row.values[col.columnId];
          if (val !== null && isFinite(val)) {
            cell.value = val;
            cell.numFmt = col.decimals !== undefined ? (col.decimals === 0 ? '#,##0' : `#,##0.${'0'.repeat(col.decimals)}`) : '#,##0.00';
            cell.alignment = { horizontal: 'right' };
          } else {
            cell.value = '-';
            cell.alignment = { horizontal: 'center' };
          }
        }
      });
      currentRowIdx++;
    }

    // 5. Footer Summary Row
    if (Object.keys(dataset.footerSummary).length > 0) {
      const footerRow = ws.getRow(currentRowIdx);
      footerRow.height = 22;
      dataset.columns.forEach((col, cIdx) => {
        const cell = footerRow.getCell(cIdx + 1);
        if (cIdx === 0) {
          cell.value = 'Summary';
          cell.font = { bold: true };
        } else {
          const summaryVal = dataset.footerSummary[col.columnId];
          if (summaryVal !== undefined) {
            cell.value = summaryVal;
            cell.font = { bold: true, color: { argb: 'FF0284C7' } };
            cell.alignment = { horizontal: 'right' };
          }
        }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.border = { top: { style: 'double', color: { argb: 'FF0F172A' } } };
      });
    }

    // Auto-fit column widths
    ws.columns.forEach(col => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: true }, cell => {
        const len = String(cell.value || '').length;
        if (len > maxLen) maxLen = Math.min(len + 4, 40);
      });
      col.width = maxLen;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  public async renderPdf(dataset: UnifiedReportDataset): Promise<Buffer> {
    const tableBody: any[] = [];

    // Header row
    tableBody.push(
      dataset.columns.map(col => ({
        text: col.unitSuffix ? `${col.columnHeader}\n(${col.unitSuffix})` : col.columnHeader,
        bold: true,
        fillColor: '#1e293b',
        color: '#ffffff',
        alignment: col.columnType === 'timestamp' ? 'left' : 'right',
        fontSize: 8
      }))
    );

    // Data rows (cap at 2,000 for PDF readability)
    const pdfRows = dataset.rows.slice(0, 2000);
    pdfRows.forEach((row, rIdx) => {
      const rowData = dataset.columns.map(col => {
        if (col.columnType === 'timestamp') {
          return { text: row.formattedTime, fontSize: 8, alignment: 'left' };
        }
        const val = row.values[col.columnId];
        const text = val !== null && isFinite(val)
          ? val.toFixed(col.decimals !== undefined ? col.decimals : 2)
          : '-';
        return {
          text,
          fontSize: 8,
          alignment: 'right',
          fillColor: rIdx % 2 === 1 ? '#f8fafc' : undefined
        };
      });
      tableBody.push(rowData);
    });

    // Footer row
    if (Object.keys(dataset.footerSummary).length > 0) {
      tableBody.push(
        dataset.columns.map((col, idx) => ({
          text: idx === 0 ? 'Summary' : String(dataset.footerSummary[col.columnId] || ''),
          bold: true,
          fillColor: '#e2e8f0',
          alignment: idx === 0 ? 'left' : 'right',
          fontSize: 8
        }))
      );
    }

    const docDefinition: any = {
      defaultStyle: { font: 'Helvetica' },
      pageOrientation: dataset.columns.length > 5 ? 'landscape' : 'portrait',
      pageSize: 'A4',
      pageMargins: [30, 40, 30, 40],
      header: (currentPage: number, pageCount: number) => ({
        text: `${dataset.title} | Page ${currentPage} of ${pageCount}`,
        alignment: 'right',
        fontSize: 8,
        color: '#94a3b8',
        margin: [30, 15, 30, 0]
      }),
      content: [
        { text: dataset.title, fontSize: 16, bold: true, color: '#0f172a', margin: [0, 0, 0, 4] },
        {
          text: `Facility: ${dataset.facility} | Period: ${new Date(dataset.fromMs).toLocaleString()} - ${new Date(dataset.toMs).toLocaleString()}`,
          fontSize: 9,
          color: '#64748b',
          margin: [0, 0, 0, 15]
        },
        {
          table: {
            headerRows: 1,
            widths: dataset.columns.map(c => c.columnType === 'timestamp' ? 'auto' : '*'),
            body: tableBody
          },
          layout: 'lightHorizontalLines'
        }
      ]
    };

    const doc = (pdfmake as any).createPdf(docDefinition);
    const buf = await doc.getBuffer();
    return Buffer.from(buf);
  }

  public renderCsv(dataset: UnifiedReportDataset): string {
    const lines: string[] = [];

    // Header row
    const headers = dataset.columns.map(col => {
      const h = col.unitSuffix ? `${col.columnHeader} (${col.unitSuffix})` : col.columnHeader;
      return this.sanitizeCsvCell(h);
    });
    lines.push(headers.join(','));

    // Data rows
    for (const row of dataset.rows) {
      const line = dataset.columns.map(col => {
        if (col.columnType === 'timestamp') return this.sanitizeCsvCell(row.formattedTime);
        const val = row.values[col.columnId];
        return val !== null && isFinite(val)
          ? val.toFixed(col.decimals !== undefined ? col.decimals : 2)
          : '';
      });
      lines.push(line.join(','));
    }

    return lines.join('\r\n');
  }

  public renderHtml(dataset: UnifiedReportDataset): string {
    const kpiCardsHtml = dataset.kpis.map(kpi => `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; min-width: 140px;">
        <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">${this.escHtml(kpi.title)}</div>
        <div style="font-size: 18px; font-weight: 700; color: #0284c7; margin-top: 4px;">${kpi.value} <span style="font-size: 11px; color: #64748b;">${this.escHtml(kpi.unit || '')}</span></div>
      </div>
    `).join('');

    const headersHtml = dataset.columns.map(col => `
      <th style="padding: 10px 12px; text-align: ${col.columnType === 'timestamp' ? 'left' : 'right'}; background: #1e293b; color: #ffffff; font-size: 11px; font-weight: 600;">
        ${this.escHtml(col.columnHeader)} ${col.unitSuffix ? `<span style="font-size: 10px; color: #94a3b8;">(${this.escHtml(col.unitSuffix)})</span>` : ''}
      </th>
    `).join('');

    const rowsHtml = dataset.rows.map((row, idx) => `
      <tr style="background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #f1f5f9;">
        ${dataset.columns.map(col => {
          if (col.columnType === 'timestamp') {
            return `<td style="padding: 8px 12px; font-size: 11px; color: #334155;">${this.escHtml(row.formattedTime)}</td>`;
          }
          const val = row.values[col.columnId];
          const text = val !== null && isFinite(val) ? val.toFixed(col.decimals !== undefined ? col.decimals : 2) : '-';
          return `<td style="padding: 8px 12px; font-size: 11px; text-align: right; font-family: monospace; color: #0f172a;">${text}</td>`;
        }).join('')}
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${this.escHtml(dataset.title)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 20px; color: #0f172a;">${this.escHtml(dataset.title)}</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">
            Facility: <strong>${this.escHtml(dataset.facility)}</strong> | 
            Period: ${new Date(dataset.fromMs).toLocaleString()} to ${new Date(dataset.toMs).toLocaleString()} | 
            Generated: ${new Date().toLocaleString()}
          </p>
        </div>

        ${dataset.kpis.length > 0 ? `<div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">${kpiCardsHtml}</div>` : ''}

        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <thead><tr>${headersHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      </html>
    `;
  }

  // ─── Execution & Output Delivery ────────────────────────────────────────────

  public async executeReport(
    config: CustomReportDefinition,
    fromMs: number,
    toMs: number,
    options: { isScheduled?: boolean; triggerType?: string } = {}
  ): Promise<ReportJob> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    const job: ReportJob = {
      jobId,
      reportId: config.reportId,
      title: `${config.reportName} (${new Date(fromMs).toLocaleDateString()})`,
      type: config.mode === 'excel_template' ? 'template' : 'custom',
      status: 'generating',
      fromMs,
      toMs,
      rowCount: 0,
      isScheduled: Boolean(options.isScheduled),
      triggerType: (options.triggerType as any) || 'manual',
      unread: true,
      createdAt: nowIso
    };

    this.saveJob(job);

    try {
      // 1. Build unified dataset
      const dataset = await this.buildUnifiedDataset(config, fromMs, toMs);
      job.rowCount = dataset.rows.length;

      // 2. Render requested formats
      const delivery = config.delivery;
      const formatsNeeded = new Set<string>();

      if (delivery.email?.enabled) {
        (delivery.email.attachFormats || ['xlsx']).forEach(f => formatsNeeded.add(f));
      }
      if (delivery.localSave?.enabled) {
        (delivery.localSave.formats || ['xlsx']).forEach(f => formatsNeeded.add(f));
      }
      // Always generate xlsx by default for direct download
      formatsNeeded.add('xlsx');

      const renderedBuffers: Record<string, Buffer> = {};
      const generatedFiles: Array<{ format: string; filename: string; path?: string; sizeBytes?: number }> = [];

      const safeBaseName = config.reportName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const timeStampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      if (formatsNeeded.has('xlsx')) {
        const xlsxBuf = await this.renderXlsx(dataset);
        renderedBuffers['xlsx'] = xlsxBuf;
        generatedFiles.push({ format: 'xlsx', filename: `${safeBaseName}_${timeStampStr}.xlsx`, sizeBytes: xlsxBuf.length });
      }

      if (formatsNeeded.has('pdf')) {
        const pdfBuf = await this.renderPdf(dataset);
        renderedBuffers['pdf'] = pdfBuf;
        generatedFiles.push({ format: 'pdf', filename: `${safeBaseName}_${timeStampStr}.pdf`, sizeBytes: pdfBuf.length });
      }

      if (formatsNeeded.has('csv')) {
        const csvStr = this.renderCsv(dataset);
        const csvBuf = Buffer.from(csvStr, 'utf8');
        renderedBuffers['csv'] = csvBuf;
        generatedFiles.push({ format: 'csv', filename: `${safeBaseName}_${timeStampStr}.csv`, sizeBytes: csvBuf.length });
      }

      if (formatsNeeded.has('html')) {
        const htmlStr = this.renderHtml(dataset);
        const htmlBuf = Buffer.from(htmlStr, 'utf8');
        renderedBuffers['html'] = htmlBuf;
        generatedFiles.push({ format: 'html', filename: `${safeBaseName}_${timeStampStr}.html`, sizeBytes: htmlBuf.length });
        job.htmlContent = htmlStr;
      }

      // Save generated files into server data/reports/ cache directory for web downloads
      const reportsDir = path.join(process.cwd(), 'data', 'reports', jobId);
      fs.mkdirSync(reportsDir, { recursive: true });

      for (const file of generatedFiles) {
        const buf = renderedBuffers[file.format];
        if (buf) {
          const filePath = path.join(reportsDir, file.filename);
          fs.writeFileSync(filePath, buf);
          file.path = filePath;
        }
      }

      job.generatedFiles = generatedFiles;

      // 3. Local File System Save
      if (delivery.localSave?.enabled && delivery.localSave.directoryPath) {
        try {
          const targetDir = path.resolve(delivery.localSave.directoryPath);
          fs.mkdirSync(targetDir, { recursive: true });

          const savedPaths: string[] = [];
          for (const fmt of delivery.localSave.formats || ['xlsx']) {
            const buf = renderedBuffers[fmt];
            if (buf) {
              const fileName = `${safeBaseName}_${timeStampStr}.${fmt}`;
              const targetPath = path.join(targetDir, fileName);
              fs.writeFileSync(targetPath, buf);
              savedPaths.push(targetPath);
            }
          }

          job.localSaveStatus = 'saved';
          job.localSavePaths = savedPaths;
        } catch (localErr: any) {
          job.localSaveStatus = 'failed';
          job.localSaveError = localErr.message;
        }
      }

      // 4. Email Dispatch
      if (delivery.email?.enabled && delivery.email.recipients?.length > 0) {
        const attachments = (delivery.email.attachFormats || ['xlsx']).map(fmt => ({
          filename: `${safeBaseName}_${timeStampStr}.${fmt}`,
          content: renderedBuffers[fmt] || Buffer.from(''),
          contentType: fmt === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                       fmt === 'pdf' ? 'application/pdf' :
                       fmt === 'csv' ? 'text/csv' : 'text/html'
        })).filter(a => a.content.length > 0);

        const subjectTmpl = delivery.email.subjectTemplate || `[TASC SCADA] ${config.reportName}`;
        let bodyTmpl = delivery.email.bodyTemplate || `<p>Please find attached the automated SCADA report for <strong>${config.reportName}</strong>.</p>`;

        // If body is plain text (no HTML tags), wrap it with styling and convert newlines to <br/>
        if (!/<[a-z][\s\S]*>/i.test(bodyTmpl)) {
          bodyTmpl = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">${bodyTmpl.replace(/\r?\n/g, '<br/>')}</div>`;
        }

        const templateTokens = `${subjectTmpl} ${bodyTmpl}`.match(/{{([^}]+)}}/g) || [];
        const dynamicContext: Record<string, string | number> = {
          reportTitle: config.reportName,
          facility: dataset.facility,
          periodStart: new Date(fromMs).toLocaleString(),
          periodEnd: new Date(toMs).toLocaleString(),
          rowCount: dataset.rows.length,
          generatedAt: new Date().toLocaleString()
        };

        // Also populate local:* aliases for explicit namespacing
        Object.entries(dynamicContext).forEach(([k, v]) => {
          dynamicContext[`local:${k}`] = v;
        });

        // Resolve tag tokens from live cache, core config, or historian
        const cachedValues = pollingManager.getAllCachedValues();
        for (const rawToken of templateTokens) {
          const rawKey = rawToken.replace(/[{}]/g, '').trim();
          if (dynamicContext[rawKey] !== undefined) continue;

          // Parse optional namespace prefix (e.g. local:, asset:, tag:, kpi:)
          let prefix = '';
          let tokenKey = rawKey;
          if (rawKey.includes(':')) {
            const splitIdx = rawKey.indexOf(':');
            prefix = rawKey.slice(0, splitIdx).toLowerCase().trim();
            tokenKey = rawKey.slice(splitIdx + 1).trim();
          }

          // 1. If prefix is 'local', resolve from local report variables
          if (prefix === 'local') {
            if (dynamicContext[tokenKey] !== undefined) {
              dynamicContext[rawKey] = dynamicContext[tokenKey];
            }
            continue;
          }

          // 2. If prefix is 'kpi' or no prefix, check report KPI cards
          if (!prefix || prefix === 'kpi') {
            const kpi = dataset.kpis.find(k => k.title.toLowerCase() === tokenKey.toLowerCase());
            if (kpi) {
              dynamicContext[rawKey] = `${kpi.value} ${kpi.unit || ''}`.trim();
              continue;
            }
            if (prefix === 'kpi') continue;
          }

          // 3. If prefix is 'tag' or no prefix, check live driver polling cache
          if (!prefix || prefix === 'tag') {
            // Direct tagId match
            if (cachedValues[tokenKey] && cachedValues[tokenKey].value !== null && cachedValues[tokenKey].value !== undefined) {
              dynamicContext[rawKey] = cachedValues[tokenKey].value;
              continue;
            }
            // Case-insensitive tagId match
            const foundEntry = Object.entries(cachedValues).find(([id]) => id.toLowerCase() === tokenKey.toLowerCase());
            if (foundEntry && foundEntry[1].value !== null && foundEntry[1].value !== undefined) {
              dynamicContext[rawKey] = foundEntry[1].value;
              continue;
            }
          }

          // 4. Check tasc_core_config.json for tags, static values, or asset hierarchy
          if (!prefix || prefix === 'asset' || prefix === 'tag' || prefix === 'sql') {
            try {
              const cfgPath = path.join(process.cwd(), 'tasc_core_config.json');
              if (fs.existsSync(cfgPath)) {
                const coreCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

                // Check coreCfg.tags
                if (coreCfg.tags && coreCfg.tags[tokenKey]) {
                  const directTag = coreCfg.tags[tokenKey];
                  const val = directTag.value ?? directTag.staticValue ?? directTag.defaultValue;
                  if (val !== undefined && val !== null) {
                    dynamicContext[rawKey] = val;
                    continue;
                  }
                }

                // Check driverTags & general tags
                const allTags = [...(coreCfg.driverTags || []), ...Object.values(coreCfg.tags || {})];
                const matchedTag = allTags.find((t: any) =>
                  (t.tagName && t.tagName.toLowerCase() === tokenKey.toLowerCase()) ||
                  (t.tagId && t.tagId.toLowerCase() === tokenKey.toLowerCase()) ||
                  (t.name && t.name.toLowerCase() === tokenKey.toLowerCase())
                );
                if (matchedTag) {
                  const directVal = matchedTag.value ?? matchedTag.staticValue ?? matchedTag.defaultValue;
                  if (directVal !== undefined && directVal !== null) {
                    dynamicContext[rawKey] = directVal;
                    continue;
                  }
                  const tid = matchedTag.tagId || matchedTag.id;
                  if (cachedValues[tid]?.value !== undefined && cachedValues[tid]?.value !== null) {
                    dynamicContext[rawKey] = cachedValues[tid].value;
                    continue;
                  }
                  // Check latest historian value
                  const histPts = this.serverHistorian.queryTagHistory(tid, fromMs, toMs);
                  if (histPts.length > 0) {
                    const lastPt: any = histPts[histPts.length - 1];
                    dynamicContext[rawKey] = lastPt.value !== undefined ? lastPt.value : lastPt.avg;
                    continue;
                  }
                }

                // Check assetHierarchy if present
                if (Array.isArray(coreCfg.assetHierarchy)) {
                  const findInHierarchy = (nodes: any[]): any => {
                    for (const node of nodes) {
                      if (Array.isArray(node.tags)) {
                        const found = node.tags.find((t: any) =>
                          (t.name && t.name.toLowerCase() === tokenKey.toLowerCase()) ||
                          (t.tagId && t.tagId.toLowerCase() === tokenKey.toLowerCase()) ||
                          (t.path && t.path.toLowerCase().endsWith(tokenKey.toLowerCase()))
                        );
                        if (found) return found;
                      }
                      if (Array.isArray(node.children)) {
                        const childFound = findInHierarchy(node.children);
                        if (childFound) return childFound;
                      }
                    }
                    return null;
                  };
                  const assetTag = findInHierarchy(coreCfg.assetHierarchy);
                  if (assetTag) {
                    const val = assetTag.value ?? assetTag.staticValue ?? assetTag.defaultValue;
                    if (val !== undefined && val !== null) {
                      dynamicContext[rawKey] = val;
                      continue;
                    }
                  }
                }
              }
            } catch {}
          }
        }

        const emailResult = await serverEmailService.sendReportEmail({
          recipients: delivery.email.recipients,
          cc: delivery.email.cc,
          bcc: delivery.email.bcc,
          subject: subjectTmpl,
          html: bodyTmpl,
          attachments
        }, dynamicContext);

        job.emailStatus = emailResult.success ? 'sent' : 'failed';
        if (!emailResult.success) job.emailError = emailResult.error;
      }

      job.status = 'ready';
      job.completedAt = new Date().toISOString();
      this.saveJob(job);
      return job;
    } catch (err: any) {
      job.status = 'error';
      job.errorMessage = err.message;
      job.completedAt = new Date().toISOString();
      this.saveJob(job);
      throw err;
    }
  }

  // ─── Job Audit Log in SQLite ────────────────────────────────────────────────

  public saveJob(job: ReportJob): void {
    const stmt = this.db.prepare(`
      INSERT INTO report_jobs (
        job_id, report_id, title, type, status, from_ms, to_ms, row_count,
        error_message, generated_files_json, email_status, email_error,
        local_save_status, local_save_paths_json, is_scheduled, trigger_type,
        unread, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id) DO UPDATE SET
        status = excluded.status,
        row_count = excluded.row_count,
        error_message = excluded.error_message,
        generated_files_json = excluded.generated_files_json,
        email_status = excluded.email_status,
        email_error = excluded.email_error,
        local_save_status = excluded.local_save_status,
        local_save_paths_json = excluded.local_save_paths_json,
        unread = excluded.unread,
        completed_at = excluded.completed_at
    `);

    stmt.run(
      job.jobId,
      job.reportId || null,
      job.title,
      job.type,
      job.status,
      job.fromMs,
      job.toMs,
      job.rowCount || 0,
      job.errorMessage || null,
      JSON.stringify(job.generatedFiles || []),
      job.emailStatus || 'not_configured',
      job.emailError || null,
      job.localSaveStatus || 'not_configured',
      JSON.stringify(job.localSavePaths || []),
      job.isScheduled ? 1 : 0,
      job.triggerType || 'manual',
      job.unread ? 1 : 0,
      job.createdAt,
      job.completedAt || null
    );
  }

  public getJobById(jobId: string): ReportJob | null {
    try {
      const stmt = this.db.prepare(`SELECT * FROM report_jobs WHERE job_id = ?`);
      const row = stmt.get(jobId) as any;
      if (!row) return null;
      return this.mapJobRow(row);
    } catch {
      return null;
    }
  }

  public getHistory(limit = 100, offset = 0): ReportJob[] {
    try {
      const stmt = this.db.prepare(`SELECT * FROM report_jobs ORDER BY created_at DESC LIMIT ? OFFSET ?`);
      const rows = stmt.all(limit, offset) as any[];
      return rows.map(r => this.mapJobRow(r));
    } catch (err: any) {
      console.error('[ServerReportEngine] Error getting history:', err.message);
      return [];
    }
  }

  private mapJobRow(row: any): ReportJob {
    return {
      jobId: row.job_id,
      reportId: row.report_id || undefined,
      title: row.title,
      type: row.type,
      status: row.status,
      fromMs: Number(row.from_ms),
      toMs: Number(row.to_ms),
      rowCount: row.row_count !== null ? Number(row.row_count) : undefined,
      errorMessage: row.error_message || undefined,
      generatedFiles: row.generated_files_json ? JSON.parse(row.generated_files_json) : [],
      emailStatus: row.email_status,
      emailError: row.email_error || undefined,
      localSaveStatus: row.local_save_status,
      localSavePaths: row.local_save_paths_json ? JSON.parse(row.local_save_paths_json) : [],
      isScheduled: Boolean(row.is_scheduled),
      triggerType: row.trigger_type,
      unread: Boolean(row.unread),
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private resolutionToSeconds(res: string): number {
    switch (res) {
      case '1sec': return 1;
      case '1min': return 60;
      case '5min': return 300;
      case '15min': return 900;
      case '30min': return 1800;
      case '1hour': return 3600;
      case '1day': return 86400;
      default: return 0; // 'raw'
    }
  }

  private formatTimestamp(ts: number, fmt?: string): string {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());

    switch (fmt) {
      case 'DD/MM/YYYY HH:mm:ss': return `${DD}/${MM}/${YYYY} ${HH}:${mm}:${ss}`;
      case 'MM/DD/YYYY HH:mm': return `${MM}/${DD}/${YYYY} ${HH}:${mm}`;
      case 'HH:mm:ss': return `${HH}:${mm}:${ss}`;
      case 'YYYY-MM-DD': return `${YYYY}-${MM}-${DD}`;
      case 'YYYY-MM-DD HH:mm:ss':
      default:
        return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
    }
  }

  private sanitizeCsvCell(val: string): string {
    let s = String(val ?? '');
    // Prevent CSV formula injection: prefix =, +, -, @ with single quote
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      s = `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  private escHtml(str: string): string {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
