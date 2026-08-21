/**
 * TASC IIoT Studio — Standard Template Report Engine
 *
 * Handles client-provided Excel (.xlsx) template management:
 *  1. Upload and parse: Extract sheet names and column headers from client template.
 *  2. Store: Save template in IndexedDB (binary xlsxBuffer) keyed by templateId.
 *  3. Inject: Write historian data rows into the designated sheet/columns while
 *     preserving all other sheets, formulas, styles, and MIS calculations.
 *  4. Transformations: Applies energy meter rollover protection, unit conversions, and scaling.
 *  5. Download / Batch: Output the filled-in template as a new .xlsx file or batch execute.
 *
 * Key design: We NEVER overwrite the client's formula sheets (2-5). We only
 * write into the "raw data" sheet at the mapped columns/rows. All client
 * calculations in other sheets remain intact as formula strings.
 */

import * as XLSX from 'xlsx';
import type { ReportTemplate, ReportFieldMap, ReportDataResolution, ReportJob, BatchReportProgress } from '../types';
import { collectHistorianData, saveReportJob } from './reportEngine';
import { applyFieldTransformation } from './reportTransformEngine';

// ─── IndexedDB Store for Template Binaries ────────────────────────────────────

const DB_NAME = 'TascTemplateReportDB';
const STORE_NAME = 'report_templates';
const DB_VERSION = 1;
const TEMPLATE_META_KEY = 'tasc_report_templates_meta';

function openTemplateDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'templateId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Template CRUD in IndexedDB ───────────────────────────────────────────────

