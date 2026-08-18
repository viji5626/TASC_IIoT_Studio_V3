import React, { useState, useEffect } from 'react';
import { AppView } from '../types';

interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: AppView) => void;
  onOpenFdd?: () => void;
  onOpenAlarms?: () => void;
  onOpenHistorian?: () => void;
}

interface TourStep {
  id: string;
  title: string;
  category: string;
  badgeColor: string;
  icon: string;
  iconGradient: string;
  plainEnglishSummary: string;
  keyCapabilities: string[];
  quickTip: string;
  targetView?: AppView;
  specialAction?: 'fdd' | 'alarms' | 'historian' | 'manual';
  actionLabel?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to TASC IIoT Studio',
    category: 'System Overview',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    icon: 'fa-cubes-stacked',
    iconGradient: 'from-sky-500 to-indigo-600',
    plainEnglishSummary: 'TASC IIoT Studio is an all-in-one software platform for monitoring, controlling, and diagnosing industrial equipment, factories, and machines directly inside your web browser with zero installation.',
    keyCapabilities: [
      'Real-time live telemetry display for plant floors, machines, and energy meters',
      'Dual viewing modes: Modular Bento Grid and Freeform SCADA HMI Canvas',
      'Built-in security, user roles (Admin vs Operator), and client package exporting'
    ],
    quickTip: 'You can navigate to any section using the top-left sidebar menu (☰) at any time.'
  },
  {
    id: 'scada_canvas',
    title: 'SCADA Dashboard & Web HMI Canvas',
    category: 'HMI & Visualization',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: 'fa-microchip',
    iconGradient: 'from-emerald-500 to-teal-600',
    plainEnglishSummary: 'Design visual control screens that look like your real-world factory floor. Place interactive gauges, switches, animated fluid pipes, tanks, pumps, and temperature displays.',
    keyCapabilities: [
      'Switch seamlessly between Bento Grid cards and Absolute Web HMI Canvas',
      'Animated SVG symbols: Flowing liquid pipes, spinning motors, valves, and boilers',
      'Multi-screen jumping, custom background blueprints, and touchscreen auto-fit'
    ],
    quickTip: 'Click the "HMI View" toggle in the top bar to switch between standard cards and the visual factory canvas.',
    targetView: AppView.DASHBOARD,
    actionLabel: 'Explore Dashboard'
  },
  {
    id: 'driver_connections',
    title: 'Industrial Drivers (Modbus, OPC UA & MQTT)',
    category: 'Hardware Communication',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    icon: 'fa-plug-circle-bolt',
    iconGradient: 'from-blue-500 to-cyan-600',
    plainEnglishSummary: 'Connect directly to your physical PLCs (Programmable Logic Controllers), sensors, and industrial automation networks over Ethernet or Serial.',
    keyCapabilities: [
      'Modbus TCP & Modbus RTU (Holding Registers, Input Registers, Coils, Byte Swapping)',
      'OPC UA & OPC DA with Security Encryption and built-in Hierarchical Node Browser',
      'MQTT WebSockets for cloud IoT gateways and distributed microservices'
    ],
    quickTip: 'Use "OPC UA Browser" in the sidebar to discover connected PLC variables and import tags with one click.',
    targetView: AppView.DRIVER_CONNECTIONS,
    actionLabel: 'View Driver Settings'
  },
  {
    id: 'tag_manager',
    title: 'Driver Tag Manager & Live Telemetry',
    category: 'Data Management',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    icon: 'fa-database',
    iconGradient: 'from-indigo-500 to-purple-600',
    plainEnglishSummary: 'Create and organize individual data tags (like temperature, pressure, power, and flow). Define custom engineering units and formula scaling so raw numbers make sense.',
    keyCapabilities: [
      'Raw to Engineering unit scaling (e.g. 0-4095 ADC counts to 0-100 °C or Bar)',
      'Data Quality tracking (Good, Bad, Stale, Offline) with communication health counters',
      'Unified tag addressing for Modbus, OPC UA, and MQTT data points'
    ],
    quickTip: 'Every widget on your screen can be connected to any tag simply by picking its name in the widget editor.',
    targetView: AppView.DRIVER_TAG_MANAGER,
    actionLabel: 'Open Tag Manager'
  },
  {
    id: 'alarms',
    title: 'Real-Time Alarms & Safety Trip Interlocks',
    category: 'Safety & Alerts',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    icon: 'fa-bell',
    iconGradient: 'from-rose-500 to-red-600',
    plainEnglishSummary: 'Get immediate visual and audio warnings whenever equipment reaches dangerous temperatures, high vibrations, or emergency trip conditions.',
    keyCapabilities: [
      'Visual pulsating banners, audio sirens, and haptic vibrations for critical faults',
      'Trip Tag Interlocks: Instantly detect emergency stops and motor overloads',
      'Operator Acknowledgment with operator name logging and permanent audit trail'
    ],
    quickTip: 'Click the "ALARMS" bell button in the top navbar to view active warnings or acknowledge sirens.',
    specialAction: 'alarms',
    actionLabel: 'Open Alarm Center'
  },
  {
    id: 'trend_historian',
    title: 'Trend Historian & Multi-Year Analytics',
    category: 'Historical Logging',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: 'fa-chart-line',
    iconGradient: 'from-amber-500 to-orange-600',
    plainEnglishSummary: 'Record continuous historical data for years locally without requiring an external database server. Zoom into past trends, compare shifts, and export reports.',
    keyCapabilities: [
      'High-speed IndexedDB time-series storage with smart multi-tier downsampling (LTTB)',
      'Zero cloud dependency: Runs 100% offline with up to 50 GB storage capacity on PC',
      'One-click export of historical telemetry to Excel (XLSX) and CSV formats'
    ],
    quickTip: 'Click "HISTORIAN" in the top bar to inspect historical curves, alarm history, and generate reports.',
    specialAction: 'historian',
    actionLabel: 'Open Alarm Historian'
  },
  {
    id: 'fdd_predictive',
    title: 'Fault Detection & Diagnostics (FDD)',
    category: 'Predictive Maintenance',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    icon: 'fa-shield-halved',
    iconGradient: 'from-amber-600 to-purple-700',
    plainEnglishSummary: 'Catch equipment problems before machines break down. FDD monitors complex conditions (like a hot chiller running with low water flow), calculates energy waste in $/hour, and suggests repairs.',
    keyCapabilities: [
      'Multi-variable logic rules (e.g. Chiller.DischargeTemp > 85 && WaterFlow < 25)',
      'Real-time financial waste tracking ($/hr) and excess energy loss (kW)',
      'AI Root Cause Analysis (RCA) with step-by-step SOP maintenance work orders'
    ],
    quickTip: 'Click "FDD / CBM" in the top navbar (available on PC) to view equipment health scores and active faults.',
    specialAction: 'fdd',
    actionLabel: 'Open FDD Dashboard'
  },
  {
    id: 'ai_copilot',
    title: 'AI Industrial Copilot & Natural Language',
    category: 'AI Assistant',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    icon: 'fa-wand-magic-sparkles',
    iconGradient: 'from-cyan-500 to-indigo-600',
    plainEnglishSummary: 'Chat with an intelligent industrial AI that understands your factory data. Ask questions in plain English, troubleshoot PLC alarms, or upload blueprint photos for instant analysis.',
    keyCapabilities: [
      'Real-time tool execution: Queries live tags, driver health, and active alarms automatically',
      'Supports NVIDIA NIM, Google Gemini, Ollama, LM Studio, and OpenAI models',
      'Voice speech dictation with automatic filler word removal and blueprint image vision'
    ],
    quickTip: 'Click the floating AI Sparkle button in the bottom right corner to ask any question about your plant.',
    targetView: AppView.AI_ASSISTANT,
    actionLabel: 'Open AI Copilot'
  },
  {
    id: 'security_settings',
    title: 'Operator PIN Security & User Manual',
    category: 'Security & Documentation',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    icon: 'fa-book-bookmark',
    iconGradient: 'from-slate-600 to-slate-800',
    plainEnglishSummary: 'Lock critical control switches behind a security PIN to prevent accidental touches on the shop floor. Consult our comprehensive interactive book manual whenever you need help.',
    keyCapabilities: [
      'Runtime PIN protection with auto-lock timeout for industrial kiosk screens',
      'Export standalone client packages for operators with restricted engineering controls',
      'Complete indexed User Manual book with step-by-step schematics and guides'
    ],
    quickTip: 'Click "User Manual & Docs" in the sidebar anytime to read the complete indexed handbook.',
    targetView: AppView.USER_MANUAL,
    actionLabel: 'Open User Manual'
  }
];

