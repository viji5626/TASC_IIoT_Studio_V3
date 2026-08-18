import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppView } from '../types';

export interface CoachMarkStep {
  id: string;
  targetSelector: string;
  title: string;
  category: string;
  badgeColor: string;
  icon: string;
  description: string;
  keyPoints?: string[];
  preferredPlacement?: 'bottom' | 'top' | 'left' | 'right' | 'auto';
  targetView?: AppView;
  specialAction?: 'fdd' | 'alarms' | 'historian' | 'manual';
  actionLabel?: string;
}

export const COACH_MARK_STEPS: CoachMarkStep[] = [
  {
    id: 'sidebar_menu',
    targetSelector: '[data-tour="sidebar-btn"]',
    title: 'Main Navigation & Settings Menu',
    category: 'Navigation',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    icon: 'fa-bars',
    description: 'Access all system modules from the slide-out menu: MQTT Broker settings, Driver Connections, Tag Managers, OPC UA Browser, System Backups, and App Settings.',
    keyPoints: [
      'Switch between screens and dashboard configurations',
      'Manage user roles (Admin vs Operator Client)'
    ],
    preferredPlacement: 'bottom'
  },
  {
    id: 'driver_connections',
    targetSelector: '[data-tour="drivers-pill"]',
    title: 'Live Driver & MQTT Connections',
    category: 'Hardware Communication',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    icon: 'fa-network-wired',
    description: 'Live communication status pill showing real-time connectivity to Modbus TCP/RTU PLCs, OPC UA servers, and MQTT message brokers with multi-color status dots.',
    keyPoints: [
      'Click to view individual driver health and latency',
      'Quick switch between live and simulated telemetry'
    ],
    preferredPlacement: 'bottom'
  },
  {
    id: 'alarm_center',
    targetSelector: '[data-tour="alarms-btn"]',
    title: 'Real-Time Alarms & Safety Trips',
    category: 'Safety & Alerts',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    icon: 'fa-bell',
    description: 'Instant visual pulsating alerts and audible sirens whenever sensor parameters exceed critical safety thresholds or equipment trip tags activate.',
    keyPoints: [
      'Displays total active real-time alarm count',
      'One-click operator acknowledgment with audit logging'
    ],
    preferredPlacement: 'bottom',
    specialAction: 'alarms',
    actionLabel: 'Open Alarms'
  },
  {
    id: 'historian_window',
    targetSelector: '[data-tour="historian-btn"]',
    title: 'Alarm Historian & Audit Log',
    category: 'Historical Logging',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    icon: 'fa-history',
    description: 'Persistent FIFO alarm lifecycle historian stored directly in browser IndexedDB. Tracks exact trigger timestamps, trip duration, and operator acknowledgments.',
    keyPoints: [
      'Multi-day filtering and search by zone or severity',
      'One-click export to CSV & Excel audit reports'
    ],
    preferredPlacement: 'bottom',
    specialAction: 'historian',
    actionLabel: 'View Historian'
  },
  {
    id: 'fdd_predictive',
    targetSelector: '[data-tour="fdd-btn"]',
    title: 'Fault Detection & Diagnostics (FDDWorx)',
    category: 'Predictive Maintenance',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: 'fa-shield-halved',
    description: 'ICONICS FDDWorx compatible predictive engine. Evaluates complex multi-variable rules, calculates hourly energy waste ($/hr), and runs AI Root Cause Analysis (RCA).',
    keyPoints: [
      'Catch equipment faults before machines break down',
      'Generates automated SOP maintenance work orders'
    ],
    preferredPlacement: 'bottom',
    specialAction: 'fdd',
    actionLabel: 'Open FDD'
  },
  {
    id: 'user_manual',
    targetSelector: '[data-tour="manual-btn"]',
    title: 'Engineering User Manual & Handbook',
    category: 'Documentation',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: 'fa-book-bookmark',
    description: 'Complete book-style user manual with 11 indexed chapters, interactive schematics with numbered markers, protocol tables, and troubleshooting FAQs.',
    keyPoints: [
      'Searchable index of all system features & guides',
      'Printable hardcopy and PDF export ready'
    ],
    preferredPlacement: 'bottom',
    targetView: AppView.USER_MANUAL,
    actionLabel: 'Read Manual'
  },
  {
    id: 'view_switcher',
    targetSelector: '[data-tour="view-toggle"]',
    title: 'Bento Grid & SCADA Canvas Switcher',
    category: 'HMI Visualization',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    icon: 'fa-table-cells-large',
    description: 'Switch between the responsive modular Bento Grid layout and the absolute Web HMI Canvas featuring animated fluid pipes, tanks, and rotating pumps.',
    keyPoints: [
      'Toggle layout modes on the fly',
      'Select active HMI screen from the screen dropdown'
    ],
    preferredPlacement: 'bottom'
  },
  {
    id: 'ai_copilot_fab',
    targetSelector: '[data-tour="ai-copilot"]',
    title: 'AI Industrial Copilot',
    category: 'AI Assistant',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    icon: 'fa-wand-magic-sparkles',
    description: 'Your 24/7 intelligent engineering assistant. Ask questions in plain English to query live telemetry, diagnose PLC trips, or analyze blueprint photos.',
    keyPoints: [
      'Supports NVIDIA NIM, Google Gemini, and Local Ollama',
      'Speech dictation with automatic filler word removal'
    ],
    preferredPlacement: 'top',
    targetView: AppView.AI_ASSISTANT,
    actionLabel: 'Chat with AI'
  }
];

