import React, { useState } from 'react';
import { ReportJob, AppView } from '../types';
import { getStoredReportHtml } from '../utils/reportEngine';
import { ReportPreviewModal } from './ReportPreviewModal';

interface AiReportsTabProps {
  history: ReportJob[];
  onRefreshHistory: () => void;
  onDeleteJob: (jobId: string) => void;
  onNavigate?: (view: AppView) => void;
  onSelectPromptPreset?: (promptText: string) => void;
}

interface PresetItem {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
  description: string;
  prompt: string;
}

const REPORT_PRESETS: PresetItem[] = [
  {
    id: 'energy_peak',
    title: 'Plant Energy & Peak Demand',
    category: 'Energy Management',
    icon: 'fa-bolt',
    color: 'amber',
    description: 'Analyzes active power (kW), cumulative energy (kWh), peak load hours, and load duration curves.',
    prompt: 'Generate an energy and peak demand report for all main power meters over the last 24 hours with hourly averages, statistical comparison, and peak demand spikes.'
  },
  {
    id: 'thermal_hvac',
    title: 'HVAC & Chiller Thermal Audit',
    category: 'Thermal & Process',
    icon: 'fa-snowflake',
    color: 'sky',
    description: 'Audits supply/return temperatures, chilled water flow, delta T, and COP efficiency over time.',
    prompt: 'Generate a comprehensive HVAC and chiller performance report for the past 7 days with thermal delta T, temperature trends, and efficiency breakdown.'
  },
  {
    id: 'alarm_incident',
    title: '24-Hour Alarm & Trip Incident Log',
    category: 'Operational Safety',
    icon: 'fa-triangle-exclamation',
    color: 'rose',
    description: 'Summarizes all high-priority alarms, trip events, equipment downtime, and acknowledges.',
    prompt: 'Generate an operational incident and alarm history report for the last 24 hours including all trip faults, high alarms, and alarm rate statistics.'
  },
  {
    id: 'fdd_cbm',
    title: 'FDD Predictive Maintenance & CBM',
    category: 'Predictive Maintenance',
    icon: 'fa-shield-halved',
    color: 'indigo',
    description: 'Evaluates active and resolved asset degradation rules, cost waste impact, and root-cause recommendations.',
    prompt: 'Generate an FDD predictive maintenance and condition-based monitoring report including active fault rules, accumulated cost waste, and equipment health index.'
  }
];

export const AiReportsTab: React.FC<AiReportsTabProps> = ({
  history,
  onRefreshHistory,
  onDeleteJob,
  onNavigate,
  onSelectPromptPreset
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedJob, setSelectedJob] = useState<ReportJob | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const aiJobs = history.filter(j => j.type === 'ai_ondemand');

  const handleLaunchPreset = (prompt: string) => {
    if (onSelectPromptPreset) {
      onSelectPromptPreset(prompt);
    }
    if (onNavigate) {
      onNavigate(AppView.AI_ASSISTANT);
    }
  };

  const handlePreviewReport = async (job: ReportJob) => {
    setIsLoadingPreview(true);
    setSelectedJob(job);
    const html = await getStoredReportHtml(job.jobId);
    setPreviewHtml(html);
    setIsLoadingPreview(false);
    if (html) {
      setIsPreviewOpen(true);
    } else {
      alert('Report HTML is not available in local storage. Please generate a fresh report.');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* ── Top Hero / Generator Box ────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/70 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <i className="fas fa-wand-magic-sparkles text-indigo-400 text-lg" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI On-Demand Industrial Reporter</h2>
              <p className="text-xs text-slate-400">
                Ask the AI Assistant in plain language. The AI reasons over historian trends, alarms, and FDD fault logs to build interactive HTML reports.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(AppView.AI_ASSISTANT)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md flex items-center space-x-2 shrink-0 self-start sm:self-auto"
            >
              <i className="fas fa-robot" />
              <span>Open AI Assistant</span>
            </button>
          )}
        </div>

        {/* Custom Prompt Box */}
        <div className="flex items-center space-x-2 bg-slate-950/70 border border-slate-800 rounded-xl p-2 focus-within:border-indigo-500/60 transition-colors">
          <i className="fas fa-comment-dots text-slate-500 ml-2" />
          <input
            type="text"
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && customPrompt.trim()) {
                handleLaunchPreset(customPrompt);
              }
            }}
            placeholder="e.g. Give me a weekly energy analysis for Chiller-1 and AHU-02 with hourly averages..."
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none px-2"
          />
          <button
            type="button"
            disabled={!customPrompt.trim()}
            onClick={() => handleLaunchPreset(customPrompt)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-all shrink-0"
          >
            Generate
          </button>
        </div>
      </div>

      {/* ── Quick-Start Presets Grid ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
          <i className="fas fa-bolt-lightning text-amber-400" />
          <span>Quick-Start Report Presets</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {REPORT_PRESETS.map(preset => (
            <div
              key={preset.id}
              onClick={() => handleLaunchPreset(preset.prompt)}
              className="group bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all hover:shadow-lg cursor-pointer flex flex-col justify-between space-y-3 hover:-translate-y-0.5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">{preset.category}</span>
                  <div className={`w-6 h-6 rounded-lg bg-${preset.color}-500/20 border border-${preset.color}-500/30 flex items-center justify-center`}>
                    <i className={`fas ${preset.icon} text-${preset.color}-400 text-xs`} />
                  </div>
                </div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition-colors">
                  {preset.title}
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                  {preset.description}
                </p>
              </div>

              <div className="flex items-center text-[11px] font-semibold text-indigo-400 group-hover:text-indigo-300 space-x-1 pt-1 border-t border-slate-800/60">
                <span>Launch Report</span>
                <i className="fas fa-arrow-right text-[10px] transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent AI Reports Grid ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
            <i className="fas fa-clock-rotate-left text-sky-400" />
            <span>Generated AI Reports ({aiJobs.length})</span>
          </h3>
          {aiJobs.length > 0 && (
            <button
              type="button"
              onClick={onRefreshHistory}
              className="text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              <i className="fas fa-rotate text-xs mr-1" />Refresh
            </button>
          )}
        </div>

        {aiJobs.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-400 text-xl">
              <i className="fas fa-file-chart-column" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No AI Reports Generated Yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Select one of the quick presets above or ask the AI Assistant in chat to generate your first on-demand report.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {aiJobs.map(job => (
              <div
                key={job.jobId}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <i className="fas fa-file-lines text-emerald-400 text-xs" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 truncate">{job.title}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-400 shrink-0">
                      Ready
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Period:</span>
                      <span>{new Date(job.fromMs).toLocaleDateString()} ➔ {new Date(job.toMs).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Generated:</span>
                      <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                    </div>
                    {job.rowCount !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Data Points:</span>
                        <span className="font-semibold text-slate-300">{job.rowCount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handlePreviewReport(job)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 transition-all flex items-center space-x-1"
                  >
                    <i className="fas fa-eye text-xs" />
                    <span>Preview & Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteJob(job.jobId)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Delete report record"
                  >
                    <i className="fas fa-trash-can text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Report Preview Modal ──────────────────────────────────────────────── */}
      <ReportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedJob(null);
          setPreviewHtml(null);
        }}
        job={selectedJob}
        htmlContent={previewHtml}
      />
    </div>
  );
};
