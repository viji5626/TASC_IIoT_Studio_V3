import React, { useState, useEffect, useCallback } from 'react';
import { ReportJob, AppView, CustomReportDefinition } from '../types';
import {
  getReportHistory,
  deleteReportJob,
  getStoredReportHtml,
  downloadHtmlReport
} from '../utils/reportEngine';
import { TemplateReportManager } from './TemplateReportManager';
import { AiReportsTab } from './AiReportsTab';
import { ReportPreviewModal } from './ReportPreviewModal';
import { ReportDesignerStudio } from './reporting/ReportDesignerStudio';
import { EmailSettingsModal } from './reporting/EmailSettingsModal';
import { getUnreadScheduledCount, markScheduledReportsRead } from '../utils/reportScheduler';

interface Props {
  onBack?: () => void;
  onNavigate?: (view: AppView) => void;
  onSelectPromptPreset?: (promptText: string) => void;
}

type ReportingTab = 'custom' | 'template' | 'ai_reports' | 'history';

export const ReportingView: React.FC<Props> = ({ onBack, onNavigate, onSelectPromptPreset }) => {
  const [activeTab, setActiveTab] = useState<ReportingTab>('custom');
  const [history, setHistory] = useState<ReportJob[]>([]);
  const [customConfigs, setCustomConfigs] = useState<CustomReportDefinition[]>([]);
  const [unreadScheduledCount, setUnreadScheduledCount] = useState<number>(0);

  // Designer Studio State
  const [isDesigning, setIsDesigning] = useState(false);
  const [editingReport, setEditingReport] = useState<CustomReportDefinition | null>(null);

  // Email Settings Modal
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);

  // In-app preview modal state
  const [previewJob, setPreviewJob] = useState<ReportJob | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  // Generate on-demand modal/form state
  const [generatingReport, setGeneratingReport] = useState<CustomReportDefinition | null>(null);
  const [genFromDate, setGenFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 16);
  });
  const [genToDate, setGenToDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatusMsg, setGenStatusMsg] = useState<string | null>(null);

  const loadCustomConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/configs');
      const data = await res.json();
      if (data.success && Array.isArray(data.configs)) {
        setCustomConfigs(data.configs);
      }
    } catch (err: any) {
      console.error('Failed to load custom report configs:', err.message);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/history');
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setHistory(data.history);
      } else {
        setHistory(getReportHistory());
      }
    } catch {
      setHistory(getReportHistory());
    }
    setUnreadScheduledCount(getUnreadScheduledCount());
  }, []);

  useEffect(() => {
    loadCustomConfigs();
    refreshHistory();

    const handleScheduledEvent = () => {
      refreshHistory();
    };

    window.addEventListener('tasc_scheduled_report_event', handleScheduledEvent);
    return () => window.removeEventListener('tasc_scheduled_report_event', handleScheduledEvent);
  }, [loadCustomConfigs, refreshHistory]);

  const handleTabChange = (tab: ReportingTab) => {
    setActiveTab(tab);
    if (tab === 'history') {
      markScheduledReportsRead();
      setUnreadScheduledCount(0);
      refreshHistory();
    }
  };

  const handleSaveCustomReport = async (report: CustomReportDefinition) => {
    try {
      const res = await fetch('/api/reports/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      const data = await res.json();
      if (data.success) {
        setIsDesigning(false);
        setEditingReport(null);
        loadCustomConfigs();
      } else {
        alert(`Failed to save report: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error saving report: ${err.message}`);
    }
  };

  const handleDeleteCustomReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report definition?')) return;
    try {
      await fetch(`/api/reports/configs/${reportId}`, { method: 'DELETE' });
      loadCustomConfigs();
    } catch (err: any) {
      alert(`Error deleting report: ${err.message}`);
    }
  };

  const handleTriggerGenerate = async () => {
    if (!generatingReport) return;
    setIsGenerating(true);
    setGenStatusMsg(null);
    try {
      const fromMs = new Date(genFromDate).getTime();
      const toMs = new Date(genToDate).getTime();

      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: generatingReport.reportId,
          fromMs,
          toMs
        })
      });

      const data = await res.json();
      if (data.success) {
        setGenStatusMsg('Report generated successfully and added to Audit History.');
        refreshHistory();
        setTimeout(() => {
          setGeneratingReport(null);
          setGenStatusMsg(null);
        }, 1500);
      } else {
        setGenStatusMsg(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setGenStatusMsg(`Generation failed: ${err.message}`);
    }
    setIsGenerating(false);
  };

  const handleViewReport = async (job: ReportJob) => {
    setPreviewJob(job);
    const html = job.htmlContent || (await getStoredReportHtml(job.jobId));
    if (html) {
      setPreviewHtml(html);
      setIsPreviewModalOpen(true);
    } else {
      alert('Report HTML preview is not available for this job.');
    }
  };

  const formatDuration = (fromMs: number, toMs: number) => {
    const ms = toMs - fromMs;
    const hours = Math.round(ms / 3600000);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d`;
    return `${Math.round(days / 30)}mo`;
  };

  // If in designer mode, render full-screen ReportDesignerStudio
  if (isDesigning) {
    return (
      <ReportDesignerStudio
        initialReport={editingReport}
        onSave={handleSaveCustomReport}
        onCancel={() => {
          setIsDesigning(false);
          setEditingReport(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <i className="fas fa-chevron-left text-xs" />
            </button>
          )}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-600/30 border border-sky-500/40 flex items-center justify-center">
              <i className="fas fa-chart-bar text-sky-400 text-sm" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Reporting Studio Pro</h2>
              <p className="text-xs text-slate-500 leading-none">Visual Pagemaker, Excel Templates, 24/7 Triggers & Email Dispatch</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsSmtpModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-1.5"
            title="Configure SMTP Email Server"
          >
            <i className="fas fa-envelope text-sky-400 text-xs" />
            <span className="hidden sm:inline">SMTP Settings</span>
          </button>
        </div>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex border-b border-slate-700/60 px-4 bg-slate-900/60 space-x-1 overflow-x-auto">
        {([
          { id: 'custom', label: 'Custom Reports (Pagemaker)', icon: 'fa-file-signature' },
          { id: 'template', label: 'Excel Templates', icon: 'fa-file-excel' },
          { id: 'ai_reports', label: 'AI On-Demand Reports', icon: 'fa-wand-magic-sparkles' },
          { id: 'history', label: 'Audit History', icon: 'fa-clock-rotate-left' }
        ] as const).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className={`fas ${tab.icon}`} />
            <span>{tab.label}</span>
            {tab.id === 'history' && unreadScheduledCount > 0 && (
              <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
                {unreadScheduledCount} NEW
              </span>
            )}
            {tab.id === 'custom' && customConfigs.length > 0 && (
              <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {customConfigs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Tab 1: Custom Reports (White Page Pagemaker) */}
        {activeTab === 'custom' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
            {/* Top Action Banner */}
            <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <i className="fas fa-wand-magic-sparkles text-sky-400" />
                  <span>Visual Report Designer ("Pagemaker")</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Build custom industrial reports from scratch. Add date/time columns, bind SCADA tags, create safe math formulas, configure top-level KPI cards, and automate email & local disk saving.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingReport(null);
                  setIsDesigning(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-2 self-start sm:self-center shrink-0"
              >
                <i className="fas fa-plus" />
                <span>Create Report from Scratch</span>
              </button>
            </div>

            {/* Custom Reports List */}
            {customConfigs.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Configured Custom Reports ({customConfigs.length})
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {customConfigs.map(cfg => {
                    const isScheduled = cfg.schedule?.enabled;
                    const isTriggered = cfg.trigger?.enabled;
                    const isEmailEnabled = cfg.delivery?.email?.enabled;
                    const isLocalSaveEnabled = cfg.delivery?.localSave?.enabled;

                    return (
                      <div
                        key={cfg.reportId}
                        className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                            <i className="fas fa-file-signature text-sky-400 text-sm" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <p className="font-bold text-slate-200 text-sm truncate">{cfg.reportName}</p>
                              {isScheduled && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center space-x-1">
                                  <i className="fas fa-clock text-[9px]" />
                                  <span>{cfg.schedule?.frequency.toUpperCase()} @ {String(cfg.schedule?.hour || 0).padStart(2, '0')}:{String(cfg.schedule?.minute || 0).padStart(2, '0')}</span>
                                </span>
                              )}
                              {isTriggered && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 border border-amber-800 text-amber-400 flex items-center space-x-1">
                                  <i className="fas fa-bolt text-[9px]" />
                                  <span>TRIGGERED</span>
                                </span>
                              )}
                              {isEmailEnabled && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950 border border-sky-800 text-sky-400 flex items-center space-x-1">
                                  <i className="fas fa-envelope text-[9px]" />
                                  <span>EMAIL</span>
                                </span>
                              )}
                              {isLocalSaveEnabled && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center space-x-1">
                                  <i className="fas fa-floppy-disk text-[9px]" />
                                  <span>LOCAL DISK</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {cfg.columns.length} columns ({cfg.columns.filter(c => c.columnType === 'tag').length} tags, {cfg.columns.filter(c => c.columnType === 'computed').length} formulas) · {cfg.kpis?.length || 0} KPI cards · {cfg.defaultResolution}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReport(cfg);
                              setIsDesigning(true);
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                          >
                            <i className="fas fa-pen-to-square mr-1 text-slate-400" />Configure
                          </button>
                          <button
                            type="button"
                            onClick={() => setGeneratingReport(cfg)}
                            className="text-xs px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors shadow-sm"
                          >
                            <i className="fas fa-play mr-1" />Generate Now
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomReport(cfg.reportId)}
                            className="p-1.5 w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors flex items-center justify-center"
                            title="Delete report"
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
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto text-sky-400">
                  <i className="fas fa-file-signature text-xl" />
                </div>
                <p className="text-sm font-semibold text-slate-200">No Custom Reports Configured Yet</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click the button below to design your first industrial report with live SCADA tag bindings, time-series intervals, and automated dispatch.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingReport(null);
                    setIsDesigning(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all shadow-md inline-flex items-center space-x-2"
                >
                  <i className="fas fa-plus" />
                  <span>Create First Custom Report</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Template Reports */}
        {activeTab === 'template' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <TemplateReportManager />
          </div>
        )}

        {/* Tab 3: AI Reports */}
        {activeTab === 'ai_reports' && (
          <AiReportsTab
            history={history}
            onRefreshHistory={refreshHistory}
            onDeleteJob={jobId => deleteReportJob(jobId)}
            onNavigate={onNavigate}
            onSelectPromptPreset={onSelectPromptPreset}
          />
        )}

        {/* Tab 4: Report History */}
        {activeTab === 'history' && (
          <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Audit History & Delivery Log ({history.length})
                </h3>
                <p className="text-xs text-slate-500">Execution record for manual, scheduled, and triggered reports with email and disk delivery status</p>
              </div>
              <button
                type="button"
                onClick={refreshHistory}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center space-x-1.5"
              >
                <i className="fas fa-rotate-right text-xs" />
                <span>Refresh Log</span>
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-2">
                <i className="fas fa-file-circle-xmark text-3xl text-slate-600 mb-2 block" />
                <p className="text-sm font-semibold text-slate-300">No Report History Recorded</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Reports generated via Custom Pagemaker, Excel Templates, or AI will appear in this log.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(job => (
                  <div
                    key={job.jobId}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          job.type === 'custom'
                            ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                            : job.type === 'ai_ondemand'
                            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        <i
                          className={`fas ${
                            job.type === 'custom'
                              ? 'fa-file-signature'
                              : job.type === 'ai_ondemand'
                              ? 'fa-robot'
                              : 'fa-file-excel'
                          } text-sm`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <p className="font-bold text-slate-200 text-sm truncate">{job.title}</p>
                          {job.isScheduled && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center space-x-1">
                              <i className="fas fa-clock text-[9px]" />
                              <span>SCHEDULED</span>
                            </span>
                          )}
                          {job.emailStatus === 'sent' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950 border border-sky-800 text-sky-400 flex items-center space-x-1" title="Email dispatched successfully">
                              <i className="fas fa-check text-[9px]" />
                              <span>EMAIL SENT</span>
                            </span>
                          )}
                          {job.emailStatus === 'failed' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950 border border-red-800 text-red-400 flex items-center space-x-1" title={job.emailError}>
                              <i className="fas fa-triangle-exclamation text-[9px]" />
                              <span>EMAIL FAILED</span>
                            </span>
                          )}
                          {job.localSaveStatus === 'saved' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center space-x-1" title={`Saved to disk: ${job.localSavePaths?.join(', ')}`}>
                              <i className="fas fa-floppy-disk text-[9px]" />
                              <span>DISK SAVED</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-0.5">
                          <span>{job.type === 'custom' ? 'Custom Pagemaker' : job.type === 'ai_ondemand' ? 'AI Report' : 'Template Report'}</span>
                          <span>·</span>
                          <span>{formatDuration(job.fromMs, job.toMs)} span</span>
                          {job.rowCount !== undefined && (
                            <>
                              <span>·</span>
                              <span className="text-slate-300 font-medium">{job.rowCount.toLocaleString()} rows</span>
                            </>
                          )}
                          {job.completedAt && (
                            <>
                              <span>·</span>
                              <span className="text-slate-500">{new Date(job.completedAt).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                        {job.status === 'error' && (
                          <p className="text-xs text-red-400 mt-1">{job.errorMessage}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      {job.status === 'ready' && (
                        <div className="flex items-center space-x-1.5">
                          {/* Direct Download buttons */}
                          <a
                            href={`/api/reports/download/${job.jobId}?format=xlsx`}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950/40 text-emerald-400 border border-slate-700 transition-colors flex items-center space-x-1"
                            title="Download Excel Workbook (.xlsx)"
                          >
                            <i className="fas fa-file-excel text-xs" />
                            <span>XLSX</span>
                          </a>

                          <a
                            href={`/api/reports/download/${job.jobId}?format=pdf`}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-red-400 border border-slate-700 transition-colors flex items-center space-x-1"
                            title="Download Vector PDF (.pdf)"
                          >
                            <i className="fas fa-file-pdf text-xs" />
                            <span>PDF</span>
                          </a>

                          <a
                            href={`/api/reports/download/${job.jobId}?format=csv`}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center space-x-1"
                            title="Download CSV (.csv)"
                          >
                            <i className="fas fa-file-csv text-xs" />
                            <span>CSV</span>
                          </a>

                          {job.htmlContent && (
                            <button
                              type="button"
                              onClick={() => handleViewReport(job)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 transition-all flex items-center space-x-1"
                            >
                              <i className="fas fa-eye text-xs" />
                              <span>View</span>
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          deleteReportJob(job.jobId);
                          setHistory(prev => prev.filter(j => j.jobId !== job.jobId));
                        }}
                        className="p-1.5 w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors flex items-center justify-center"
                        title="Delete log record"
                      >
                        <i className="fas fa-trash text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate On-Demand Modal */}
      {generatingReport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <i className="fas fa-play text-sky-400" />
                <span>Generate Report On-Demand</span>
              </h3>
              <button
                type="button"
                onClick={() => setGeneratingReport(null)}
                className="text-slate-400 hover:text-white"
              >
                <i className="fas fa-xmark text-sm" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 font-semibold">{generatingReport.reportName}</p>
              <div>
                <label className="text-xs text-slate-400 block mb-1">From Date & Time</label>
                <input
                  type="datetime-local"
                  value={genFromDate}
                  onChange={e => setGenFromDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">To Date & Time</label>
                <input
                  type="datetime-local"
                  value={genToDate}
                  onChange={e => setGenToDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              {genStatusMsg && (
                <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs">
                  {genStatusMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setGeneratingReport(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerGenerate}
                disabled={isGenerating}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isGenerating && <i className="fas fa-circle-notch fa-spin text-xs" />}
                <span>Generate Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global SMTP Email Settings Modal */}
      <EmailSettingsModal
        isOpen={isSmtpModalOpen}
        onClose={() => setIsSmtpModalOpen(false)}
      />

      {/* In-App Report Preview Modal */}
      <ReportPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewJob(null);
          setPreviewHtml(null);
        }}
        job={previewJob}
        htmlContent={previewHtml}
      />
    </div>
  );
};
