import React, { useState, useEffect, useCallback } from 'react';
import { ReportJob, AppView } from '../types';
import {
  getReportHistory,
  deleteReportJob,
  getStoredReportHtml,
  downloadHtmlReport
} from '../utils/reportEngine';
import { TemplateReportManager } from './TemplateReportManager';
import { AiReportsTab } from './AiReportsTab';
import { ReportPreviewModal } from './ReportPreviewModal';
import { getUnreadScheduledCount, markScheduledReportsRead } from '../utils/reportScheduler';

interface Props {
  onBack?: () => void;
  onNavigate?: (view: AppView) => void;
  onSelectPromptPreset?: (promptText: string) => void;
}

type ReportingTab = 'template' | 'ai_reports' | 'history';

export const ReportingView: React.FC<Props> = ({ onBack, onNavigate, onSelectPromptPreset }) => {
  const [activeTab, setActiveTab] = useState<ReportingTab>('template');
  const [history, setHistory] = useState<ReportJob[]>([]);
  const [unreadScheduledCount, setUnreadScheduledCount] = useState<number>(0);

  // In-app preview modal state
  const [previewJob, setPreviewJob] = useState<ReportJob | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  const refreshHistory = useCallback(() => {
    const list = getReportHistory();
    setHistory(list);
    setUnreadScheduledCount(getUnreadScheduledCount());
  }, []);

  useEffect(() => {
    refreshHistory();

    const handleScheduledEvent = () => {
      refreshHistory();
    };

    window.addEventListener('tasc_scheduled_report_event', handleScheduledEvent);
    return () => window.removeEventListener('tasc_scheduled_report_event', handleScheduledEvent);
  }, [refreshHistory]);

  const handleTabChange = (tab: ReportingTab) => {
    setActiveTab(tab);
    if (tab === 'history') {
      markScheduledReportsRead();
      setUnreadScheduledCount(0);
    }
  };

  const handleViewReport = async (job: ReportJob) => {
    setPreviewJob(job);
    const html = await getStoredReportHtml(job.jobId);
    if (html) {
      setPreviewHtml(html);
      setIsPreviewModalOpen(true);
    } else {
      alert('Report HTML is not available in local storage. Please regenerate the report.');
    }
  };

  const handleDownloadReport = async (job: ReportJob) => {
    const html = await getStoredReportHtml(job.jobId);
    if (html) {
      downloadHtmlReport(html, job.title);
    } else {
      alert('Report file not available. Please regenerate the report.');
    }
  };

  const handleDeleteHistory = (jobId: string) => {
    deleteReportJob(jobId);
    setHistory(prev => prev.filter(j => j.jobId !== jobId));
  };

  const formatDuration = (fromMs: number, toMs: number) => {
    const ms = toMs - fromMs;
    const hours = Math.round(ms / 3600000);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d`;
    return `${Math.round(days / 30)}mo`;
  };

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
              <h2 className="text-sm font-bold text-slate-100">Reporting Studio</h2>
              <p className="text-xs text-slate-500 leading-none">Template Ingestion, Automated Schedules & AI Reports</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex border-b border-slate-700/60 px-4 bg-slate-900/60 space-x-1 overflow-x-auto">
        {([
          { id: 'template', label: 'Template Reports', icon: 'fa-file-excel' },
          { id: 'ai_reports', label: 'AI On-Demand Reports', icon: 'fa-wand-magic-sparkles' },
          { id: 'history', label: 'Report History', icon: 'fa-clock-rotate-left' }
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
            {tab.id === 'history' && unreadScheduledCount === 0 && history.length > 0 && (
              <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {history.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Tab 1: Template Reports */}
        {activeTab === 'template' && (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <TemplateReportManager />
          </div>
        )}

        {/* Tab 2: AI Reports */}
        {activeTab === 'ai_reports' && (
          <AiReportsTab
            history={history}
            onRefreshHistory={refreshHistory}
            onDeleteJob={handleDeleteHistory}
            onNavigate={onNavigate}
            onSelectPromptPreset={onSelectPromptPreset}
          />
        )}

        {/* Tab 3: Report History */}
        {activeTab === 'history' && (
          <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Audit History ({history.length})
                </h3>
                <p className="text-xs text-slate-500">Record of all manual, AI-generated, and automated scheduled reports</p>
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
                  Reports generated via templates, background schedules, or the AI Assistant will appear in this audit log.
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
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          job.type === 'ai_ondemand'
                            ? 'bg-indigo-500/15 border-indigo-500/30'
                            : 'bg-emerald-500/15 border-emerald-500/30'
                        }`}
                      >
                        <i
                          className={`fas ${
                            job.type === 'ai_ondemand'
                              ? 'fa-robot text-indigo-400'
                              : 'fa-file-excel text-emerald-400'
                          } text-sm`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <p className="font-bold text-slate-200 text-sm truncate">{job.title}</p>
                          {job.isScheduled && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950 border border-sky-800 text-sky-400 flex items-center space-x-1">
                              <i className="fas fa-clock text-[9px]" />
                              <span>Scheduled Run</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-0.5">
                          <span>{job.type === 'ai_ondemand' ? 'AI Report' : 'Template Report'}</span>
                          <span>·</span>
                          <span>{formatDuration(job.fromMs, job.toMs)} span</span>
                          {job.rowCount !== undefined && (
                            <>
                              <span>·</span>
                              <span className="text-slate-300 font-medium">{job.rowCount.toLocaleString()} data points</span>
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
                      {job.status === 'ready' && job.type === 'ai_ondemand' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleViewReport(job)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 transition-all flex items-center space-x-1"
                          >
                            <i className="fas fa-eye text-xs" />
                            <span>Preview & Print</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadReport(job)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center space-x-1"
                          >
                            <i className="fas fa-download text-xs" />
                            <span>HTML</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteHistory(job.jobId)}
                        className="p-1.5 w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors flex items-center justify-center"
                        title="Delete log record"
                      >
                        <i className="fas fa-trash text-xs" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear all report history? This cannot be undone.')) {
                      history.forEach(j => deleteReportJob(j.jobId));
                      setHistory([]);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors pt-2 flex items-center space-x-1"
                >
                  <i className="fas fa-trash-can mr-1" />
                  <span>Clear All Audit Records</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
