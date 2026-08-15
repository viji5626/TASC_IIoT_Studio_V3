import React from 'react';
import { AppState, ActiveAlarm } from '../types';
import { AiAssistantView } from './AiAssistantView';
import { AiErrorBoundary } from './AiErrorBoundary';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  latestValues: Record<string, { val: any; time: string; timestampMs?: number; quality?: string }>;
  appState: AppState;
  activeAlarms: ActiveAlarm[];
}

export const AiChatDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  latestValues,
  appState,
  activeAlarms
}) => {
  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[100] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-in Drawer Container */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[420px] md:w-[460px] bg-slate-950 border-l border-slate-800 z-[110] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs shadow-md">
              <i className="fas fa-wand-magic-sparkles"></i>
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">AI Copilot Sidepanel</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close Drawer"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
          >
            <i className="fas fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isOpen && (
            <AiErrorBoundary>
              <AiAssistantView
                latestValues={latestValues}
                appState={appState}
                activeAlarms={activeAlarms}
                initialTab="chat"
              />
            </AiErrorBoundary>
          )}
        </div>
      </div>
    </>
  );
};