interface CoachMarkOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: AppView) => void;
  onOpenFdd?: () => void;
  onOpenAlarms?: () => void;
  onOpenHistorian?: () => void;
}

interface RectState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const CoachMarkOverlay: React.FC<CoachMarkOverlayProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenFdd,
  onOpenAlarms,
  onOpenHistorian
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [cutoutRect, setCutoutRect] = useState<RectState | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({ top: 120, left: 100 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Available visible steps (filtered if certain elements e.g. FDD desktop button are not rendered)
  const availableSteps = useMemo(() => {
    return COACH_MARK_STEPS.filter(step => {
      // If document is available, verify target exists or will exist
      if (typeof document === 'undefined') return true;
      const el = document.querySelector(step.targetSelector);
      return !!el;
    });
  }, [isOpen]);

  const activeSteps = availableSteps.length > 0 ? availableSteps : COACH_MARK_STEPS;
  const currentStep = activeSteps[Math.min(currentStepIndex, activeSteps.length - 1)] || COACH_MARK_STEPS[0];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === activeSteps.length - 1;

  // Measure and position the cutout and floating card
  const updatePosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const padding = 6;
      const x = Math.max(0, rect.left - padding);
      const y = Math.max(0, rect.top - padding);
      const width = rect.width + padding * 2;
      const height = rect.height + padding * 2;

      setCutoutRect({ x, y, width, height });

      // Calculate Floating Card Placement
      const cardWidth = cardRef.current ? cardRef.current.offsetWidth : 360;
      const cardHeight = cardRef.current ? cardRef.current.offsetHeight : 280;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = y + height + 14;
      let left = x + width / 2 - cardWidth / 2;

      // Smart Placement rules
      if (currentStep.preferredPlacement === 'top' || (top + cardHeight > viewportHeight - 20 && y > cardHeight + 20)) {
        top = y - cardHeight - 14;
      }

      // Clamp horizontal within screen margins
      if (left < 16) left = 16;
      if (left + cardWidth > viewportWidth - 16) {
        left = viewportWidth - cardWidth - 16;
      }

      // Clamp vertical within screen margins
      if (top < 16) top = 16;
      if (top + cardHeight > viewportHeight - 16) {
        top = viewportHeight - cardHeight - 16;
      }

      setCardPos({ top, left });
    } else {
      // Fallback: center in viewport if element is missing
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const cardWidth = 380;
      const cardHeight = 300;
      setCutoutRect({
        x: viewportWidth / 2 - 100,
        y: viewportHeight / 2 - 80,
        width: 200,
        height: 160
      });
      setCardPos({
        left: viewportWidth / 2 - cardWidth / 2,
        top: viewportHeight / 2 - cardHeight / 2
      });
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    // Run measurement on mount and step change
    updatePosition();
    const timer = setTimeout(updatePosition, 50);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, currentStepIndex, updatePosition]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem('tasc_product_tour_completed', 'true');
    } catch (e) {
      console.warn('Unable to persist tour state:', e);
    }
    onClose();
  };

  const handleAction = () => {
    if (currentStep.specialAction === 'fdd' && onOpenFdd) {
      onOpenFdd();
    } else if (currentStep.specialAction === 'alarms' && onOpenAlarms) {
      onOpenAlarms();
    } else if (currentStep.specialAction === 'historian' && onOpenHistorian) {
      onOpenHistorian();
    } else if (currentStep.targetView && onNavigate) {
      onNavigate(currentStep.targetView);
    }
    handleComplete();
  };

  return (
    <div className="fixed inset-0 z-[140] pointer-events-auto font-sans select-none animate-fade-in">
      
      {/* SVG Mask for Dark Backdrop Blur + Cutout Window */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-[141]">
        <defs>
          <mask id="coach-mark-cutout-mask">
            {/* Opaque white background */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Cutout transparent hole */}
            {cutoutRect && (
              <rect
                x={cutoutRect.x}
                y={cutoutRect.y}
                width={cutoutRect.width}
                height={cutoutRect.height}
                rx="14"
                ry="14"
                fill="black"
                className="transition-all duration-300 ease-out"
              />
            )}
          </mask>
        </defs>
        {/* Dark translucent backdrop with blur */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.78)"
          mask="url(#coach-mark-cutout-mask)"
          className="backdrop-blur-[3px] pointer-events-auto cursor-pointer"
          onClick={handleNext}
        />
      </svg>

      {/* Glowing Cutout Highlight Ring */}
      {cutoutRect && (
        <div
          style={{
            top: `${cutoutRect.y}px`,
            left: `${cutoutRect.x}px`,
            width: `${cutoutRect.width}px`,
            height: `${cutoutRect.height}px`
          }}
          className="fixed rounded-2xl ring-2 ring-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.6)] pointer-events-none z-[142] transition-all duration-300 ease-out"
        >
          {/* Subtle animated pulsating corner accents */}
          <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-sky-300 rounded-tl"></span>
          <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-sky-300 rounded-tr"></span>
          <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-sky-300 rounded-bl"></span>
          <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-sky-300 rounded-br"></span>
        </div>
      )}

      {/* Sleek Floating Instructions Card */}
      <div
        ref={cardRef}
        style={{
          top: `${cardPos.top}px`,
          left: `${cardPos.left}px`
        }}
        className="fixed z-[145] w-[360px] sm:w-[400px] max-w-[92vw] bg-slate-900/98 border border-slate-750/90 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 backdrop-blur-xl ring-1 ring-white/15 transition-all duration-300 ease-out flex flex-col space-y-4"
      >
        {/* Header: Category Badge + Step Counter + Skip Button */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentStep.badgeColor}`}>
              {currentStep.category}
            </span>
            <span className="text-xs font-mono text-slate-400">
              <strong className="text-white">{currentStepIndex + 1}</strong> of {activeSteps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Skip <i className="fas fa-xmark ml-0.5 text-[11px]"></i>
          </button>
        </div>

        {/* Title and Icon */}
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-base shadow-md shrink-0 ring-1 ring-white/20 mt-0.5">
            <i className={`fas ${currentStep.icon}`}></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight leading-snug">
              {currentStep.title}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {currentStep.description}
            </p>
          </div>
        </div>

        {/* Key Feature Highlights */}
        {currentStep.keyPoints && currentStep.keyPoints.length > 0 && (
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-1.5 text-xs text-slate-300">
            {currentStep.keyPoints.map((pt, i) => (
              <div key={i} className="flex items-start space-x-2">
                <i className="fas fa-check text-sky-400 text-[10px] mt-1 shrink-0"></i>
                <span className="text-[11px] leading-tight">{pt}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer Controls: Dots, Prev, Next, Action */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          {/* Step Dots */}
          <div className="flex items-center space-x-1">
            {activeSteps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-5 bg-sky-400'
                    : idx < currentStepIndex
                    ? 'w-1.5 bg-indigo-500'
                    : 'w-1.5 bg-slate-700'
                }`}
                title={`Step ${idx + 1}: ${s.title}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5">
            {currentStep.actionLabel && (
              <button
                type="button"
                onClick={handleAction}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>{currentStep.actionLabel}</span>
                <i className="fas fa-arrow-up-right-from-square text-[9px]"></i>
              </button>
            )}

            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1"
            >
              <span>{isLast ? 'Finish Tour' : 'Next'}</span>
              <i className={`fas ${isLast ? 'fa-check' : 'fa-arrow-right'} text-[10px]`}></i>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
