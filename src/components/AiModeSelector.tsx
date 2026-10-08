import React from 'react';
import { Zap, Bot, Activity, Sparkles } from 'lucide-react';

export type AiOperatingMode = 'AUTO' | 'ASSISTANT' | 'JEV_DECISION';

export interface RcaDecisionData {
  primary_root_cause: string;
  initiating_event: string;
  severity_badge: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  immediate_rec_safety_action: string;
  subsystem_target: string;
  secondary_damage_risk: string;
  confidence: number;
  latencyMs: number;
  backend?: string;
  probabilities?: Record<string, Record<string, number>>;
}

export interface TriageDecisionData {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';
  target_subsystem: string;
  immediate_action: string;
  operator_notification: string;
  confidence: number;
  latencyMs: number;
  backend?: string;
  probabilities?: Record<string, Record<string, number>>;
}

interface AiModeSelectorProps {
  currentMode: AiOperatingMode;
  onModeChange: (mode: AiOperatingMode) => void;
  isEvaluating?: boolean;
}

export const AiModeSelector: React.FC<AiModeSelectorProps> = ({
  currentMode,
  onModeChange,
  isEvaluating = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md text-slate-100 shadow-md">
      {/* Left: Mode Title & Live Status Indicator */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Activity size={14} className="text-sky-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Industrial AI Mode:
          </span>
        </div>

        <div className="hidden sm:flex items-center text-[11px] text-slate-400 truncate">
          {currentMode === 'AUTO' ? (
            <span className="flex items-center gap-1 text-slate-300">
              <span className="text-sky-400 font-semibold flex items-center gap-1">
                <Sparkles size={11} className="text-sky-300" />
                Auto-Routing:
              </span>
              <span className="text-slate-400 truncate">Plant trips & alarms automatically execute Jev (&lt;30ms); general questions route to Copilot.</span>
            </span>
          ) : currentMode === 'ASSISTANT' ? (
            <span className="text-slate-300">
              <strong className="text-blue-400">Conversational:</strong> Standard LLM streaming chat for shift logs & SOPs.
            </span>
          ) : (
            <span className="text-slate-300">
              <strong className="text-amber-400">Parallel Decision:</strong> Deterministic sub-30ms single forward pass for root cause & interlocks.
            </span>
          )}
        </div>
      </div>

      {/* Right: 3-Way Mode Switcher: AUTO | ASSISTANT | JEV */}
      <div className="flex items-center gap-1 p-0.5 bg-slate-950/80 rounded-lg border border-slate-800 shrink-0">
        {/* AUTO Button (Default / Recommended) */}
        <label
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer text-xs font-medium transition-all ${
            currentMode === 'AUTO'
              ? 'bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-600 text-white shadow-sm font-semibold ring-1 ring-sky-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Auto-Detect: Automatically routes equipment trips/alarms to Jev (<30ms) and engineering inquiries to AI Copilot"
        >
          <input
            type="radio"
            name="ai_mode"
            value="AUTO"
            checked={currentMode === 'AUTO'}
            onChange={() => onModeChange('AUTO')}
            className="hidden"
          />
          <Sparkles size={12} className={currentMode === 'AUTO' ? 'text-sky-200 animate-spin-slow' : 'text-slate-400'} />
          <span>AUTO</span>
          <span className="px-1 py-0.2 text-[8px] bg-black/40 text-sky-200 rounded font-mono font-bold tracking-tight">
            Smart
          </span>
        </label>

        {/* AI Assistant Button */}
        <label
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer text-xs font-medium transition-all ${
            currentMode === 'ASSISTANT'
              ? 'bg-blue-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Conversational Copilot: Standard streaming chat for SOPs, shift logs, and engineering questions"
        >
          <input
            type="radio"
            name="ai_mode"
            value="ASSISTANT"
            checked={currentMode === 'ASSISTANT'}
            onChange={() => onModeChange('ASSISTANT')}
            className="hidden"
          />
          <Bot size={12} />
          <span>AI Assistant</span>
        </label>

        {/* Jev Mode Button */}
        <label
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md cursor-pointer text-xs font-medium transition-all ${
            currentMode === 'JEV_DECISION'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm font-semibold ring-1 ring-amber-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Dedicated Jev Mode: Deterministic sub-35ms discrete choice forward pass for root cause and interlocks"
        >
          <input
            type="radio"
            name="ai_mode"
            value="JEV_DECISION"
            checked={currentMode === 'JEV_DECISION'}
            onChange={() => onModeChange('JEV_DECISION')}
            className="hidden"
          />
          <Zap size={12} className={currentMode === 'JEV_DECISION' ? 'text-amber-200' : 'text-amber-400'} />
          <span>Jev Mode</span>
          <span className="px-1 py-0.2 text-[8px] bg-black/40 text-amber-200 rounded font-mono font-bold tracking-tight">
            &lt;30ms
          </span>
        </label>
      </div>
    </div>
  );
};
