import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppView } from '../types';
import { CoachMarkStep, ALL_SUBMODULE_TOURS, isTourSuppressed, setTourSuppressed } from '../utils/tourRegistry';

interface CoachMarkOverlayProps {
  tourId?: string;
  steps?: CoachMarkStep[];
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
  tourId = 'global',
  steps: customSteps,
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
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Determine active steps from registry or props
  const allSteps = useMemo(() => {
    return customSteps || ALL_SUBMODULE_TOURS[tourId] || ALL_SUBMODULE_TOURS.global;
  }, [customSteps, tourId]);

  // Filter available steps that currently exist in DOM
  const availableSteps = useMemo(() => {
    if (!isOpen) return allSteps;
    if (typeof document === 'undefined') return allSteps;

    const visible = allSteps.filter(step => {
      const el = document.querySelector(step.targetSelector);
      return !!el;
    });

    return visible.length > 0 ? visible : allSteps;
  }, [isOpen, allSteps]);

  const currentStep = availableSteps[Math.min(currentStepIndex, availableSteps.length - 1)] || allSteps[0];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === availableSteps.length - 1;

  // Reset index and suppress checkbox state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setDontShowAgain(isTourSuppressed(tourId));
    }
  }, [isOpen, tourId]);

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

  // Handle Resize & Scroll events strictly while isOpen is true
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const timer = setTimeout(updatePosition, 60);

    const onResize = () => updatePosition();
    const onScroll = () => updatePosition();

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);

    // Guaranteed complete listener teardown
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [isOpen, currentStepIndex, updatePosition]);

  // Zero-DOM Return when suppressed or closed
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
    // Only permanently suppress if the user checked "Don't show me next time"
    if (dontShowAgain) {
      setTourSuppressed(tourId, true);
    } else {
      // If unchecked, leave unsuppressed so browser reminds them next time
      setTourSuppressed(tourId, false);
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
          <mask id={`coach-mark-mask-${tourId}`}>
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
          mask={`url(#coach-mark-mask-${tourId})`}
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
              <strong className="text-white">{currentStepIndex + 1}</strong> of {availableSteps.length}
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

        {/* "Don't show me next time" checkbox */}
        <div className="pt-1 flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0 cursor-pointer"
            />
            <span>Don't show this tour next time</span>
          </label>
        </div>

        {/* Footer Controls: Dots, Prev, Next, Action */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          {/* Step Dots */}
          <div className="flex items-center space-x-1">
            {availableSteps.map((s, idx) => (
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
