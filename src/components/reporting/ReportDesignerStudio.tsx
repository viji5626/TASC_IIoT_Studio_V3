import React, { useState, useEffect } from 'react';
import type {
  CustomReportDefinition,
  ReportColumnConfig,
  ReportKpiConfig,
  ReportSchedule,
  ReportTriggerConfig,
  ReportDeliveryConfig,
  SmtpServerConfig
} from '../../types/reporting';
import { TagPickerModal } from './TagPickerModal';
import { EmailSettingsModal } from './EmailSettingsModal';

interface Props {
  initialReport?: CustomReportDefinition | null;
  onSave: (report: CustomReportDefinition) => void;
  onCancel: () => void;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export const ReportDesignerStudio: React.FC<Props> = ({ initialReport, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'designer' | 'delivery' | 'schedule_trigger'>('designer');

  // Report Core Metadata
  const [reportName, setReportName] = useState(initialReport?.reportName || 'New Industrial Report');
  const [reportDesc, setReportDesc] = useState(initialReport?.description || '');
  const [facilityName, setFacilityName] = useState(initialReport?.header?.facilityName || 'Main Plant');
  const [department, setDepartment] = useState(initialReport?.header?.department || 'Operations');
  const [defaultResolution, setDefaultResolution] = useState(initialReport?.defaultResolution || '1hour');

  // KPI Summary Cards
  const [kpis, setKpis] = useState<ReportKpiConfig[]>(initialReport?.kpis || []);

  // Table Columns
  const [columns, setColumns] = useState<ReportColumnConfig[]>(() => {
    if (initialReport?.columns && initialReport.columns.length > 0) {
      return initialReport.columns;
    }
    // Default: Timestamp column + 1 Tag column
    return [
      {
        columnId: 'col_ts',
        columnType: 'timestamp',
        columnHeader: 'Timestamp',
        dateFormat: 'YYYY-MM-DD HH:mm:ss',
        resolution: '1hour',
        aggregation: 'raw',
        footerAggregation: 'none'
      },
      {
        columnId: 'col_1',
        columnType: 'tag',
        columnHeader: 'Sensor Telemetry',
        aggregation: 'avg',
        unitSuffix: '',
        decimals: 2,
        footerAggregation: 'avg'
      }
    ];
  });

  // Delivery Configuration (Email + Local Save)
  const [delivery, setDelivery] = useState<ReportDeliveryConfig>(() => {
    return initialReport?.delivery || {
      email: {
        enabled: false,
        recipients: [],
        subjectTemplate: '[TASC SCADA] {{reportTitle}} - {{periodStart}}',
        bodyTemplate: '<p>Automated report attached for <strong>{{reportTitle}}</strong>.</p>',
        attachFormats: ['xlsx', 'pdf']
      },
      localSave: {
        enabled: false,
        directoryPath: 'D:\\SCADA_Reports\\Daily\\',
        formats: ['xlsx']
      }
    };
  });

  // Schedule & Trigger Configuration
  const [schedule, setSchedule] = useState<ReportSchedule>(() => {
    return initialReport?.schedule || {
      enabled: false,
      frequency: 'daily',
      hour: 6,
      minute: 0,
      lookbackHours: 24
    };
  });

  const [trigger, setTrigger] = useState<ReportTriggerConfig>(() => {
    return initialReport?.trigger || {
      enabled: false,
      type: 'tag_edge',
      cooldownMinutes: 15,
      edgeExpectedValue: 1,
      lookbackHours: 8
    };
  });

  // Tag Picker State
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [tagPickerTarget, setTagPickerTarget] = useState<{ type: 'column' | 'kpi' | 'trigger' | 'body_tag'; id?: string } | null>(null);

  // SMTP Settings Modal & Live Config State
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<SmtpServerConfig | null>(null);

  useEffect(() => {
    loadSmtpConfig();
  }, []);

  const loadSmtpConfig = async () => {
    try {
      const res = await fetch('/api/smtp/config');
      const data = await res.json();
      if (data.success && data.config) {
        setSmtpConfig(data.config);
      }
    } catch (err: any) {
      console.warn('Failed to load SMTP config in designer:', err.message);
    }
  };

  // Live Preview State
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // ─── Column Handlers ─────────────────────────────────────────────────────────

  const addTagColumn = () => {
    const newCol: ReportColumnConfig = {
      columnId: genId('col'),
      columnType: 'tag',
      columnHeader: `Data Column ${columns.length}`,
      aggregation: 'avg',
      unitSuffix: '',
      decimals: 2,
      footerAggregation: 'none'
    };
    setColumns([...columns, newCol]);
  };

  const addComputedColumn = () => {
    const newCol: ReportColumnConfig = {
      columnId: genId('col'),
      columnType: 'computed',
      columnHeader: `Calculation ${columns.length}`,
      formula: 'col_1 * 1.0',
      decimals: 2,
      aggregation: 'raw',
      footerAggregation: 'none'
    };
    setColumns([...columns, newCol]);
  };

  const updateColumn = (colId: string, updates: Partial<ReportColumnConfig>) => {
    setColumns(columns.map(c => c.columnId === colId ? { ...c, ...updates } : c));
  };

  const deleteColumn = (colId: string) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter(c => c.columnId !== colId));
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= columns.length) return;
    const newCols = [...columns];
    const temp = newCols[index];
    newCols[index] = newCols[targetIdx];
    newCols[targetIdx] = temp;
    setColumns(newCols);
  };

  // ─── KPI Handlers ───────────────────────────────────────────────────────────

  const addKpi = () => {
    const newKpi: ReportKpiConfig = {
      kpiId: genId('kpi'),
      title: `Metric ${kpis.length + 1}`,
      tagId: '',
      aggregation: 'sum',
      unit: '',
      decimals: 2
    };
    setKpis([...kpis, newKpi]);
  };

  const updateKpi = (kpiId: string, updates: Partial<ReportKpiConfig>) => {
    setKpis(kpis.map(k => k.kpiId === kpiId ? { ...k, ...updates } : k));
  };

  const deleteKpi = (kpiId: string) => {
    setKpis(kpis.filter(k => k.kpiId !== kpiId));
  };

  // ─── Tag Picker Callback ───────────────────────────────────────────────────

  const handleTagSelected = (tag: { tagId: string; tagName: string; unit?: string }) => {
    if (!tagPickerTarget) return;

    if (tagPickerTarget.type === 'column' && tagPickerTarget.id) {
      updateColumn(tagPickerTarget.id, {
        tagId: tag.tagId,
        tagName: tag.tagName,
        columnHeader: tag.tagName || tag.tagId,
        unitSuffix: tag.unit || ''
      });
    } else if (tagPickerTarget.type === 'kpi' && tagPickerTarget.id) {
      updateKpi(tagPickerTarget.id, {
        tagId: tag.tagId,
        tagName: tag.tagName,
        title: tag.tagName || tag.tagId,
        unit: tag.unit || ''
      });
    } else if (tagPickerTarget.type === 'trigger') {
      setTrigger(prev => ({
        ...prev,
        edgeTagId: tag.tagId,
        thresholdTagId: tag.tagId
      }));
    } else if (tagPickerTarget.type === 'body_tag') {
      const token = `{{${tag.tagName || tag.tagId}}}`;
      const currentBody = delivery.email.bodyTemplate || '';
      setDelivery(prev => ({
        ...prev,
        email: {
          ...prev.email,
          bodyTemplate: currentBody ? `${currentBody} ${token}` : token
        }
      }));
    }
  };

  // ─── Save & Export ─────────────────────────────────────────────────────────

  const handleSaveReport = () => {
    const def: CustomReportDefinition = {
      reportId: initialReport?.reportId || genId('rep'),
      reportName: reportName.trim() || 'Untitled Report',
      description: reportDesc.trim(),
      mode: 'custom_grid',
      header: {
        title: reportName.trim(),
        facilityName: facilityName.trim(),
        department: department.trim(),
        showDateRange: true,
        showGeneratedAt: true
      },
      kpis,
      columns,
      defaultResolution,
      delivery,
      schedule,
      trigger,
      createdAt: initialReport?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(def);
  };

  // ─── Shift Presets ──────────────────────────────────────────────────────────

  const applyShiftPreset = (preset: 'day' | 'evening' | 'night' | 'all') => {
    if (preset === 'day') {
      setSchedule(prev => ({ ...prev, enabled: true, frequency: 'daily', hour: 14, minute: 0, lookbackHours: 8 }));
    } else if (preset === 'evening') {
      setSchedule(prev => ({ ...prev, enabled: true, frequency: 'daily', hour: 22, minute: 0, lookbackHours: 8 }));
    } else if (preset === 'night') {
      setSchedule(prev => ({ ...prev, enabled: true, frequency: 'daily', hour: 6, minute: 0, lookbackHours: 8 }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-y-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <i className="fas fa-chevron-left text-xs" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <i className="fas fa-file-signature text-sky-400" />
              <span>Report Designer Studio</span>
            </h2>
            <p className="text-xs text-slate-400">Design custom SCADA reports from scratch with live bindings & automated delivery</p>
          </div>
        </div>

        {/* Tab Navigation & Save Button */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('designer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'designer' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fas fa-columns mr-1.5" />Grid Designer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('delivery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'delivery' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fas fa-paper-plane mr-1.5" />Email & Local Save
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedule_trigger')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'schedule_trigger' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fas fa-clock mr-1.5" />Schedule & Triggers
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveReport}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
          >
            <i className="fas fa-check" />
            <span>Save Report</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* ── Tab 1: Grid Designer ────────────────────────────────────────────── */}
        {activeTab === 'designer' && (
          <div className="space-y-6">
            {/* Header & Meta Block */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <i className="fas fa-heading text-sky-400" />
                <span>Report Header & Facility Identification</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Report Title *</label>
                  <input
                    type="text"
                    value={reportName}
                    onChange={e => setReportName(e.target.value)}
                    placeholder="e.g. Daily Chiller Plant Energy & Flow Report"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Facility / Plant</label>
                  <input
                    type="text"
                    value={facilityName}
                    onChange={e => setFacilityName(e.target.value)}
                    placeholder="e.g. Building A - Central Plant"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Default Resolution</label>
                  <select
                    value={defaultResolution}
                    onChange={e => setDefaultResolution(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="raw">Raw (Every Point)</option>
                    <option value="1sec">1-Second Log</option>
                    <option value="1min">1-Minute Average</option>
                    <option value="5min">5-Minute Average</option>
                    <option value="15min">15-Minute Average</option>
                    <option value="30min">30-Minute Average</option>
                    <option value="1hour">1-Hour Average</option>
                    <option value="1day">1-Day Summary</option>
                  </select>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards Section */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                    <i className="fas fa-chart-simple text-amber-400" />
                    <span>Top-Level KPI Summary Cards ({kpis.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Key totals, averages, and peak metrics displayed above the main data table</p>
                </div>
                <button
                  type="button"
                  onClick={addKpi}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center space-x-1.5"
                >
                  <i className="fas fa-plus text-xs" />
                  <span>Add KPI Card</span>
                </button>
              </div>

              {kpis.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {kpis.map((kpi, idx) => (
                    <div key={kpi.kpiId} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2 relative group">
                      <button
                        type="button"
                        onClick={() => deleteKpi(kpi.kpiId)}
                        className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete KPI"
                      >
                        <i className="fas fa-trash text-xs" />
                      </button>

                      <div className="pr-6">
                        <input
                          type="text"
                          value={kpi.title}
                          onChange={e => updateKpi(kpi.kpiId, { title: e.target.value })}
                          placeholder="KPI Title (e.g. Total Energy)"
                          className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-bold focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTagPickerTarget({ type: 'kpi', id: kpi.kpiId });
                            setIsTagPickerOpen(true);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 hover:border-sky-500/60 rounded-lg px-2 py-1 text-left text-[11px] text-sky-400 font-mono truncate"
                        >
                          {kpi.tagId || 'Select Tag...'}
                        </button>

                        <select
                          value={kpi.aggregation}
                          onChange={e => updateKpi(kpi.kpiId, { aggregation: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          <option value="sum">Sum (Total)</option>
                          <option value="avg">Average</option>
                          <option value="min">Minimum</option>
                          <option value="max">Peak (Max)</option>
                          <option value="delta">Delta (Consumption)</option>
                          <option value="last">Latest Value</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={kpi.unit || ''}
                          onChange={e => updateKpi(kpi.kpiId, { unit: e.target.value })}
                          placeholder="Unit (e.g. kWh)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500"
                        />
                        <select
                          value={kpi.decimals ?? 2}
                          onChange={e => updateKpi(kpi.kpiId, { decimals: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          <option value={0}>0 Decimals</option>
                          <option value={1}>1 Decimal</option>
                          <option value={2}>2 Decimals</option>
                          <option value={3}>3 Decimals</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No summary KPI cards added. Click "Add KPI Card" above to display highlighted plant totals.
                </div>
              )}
            </div>

            {/* Table Column Builder */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                    <i className="fas fa-table-columns text-emerald-400" />
                    <span>Table Column Configuration ({columns.length} Columns)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Configure timestamp axis, industrial tag bindings, formulas, and footer summaries</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={addTagColumn}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center space-x-1.5"
                  >
                    <i className="fas fa-plus text-xs" />
                    <span>Add Tag Column</span>
                  </button>
                  <button
                    type="button"
                    onClick={addComputedColumn}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-purple-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center space-x-1.5"
                  >
                    <i className="fas fa-calculator text-xs" />
                    <span>Add Formula Column</span>
                  </button>
                </div>
              </div>

              {/* Column List */}
              <div className="space-y-3">
                {columns.map((col, index) => (
                  <div
                    key={col.columnId}
                    className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 grid grid-cols-12 gap-3 items-center"
                  >
                    {/* Reorder & ID */}
                    <div className="col-span-1 flex items-center space-x-1 text-slate-400">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveColumn(index, 'up')}
                          className="text-[10px] hover:text-sky-400 disabled:opacity-20"
                        >
                          <i className="fas fa-chevron-up" />
                        </button>
                        <button
                          type="button"
                          disabled={index === columns.length - 1}
                          onClick={() => moveColumn(index, 'down')}
                          className="text-[10px] hover:text-sky-400 disabled:opacity-20"
                        >
                          <i className="fas fa-chevron-down" />
                        </button>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-bold ml-1">#{index + 1}</span>
                    </div>

                    {/* Column Header Name */}
                    <div className="col-span-3">
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Column Header</label>
                      <input
                        type="text"
                        value={col.columnHeader}
                        onChange={e => updateColumn(col.columnId, { columnHeader: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-medium"
                      />
                    </div>

                    {/* Type-Specific Settings */}
                    {col.columnType === 'timestamp' ? (
                      <div className="col-span-6 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Date/Time Format</label>
                          <select
                            value={col.dateFormat || 'YYYY-MM-DD HH:mm:ss'}
                            onChange={e => updateColumn(col.columnId, { dateFormat: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                          >
                            <option value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss (2026-09-20 06:00:00)</option>
                            <option value="DD/MM/YYYY HH:mm:ss">DD/MM/YYYY HH:mm:ss (20/09/2026 06:00:00)</option>
                            <option value="MM/DD/YYYY HH:mm">MM/DD/YYYY HH:mm (09/20/2026 06:00)</option>
                            <option value="HH:mm:ss">HH:mm:ss (06:00:00)</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD (2026-09-20)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Time Interval</label>
                          <select
                            value={col.resolution || '1hour'}
                            onChange={e => updateColumn(col.columnId, { resolution: e.target.value as any })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                          >
                            <option value="raw">Raw (Every Sample)</option>
                            <option value="1sec">1 Second</option>
                            <option value="1min">1 Minute</option>
                            <option value="5min">5 Minutes</option>
                            <option value="15min">15 Minutes</option>
                            <option value="30min">30 Minutes</option>
                            <option value="1hour">1 Hour</option>
                            <option value="1day">1 Day</option>
                          </select>
                        </div>
                      </div>
                    ) : col.columnType === 'tag' ? (
                      <div className="col-span-6 grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Bound Driver Tag</label>
                          <button
                            type="button"
                            onClick={() => {
                              setTagPickerTarget({ type: 'column', id: col.columnId });
                              setIsTagPickerOpen(true);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 hover:border-sky-500/60 rounded-lg px-2.5 py-1.5 text-left text-xs text-sky-400 font-mono truncate"
                          >
                            {col.tagId || 'Select Tag...'}
                          </button>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Aggregation</label>
                          <select
                            value={col.aggregation}
                            onChange={e => updateColumn(col.columnId, { aggregation: e.target.value as any })}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                          >
                            <option value="raw">Raw Point</option>
                            <option value="avg">Average</option>
                            <option value="min">Minimum</option>
                            <option value="max">Maximum</option>
                            <option value="sum">Sum</option>
                            <option value="delta">Delta (Rollover Safe)</option>
                            <option value="last">Last Sample</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Unit</label>
                            <input
                              type="text"
                              value={col.unitSuffix || ''}
                              onChange={e => updateColumn(col.columnId, { unitSuffix: e.target.value })}
                              placeholder="kW"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Decimals</label>
                            <input
                              type="number"
                              min={0}
                              max={6}
                              value={col.decimals ?? 2}
                              onChange={e => updateColumn(col.columnId, { decimals: Number(e.target.value) })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="col-span-6 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Math Formula (Safe Expression)</label>
                          <input
                            type="text"
                            value={col.formula || ''}
                            onChange={e => updateColumn(col.columnId, { formula: e.target.value })}
                            placeholder="e.g. col_1 * 1.732 * 415 / 1000"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Unit</label>
                            <input
                              type="text"
                              value={col.unitSuffix || ''}
                              onChange={e => updateColumn(col.columnId, { unitSuffix: e.target.value })}
                              placeholder="kW"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Decimals</label>
                            <input
                              type="number"
                              min={0}
                              max={6}
                              value={col.decimals ?? 2}
                              onChange={e => updateColumn(col.columnId, { decimals: Number(e.target.value) })}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer Aggregation & Delete */}
                    <div className="col-span-2 flex items-center space-x-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Footer Summary</label>
                        <select
                          value={col.footerAggregation || 'none'}
                          onChange={e => updateColumn(col.columnId, { footerAggregation: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                        >
                          <option value="none">None</option>
                          <option value="sum">Sum (Total)</option>
                          <option value="avg">Average</option>
                          <option value="min">Min</option>
                          <option value="max">Max</option>
                        </select>
                      </div>

                      {col.columnType !== 'timestamp' && (
                        <button
                          type="button"
                          onClick={() => deleteColumn(col.columnId)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-500 hover:text-red-400 transition-colors mt-3"
                          title="Remove column"
                        >
                          <i className="fas fa-trash text-xs" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Email & Local File Save Delivery ─────────────────────────── */}
        {activeTab === 'delivery' && (
          <div className="space-y-6">
            {/* Multi-Format Email Dispatch */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <i className="fas fa-envelope text-sky-400" />
                    <span>Automated Email Dispatch</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automatically attach generated reports and dispatch to operator & manager distribution lists
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={delivery.email.enabled}
                    onChange={e => setDelivery({
                      ...delivery,
                      email: { ...delivery.email, enabled: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
                </label>
              </div>

              {/* SMTP Server Configuration Quick Banner */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <i className="fas fa-server text-sm" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center space-x-2">
                      <span>SMTP Email Server Settings</span>
                      {smtpConfig?.host ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-normal border border-emerald-500/30">
                          Configured: {smtpConfig.host}:{smtpConfig.port}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-normal border border-amber-500/30">
                          Not Configured
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">Configure host, port, credentials, and test connection for report dispatch</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSmtpModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all flex items-center space-x-1.5"
                >
                  <i className="fas fa-cog text-xs" />
                  <span>Setup SMTP Server</span>
                </button>
              </div>

              {delivery.email.enabled && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Recipient Email Addresses (To) *</label>
                    <input
                      type="text"
                      value={delivery.email.recipients.join(', ')}
                      onChange={e => setDelivery({
                        ...delivery,
                        email: {
                          ...delivery.email,
                          recipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        }
                      })}
                      placeholder="e.g. plant-manager@company.com, shift-lead@company.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Carbon Copy (CC)</label>
                      <input
                        type="text"
                        value={(delivery.email.cc || []).join(', ')}
                        onChange={e => setDelivery({
                          ...delivery,
                          email: {
                            ...delivery.email,
                            cc: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          }
                        })}
                        placeholder="e.g. audit@company.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Attachment Formats *</label>
                      <div className="flex items-center space-x-4 pt-1">
                        {(['xlsx', 'pdf', 'csv', 'html'] as const).map(fmt => {
                          const isChecked = delivery.email.attachFormats.includes(fmt);
                          return (
                            <label key={fmt} className="flex items-center space-x-1.5 cursor-pointer text-xs text-slate-200">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  const next = e.target.checked
                                    ? [...delivery.email.attachFormats, fmt]
                                    : delivery.email.attachFormats.filter(f => f !== fmt);
                                  setDelivery({
                                    ...delivery,
                                    email: { ...delivery.email, attachFormats: next }
                                  });
                                }}
                                className="w-3.5 h-3.5 rounded cursor-pointer accent-sky-500"
                              />
                              <span className="uppercase font-semibold">{fmt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Email Subject Template</label>
                    <input
                      type="text"
                      value={delivery.email.subjectTemplate}
                      onChange={e => setDelivery({
                        ...delivery,
                        email: { ...delivery.email, subjectTemplate: e.target.value }
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Variables: &#123;&#123;reportTitle&#125;&#125;, &#123;&#123;periodStart&#125;&#125;, &#123;&#123;periodEnd&#125;&#125;, &#123;&#123;facility&#125;&#125;, or any &#123;&#123;Tag_Name&#125;&#125;</span>
                  </div>

                  {/* Email Body Template with Dynamic Tag Insertion */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">Email Body Template (HTML / Plain Text)</label>
                      <div className="flex items-center space-x-2">
                        {/* Insert Standard Variable Dropdown */}
                        <select
                          defaultValue=""
                          onChange={e => {
                            if (e.target.value) {
                              const val = e.target.value;
                              const currentBody = delivery.email.bodyTemplate || '';
                              setDelivery(prev => ({
                                ...prev,
                                email: {
                                  ...prev.email,
                                  bodyTemplate: currentBody ? `${currentBody} ${val}` : val
                                }
                              }));
                              e.target.value = '';
                            }
                          }}
                          className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-sky-500"
                        >
                          <option value="">+ Insert Variable...</option>
                          <option value="{{reportTitle}}">Report Title</option>
                          <option value="{{facility}}">Facility Name</option>
                          <option value="{{periodStart}}">Period Start</option>
                          <option value="{{periodEnd}}">Period End</option>
                          <option value="{{rowCount}}">Row Count</option>
                          <option value="{{generatedAt}}">Generated Timestamp</option>
                        </select>

                        {/* Insert SCADA / Asset Tag Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setTagPickerTarget({ type: 'body_tag', id: 'email_body' });
                            setIsTagPickerOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                        >
                          <i className="fas fa-tag text-[10px]" />
                          <span>+ Insert SCADA Tag</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={6}
                      value={delivery.email.bodyTemplate || ''}
                      onChange={e => setDelivery({
                        ...delivery,
                        email: { ...delivery.email, bodyTemplate: e.target.value }
                      })}
                      placeholder="Write your email message here. Use {{Tag_Name}} or {{variable}} for dynamic data substitution. Example:
This report is a batch report of {{Tag_Machine_name}} and batch number {{tag_batch_number}}.

Please find attached the official shift telemetry and quality audit report."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500 leading-relaxed"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Any <code>&#123;&#123;Tag_Name&#125;&#125;</code> will be automatically replaced with the real-time value from drivers, SQL storage, or asset telemetry.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Local File System Save Option */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <i className="fas fa-folder-open text-emerald-400" />
                    <span>Save to Local File System / Network Share</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automatically writes the generated report to a local folder or industrial NAS network share (UNC path)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={delivery.localSave.enabled}
                    onChange={e => setDelivery({
                      ...delivery,
                      localSave: { ...delivery.localSave, enabled: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {delivery.localSave.enabled && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Target Directory Path *</label>
                    <input
                      type="text"
                      value={delivery.localSave.directoryPath}
                      onChange={e => setDelivery({
                        ...delivery,
                        localSave: { ...delivery.localSave, directoryPath: e.target.value }
                      })}
                      placeholder="e.g. D:\SCADA_Reports\Daily\ or \\192.168.1.50\PlantShare\Reports"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Subdirectories will be created automatically if they do not exist.</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">File Formats to Save *</label>
                    <div className="flex items-center space-x-4 pt-1">
                      {(['xlsx', 'pdf', 'csv', 'html'] as const).map(fmt => {
                        const isChecked = delivery.localSave.formats.includes(fmt);
                        return (
                          <label key={fmt} className="flex items-center space-x-1.5 cursor-pointer text-xs text-slate-200">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const next = e.target.checked
                                  ? [...delivery.localSave.formats, fmt]
                                  : delivery.localSave.formats.filter(f => f !== fmt);
                                setDelivery({
                                  ...delivery,
                                  localSave: { ...delivery.localSave, formats: next }
                                });
                              }}
                              className="w-3.5 h-3.5 rounded cursor-pointer accent-emerald-500"
                            />
                            <span className="uppercase font-semibold">{fmt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 3: Schedule & Triggers ──────────────────────────────────────── */}
        {activeTab === 'schedule_trigger' && (
          <div className="space-y-6">
            {/* Scheduled 24/7 Execution */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <i className="fas fa-calendar-check text-sky-400" />
                    <span>Headless 24/7 Scheduled Execution</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Runs in server.ts independent of open browser tabs with a 30-second historian flush grace delay
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    onChange={e => setSchedule({ ...schedule, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
                </label>
              </div>

              {schedule.enabled && (
                <div className="space-y-4 animate-fade-in">
                  {/* Shift Quick Presets */}
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-business-time text-amber-400 text-xs" />
                      <span className="text-xs font-semibold text-slate-300">Industrial Shift Presets:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => applyShiftPreset('night')}
                        className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200"
                      >
                        Morning Handover (06:00)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyShiftPreset('day')}
                        className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200"
                      >
                        Afternoon Handover (14:00)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyShiftPreset('evening')}
                        className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200"
                      >
                        Night Handover (22:00)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Frequency</label>
                      <select
                        value={schedule.frequency}
                        onChange={e => setSchedule({ ...schedule, frequency: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      >
                        <option value="daily">Daily (At specific hour)</option>
                        <option value="weekly">Weekly (Specific day of week)</option>
                        <option value="monthly">Monthly (1st of month)</option>
                        <option value="interval">Interval (Every N minutes)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">Hour (0-23)</label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={schedule.hour ?? 6}
                          onChange={e => setSchedule({ ...schedule, hour: Number(e.target.value) })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">Minute (0-59)</label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={schedule.minute ?? 0}
                          onChange={e => setSchedule({ ...schedule, minute: Number(e.target.value) })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Lookback Query Window</label>
                      <input
                        type="number"
                        min={1}
                        max={8760}
                        value={schedule.lookbackHours ?? 24}
                        onChange={e => setSchedule({ ...schedule, lookbackHours: Number(e.target.value) })}
                        placeholder="24"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Event-Driven Triggers (Tag Edge & Alarm) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <i className="fas fa-bolt text-amber-400" />
                    <span>Event-Driven Trigger Execution</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generate reports instantly on batch completion pulses, analog threshold crossings, or critical alarms
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trigger.enabled}
                    onChange={e => setTrigger({ ...trigger, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                </label>
              </div>

              {trigger.enabled && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Trigger Type</label>
                      <select
                        value={trigger.type}
                        onChange={e => setTrigger({ ...trigger, type: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      >
                        <option value="tag_edge">Digital Bit Rising Edge (e.g. BATCH_COMPLETE = 1)</option>
                        <option value="tag_threshold">Analog Value Threshold (e.g. TEMP &gt; 85)</option>
                        <option value="alarm_event">Critical Alarm Triggered</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Trigger Tag</label>
                      <button
                        type="button"
                        onClick={() => {
                          setTagPickerTarget({ type: 'trigger' });
                          setIsTagPickerOpen(true);
                        }}
                        className="w-full bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-xl px-3 py-2 text-left text-xs text-amber-400 font-mono truncate"
                      >
                        {trigger.edgeTagId || trigger.thresholdTagId || 'Select Trigger Tag...'}
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Storm Cooldown (Minutes) *</label>
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={trigger.cooldownMinutes ?? 15}
                        onChange={e => setTrigger({ ...trigger, cooldownMinutes: Number(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tag Picker Modal */}
      <TagPickerModal
        isOpen={isTagPickerOpen}
        onClose={() => {
          setIsTagPickerOpen(false);
          setTagPickerTarget(null);
        }}
        onSelectTag={handleTagSelected}
      />

      {/* Direct SMTP Server Configuration Modal */}
      <EmailSettingsModal
        isOpen={isSmtpModalOpen}
        onClose={() => {
          setIsSmtpModalOpen(false);
          loadSmtpConfig();
        }}
      />
    </div>
  );
};
