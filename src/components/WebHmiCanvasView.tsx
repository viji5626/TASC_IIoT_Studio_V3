import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Panel, PanelType, AppState } from '../types';
import KeypadModal from './KeypadModal';
import { SymbolLibraryModal, IndustrialSymbolItem, convertSvgToPngDataUrl } from './SymbolLibraryModal';
import { DynamicIndustrialSymbol } from './DynamicIndustrialSymbol';
import LineGraph from './LineGraph';
import Gauge from './Gauge';
import { formatPublishPayload, getNormalizedOptions } from '../utils/mqttHelper';
import { getDamanHatcheryProject } from '../utils/damanHatcheryPreset';
import { getSmartIconAnimationClass, SmartIcon } from '../utils/iconAnimator';
import { isPanelTripped } from '../utils/tripHelper';
import { AlarmHistorianWidget } from './AlarmHistorianWidget';

interface WebHmiCanvasViewProps {
  appState: AppState;
  activeDashboardId: string;
  onSelectDashboard?: (dashId: string) => void;
  onUpdateAppState: (newState: AppState) => void;
  onPublish?: (topic: string, payload: string | number) => void;
  latestValues: Record<string, { val: any; time: string }>;
  userRole?: string;
  isFullscreen?: boolean;
  onOpenAddPanel: () => void;
  onEditPanel: (panel: Panel) => void;
  onDeletePanel: (panelId: string) => void;
  onClonePanel?: (panel: Panel) => void;
}

interface DemoPreset {
  id: string;
  title: string;
  desc: string;
  icon: string;
  bgClass: string;
  textClass: string;
  elementCount: number;
}

const CANVAS_PRESET_COLORS = [
  { name: 'Industrial Dark', color: '#030712' },
  { name: 'SCADA Slate', color: '#0f172a' },
  { name: 'Charcoal Grid', color: '#18181b' },
  { name: 'Blueprint Navy', color: '#091e3a' },
  { name: 'Retro Matrix', color: '#021a0f' },
  { name: 'Light Factory Gray', color: '#f1f5f9' },
  { name: 'Pure Dark', color: '#000000' }
];

const getSmoothCurvePath = (pts: Array<{ x: number; y: number }>): string => {
  if (!pts || pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
};

const getPipeFilletPath = (pts: Array<{ x: number; y: number }>, cornerRadius: number = 16): string => {
  if (!pts || pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  if (pts.length === 2) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} L ${pts[1].x.toFixed(2)} ${pts[1].y.toFixed(2)}`;

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2);

    if (len1 < 0.5 || len2 < 0.5) {
      d += ` L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
      continue;
    }

    const r = Math.min(cornerRadius, len1 / 2.05, len2 / 2.05);

    const startX = curr.x - (dx1 / len1) * r;
    const startY = curr.y - (dy1 / len1) * r;
    const endX = curr.x + (dx2 / len2) * r;
    const endY = curr.y + (dy2 / len2) * r;

    d += ` L ${startX.toFixed(2)} ${startY.toFixed(2)}`;
    d += ` Q ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}, ${endX.toFixed(2)} ${endY.toFixed(2)}`;
  }

  const lastPt = pts[pts.length - 1];
  d += ` L ${lastPt.x.toFixed(2)} ${lastPt.y.toFixed(2)}`;

  return d;
};

const ELEMENT_PRESET_COLORS = [
  { name: 'Dark Slate', color: '#0f172a' },
  { name: 'Industrial Black', color: '#020617' },
  { name: 'Emerald Green', color: '#064e3b' },
  { name: 'Navy Blue', color: '#1e3a8a' },
  { name: 'Amber Industrial', color: '#78350f' },
  { name: 'Crimson Red', color: '#881337' },
  { name: 'Charcoal Gray', color: '#27272a' },
  { name: 'Light Slate', color: '#f1f5f9' }
];

const LiveClockWidget: React.FC<{ panel: Panel }> = ({ panel }) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      if (panel.clockFormat === '12h') {
        setTimeStr(now.toLocaleTimeString('en-US', { hour12: true }));
        setDateStr(now.toLocaleDateString());
      } else if (panel.clockFormat === '24h') {
        setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
        setDateStr('');
      } else if (panel.clockFormat === 'time_only') {
        setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setDateStr('');
      } else {
        setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
        setDateStr(now.toLocaleDateString('en-GB'));
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [panel.clockFormat]);

  return (
    <div className="w-full h-full p-2 flex flex-col items-center justify-center text-center overflow-hidden select-none">
      <div className="flex items-center space-x-1 mb-0.5 text-amber-400">
        <i className="fas fa-clock text-xs"></i>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
          {panel.panelName || 'SYSTEM CLOCK'}
        </span>
      </div>
      <div 
        className="font-extrabold font-mono tracking-widest text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
        style={{ fontSize: `${panel.fontSize || 18}px` }}
      >
        {timeStr}
      </div>
      {dateStr && (
        <div className="text-[10px] font-mono font-semibold text-sky-400 mt-0.5">
          {dateStr}
        </div>
      )}
    </div>
  );
};

const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'daman_hatchery',
    title: 'Daman Hatchery (9 Screens Complete)',
    desc: 'Full 9-screen Hatchery HMI with Fan Timers, VFD, Alarms, Sensor Cal & Navigation Buttons',
    icon: 'fa-egg',
    bgClass: 'bg-sky-500/10 border border-sky-500/30',
    textClass: 'text-sky-400 font-black',
    elementCount: 65
  },
  {
    id: 'smarthome',
    title: 'Smart Home Controls',
    desc: 'AC Setpoint, Fan LED, Ambient Switch, Humidity & Light Scenes',
    icon: 'fa-house-signal',
    bgClass: 'bg-amber-500/10 border border-amber-500/30',
    textClass: 'text-amber-400',
    elementCount: 7
  },
  {
    id: 'hvac',
    title: 'Commercial HVAC System',
    desc: 'Supply Fan, Duct Pressure Gauge, Damper Position & Modes',
    icon: 'fa-fan',
    bgClass: 'bg-sky-500/10 border border-sky-500/30',
    textClass: 'text-sky-400',
    elementCount: 7
  },
  {
    id: 'boiler',
    title: 'Thermal Boiler Plant',
    desc: 'Water Temp Gauge, Gas Feed Valve, Heater Switch & E-Stop',
    icon: 'fa-fire-flame-curved',
    bgClass: 'bg-rose-500/10 border border-rose-500/30',
    textClass: 'text-rose-400',
    elementCount: 7
  },
  {
    id: 'motor',
    title: 'Motor & Pump Drive (VFD)',
    desc: 'Motor Run Switch, Speed Slider, RPM Gauge & Vibration Trend',
    icon: 'fa-gears',
    bgClass: 'bg-emerald-500/10 border border-emerald-500/30',
    textClass: 'text-emerald-400',
    elementCount: 7
  },
  {
    id: 'power',
    title: '3-Phase Power & Energy',
    desc: 'Voltage Gauge, Load Current, Demand Limit & Power Load Graph',
    icon: 'fa-bolt',
    bgClass: 'bg-purple-500/10 border border-purple-500/30',
    textClass: 'text-purple-400',
    elementCount: 7
  },
  {
    id: 'water',
    title: 'Water Treatment & Tank',
    desc: 'Tank Storage Gauge, Solenoid Valve, Dosing Pump & pH Setpoint',
    icon: 'fa-faucet-drip',
    bgClass: 'bg-cyan-500/10 border border-cyan-500/30',
    textClass: 'text-cyan-400',
    elementCount: 7
  },
  {
    id: 'assembly',
    title: 'Factory Assembly Line',
    desc: 'Conveyor Run Switch, Belt Speed Slider, Production Rate Gauge',
    icon: 'fa-industry',
    bgClass: 'bg-indigo-500/10 border border-indigo-500/30',
    textClass: 'text-indigo-400',
    elementCount: 7
  },
  {
    id: 'weather',
    title: 'Weather & Environment',
    desc: 'Outdoor Temp, Humidity Gauge, Wind Speed Trend & Telemetry Rate',
    icon: 'fa-cloud-sun',
    bgClass: 'bg-teal-500/10 border border-teal-500/30',
    textClass: 'text-teal-400',
    elementCount: 7
  }
];