export const ProductTourModal: React.FC<ProductTourModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenFdd,
  onOpenAlarms,
  onOpenHistorian
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / TOUR_STEPS.length) * 100);

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
    handleComplete();
    if (currentStep.specialAction === 'fdd' && onOpenFdd) {
      onOpenFdd();
    } else if (currentStep.specialAction === 'alarms' && onOpenAlarms) {
      onOpenAlarms();
    } else if (currentStep.specialAction === 'historian' && onOpenHistorian) {
      onOpenHistorian();
    } else if (currentStep.targetView && onNavigate) {
      onNavigate(currentStep.targetView);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden text-slate-100 ring-1 ring-white/10">
        
        {/* Progress Bar Top Line */}
        <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-amber-400 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Top Header Controls */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentStep.badgeColor}`}>
              {currentStep.category}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Step <strong className="text-white">{currentStepIndex + 1}</strong> of {TOUR_STEPS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Skip Tour <i className="fas fa-xmark ml-1"></i>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6 sm:p-7 flex-1 space-y-5">
          {/* Icon & Title */}
          <div className="flex items-start space-x-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentStep.iconGradient} flex items-center justify-center text-white text-2xl shadow-lg shrink-0 ring-2 ring-white/15`}>
              <i className={`fas ${currentStep.icon}`}></i>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {currentStep.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {currentStep.plainEnglishSummary}
              </p>
            </div>
          </div>

          {/* Key Capabilities Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
              <i className="fas fa-check-double"></i>
              <span>Key Capabilities & Features:</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {currentStep.keyCapabilities.map((cap, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <i className="fas fa-circle-check text-emerald-400 text-[11px] mt-0.5 shrink-0"></i>
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Tip Box */}
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-200/90">
            <i className="fas fa-lightbulb text-amber-400 text-sm mt-0.5 shrink-0"></i>
            <div>
              <strong className="text-amber-300">Quick Tip: </strong>
              <span>{currentStep.quickTip}</span>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Footer */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Step Indicator Dots */}
          <div className="flex items-center space-x-1.5">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-6 bg-sky-400'
                    : idx < currentStepIndex
                    ? 'w-2 bg-indigo-500'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Go to step ${idx + 1}: ${step.title}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {currentStep.actionLabel && (
              <button
                type="button"
                onClick={handleAction}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <span>{currentStep.actionLabel}</span>
                <i className="fas fa-arrow-up-right-from-square text-[10px] text-sky-400"></i>
              </button>
            )}

            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                &larr; Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <span>{isLast ? 'Get Started & Finish' : 'Next Step'}</span>
              <i className={`fas ${isLast ? 'fa-check' : 'fa-arrow-right'} text-xs`}></i>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