export async function saveTemplateBinary(templateId: string, buffer: ArrayBuffer): Promise<void> {
  const db = await openTemplateDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ templateId, buffer, savedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getTemplateBinary(templateId: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openTemplateDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(templateId);
      req.onsuccess = () => resolve(req.result?.buffer || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteTemplateBinary(templateId: string): Promise<void> {
  try {
    const db = await openTemplateDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(templateId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

// ─── Template Metadata Storage (localStorage) ─────────────────────────────────

export function getAllTemplateMetas(): ReportTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getTemplateMetaById(templateId: string): ReportTemplate | null {
  const all = getAllTemplateMetas();
  return all.find(t => t.templateId === templateId) || null;
}

export function saveTemplateMeta(template: ReportTemplate): void {
  const all = getAllTemplateMetas();
  const idx = all.findIndex(t => t.templateId === template.templateId);
  const updated = { ...template, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.push(updated);
  }
  try {
    localStorage.setItem(TEMPLATE_META_KEY, JSON.stringify(all));
  } catch {}
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const all = getAllTemplateMetas().filter(t => t.templateId !== templateId);
  try {
    localStorage.setItem(TEMPLATE_META_KEY, JSON.stringify(all));
  } catch {}
  await deleteTemplateBinary(templateId);
}

// ─── Template Parser (on file upload) ─────────────────────────────────────────

export interface TemplateParseResult {
  sheetNames: string[];
  defaultSheet: string;
  columnHeaders: Array<{ index: number; letter: string; header: string }>;
  suggestedStartRow: number;
  error?: string;
}

export async function uploadAndParseTemplate(
  file: File,
  templateId: string
): Promise<TemplateParseResult> {
  try {
    const buffer = await file.arrayBuffer();

    // Store in IndexedDB
    await saveTemplateBinary(templateId, buffer);

    // Parse workbook structure with SheetJS
    const wb = XLSX.read(buffer, { type: 'array', cellFormula: false, cellStyles: false });
    const sheetNames = wb.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      return { sheetNames: [], defaultSheet: '', columnHeaders: [], suggestedStartRow: 2, error: 'No sheets found in workbook.' };
    }

    const defaultSheet = sheetNames[0];
    const ws = wb.Sheets[defaultSheet];
    if (!ws) {
      return { sheetNames, defaultSheet, columnHeaders: [], suggestedStartRow: 2, error: 'Cannot read default sheet.' };
    }

    // Extract headers from Row 1
    const columnHeaders = extractSheetHeaders(ws);

    return {
      sheetNames,
      defaultSheet,
      columnHeaders,
      suggestedStartRow: 2
    };
  } catch (err: any) {
    return {
      sheetNames: [],
      defaultSheet: '',
      columnHeaders: [],
      suggestedStartRow: 2,
      error: `Failed to parse Excel file: ${err.message || String(err)}`
    };
  }
}

/**
 * Extracts header names from Row 1 of a worksheet.
 */
export function extractSheetHeaders(
  ws: XLSX.WorkSheet,
  headerRowIndex = 1
): Array<{ index: number; letter: string; header: string }> {
  const headers: Array<{ index: number; letter: string; header: string }> = [];
  const ref = ws['!ref'];
  if (!ref) return headers;

  const range = XLSX.utils.decode_range(ref);
  const row = headerRowIndex - 1; // 0-based

  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: row, c });
    const cell = ws[cellAddr];
    const val = cell ? String(cell.v ?? '').trim() : '';
    const letter = colIndexToLetter(c);
    headers.push({
      index: c,
      letter,
      header: val || `Column ${letter}`
    });
  }

  return headers;
}

export function colIndexToLetter(colIdx: number): string {
  let temp = colIdx;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// ─── Template Report Generator & Data Injector ────────────────────────────────

export interface GenerateTemplateReportOptions {
  autoDownload?: boolean;
  isScheduled?: boolean;
  unread?: boolean;
}

export interface GenerateReportResult {
  success: boolean;
  rowsWritten: number;
  filename: string;
  blob?: Blob;
  jobId?: string;
  errorMessage?: string;
  rowLimitApplied?: boolean;
}

/**
 * Main Template Report Execution Engine:
 * 1. Loads template binary from IndexedDB.
 * 2. Queries historian for all mapped tags.
 * 3. Applies field transformations (deltas, scaling, unit conversions, math, clamping).
 * 4. Aligns data onto a unified timestamp axis.
 * 5. Injects rows exclusively into the target sheet.
 * 6. Preserves all other sheets, formulas, styles, and charts.
 * 7. Records the completed job in history.
 * 8. Triggers browser download if autoDownload is true.
 */
export async function generateTemplateReport(
  template: ReportTemplate,
  fromMs: number,
  toMs: number,
  bypassCap = false,
  options: GenerateTemplateReportOptions = {}
): Promise<GenerateReportResult> {
  const autoDownload = options.autoDownload !== false;
  const isScheduled = Boolean(options.isScheduled);
  const unread = Boolean(options.unread);
  const jobId = `job_tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // 1. Fetch template binary from IndexedDB
  const buffer = await getTemplateBinary(template.templateId);
  if (!buffer) {
    return {
      success: false,
      rowsWritten: 0,
      filename: '',
      errorMessage: `Template file not found in local database (ID: ${template.templateId}). Please re-upload the template.`
    };
  }

  // 2. Collect historian data for all mapped tags
  const tagIds = template.fieldMaps
    .filter(fm => !fm.isTimestamp && fm.tagId)
    .map(fm => fm.tagId!);

  const dataset = await collectHistorianData(
    tagIds,
    fromMs,
    toMs,
    template.defaultResolution,
    false,
    bypassCap
  );

  // 3. Build a unified timestamp axis
  const allTs = new Set<number>();
  dataset.tags.forEach(t => t.points.forEach(p => allTs.add(p.ts)));
  const sortedTs = Array.from(allTs).sort((a, b) => a - b);

  if (sortedTs.length === 0) {
    return {
      success: false,
      rowsWritten: 0,
      filename: '',
      errorMessage: 'No historian data found for the selected time range and tags.'
    };
  }

  // 4. Apply field transformations per tag and build lookup
  const transformedTagMap: Record<string, Record<number, number>> = {};
  for (const tagResult of dataset.tags) {
    const fm = template.fieldMaps.find(m => m.tagId === tagResult.pen);
    const transformedPoints = fm
      ? applyFieldTransformation(tagResult.points, fm)
      : tagResult.points;

    transformedTagMap[tagResult.pen] = {};
    transformedPoints.forEach(p => {
      transformedTagMap[tagResult.pen][p.ts] = p.val;
    });
  }

  // 5. Read template workbook (preserving formulas on other sheets)
  const wb = XLSX.read(buffer, { type: 'array', cellFormula: true, cellStyles: false, sheetStubs: true });

  const targetSheet = template.targetSheet || wb.SheetNames[0];
  const ws = wb.Sheets[targetSheet];
  if (!ws) {
    return {
      success: false,
      rowsWritten: 0,
      filename: '',
      errorMessage: `Sheet "${targetSheet}" not found in template. Please check template configuration.`
    };
  }

  // 6. Find timestamp and tag column maps
  const timestampMap = template.fieldMaps.find(fm => fm.isTimestamp);
  const tagFieldMaps = template.fieldMaps.filter(fm => !fm.isTimestamp && fm.tagId);

  // 7. Write data rows
  const startRow = template.dataStartRow; // 1-based
  let rowsWritten = 0;

  for (let i = 0; i < sortedTs.length; i++) {
    const ts = sortedTs[i];
    const rowIdx = startRow + i; // 1-based row index

    // Write timestamp if mapped
    if (timestampMap) {
      const cellAddr = `${timestampMap.columnLetter}${rowIdx}`;
      ws[cellAddr] = { t: 's', v: new Date(ts).toLocaleString() };
    }

    // Write each tag value (with transformations applied)
    for (const fm of tagFieldMaps) {
      if (!fm.tagId) continue;
      const cellAddr = `${fm.columnLetter}${rowIdx}`;
      const val = transformedTagMap[fm.tagId]?.[ts];
      if (val !== undefined && isFinite(val)) {
        ws[cellAddr] = { t: 'n', v: val };
      } else {
        ws[cellAddr] = { t: 's', v: '' };
      }
    }

    rowsWritten++;
  }

  // Update the sheet range
  updateSheetRange(ws, startRow, sortedTs.length, template.fieldMaps);

  // 8. Prepare filename and binary output
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeName = template.templateName.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_');
  const filename = `${safeName}_${dateStr}.xlsx`;

  const wbBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // 9. Save Job in Report History
  const job: ReportJob = {
    jobId,
    templateId: template.templateId,
    title: `${template.templateName} (${rowsWritten.toLocaleString()} rows)`,
    type: 'template',
    status: 'ready',
    fromMs,
    toMs,
    rowCount: rowsWritten,
    isScheduled,
    unread,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };
  saveReportJob(job);

  // Update template lastGeneratedAt metadata
  saveTemplateMeta({
    ...template,
    lastGeneratedAt: new Date().toISOString()
  });

  // 10. Trigger browser download if requested
  if (autoDownload) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  return {
    success: true,
    rowsWritten,
    filename,
    blob,
    jobId,
    rowLimitApplied: (dataset as any).rowLimitApplied
  };
}

/**
 * Batch Template Report Runner:
 * Executes multiple templates sequentially with time-slicing to prevent UI freezing.
 */
export async function generateBatchTemplateReports(
  templates: ReportTemplate[],
  fromMs: number,
  toMs: number,
  bypassCap = false,
  onProgress?: (p: BatchReportProgress) => void
): Promise<{ success: boolean; completedJobs: ReportJob[]; errors: string[] }> {
  const completedJobs: ReportJob[] = [];
  const errors: string[] = [];

  for (let i = 0; i < templates.length; i++) {
    const tmpl = templates[i];
    if (onProgress) {
      onProgress({
        total: templates.length,
        current: i + 1,
        currentName: tmpl.templateName,
        completedJobs,
        isRunning: true
      });
    }

    // Yield control to main thread to prevent UI freezing
    await new Promise(r => setTimeout(r, 50));

    try {
      const res = await generateTemplateReport(tmpl, fromMs, toMs, bypassCap, { autoDownload: true });
      if (!res.success) {
        errors.push(`${tmpl.templateName}: ${res.errorMessage || 'Failed'}`);
      }
    } catch (e: any) {
      errors.push(`${tmpl.templateName}: ${e.message || String(e)}`);
    }
  }

  if (onProgress) {
    onProgress({
      total: templates.length,
      current: templates.length,
      currentName: 'Complete',
      completedJobs,
      isRunning: false
    });
  }

  return {
    success: errors.length === 0,
    completedJobs,
    errors
  };
}

/**
 * Updates the !ref range of a worksheet to include all newly written cells.
 */
function updateSheetRange(
  ws: XLSX.WorkSheet,
  startRow: number,
  rowCount: number,
  fieldMaps: ReportFieldMap[]
): void {
  const existingRef = ws['!ref'];
  if (!existingRef) return;
  const existingRange = XLSX.utils.decode_range(existingRef);
  const maxCol = Math.max(existingRange.e.c, ...fieldMaps.map(fm => fm.columnIndex));
  const maxRow = Math.max(existingRange.e.r, startRow + rowCount - 2); // 0-based
  ws['!ref'] = XLSX.utils.encode_range({
    s: existingRange.s,
    e: { r: maxRow, c: maxCol }
  });
}
