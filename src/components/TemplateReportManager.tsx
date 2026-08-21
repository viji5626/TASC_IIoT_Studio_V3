import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ReportTemplate,
  ReportFieldMap,
  ReportDataResolution,
  ReportSchedule,
  FieldTransformType,
  BatchReportProgress
} from '../types';
import {
  uploadAndParseTemplate,
  getAllTemplateMetas,
  saveTemplateMeta,
  deleteTemplate,
  generateTemplateReport,
  generateBatchTemplateReports,
  TemplateParseResult
} from '../utils/templateReportEngine';
import { calculateNextRunTime } from '../utils/reportScheduler';
import { TRANSFORM_LABELS } from '../utils/reportTransformEngine';

function genId(): string {
  return `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type Step = 'library' | 'upload' | 'mapping' | 'generate';

export const TemplateReportManager: React.FC = () => {
  const [step, setStep] = useState<Step>('library');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());

  // Upload step state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<TemplateParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTemplateIdRef = useRef<string>('');

  // Mapping step state
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [dataStartRow, setDataStartRow] = useState(2);
  const [resolution, setResolution] = useState<ReportDataResolution>('1hour');
  const [fieldMaps, setFieldMaps] = useState<ReportFieldMap[]>([]);
  const [activeMappingTab, setActiveMappingTab] = useState<'columns' | 'schedule'>('columns');

  // Schedule settings inside mapping step
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState<'daily' | 'weekly' | 'monthly' | 'interval'>('daily');
  const [scheduleHour, setScheduleHour] = useState(6);
  const [scheduleMinute, setScheduleMinute] = useState(0);
  const [scheduleWeekday, setScheduleWeekday] = useState(1); // 1 = Monday
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1);
  const [scheduleIntervalMins, setScheduleIntervalMins] = useState(60);
  const [scheduleLookbackHours, setScheduleLookbackHours] = useState(24);
  const [scheduleAutoDownload, setScheduleAutoDownload] = useState(false);

  // Generate step state
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 16);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);
  const [bypassCap, setBypassCap] = useState(false);
  const [generatingTemplateId, setGeneratingTemplateId] = useState<string | null>(null);

  // Batch Generation State
  const [batchProgress, setBatchProgress] = useState<BatchReportProgress | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  useEffect(() => {
    setTemplates(getAllTemplateMetas());
  }, []);

  const refreshTemplates = () => setTemplates(getAllTemplateMetas());

  // ─── Upload Handlers ────────────────────────────────────────────────────────

  const handleFileSelected = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setParseError('Please upload an Excel file (.xlsx or .xls).');
      return;
    }
    setUploadedFile(file);
    setNewTemplateName(file.name.replace(/\.(xlsx?|xls)$/, ''));
    setIsParsing(true);
    setParseError(null);
    setParseResult(null);
    const tid = genId();
    pendingTemplateIdRef.current = tid;
    const result = await uploadAndParseTemplate(file, tid);
    setIsParsing(false);
    if (result.error) { setParseError(result.error); return; }
    setParseResult(result);
    setStep('upload');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  }, [handleFileSelected]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  };

  const handleProceedToMapping = () => {
    if (!parseResult || !newTemplateName.trim()) return;
    const defaultSheet = parseResult.sheetNames[0] || 'Sheet1';
    const cols = parseResult.columnHeaders || [];
    const maps: ReportFieldMap[] = cols.slice(0, 30).map(col => ({
      columnIndex: col.index,
      columnLetter: col.letter,
      columnHeader: col.header,
      tagId: undefined,
      tagName: undefined,
      aggregation: 'avg' as const,
      isTimestamp: col.index === 0,
      transform: 'none'
    }));

    setSelectedSheet(defaultSheet);
    setDataStartRow(2);
    setResolution('1hour');
    setFieldMaps(maps);
    setActiveMappingTab('columns');

    // Reset schedule form
    setScheduleEnabled(false);
    setScheduleFreq('daily');
    setScheduleHour(6);
    setScheduleMinute(0);
    setScheduleLookbackHours(24);

    const template: ReportTemplate = {
      templateId: pendingTemplateIdRef.current,
      templateName: newTemplateName.trim(),
      description: newTemplateDesc.trim(),
      targetSheet: defaultSheet,
      dataStartRow: 2,
      fieldMaps: maps,
      defaultResolution: '1hour',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEditingTemplate(template);
    setStep('mapping');
  };

  const handleEditTemplate = (tmpl: ReportTemplate) => {
    setEditingTemplate({ ...tmpl });
    setNewTemplateName(tmpl.templateName);
    setNewTemplateDesc(tmpl.description || '');
    setSelectedSheet(tmpl.targetSheet);
    setDataStartRow(tmpl.dataStartRow);
    setResolution(tmpl.defaultResolution);
    setFieldMaps(tmpl.fieldMaps.map(fm => ({ ...fm, transform: fm.transform || 'none' })));
    setActiveMappingTab('columns');

    // Populate schedule state
    if (tmpl.schedule) {
      setScheduleEnabled(Boolean(tmpl.schedule.enabled));
      setScheduleFreq(tmpl.schedule.frequency || 'daily');
      setScheduleHour(tmpl.schedule.hour ?? 6);
      setScheduleMinute(tmpl.schedule.minute ?? 0);
      setScheduleWeekday(tmpl.schedule.weekday ?? 1);
      setScheduleDayOfMonth(tmpl.schedule.dayOfMonth ?? 1);
      setScheduleIntervalMins(tmpl.schedule.intervalMinutes ?? 60);
      setScheduleLookbackHours(tmpl.schedule.lookbackHours ?? 24);
      setScheduleAutoDownload(Boolean(tmpl.schedule.autoDownload));
    } else {
      setScheduleEnabled(false);
      setScheduleFreq('daily');
      setScheduleHour(6);
      setScheduleMinute(0);
      setScheduleLookbackHours(24);
      setScheduleAutoDownload(false);
    }

    setStep('mapping');
  };

  const handleSaveMapping = () => {
    if (!editingTemplate) return;

    let scheduleObj: ReportSchedule | undefined = undefined;
    if (scheduleEnabled) {
      const draftSchedule: ReportSchedule = {
        enabled: true,
        frequency: scheduleFreq,
        hour: scheduleHour,
        minute: scheduleMinute,
        weekday: scheduleWeekday,
        dayOfMonth: scheduleDayOfMonth,
        intervalMinutes: scheduleIntervalMins,
        lookbackHours: scheduleLookbackHours,
        autoDownload: scheduleAutoDownload,
        lastRunAt: editingTemplate.schedule?.lastRunAt
      };
      draftSchedule.nextRunAt = calculateNextRunTime(draftSchedule);
      scheduleObj = draftSchedule;
    }

    const updated: ReportTemplate = {
      ...editingTemplate,
      templateName: newTemplateName.trim() || editingTemplate.templateName,
      description: newTemplateDesc.trim(),
      targetSheet: selectedSheet,
      dataStartRow,
      fieldMaps,
      defaultResolution: resolution,
      schedule: scheduleObj,
      updatedAt: new Date().toISOString()
    };

    saveTemplateMeta(updated);
    refreshTemplates();
    setEditingTemplate(null);
    setStep('library');
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    await deleteTemplate(templateId);
    setSelectedTemplateIds(prev => {
      const next = new Set(prev);
      next.delete(templateId);
      return next;
    });
    refreshTemplates();
  };

  const handleGenerateNow = async (tmpl: ReportTemplate) => {
    setGeneratingTemplateId(tmpl.templateId);
    setIsGenerating(true);
    setGenerateResult(null);
    setStep('generate');
    const from = new Date(fromDate).getTime();
    const to = new Date(toDate).getTime();
    try {
      const result = await generateTemplateReport(tmpl, from, to, bypassCap);
      if (result.success) {
        setGenerateResult(`✅ Report generated! ${result.rowsWritten.toLocaleString()} rows written to "${result.filename}". Download started.${result.rowLimitApplied ? ' ⚠️ Row limit was applied — some data may be trimmed. Enable "Bypass Cap" to get full data.' : ''}`);
        refreshTemplates();
      } else {
        setGenerateResult(`❌ Error: ${result.errorMessage}`);
      }
    } catch (e: any) {
      setGenerateResult(`❌ Unexpected error: ${e.message}`);
    }
    setIsGenerating(false);
  };

  // ─── Batch Generation Handlers ───────────────────────────────────────────────

  const toggleSelectTemplate = (templateId: string) => {
    setSelectedTemplateIds(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  };

  const selectAllTemplates = () => {
    if (selectedTemplateIds.size === templates.length) {
      setSelectedTemplateIds(new Set());
    } else {
      setSelectedTemplateIds(new Set(templates.map(t => t.templateId)));
    }
  };

  const handleStartBatchGeneration = async () => {
    const selectedList = templates.filter(t => selectedTemplateIds.has(t.templateId));
    if (selectedList.length === 0) return;

    setIsBatchModalOpen(true);
    const from = new Date(fromDate).getTime();
    const to = new Date(toDate).getTime();

    await generateBatchTemplateReports(selectedList, from, to, bypassCap, progress => {
      setBatchProgress(progress);
    });

    refreshTemplates();
  };

  // ─── Field Map Update ─────────────────────────────────────────────────────────

  const updateFieldMap = (colIndex: number, updates: Partial<ReportFieldMap>) => {
    setFieldMaps(prev => prev.map(fm => fm.columnIndex === colIndex ? { ...fm, ...updates } : fm));
  };

  return (
    <div className="flex flex-col h-full text-slate-100 overflow-y-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-400 mb-4 shrink-0">
        <button type="button" onClick={() => setStep('library')} className="hover:text-sky-400 transition-colors">
          Template Library
        </button>
        {step !== 'library' && (
          <>
            <span>/</span>
            <span className="text-slate-300 capitalize font-medium">
              {step === 'upload' ? 'Upload Template' : step === 'mapping' ? 'Configure Template & Schedule' : 'Generate Report'}
            </span>
          </>
        )}
      </div>

      {/* ── 1. Library View ─────────────────────────────────────────────────── */}
      {step === 'library' && (
        <div className="space-y-5 pb-20">
          {/* Upload Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDragging ? 'border-sky-400 bg-sky-500/10' : 'border-slate-700 hover:border-sky-500/60 hover:bg-slate-800/40 bg-slate-900/40'
            }`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-3">
              <i className="fas fa-file-excel text-emerald-400 text-xl" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Upload Client Excel Template (.xlsx)</p>
            <p className="text-xs text-slate-500 mt-1">Preserves all client MIS formulas, charts, and pivot tables</p>
            {isParsing && (
              <p className="text-xs text-sky-400 mt-3 animate-pulse flex items-center space-x-1.5">
                <i className="fas fa-circle-notch fa-spin" />
                <span>Analyzing sheets and headers...</span>
              </p>
            )}
            {parseError && <p className="text-xs text-red-400 mt-2 font-medium">{parseError}</p>}
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />

          {/* Template List */}
          {templates.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Saved Templates ({templates.length})
                  </h3>
                  <button
                    type="button"
                    onClick={selectAllTemplates}
                    className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    {selectedTemplateIds.size === templates.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                {selectedTemplateIds.size > 0 && (
                  <span className="text-xs font-semibold text-sky-300 bg-sky-950/80 px-2.5 py-1 rounded-full border border-sky-800">
                    {selectedTemplateIds.size} selected
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {templates.map(tmpl => {
                  const isSelected = selectedTemplateIds.has(tmpl.templateId);
                  const isScheduled = tmpl.schedule?.enabled;

                  return (
                    <div
                      key={tmpl.templateId}
                      className={`bg-slate-900/90 border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        isSelected ? 'border-sky-500/80 bg-sky-950/20' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTemplate(tmpl.templateId)}
                          className="w-4 h-4 mt-1 sm:mt-0 rounded cursor-pointer accent-sky-500 shrink-0"
                        />
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <i className="fas fa-file-excel text-emerald-400 text-sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <p className="font-bold text-slate-200 text-sm truncate">{tmpl.templateName}</p>
                            {isScheduled ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center space-x-1">
                                <i className="fas fa-clock text-[9px]" />
                                <span>{tmpl.schedule?.frequency.toUpperCase()} @ {String(tmpl.schedule?.hour || 0).padStart(2, '0')}:{String(tmpl.schedule?.minute || 0).padStart(2, '0')}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                                On-Demand Only
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {tmpl.fieldMaps.filter(fm => !fm.isTimestamp && fm.tagId).length} tags mapped · Sheet: <strong className="text-slate-300">{tmpl.targetSheet}</strong> · Start Row: {tmpl.dataStartRow} · {tmpl.defaultResolution}
                          </p>
                          {tmpl.lastGeneratedAt && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Last run: {new Date(tmpl.lastGeneratedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleEditTemplate(tmpl)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        >
                          <i className="fas fa-pen-to-square mr-1 text-slate-400" />Configure
                        </button>
                        <button
                          type="button"
                          onClick={() => { setGeneratingTemplateId(tmpl.templateId); setStep('generate'); }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors shadow-sm"
                        >
                          <i className="fas fa-file-export mr-1" />Generate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tmpl.templateId)}
                          className="p-1.5 w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors flex items-center justify-center"
                          title="Delete template"
                        >
                          <i className="fas fa-trash text-xs" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-2">
              <i className="fas fa-folder-open text-3xl text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No Excel Templates Stored</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Upload your client's existing multi-sheet MIS Excel file to map telemetry tags and automate report injection.
              </p>
            </div>
          )}

          {/* ── Sticky Batch Generation Toolbar ────────────────────────────── */}
          {selectedTemplateIds.size > 0 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-sky-500/60 rounded-2xl px-5 py-3 shadow-2xl flex items-center space-x-4 animate-fade-in backdrop-blur-lg">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span className="text-xs font-bold text-sky-300">{selectedTemplateIds.size} Templates Selected</span>
              </div>
              <button
                type="button"
                onClick={handleStartBatchGeneration}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-md flex items-center space-x-1.5"
              >
                <i className="fas fa-bolt" />
                <span>Batch Generate All</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplateIds(new Set())}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 2. Upload Preview Step ──────────────────────────────────────────── */}
      {step === 'upload' && parseResult && (
        <div className="space-y-5 max-w-4xl mx-auto w-full">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start space-x-3.5">
            <i className="fas fa-circle-check text-emerald-400 text-xl mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-300">Template Structure Parsed</p>
              <p className="text-xs text-slate-300 mt-0.5">Found {parseResult.sheetNames.length} sheets: {parseResult.sheetNames.join(', ')}</p>
              <p className="text-xs text-slate-400 mt-0.5">File: {uploadedFile?.name} ({((uploadedFile?.size || 0) / 1024).toFixed(0)} KB)</p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">Template Name *</label>
              <input
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                placeholder="e.g. Daily Chiller Energy MIS Report"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1.5">Description (optional)</label>
              <input
                value={newTemplateDesc}
                onChange={e => setNewTemplateDesc(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                placeholder="e.g. Feeds into Client Chiller Plant MIS formulas on Sheet 2 & 3"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => { setStep('library'); setParseResult(null); setUploadedFile(null); }}
              className="text-xs px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceedToMapping}
              disabled={!newTemplateName.trim()}
              className="text-xs px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold transition-all shadow-md"
            >
              Proceed to Field Mapping & Schedules →
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Field Mapping & Schedule Configuration Step ──────────────────── */}
      {step === 'mapping' && editingTemplate && (
        <div className="space-y-5 max-w-5xl mx-auto w-full">
          {/* Mapping View Header with Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">{editingTemplate.templateName}</h2>
              <p className="text-xs text-slate-400">Configure column bindings, unit transformations, and automated schedules</p>
            </div>
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveMappingTab('columns')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMappingTab === 'columns' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-columns mr-1.5" />Column Mapping
              </button>
              <button
                type="button"
                onClick={() => setActiveMappingTab('schedule')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMappingTab === 'schedule' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-clock mr-1.5" />Schedule Settings
              </button>
            </div>
          </div>

          {/* ── Tab A: Columns & Target Sheet ─────────────────────────────── */}
          {activeMappingTab === 'columns' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Target Raw Data Sheet</label>
                  <input
                    value={selectedSheet}
                    onChange={e => setSelectedSheet(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    placeholder="Sheet1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Data Row Start Index</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={dataStartRow}
                    onChange={e => setDataStartRow(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">Data Resolution</label>
                  <select
                    value={resolution}
                    onChange={e => setResolution(e.target.value as ReportDataResolution)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="raw">Raw (Every Sample)</option>
                    <option value="1min">1-Minute Average</option>
                    <option value="1hour">1-Hour Average</option>
                    <option value="1day">1-Day Summary</option>
                  </select>
                </div>
              </div>

              {/* Column Mapping Table */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Excel Column ➔ Tag ID & Transformations
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {fieldMaps.map(fm => (
                    <div
                      key={fm.columnIndex}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-800/70 border border-slate-700/60 rounded-xl px-3 py-2"
                    >
                      <div className="col-span-1 text-xs font-mono text-sky-400 font-bold">{fm.columnLetter}</div>
                      <div className="col-span-3 text-xs text-slate-300 truncate" title={fm.columnHeader}>{fm.columnHeader}</div>

                      <div className="col-span-1 flex items-center justify-center">
                        <label className="flex items-center space-x-1 cursor-pointer text-[10px] text-slate-400">
                          <input
                            type="checkbox"
                            checked={!!fm.isTimestamp}
                            onChange={e => updateFieldMap(fm.columnIndex, { isTimestamp: e.target.checked, tagId: e.target.checked ? undefined : fm.tagId })}
                            className="w-3.5 h-3.5 cursor-pointer accent-sky-500"
                          />
                          <span className="hidden xl:inline">Time</span>
                        </label>
                      </div>

                      <div className="col-span-4">
                        {!fm.isTimestamp ? (
                          <input
                            value={fm.tagId || ''}
                            onChange={e => updateFieldMap(fm.columnIndex, { tagId: e.target.value, tagName: e.target.value })}
                            placeholder="Historian Tag / Pen ID"
                            className="w-full bg-slate-700/80 border border-slate-600 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                          />
                        ) : (
                          <span className="text-xs text-sky-400 italic flex items-center space-x-1">
                            <i className="fas fa-clock text-[10px]" />
                            <span>DateTime Axis</span>
                          </span>
                        )}
                      </div>

                      <div className="col-span-3 flex items-center space-x-1">
                        {!fm.isTimestamp ? (
                          <select
                            value={fm.transform || 'none'}
                            onChange={e => updateFieldMap(fm.columnIndex, { transform: e.target.value as FieldTransformType })}
                            className="w-full bg-slate-700/80 border border-slate-600 rounded-lg px-1.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                            title="Field Transformation"
                          >
                            {Object.entries(TRANSFORM_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>{label}</option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab B: Automated Background Schedule ──────────────────────── */}
          {activeMappingTab === 'schedule' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <i className="fas fa-calendar-check text-sky-400" />
                    <span>Automated Scheduled Execution</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automatically queries the historian and injects fresh data into the template in the background.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={e => setScheduleEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
                </label>
              </div>

              {scheduleEnabled ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Frequency</label>
                      <select
                        value={scheduleFreq}
                        onChange={e => setScheduleFreq(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      >
                        <option value="daily">Daily (Every Day at set time)</option>
                        <option value="weekly">Weekly (Specific day of week)</option>
                        <option value="monthly">Monthly (1st of every month)</option>
                        <option value="interval">Interval (Every N minutes)</option>
                      </select>
                    </div>

                    {scheduleFreq === 'interval' ? (
                      <div>
                        <label className="text-xs text-slate-400 font-semibold block mb-1">Interval Minutes</label>
                        <select
                          value={scheduleIntervalMins}
                          onChange={e => setScheduleIntervalMins(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                        >
                          <option value={15}>Every 15 Minutes</option>
                          <option value={30}>Every 30 Minutes</option>
                          <option value={60}>Every 60 Minutes (Hourly)</option>
                          <option value={120}>Every 2 Hours</option>
                          <option value={360}>Every 6 Hours</option>
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-400 font-semibold block mb-1">Hour (0-23)</label>
                          <input
                            type="number"
                            min={0}
                            max={23}
                            value={scheduleHour}
                            onChange={e => setScheduleHour(Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 font-semibold block mb-1">Minute (0-59)</label>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={scheduleMinute}
                            onChange={e => setScheduleMinute(Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Lookback Query Window (Hours)</label>
                      <input
                        type="number"
                        min={1}
                        max={8760}
                        value={scheduleLookbackHours}
                        onChange={e => setScheduleLookbackHours(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                        placeholder="e.g. 24 for 1 day, 168 for 1 week"
                      />
                    </div>

                    <div className="flex items-center space-x-3 bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 self-end">
                      <input
                        type="checkbox"
                        id="autoDownload"
                        checked={scheduleAutoDownload}
                        onChange={e => setScheduleAutoDownload(e.target.checked)}
                        className="w-4 h-4 rounded cursor-pointer accent-sky-500"
                      />
                      <label htmlFor="autoDownload" className="text-xs text-slate-300 cursor-pointer">
                        Trigger instant browser download on schedule
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Automated schedule is disabled for this template. Enable the toggle above to configure recurring generation.
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('library')}
              className="text-xs px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveMapping}
              className="text-xs px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md flex items-center space-x-1.5"
            >
              <i className="fas fa-floppy-disk" />
              <span>Save Template Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 4. Generate Step ────────────────────────────────────────────────── */}
      {step === 'generate' && (
        <div className="space-y-4 max-w-2xl mx-auto w-full">
          {(() => {
            const tmpl = templates.find(t => t.templateId === generatingTemplateId);
            if (!tmpl) return <p className="text-sm text-red-400">Template not found.</p>;
            return (
              <>
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <i className="fas fa-file-excel text-emerald-400 text-lg" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-200 text-sm">{tmpl.templateName}</p>
                    <p className="text-xs text-slate-400">{tmpl.fieldMaps.filter(fm => !fm.isTimestamp && fm.tagId).length} tags · Sheet: {tmpl.targetSheet} · {tmpl.defaultResolution}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">From Date</label>
                    <input
                      type="datetime-local"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">To Date</label>
                    <input
                      type="datetime-local"
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-3">
                  <input
                    type="checkbox"
                    id="bypassCap"
                    checked={bypassCap}
                    onChange={e => setBypassCap(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-amber-500"
                  />
                  <label htmlFor="bypassCap" className="text-xs text-amber-300 cursor-pointer">
                    <strong>Bypass Row Cap</strong> — Allow up to 200,000 rows for high-density enterprise exports
                  </label>
                </div>

                {generateResult && (
                  <div className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${
                    generateResult.startsWith('✅')
                      ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/80 border border-red-500/40 text-red-300'
                  }`}>
                    {generateResult}
                  </div>
                )}

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep('library'); setGenerateResult(null); }}
                    className="text-xs px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                  >
                    ← Back to Library
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateNow(tmpl)}
                    disabled={isGenerating}
                    className="text-xs px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold transition-all shadow-md flex items-center space-x-2"
                  >
                    {isGenerating ? (
                      <>
                        <i className="fas fa-circle-notch fa-spin" />
                        <span>Injecting Data...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-arrow-down" />
                        <span>Generate & Download</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Batch Generation Progress Modal ─────────────────────────────────── */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                <i className="fas fa-bolt text-sky-400 text-lg" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Batch Template Generation</h3>
                <p className="text-xs text-slate-400">Processing {selectedTemplateIds.size} templates sequentially</p>
              </div>
            </div>

            {batchProgress && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span>{batchProgress.currentName}</span>
                  <span>{batchProgress.current} / {batchProgress.total}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {!batchProgress?.isRunning && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
