import React, { useState, useRef, useEffect } from 'react';
import { Panel, PanelType } from '../types';
import Gauge from './Gauge';
import LineGraph from './LineGraph';
import { motion } from 'motion/react';
import { formatPublishPayload, getNormalizedOptions } from '../utils/mqttHelper';
import { getSmartIconAnimationClass, SmartIcon } from '../utils/iconAnimator';
import { isPanelTripped } from '../utils/tripHelper';
import { getPanelTelemetryStatus } from '../utils/staleHelper';
import { AlarmHistorianWidget } from './AlarmHistorianWidget';
import { DynamicIndustrialSymbol } from './DynamicIndustrialSymbol';

interface PanelCardProps {
  panel: Panel;
  lastValue: any;
  lastTimestamp: string;
  lastSentTimestamp?: string;
  latestValues?: Record<string, { val: any; time: string }>;
  history?: { value: number; time: string }[];
  onEdit: (panel: Panel) => void;
  onDelete: (panelId: string) => void;
  onClone?: (panel: Panel) => void;
  onQuickResize?: (panelId: string, colSpan: number, rowSpan: number) => void;
  onPublish?: (topic: string, payload: string | number) => void;
  isLayoutMode?: boolean;
  isLocked?: boolean;
  isSelected?: boolean;
  dragHandleProps?: { listeners?: any; attributes?: any };
  isDragging?: boolean;
}