export const WebHmiCanvasView: React.FC<WebHmiCanvasViewProps> = ({
  appState,
  activeDashboardId,
  onSelectDashboard,
  onUpdateAppState,
  onPublish,
  latestValues,
  isFullscreen = false,
  onOpenAddPanel,
  onEditPanel,
  onDeletePanel
}) => {
  const isClientMode = appState.userRole === 'client' || appState.productEdition === 'client' || !!appState.isLockedPackage;

  const [isEditMode, setIsEditMode] = useState(!isClientMode);
  const [gridSnap, setGridSnap] = useState(true);

  // Canvas zoom state (0.5x to 2.0x)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);

  // Auto-Fit state & outer canvas dimensions
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1220,
    height: typeof window !== 'undefined' ? window.innerHeight : 750
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        setContainerDimensions({
          width: canvasRef.current.clientWidth || window.innerWidth,
          height: canvasRef.current.clientHeight || window.innerHeight
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current) {
      observer = new ResizeObserver(updateDimensions);
      observer.observe(canvasRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (observer) observer.disconnect();
    };
  }, []);

  const activeScreenPanels = useMemo(() => {
    return appState.panels.filter(p => p.dashboardId === activeDashboardId);
  }, [appState.panels, activeDashboardId]);

  const contentBounds = useMemo(() => {
    if (activeScreenPanels.length === 0) {
      return { width: 1220, height: 750 };
    }
    let maxX = 1220;
    let maxY = 700;
    for (const p of activeScreenPanels) {
      const right = (p.x || 0) + (p.w || 180);
      const bottom = (p.y || 0) + (p.h || 60);
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
    return {
      width: Math.max(1220, maxX + 30),
      height: Math.max(700, maxY + 30)
    };
  }, [activeScreenPanels]);

  const autoFitScale = useMemo(() => {
    if (containerDimensions.width <= 0 || containerDimensions.height <= 0) return 1.0;
    const scaleX = containerDimensions.width / contentBounds.width;
    const scaleY = containerDimensions.height / contentBounds.height;
    return Math.min(scaleX, scaleY);
  }, [containerDimensions, contentBounds]);

  const effectiveScale = (!isEditMode || isAutoFit) && autoFitScale < 1.0
    ? autoFitScale * zoomLevel
    : zoomLevel;

  // Symbol Factory 3.0 Industrial Library Modal State
  const [isSymbolLibraryOpen, setIsSymbolLibraryOpen] = useState<boolean>(false);

  // Canvas Panning state
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartPosRef = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number }>({
    clientX: 0,
    clientY: 0,
    scrollLeft: 0,
    scrollTop: 0
  });

  // Spacebar keydown/keyup listener for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable
      );
      if (!isTyping && e.code === 'Space') {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Panning movement listener
  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const deltaX = e.clientX - panStartPosRef.current.clientX;
      const deltaY = e.clientY - panStartPosRef.current.clientY;
      canvasRef.current.scrollLeft = panStartPosRef.current.scrollLeft - deltaX;
      canvasRef.current.scrollTop = panStartPosRef.current.scrollTop - deltaY;
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  const startPanning = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    setIsPanning(true);
    panStartPosRef.current = {
      clientX,
      clientY,
      scrollLeft: canvasRef.current.scrollLeft,
      scrollTop: canvasRef.current.scrollTop
    };
  };

  useEffect(() => {
    if (isClientMode) {
      setIsEditMode(false);
    }
  }, [isClientMode]);

  // Multi-selection state
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const [masterPanelId, setMasterPanelId] = useState<string | null>(null);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<{ panelId: string; nodeIndex: number } | null>(null);

  // Right-click context menu & clipboard state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    canvasX?: number;
    canvasY?: number;
    panelId?: string;
  }>({ isOpen: false, x: 0, y: 0 });

  const [clipboardPanels, setClipboardPanels] = useState<Panel[]>([]);

  const effectiveEditMode = !isClientMode && isEditMode && !isFullscreen;

  // Keypad popup state
  const [keypadConfig, setKeypadConfig] = useState<{
    isOpen: boolean;
    panel?: Panel;
    currentVal?: number | string;
  }>({ isOpen: false });

  // Local state for range sliders and text inputs on canvas
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [textInputValues, setTextInputValues] = useState<Record<string, string>>({});
  const [textInputErrors, setTextInputErrors] = useState<Record<string, string | null>>({});

  // History Stack for Undo / Redo in Design Window
  const historyRef = useRef<AppState[]>([appState]);
  const historyIndexRef = useRef<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Sync initial history stack on mount or dashboard change
  useEffect(() => {
    if (historyRef.current.length === 0 || historyRef.current[0] !== appState) {
      historyRef.current = [appState];
      historyIndexRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [activeDashboardId]);

  const updateAppStateWithHistory = useCallback((newState: AppState, pushHistory = true) => {
    if (pushHistory) {
      const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      currentHistory.push(newState);
      if (currentHistory.length > 50) currentHistory.shift();
      historyRef.current = currentHistory;
      historyIndexRef.current = currentHistory.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
    }
    onUpdateAppState(newState);
  }, [onUpdateAppState]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prev = historyRef.current[historyIndexRef.current];
      onUpdateAppState(prev);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, [onUpdateAppState]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const next = historyRef.current[historyIndexRef.current];
      onUpdateAppState(next);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, [onUpdateAppState]);

  // Cut, Copy, and Paste Handlers
  const handleCopySelected = useCallback(() => {
    if (selectedPanelIds.length === 0) return;
    const selected = appState.panels.filter(p => selectedPanelIds.includes(p.panelId));
    const cloned = JSON.parse(JSON.stringify(selected));
    setClipboardPanels(cloned);

    try {
      const jsonStr = JSON.stringify({ type: 'HMI_PANELS', panels: cloned });
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(jsonStr);
      }
    } catch (err) {
      console.log('System clipboard write fallback:', err);
    }

    setPropertyCopiedToast(`Copied ${selected.length} element(s) to clipboard`);
    setTimeout(() => setPropertyCopiedToast(null), 2200);
  }, [selectedPanelIds, appState.panels]);

  const handleCutSelected = useCallback(() => {
    if (selectedPanelIds.length === 0) return;
    handleCopySelected();
    const nextPanels = appState.panels.filter(p => !selectedPanelIds.includes(p.panelId));
    updateAppStateWithHistory({ ...appState, panels: nextPanels });
    setSelectedPanelIds([]);
    setMasterPanelId(null);
    setSelectedNodeInfo(null);
    setPropertyCopiedToast(`Cut ${selectedPanelIds.length} element(s) to clipboard`);
    setTimeout(() => setPropertyCopiedToast(null), 2200);
  }, [selectedPanelIds, appState.panels, handleCopySelected, updateAppStateWithHistory]);

  const handlePasteFromClipboard = useCallback(async (targetPos?: { x: number; y: number }) => {
    const pasteX = targetPos ? targetPos.x : 140;
    const pasteY = targetPos ? targetPos.y : 140;
    const activeConnId = appState.connections?.[0]?.connectionId || '';

    // Case 1: In-Memory Copied HMI Panels
    if (clipboardPanels.length > 0) {
      const minX = Math.min(...clipboardPanels.map(p => p.x ?? 100));
      const minY = Math.min(...clipboardPanels.map(p => p.y ?? 100));

      const newPanels: Panel[] = [];
      const newIds: string[] = [];

      clipboardPanels.forEach(p => {
        const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const deltaX = (p.x ?? 100) - minX;
        const deltaY = (p.y ?? 100) - minY;

        const pasted: Panel = {
          ...JSON.parse(JSON.stringify(p)),
          panelId: newId,
          dashboardId: activeDashboardId,
          connectionId: activeConnId,
          x: targetPos ? pasteX + deltaX : (p.x ?? 100) + 25,
          y: targetPos ? pasteY + deltaY : (p.y ?? 100) + 25
        };
        newPanels.push(pasted);
        newIds.push(newId);
      });

      const nextAppState = {
        ...appState,
        panels: [...appState.panels, ...newPanels]
      };
      updateAppStateWithHistory(nextAppState);
      setSelectedPanelIds(newIds);
      setMasterPanelId(newIds[0] || null);
      setPropertyCopiedToast(`Pasted ${newPanels.length} element(s)`);
      setTimeout(() => setPropertyCopiedToast(null), 2200);
      return;
    }

    // Case 2: Read System Clipboard (Image or Text)
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              if (dataUrl) {
                const newId = `p_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                const newImgPanel: Panel = {
                  panelId: newId,
                  dashboardId: activeDashboardId,
                  connectionId: activeConnId,
                  panelName: 'Pasted Image',
                  type: PanelType.IMAGE,
                  topic: 'static/media',
                  imageUrl: dataUrl,
                  staticText: dataUrl,
                  x: pasteX,
                  y: pasteY,
                  w: 260,
                  h: 180,
                  borderColor: '#0284c7',
                  borderWidth: 1,
                  borderRadius: 8,
                  imageFit: 'contain'
                };
                updateAppStateWithHistory({
                  ...appState,
                  panels: [...appState.panels, newImgPanel]
                });
                setSelectedPanelIds([newId]);
                setMasterPanelId(newId);
                setPropertyCopiedToast('Pasted Image from Clipboard');
                setTimeout(() => setPropertyCopiedToast(null), 2200);
              }
            };
            reader.readAsDataURL(blob);
            return;
          }

          if (item.types.includes('text/plain')) {
            const blob = await item.getType('text/plain');
            const text = await blob.text();
            if (text && text.trim()) {
              try {
                const parsed = JSON.parse(text);
                if (parsed && parsed.type === 'HMI_PANELS' && Array.isArray(parsed.panels) && parsed.panels.length > 0) {
                  setClipboardPanels(parsed.panels);
                  const minX = Math.min(...parsed.panels.map((p: any) => p.x ?? 100));
                  const minY = Math.min(...parsed.panels.map((p: any) => p.y ?? 100));

                  const newPanels: Panel[] = [];
                  const newIds: string[] = [];

                  parsed.panels.forEach((p: any) => {
                    const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                    const deltaX = (p.x ?? 100) - minX;
                    const deltaY = (p.y ?? 100) - minY;

                    const pasted: Panel = {
                      ...JSON.parse(JSON.stringify(p)),
                      panelId: newId,
                      dashboardId: activeDashboardId,
                      connectionId: activeConnId,
                      x: targetPos ? pasteX + deltaX : (p.x ?? 100) + 25,
                      y: targetPos ? pasteY + deltaY : (p.y ?? 100) + 25
                    };
                    newPanels.push(pasted);
                    newIds.push(newId);
                  });

                  updateAppStateWithHistory({
                    ...appState,
                    panels: [...appState.panels, ...newPanels]
                  });
                  setSelectedPanelIds(newIds);
                  setMasterPanelId(newIds[0] || null);
                  setPropertyCopiedToast(`Pasted ${newPanels.length} element(s)`);
                  setTimeout(() => setPropertyCopiedToast(null), 2200);
                  return;
                }
              } catch {}

              const newId = `p_txt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              const newTextPanel: Panel = {
                panelId: newId,
                dashboardId: activeDashboardId,
                connectionId: activeConnId,
                panelName: 'Pasted Text',
                type: PanelType.STATIC_TEXT,
                topic: 'static/text',
                staticText: text.trim(),
                x: pasteX,
                y: pasteY,
                w: Math.max(160, Math.min(400, text.trim().length * 12)),
                h: 50,
                fontSize: '18',
                textColor: '#38bdf8',
                bgColor: '#0f172a',
                borderColor: '#1e293b',
                borderWidth: 1,
                borderRadius: 8,
                textAlign: 'center'
              };
              updateAppStateWithHistory({
                ...appState,
                panels: [...appState.panels, newTextPanel]
              });
              setSelectedPanelIds([newId]);
              setMasterPanelId(newId);
              setPropertyCopiedToast('Pasted Text as Static Text Element');
              setTimeout(() => setPropertyCopiedToast(null), 2200);
              return;
            }
          }
        }
      } else if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          try {
            const parsed = JSON.parse(text);
            if (parsed && parsed.type === 'HMI_PANELS' && Array.isArray(parsed.panels) && parsed.panels.length > 0) {
              setClipboardPanels(parsed.panels);
              const minX = Math.min(...parsed.panels.map((p: any) => p.x ?? 100));
              const minY = Math.min(...parsed.panels.map((p: any) => p.y ?? 100));

              const newPanels: Panel[] = [];
              const newIds: string[] = [];

              parsed.panels.forEach((p: any) => {
                const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const deltaX = (p.x ?? 100) - minX;
                const deltaY = (p.y ?? 100) - minY;

                const pasted: Panel = {
                  ...JSON.parse(JSON.stringify(p)),
                  panelId: newId,
                  dashboardId: activeDashboardId,
                  connectionId: activeConnId,
                  x: targetPos ? pasteX + deltaX : (p.x ?? 100) + 25,
                  y: targetPos ? pasteY + deltaY : (p.y ?? 100) + 25
                };
                newPanels.push(pasted);
                newIds.push(newId);
              });

              updateAppStateWithHistory({
                ...appState,
                panels: [...appState.panels, ...newPanels]
              });
              setSelectedPanelIds(newIds);
              setMasterPanelId(newIds[0] || null);
              setPropertyCopiedToast(`Pasted ${newPanels.length} element(s)`);
              setTimeout(() => setPropertyCopiedToast(null), 2200);
              return;
            }
          } catch {}

          const newId = `p_txt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const newTextPanel: Panel = {
            panelId: newId,
            dashboardId: activeDashboardId,
            connectionId: activeConnId,
            panelName: 'Pasted Text',
            type: PanelType.STATIC_TEXT,
            topic: 'static/text',
            staticText: text.trim(),
            x: pasteX,
            y: pasteY,
            w: Math.max(160, Math.min(400, text.trim().length * 12)),
            h: 50,
            fontSize: '18',
            textColor: '#38bdf8',
            bgColor: '#0f172a',
            borderColor: '#1e293b',
            borderWidth: 1,
            borderRadius: 8,
            textAlign: 'center'
          };
          updateAppStateWithHistory({
            ...appState,
            panels: [...appState.panels, newTextPanel]
          });
          setSelectedPanelIds([newId]);
          setMasterPanelId(newId);
          setPropertyCopiedToast('Pasted Text as Static Text Element');
          setTimeout(() => setPropertyCopiedToast(null), 2200);
        }
      }
    } catch (err) {
      console.log('System clipboard read fallback:', err);
    }
  }, [clipboardPanels, activeDashboardId, appState, updateAppStateWithHistory]);

  // Global Keyboard Shortcut Listener for Undo, Redo, Cut, Copy, Paste, Duplicate
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (!effectiveEditMode) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || (target as any).isContentEditable)) {
        return;
      }
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd) {
        if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'z' || e.key === 'Z') && e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          handleCopySelected();
        } else if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          handleCutSelected();
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          handlePasteFromClipboard();
        }
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [effectiveEditMode, handleUndo, handleRedo, handleCopySelected, handleCutSelected, handlePasteFromClipboard]);

  // Global Window Paste Event Listener for External Images & Text
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      if (!effectiveEditMode) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || (target as any).isContentEditable)) {
        return;
      }
      const activeConnId = appState.connections?.[0]?.connectionId || '';

      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            if (dataUrl) {
              const newId = `p_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              const newImgPanel: Panel = {
                panelId: newId,
                dashboardId: activeDashboardId,
                connectionId: activeConnId,
                panelName: 'Pasted Image',
                type: PanelType.IMAGE,
                topic: 'static/media',
                imageUrl: dataUrl,
                staticText: dataUrl,
                x: 180,
                y: 140,
                w: 260,
                h: 180,
                borderColor: '#0284c7',
                borderWidth: 1,
                borderRadius: 8,
                imageFit: 'contain'
              };
              updateAppStateWithHistory({
                ...appState,
                panels: [...appState.panels, newImgPanel]
              });
              setSelectedPanelIds([newId]);
              setMasterPanelId(newId);
              setPropertyCopiedToast('Pasted Image from Clipboard');
              setTimeout(() => setPropertyCopiedToast(null), 2200);
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      if (clipboardPanels.length > 0 || (e.clipboardData && e.clipboardData.getData('text/plain'))) {
        e.preventDefault();
        handlePasteFromClipboard();
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [effectiveEditMode, clipboardPanels, handlePasteFromClipboard, activeDashboardId, appState, updateAppStateWithHistory]);

  // Arrow Keys Listener for moving Selected Bending Point (or Nudging Selected Panel)
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (!effectiveEditMode) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || (target as any).isContentEditable)) {
        return;
      }

      const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
      if (!isArrow) return;

      // Priority 1: Move selected bending point if active
      if (selectedNodeInfo) {
        const { panelId, nodeIndex } = selectedNodeInfo;
        const targetPanel = appState.panels.find(p => p.panelId === panelId);
        if (targetPanel && selectedPanelIds.includes(panelId)) {
          e.preventDefault();
          const currentPts = targetPanel.shapePoints
            ? [...targetPanel.shapePoints]
            : (targetPanel.shapeType === 'polyline' || targetPanel.shapeType === 'line' || targetPanel.shapeType === 'pipe' || targetPanel.type === PanelType.PIPE || (targetPanel.type as string) === 'pipe'
                ? [{ x: 0, y: 50 }, { x: 50, y: 50 }, { x: 100, y: 50 }]
                : [{ x: 50, y: 5 }, { x: 95, y: 35 }, { x: 80, y: 95 }, { x: 20, y: 95 }, { x: 5, y: 35 }]);

          if (nodeIndex >= 0 && nodeIndex < currentPts.length) {
            const step = e.shiftKey ? 5 : 1;
            let { x, y } = currentPts[nodeIndex];

            if (e.key === 'ArrowLeft') x = Math.max(0, x - step);
            if (e.key === 'ArrowRight') x = Math.min(100, x + step);
            if (e.key === 'ArrowUp') y = Math.max(0, y - step);
            if (e.key === 'ArrowDown') y = Math.min(100, y + step);

            currentPts[nodeIndex] = { x, y };

            const updatedPanels = appState.panels.map(p => {
              if (p.panelId === panelId) {
                return { ...p, shapePoints: currentPts };
              }
              return p;
            });
            onUpdateAppState({ ...appState, panels: updatedPanels });
          }
          return;
        }
      }

      // Priority 2: Nudge selected panel(s) canvas position
      if (selectedPanelIds.length > 0) {
        e.preventDefault();
        const nudgeStep = e.shiftKey ? 10 : (gridSnap ? 10 : 1);
        const updatedPanels = appState.panels.map(p => {
          if (selectedPanelIds.includes(p.panelId)) {
            let newX = p.x ?? 0;
            let newY = p.y ?? 0;
            if (e.key === 'ArrowLeft') newX = Math.max(0, newX - nudgeStep);
            if (e.key === 'ArrowRight') newX = newX + nudgeStep;
            if (e.key === 'ArrowUp') newY = Math.max(0, newY - nudgeStep);
            if (e.key === 'ArrowDown') newY = newY + nudgeStep;
            return { ...p, x: newX, y: newY };
          }
          return p;
        });
        onUpdateAppState({ ...appState, panels: updatedPanels });
      }
    };

    window.addEventListener('keydown', handleArrowKeys);
    return () => window.removeEventListener('keydown', handleArrowKeys);
  }, [effectiveEditMode, selectedNodeInfo, selectedPanelIds, appState, gridSnap, onUpdateAppState]);

  // Add Geometrical / Vector Shape to Canvas
  const handleAddVectorShape = (shapeTypeVal: string) => {
    if (!shapeTypeVal) return;
    const newId = `p_shape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const activeConnId = appState.connections?.[0]?.connectionId || '';

    let defaultPoints: Array<{ x: number; y: number }> | undefined;
    if (shapeTypeVal === 'polyline' || shapeTypeVal === 'line' || shapeTypeVal === 'pipe') {
      defaultPoints = [
        { x: 0, y: 50 },
        { x: 50, y: 50 },
        { x: 100, y: 50 }
      ];
    } else if (shapeTypeVal === 'polygon' || shapeTypeVal === 'custom_polygon') {
      defaultPoints = [
        { x: 50, y: 5 },
        { x: 95, y: 35 },
        { x: 80, y: 95 },
        { x: 20, y: 95 },
        { x: 5, y: 35 }
      ];
    }

    const newShapePanel: Panel = {
      panelId: newId,
      dashboardId: activeDashboardId,
      connectionId: activeConnId,
      panelName: '',
      type: shapeTypeVal === 'pipe' ? PanelType.PIPE : PanelType.SHAPE,
      shapeType: shapeTypeVal as any,
      shapePoints: defaultPoints,
      topic: 'static/shape',
      x: 120,
      y: 120,
      w: shapeTypeVal === 'line' || shapeTypeVal === 'polyline' ? 220 : shapeTypeVal === 'pipe' ? 240 : 160,
      h: shapeTypeVal === 'line' || shapeTypeVal === 'polyline' ? 70 : shapeTypeVal === 'pipe' ? 40 : 120,
      bgColor: shapeTypeVal === 'rectangle' ? 'rgba(15, 23, 42, 0.7)' : 'transparent',
      borderColor: shapeTypeVal === 'star' ? '#f59e0b' : shapeTypeVal === 'arrow' ? '#10b981' : '#38bdf8',
      borderWidth: 2,
      borderRadius: shapeTypeVal === 'circle' ? 999 : 0,
      textColor: '#ffffff'
    };

    const nextAppState = {
      ...appState,
      panels: [...appState.panels, newShapePanel]
    };
    updateAppStateWithHistory(nextAppState);
    setSelectedPanelIds([newId]);
    setMasterPanelId(newId);
  };

  const handleSendTextInput = (panel: Panel, rawVal: string) => {
    const trimmed = rawVal.trim();
    if (!trimmed) return;

    if (panel.dataType !== 'text') {
      const numVal = Number(trimmed);
      const min = panel.payloadMin ?? 0;
      const max = panel.payloadMax ?? 100;
      if (!isNaN(numVal)) {
        if (numVal < min || numVal > max) {
          setTextInputErrors(prev => ({
            ...prev,
            [panel.panelId]: `Limit error: ${min}..${max}`
          }));
          return;
        }
      }
    }

    setTextInputErrors(prev => ({ ...prev, [panel.panelId]: null }));
    const targetTopic = panel.publishTopic?.trim() || panel.topic?.trim();
    if (onPublish && targetTopic) {
      onPublish(targetTopic, formatPublishPayload(trimmed, panel));
    }
    if (panel.clearOnPublish) {
      setTextInputValues(prev => ({ ...prev, [panel.panelId]: '' }));
    }
  };

  // Mouse dragging & marquee selection state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [draggingNode, setDraggingNode] = useState<{ panelId: string; nodeIndex: number } | null>(null);
  const hasDraggedMarqueeRef = useRef(false);
  const justFinishedMarqueeRef = useRef(false);

  const dragStartPos = useRef<{
    mouseX: number;
    mouseY: number;
    initialPositions: Record<string, { x: number; y: number }>;
  }>({
    mouseX: 0,
    mouseY: 0,
    initialPositions: {}
  });

  // Canvas Mouse Down: Supports Panning (Pan Tool, Middle Click, Spacebar, Zoom > 1x) and Marquee Selection
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isCanvasSelf = target === canvasRef.current || target.id === 'hmi-canvas-background' || target.dataset.canvasBg === 'true';

    // Panning activation: Middle click (button 1), Pan Mode enabled, Spacebar pressed, or Left drag on background when zoom > 1x
    if (e.button === 1 || isPanMode || isSpacePressed || (e.button === 0 && zoomLevel > 1.0 && isCanvasSelf)) {
      e.preventDefault();
      startPanning(e.clientX, e.clientY);
      if (e.button === 1 || isPanMode || isSpacePressed) {
        return;
      }
    }

    if (!effectiveEditMode || e.button !== 0) return;

    if (isCanvasSelf) {
      if (contextMenu.isOpen) setContextMenu({ isOpen: false, x: 0, y: 0 });

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const scrollLeft = canvasRef.current?.scrollLeft || 0;
      const scrollTop = canvasRef.current?.scrollTop || 0;

      const startX = (e.clientX - rect.left + scrollLeft) / zoomLevel;
      const startY = (e.clientY - rect.top + scrollTop) / zoomLevel;

      hasDraggedMarqueeRef.current = false;
      setIsMarqueeSelecting(true);
      setMarqueeRect({ startX, startY, currentX: startX, currentY: startY });

      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setSelectedPanelIds([]);
        setMasterPanelId(null);
      }
    }
  };

  // Node Dragging & Selection Handler for Polyline and Custom Polygon Vertices
  const handleNodeMouseDown = (e: React.MouseEvent, panelId: string, nodeIndex: number) => {
    if (!effectiveEditMode) return;
    e.stopPropagation();
    setSelectedNodeInfo({ panelId, nodeIndex });
    setDraggingNode({ panelId, nodeIndex });
  };

  const handleAddShapeNode = (panel: Panel) => {
    const pts = panel.shapePoints
      ? [...panel.shapePoints]
      : [{ x: 0, y: 50 }, { x: 50, y: 50 }, { x: 100, y: 50 }];

    let insertIdx = pts.length - 1;
    if (selectedNodeInfo && selectedNodeInfo.panelId === panel.panelId && selectedNodeInfo.nodeIndex < pts.length) {
      insertIdx = selectedNodeInfo.nodeIndex;
    }

    let newPt: { x: number; y: number };
    if (insertIdx < pts.length - 1) {
      const p1 = pts[insertIdx];
      const p2 = pts[insertIdx + 1];
      newPt = {
        x: Math.round((p1.x + p2.x) / 2),
        y: Math.round((p1.y + p2.y) / 2)
      };
    } else {
      const lastPt = pts[pts.length - 1] || { x: 100, y: 50 };
      const prevPt = pts[pts.length - 2] || { x: 50, y: 50 };
      newPt = {
        x: Math.round((lastPt.x + prevPt.x) / 2),
        y: Math.round((lastPt.y + prevPt.y) / 2) + 15
      };
    }

    pts.splice(insertIdx + 1, 0, newPt);
    updateSelectedPanelProp('shapePoints', pts);
    setSelectedNodeInfo({ panelId: panel.panelId, nodeIndex: insertIdx + 1 });
  };

  const handleRemoveShapeNode = (panel: Panel) => {
    const pts = panel.shapePoints
      ? [...panel.shapePoints]
      : [{ x: 0, y: 50 }, { x: 50, y: 50 }, { x: 100, y: 50 }];
    if (pts.length <= 2) return;

    let removeIdx = pts.length - 1;
    if (selectedNodeInfo && selectedNodeInfo.panelId === panel.panelId && selectedNodeInfo.nodeIndex < pts.length) {
      removeIdx = selectedNodeInfo.nodeIndex;
    }

    pts.splice(removeIdx, 1);
    updateSelectedPanelProp('shapePoints', pts);
    setSelectedNodeInfo(null);
  };

  const activeDashboard = appState.dashboards.find(d => d.dashboardId === activeDashboardId) || appState.dashboards[0];
  const panels = appState.panels.filter(p => p.dashboardId === activeDashboardId);

  const primarySelectedPanelId = masterPanelId && selectedPanelIds.includes(masterPanelId)
    ? masterPanelId
    : (selectedPanelIds[selectedPanelIds.length - 1] || null);

  const selectedPanel = panels.find(p => p.panelId === primarySelectedPanelId);
  const masterPanel = panels.find(p => p.panelId === masterPanelId) || selectedPanel;

  // Screen background color
  const screenBgColor = activeDashboard?.canvasBgColor || activeDashboard?.bgColor || '#030712';

  // Close context menu on global click or Escape key
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.isOpen) setContextMenu({ isOpen: false, x: 0, y: 0 });
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu({ isOpen: false, x: 0, y: 0 });
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.isOpen]);

  // Ctrl + Mouse Wheel & Touch Pinch-to-zoom listener
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
        setZoomLevel(prev => Math.min(2.0, Math.max(0.5, Number((prev + zoomDelta).toFixed(2)))));
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartDistRef.current = dist;
        touchStartZoomRef.current = zoomLevel;
      } else if (e.touches.length === 1 && (zoomLevel > 1.0 || isPanMode || isSpacePressed)) {
        const touch = e.touches[0];
        startPanning(touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDistRef.current !== null) {
        e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scaleFactor = currentDist / touchStartDistRef.current;
        const newZoom = Math.min(2.0, Math.max(0.5, Number((touchStartZoomRef.current * scaleFactor).toFixed(2))));
        setZoomLevel(newZoom);
      } else if (e.touches.length === 1 && isPanning && canvasRef.current) {
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = touch.clientX - panStartPosRef.current.clientX;
        const deltaY = touch.clientY - panStartPosRef.current.clientY;
        canvasRef.current.scrollLeft = panStartPosRef.current.scrollLeft - deltaX;
        canvasRef.current.scrollTop = panStartPosRef.current.scrollTop - deltaY;
      }
    };

    const handleTouchEnd = () => {
      touchStartDistRef.current = null;
    };

    canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    canvasEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvasEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      canvasEl.removeEventListener('wheel', handleWheel);
      canvasEl.removeEventListener('touchstart', handleTouchStart);
      canvasEl.removeEventListener('touchmove', handleTouchMove);
      canvasEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zoomLevel]);

  // Ensure panels have default x, y, w, h if missing
  const getPanelPos = (p: Panel, index: number) => {
    const defaultWidth = p.type === PanelType.STATIC_TEXT ? 220 : p.type === PanelType.LED ? 140 : p.type === PanelType.SLIDER ? 200 : 180;
    const defaultHeight = p.type === PanelType.STATIC_TEXT ? 45 : p.type === PanelType.LED ? 60 : p.type === PanelType.SLIDER ? 75 : 70;
    const cols = 4;
    const defaultX = (index % cols) * 200 + 20;
    const defaultY = Math.floor(index / cols) * 90 + 80;

    return {
      x: p.x !== undefined ? p.x : defaultX,
      y: p.y !== undefined ? p.y : defaultY,
      w: p.w !== undefined ? p.w : defaultWidth,
      h: p.h !== undefined ? p.h : defaultHeight
    };
  };

  // Update canvas screen background color
  const updateCanvasBgColor = (color: string) => {
    const updatedDashboards = appState.dashboards.map(d => {
      if (d.dashboardId === activeDashboardId) {
        return { ...d, bgColor: color, canvasBgColor: color };
      }
      return d;
    });
    onUpdateAppState({ ...appState, dashboards: updatedDashboards });
  };

  // Update selected panel properties
  const updateSelectedPanelProp = (key: keyof Panel, value: any) => {
    if (selectedPanelIds.length === 0) return;
    const updatedPanels = appState.panels.map(p => {
      if (selectedPanelIds.includes(p.panelId)) {
        return { ...p, [key]: value };
      }
      return p;
    });
    onUpdateAppState({ ...appState, panels: updatedPanels });
  };

  // Copy / Paste Element Visual Properties State
  const [copiedProperties, setCopiedProperties] = useState<Partial<Panel> | null>(null);
  const [propertyCopiedToast, setPropertyCopiedToast] = useState<string | null>(null);

  // Copy & Paste Visual Formatting Properties
  const handleCopyProperties = () => {
    const targetPanel = selectedPanel || masterPanel;
    if (!targetPanel) return;

    const propsToCopy: Partial<Panel> = {
      bgColor: targetPanel.bgColor,
      textColor: targetPanel.textColor,
      borderColor: targetPanel.borderColor,
      borderWidth: targetPanel.borderWidth,
      borderRadius: targetPanel.borderRadius,
      opacity: targetPanel.opacity,
      rotation: targetPanel.rotation,
      shadowEnabled: targetPanel.shadowEnabled,
      shadowColor: targetPanel.shadowColor,
      shadowIntensity: targetPanel.shadowIntensity,
      fontSize: targetPanel.fontSize,
      fontFamily: targetPanel.fontFamily,
      textAlign: targetPanel.textAlign,
      buttonStyle: targetPanel.buttonStyle,
      firstColor: targetPanel.firstColor,
      secondColor: targetPanel.secondColor,
      thirdColor: targetPanel.thirdColor,
      iconColorOn: targetPanel.iconColorOn,
      iconColorOff: targetPanel.iconColorOff,
      imageFit: targetPanel.imageFit
    };

    setCopiedProperties(propsToCopy);
    setPropertyCopiedToast(`Copied property from "${targetPanel.panelName || 'Element'}"`);
    setTimeout(() => setPropertyCopiedToast(null), 2500);
  };

  const handlePasteProperties = () => {
    if (!copiedProperties || selectedPanelIds.length === 0) return;

    const updatedPanels = appState.panels.map(p => {
      if (selectedPanelIds.includes(p.panelId)) {
        return {
          ...p,
          ...copiedProperties
        };
      }
      return p;
    });

    updateAppStateWithHistory({ ...appState, panels: updatedPanels });
    setPropertyCopiedToast(`Pasted property to ${selectedPanelIds.length} element(s)`);
    setTimeout(() => setPropertyCopiedToast(null), 2500);
  };

  // Layering (Z-Index / Stack Order) Controls
  const handleBringToVeryFront = () => {
    if (selectedPanelIds.length === 0) return;
    const currentPanels = [...appState.panels];
    const unselected = currentPanels.filter(p => !selectedPanelIds.includes(p.panelId));
    const selected = currentPanels.filter(p => selectedPanelIds.includes(p.panelId));
    const newPanels = [...unselected, ...selected];
    updateAppStateWithHistory({ ...appState, panels: newPanels });
  };

  const handleSendToVeryBack = () => {
    if (selectedPanelIds.length === 0) return;
    const currentPanels = [...appState.panels];
    const unselected = currentPanels.filter(p => !selectedPanelIds.includes(p.panelId));
    const selected = currentPanels.filter(p => selectedPanelIds.includes(p.panelId));
    const newPanels = [...selected, ...unselected];
    updateAppStateWithHistory({ ...appState, panels: newPanels });
  };

  const handleBringOneLayerFront = () => {
    if (selectedPanelIds.length === 0) return;
    const currentPanels = [...appState.panels];
    for (let i = currentPanels.length - 2; i >= 0; i--) {
      if (
        selectedPanelIds.includes(currentPanels[i].panelId) &&
        !selectedPanelIds.includes(currentPanels[i + 1].panelId)
      ) {
        const temp = currentPanels[i];
        currentPanels[i] = currentPanels[i + 1];
        currentPanels[i + 1] = temp;
      }
    }
    updateAppStateWithHistory({ ...appState, panels: currentPanels });
  };

  const handleSendOneLayerBack = () => {
    if (selectedPanelIds.length === 0) return;
    const currentPanels = [...appState.panels];
    for (let i = 1; i < currentPanels.length; i++) {
      if (
        selectedPanelIds.includes(currentPanels[i].panelId) &&
        !selectedPanelIds.includes(currentPanels[i - 1].panelId)
      ) {
        const temp = currentPanels[i];
        currentPanels[i] = currentPanels[i - 1];
        currentPanels[i - 1] = temp;
      }
    }
    updateAppStateWithHistory({ ...appState, panels: currentPanels });
  };

  // Select Panel with Shift/Ctrl multi-selection support
  const handlePanelSelect = (panelId: string, isShiftOrCtrl: boolean) => {
    const targetPanel = panels.find(p => p.panelId === panelId);
    if (!targetPanel) return;

    // Expand group members if target belongs to a group
    const groupMembers = targetPanel.groupId
      ? panels.filter(p => p.groupId === targetPanel.groupId).map(p => p.panelId)
      : [panelId];

    if (isShiftOrCtrl) {
      const isAlreadySelected = selectedPanelIds.includes(panelId);
      if (isAlreadySelected) {
        const nextSelected = selectedPanelIds.filter(id => !groupMembers.includes(id));
        setSelectedPanelIds(nextSelected);
        if (masterPanelId === panelId || groupMembers.includes(masterPanelId || '')) {
          setMasterPanelId(nextSelected[nextSelected.length - 1] || null);
        }
      } else {
        const nextSelected = Array.from(new Set([...selectedPanelIds, ...groupMembers]));
        setSelectedPanelIds(nextSelected);
        setMasterPanelId(panelId); // Clicked element becomes master reference
      }
    } else {
      setSelectedPanelIds(groupMembers);
      setMasterPanelId(panelId);
    }
  };

  // Mouse Handlers for dragging multiple selected elements
  const handleMouseDown = (e: React.MouseEvent, panelId: string) => {
    if (!effectiveEditMode) return;
    e.stopPropagation();

    if (contextMenu.isOpen) setContextMenu({ isOpen: false, x: 0, y: 0 });

    const isShiftOrCtrl = e.shiftKey || e.ctrlKey || e.metaKey;

    let activeSelection = selectedPanelIds;

    if (!selectedPanelIds.includes(panelId) && !isShiftOrCtrl) {
      const targetPanel = panels.find(p => p.panelId === panelId);
      const groupMembers = targetPanel?.groupId
        ? panels.filter(p => p.groupId === targetPanel.groupId).map(p => p.panelId)
        : [panelId];
      activeSelection = groupMembers;
      setSelectedPanelIds(groupMembers);
      setMasterPanelId(panelId);
    } else if (isShiftOrCtrl) {
      handlePanelSelect(panelId, true);
      const isAlreadySelected = selectedPanelIds.includes(panelId);
      if (!isAlreadySelected) {
        activeSelection = [...selectedPanelIds, panelId];
      }
    }

    setIsDragging(true);

    const initialPosMap: Record<string, { x: number; y: number }> = {};
    activeSelection.forEach(id => {
      const p = appState.panels.find(item => item.panelId === id);
      if (p) {
        const idx = panels.findIndex(item => item.panelId === id);
        const pos = getPanelPos(p, idx);
        initialPosMap[id] = { x: pos.x, y: pos.y };
      }
    });

    dragStartPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialPositions: initialPosMap
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || selectedPanelIds.length === 0) return;

      const deltaX = (e.clientX - dragStartPos.current.mouseX) / zoomLevel;
      const deltaY = (e.clientY - dragStartPos.current.mouseY) / zoomLevel;

      const updatedPanels = appState.panels.map(p => {
        if (selectedPanelIds.includes(p.panelId)) {
          const init = dragStartPos.current.initialPositions[p.panelId];
          if (init) {
            let newX = init.x + deltaX;
            let newY = init.y + deltaY;

            if (gridSnap) {
              newX = Math.round(newX / 10) * 10;
              newY = Math.round(newY / 10) * 10;
            }

            newX = Math.max(0, newX);
            newY = Math.max(0, newY);

            return { ...p, x: newX, y: newY };
          }
        }
        return p;
      });

      onUpdateAppState({ ...appState, panels: updatedPanels });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, selectedPanelIds, gridSnap, appState, zoomLevel]);

  // Effect for Marquee Drag Box Selection
  useEffect(() => {
    const handleMarqueeMouseMove = (e: MouseEvent) => {
      if (!isMarqueeSelecting || !marqueeRect || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scrollLeft = canvasRef.current.scrollLeft || 0;
      const scrollTop = canvasRef.current.scrollTop || 0;

      const currentX = (e.clientX - rect.left + scrollLeft) / zoomLevel;
      const currentY = (e.clientY - rect.top + scrollTop) / zoomLevel;

      if (Math.abs(currentX - marqueeRect.startX) > 4 || Math.abs(currentY - marqueeRect.startY) > 4) {
        hasDraggedMarqueeRef.current = true;
      }

      setMarqueeRect(prev => prev ? { ...prev, currentX, currentY } : null);

      const left = Math.min(marqueeRect.startX, currentX);
      const top = Math.min(marqueeRect.startY, currentY);
      const right = Math.max(marqueeRect.startX, currentX);
      const bottom = Math.max(marqueeRect.startY, currentY);

      const selectedIds: string[] = [];
      panels.forEach((p, idx) => {
        const pos = getPanelPos(p, idx);
        const pLeft = pos.x;
        const pTop = pos.y;
        const pRight = pos.x + pos.w;
        const pBottom = pos.y + pos.h;

        if (pLeft < right && pRight > left && pTop < bottom && pBottom > top) {
          selectedIds.push(p.panelId);
        }
      });

      setSelectedPanelIds(selectedIds);
      if (selectedIds.length > 0) {
        setMasterPanelId(selectedIds[selectedIds.length - 1]);
      }
    };

    const handleMarqueeMouseUp = () => {
      if (isMarqueeSelecting) {
        setIsMarqueeSelecting(false);
        setMarqueeRect(null);
        if (hasDraggedMarqueeRef.current) {
          justFinishedMarqueeRef.current = true;
          hasDraggedMarqueeRef.current = false;
        }
      }
    };

    if (isMarqueeSelecting) {
      window.addEventListener('mousemove', handleMarqueeMouseMove);
      window.addEventListener('mouseup', handleMarqueeMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMarqueeMouseMove);
        window.removeEventListener('mouseup', handleMarqueeMouseUp);
      };
    }
  }, [isMarqueeSelecting, marqueeRect, panels]);

  // Effect for Node Point Vertex Dragging
  useEffect(() => {
    const handleNodeMouseMove = (e: MouseEvent) => {
      if (!draggingNode || !canvasRef.current) return;
      const { panelId, nodeIndex } = draggingNode;
      const targetPanel = appState.panels.find(p => p.panelId === panelId);
      if (!targetPanel) return;

      const el = document.getElementById(`hmi-panel-${panelId}`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const mouseRelX = e.clientX - rect.left;
      const mouseRelY = e.clientY - rect.top;

      const pctX = Math.max(0, Math.min(100, Math.round((mouseRelX / rect.width) * 100)));
      const pctY = Math.max(0, Math.min(100, Math.round((mouseRelY / rect.height) * 100)));

      const currentPoints = targetPanel.shapePoints
        ? [...targetPanel.shapePoints]
        : targetPanel.shapeType === 'polyline' || targetPanel.shapeType === 'line'
        ? [{ x: 0, y: 50 }, { x: 50, y: 20 }, { x: 100, y: 50 }]
        : [{ x: 50, y: 5 }, { x: 95, y: 35 }, { x: 80, y: 95 }, { x: 20, y: 95 }, { x: 5, y: 35 }];

      currentPoints[nodeIndex] = { x: pctX, y: pctY };

      const updatedPanels = appState.panels.map(p => {
        if (p.panelId === panelId) {
          return { ...p, shapePoints: currentPoints };
        }
        return p;
      });

      onUpdateAppState({ ...appState, panels: updatedPanels });
    };

    const handleNodeMouseUp = () => {
      if (draggingNode) {
        setDraggingNode(null);
      }
    };

    if (draggingNode) {
      window.addEventListener('mousemove', handleNodeMouseMove);
      window.addEventListener('mouseup', handleNodeMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleNodeMouseMove);
        window.removeEventListener('mouseup', handleNodeMouseUp);
      };
    }
  }, [draggingNode, appState, onUpdateAppState]);

  // Resize & Rotation Transformation State
  const [transformState, setTransformState] = useState<{
    type: 'resize' | 'rotate';
    handle?: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
    panelId: string;
    initialMouseX: number;
    initialMouseY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    initialRotation: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const handleResizeStart = (
    e: React.MouseEvent,
    panel: Panel,
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  ) => {
    if (!effectiveEditMode) return;
    e.stopPropagation();
    e.preventDefault();

    const idx = panels.findIndex(p => p.panelId === panel.panelId);
    const pos = getPanelPos(panel, idx);

    setTransformState({
      type: 'resize',
      handle,
      panelId: panel.panelId,
      initialMouseX: e.clientX,
      initialMouseY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
      initialW: pos.w,
      initialH: pos.h,
      initialRotation: panel.rotation || 0,
      centerX: 0,
      centerY: 0
    });
  };

  const handleRotateStart = (e: React.MouseEvent, panel: Panel, parentEl: HTMLElement | null) => {
    if (!effectiveEditMode) return;
    e.stopPropagation();
    e.preventDefault();

    const idx = panels.findIndex(p => p.panelId === panel.panelId);
    const pos = getPanelPos(panel, idx);

    let centerX = 0;
    let centerY = 0;

    if (parentEl) {
      const rect = parentEl.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    } else if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      centerX = canvasRect.left + pos.x + pos.w / 2;
      centerY = canvasRect.top + pos.y + pos.h / 2;
    }

    setTransformState({
      type: 'rotate',
      panelId: panel.panelId,
      initialMouseX: e.clientX,
      initialMouseY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
      initialW: pos.w,
      initialH: pos.h,
      initialRotation: panel.rotation || 0,
      centerX,
      centerY
    });
  };

  useEffect(() => {
    if (!transformState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const {
        type,
        handle,
        panelId,
        initialMouseX,
        initialMouseY,
        initialX,
        initialY,
        initialW,
        initialH,
        centerX,
        centerY
      } = transformState;

      const deltaX = (e.clientX - initialMouseX) / zoomLevel;
      const deltaY = (e.clientY - initialMouseY) / zoomLevel;

      if (type === 'resize') {
        let newX = initialX;
        let newY = initialY;
        let newW = initialW;
        let newH = initialH;

        const minSize = 20;

        if (handle?.includes('e')) {
          newW = Math.max(minSize, initialW + deltaX);
        }
        if (handle?.includes('s')) {
          newH = Math.max(minSize, initialH + deltaY);
        }
        if (handle?.includes('w')) {
          const potentialW = Math.max(minSize, initialW - deltaX);
          newX = initialX + (initialW - potentialW);
          newW = potentialW;
        }
        if (handle?.includes('n')) {
          const potentialH = Math.max(minSize, initialH - deltaY);
          newY = initialY + (initialH - potentialH);
          newH = potentialH;
        }

        if (gridSnap) {
          newX = Math.round(newX / 10) * 10;
          newY = Math.round(newY / 10) * 10;
          newW = Math.round(newW / 10) * 10;
          newH = Math.round(newH / 10) * 10;
        }

        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        const updatedPanels = appState.panels.map(p => {
          if (p.panelId === panelId) {
            return { ...p, x: newX, y: newY, w: newW, h: newH };
          }
          return p;
        });
        onUpdateAppState({ ...appState, panels: updatedPanels });
      } else if (type === 'rotate') {
        const radians = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let deg = Math.round((radians * 180) / Math.PI + 90);
        if (deg < 0) deg += 360;

        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
        } else if (gridSnap) {
          deg = Math.round(deg / 5) * 5;
        }

        deg = deg % 360;

        const updatedPanels = appState.panels.map(p => {
          if (p.panelId === panelId) {
            return { ...p, rotation: deg };
          }
          return p;
        });
        onUpdateAppState({ ...appState, panels: updatedPanels });
      }
    };

    const handleMouseUp = () => {
      setTransformState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [transformState, gridSnap, appState, onUpdateAppState]);

  // Alignment Tools (With Respect to Master Reference Element)
  const alignSelectedPanels = (
    type: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'sameW' | 'sameH' | 'distH' | 'distV'
  ) => {
    if (selectedPanelIds.length < 2) return;
    const selectedPanels = appState.panels.filter(p => selectedPanelIds.includes(p.panelId));
    if (selectedPanels.length === 0) return;

    const refMaster = masterPanel || selectedPanels[0];
    const refIdx = panels.findIndex(p => p.panelId === refMaster.panelId);
    const refPos = getPanelPos(refMaster, refIdx);

    let updatedPanels = appState.panels.map(p => {
      if (!selectedPanelIds.includes(p.panelId)) return p;
      const idx = panels.findIndex(item => item.panelId === p.panelId);
      const pos = getPanelPos(p, idx);

      let newX = pos.x;
      let newY = pos.y;
      let newW = pos.w;
      let newH = pos.h;

      switch (type) {
        case 'left':
          newX = refPos.x;
          break;
        case 'centerH':
          newX = Math.round(refPos.x + refPos.w / 2 - pos.w / 2);
          break;
        case 'right':
          newX = refPos.x + refPos.w - pos.w;
          break;
        case 'top':
          newY = refPos.y;
          break;
        case 'centerV':
          newY = Math.round(refPos.y + refPos.h / 2 - pos.h / 2);
          break;
        case 'bottom':
          newY = refPos.y + refPos.h - pos.h;
          break;
        case 'sameW':
          newW = refPos.w;
          break;
        case 'sameH':
          newH = refPos.h;
          break;
      }

      if (gridSnap) {
        newX = Math.round(newX / 10) * 10;
        newY = Math.round(newY / 10) * 10;
      }

      return {
        ...p,
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        w: Math.max(20, newW),
        h: Math.max(20, newH)
      };
    });

    // Handle Distribute Horizontally or Vertically
    if (type === 'distH' || type === 'distV') {
      const sorted = [...selectedPanels].sort((a, b) =>
        type === 'distH' ? (a.x ?? 0) - (b.x ?? 0) : (a.y ?? 0) - (b.y ?? 0)
      );
      if (sorted.length > 2) {
        const minVal = type === 'distH' ? (sorted[0].x ?? 0) : (sorted[0].y ?? 0);
        const lastIdx = sorted.length - 1;
        const maxVal = type === 'distH' ? (sorted[lastIdx].x ?? 0) : (sorted[lastIdx].y ?? 0);
        const gap = (maxVal - minVal) / lastIdx;

        sorted.forEach((p, index) => {
          const val = Math.round(minVal + gap * index);
          const pIndex = updatedPanels.findIndex(item => item.panelId === p.panelId);
          if (pIndex !== -1) {
            if (type === 'distH') updatedPanels[pIndex].x = val;
            else updatedPanels[pIndex].y = val;
          }
        });
      }
    }

    onUpdateAppState({ ...appState, panels: updatedPanels });
  };

  // Grouping & Ungrouping
  const handleGroupSelected = () => {
    if (selectedPanelIds.length < 2) return;
    const newGroupId = `grp_${Date.now()}`;
    const updatedPanels = appState.panels.map(p => {
      if (selectedPanelIds.includes(p.panelId)) {
        return { ...p, groupId: newGroupId };
      }
      return p;
    });
    onUpdateAppState({ ...appState, panels: updatedPanels });
  };

  const handleUngroupSelected = () => {
    const updatedPanels = appState.panels.map(p => {
      if (selectedPanelIds.includes(p.panelId)) {
        const { groupId, ...rest } = p;
        return rest;
      }
      return p;
    });
    onUpdateAppState({ ...appState, panels: updatedPanels });
  };

  // Duplicate / Clone Selected
  const handleDuplicateSelected = () => {
    if (selectedPanelIds.length === 0) return;
    const selectedPanels = appState.panels.filter(p => selectedPanelIds.includes(p.panelId));
    const newPanels: Panel[] = [];
    const newSelectedIds: string[] = [];

    selectedPanels.forEach(p => {
      const newId = `p_copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const cloned: Panel = {
        ...p,
        panelId: newId,
        panelName: `${p.panelName} (Copy)`,
        x: (p.x ?? 20) + 20,
        y: (p.y ?? 20) + 20
      };
      newPanels.push(cloned);
      newSelectedIds.push(newId);
    });

    onUpdateAppState({ ...appState, panels: [...appState.panels, ...newPanels] });
    setSelectedPanelIds(newSelectedIds);
    setMasterPanelId(newSelectedIds[0] || null);
  };

  // Delete Selected
  const handleDeleteSelected = () => {
    if (selectedPanelIds.length === 0) return;
    const updatedPanels = appState.panels.filter(p => !selectedPanelIds.includes(p.panelId));
    onUpdateAppState({ ...appState, panels: updatedPanels });
    setSelectedPanelIds([]);
    setMasterPanelId(null);
  };

  // Select All Elements
  const handleSelectAll = () => {
    const allIds = panels.map(p => p.panelId);
    setSelectedPanelIds(allIds);
    if (allIds.length > 0) setMasterPanelId(allIds[0]);
  };

  // Insert Symbol Factory 3.0 Industrial Equipment (SVG or PNG)
  const handleSelectIndustrialSymbol = async (symbol: IndustrialSymbolItem, format: 'svg' | 'png') => {
    const activeConnId = appState.connections?.[0]?.connectionId || '';
    const newId = `p_sym_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(symbol.svgContent)}`;
    if (format === 'png') {
      try {
        imageUrl = await convertSvgToPngDataUrl(symbol.svgContent, symbol.defaultW * 2, symbol.defaultH * 2);
      } catch (err) {
        console.warn('PNG conversion fallback to SVG:', err);
      }
    }

    // Determine default symbol animation type based on category / id
    let defaultAnimType: 'digital_on_off' | 'analog_level' | 'analog_valve_angle' | 'motor_rotation' | 'none' = 'none';
    if (symbol.category === 'tanks' || symbol.category === 'silos') {
      defaultAnimType = 'analog_level';
    } else if (symbol.id === 'valve_control') {
      defaultAnimType = 'analog_valve_angle';
    } else if (symbol.category === 'valves') {
      defaultAnimType = 'digital_on_off';
    } else if (symbol.category === 'motors' || symbol.category === 'agitators' || symbol.category === 'pumps') {
      defaultAnimType = 'motor_rotation';
    }

    const newSymbolPanel: Panel = {
      panelId: newId,
      dashboardId: activeDashboardId,
      connectionId: activeConnId,
      panelName: symbol.name,
      type: PanelType.IMAGE,
      topic: `scada/${symbol.category}/${symbol.id}`,
      symbolId: symbol.id,
      symbolCategory: symbol.category,
      symbolAnimType: defaultAnimType,
      payloadMin: 0,
      payloadMax: 100,
      lowThreshold: 20,
      highThreshold: 80,
      payloadOn: '1',
      payloadOff: '0',
      enableLowAlarm: true,
      enableHighAlarm: true,
      firstColor: '#f59e0b',   // Low Alarm Amber
      secondColor: '#10b981',  // Normal Emerald Green
      thirdColor: '#f43f5e',   // High Alarm Rose Red
      iconColorOn: '#10b981',
      iconColorOff: '#ef4444',
      imageUrl: imageUrl,
      staticText: symbol.svgContent,
      x: 160,
      y: 120,
      w: symbol.defaultW,
      h: symbol.defaultH,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
      imageFit: 'contain',
      opacity: 1
    };

    updateAppStateWithHistory({
      ...appState,
      panels: [...appState.panels, newSymbolPanel]
    });
    setSelectedPanelIds([newId]);
    setMasterPanelId(newId);
    setIsSymbolLibraryOpen(false);
    setPropertyCopiedToast(`Added ${symbol.name} (${format.toUpperCase()})`);
    setTimeout(() => setPropertyCopiedToast(null), 2500);
  };

  // Import Media Files (JPG, JPEG, PNG, GIF, SVG) to Canvas
  const handleMediaImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const importedPanels: Panel[] = [];
    const newIds: string[] = [];
    const activeConnId = appState.connections?.[0]?.connectionId || '';

    fileList.forEach((file: File, index) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        loadedCount++;
        if (dataUrl) {
          const newId = `p_img_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;
          const cleanName = file.name.replace(/\.[^/.]+$/, "");
          const mediaPanel: Panel = {
            panelId: newId,
            dashboardId: activeDashboardId,
            connectionId: activeConnId,
            panelName: cleanName || 'Media Asset',
            type: PanelType.IMAGE,
            topic: `static/media`,
            imageUrl: dataUrl,
            staticText: dataUrl,
            x: 80 + index * 25,
            y: 80 + index * 25,
            w: 220,
            h: 160,
            bgColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 0,
            imageFit: 'contain',
            opacity: 1
          };
          importedPanels.push(mediaPanel);
          newIds.push(newId);
        }

        if (loadedCount === fileList.length && importedPanels.length > 0) {
          onUpdateAppState({
            ...appState,
            panels: [...appState.panels, ...importedPanels]
          });
          setSelectedPanelIds(newIds);
          setMasterPanelId(newIds[0] || null);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Right-Click Context Menu Trigger
  const handleContextMenu = (e: React.MouseEvent, panelId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (panelId && !selectedPanelIds.includes(panelId)) {
      setSelectedPanelIds([panelId]);
      setMasterPanelId(panelId);
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    const relX = rect ? e.clientX - rect.left : e.clientX;
    const relY = rect ? e.clientY - rect.top : e.clientY;

    const canvasX = Math.round((relX + (canvasRef.current?.scrollLeft || 0)) / (zoomLevel || 1));
    const canvasY = Math.round((relY + (canvasRef.current?.scrollTop || 0)) / (zoomLevel || 1));

    setContextMenu({
      isOpen: true,
      x: Math.min(relX, (rect?.width || 800) - 240),
      y: Math.min(relY, (rect?.height || 600) - 340),
      canvasX,
      canvasY,
      panelId
    });
  };

  // Handle Publish / Setpoint click
  const handlePanelInteract = (panel: Panel) => {
    if (panel.type === PanelType.SCREEN_JUMP && panel.targetScreenId) {
      if (onSelectDashboard) {
        onSelectDashboard(panel.targetScreenId);
      }
      return;
    }

    if (effectiveEditMode) return;

    if (panel.type === PanelType.TEXT_INPUT) {
      // Direct inline editing on element, no keypad modal popup
      return;
    }

    if (panel.type === PanelType.SWITCH) {
      const liveData = latestValues[panel.panelId] || (panel.topic ? latestValues[panel.topic] : undefined);
      const currentVal = liveData?.val;
      const onVal = panel.payloadOn ?? '1';
      const offVal = panel.payloadOff ?? '0';
      const newPayload = String(currentVal) === String(onVal) ? offVal : onVal;

      const targetTopic = panel.publishTopic?.trim() || panel.topic?.trim();
      if (onPublish && targetTopic) {
        const formatted = formatPublishPayload(newPayload, panel);
        onPublish(targetTopic, formatted);
      }
      return;
    }

    if (panel.type === PanelType.BUTTON) {
      const payload = panel.buttonPayload ?? '1';
      const targetTopic = panel.publishTopic?.trim() || panel.topic?.trim();
      if (onPublish && targetTopic) {
        const formatted = formatPublishPayload(payload, panel);
        onPublish(targetTopic, formatted);
      }
      return;
    }
  };

  const handleConfirmKeypad = (newVal: number) => {
    if (!keypadConfig.panel) return;
    const panel = keypadConfig.panel;
    const targetTopic = panel.publishTopic?.trim() || panel.topic?.trim();
    if (onPublish && targetTopic) {
      const formatted = formatPublishPayload(newVal, panel);
      onPublish(targetTopic, formatted);
    }
  };

  // Quick preset HMI templates
  const handleLoadPresetTemplate = (presetId: string) => {
    const dashId = activeDashboardId;
    const connId = activeDashboard.connectionId || (appState.connections[0]?.connectionId || '');
    const ts = Date.now();

    if (presetId === 'daman_hatchery') {
      const { dashboards, panels } = getDamanHatcheryProject(connId);
      onUpdateAppState({
        ...appState,
        dashboards: [...appState.dashboards.filter(d => !d.dashboardId.includes('daman')), ...dashboards],
        panels: [...appState.panels.filter(p => !p.dashboardId.includes('daman')), ...panels]
      });
      if (onSelectDashboard) {
        onSelectDashboard(dashboards[0].dashboardId);
      }
      return;
    }

    let newPanels: Panel[] = [];

    switch (presetId) {
      case 'smarthome':
        newPanels = [
          {
            panelId: `p_hdr_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'Header Banner',
            type: PanelType.STATIC_TEXT,
            topic: 'static/title',
            staticText: 'SMART HOME & HVAC CONTROLS',
            fontSize: '20',
            textColor: '#f59e0b',
            bgColor: '#0f172a',
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderRadius: 12,
            textAlign: 'center',
            x: 20, y: 20, w: 680, h: 50
          },
          {
            panelId: `p_sp_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'AC TARGET TEMP SETPOINT',
            type: PanelType.TEXT_INPUT,
            topic: 'home/ac/setpoint',
            payloadMin: 16,
            payloadMax: 30,
            unit: '°C',
            bgColor: '#020617',
            textColor: '#38bdf8',
            borderColor: '#38bdf8',
            fontSize: '18',
            x: 20, y: 85, w: 220, h: 65
          },
          {
            panelId: `p_fan_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'LIVING ROOM FAN',
            type: PanelType.LED,
            topic: 'home/fan/status',
            payloadOn: '1',
            iconOn: 'fa-fan',
            iconColorOn: '#10b981',
            rotateOn: true,
            x: 250, y: 85, w: 150, h: 65
          },
          {
            panelId: `p_switch_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'AMBIENT LIGHT',
            type: PanelType.SWITCH,
            topic: 'home/lights/living',
            payloadOn: '1',
            payloadOff: '0',
            payloadOnText: 'STATE: ON',
            payloadOffText: 'STATE: OFF',
            x: 410, y: 85, w: 150, h: 65
          },
          {
            panelId: `p_btn_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'ALL LIGHTS OFF',
            type: PanelType.BUTTON,
            topic: 'home/lights/all_off',
            buttonPayload: 'OFF',
            bgColor: '#334155',
            textColor: '#ffffff',
            x: 570, y: 85, w: 130, h: 65
          },
          {
            panelId: `p_scene_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'LIGHTING SCENE',
            type: PanelType.COMBO_BOX,
            topic: 'home/lights/scene',
            options: ['WARM WHITE', 'COOL DAYLIGHT', 'EVENING MOOD', 'NIGHT READING'],
            x: 20, y: 160, w: 220, h: 65
          },
          {
            panelId: `p_radio_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'HVAC MODE',
            type: PanelType.RADIO_BUTTONS,
            topic: 'home/ac/mode',
            options: ['AUTO', 'COOL', 'HEAT', 'ECO'],
            x: 250, y: 160, w: 280, h: 65
          }
        ];
        break;
      case 'hvac':
        newPanels = [
          {
            panelId: `p_hvac_hdr_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'HVAC Header',
            type: PanelType.STATIC_TEXT,
            topic: 'static/hvac',
            staticText: 'COMMERCIAL AIR HANDLING UNIT (AHU-1)',
            fontSize: '18',
            textColor: '#38bdf8',
            bgColor: '#0f172a',
            borderColor: '#38bdf8',
            borderWidth: 2,
            borderRadius: 10,
            x: 20, y: 20, w: 680, h: 50
          },
          {
            panelId: `p_hvac_fan_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'SUPPLY BLOWER FAN',
            type: PanelType.LED,
            topic: 'hvac/fan/status',
            payloadOn: 'RUN',
            iconOn: 'fa-fan',
            iconColorOn: '#06b6d4',
            rotateOn: true,
            x: 20, y: 85, w: 160, h: 65
          },
          {
            panelId: `p_hvac_press_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'DUCT STATIC PRESSURE',
            type: PanelType.GAUGE,
            topic: 'hvac/duct/pressure',
            unit: 'Pa',
            payloadMin: 0,
            payloadMax: 500,
            x: 190, y: 85, w: 220, h: 65
          },
          {
            panelId: `p_hvac_sp_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'SUPPLY AIR TEMP SETPOINT',
            type: PanelType.TEXT_INPUT,
            topic: 'hvac/temp/setpoint',
            payloadMin: 18,
            payloadMax: 26,
            unit: '°C',
            fontSize: '18',
            x: 420, y: 85, w: 280, h: 65
          },
          {
            panelId: `p_hvac_damper_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'AIR DAMPER POSITION',
            type: PanelType.COMBO_BOX,
            topic: 'hvac/damper/pos',
            options: ['CLOSED (0%)', '25% OPEN', '50% OPEN', '100% FULL'],
            x: 20, y: 160, w: 310, h: 65
          },
          {
            panelId: `p_hvac_mode_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'AHU OPERATIONAL MODE',
            type: PanelType.MULTI_STATE,
            topic: 'hvac/ahu/mode',
            options: ['OFF', 'ECONO', 'BOOST'],
            x: 340, y: 160, w: 180, h: 65
          }
        ];
        break;
      default:
        // Default simple controls
        newPanels = [
          {
            panelId: `p_def_1_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'SYSTEM TITLE',
            type: PanelType.STATIC_TEXT,
            topic: 'static/title',
            staticText: 'INDUSTRIAL SCADA CONTROL CANVAS',
            fontSize: '18',
            textColor: '#f59e0b',
            bgColor: '#0f172a',
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderRadius: 10,
            x: 20, y: 20, w: 500, h: 50
          },
          {
            panelId: `p_def_2_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'SYSTEM SETPOINT',
            type: PanelType.TEXT_INPUT,
            topic: 'scada/setpoint',
            payloadMin: 0,
            payloadMax: 100,
            unit: '%',
            fontSize: '18',
            x: 20, y: 85, w: 200, h: 65
          },
          {
            panelId: `p_def_3_${ts}`,
            dashboardId: dashId,
            connectionId: connId,
            panelName: 'MAIN PUMP STATUS',
            type: PanelType.LED,
            topic: 'scada/pump/status',
            payloadOn: '1',
            iconOn: 'fa-gears',
            iconColorOn: '#10b981',
            rotateOn: true,
            x: 230, y: 85, w: 160, h: 65
          }
        ];
    }

    if (newPanels.length > 0) {
      onUpdateAppState({ ...appState, panels: [...appState.panels, ...newPanels] });
    }
  };

  const hasGroupedSelected = selectedPanelIds.some(id => {
    const p = panels.find(item => item.panelId === id);
    return !!p?.groupId;
  });

  return (
    <div className="flex flex-col h-full bg-[#030712] text-slate-100 select-none overflow-hidden relative">
      
      {/* Web HMI Canvas Top Navigation Bar */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-3 py-1 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20 backdrop-blur-md">
        
        {/* Dropdown Screen Switcher */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1.5 text-sky-400 font-extrabold text-xs">
            <i className="fas fa-desktop text-sm"></i>
            <span className="hidden sm:inline">HMI Screen:</span>
          </div>

          <select
            value={activeDashboardId}
            onChange={(e) => {
              const newDashId = e.target.value;
              if (onSelectDashboard) {
                onSelectDashboard(newDashId);
              }
              setSelectedPanelIds([]);
              setMasterPanelId(null);
            }}
            className="bg-slate-950 text-white font-bold text-xs px-2.5 py-1 rounded-xl border border-slate-800 outline-none focus:border-sky-500 cursor-pointer max-w-[210px] shadow-inner"
          >
            {appState.dashboards.map(d => (
              <option key={d.dashboardId} value={d.dashboardId}>
                {d.dashboardName} {d.isHome ? '★ (Home)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* HMI Canvas Element Controls */}
        <div className="flex items-center space-x-2">
          {!isFullscreen && !isClientMode && (
            <>
              <button
                type="button"
                onClick={onOpenAddPanel}
                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <i className="fas fa-plus"></i>
                <span>Add Element</span>
              </button>

              {/* Undo & Redo Controls with Shortcut Support */}
              <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    canUndo
                      ? 'bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 border border-slate-700 shadow-sm'
                      : 'opacity-40 cursor-not-allowed text-slate-500'
                  }`}
                  title="Undo Canvas Action (Ctrl+Z)"
                >
                  <i className="fas fa-undo text-xs"></i>
                  <span className="hidden sm:inline">Undo</span>
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1 py-0.2 rounded border border-slate-800 hidden lg:inline">Ctrl+Z</span>
                </button>

                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    canRedo
                      ? 'bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 border border-slate-700 shadow-sm'
                      : 'opacity-40 cursor-not-allowed text-slate-500'
                  }`}
                  title="Redo Canvas Action (Ctrl+Y)"
                >
                  <i className="fas fa-redo text-xs"></i>
                  <span className="hidden sm:inline">Redo</span>
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1 py-0.2 rounded border border-slate-800 hidden lg:inline">Ctrl+Y</span>
                </button>
              </div>

              {/* Quick Add Geometrical / Vector Shape Dropdown */}
              <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 shrink-0" title="Quick Add Geometrical / Vector Shape">
                <i className="fas fa-shapes text-xs text-amber-400"></i>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddVectorShape(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="bg-transparent text-xs font-bold text-amber-300 outline-none cursor-pointer"
                >
                  <option value="" disabled className="bg-slate-900 text-slate-400">+ Add Vector Shape...</option>
                  <option value="rectangle" className="bg-slate-900 text-white">🔲 Rectangle</option>
                  <option value="circle" className="bg-slate-900 text-white">⚪ Circle / Ellipse</option>
                  <option value="line" className="bg-slate-900 text-white">➖ Vector Line</option>
                  <option value="polyline" className="bg-slate-900 text-white">🐍 Bendable Open Line / Polyline</option>
                  <option value="pipe" className="bg-slate-900 text-white">🚰 Process Pipe</option>
                  <option value="triangle" className="bg-slate-900 text-white">🔺 Triangle</option>
                  <option value="polygon" className="bg-slate-900 text-white">⬡ Custom Polygon (N-Point)</option>
                  <option value="star" className="bg-slate-900 text-white">⭐ Vector Star</option>
                  <option value="arrow" className="bg-slate-900 text-white">➔ Vector Arrow</option>
                </select>
              </div>

              {/* TASC Symbol Library Button */}
              <button
                type="button"
                onClick={() => setIsSymbolLibraryOpen(true)}
                className="px-3 py-1 bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-purple-500/20 hover:from-sky-500/30 hover:via-indigo-500/30 hover:to-purple-500/30 text-sky-300 hover:text-white border border-sky-500/40 hover:border-sky-400 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-md active:scale-95"
                title="Open TASC Symbol Library (Valves, Tanks, Motors, Agitators, Silos, Pumps, Heat Exchangers, Sensors)"
              >
                <i className="fas fa-industry text-xs text-sky-400 animate-pulse"></i>
                <span className="hidden sm:inline">TASC Symbol Library</span>
                <span className="bg-sky-500/30 text-sky-200 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border border-sky-400/30">TASC Symbols</span>
              </button>
            </>
          )}
        </div>

        {/* Toolbar Controls */}
        {!isFullscreen && (
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            
            {!isClientMode && (
              <>
                {/* Screen Background Color Swatch Picker */}
                <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800" title="Screen Background Color">
                  <i className="fas fa-palette text-xs text-sky-400"></i>
                  <span className="text-[10px] text-slate-400 font-bold hidden md:inline">Canvas BG:</span>
                  <input
                    type="color"
                    value={screenBgColor}
                    onChange={(e) => updateCanvasBgColor(e.target.value)}
                    className="w-5 h-5 bg-transparent cursor-pointer rounded border-0 outline-none overflow-hidden"
                  />
                </div>

                {/* Media Import Button (JPG, JPEG, PNG, GIF, SVG) */}
                <label className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 hover:border-purple-400 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-sm" title="Import Image, Animated GIF or SVG Graphic to Canvas">
                  <i className="fas fa-file-image text-xs text-purple-400"></i>
                  <span className="hidden sm:inline">Import Media</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.svg,image/jpeg,image/png,image/gif,image/svg+xml"
                    multiple
                    onChange={handleMediaImport}
                    className="hidden"
                  />
                </label>

                {/* Quick HMI Preset Template Dropdown */}
                {panels.length === 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleLoadPresetTemplate(e.target.value);
                      }
                    }}
                    defaultValue=""
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all outline-none cursor-pointer"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">
                      ⚡ Load Demo Template...
                    </option>
                    {DEMO_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id} className="bg-slate-900 text-white font-medium">
                        {preset.title}
                      </option>
                    ))}
                  </select>
                )}

                {/* Grid Snap Toggle */}
                <button
                  type="button"
                  onClick={() => setGridSnap(!gridSnap)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    gridSnap 
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title="Snap to 10px Grid"
                >
                  <i className="fas fa-border-top-left text-xs"></i>
                  <span className="hidden sm:inline">Snap 10px</span>
                </button>

                {/* Pan / Move Canvas Tool Button */}
                <button
                  type="button"
                  onClick={() => setIsPanMode(!isPanMode)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    isPanMode || isSpacePressed
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                  title="Pan / Move Canvas (Click Hand tool, Hold Spacebar, or Middle-click / Drag)"
                >
                  <i className={`fas fa-hand ${isPanMode || isSpacePressed ? 'text-amber-400' : 'text-slate-400'}`}></i>
                  <span className="hidden sm:inline">{isPanMode ? 'Pan Mode' : 'Pan'}</span>
                </button>

                {/* Zoom Level Controls (0.5x to 2.0x) */}
                <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800" title="Canvas Zoom Level (0.5x to 2.0x, Ctrl+Wheel or Pinch)">
                  <i className="fas fa-magnifying-glass text-xs text-sky-400"></i>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(0.5, Number((prev - 0.1).toFixed(1))))}
                    disabled={zoomLevel <= 0.5}
                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[10px] cursor-pointer"
                    title="Zoom Out (-10%)"
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <span 
                    onClick={() => setZoomLevel(1.0)} 
                    className="text-xs font-mono font-bold text-sky-300 hover:text-white cursor-pointer px-1 min-w-[42px] text-center"
                    title="Click to Reset Zoom to 100%"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(2.0, Number((prev + 0.1).toFixed(1))))}
                    disabled={zoomLevel >= 2.0}
                    className="w-5 h-5 flex items-center justify-center rounded bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[10px] cursor-pointer"
                    title="Zoom In (+10%)"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                  {zoomLevel !== 1.0 && (
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1.0)}
                      className="ml-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500 hover:text-slate-950 transition-colors cursor-pointer"
                      title="Reset Zoom to 100%"
                    >
                      100%
                    </button>
                  )}
                </div>

                {/* Auto-Fit Screen Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsAutoFit(prev => !prev)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                    isAutoFit
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 hover:bg-sky-500/30'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                  title="Auto Fit Screen (Dynamically scales all canvas elements to fit mobile/desktop screen without scrolling)"
                >
                  <i className="fas fa-expand text-xs text-sky-400"></i>
                  <span>{isAutoFit ? 'Auto Fit ON' : 'Auto Fit'}</span>
                </button>
              </>
            )}

            {/* Edit Mode vs Live Run Mode */}
            {isClientMode ? (
              <div 
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold tracking-wider uppercase flex items-center space-x-1.5 shadow-sm"
                title="Client Edition (Operator Mode) — Live Execution Active"
              >
                <i className="fas fa-play text-xs text-emerald-400 animate-pulse"></i>
                <span>LIVE HMI RUN</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (isEditMode) {
                    setSelectedPanelIds([]);
                    setMasterPanelId(null);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold tracking-wider uppercase transition-all flex items-center space-x-1.5 cursor-pointer ${
                  isEditMode 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20' 
                    : 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                }`}
              >
                <i className={`fas ${isEditMode ? 'fa-pen-to-square' : 'fa-play'} text-xs`}></i>
                <span>{isEditMode ? 'Design Mode' : 'Live HMI Run'}</span>
              </button>
            )}
          </div>
        )}

      </div>

      {/* Selected Element(s) & Alignment Floating Toolbar */}
      {effectiveEditMode && selectedPanelIds.length > 0 && (
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs z-20 animate-in fade-in shadow-xl">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            
            {/* Selection Info Badge */}
            <div className="flex items-center space-x-1.5 font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
              <i className="fas fa-object-group text-xs"></i>
              <span className="truncate max-w-[200px]">
                {selectedPanelIds.length === 1
                  ? (selectedPanel?.panelName || '1 Element Selected')
                  : `${selectedPanelIds.length} Elements Selected`}
              </span>
              {masterPanel && selectedPanelIds.length > 1 && (
                <span className="text-[9px] text-amber-300 font-normal border-l border-amber-500/40 pl-1.5 ml-1 hidden lg:inline">
                  Ref: <strong className="font-bold">{masterPanel.panelName}</strong>
                </span>
              )}
            </div>

            {/* Element Styling Color Pickers (Available for single or multiple selection) */}
            <div className="flex items-center space-x-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800" title="Element Background Color">
              <i className="fas fa-fill-drip text-[11px] text-amber-400"></i>
              <span className="text-[10px] text-slate-300 font-bold hidden sm:inline">Element BG:</span>
              <input
                type="color"
                value={selectedPanel?.bgColor || '#0f172a'}
                onChange={(e) => updateSelectedPanelProp('bgColor', e.target.value)}
                className="w-5 h-5 bg-transparent cursor-pointer rounded border-0 outline-none overflow-hidden"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800" title="Text Color">
              <i className="fas fa-font text-[11px] text-sky-400"></i>
              <span className="text-[10px] text-slate-300 font-bold hidden lg:inline">Text:</span>
              <input
                type="color"
                value={selectedPanel?.textColor || '#f8fafc'}
                onChange={(e) => updateSelectedPanelProp('textColor', e.target.value)}
                className="w-5 h-5 bg-transparent cursor-pointer rounded border-0 outline-none overflow-hidden"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800" title="Border Color">
              <i className="fas fa-border-all text-[11px] text-emerald-400"></i>
              <span className="text-[10px] text-slate-300 font-bold hidden lg:inline">Border:</span>
              <input
                type="color"
                value={selectedPanel?.borderColor || '#1e293b'}
                onChange={(e) => updateSelectedPanelProp('borderColor', e.target.value)}
                className="w-5 h-5 bg-transparent cursor-pointer rounded border-0 outline-none overflow-hidden"
              />
            </div>

            {/* Element Opacity Slider */}
            <div className="flex items-center space-x-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800" title="Element Opacity (Semi-Transparency)">
              <i className="fas fa-circle-half-stroke text-[11px] text-purple-400"></i>
              <span className="text-[10px] text-slate-300 font-bold hidden sm:inline">Opacity:</span>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={selectedPanel?.opacity ?? 1}
                onChange={(e) => updateSelectedPanelProp('opacity', parseFloat(e.target.value))}
                className="w-16 accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
              />
              <span className="text-[10px] font-mono text-purple-300 w-8 text-right font-bold">
                {Math.round((selectedPanel?.opacity ?? 1) * 100)}%
              </span>
            </div>

            {/* Element Rotation Angle Slider */}
            <div className="flex items-center space-x-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800" title="Rotation Angle (0-360°)">
              <i className="fas fa-rotate text-[11px] text-amber-400"></i>
              <span className="text-[10px] text-slate-300 font-bold hidden sm:inline">Rotate:</span>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={selectedPanel?.rotation ?? 0}
                onChange={(e) => updateSelectedPanelProp('rotation', parseInt(e.target.value) || 0)}
                className="w-16 accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
              />
              <span className="text-[10px] font-mono text-amber-300 w-9 text-right font-bold">
                {(selectedPanel?.rotation ?? 0)}°
              </span>
            </div>

            {/* Corner Radius Slider (0-100px) */}
            <div 
              id="hmi-canvas-element"
              className="flex items-center space-x-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800" 
              title="Corner Radius (0-100px)"
            >
              <i className="fas fa-vector-square text-[11px] text-teal-400"></i>
              <span className="text-[10px] text-slate-300 font-bold hidden sm:inline">Radius:</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={selectedPanel?.borderRadius ?? 8}
                onChange={(e) => updateSelectedPanelProp('borderRadius', parseInt(e.target.value) || 0)}
                className="w-16 accent-teal-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
              />
              <span className="text-[10px] font-mono text-teal-300 w-8 text-right font-bold">
                {(selectedPanel?.borderRadius ?? 8)}px
              </span>
            </div>

            {/* Shadow / Glow Effect Controls */}
            <div 
              className="flex items-center space-x-1.5 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800"
              title={selectedPanel?.type === PanelType.STATIC_TEXT ? "Font Glow / Shadow Effect" : "Element Shadow / Glow Effect"}
            >
              <button
                type="button"
                onClick={() => updateSelectedPanelProp('shadowEnabled', !selectedPanel?.shadowEnabled)}
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                  selectedPanel?.shadowEnabled
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <i className={`fas fa-wand-magic-sparkles text-[10px] ${selectedPanel?.shadowEnabled ? 'text-cyan-400 animate-pulse' : ''}`}></i>
                <span className="hidden sm:inline">{selectedPanel?.type === PanelType.STATIC_TEXT ? 'Font Glow:' : 'Glow/Shadow:'}</span>
              </button>

              {selectedPanel?.shadowEnabled && (
                <>
                  <input
                    type="color"
                    value={selectedPanel?.shadowColor || '#38bdf8'}
                    onChange={(e) => updateSelectedPanelProp('shadowColor', e.target.value)}
                    className="w-5 h-5 bg-transparent cursor-pointer rounded border-0 outline-none overflow-hidden"
                    title="Shadow / Glow Color"
                  />
                  <input
                    type="range"
                    min="2"
                    max="50"
                    step="1"
                    value={selectedPanel?.shadowIntensity ?? 15}
                    onChange={(e) => updateSelectedPanelProp('shadowIntensity', parseInt(e.target.value) || 15)}
                    className="w-14 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                    title="Glow / Shadow Intensity (px)"
                  />
                  <span className="text-[10px] font-mono text-cyan-300 w-7 text-right font-bold">
                    {selectedPanel?.shadowIntensity ?? 15}px
                  </span>
                </>
              )}
            </div>

            {/* If Single Element Selected: Show Precise Coordinates X, Y, W, H */}
            {selectedPanel && selectedPanelIds.length === 1 && (
              <>
                <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono font-bold">X:</span>
                  <input
                    type="number"
                    value={selectedPanel.x ?? 0}
                    onChange={(e) => updateSelectedPanelProp('x', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-transparent font-mono text-xs font-bold text-sky-400 outline-none text-right"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono font-bold">Y:</span>
                  <input
                    type="number"
                    value={selectedPanel.y ?? 0}
                    onChange={(e) => updateSelectedPanelProp('y', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 bg-transparent font-mono text-xs font-bold text-sky-400 outline-none text-right"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono font-bold">W:</span>
                  <input
                    type="number"
                    value={selectedPanel.w ?? 180}
                    onChange={(e) => updateSelectedPanelProp('w', Math.max(40, parseInt(e.target.value) || 40))}
                    className="w-12 bg-transparent font-mono text-xs font-bold text-emerald-400 outline-none text-right"
                  />
                </div>

                <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono font-bold">H:</span>
                  <input
                    type="number"
                    value={selectedPanel.h ?? 60}
                    onChange={(e) => updateSelectedPanelProp('h', Math.max(25, parseInt(e.target.value) || 25))}
                    className="w-12 bg-transparent font-mono text-xs font-bold text-emerald-400 outline-none text-right"
                  />
                </div>

                {/* Geometrical & Vector Shape Dropdown (Placed directly beside W and H) */}
                <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800" title="Geometrical / Vector Shape Dropdown Selection">
                  <i className="fas fa-shapes text-[10px] text-amber-400"></i>
                  <span className="text-[10px] text-slate-300 font-bold hidden xl:inline">Shape:</span>
                  <select
                    value={
                      selectedPanel.type === PanelType.PIPE 
                        ? 'pipe' 
                        : (selectedPanel.type === PanelType.SHAPE ? (selectedPanel.shapeType || 'rectangle') : 'none')
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'none') {
                        return;
                      }
                      const isPipe = val === 'pipe';
                      const updatedPanels = appState.panels.map(p => {
                        if (selectedPanelIds.includes(p.panelId)) {
                          return {
                            ...p,
                            type: isPipe ? PanelType.PIPE : PanelType.SHAPE,
                            shapeType: isPipe ? 'pipe' : (val as any)
                          };
                        }
                        return p;
                      });
                      updateAppStateWithHistory({ ...appState, panels: updatedPanels });
                    }}
                    className="bg-transparent font-mono text-xs font-bold text-amber-300 outline-none cursor-pointer"
                  >
                    <option value="none" className="bg-slate-900 text-slate-400">Standard Widget</option>
                    <option value="rectangle" className="bg-slate-900 text-white">🔲 Rectangle</option>
                    <option value="circle" className="bg-slate-900 text-white">⚪ Circle / Ellipse</option>
                    <option value="line" className="bg-slate-900 text-white">➖ Vector Line</option>
                    <option value="polyline" className="bg-slate-900 text-white">🐍 Bendable Open Line / Polyline</option>
                    <option value="pipe" className="bg-slate-900 text-white">🚰 Process Pipe</option>
                    <option value="triangle" className="bg-slate-900 text-white">🔺 Triangle</option>
                    <option value="polygon" className="bg-slate-900 text-white">⬡ Custom Polygon (N-Point)</option>
                    <option value="star" className="bg-slate-900 text-white">⭐ Vector Star</option>
                    <option value="arrow" className="bg-slate-900 text-white">➔ Vector Arrow</option>
                  </select>
                </div>

                {(selectedPanel.type === PanelType.IMAGE || selectedPanel.type === 'image') && (
                  <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800" title="Image Aspect Ratio Fit">
                    <i className="fas fa-expand text-[10px] text-purple-400"></i>
                    <select
                      value={selectedPanel.imageFit || 'contain'}
                      onChange={(e) => updateSelectedPanelProp('imageFit', e.target.value)}
                      className="bg-transparent font-mono text-xs font-bold text-purple-300 outline-none cursor-pointer"
                    >
                      <option value="contain" className="bg-slate-900 text-white">Fit: Contain</option>
                      <option value="cover" className="bg-slate-900 text-white">Fit: Cover</option>
                      <option value="fill" className="bg-slate-900 text-white">Fit: Fill</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Alignment Tools Toolbar (Enabled when 2+ Elements Selected) */}
            {selectedPanelIds.length >= 2 && (
              <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 px-1 uppercase hidden md:inline">Align:</span>
                
                <button
                  type="button"
                  onClick={() => alignSelectedPanels('left')}
                  className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors"
                  title="Align Left (To Reference Element)"
                >
                  <i className="fas fa-align-left text-xs w-4 text-center"></i>
                </button>
                <button
                  type="button"
                  onClick={() => alignSelectedPanels('centerH')}
                  className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors"
                  title="Align Center Horizontal"
                >
                  <i className="fas fa-align-center text-xs w-4 text-center"></i>
                </button>
                <button
                  type="button"
                  onClick={() => alignSelectedPanels('right')}
                  className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors"
                  title="Align Right"
                >
                  <i className="fas fa-align-right text-xs w-4 text-center"></i>
                </button>
                
                <div className="w-px h-4 bg-slate-800 mx-0.5"></div>

                <button
                  type="button"
                  onClick={() => alignSelectedPanels('top')}
                  className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors"
                  title="Align Top"
                >
                  <i className="fas fa-turn-up text-xs w-4 text-center"></i>
                </button>
                <button
                  type="button"
                  onClick={() => alignSelectedPanels('centerV')}
                  className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors"
                  title="Align Center Vertical"
                >
                  <i className="fas fa-grip-lines text-xs w-4 text-center"></i>
                </button>
                <button
                  type="button"
                  onClick={() => alignSelectedPanels('bottom')}
                  className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors"
                  title="Align Bottom"
                >
                  <i className="fas fa-turn-down text-xs w-4 text-center"></i>
                </button>

                <div className="w-px h-4 bg-slate-800 mx-0.5"></div>

                <button
                  type="button"
                  onClick={() => alignSelectedPanels('sameW')}
                  className="p-1 hover:bg-slate-800 text-emerald-400 rounded transition-colors text-[10px] font-bold px-1.5"
                  title="Make Same Width"
                >
                  Equal W
                </button>
                <button
                  type="button"
                  onClick={() => alignSelectedPanels('sameH')}
                  className="p-1 hover:bg-slate-800 text-emerald-400 rounded transition-colors text-[10px] font-bold px-1.5"
                  title="Make Same Height"
                >
                  Equal H
                </button>
              </div>
            )}

            {/* Grouping / Ungrouping Buttons */}
            {selectedPanelIds.length >= 2 && (
              <button
                type="button"
                onClick={handleGroupSelected}
                className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                title="Group Selected Elements Together"
              >
                <i className="fas fa-link text-xs"></i>
                <span>Group</span>
              </button>
            )}

            {hasGroupedSelected && (
              <button
                type="button"
                onClick={handleUngroupSelected}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                title="Ungroup Elements"
              >
                <i className="fas fa-link-slash text-xs"></i>
                <span>Ungroup</span>
              </button>
            )}

          </div>

          {/* Action Buttons: Copy Property, Paste Property, Duplicate, Config & Delete */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {/* Copy Property & Paste Property Buttons */}
            <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={handleCopyProperties}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
                title="Copy Visual Properties (Colors, Border, Radius, Opacity, Glow) of Selected Element"
              >
                <i className="fas fa-paintbrush text-xs text-amber-400"></i>
                <span className="hidden sm:inline">Copy Prop</span>
              </button>

              <button
                type="button"
                onClick={handlePasteProperties}
                disabled={!copiedProperties}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                  copiedProperties
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-600 cursor-not-allowed border border-slate-800/50'
                }`}
                title={copiedProperties ? "Paste Visual Properties to Selected Element(s)" : "No Properties Copied Yet"}
              >
                <i className={`fas fa-paint-roller text-xs ${copiedProperties ? 'text-amber-400' : 'text-slate-600'}`}></i>
                <span className="hidden sm:inline">Paste Prop</span>
                {copiedProperties && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5"></span>
                )}
              </button>
            </div>

            {/* Layering Z-Index Quick Controls */}
            <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800" title="Change Element Layering / Z-Index Order">
              <span className="text-[10px] text-slate-400 font-bold uppercase px-1 hidden md:inline">Layer:</span>
              <button
                type="button"
                onClick={handleBringToVeryFront}
                className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors text-[10px]"
                title="Bring to Very Front"
              >
                <i className="fas fa-arrow-up-to-line w-4 text-center"></i>
              </button>
              <button
                type="button"
                onClick={handleBringOneLayerFront}
                className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors text-[10px]"
                title="Bring 1 Layer Forward"
              >
                <i className="fas fa-arrow-up w-4 text-center"></i>
              </button>
              <button
                type="button"
                onClick={handleSendOneLayerBack}
                className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors text-[10px]"
                title="Send 1 Layer Backward"
              >
                <i className="fas fa-arrow-down w-4 text-center"></i>
              </button>
              <button
                type="button"
                onClick={handleSendToVeryBack}
                className="p-1 hover:bg-slate-800 text-sky-400 rounded transition-colors text-[10px]"
                title="Send to Very Back"
              >
                <i className="fas fa-arrow-down-to-line w-4 text-center"></i>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDuplicateSelected}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
              title="Duplicate / Copy Selected Elements"
            >
              <i className="fas fa-copy text-xs"></i>
              <span className="hidden sm:inline">Duplicate</span>
            </button>

            {selectedPanel && selectedPanelIds.length === 1 && (
              <button
                type="button"
                onClick={() => onEditPanel(selectedPanel)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
              >
                <i className="fas fa-gear text-xs"></i>
                <span>Config</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[11px] font-bold border border-rose-500/30 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <i className="fas fa-trash text-xs"></i>
              <span>Delete ({selectedPanelIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Freeform Absolute Canvas Area */}
      <div 
        ref={canvasRef}
        id="hmi-canvas-background"
        data-canvas-bg="true"
        onMouseDown={(e) => handleCanvasMouseDown(e)}
        onClick={() => {
          if (justFinishedMarqueeRef.current) {
            justFinishedMarqueeRef.current = false;
            return;
          }
          setSelectedPanelIds([]);
          setMasterPanelId(null);
          setContextMenu({ isOpen: false, x: 0, y: 0 });
        }}
        onContextMenu={(e) => handleContextMenu(e)}
        className={`flex-1 relative p-0.5 transition-colors ${
          !isEditMode || isAutoFit ? 'overflow-hidden' : 'overflow-auto min-h-[600px] min-w-[1220px]'
        } ${
          isPanning
            ? 'cursor-grabbing select-none'
            : isPanMode || isSpacePressed || zoomLevel > 1.0
            ? 'cursor-grab'
            : 'cursor-default'
        }`}
        style={{
          backgroundColor: screenBgColor,
          backgroundImage: gridSnap 
            ? 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)' 
            : 'none',
          backgroundSize: '15px 15px'
        }}
      >
        {/* Scaled Canvas Inner Container */}
        <div
          style={{
            transform: `scale(${effectiveScale})`,
            transformOrigin: '0 0',
            width: `${contentBounds.width}px`,
            height: `${contentBounds.height}px`,
            minWidth: isEditMode && !isAutoFit ? '1220px' : '0px',
            minHeight: isEditMode && !isAutoFit ? '600px' : '0px'
          }}
          className="relative transition-transform duration-75 origin-top-left"
        >
          {/* Marquee Drag Box Selection Overlay */}
        {isMarqueeSelecting && marqueeRect && (
          <div
            className="absolute border-2 border-sky-400 bg-sky-500/20 pointer-events-none z-50 rounded shadow-md"
            style={{
              left: `${Math.min(marqueeRect.startX, marqueeRect.currentX)}px`,
              top: `${Math.min(marqueeRect.startY, marqueeRect.currentY)}px`,
              width: `${Math.abs(marqueeRect.currentX - marqueeRect.startX)}px`,
              height: `${Math.abs(marqueeRect.currentY - marqueeRect.startY)}px`,
            }}
          />
        )}
        {panels.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-slate-300 overflow-y-auto">
            <div className="max-w-4xl w-full space-y-6 text-center my-auto py-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-sky-400 text-xs font-bold uppercase tracking-widest">
                  <i className="fas fa-cubes"></i>
                  <span>HMI Screen Templates</span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">Select a Demo Dashboard Template</h3>
                <p className="text-xs text-slate-400 max-w-xl mx-auto">
                  Choose from any of these pre-configured demo templates to instantly populate this screen canvas, or click <span className="text-sky-400 font-bold">+ Add Element</span> above to build from scratch.
                </p>
              </div>

              {/* Grid of 8 Small Buttons / Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-left">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLoadPresetTemplate(preset.id)}
                    className="group relative p-3.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/60 rounded-2xl transition-all cursor-pointer flex flex-col justify-between space-y-2.5 shadow-xl hover:shadow-sky-500/10 active:scale-95"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${preset.bgClass} ${preset.textClass}`}>
                        <i className={`fas ${preset.icon}`}></i>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 group-hover:text-sky-400 transition-colors">
                        {preset.elementCount} Elements
                      </span>
                    </div>

                    <div className="flex-1 space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-white transition-colors">
                        {preset.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                        {preset.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-bold text-sky-400 opacity-80 group-hover:opacity-100">
                      <span>Load Template</span>
                      <i className="fas fa-arrow-right text-[9px] group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          panels.map((panel, idx) => {
            const pos = getPanelPos(panel, idx);
            const isSelected = selectedPanelIds.includes(panel.panelId);
            const isMaster = masterPanelId === panel.panelId;
            const liveData = latestValues[panel.panelId] || (panel.topic ? latestValues[panel.topic] : undefined);
            const liveValue = liveData?.val;
            const rawStringValue = liveValue !== undefined && liveValue !== null ? String(liveValue) : '';

            // Equipment Trip / Fault Evaluation
            const tripStatus = isPanelTripped(panel, latestValues);
            const isTripActive = tripStatus.isTripped;
            const tripAnimClass = isTripActive ? `trip-anim-${panel.tripAnimStyle || 'flash_strobe'}` : '';

            const isPipePanel = panel.type === PanelType.PIPE || (panel.type as string) === 'pipe' || panel.shapeType === 'pipe';
            const isVectorShape = panel.type === PanelType.SHAPE || (panel.type as string) === 'shape' || isPipePanel;
            const isSymbolOrImagePanel = !!panel.symbolId || !!panel.symbolAnimType || panel.type === PanelType.IMAGE || (panel.type as string) === 'image';
            const hasCustomExplicitBg = !!panel.bgColor && panel.bgColor !== 'transparent' && !panel.bgColor.includes('15, 23, 42') && panel.bgColor !== '#0f172a' && panel.bgColor !== '#1e293b';
            const isPureShapeWithoutBox = isPipePanel || (isSymbolOrImagePanel && !hasCustomExplicitBg) || (isVectorShape && panel.shapeType !== 'rectangle');

            return (
              <div
                key={panel.panelId}
                id={`hmi-panel-${panel.panelId}`}
                onMouseDown={(e) => handleMouseDown(e, panel.panelId)}
                onContextMenu={(e) => handleContextMenu(e, panel.panelId)}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePanelInteract(panel);
                }}
                className={`absolute transition-all group select-none ${
                  effectiveEditMode ? 'cursor-move' : 'cursor-pointer'
                } ${
                  isSelected && effectiveEditMode
                    ? isMaster
                      ? 'ring-2 ring-amber-400 shadow-2xl z-30'
                      : 'ring-2 ring-sky-400/90 shadow-xl z-20'
                    : effectiveEditMode 
                    ? 'hover:ring-1 hover:ring-sky-400/80 z-10' 
                    : 'z-10'
                } ${tripAnimClass}`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${pos.w}px`,
                  height: `${pos.h}px`,
                  backgroundColor: isPureShapeWithoutBox ? 'transparent' : (panel.bgColor || (panel.type === PanelType.STATIC_TEXT ? '#0f172a' : 'rgba(15, 23, 42, 0.9)')),
                  borderColor: isPureShapeWithoutBox ? 'transparent' : (panel.borderColor || '#1e293b'),
                  borderWidth: isPureShapeWithoutBox ? '0px' : `${panel.borderWidth ?? 1}px`,
                  borderRadius: isPureShapeWithoutBox ? '0px' : `${panel.borderRadius ?? 8}px`,
                  color: panel.textColor || '#f8fafc',
                  opacity: panel.opacity !== undefined ? panel.opacity : 1,
                  transform: panel.rotation ? `rotate(${panel.rotation}deg)` : undefined,
                  boxShadow: !isPureShapeWithoutBox && panel.shadowEnabled
                    ? `0 0 ${panel.shadowIntensity ?? 15}px ${panel.shadowColor || '#38bdf8'}, 0 4px 12px rgba(0, 0, 0, 0.5)`
                    : undefined
                }}
              >
                {/* Element Content Renderers */}
                {panel.type === PanelType.STATIC_TEXT ? (
                  <div 
                    className="w-full h-full flex items-center justify-center p-2 font-bold truncate text-center"
                    style={{
                      fontSize: `${panel.fontSize || 16}px`,
                      color: panel.textColor || '#38bdf8',
                      textAlign: panel.textAlign || 'center',
                      textShadow: panel.shadowEnabled
                        ? `0 0 ${panel.shadowIntensity ?? 12}px ${panel.shadowColor || panel.textColor || '#38bdf8'}, 0 0 ${Math.round((panel.shadowIntensity ?? 12) / 2)}px ${panel.shadowColor || panel.textColor || '#38bdf8'}, 0 2px 4px rgba(0, 0, 0, 0.9)`
                        : undefined
                    }}
                  >
                    {panel.staticText || panel.panelName || 'STATIC LABEL'}
                  </div>
                ) : panel.type === PanelType.BUTTON ? (
                  /* Tactile 3D Push-Button Widget with state 0 / state 1 custom text & styles */
                  <div className="w-full h-full p-1.5 flex items-center justify-center">
                    <button
                      type="button"
                      disabled={isEditMode}
                      onClick={(e) => {
                        if (!isEditMode && onPublish) {
                          const pubTopic = panel.publishTopic || panel.topic;
                          const payload = panel.buttonPayload || panel.payloadOn || '1';
                          onPublish(pubTopic, formatPublishPayload(payload, panel));
                        }
                      }}
                      className={`w-full h-full border-2 transition-all flex items-center justify-center space-x-2 px-3 py-1 cursor-pointer group/btn active:scale-95 shadow-md ${
                        panel.buttonStyle === 'square'
                          ? 'rounded-none'
                          : panel.buttonStyle === 'pill'
                          ? 'rounded-full'
                          : panel.buttonStyle === 'circular'
                          ? 'rounded-full aspect-square'
                          : panel.buttonStyle === 'bevel'
                          ? 'rounded-lg border-b-4 border-r-4'
                          : panel.buttonStyle === 'glossy'
                          ? 'rounded-xl bg-gradient-to-b from-sky-400/20 via-sky-900/40 to-slate-950 border-sky-400/50'
                          : 'rounded-xl'
                      }`}
                      style={{
                        backgroundColor: String(liveValue) === String(panel.payloadOn ?? '1') 
                          ? (panel.firstColor || '#10b981')
                          : (panel.bgColor || '#1e293b'),
                        borderColor: panel.borderColor || '#334155',
                        borderRadius: panel.borderRadius !== undefined ? `${panel.borderRadius}px` : undefined
                      }}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full transition-transform shrink-0 ${
                        String(liveValue) === String(panel.payloadOn ?? '1')
                          ? 'bg-emerald-400 shadow-[0_0_10px_#10b981] scale-125'
                          : 'bg-amber-500 shadow-[0_0_6px_#f59e0b]'
                      }`}></div>
                      <span className="font-extrabold text-xs uppercase tracking-wider truncate drop-shadow" style={{ color: panel.textColor || '#ffffff' }}>
                        {String(liveValue) === String(panel.payloadOn ?? '1')
                          ? (panel.payloadOnText || panel.panelName || 'PUSH BUTTON')
                          : (panel.payloadOffText || panel.panelName || 'PUSH BUTTON')}
                      </span>
                      <i className="fas fa-hand-pointer text-amber-400 text-xs opacity-75 group-hover/btn:opacity-100 shrink-0"></i>
                    </button>
                  </div>
                ) : panel.type === PanelType.SWITCH ? (
                  /* Industrial Toggle Switch / Rocker Button */
                  <div className="w-full h-full p-1.5 flex items-center justify-between px-3">
                    <div className="flex flex-col truncate">
                      <span className="text-[10px] font-extrabold truncate uppercase tracking-wider" style={{ color: panel.textColor || '#cbd5e1' }}>
                        {panel.panelName}
                      </span>
                      <span className={`text-[9px] font-mono font-bold ${
                        String(liveValue) === String(panel.payloadOn ?? '1') ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {String(liveValue) === String(panel.payloadOn ?? '1') ? (panel.payloadOnText || 'STATE: ON') : (panel.payloadOffText || 'STATE: OFF')}
                      </span>
                    </div>

                    <div className={`w-12 h-6 rounded-full p-0.5 border-2 transition-colors cursor-pointer flex items-center ${
                      String(liveValue) === String(panel.payloadOn ?? '1')
                        ? 'bg-emerald-500/20 border-emerald-500 justify-end'
                        : 'bg-slate-900 border-slate-700 justify-start'
                    }`}>
                      <div className={`w-4 h-4 rounded-full shadow-md transition-all ${
                        String(liveValue) === String(panel.payloadOn ?? '1')
                          ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                          : 'bg-slate-500'
                      }`}></div>
                    </div>
                  </div>
                ) : panel.type === PanelType.SCREEN_JUMP ? (
                  /* Screen Navigation Button */
                  <div className="w-full h-full p-1.5 flex items-center justify-center">
                    <button
                      type="button"
                      disabled={effectiveEditMode}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePanelInteract(panel);
                      }}
                      className="w-full h-full rounded-xl bg-gradient-to-r from-sky-900/80 to-indigo-900/80 hover:from-sky-700 hover:to-indigo-700 border-2 border-sky-400 text-sky-100 font-extrabold text-xs uppercase tracking-wider px-3 py-1 flex items-center justify-between shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <i className="fas fa-desktop text-sky-400 text-xs"></i>
                        <span className="truncate" style={{ color: panel.textColor || '#e0f2fe' }}>{panel.panelName || 'JUMP SCREEN'}</span>
                      </div>
                      <i className="fas fa-arrow-right text-sky-400 text-xs shrink-0 ml-1"></i>
                    </button>
                  </div>
                ) : panel.type === PanelType.SLIDER ? (
                  /* Interactive Range Slider Element */
                  <div className="w-full h-full p-2 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold truncate uppercase tracking-wider" style={{ color: panel.textColor || '#cbd5e1' }}>
                        {panel.panelName || 'SLIDER'}
                      </span>
                      <span className="text-[11px] font-extrabold font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                        {sliderValues[panel.panelId] !== undefined 
                          ? sliderValues[panel.panelId] 
                          : (liveValue !== undefined ? Number(liveValue) : (panel.payloadMin ?? 0))}
                        {panel.unit ? ` ${panel.unit}` : ''}
                      </span>
                    </div>

                    <div className="relative w-full my-1 flex flex-col justify-center">
                      <input
                        type="range"
                        min={panel.payloadMin ?? 0}
                        max={panel.payloadMax ?? 100}
                        step={panel.sliderStep || 1}
                        value={
                          sliderValues[panel.panelId] !== undefined 
                            ? sliderValues[panel.panelId] 
                            : (liveValue !== undefined ? Number(liveValue) : (panel.payloadMin ?? 0))
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSliderValues(prev => ({ ...prev, [panel.panelId]: val }));
                          const targetTopic = panel.publishTopic?.trim() || panel.topic?.trim();
                          if (onPublish && targetTopic) {
                            onPublish(targetTopic, formatPublishPayload(val, panel));
                          }
                        }}
                        onMouseDown={(e) => {
                          if (effectiveEditMode) {
                            handlePanelSelect(panel.panelId, e.shiftKey || e.ctrlKey || e.metaKey);
                          } else {
                            e.stopPropagation();
                          }
                        }}
                        onTouchStart={(e) => {
                          if (effectiveEditMode) {
                            handlePanelSelect(panel.panelId, false);
                          } else {
                            e.stopPropagation();
                          }
                        }}
                        className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400 hover:accent-sky-300 transition-all border border-slate-700/80"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-0.5">
                      <span>{panel.payloadMin ?? 0}</span>
                      <span>{panel.payloadMax ?? 100}</span>
                    </div>
                  </div>
                ) : panel.type === PanelType.PROGRESS || (panel.type as string) === 'progress_bar' ? (
                  /* Visual Progress Bar Element */
                  ((min: number, max: number) => {
                    const numVal = Number(liveValue !== undefined ? liveValue : min);
                    const range = (max - min) || 1;
                    const pct = Math.max(0, Math.min(100, ((numVal - min) / range) * 100));
                    const barColor = pct > 75 
                      ? (panel.firstColor || '#0ea5e9') 
                      : pct > 35 
                      ? (panel.secondColor || '#10b981') 
                      : (panel.thirdColor || '#f43f5e');

                    return (
                      <div className="w-full h-full p-2 flex flex-col justify-between overflow-hidden">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-bold truncate uppercase tracking-wider" style={{ color: panel.textColor || '#cbd5e1' }}>
                            {panel.panelName || 'PROGRESS'}
                          </span>
                          <span className="text-[11px] font-extrabold font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                            {Math.round(pct)}%
                          </span>
                        </div>

                        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 my-1 shadow-inner">
                          <div 
                            className="h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>

                        <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5">
                          <span>{numVal} {panel.unit || ''}</span>
                          <span>Max: {max}</span>
                        </div>
                      </div>
                    );
                  })(panel.payloadMin ?? 0, panel.payloadMax ?? 100)
                ) : panel.type === PanelType.TEXT_OUTPUT || (panel.type as string) === 'text_display' || panel.type === PanelType.LOG ? (
                  /* Text Output / Sensor Readout Display Element */
                  (() => {
                    const min = panel.payloadMin ?? 0;
                    const max = panel.payloadMax ?? 100;
                    const range = max - min || 1;
                    const lowVal = panel.lowThreshold !== undefined ? panel.lowThreshold : min + range * 0.333;
                    const highVal = panel.highThreshold !== undefined ? panel.highThreshold : min + range * 0.666;
                    const numVal = typeof liveValue === 'number' && !isNaN(liveValue) ? liveValue : parseFloat(rawStringValue);

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
                      <div className="w-full h-full p-2 flex flex-col justify-between overflow-hidden">
                        <span className="text-[10px] font-bold truncate uppercase tracking-wider mb-0.5" style={{ color: panel.textColor || '#94a3b8' }}>
                          {panel.panelName || 'TEXT DISPLAY'}
                        </span>
                        <div 
                          className="flex items-baseline justify-between px-2.5 py-1.5 rounded-lg my-auto transition-all duration-300"
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            borderColor: `${dynamicColor}50`,
                            borderWidth: '1px'
                          }}
                        >
                          <span 
                            className={`font-bold tracking-wider truncate ${panel.digitalDisplay !== false ? 'digital-font' : ''}`}
                            style={{ fontSize: `${panel.fontSize || 16}px`, color: dynamicColor }}
                          >
                            {rawStringValue !== '' ? rawStringValue : (liveValue !== undefined ? String(liveValue) : '0')}
                          </span>
                          {panel.unit && <span className="text-[10px] font-mono font-bold ml-1.5 shrink-0" style={{ color: dynamicColor }}>{panel.unit}</span>}
                        </div>
                      </div>
                    );
                  })()
                ) : panel.type === PanelType.TEXT_INPUT ? (
                  /* Interactive Text / Numeric Input Field */
                  <div 
                    className="w-full h-full p-2 flex flex-col justify-between overflow-hidden"
                    onMouseDown={(e) => {
                      if (effectiveEditMode) {
                        handlePanelSelect(panel.panelId, e.shiftKey || e.ctrlKey || e.metaKey);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold truncate uppercase tracking-wider" style={{ color: panel.textColor || '#94a3b8' }}>
                        {panel.panelName || 'TEXT INPUT'}
                      </span>
                      {panel.dataType !== 'text' && (panel.payloadMin !== undefined || panel.payloadMax !== undefined) && (
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">
                          {panel.payloadMin ?? 0}..{panel.payloadMax ?? 100}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 my-0.5">
                      <input
                        type={panel.dataType === 'text' ? 'text' : 'number'}
                        value={
                          textInputValues[panel.panelId] !== undefined
                            ? textInputValues[panel.panelId]
                            : (liveValue !== undefined ? String(liveValue) : '')
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setTextInputValues(prev => ({ ...prev, [panel.panelId]: val }));
                          if (textInputErrors[panel.panelId]) {
                            setTextInputErrors(prev => ({ ...prev, [panel.panelId]: null }));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            const val = textInputValues[panel.panelId] ?? String(liveValue ?? '');
                            handleSendTextInput(panel, val);
                          }
                        }}
                        onMouseDown={(e) => {
                          if (!effectiveEditMode) e.stopPropagation();
                        }}
                        onTouchStart={(e) => {
                          if (!effectiveEditMode) e.stopPropagation();
                        }}
                        onClick={(e) => {
                          if (!effectiveEditMode) e.stopPropagation();
                        }}
                        placeholder={panel.dataType === 'text' ? 'Enter text...' : `Value (${panel.payloadMin ?? 0} - ${panel.payloadMax ?? 100})...`}
                        className="flex-1 bg-black/80 border border-slate-700 focus:border-amber-500 text-amber-300 font-mono text-xs rounded-lg px-2 py-1 outline-none min-w-0"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          if (!effectiveEditMode) e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const val = textInputValues[panel.panelId] ?? String(liveValue ?? '');
                          handleSendTextInput(panel, val);
                        }}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-transform active:scale-95 shrink-0 cursor-pointer flex items-center space-x-1"
                      >
                        <span>Send</span>
                        <i className="fas fa-paper-plane text-[9px]"></i>
                      </button>
                    </div>

                    {textInputErrors[panel.panelId] ? (
                      <span className="text-[9px] text-rose-400 font-semibold truncate block">
                        {textInputErrors[panel.panelId]}
                      </span>
                    ) : (
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                        <span className="truncate">Val: {liveValue !== undefined ? String(liveValue) : '---'}</span>
                        {panel.unit && <span className="text-sky-400 font-bold ml-1">{panel.unit}</span>}
                      </div>
                    )}
                  </div>
                ) : panel.type === PanelType.LED ? (
                  /* Fan / Status Indicator Lamp */
                  ((isOn: boolean) => {
                    const activeIcon = isOn ? (panel.iconOn || 'fa-fan') : (panel.iconOff || 'fa-fan');
                    const activeColor = isOn ? (panel.iconColorOn || '#10b981') : (panel.iconColorOff || '#64748b');
                    const isAnimate = isOn ? !!panel.rotateOn : !!panel.rotateOff;
                    const isFlash = isOn ? !!panel.flashOn : !!panel.flashOff;
                    const animSpeed = isOn ? (panel.animSpeedOn || 'medium') : (panel.animSpeedOff || 'medium');

                    return (
                      <div className="w-full h-full p-2 flex items-center justify-between space-x-2">
                        <div className="flex flex-col truncate">
                          <span className="text-[10px] font-bold truncate" style={{ color: panel.textColor || '#cbd5e1' }}>{panel.panelName}</span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {isOn ? (panel.payloadOnText || 'RUNNING') : (panel.payloadOffText || 'STOPPED')}
                          </span>
                        </div>
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                          style={{
                            backgroundColor: isOn 
                              ? `${activeColor}25` 
                              : '#1e293b',
                            borderColor: isOn 
                              ? activeColor 
                              : '#334155',
                            color: activeColor
                          }}
                        >
                          <SmartIcon icon={activeIcon} isAnimate={isAnimate} isFlash={isFlash} speed={animSpeed} />
                        </div>
                      </div>
                    );
                  })(String(liveValue) === String(panel.payloadOn ?? '1'))
                ) : panel.type === PanelType.COMBO_BOX ? (
                  /* Combo Box Dropdown Element */
                  <div className="w-full h-full p-2 flex flex-col justify-between overflow-hidden">
                    <span className="text-[10px] font-bold truncate uppercase tracking-wider mb-1" style={{ color: panel.textColor || '#94a3b8' }}>
                      {panel.panelName}
                    </span>
                    <select
                      value={rawStringValue}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        const selectedVal = e.target.value;
                        if (onPublish) onPublish(panel.publishTopic || panel.topic, formatPublishPayload(selectedVal, panel));
                      }}
                      style={{ color: panel.textColor || '#fcd34d' }}
                      className="w-full bg-slate-950 border border-slate-700 font-bold text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer font-mono"
                    >
                      <option value="" disabled className="text-slate-500">Select option...</option>
                      {getNormalizedOptions(panel).map((opt, i) => (
                        <option key={i} value={opt.value} className="bg-slate-900 text-white">
                          {opt.label} ({opt.value})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : panel.type === PanelType.RADIO_BUTTONS || panel.type === PanelType.MULTI_STATE ? (
                  /* Radio Button Group Element */
                  <div className="w-full h-full p-2 flex flex-col overflow-hidden">
                    <span className="text-[10px] font-bold truncate uppercase tracking-wider mb-1" style={{ color: panel.textColor || '#94a3b8' }}>
                      {panel.panelName}
                    </span>
                    <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-full">
                      {getNormalizedOptions(panel).map((opt, i) => {
                        const isActive = rawStringValue === opt.value || rawStringValue === opt.label || rawStringValue === String(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onPublish) onPublish(panel.publishTopic || panel.topic, formatPublishPayload(opt.value, panel));
                            }}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1.5 border transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-sm'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                              isActive ? 'border-amber-400 bg-amber-400/20' : 'border-slate-600'
                            }`}>
                              {isActive && <div className="w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_4px_#f59e0b]"></div>}
                            </div>
                            <span style={{ color: panel.textColor }}>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : panel.type === PanelType.LINE_GRAPH ? (
                  /* Line Graph Element */
                  <div className="w-full h-full p-2 flex flex-col overflow-hidden">
                    <span className="text-[10px] font-bold truncate uppercase tracking-wider mb-1" style={{ color: panel.textColor || '#94a3b8' }}>
                      {panel.panelName}
                    </span>
                    <div className="flex-1 w-full overflow-hidden">
                      <LineGraph 
                        history={[]} 
                        unit={panel.unit} 
                        color={panel.penColor || panel.firstColor || '#38bdf8'} 
                        penThickness={panel.penThickness || 2}
                        graphType={panel.graphType || 'line'}
                        showGrid={panel.showGrid !== false}
                        fillArea={panel.fillArea !== false}
                        payloadMin={panel.payloadMin}
                        payloadMax={panel.payloadMax}
                        height={60}
                      />
                    </div>
                  </div>
                ) : panel.type === PanelType.GAUGE ? (
                  <div className="w-full h-full p-2 flex flex-col items-center justify-between text-center overflow-hidden">
                    <span className="text-[10px] font-bold truncate w-full text-center shrink-0" style={{ color: panel.textColor || '#94a3b8' }}>
                      {panel.panelName || 'GAUGE'}
                    </span>
                    <div className="w-full flex-1 flex items-center justify-center overflow-hidden min-h-0">
                      <Gauge 
                        value={typeof liveValue === 'number' && !isNaN(liveValue) ? liveValue : (liveValue !== undefined && !isNaN(Number(liveValue)) ? Number(liveValue) : 0)} 
                        min={panel.payloadMin ?? 0} 
                        max={panel.payloadMax ?? 100} 
                        unit={panel.unit || ''}
                        color1={panel.firstColor || '#38bdf8'}
                        color2={panel.secondColor || '#10b981'}
                        color3={panel.thirdColor || '#f43f5e'}
                        precision={panel.decimalPrecision ?? 1}
                        lowThreshold={panel.lowThreshold}
                        highThreshold={panel.highThreshold}
                      />
                    </div>
                  </div>
                ) : panel.type === PanelType.IMAGE || panel.type === 'image' ? (
                  /* Media Asset (JPG, PNG, GIF, SVG) Element or Symbol Factory 3.0 Dynamic Symbol */
                  <div className="w-full h-full relative flex items-center justify-center overflow-hidden rounded-[inherit]">
                    {panel.symbolId || panel.symbolAnimType ? (
                      <DynamicIndustrialSymbol
                        symbolId={panel.symbolId}
                        panel={panel}
                        liveValue={liveValue}
                        latestValues={latestValues}
                        className="w-full h-full"
                      />
                    ) : panel.imageUrl || panel.staticText ? (
                      <img
                        src={panel.imageUrl || panel.staticText}
                        alt={panel.panelName || 'Imported Media'}
                        className="w-full h-full pointer-events-none select-none transition-all"
                        style={{
                          objectFit: (panel.imageFit as any) || 'contain',
                          opacity: panel.opacity !== undefined ? panel.opacity : 1
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-purple-400/70 p-2">
                        <i className="fas fa-file-image text-2xl mb-1"></i>
                        <span className="text-[10px] font-bold">No Image Source</span>
                      </div>
                    )}
                  </div>
                ) : panel.type === PanelType.CLOCK || (panel.type as string) === 'clock' ? (
                  /* Realtime Date & Time Clock Widget */
                  <LiveClockWidget panel={panel} />
                ) : panel.type === PanelType.ALARM_LOG || (panel.type as string) === 'alarm_log' ? (
                  /* Alarm Historian Live Log Canvas Widget */
                  <AlarmHistorianWidget panel={panel} />
                ) : panel.type === PanelType.SHAPE || (panel.type as string) === 'shape' || panel.type === PanelType.PIPE || (panel.type as string) === 'pipe' ? (
                  /* Vector / Geometric Shape Element */
                  ((shapePts) => (
                    <div className="w-full h-full relative flex items-center justify-center select-none overflow-visible">
                      {panel.shapeType === 'circle' ? (
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <ellipse 
                            cx="50" cy="50" rx="46" ry="46" 
                            fill={panel.bgColor && panel.bgColor !== 'transparent' && !panel.bgColor.includes('15, 23, 42') ? panel.bgColor : 'rgba(56, 189, 248, 0.15)'} 
                            stroke={panel.borderColor || '#38bdf8'} 
                            strokeWidth={panel.borderWidth || 2} 
                          />
                        </svg>
                      ) : panel.shapeType === 'line' ? (
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polyline
                            points={shapePts.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={panel.borderColor || '#38bdf8'}
                            strokeWidth={panel.borderWidth || 3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : panel.shapeType === 'polyline' ? (
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polyline
                            points={shapePts.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke={panel.borderColor || '#38bdf8'}
                            strokeWidth={panel.borderWidth || 3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : panel.shapeType === 'polyline' ? (
                        (() => {
                          const boxW = Math.max(10, pos.w);
                          const boxH = Math.max(10, pos.h);
                          const polyPts = shapePts.map(p => `${(p.x / 100) * boxW},${(p.y / 100) * boxH}`).join(' ');
                          return (
                            <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${boxW} ${boxH}`}>
                              <polyline
                                points={polyPts}
                                fill="none"
                                stroke={panel.borderColor || '#38bdf8'}
                                strokeWidth={panel.borderWidth || 3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          );
                        })()
                      ) : panel.shapeType === 'polygon' || panel.shapeType === 'custom_polygon' ? (
                        (() => {
                          const boxW = Math.max(10, pos.w);
                          const boxH = Math.max(10, pos.h);
                          const polyPts = shapePts.map(p => `${(p.x / 100) * boxW},${(p.y / 100) * boxH}`).join(' ');
                          return (
                            <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${boxW} ${boxH}`}>
                              <polygon
                                points={polyPts}
                                fill={panel.bgColor && panel.bgColor !== 'transparent' && !panel.bgColor.includes('15, 23, 42') ? panel.bgColor : 'rgba(56, 189, 248, 0.15)'}
                                stroke={panel.borderColor || '#38bdf8'}
                                strokeWidth={panel.borderWidth || 2}
                                strokeLinejoin="round"
                              />
                            </svg>
                          );
                        })()
                      ) : panel.shapeType === 'pipe' || panel.type === PanelType.PIPE || (panel.type as string) === 'pipe' ? (
                        /* Iconics GraphWorX Style 3D Process Pipe with Realistic Turning Radius, Midline Highlight & Bubble Flow Mechanics */
                        (() => {
                          const boxW = Math.max(10, pos.w);
                          const boxH = Math.max(10, pos.h);
                          const pixelPts = shapePts.map(p => ({
                            x: (p.x / 100) * boxW,
                            y: (p.y / 100) * boxH
                          }));
                          const dPath = getPipeFilletPath(pixelPts, panel.pipeCornerRadius || 16);
                          const pipeThick = Math.min(60, Math.max(2, panel.borderWidth ?? 10));
                          const pipeRadius = Math.max(1.5, pipeThick / 2);

                          // Evaluate Tag Condition for Fluid Flow Animation
                          const checkPipeAnimCondition = () => {
                            if (panel.pipeAnimCondition === 'tag_condition') {
                              if (liveValue === undefined || liveValue === null) return false;
                              const targetVal = panel.pipeAnimValue !== undefined ? panel.pipeAnimValue : '1';
                              const op = panel.pipeAnimOperator || '=';

                              const numLive = Number(liveValue);
                              const numTarget = Number(targetVal);
                              const isBothNumeric = !isNaN(numLive) && !isNaN(numTarget);

                              if (op === '=') return String(liveValue) === String(targetVal);
                              if (op === '!=') return String(liveValue) !== String(targetVal);
                              if (isBothNumeric) {
                                if (op === '>') return numLive > numTarget;
                                if (op === '<') return numLive < numTarget;
                                if (op === '>=') return numLive >= numTarget;
                                if (op === '<=') return numLive <= numTarget;
                              }
                              return String(liveValue) === String(targetVal);
                            }
                            return panel.rotateOn !== false;
                          };

                          const isFlowAnimating = checkPipeAnimCondition();
                          const flowDir = panel.pipeFlowDirection || 'ltr';
                          const endType = panel.pipeEndType || 'flange';
                          const animStyle = panel.pipeAnimStyle || 'bubbles';

                          return (
                            <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${boxW} ${boxH}`}>
                              <defs>
                                <linearGradient id={`pipeGrad_${panel.panelId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#1e293b" />
                                  <stop offset="25%" stopColor={panel.borderColor || '#64748b'} />
                                  <stop offset="50%" stopColor="#f8fafc" />
                                  <stop offset="75%" stopColor={panel.borderColor || '#64748b'} />
                                  <stop offset="100%" stopColor="#0f172a" />
                                </linearGradient>
                                <style>{`
                                  @keyframes pipeFlowLtr {
                                    from { stroke-dashoffset: 40; }
                                    to { stroke-dashoffset: 0; }
                                  }
                                  @keyframes pipeFlowRtl {
                                    from { stroke-dashoffset: 0; }
                                    to { stroke-dashoffset: 40; }
                                  }
                                `}</style>
                              </defs>

                              {/* Layer 1: Outer Dark Boundary Wall / Shadow */}
                              <path
                                d={dPath}
                                fill="none"
                                stroke="#090d16"
                                strokeWidth={pipeThick + 2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              {/* Layer 2: 3D Metallic Pipe Body Casing */}
                              <path
                                d={dPath}
                                fill="none"
                                stroke={panel.borderColor || '#64748b'}
                                strokeWidth={pipeThick}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              {/* Layer 3: Midline Center Specular Light Gradient Highlight (Iconics GraphWorX 3D Cylindrical Sheen) */}
                              <path
                                d={dPath}
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth={Math.max(1, Math.floor(pipeThick * 0.28))}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ opacity: 0.65 }}
                              />

                              {/* Layer 4: Inner Fluid Core Tube */}
                              <path
                                d={dPath}
                                fill="none"
                                stroke={panel.firstColor || '#ef4444'}
                                strokeWidth={Math.max(2, Math.floor(pipeThick * 0.48))}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ opacity: 0.85 }}
                              />

                              {/* Layer 5: Bubble Flow Mechanics Animation (Set of 2-3 Different Sized Small Floating Circles) */}
                              {animStyle === 'bubbles' ? (
                                <g>
                                  {/* Big Bubbles */}
                                  <path
                                    d={dPath}
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth={Math.max(2.2, Math.floor(pipeThick * 0.38))}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray="0 28 0 38"
                                    style={{
                                      animation: isFlowAnimating
                                        ? `${flowDir === 'rtl' ? 'pipeFlowRtl' : 'pipeFlowLtr'} 1.5s linear infinite`
                                        : 'none',
                                      opacity: isFlowAnimating ? 0.95 : 0.25
                                    }}
                                  />
                                  {/* Medium Bubbles */}
                                  <path
                                    d={dPath}
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth={Math.max(1.6, Math.floor(pipeThick * 0.25))}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray="0 18 0 24"
                                    style={{
                                      animation: isFlowAnimating
                                        ? `${flowDir === 'rtl' ? 'pipeFlowRtl' : 'pipeFlowLtr'} 1.1s linear infinite`
                                        : 'none',
                                      opacity: isFlowAnimating ? 0.85 : 0.2
                                    }}
                                  />
                                  {/* Small Bubbles */}
                                  <path
                                    d={dPath}
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth={Math.max(1.0, Math.floor(pipeThick * 0.15))}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray="0 10 0 14"
                                    style={{
                                      animation: isFlowAnimating
                                        ? `${flowDir === 'rtl' ? 'pipeFlowRtl' : 'pipeFlowLtr'} 0.8s linear infinite`
                                        : 'none',
                                      opacity: isFlowAnimating ? 0.75 : 0.15
                                    }}
                                  />
                                </g>
                              ) : (
                                /* Dashed Flow Pattern Fallback */
                                <path
                                  d={dPath}
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth={Math.max(1.5, Math.floor(pipeThick * 0.3))}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeDasharray="10 8"
                                  style={{
                                    animation: isFlowAnimating
                                      ? `${flowDir === 'rtl' ? 'pipeFlowRtl' : 'pipeFlowLtr'} 1.2s linear infinite`
                                      : 'none',
                                    opacity: isFlowAnimating ? 0.9 : 0.3
                                  }}
                                />
                              )}

                              {/* End Fittings (Flange, Round, Triangle) */}
                              {pixelPts.map((pt, idx) => {
                                const isStartOrEnd = idx === 0 || idx === pixelPts.length - 1;
                                let angle = 0;
                                if (idx === 0 && pixelPts.length > 1) {
                                  angle = Math.atan2(pixelPts[1].y - pt.y, pixelPts[1].x - pt.x) * (180 / Math.PI);
                                } else if (idx === pixelPts.length - 1 && pixelPts.length > 1) {
                                  angle = Math.atan2(pt.y - pixelPts[idx - 1].y, pt.x - pixelPts[idx - 1].x) * (180 / Math.PI);
                                } else if (idx > 0 && idx < pixelPts.length - 1) {
                                  angle = Math.atan2(pixelPts[idx + 1].y - pixelPts[idx - 1].y, pixelPts[idx + 1].x - pixelPts[idx - 1].x) * (180 / Math.PI);
                                }

                                return (
                                  <g key={idx} transform={`translate(${pt.x}, ${pt.y}) rotate(${angle})`}>
                                    {isStartOrEnd ? (
                                      endType === 'round' ? (
                                        /* Round Dome Cap End Fitting */
                                        <g>
                                          <circle r={pipeRadius + 1.8} fill={panel.borderColor || '#64748b'} stroke="#0f172a" strokeWidth="0.8" />
                                          <circle r={Math.max(1, pipeRadius - 0.8)} fill="#ffffff" opacity="0.8" />
                                        </g>
                                      ) : endType === 'triangle' ? (
                                        /* Triangle / Nozzle Conical End Fitting */
                                        <g>
                                          <polygon
                                            points={`-${pipeRadius},-${pipeRadius + 3} ${pipeRadius + 4},0 -${pipeRadius},${pipeRadius + 3}`}
                                            fill={panel.borderColor || '#64748b'}
                                            stroke="#0f172a"
                                            strokeWidth="0.8"
                                          />
                                          <polygon
                                            points={`-${pipeRadius - 1},-${pipeRadius - 0.5} ${pipeRadius + 1},0 -${pipeRadius - 1},${pipeRadius - 0.5}`}
                                            fill="#ffffff"
                                            opacity="0.8"
                                          />
                                        </g>
                                      ) : (
                                        /* Industrial Collar Flange with Bolt Anchors */
                                        <g>
                                          <rect x="-3" y={-(pipeRadius + 3)} width="6" height={(pipeRadius + 3) * 2} rx="1.5" fill={panel.borderColor || '#64748b'} stroke="#0f172a" strokeWidth="0.8" />
                                          <rect x="-1" y={-(pipeRadius + 1.5)} width="2" height={(pipeRadius + 1.5) * 2} fill="#ffffff" opacity="0.8" />
                                          <circle cx="0" cy={-(pipeRadius + 1.8)} r="1" fill="#f8fafc" />
                                          <circle cx="0" cy={pipeRadius + 1.8} r="1" fill="#f8fafc" />
                                        </g>
                                      )
                                    ) : null}
                                  </g>
                                );
                              })}
                            </svg>
                          );
                        })()
                      ) : panel.shapeType === 'triangle' ? (
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polygon 
                            points="50,5 95,95 5,95" 
                            fill={panel.bgColor && panel.bgColor !== 'transparent' && !panel.bgColor.includes('15, 23, 42') ? panel.bgColor : 'rgba(56, 189, 248, 0.15)'} 
                            stroke={panel.borderColor || '#38bdf8'} 
                            strokeWidth={panel.borderWidth || 2} 
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : panel.shapeType === 'star' ? (
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polygon 
                            points="50,5 63,35 95,38 71,60 78,92 50,75 22,92 29,60 5,38 37,35" 
                            fill={panel.bgColor && panel.bgColor !== 'transparent' && !panel.bgColor.includes('15, 23, 42') ? panel.bgColor : 'rgba(245, 158, 11, 0.2)'} 
                            stroke={panel.borderColor || '#f59e0b'} 
                            strokeWidth={panel.borderWidth || 2} 
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : panel.shapeType === 'arrow' ? (
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polygon 
                            points="0,35 60,35 60,10 100,50 60,90 60,65 0,65" 
                            fill={panel.bgColor && panel.bgColor !== 'transparent' && !panel.bgColor.includes('15, 23, 42') ? panel.bgColor : 'rgba(16, 185, 129, 0.25)'} 
                            stroke={panel.borderColor || '#10b981'} 
                            strokeWidth={panel.borderWidth || 2} 
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        /* Rectangle */
                        <div 
                          className="w-full h-full border-2 flex items-center justify-center transition-all"
                          style={{
                            backgroundColor: panel.bgColor || 'rgba(15, 23, 42, 0.6)',
                            borderColor: panel.borderColor || '#38bdf8',
                            borderRadius: `${panel.borderRadius ?? 8}px`
                          }}
                        >
                          {panel.panelName && <span className="text-[10px] font-bold text-slate-200 truncate px-2">{panel.panelName}</span>}
                        </div>
                      )}

                      {/* Interactive Vertex Node Bending Points for Lines, Polylines, Process Pipes & Custom Polygons */}
                      {isSelected && effectiveEditMode && (panel.shapeType === 'polyline' || panel.shapeType === 'custom_polygon' || panel.shapeType === 'line' || panel.shapeType === 'polygon' || panel.shapeType === 'pipe' || panel.type === PanelType.PIPE || (panel.type as string) === 'pipe') && (
                        <>
                          <div className="absolute inset-0 pointer-events-auto z-50">
                            {shapePts.map((pt, nIdx) => {
                              const isNodeSelected = selectedNodeInfo?.panelId === panel.panelId && selectedNodeInfo?.nodeIndex === nIdx;
                              return (
                                <div
                                  key={nIdx}
                                  onMouseDown={(e) => handleNodeMouseDown(e, panel.panelId, nIdx)}
                                  className={`w-4 h-4 rounded-full absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing hover:scale-125 transition-transform shadow-lg border-2 border-slate-950 ${
                                    isNodeSelected
                                      ? 'bg-cyan-300 ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50 animate-pulse'
                                      : 'bg-amber-400 hover:bg-amber-300'
                                  }`}
                                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                                  title={`Bending Point ${nIdx + 1} (${pt.x}%, ${pt.y}%) - Click to select, drag or use Arrow keys (← ↑ → ↓) to move`}
                                />
                              );
                            })}
                          </div>

                          <div className="absolute -top-9 left-0 flex items-center space-x-1 bg-slate-950/95 border border-amber-500/60 text-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-xl z-50 pointer-events-auto">
                            <i className="fas fa-draw-polygon text-amber-400 text-xs"></i>
                            <span className="hidden sm:inline">Nodes ({shapePts.length}):</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddShapeNode(panel);
                              }}
                              className="px-1.5 py-0.2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded font-black cursor-pointer shadow-sm transition-transform active:scale-95"
                              title="Add bending point to pipe segment"
                            >
                              + Point
                            </button>
                            {shapePts.length > 2 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveShapeNode(panel);
                                }}
                                className="px-1.5 py-0.2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded font-bold cursor-pointer border border-rose-500/30 transition-transform active:scale-95"
                                title="Remove selected or last bending point"
                              >
                                - Remove
                              </button>
                            )}
                            {selectedNodeInfo && selectedNodeInfo.panelId === panel.panelId && (
                              <span className="ml-1 text-[9px] text-cyan-300 font-mono bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/40">
                                Pt #{selectedNodeInfo.nodeIndex + 1} Active (← ↑ → ↓)
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))(panel.shapePoints || (
                    panel.shapeType === 'polyline' || panel.shapeType === 'line' || panel.shapeType === 'pipe' || panel.type === PanelType.PIPE || (panel.type as string) === 'pipe'
                      ? [{ x: 0, y: 50 }, { x: 50, y: 50 }, { x: 100, y: 50 }]
                      : [{ x: 50, y: 5 }, { x: 95, y: 35 }, { x: 80, y: 95 }, { x: 20, y: 95 }, { x: 5, y: 35 }]
                  ))
                ) : (
                  /* Default fallback box */
                  <div className="w-full h-full p-2 flex flex-col justify-center items-center text-center truncate">
                    <span className="text-[10px] font-bold truncate w-full" style={{ color: panel.textColor || '#cbd5e1' }}>{panel.panelName}</span>
                    <span className="text-xs font-mono font-bold mt-1" style={{ color: panel.textColor || '#fbbf24' }}>
                      {liveValue !== undefined ? String(liveValue) : '0'}
                    </span>
                  </div>
                )}

                {/* Group Badge Indicator */}
                {panel.groupId && (
                  <div className="absolute top-1 left-1 bg-indigo-500/80 text-white px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase shadow">
                    <i className="fas fa-link mr-0.5 text-[7px]"></i>
                    GRP
                  </div>
                )}

                {/* Trip / Fault Hazard Badge Overlay */}
                {isTripActive && (
                  <div className="absolute top-0 right-0 z-40 trip-badge-overlay flex items-center space-x-0.5 bg-red-600/90 text-white px-1.5 py-0.5 rounded-bl-lg rounded-tr-[inherit] shadow-lg">
                    <i className="fas fa-exclamation-triangle text-[9px] text-yellow-300"></i>
                    <span className="text-[8px] font-black uppercase tracking-wide">TRIP</span>
                  </div>
                )}

                {/* Edit Mode Selection Handle Badges */}
                {effectiveEditMode && isSelected && (
                  <>
                    <div className={`absolute -top-3 -right-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase shadow z-50 ${
                      isMaster ? 'bg-amber-500 text-slate-950' : 'bg-sky-500 text-slate-950'
                    }`}>
                      {isMaster ? 'Master Ref' : 'Selected'}
                    </div>

                    {/* Interactive Resize & Rotation Control Handles */}
                    <div className="absolute inset-0 pointer-events-none z-40">
                      {/* Outline dashed border */}
                      <div className="absolute inset-0 border-2 border-sky-400 border-dashed rounded-[inherit] pointer-events-none" />

                      {/* Rotation Handle (Top Center) */}
                      <div 
                        className="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto cursor-grab active:cursor-grabbing group/rot"
                        onMouseDown={(e) => handleRotateStart(e, panel, e.currentTarget.parentElement)}
                        title="Click and drag to rotate element (Shift for 15° snap)"
                      >
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 border-2 border-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.8)] flex items-center justify-center text-[10px] font-bold hover:scale-125 transition-transform">
                          <i className="fas fa-rotate"></i>
                        </div>
                        <div className="w-0.5 h-3 bg-amber-400"></div>
                      </div>

                      {/* 8 Corner & Edge Resize Handles */}
                      {/* Top-Left */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, panel, 'nw')}
                        className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm shadow-md cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
                        title="Resize Top-Left"
                      />
                      {/* Top-Center */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, panel, 'n')}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm shadow-md cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform"
                        title="Resize Height (Top)"
                      />
                      {/* Top-Right */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, panel, 'ne')}
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm shadow-md cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
                        title="Resize Top-Right"
                      />
                      {/* Middle-Right */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, panel, 'e')}
                        className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm shadow-md cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform"
                        title="Resize Width (Right)"
                      />
                      {/* Bottom-Right */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, panel, 'se')}
                        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm shadow-md cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
                        title="Resize Bottom-Right"
                      />
                      {/* Bottom-Center */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, panel, 's')}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm shadow-md cursor-ns-resize pointer-events-auto hover:scale-125 transition-transform"
                        title="Resize Height (Bottom)"
                      />
                      {/* Bottom-Left */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, panel, 'sw')}
                        className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm shadow-md cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
                        title="Resize Bottom-Left"
                      />
                      {/* Middle-Left */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, panel, 'w')}
                        className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-sky-500 rounded-sm shadow-md cursor-ew-resize pointer-events-auto hover:scale-125 transition-transform"
                        title="Resize Width (Left)"
                      />

                      {/* Dimension & Rotation Badge Overlay */}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900/95 text-amber-300 border border-slate-700 rounded text-[9px] font-mono shadow-xl font-bold whitespace-nowrap pointer-events-none">
                        {pos.w} × {pos.h} px {panel.rotation ? `| ${panel.rotation}°` : ''}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu.isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1.5 min-w-[220px] text-xs font-semibold animate-in fade-in duration-150 space-y-1"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          {/* Header */}
          <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
            <span>{contextMenu.panelId ? 'Element Options' : 'Screen Canvas'}</span>
            <i className="fas fa-sliders text-sky-400 text-[10px]"></i>
          </div>

          {contextMenu.panelId ? (
            <>
              {/* Element Context Menu Actions */}
              <button
                type="button"
                onClick={() => {
                  handleCopySelected();
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-sky-300 hover:text-sky-200 flex items-center justify-between transition-colors font-semibold"
              >
                <div className="flex items-center space-x-2.5">
                  <i className="fas fa-copy text-sky-400 w-4 text-center"></i>
                  <span>Copy ({selectedPanelIds.length})</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Ctrl+C</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleCutSelected();
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-rose-300 hover:text-rose-200 flex items-center justify-between transition-colors font-semibold"
              >
                <div className="flex items-center space-x-2.5">
                  <i className="fas fa-scissors text-rose-400 w-4 text-center"></i>
                  <span>Cut ({selectedPanelIds.length})</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Ctrl+X</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handlePasteFromClipboard(contextMenu.canvasX ? { x: contextMenu.canvasX, y: contextMenu.canvasY || 100 } : undefined);
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 flex items-center justify-between transition-colors font-semibold"
              >
                <div className="flex items-center space-x-2.5">
                  <i className="fas fa-paste text-emerald-400 w-4 text-center"></i>
                  <span>Paste</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Ctrl+V</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const p = panels.find(item => item.panelId === contextMenu.panelId);
                  if (p) onEditPanel(p);
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white flex items-center space-x-2.5 transition-colors"
              >
                <i className="fas fa-gear text-amber-400 w-4 text-center"></i>
                <span>Edit Configuration</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDuplicateSelected();
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <i className="fas fa-clone text-sky-400 w-4 text-center"></i>
                  <span>Duplicate</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Ctrl+D</span>
              </button>

              {/* Copy & Paste Properties Options */}
              <button
                type="button"
                onClick={() => {
                  handleCopyProperties();
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-amber-300 hover:text-amber-200 flex items-center space-x-2.5 transition-colors"
              >
                <i className="fas fa-paintbrush text-amber-400 w-4 text-center"></i>
                <span>Copy Visual Properties</span>
              </button>

              <button
                type="button"
                disabled={!copiedProperties}
                onClick={() => {
                  handlePasteProperties();
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className={`w-full text-left px-3 py-1.5 rounded-xl flex items-center space-x-2.5 transition-colors ${
                  copiedProperties
                    ? 'hover:bg-slate-800 text-amber-300 hover:text-amber-200 font-bold'
                    : 'opacity-40 cursor-not-allowed text-slate-500'
                }`}
              >
                <i className="fas fa-paint-roller text-amber-400 w-4 text-center"></i>
                <span>Paste Visual Properties ({selectedPanelIds.length})</span>
              </button>

              {/* Layering Z-Index Sub-Menu / Items */}
              <div className="pt-1 border-t border-slate-800/80 my-0.5 space-y-0.5">
                <div className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Layer Order</span>
                  <i className="fas fa-layer-group text-slate-400 text-[9px]"></i>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleBringToVeryFront();
                    setContextMenu({ isOpen: false, x: 0, y: 0 });
                  }}
                  className="w-full text-left px-3 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center space-x-2.5 transition-colors"
                >
                  <i className="fas fa-arrow-up-to-line text-sky-400 w-4 text-center text-xs"></i>
                  <span>Bring to Very Front</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleBringOneLayerFront();
                    setContextMenu({ isOpen: false, x: 0, y: 0 });
                  }}
                  className="w-full text-left px-3 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center space-x-2.5 transition-colors"
                >
                  <i className="fas fa-arrow-up text-sky-400 w-4 text-center text-xs"></i>
                  <span>Bring 1 Layer Forward</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSendOneLayerBack();
                    setContextMenu({ isOpen: false, x: 0, y: 0 });
                  }}
                  className="w-full text-left px-3 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center space-x-2.5 transition-colors"
                >
                  <i className="fas fa-arrow-down text-sky-400 w-4 text-center text-xs"></i>
                  <span>Send 1 Layer Backward</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSendToVeryBack();
                    setContextMenu({ isOpen: false, x: 0, y: 0 });
                  }}
                  className="w-full text-left px-3 py-1 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center space-x-2.5 transition-colors"
                >
                  <i className="fas fa-arrow-down-to-line text-sky-400 w-4 text-center text-xs"></i>
                  <span>Send to Very Back</span>
                </button>
              </div>

              {selectedPanelIds.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    handleGroupSelected();
                    setContextMenu({ isOpen: false, x: 0, y: 0 });
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 flex items-center space-x-2.5 transition-colors font-bold"
                >
                  <i className="fas fa-link text-indigo-400 w-4 text-center"></i>
                  <span>Group Elements</span>
                </button>
              )}

              {hasGroupedSelected && (
                <button
                  type="button"
                  onClick={() => {
                    handleUngroupSelected();
                    setContextMenu({ isOpen: false, x: 0, y: 0 });
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center space-x-2.5 transition-colors"
                >
                  <i className="fas fa-link-slash text-slate-400 w-4 text-center"></i>
                  <span>Ungroup Elements</span>
                </button>
              )}

              <div className="border-t border-slate-800/80 my-1"></div>

              <button
                type="button"
                onClick={() => {
                  handleDeleteSelected();
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <i className="fas fa-trash text-rose-400 w-4 text-center"></i>
                  <span>Delete Element(s)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Del</span>
              </button>
            </>
          ) : (
            <>
              {/* Screen Canvas Context Menu Actions */}
              <button
                type="button"
                onClick={() => {
                  handlePasteFromClipboard(contextMenu.canvasX ? { x: contextMenu.canvasX, y: contextMenu.canvasY || 100 } : undefined);
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 flex items-center justify-between transition-colors font-bold"
              >
                <div className="flex items-center space-x-2.5">
                  <i className="fas fa-paste text-emerald-400 w-4 text-center"></i>
                  <span>Paste Clipboard Content</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Ctrl+V</span>
              </button>

              <div className="border-t border-slate-800/80 my-1"></div>

              <button
                type="button"
                onClick={() => {
                  onOpenAddPanel();
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-sky-300 hover:text-sky-200 flex items-center space-x-2.5 transition-colors font-bold"
              >
                <i className="fas fa-plus text-sky-400 w-4 text-center"></i>
                <span>Add New Element</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSelectAll();
                  setContextMenu({ isOpen: false, x: 0, y: 0 });
                }}
                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white flex items-center space-x-2.5 transition-colors"
              >
                <i className="fas fa-border-all text-amber-400 w-4 text-center"></i>
                <span>Select All ({panels.length} Elements)</span>
              </button>

              <div className="border-t border-slate-800/80 my-1"></div>

              {/* Screen Background Color Options */}
              <div className="px-2 py-1 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Set Screen Background:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CANVAS_PRESET_COLORS.map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => {
                        updateCanvasBgColor(c.color);
                        setContextMenu({ isOpen: false, x: 0, y: 0 });
                      }}
                      className="w-5 h-5 rounded-md border border-slate-700 hover:scale-110 transition-transform cursor-pointer"
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Touch 7-Segment Keypad Popup Modal */}
      <KeypadModal
        isOpen={keypadConfig.isOpen}
        onClose={() => setKeypadConfig({ isOpen: false })}
        onConfirm={handleConfirmKeypad}
        initialValue={keypadConfig.currentVal}
        title={keypadConfig.panel?.panelName || 'Set Point Entry'}
        unit={keypadConfig.panel?.unit}
        min={keypadConfig.panel?.payloadMin}
        max={keypadConfig.panel?.payloadMax}
      />

      {/* Symbol Factory 3.0 Industrial Equipment Library Modal */}
      <SymbolLibraryModal
        isOpen={isSymbolLibraryOpen}
        onClose={() => setIsSymbolLibraryOpen(false)}
        onSelectSymbol={handleSelectIndustrialSymbol}
      />

      {/* Visual Property Copy / Paste Toast Banner */}
      {propertyCopiedToast && (
        <div className="fixed top-20 right-8 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl font-extrabold text-xs shadow-2xl border border-amber-300 flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-4 duration-200">
          <i className="fas fa-paintbrush text-sm"></i>
          <span>{propertyCopiedToast}</span>
        </div>
      )}

    </div>
  );
};

export default WebHmiCanvasView;
