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
  onOpenFullAssistant?: () => void;
}

export const AiChatDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  latestValues,
  appState,
  activeAlarms,
  onOpenFullAssistant
}) => {
  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[100] transition-opacity cursor-pointer"
          onClick={onClose}
        />
      )}

      {/* Slide-in Drawer Container */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[420px] md:w-[460px] bg-slate-950 border-l border-slate-800 z-[110] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isOpen && (
            <AiErrorBoundary>
              <AiAssistantView
                latestValues={latestValues}
                appState={appState}
                activeAlarms={activeAlarms}
                initialTab="chat"
                isDrawer={true}
                onClose={onClose}
                onOpenFullAssistant={onOpenFullAssistant}
              />
            </AiErrorBoundary>
          )}
        </div>
      </div>
    </>
  );
};