const PanelCard: React.FC<PanelCardProps> = ({ 
  panel, 
  lastValue, 
  lastTimestamp,
  lastSentTimestamp,
  latestValues = {},
  history = [],
  onEdit, 
  onDelete,
  onClone,
  onQuickResize,
  onPublish,
  isLayoutMode, 
  isLocked = false,
  isSelected,
  dragHandleProps,
  isDragging
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dedicated Equipment Trip Evaluation
  const tripResult = isPanelTripped(panel, latestValues);
  const isTripped = tripResult.isTripped;

  // Telemetry Timeout / Disconnection Watchdog Evaluation
  const telemetryStatus = getPanelTelemetryStatus(panel, latestValues);
  const isOffline = telemetryStatus.isOffline;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const value = typeof lastValue === 'number' ? lastValue : parseFloat(lastValue || '0');
  const precision = parseInt(panel.decimalPrecision?.toString() || '1');
  const rawStringValue = lastValue !== undefined && lastValue !== null ? String(lastValue) : '';

  const minVal = panel.payloadMin ?? 0;
  const currentNumVal = isNaN(value) ? minVal : value;
  const [sliderVal, setSliderVal] = useState<number>(currentNumVal);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [textInputError, setTextInputError] = useState<string | null>(null);

  // Evaluate Inbuilt Active Alarms ONLY for display/output parameters
  const isOutputPanel = [
    PanelType.GAUGE,
    PanelType.LINE_GRAPH,
    PanelType.PROGRESS,
    PanelType.TEXT_OUTPUT,
    PanelType.LOG,
    PanelType.LED,
    PanelType.NODE_STATUS
  ].includes(panel.type as PanelType) || panel.type === 'log' || panel.type === 'text_display';

  const lowLimit = panel.lowThreshold ?? 33;
  const highLimit = panel.highThreshold ?? 66;

  let activeAlarmZone: 'LOW' | 'MID' | 'HIGH' | null = null;
  let alarmMessage = '';

  if (isOutputPanel && !isNaN(value)) {
    if (value <= lowLimit && panel.enableLowAlarm) {
      activeAlarmZone = 'LOW';
      alarmMessage = panel.lowAlarmMsg || 'Low Zone Alarm';
    } else if (value > lowLimit && value <= highLimit && panel.enableMidAlarm) {
      activeAlarmZone = 'MID';
      alarmMessage = panel.midAlarmMsg || 'Mid Zone Alarm';
    } else if (value > highLimit && panel.enableHighAlarm) {
      activeAlarmZone = 'HIGH';
      alarmMessage = panel.highAlarmMsg || 'High Zone Alarm';
    }
  }

  useEffect(() => {
    if (!isNaN(value)) {
      setSliderVal(value);
    }
  }, [value, lastValue]);

  // Sync text input box directly with incoming subscribed value
  useEffect(() => {
    if (rawStringValue !== undefined && rawStringValue !== null) {
      setInputText(rawStringValue);
    }
  }, [rawStringValue]);

  const handleActionPublish = (payload: string | number) => {
    const targetTopic = panel.publishTopic?.trim() || panel.topic?.trim();
    if (onPublish && targetTopic) {
      if (panel.confirmPublish) {
        if (!window.confirm(`Publish message to ${targetTopic}?`)) {
          return;
        }
      }
      const formatted = formatPublishPayload(payload, panel);
      onPublish(targetTopic, formatted);
    }
  };

  const renderHeader = (title: string, rightBadge?: React.ReactNode) => {
    const showRx = panel.showReceivedTimeStamp !== false && lastTimestamp;
    const showTx = panel.showSentTimeStamp !== false && lastSentTimestamp;

    return (
      <div className="flex flex-col w-full mb-1 pr-14">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-semibold text-slate-300 truncate flex items-center space-x-1" title={title}>
            <span>{title}</span>
            {isTripped && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-600/90 text-white border border-red-400 animate-bounce flex items-center space-x-1 shadow-lg shrink-0 ml-1" title={tripResult.message}>
                <i className="fas fa-triangle-exclamation text-[9px] text-yellow-300"></i>
                <span>TRIP</span>
              </span>
            )}
            {isOffline && (
              <span
                className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/60 animate-pulse flex items-center space-x-1 shrink-0 ml-1"
                title={telemetryStatus.isBad ? 'Driver bad quality / socket error' : `No telemetry payload received for ${telemetryStatus.secondsSinceUpdate || 10}s`}
              >
                <i className="fas fa-plug-circle-xmark text-[9px] text-amber-400"></i>
                <span>{telemetryStatus.isBad ? 'BAD DATA' : `OFFLINE (${telemetryStatus.secondsSinceUpdate || 10}s)`}</span>
              </span>
            )}
          </span>
          {rightBadge}
          {activeAlarmZone && !rightBadge && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/60 animate-pulse flex items-center space-x-1" title={alarmMessage}>
              <i className="fas fa-bell text-[8px] text-rose-400"></i>
              <span>{activeAlarmZone} ALARM</span>
            </span>
          )}
        </div>
        {(showRx || showTx || activeAlarmZone) && (
          <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap gap-y-1">
            {activeAlarmZone && rightBadge && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/60 animate-pulse flex items-center space-x-1" title={alarmMessage}>
                <i className="fas fa-bell text-[8px] text-rose-400"></i>
                <span>{activeAlarmZone} ALARM</span>
              </span>
            )}
            {showRx && (
              <span className="text-[9px] font-mono text-slate-400 flex items-center space-x-1 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800/80">
                <i className="fas fa-arrow-down text-[8px] text-emerald-400"></i>
                <span>Rx: {lastTimestamp}</span>
              </span>
            )}
            {showTx && (
              <span className="text-[9px] font-mono text-amber-300 flex items-center space-x-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                <i className="fas fa-arrow-up text-[8px] text-amber-400"></i>
                <span>Tx: {lastSentTimestamp}</span>
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    const isSlim = panel.rowSpan === 0;

    switch (panel.type) {
      case PanelType.GAUGE:
        if (isSlim) {
          return (
            <div className="w-full flex flex-col justify-center">
              {renderHeader(panel.panelName)}
              <div className="flex items-center justify-between w-full px-1 pt-0.5">
                <div className="w-20 h-10 shrink-0 flex items-center justify-center overflow-hidden">
                  <Gauge 
                    value={value} 
                    min={panel.payloadMin ?? 0} 
                    max={panel.payloadMax ?? 100} 
                    unit=""
                    color1={panel.firstColor || '#38bdf8'}
                    color2={panel.secondColor || '#10b981'}
                    color3={panel.thirdColor || '#f43f5e'}
                    precision={precision}
                    lowThreshold={panel.lowThreshold}
                    highThreshold={panel.highThreshold}
                    hideText={true}
                  />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-bold text-white digital-font leading-none">
                    {typeof value === 'number' ? value.toFixed(precision) : value}
                    <span className="text-xs text-sky-400 ml-1">{panel.unit || ''}</span>
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                    Range: {panel.payloadMin ?? 0}-{panel.payloadMax ?? 100}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="w-full flex flex-col items-center justify-center">
            {renderHeader(panel.panelName, <span className="text-[10px] text-slate-500 font-mono truncate max-w-[80px]">{panel.topic}</span>)}
            <div className="w-full h-24">
              <Gauge 
                value={value} 
                min={panel.payloadMin ?? 0} 
                max={panel.payloadMax ?? 100} 
                unit={panel.unit || ''}
                color1={panel.firstColor || '#38bdf8'}
                color2={panel.secondColor || '#10b981'}
                color3={panel.thirdColor || '#f43f5e'}
                precision={precision}
                lowThreshold={panel.lowThreshold}
                highThreshold={panel.highThreshold}
                fontSize={panel.fontSize}
              />
            </div>
          </div>
        );

      case PanelType.LED: {
        const payloadOnStr = String(panel.payloadOn ?? '1');
        const isOn = rawStringValue === payloadOnStr || rawStringValue === 'true' || lastValue === 1 || lastValue === true;
        const color = isOn ? (panel.iconColorOn || '#10b981') : (panel.iconColorOff || '#475569');
        const rawIcon = isOn ? (panel.iconOn || 'fa-fan') : (panel.iconOff || 'fa-fan');
        const iconClass = rawIcon.startsWith('fa-') ? rawIcon : `fa-${rawIcon}`;
        const isFan = iconClass.includes('fan');

        const shouldAnimate = isOn 
          ? (panel.rotateOn ?? isFan) 
          : (panel.rotateOff ?? false);

        const shouldFlash = isOn 
          ? (panel.flashOn ?? false) 
          : (panel.flashOff ?? false);

        const animSpeed = isOn ? (panel.animSpeedOn || 'medium') : (panel.animSpeedOff || 'medium');

        return (
          <div className="flex flex-col w-full py-0.5">
            {renderHeader(panel.panelName)}
            <div className="flex items-center justify-between w-full pt-1">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all duration-300 shrink-0"
                  style={{ 
                    color, 
                    backgroundColor: `${color}18`,
                    boxShadow: isOn ? `0 0 12px ${color}44` : 'none' 
                  }}
                >
                  <SmartIcon icon={iconClass} isAnimate={!!shouldAnimate} isFlash={!!shouldFlash} speed={animSpeed} />
                </div>
                <span className="text-xs font-mono text-slate-400">{isOn ? 'State: ACTIVE' : 'State: OFF'}</span>
              </div>
              <div className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${isOn ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border border-slate-700 text-slate-500'}`}>
                {isOn ? 'ON' : 'OFF'}
              </div>
            </div>
          </div>
        );
      }

      case PanelType.SWITCH: {
        const payloadOnVal = panel.payloadOn ?? '1';
        const payloadOffVal = panel.payloadOff ?? '0';
        const isOn = rawStringValue === String(payloadOnVal) || rawStringValue === 'true' || lastValue === 1;

        return (
          <div className="flex flex-col w-full py-0.5">
            {renderHeader(panel.panelName)}
            <div className="flex items-center justify-between w-full pt-1.5 min-h-[44px]">
              <span className="text-xs font-mono text-slate-400">{isOn ? 'Status: ON' : 'Status: OFF'}</span>
              <button
                type="button"
                onClick={() => handleActionPublish(isOn ? payloadOffVal : payloadOnVal)}
                className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center shrink-0 active:scale-95 ${isOn ? 'bg-sky-500 shadow-md shadow-sky-500/20' : 'bg-slate-800 border border-slate-700'}`}
              >
                <motion.div
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform ${isOn ? 'translate-x-7' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        );
      }

      case PanelType.BUTTON: {
        const targetPayload = panel.buttonPayload ?? panel.payloadOn ?? '1';
        return (
          <div className="flex flex-col w-full py-0.5 space-y-1.5">
            {renderHeader(panel.panelName)}
            <button
              type="button"
              onClick={() => handleActionPublish(targetPayload)}
              className="w-full min-h-[44px] py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:scale-[0.97] transition-all text-white font-bold rounded-xl shadow-lg shadow-sky-900/20 flex items-center justify-center space-x-2 text-xs cursor-pointer touch-manipulation"
            >
              <i className="fas fa-paper-plane text-[11px]"></i>
              <span>{panel.buttonPayload ? `Send (${panel.buttonPayload})` : 'Send Trigger'}</span>
            </button>
          </div>
        );
      }

      case PanelType.SLIDER: {
        const min = panel.payloadMin ?? 0;
        const max = panel.payloadMax ?? 100;
        const range = max - min || 1;
        const pct = Math.max(0, Math.min(100, ((sliderVal - min) / range) * 100));

        return (
          <div className="flex flex-col w-full py-0.5 space-y-1">
            {renderHeader(
              panel.panelName,
              <span className="font-bold font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg text-[11px]">
                {sliderVal} {panel.unit || ''}
              </span>
            )}
            
            {/* Touch-Optimized Slider Container with Floating Numeric Indicator */}
            <div className="relative w-full pt-4 pb-2 my-1 touch-none">
              {isDraggingSlider && (
                <div 
                  className="absolute top-[-1.5rem] transform -translate-x-1/2 bg-sky-400 text-slate-950 font-black font-mono text-xs px-2.5 py-1 rounded-lg shadow-2xl border border-white/60 pointer-events-none z-30 flex items-center space-x-0.5 animate-in fade-in duration-100"
                  style={{ left: `${pct}%` }}
                >
                  <span>{sliderVal}</span>
                  {panel.unit && <span className="text-[10px] opacity-90 ml-0.5">{panel.unit}</span>}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-sky-400" />
                </div>
              )}

              <input 
                type="range"
                min={min}
                max={max}
                step={panel.sliderStep || 1}
                value={sliderVal}
                onPointerDown={() => setIsDraggingSlider(true)}
                onPointerUp={() => setIsDraggingSlider(false)}
                onPointerCancel={() => setIsDraggingSlider(false)}
                onTouchStart={() => setIsDraggingSlider(true)}
                onTouchEnd={() => setIsDraggingSlider(false)}
                onMouseDown={() => setIsDraggingSlider(true)}
                onMouseUp={() => setIsDraggingSlider(false)}
                onChange={(e) => {
                  const rawVal = Number(e.target.value);
                  const clampedVal = Math.max(min, Math.min(max, rawVal));
                  setSliderVal(clampedVal);
                  handleActionPublish(clampedVal);
                }}
                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 touch-pan-x min-h-[36px] my-1"
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Min: {min}</span>
              <span>Max: {max}</span>
            </div>
          </div>
        );
      }

      case PanelType.PROGRESS: {
        const min = panel.payloadMin ?? 0;
        const max = panel.payloadMax ?? 100;
        const range = max - min || 1;
        const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));
        const color = pct > 75 ? (panel.firstColor || '#0ea5e9') : pct > 35 ? (panel.secondColor || '#10b981') : (panel.thirdColor || '#f43f5e');

        return (
          <div className="flex flex-col w-full py-0.5 space-y-1.5">
            {renderHeader(
              panel.panelName,
              <span className="font-bold text-white digital-font text-xs">{pct.toFixed(0)}%</span>
            )}
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div 
                className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
              <span>{value.toFixed(precision)} {panel.unit || ''}</span>
              <span>Max: {max}</span>
            </div>
          </div>
        );
      }

      case PanelType.TEXT_INPUT: {
        const min = panel.payloadMin ?? 0;
        const max = panel.payloadMax ?? 100;

        const handleSendInput = () => {
          const trimmed = inputText.trim();
          if (!trimmed) return;

          const numVal = Number(trimmed);
          const isNumeric = !isNaN(numVal);

          if (isNumeric) {
            if (numVal < min || numVal > max) {
              setTextInputError(`Out of limits! Value must be between ${min} and ${max}`);
              return;
            }
          }

          setTextInputError(null);
          handleActionPublish(trimmed);
          if (panel.clearOnPublish) {
            setInputText('');
          }
        };

        return (
          <div className="flex flex-col w-full py-0.5 space-y-1.5">
            {renderHeader(
              panel.panelName,
              <span className="text-[10px] text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                Range: {min} ↔ {max}
              </span>
            )}
            <div className="flex items-center space-x-2 pt-0.5">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (textInputError) setTextInputError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendInput();
                  }
                }}
                placeholder={`Type payload (${min} - ${max})...`}
                className={`flex-grow bg-slate-950 border outline-none rounded-xl px-3 py-2.5 min-h-[44px] text-xs text-white placeholder:text-slate-600 font-mono transition-colors ${
                  textInputError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-sky-500'
                }`}
              />
              <button 
                type="button"
                onClick={handleSendInput}
                className="px-4 py-2.5 min-h-[44px] bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs active:scale-95 transition-all flex items-center space-x-1 shrink-0 cursor-pointer touch-manipulation"
              >
                <span>Send</span>
                <i className="fas fa-paper-plane text-[10px]"></i>
              </button>
            </div>
            {textInputError && (
              <div className="text-[10px] text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-lg flex items-center space-x-1 animate-pulse mt-0.5">
                <i className="fas fa-triangle-exclamation text-[9px] text-rose-400"></i>
                <span>{textInputError}</span>
              </div>
            )}
          </div>
        );
      }

      case PanelType.TEXT_OUTPUT:
      case PanelType.LOG: {
        const min = panel.payloadMin ?? 0;
        const max = panel.payloadMax ?? 100;
        const range = max - min || 1;
        const lowVal = panel.lowThreshold !== undefined ? panel.lowThreshold : min + range * 0.333;
        const highVal = panel.highThreshold !== undefined ? panel.highThreshold : min + range * 0.666;
        const numVal = typeof value === 'number' && !isNaN(value) ? value : parseFloat(rawStringValue);

        let dynamicColor = panel.textColor || '#38bdf8';
        if (!isNaN(numVal)) {
          if (numVal <= lowVal) {
            dynamicColor = panel.firstColor || '#38bdf8';
          } else if (numVal <= highVal) {
            dynamicColor = panel.secondColor || '#10b981';
          } else {
            dynamicColor = panel.thirdColor || '#f43f5e';
          }
        }

        return (
          <div className="flex flex-col items-start w-full py-0.5">
            {renderHeader(
              panel.panelName,
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(rawStringValue);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="text-[10px] text-slate-500 hover:text-white transition-colors"
                title="Copy output"
              >
                <i className={`fas ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
              </button>
            )}
            <div 
              className="flex items-baseline space-x-1.5 w-full p-2.5 rounded-xl min-h-[40px] mt-1 transition-all duration-300"
              style={{
                backgroundColor: 'rgba(2, 6, 23, 0.8)',
                borderColor: `${dynamicColor}50`,
                borderWidth: '1px'
              }}
            >
              <span 
                className={`text-base font-bold ${panel.digitalDisplay !== false ? 'digital-font' : ''} break-all`}
                style={{ color: dynamicColor }}
              >
                {rawStringValue !== '' ? rawStringValue : '---'}
              </span>
              {panel.unit && <span className="text-xs font-medium" style={{ color: dynamicColor }}>{panel.unit}</span>}
            </div>
          </div>
        );
      }

      case PanelType.NODE_STATUS: {
        const isOnline = rawStringValue === 'online' || rawStringValue === '1' || rawStringValue === 'true' || lastValue === 1;
        return (
          <div className="flex flex-col w-full py-0.5">
            {renderHeader(panel.panelName)}
            <div className="flex items-center justify-between w-full pt-1">
              <span className="text-[10px] font-mono text-slate-500">{panel.topic}</span>
              <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOnline ? 'bg-emerald-400 opacity-75' : 'bg-rose-400 opacity-75'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
                <span className={`text-[11px] font-mono font-semibold ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        );
      }

      case PanelType.COMBO_BOX: {
        const normalizedOpts = getNormalizedOptions(panel);
        return (
          <div className="flex flex-col w-full space-y-1.5 py-0.5">
            {renderHeader(panel.panelName)}
            <div className="relative w-full">
              <select
                value={rawStringValue}
                onChange={(e) => handleActionPublish(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-amber-300 font-semibold text-xs rounded-xl px-3.5 py-2.5 min-h-[44px] outline-none focus:border-amber-500 cursor-pointer touch-manipulation appearance-none pr-8 shadow-inner"
              >
                <option value="" disabled className="text-slate-500">Select option...</option>
                {normalizedOpts.map((opt, i) => (
                  <option key={i} value={opt.value} className="bg-slate-900 text-white py-1">
                    {opt.label} ({opt.value})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                <i className="fas fa-chevron-down"></i>
              </div>
            </div>
          </div>
        );
      }

      case PanelType.RADIO_BUTTONS:
      case PanelType.MULTI_STATE: {
        const normalizedOpts = getNormalizedOptions(panel);
        return (
          <div className="flex flex-col w-full space-y-1.5 py-0.5">
            {renderHeader(panel.panelName)}
            <div className="flex flex-wrap gap-2">
              {normalizedOpts.map((opt, i) => {
                const isActive = rawStringValue === opt.value || rawStringValue === opt.label || rawStringValue === String(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleActionPublish(opt.value)}
                    className={`px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center space-x-2 border ${
                      isActive 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/80 font-bold shadow-lg shadow-amber-500/10' 
                        : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Radio Circle Icon Indicator */}
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      isActive ? 'border-amber-400 bg-amber-400/20' : 'border-slate-600'
                    }`}>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]"></div>}
                    </div>
                    <span>{opt.label}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {opt.value}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case PanelType.COLOR_PICKER: {
        const currentColor = rawStringValue.startsWith('#') ? rawStringValue : '#38bdf8';
        const presetColors = ['#f43f5e', '#f59e0b', '#10b981', '#38bdf8', '#818cf8', '#f472b6', '#ffffff'];

        return (
          <div className="flex flex-col w-full space-y-1.5 py-0.5">
            {renderHeader(panel.panelName, <span className="font-mono text-[10px] text-slate-400">{currentColor}</span>)}
            <div className="flex items-center space-x-2.5 pt-0.5">
              <div 
                className="w-8 h-8 rounded-full border border-white/20 shadow-inner shrink-0"
                style={{ backgroundColor: currentColor }}
              />
              <div className="flex flex-wrap gap-2 flex-grow">
                {presetColors.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleActionPublish(c)}
                    className="w-7 h-7 rounded-full border border-white/20 hover:scale-110 active:scale-90 transition-transform cursor-pointer touch-manipulation"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      }

      case PanelType.LINE_GRAPH:
        return (
          <div className="w-full h-full flex flex-col space-y-1 py-0.5">
            {renderHeader(panel.panelName)}
            <div className="flex-1 w-full h-full overflow-hidden">
              <LineGraph 
                panel={panel}
                history={history} 
                latestValues={latestValues}
                unit={panel.unit} 
                color={panel.penColor || panel.firstColor || '#38bdf8'} 
                penThickness={panel.penThickness || 2.5}
                graphType={panel.graphType || 'line'}
                showGrid={panel.showGrid !== false}
                fillArea={panel.fillArea !== false}
                showMonitoringTable={panel.showMonitoringTable !== false}
                enableDualCursor={panel.enableDualCursor}
                pens={panel.pens}
                payloadMin={panel.payloadMin}
                payloadMax={panel.payloadMax}
                height={isSlim ? 60 : undefined}
              />
            </div>
          </div>
        );

      case PanelType.IMAGE: {
        return (
          <div className="flex flex-col w-full h-full items-center justify-center overflow-hidden py-1">
            {panel.symbolId || panel.symbolAnimType ? (
              <DynamicIndustrialSymbol
                symbolId={panel.symbolId}
                panel={panel}
                liveValue={lastValue}
                latestValues={latestValues}
                className="w-full h-full min-h-[140px]"
              />
            ) : panel.imageUrl || panel.staticText ? (
              <img
                src={panel.imageUrl || panel.staticText}
                alt={panel.panelName || 'Media'}
                className="max-w-full max-h-full transition-all"
                style={{
                  objectFit: (panel.imageFit as any) || 'contain',
                  opacity: panel.opacity !== undefined ? panel.opacity : 1
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-purple-400/80 p-2">
                <i className="fas fa-file-image text-2xl mb-1"></i>
                <span className="text-[10px] font-bold">Imported Media</span>
              </div>
            )}
          </div>
        );
      }

      case PanelType.ALARM_LOG:
      case 'alarm_log' as any:
        return (
          <div className="w-full h-full flex flex-col">
            <AlarmHistorianWidget panel={panel} />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-start w-full py-0.5">
            {renderHeader(panel.panelName)}
            <span className="text-sm font-bold text-gray-200 mt-1">{rawStringValue || '---'}</span>
          </div>
        );
    }
  };

  return (
    <div className={`
      relative h-full flex flex-col justify-center p-3.5 rounded-2xl border transition-all duration-200 backdrop-blur-md bento-card
      ${activeAlarmZone ? 'ring-2 ring-rose-500 border-rose-500/80 shadow-rose-500/20 shadow-lg' : ''}
      ${isSelected ? 'ring-2 ring-amber-400 border-amber-400' : ''}
      ${isDragging ? 'shadow-2xl ring-2 ring-amber-400' : ''}
      ${isLayoutMode ? 'cursor-pointer hover:border-amber-400' : 'hover:shadow-lg'}
      shadow-md group
    `}>
      {!isLocked && isLayoutMode && dragHandleProps && (
        <div
          {...dragHandleProps.listeners}
          {...dragHandleProps.attributes}
          className="absolute top-2.5 left-2.5 z-20 cursor-grab active:cursor-grabbing text-amber-400 p-1.5 rounded-md bg-slate-900/80 border border-slate-700/60 shadow-md flex items-center justify-center animate-pulse hover:animate-none"
          title="Drag to reorder panel"
        >
          <i className="fas fa-grip-vertical text-xs"></i>
        </div>
      )}

      <div className="flex-grow flex items-center overflow-hidden w-full">
        {renderContent()}
      </div>
      
      {!isLocked && (
        <div className="absolute top-3 right-3 flex items-center space-x-1 z-20" ref={menuRef}>
          {isLayoutMode && onClone && (
            <button 
              onClick={(e) => { e.stopPropagation(); onClone(panel); }}
              className="text-amber-400 hover:text-amber-300 transition-colors p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
              title="Duplicate / Copy Panel"
            >
              <i className="fas fa-copy text-xs"></i>
            </button>
          )}

          <button 
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
            className="text-slate-500 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800/80"
          >
            <i className="fas fa-ellipsis-vertical text-xs"></i>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-7 z-50 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in origin-top-right">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onEdit(panel); }}
                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white flex items-center space-x-2"
              >
                <i className="fas fa-pen text-[10px] text-sky-400"></i>
                <span>Edit</span>
              </button>
              {isLayoutMode && onClone && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onClone(panel); }}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-slate-300 hover:bg-slate-800/80 hover:text-amber-300 flex items-center space-x-2"
                >
                  <i className="fas fa-copy text-[10px] text-amber-400"></i>
                  <span>Duplicate</span>
                </button>
              )}
              <div className="h-[1px] bg-slate-800"></div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(panel.panelId); }}
                className="w-full text-left px-3.5 py-2.5 text-xs text-rose-400 hover:bg-slate-800/80 flex items-center space-x-2"
              >
                <i className="fas fa-trash-can text-[10px]"></i>
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}

      {isLayoutMode && (
        <div className="absolute bottom-2 right-2 z-30 flex items-center space-x-1.5 bg-slate-950/95 border border-amber-500/40 p-1 rounded-xl shadow-2xl backdrop-blur-md">
          {/* Width Selector Dropdown */}
          <div className="flex items-center space-x-1">
            <i className="fas fa-arrows-left-right text-[10px] text-amber-400 pl-0.5"></i>
            <select
              value={panel.colSpan || 1}
              onChange={(e) => {
                e.stopPropagation();
                const newW = Number(e.target.value);
                if (onQuickResize) {
                  onQuickResize(panel.panelId, newW, panel.rowSpan ?? 1);
                } else {
                  onEdit({ ...panel, colSpan: newW });
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 text-amber-300 font-bold font-mono text-[10px] rounded px-1.5 py-0.5 outline-none cursor-pointer hover:border-amber-400"
              title="Select Panel Width"
            >
              <option value={1}>1W (1 Col)</option>
              <option value={2}>2W (2 Cols)</option>
              <option value={3}>3W (3 Cols)</option>
              <option value={4}>4W (Full Row)</option>
            </select>
          </div>

          {/* Height Selector Dropdown */}
          <div className="flex items-center space-x-1 border-l border-slate-800 pl-1.5">
            <i className="fas fa-arrows-up-down text-[10px] text-sky-400"></i>
            <select
              value={panel.rowSpan ?? 1}
              onChange={(e) => {
                e.stopPropagation();
                const newH = Number(e.target.value);
                if (onQuickResize) {
                  onQuickResize(panel.panelId, panel.colSpan || 1, newH);
                } else {
                  onEdit({ ...panel, rowSpan: newH });
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 text-sky-300 font-bold font-mono text-[10px] rounded px-1.5 py-0.5 outline-none cursor-pointer hover:border-sky-400"
              title="Select Panel Height"
            >
              <option value={0}>Slim ⚡ (112px)</option>
              <option value={1}>1H Standard</option>
              <option value={2}>2H Tall</option>
              <option value={3}>3H Large</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelCard;
