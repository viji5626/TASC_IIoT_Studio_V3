import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Panel, TrendPen } from '../types';
import { applyLTTBDecimation, queryHistoricalRange, queryGapRecords } from '../utils/trendHistorianEngine';
import { isCommunityEditionActive } from '../utils/alarmHistorianEngine';
import { getPanelTelemetryStatus } from '../utils/staleHelper';

export interface DataPoint {
  value: number;
  time: string;
  timestampMs?: number;
}

export interface LineGraphProps {
  panel?: Panel;
  history?: DataPoint[];
  historyValues?: Record<string, DataPoint[]>;
  latestValues?: Record<string, { val: any; time: string; timestampMs?: number; quality?: string }>;
  unit?: string;
  color?: string;
  penThickness?: number;
  graphType?: 'line' | 'curve' | 'stepped' | 'bar' | 'hbar' | 'area';
  showGrid?: boolean;
  fillArea?: boolean;
  showMonitoringTable?: boolean;
  enableDualCursor?: boolean;
  pens?: TrendPen[];
  payloadMin?: number;
  payloadMax?: number;
  height?: number;
  isCompact?: boolean;
  isClientMode?: boolean;
}

function formatTimeDiff(
  c1Point?: { time: string; timestampMs?: number } | null,
  c2Point?: { time: string; timestampMs?: number } | null
): string {
  if (!c1Point || !c2Point) return '---';
  let diffMs: number | null = null;
  if (c1Point.timestampMs && c2Point.timestampMs) {
    diffMs = Math.abs(c2Point.timestampMs - c1Point.timestampMs);
  } else if (c1Point.time && c2Point.time) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const d1 = new Date(c1Point.time).getTime() || new Date(`${today}T${c1Point.time}`).getTime();
      const d2 = new Date(c2Point.time).getTime() || new Date(`${today}T${c2Point.time}`).getTime();
      if (!isNaN(d1) && !isNaN(d2)) {
        diffMs = Math.abs(d2 - d1);
      }
    } catch {
      diffMs = null;
    }
  }

  if (diffMs === null || isNaN(diffMs)) return '---';

  const totalSec = Math.floor(diffMs / 1000);
  const ms = diffMs % 1000;
  if (totalSec < 60) {
    return `${totalSec}.${Math.floor(ms / 100)}s`;
  }
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins < 60) {
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

/** Formats numbers with smart decimal places and SI units for ultra-clean readability */
function formatNumberReadable(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '---';
  const abs = Math.abs(val);
  if (abs === 0) return '0';
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${(val / 1_000).toFixed(1)}k`;
  if (abs >= 100) return val.toFixed(1);
  if (abs >= 1) return val.toFixed(2);
  return val.toFixed(3);
}

/** Formats timestamp nicely based on overall window duration */
function formatTimeTick(ts: number, spanMs: number): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '---';
  if (spanMs > 86400000 * 2) {
    // Multi-day span: show Mon DD, HH:mm
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (spanMs > 3600000) {
    // Multi-hour span: show HH:mm:ss
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  // Minute/second span: show mm:ss or HH:mm:ss
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Generate Monotone Cubic Spline curve path (Fritsch-Carlson algorithm — zero overshoot / no false spikes)
const getSplinePath = (coords: { x: number; y: number }[]): string => {
  if (!coords || coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  if (coords.length === 2) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)} L ${coords[1].x.toFixed(1)} ${coords[1].y.toFixed(1)}`;

  const n = coords.length;
  const dxs: number[] = [];
  const dys: number[] = [];
  const ms: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dx = coords[i + 1].x - coords[i].x;
    const dy = coords[i + 1].y - coords[i].y;
    dxs.push(dx);
    dys.push(dy);
    ms.push(dx === 0 ? 0 : dy / dx);
  }

  const c1s: number[] = [ms[0]];
  for (let i = 0; i < n - 2; i++) {
    const m = ms[i];
    const nextM = ms[i + 1];
    if (m * nextM <= 0) {
      c1s.push(0);
    } else {
      const dx_sum = dxs[i] + dxs[i + 1];
      c1s.push((3 * dx_sum) / ((dx_sum + dxs[i + 1]) / m + (dx_sum + dxs[i]) / nextM));
    }
  }
  c1s.push(ms[ms.length - 1]);

  for (let i = 0; i < n - 1; i++) {
    const m = ms[i];
    if (m === 0) {
      c1s[i] = 0;
      c1s[i + 1] = 0;
    } else {
      const alpha = c1s[i] / m;
      const beta = c1s[i + 1] / m;
      const dist = alpha * alpha + beta * beta;
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist);
        c1s[i] = tau * alpha * m;
        c1s[i + 1] = tau * beta * m;
      }
    }
  }

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const dx = dxs[i];

    const cp1x = p1.x + dx / 3;
    const cp1y = p1.y + (c1s[i] * dx) / 3;
    const cp2x = p2.x - dx / 3;
    const cp2y = p2.y - (c1s[i + 1] * dx) / 3;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
};

// Generate Stepped line path (SCADA step-change)
const getSteppedPath = (coords: { x: number; y: number }[]): string => {
  if (!coords || coords.length === 0) return '';
  return coords.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    return `${acc} H ${curr.x} V ${curr.y}`;
  }, '');
};

export const LineGraph: React.FC<LineGraphProps> = ({
  panel,
  history = [],
  historyValues = {},
  latestValues = {},
  unit = '',
  color = '#38bdf8',
  penThickness = 2.2,
  graphType = 'line',
  showGrid = true,
  fillArea = true,
  showMonitoringTable = true,
  enableDualCursor = false,
  pens,
  payloadMin,
  payloadMax,
  height,
  isCompact = false
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAtTime, setPausedAtTime] = useState<number | null>(null);
  const [showCursors, setShowCursors] = useState<boolean>(true);
  const [panOffsetMs, setPanOffsetMs] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    svgX: number;
    svgY: number;
    timestampMs: number;
    timeStr: string;
    points: Array<{ penName: string; color: string; value: number; unit: string; x: number; y: number }>;
  } | null>(null);
  const [hoveredPenId, setHoveredPenId] = useState<string | null>(null);

  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const initialPanOffsetRef = useRef(0);
  const initialPinchDistRef = useRef(0);
  const initialPinchZoomRef = useRef(1.0);

  const handleTogglePause = () => {
    setIsPaused(prev => {
      const next = !prev;
      if (next) {
        setPausedAtTime(Date.now());
      } else {
        setPausedAtTime(null);
      }
      return next;
    });
  };

  const handleResetZoomPan = () => {
    setPanOffsetMs(0);
    setZoomScale(1.0);
  };

  const [showToolbar, setShowToolbar] = useState(false);
  const [isDualCursor, setIsDualCursor] = useState(enableDualCursor);
  const [showTable, setShowTable] = useState(showMonitoringTable);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1M' | '10M' | '30M' | '1H' | '8H' | '1D' | '1W' | '1MO' | '1Y' | '5Y' | 'ALL' | 'CUSTOM'>('1M');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(Date.now() - 30 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [customTo, setCustomTo] = useState(() => {
    return new Date().toISOString().slice(0, 16);
  });
  const [cursor1Idx, setCursor1Idx] = useState<number | null>(null);
  const [cursor2Idx, setCursor2Idx] = useState<number | null>(null);
  const [activeCursorSelect, setActiveCursorSelect] = useState<1 | 2>(1);
  const [hiddenPens, setHiddenPens] = useState<Record<string, boolean>>({});
  const touchStartTime = useRef<number>(0);
  const [historyMode, setHistoryMode] = useState<'live' | 'historical'>('live');
  const [historicalData, setHistoricalData] = useState<Record<string, { t: number; v: number }[]>>({});
  const [, setGapZones] = useState<{ gapStartMs: number; gapEndMs: number }[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histQueryStart, setHistQueryStart] = useState(() => {
    const d = new Date(Date.now() - 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [histQueryEnd, setHistQueryEnd] = useState(() => {
    return new Date().toISOString().slice(0, 16);
  });

  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [svgDimensions, setSvgDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 220 });

  useEffect(() => {
    if (!graphContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height: h } = entry.contentRect;
        if (width > 0 && h > 0) {
          setSvgDimensions({
            width: Math.round(width),
            height: Math.round(h)
          });
        }
      }
    });
    observer.observe(graphContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const effectivePens: TrendPen[] = useMemo(() => {
    if (pens && pens.length > 0) {
      return pens.map(p => ({
        ...p,
        visible: !hiddenPens[p.id]
      }));
    }
    if (panel?.pens && panel.pens.length > 0) {
      return panel.pens.map(p => ({
        ...p,
        visible: !hiddenPens[p.id]
      }));
    }
    const singlePenId = panel?.panelId || 'default_pen';
    return [{
      id: singlePenId,
      name: panel?.panelName || 'Telemetry Signal',
      topic: panel?.topic || '',
      color: color || panel?.penColor || panel?.firstColor || '#38bdf8',
      thickness: penThickness || panel?.penThickness || 2.2,
      unit: unit || panel?.unit || '',
      visible: !hiddenPens[singlePenId]
    }];
  }, [pens, panel, color, penThickness, unit, hiddenPens]);

  // Auto-fetch historical database points on mount or time-window changes so existing logged data is immediately visible
  useEffect(() => {
    let isCancelled = false;
    const fetchDbHistory = async () => {
      const nowMs = Date.now();
      let durationMs = 2 * 3600 * 1000; // Always query at least 2 hours of history
      if (selectedTimeRange === '8H') durationMs = 8 * 3600 * 1000;
      else if (selectedTimeRange === '1D') durationMs = 24 * 3600 * 1000;
      else if (selectedTimeRange === '1W') durationMs = 7 * 86400 * 1000;
      else if (selectedTimeRange === '1MO') durationMs = 30 * 86400 * 1000;
      else if (selectedTimeRange === '1Y') durationMs = 365 * 86400 * 1000;
      else if (selectedTimeRange === 'ALL') durationMs = 5 * 365 * 86400 * 1000;

      const fromMs = nowMs - durationMs;
      const results: Record<string, { t: number; v: number }[]> = {};

      for (const pen of effectivePens) {
        const queryKeys = [
          pen.id,
          pen.name,
          pen.topic,
          (pen as any).driverTagId,
          (pen as any).tagId
        ].filter(Boolean) as string[];
        for (const key of queryKeys) {
          try {
            const rawPts = await queryHistoricalRange(key, fromMs, nowMs);
            if (rawPts && rawPts.length > 0) {
              results[pen.id] = rawPts.map(p => ({ t: p.t, v: p.v }));
              if (pen.name) results[pen.name] = results[pen.id];
              if (pen.topic) results[pen.topic] = results[pen.id];
              break;
            }
          } catch {}
        }
      }

      if (!isCancelled && Object.keys(results).length > 0) {
        setHistoricalData(prev => ({ ...prev, ...results }));
      }
    };

    fetchDbHistory();
    const retryTimer = setTimeout(() => {
      if (!isCancelled) fetchDbHistory();
    }, 1200);

    return () => {
      isCancelled = true;
      clearTimeout(retryTimer);
    };
  }, [effectivePens, selectedTimeRange]);

  const handleHistoricalQuery = useCallback(async () => {
    if (!panel?.pens && !panel?.topic) return;
    setHistLoading(true);
    const startMs = new Date(histQueryStart).getTime();
    const endMs = new Date(histQueryEnd).getTime();
    const topics: string[] = [];
    if (panel?.pens && panel.pens.length > 0) {
      panel.pens.forEach(p => topics.push(p.id || p.topic));
    } else if (panel?.topic) {
      topics.push(panel.topic);
    }
    const results: Record<string, { t: number; v: number }[]> = {};
    for (const top of topics) {
      const rawPts = await queryHistoricalRange(top, startMs, endMs);
      results[top] = rawPts.map(p => ({ t: p.t, v: p.v }));
    }
    const gaps = await queryGapRecords(startMs, endMs);
    setGapZones(gaps.map(g => ({ gapStartMs: g.gapStartMs, gapEndMs: g.gapEndMs })));
    setHistoricalData(results);
    setHistLoading(false);
  }, [panel, histQueryStart, histQueryEnd]);

  const handleSelectPresetTimeRange = (range: '1M' | '10M' | '30M' | '1H' | '8H' | '1D' | '1W' | '1MO' | '1Y' | '5Y' | 'ALL') => {
    setSelectedTimeRange(range);
    setShowCustomDatePicker(false);
    setPanOffsetMs(0);
  };

  const handleApplyCustomDateRange = async () => {
    if (!customFrom || !customTo) return;
    setSelectedTimeRange('CUSTOM');
    setShowCustomDatePicker(false);
    setPanOffsetMs(0);

    const fromMs = new Date(customFrom).getTime();
    const toMs = new Date(customTo).getTime();
    if (isNaN(fromMs) || isNaN(toMs)) return;

    setHistLoading(true);
    const topics: string[] = [];
    if (panel?.pens && panel.pens.length > 0) {
      panel.pens.forEach(p => topics.push(p.id || p.topic));
    } else if (panel?.topic) {
      topics.push(panel.topic);
    }
    const results: Record<string, { t: number; v: number }[]> = {};
    for (const top of topics) {
      const rawPts = await queryHistoricalRange(top, fromMs, toMs);
      results[top] = rawPts.map(p => ({ t: p.t, v: p.v }));
    }
    const gaps = await queryGapRecords(fromMs, toMs);
    setGapZones(gaps.map(g => ({ gapStartMs: g.gapStartMs, gapEndMs: g.gapEndMs })));
    setHistoricalData(results);
    setHistLoading(false);
  };

  // Live continuous scrolling clock ticker: updates every second when not paused
  const [liveNowMs, setLiveNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (isPaused || selectedTimeRange === 'CUSTOM') return;
    const interval = setInterval(() => {
      setLiveNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, selectedTimeRange]);

  const dynamicMaxPoints = Math.max(300, Math.min(1200, Math.round(svgDimensions.width * 1.5)));

  const timeWindow = useMemo(() => {
    const now = isPaused && pausedAtTime ? pausedAtTime : liveNowMs;
    let baseWindowDurationMs = 60 * 1000;
    if (selectedTimeRange === '1M') baseWindowDurationMs = 1 * 60 * 1000;
    else if (selectedTimeRange === '10M') baseWindowDurationMs = 10 * 60 * 1000;
    else if (selectedTimeRange === '30M') baseWindowDurationMs = 30 * 60 * 1000;
    else if (selectedTimeRange === '1H') baseWindowDurationMs = 60 * 60 * 1000;
    else if (selectedTimeRange === '8H') baseWindowDurationMs = 8 * 3600 * 1000;
    else if (selectedTimeRange === '1D') baseWindowDurationMs = 24 * 3600 * 1000;
    else if (selectedTimeRange === '1W') baseWindowDurationMs = 7 * 86400 * 1000;
    else if (selectedTimeRange === '1MO') baseWindowDurationMs = 30 * 86400 * 1000;
    else if (selectedTimeRange === '1Y') baseWindowDurationMs = 365 * 86400 * 1000;
    else if (selectedTimeRange === '5Y') baseWindowDurationMs = 5 * 365 * 86400 * 1000;
    else if (selectedTimeRange === 'ALL') baseWindowDurationMs = 10 * 365 * 86400 * 1000;

    if (isCommunityEditionActive() && baseWindowDurationMs > 3600000) {
      baseWindowDurationMs = 3600000;
    }

    const windowDurationMs = baseWindowDurationMs / zoomScale;

    let startMs = 0;
    let endMs = now;

    if (selectedTimeRange === 'CUSTOM' && customFrom && customTo) {
      startMs = new Date(customFrom).getTime();
      endMs = new Date(customTo).getTime();
    } else {
      endMs = now;
      startMs = now - windowDurationMs;
    }

    startMs -= panOffsetMs;
    endMs -= panOffsetMs;

    if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
      startMs = endMs - (windowDurationMs || 60000);
    }

    const spanMs = (endMs - startMs) || 60000;
    const startStr = formatTimeTick(startMs, spanMs);
    const midStr = formatTimeTick(startMs + spanMs / 2, spanMs);
    const endStr = formatTimeTick(endMs, spanMs);

    return { startMs, endMs, spanMs, startStr, midStr, endStr };
  }, [selectedTimeRange, customFrom, customTo, isPaused, pausedAtTime, zoomScale, panOffsetMs, liveNowMs]);

  const penSeries = useMemo(() => {
    const { startMs, endMs } = timeWindow;
    return effectivePens.map(pen => {
      const penId = pen.id;
      const penName = pen.name;
      const penTopic = pen.topic;
      const penDriverTagId = (pen as any).driverTagId;

      const ramSeries = (historyValues && (
        historyValues[penId] ||
        (penName ? historyValues[penName] : undefined) ||
        (penTopic ? historyValues[penTopic] : undefined) ||
        (penDriverTagId ? historyValues[penDriverTagId] : undefined) ||
        (panel?.panelId ? historyValues[panel.panelId] : undefined)
      )) || (history && history.length > 0 ? history : []);

      const dbPoints = historicalData[penId] ||
        (penName ? historicalData[penName] : undefined) ||
        (penTopic ? historicalData[penTopic] : undefined) ||
        (penDriverTagId ? historicalData[penDriverTagId] : undefined) || [];

      const allPtsMap = new Map<number, DataPoint>();
      dbPoints.forEach(p => {
        allPtsMap.set(p.t, {
          value: p.v,
          time: new Date(p.t).toLocaleTimeString(),
          timestampMs: p.t
        });
      });
      ramSeries.forEach(p => {
        const ts = p.timestampMs || 0;
        if (ts > 0) {
          allPtsMap.set(ts, p);
        }
      });

      let merged: DataPoint[] = [];
      if (allPtsMap.size > 0) {
        merged = Array.from(allPtsMap.values());
      } else {
        merged = ramSeries;
      }

      // Sort ascending (left to right)
      merged.sort((a, b) => (a.timestampMs || 0) - (b.timestampMs || 0));

      if (startMs > 0 && endMs > 0 && merged.length > 0) {
        const hasTimestamps = merged.some(p => p.timestampMs && p.timestampMs > 0);
        if (hasTimestamps) {
          const insideWindow = merged.filter(p => (p.timestampMs || 0) >= startMs && (p.timestampMs || 0) <= endMs);
          
          // Find the most recent point BEFORE startMs (baseline entering point)
          let lastBefore: DataPoint | undefined;
          for (let i = merged.length - 1; i >= 0; i--) {
            if ((merged[i].timestampMs || 0) < startMs) {
              lastBefore = merged[i];
              break;
            }
          }

          if (insideWindow.length > 0) {
            if (lastBefore) {
              merged = [
                { ...lastBefore, timestampMs: startMs, time: new Date(startMs).toLocaleTimeString() },
                ...insideWindow
              ];
            } else {
              const firstPt = insideWindow[0];
              merged = [
                { ...firstPt, timestampMs: startMs, time: new Date(startMs).toLocaleTimeString() },
                ...insideWindow
              ];
            }
          } else if (lastBefore) {
            // Tag is holding constant value throughout the window
            merged = [
              { ...lastBefore, timestampMs: startMs, time: new Date(startMs).toLocaleTimeString() },
              { ...lastBefore, timestampMs: endMs, time: new Date(endMs).toLocaleTimeString() }
            ];
          } else if (merged.length > 0) {
            const lastKnown = merged[merged.length - 1];
            merged = [
              { ...lastKnown, timestampMs: startMs, time: new Date(startMs).toLocaleTimeString() },
              { ...lastKnown, timestampMs: endMs, time: new Date(endMs).toLocaleTimeString() }
            ];
          }
        }
      }

      let decimated = merged;
      if (merged.length > dynamicMaxPoints) {
        const rawPts = merged.map(p => ({ t: p.timestampMs ?? 0, v: p.value }));
        const sampled = applyLTTBDecimation(rawPts, dynamicMaxPoints);
        decimated = sampled.map(p => ({ value: p.v, time: new Date(p.t).toLocaleTimeString(), timestampMs: p.t }));
      }
      return { pen, points: decimated };
    });
  }, [effectivePens, historyValues, panel, history, timeWindow, historicalData, dynamicMaxPoints]);

  const allValues = penSeries.flatMap(s => s.points.map(p => p.value));
  effectivePens.forEach(pen => {
    const penTopic = pen.topic ? pen.topic.trim() : undefined;
    const penDriverTagId = (pen as any).driverTagId ? String((pen as any).driverTagId).trim() : undefined;
    const liveVal = latestValues[pen.id] ||
      (pen.name ? latestValues[pen.name] : undefined) ||
      (penTopic ? latestValues[penTopic] : undefined) ||
      (penDriverTagId ? latestValues[penDriverTagId] : undefined);
    if (liveVal && typeof liveVal.val === 'number' && !isNaN(liveVal.val)) {
      allValues.push(liveVal.val);
    }
  });

  let minDataVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  let maxDataVal = allValues.length > 0 ? Math.max(...allValues) : 100;

  const autoScale = panel?.autoScaleY ?? true;

  if (autoScale || payloadMin === undefined || payloadMax === undefined) {
    const rawSpan = maxDataVal - minDataVal;
    if (rawSpan === 0) {
      const pad = Math.max(5, Math.abs(maxDataVal) * 0.1 || 5);
      minDataVal = minDataVal - pad;
      maxDataVal = maxDataVal + pad;
    } else {
      const pad = rawSpan * 0.10;
      minDataVal = minDataVal - pad;
      maxDataVal = maxDataVal + pad;
    }
  } else {
    minDataVal = payloadMin;
    maxDataVal = payloadMax;
  }

  if (minDataVal === maxDataVal) { minDataVal -= 5; maxDataVal += 5; }
  const rangeY = (maxDataVal - minDataVal) || 1;
  const globalMin = minDataVal;

  const LEFT_AXIS_PADDING = 46;
  const RIGHT_AXIS_PADDING = 12;
  const TOP_PADDING = 10;
  const BOTTOM_PADDING = 24;

  const svgWidth = Math.max(320, svgDimensions.width);
  const svgHeight = height ? Math.max(90, height - 30) : Math.max(90, svgDimensions.height);
  const chartWidth = Math.max(10, svgWidth - LEFT_AXIS_PADDING - RIGHT_AXIS_PADDING);
  const chartHeight = Math.max(10, svgHeight - TOP_PADDING - BOTTOM_PADDING);

  const safePanelId = useMemo(() => {
    return (panel?.panelId || panel?.panelName || 'chart').replace(/[^a-zA-Z0-9_-]/g, '_');
  }, [panel]);

  const penCoordsList = useMemo(() => {
    const { startMs, endMs, spanMs } = timeWindow;
    const leftEdgeX = LEFT_AXIS_PADDING;
    const rightEdgeX = LEFT_AXIS_PADDING + chartWidth;
    const baselineY = TOP_PADDING + chartHeight;

    return penSeries.map(s => {
      let pts = s.points;
      const penId = s.pen.id;
      const penName = s.pen.name;
      const penTopic = s.pen.topic ? s.pen.topic.trim() : undefined;
      const penDriverTagId = (s.pen as any).driverTagId ? String((s.pen as any).driverTagId).trim() : undefined;
      const liveVal = latestValues[penId] ||
        (penName ? latestValues[penName] : undefined) ||
        (penTopic ? latestValues[penTopic] : undefined) ||
        (penDriverTagId ? latestValues[penDriverTagId] : undefined);

      const lVal = (liveVal && typeof liveVal.val === 'number' && !isNaN(liveVal.val))
        ? liveVal.val
        : (pts.length > 0 ? pts[pts.length - 1].value : (allValues.length > 0 ? allValues[0] : 0));
      const lTime = liveVal?.time || (pts.length > 0 ? pts[pts.length - 1].time : '---');

      const lastPointTimestampMs = liveVal?.timestampMs || (pts.length > 0 ? pts[pts.length - 1].timestampMs : undefined);
      const timeoutSec = panel?.staleTimeoutSeconds !== undefined ? panel.staleTimeoutSeconds : 5;
      const isPenBad = liveVal?.quality === 'bad' || (lastPointTimestampMs ? ((Date.now() - lastPointTimestampMs) / 1000 > timeoutSec) : false);

      if (pts.length === 0) {
        const norm = Math.max(0, Math.min(1, (lVal - globalMin) / rangeY));
        const y = (TOP_PADDING + chartHeight) - norm * chartHeight;
        const dummyCoords = [
          { x: leftEdgeX, y, value: lVal, time: lTime, timestampMs: startMs },
          { x: rightEdgeX, y, value: lVal, time: lTime, timestampMs: endMs }
        ];
        const lineD = `M ${leftEdgeX.toFixed(1)} ${y.toFixed(1)} L ${rightEdgeX.toFixed(1)} ${y.toFixed(1)}`;
        const areaD = `${lineD} L ${rightEdgeX.toFixed(1)} ${baselineY.toFixed(1)} L ${leftEdgeX.toFixed(1)} ${baselineY.toFixed(1)} Z`;
        return {
          ...s,
          coords: dummyCoords,
          pathD: isPenBad ? '' : lineD,
          badPathD: isPenBad ? lineD : '',
          areaD,
          lastVal: lVal,
          lastTime: lTime,
          isBad: isPenBad
        };
      }

      if (pts.some(p => p.timestampMs && p.timestampMs > 0)) {
        pts = pts.slice().sort((a, b) => (a.timestampMs || 0) - (b.timestampMs || 0));
      }

      const rawCoords = pts.map((p, idx) => {
        let ratio = 0;
        if (p.timestampMs && spanMs > 0) {
          ratio = (p.timestampMs - startMs) / spanMs;
        } else {
          ratio = idx / Math.max(1, pts.length - 1);
        }
        const x = LEFT_AXIS_PADDING + ratio * chartWidth;
        const norm = Math.max(0, Math.min(1, (p.value - globalMin) / rangeY));
        const y = (TOP_PADDING + chartHeight) - norm * chartHeight;
        return { x, y, value: p.value, time: p.time, timestampMs: p.timestampMs };
      });

      let extendedCoords = rawCoords.slice();

      // Extend to left edge if first coordinate starts inside the window
      if (extendedCoords[0] && extendedCoords[0].x > leftEdgeX) {
        extendedCoords.unshift({
          x: leftEdgeX,
          y: extendedCoords[0].y,
          value: extendedCoords[0].value,
          time: new Date(startMs).toLocaleTimeString(),
          timestampMs: startMs
        });
      }

      // Extend to right edge if last coordinate is before current live time
      if (extendedCoords[extendedCoords.length - 1] && extendedCoords[extendedCoords.length - 1].x < rightEdgeX) {
        const lastC = extendedCoords[extendedCoords.length - 1];
        const rightVal = (liveVal && typeof liveVal.val === 'number' && !isNaN(liveVal.val)) ? liveVal.val : lastC.value;
        const rightNorm = Math.max(0, Math.min(1, (rightVal - globalMin) / rangeY));
        const rightY = (TOP_PADDING + chartHeight) - rightNorm * chartHeight;
        extendedCoords.push({
          x: rightEdgeX,
          y: rightY,
          value: rightVal,
          time: new Date(endMs).toLocaleTimeString(),
          timestampMs: endMs
        });
      }

      const actualType = panel?.graphType || graphType || 'line';
      const gapThresholdMs = Math.max(5000, timeoutSec * 1000);
      const solidSegments: { p1: { x: number; y: number }; p2: { x: number; y: number } }[] = [];
      const badSegments: { p1: { x: number; y: number }; p2: { x: number; y: number } }[] = [];

      for (let i = 0; i < extendedCoords.length - 1; i++) {
        const c1 = extendedCoords[i];
        const c2 = extendedCoords[i + 1];
        const t1 = c1.timestampMs || 0;
        const t2 = c2.timestampMs || 0;
        const dt = t2 - t1;

        // Any interval longer than gap threshold or trailing segment while bad is a gap/bad segment
        const isTrailingLiveBad = (i === extendedCoords.length - 2) && isPenBad;
        const isGapSegment = dt > gapThresholdMs || isTrailingLiveBad;

        if (isGapSegment) {
          badSegments.push({ p1: c1, p2: c2 });
        } else {
          solidSegments.push({ p1: c1, p2: c2 });
        }
      }

      const buildPathFromSegments = (
        segs: { p1: { x: number; y: number }; p2: { x: number; y: number } }[],
        type: string
      ): string => {
        if (segs.length === 0) return '';
        let d = '';
        for (let i = 0; i < segs.length; i++) {
          const { p1, p2 } = segs[i];
          if (i === 0 || Math.abs(segs[i - 1].p2.x - p1.x) > 0.1 || Math.abs(segs[i - 1].p2.y - p1.y) > 0.1) {
            d += ` M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
          }
          if (type === 'stepped') {
            d += ` H ${p2.x.toFixed(1)} V ${p2.y.toFixed(1)}`;
          } else {
            d += ` L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
          }
        }
        return d.trim();
      };

      const pathD = buildPathFromSegments(solidSegments, actualType);
      const badPathD = buildPathFromSegments(badSegments, actualType);

      const fullD = extendedCoords.reduce((acc, curr, idx) => (idx === 0 ? `M ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}` : `${acc} L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`), '');
      const areaD = `${fullD} L ${rightEdgeX.toFixed(1)} ${baselineY.toFixed(1)} L ${leftEdgeX.toFixed(1)} ${baselineY.toFixed(1)} Z`;

      return {
        ...s,
        coords: extendedCoords,
        pathD,
        badPathD,
        areaD,
        lastVal: lVal,
        lastTime: lTime,
        isBad: isPenBad
      };
    });
  }, [penSeries, latestValues, allValues, globalMin, rangeY, graphType, panel, chartHeight, chartWidth, timeWindow]);

  const maxPts = useMemo(() => Math.max(...penCoordsList.map(p => p.coords.length), 0), [penCoordsList]);
  const safeC1Idx = cursor1Idx !== null && maxPts > 0 ? Math.min(Math.max(0, cursor1Idx), maxPts - 1) : null;
  const safeC2Idx = isDualCursor && cursor2Idx !== null && maxPts > 0 ? Math.min(Math.max(0, cursor2Idx), maxPts - 1) : null;

  const toggleDualCursor = () => {
    const nextDual = !isDualCursor;
    setIsDualCursor(nextDual);
    if (nextDual) {
      if (cursor1Idx === null) setCursor1Idx(0);
      if (cursor2Idx === null && maxPts > 0) setCursor2Idx(Math.floor(maxPts * 0.75));
    }
  };

  const formatSpanText = (spanMs: number) => {
    const sec = Math.round(spanMs / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const remSec = sec % 60;
    if (min < 60) return remSec > 0 ? `${min}m ${remSec}s` : `${min}m`;
    const hrs = (min / 60).toFixed(1);
    return `${hrs}h`;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.18 : 0.82;
    setZoomScale(prev => Math.max(0.1, Math.min(25.0, prev * zoomFactor)));
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    isPanningRef.current = true;
    panStartXRef.current = e.clientX;
    initialPanOffsetRef.current = panOffsetMs;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (isPanningRef.current) {
      const deltaX = e.clientX - panStartXRef.current;
      const timeShiftMs = (deltaX / Math.max(100, chartWidth)) * timeWindow.spanMs;
      setPanOffsetMs(initialPanOffsetRef.current + timeShiftMs);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const scaleX = svgWidth / rect.width;
    const scaleY = svgHeight / rect.height;
    const svgX = clientX * scaleX;
    const svgY = clientY * scaleY;

    if (svgX >= LEFT_AXIS_PADDING && svgX <= LEFT_AXIS_PADDING + chartWidth) {
      const ratio = (svgX - LEFT_AXIS_PADDING) / chartWidth;
      const hoverTs = timeWindow.startMs + ratio * timeWindow.spanMs;
      
      const hoveredPenPoints: Array<{ penName: string; color: string; value: number; unit: string; x: number; y: number }> = [];
      
      penCoordsList.forEach(s => {
        if (!s.pen.visible || s.coords.length === 0) return;
        let closest = s.coords[0];
        let minDiff = Math.abs(closest.x - svgX);
        for (let i = 1; i < s.coords.length; i++) {
          const diff = Math.abs(s.coords[i].x - svgX);
          if (diff < minDiff) {
            minDiff = diff;
            closest = s.coords[i];
          }
        }
        hoveredPenPoints.push({
          penName: s.pen.name,
          color: s.pen.color || '#38bdf8',
          value: closest.value,
          unit: s.pen.unit || unit || '',
          x: closest.x,
          y: closest.y
        });
      });

      setHoverInfo({
        x: clientX,
        y: clientY,
        svgX,
        svgY,
        timestampMs: hoverTs,
        timeStr: formatTimeTick(hoverTs, timeWindow.spanMs),
        points: hoveredPenPoints
      });
    } else {
      setHoverInfo(null);
    }
  };

  const handleMouseLeave = () => {
    isPanningRef.current = false;
    setHoverInfo(null);
  };

  const handleMouseUp = (e?: React.MouseEvent<SVGSVGElement>) => {
    if (e) e.stopPropagation();
    isPanningRef.current = false;
  };

  const handleTouchStartCustom = (e: React.TouchEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      isPanningRef.current = true;
      panStartXRef.current = e.touches[0].clientX;
      initialPanOffsetRef.current = panOffsetMs;
      touchStartTime.current = Date.now();
    } else if (e.touches.length === 2) {
      isPanningRef.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoomScale;
    }
  };

  const handleTouchMoveCustom = (e: React.TouchEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (e.touches.length === 1 && isPanningRef.current) {
      const deltaX = e.touches[0].clientX - panStartXRef.current;
      const timeShiftMs = (deltaX / Math.max(100, chartWidth)) * timeWindow.spanMs;
      setPanOffsetMs(initialPanOffsetRef.current + timeShiftMs);
    } else if (e.touches.length === 2 && initialPinchDistRef.current > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      setZoomScale(Math.max(0.1, Math.min(25.0, initialPinchZoomRef.current * ratio)));
    }
  };

  const handleTouchEndCustom = (e: React.TouchEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }
    if (e.touches.length < 2) {
      initialPinchDistRef.current = 0;
    }
    if (e.changedTouches.length === 1 && showCursors) {
      const elapsed = Date.now() - touchStartTime.current;
      if (elapsed < 300) {
        const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
        if (rect && maxPts > 0) {
          const ratio = Math.max(0, Math.min(1, (e.changedTouches[0].clientX - rect.left) / rect.width));
          const clickedIdx = Math.round(ratio * (maxPts - 1));
          if (isDualCursor) {
            if (activeCursorSelect === 1) setCursor1Idx(clickedIdx);
            else setCursor2Idx(clickedIdx);
          } else {
            setCursor1Idx(clickedIdx);
          }
          setShowToolbar(true);
        }
      }
    }
  };

  const handleGraphClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (!showCursors) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (maxPts === 0) return;
    const clickedIdx = Math.round(ratio * (maxPts - 1));
    if (isDualCursor) {
      if (activeCursorSelect === 1) setCursor1Idx(clickedIdx);
      else setCursor2Idx(clickedIdx);
    } else {
      setCursor1Idx(clickedIdx);
    }
    setShowToolbar(true);
  };

  const activePenType = panel?.graphType || graphType || 'line';
  const effectiveFillArea = panel?.fillArea !== undefined ? panel.fillArea : fillArea;
  const globalShowNodeMarkers = panel?.showNodeMarkers ?? false;
  const tableCols = panel?.tableColumns || {};
  const showStatusCol = tableCols.status !== false;
  const showLastValCol = tableCols.lastVal !== false;
  const showLastTimeCol = tableCols.lastTime !== false;
  const showC1TimeCol = tableCols.c1Time !== false;
  const showC1ValCol = tableCols.c1Val !== false;
  const showC2TimeCol = isDualCursor && tableCols.c2Time !== false;
  const showC2ValCol = isDualCursor && tableCols.c2Val !== false;
  const showValDiffCol = isDualCursor && tableCols.valDiff !== false;
  const showTimeDiffCol = isDualCursor && tableCols.timeDiff !== false;
  const showMinValCol = tableCols.minVal !== false;
  const showMaxValCol = tableCols.maxVal !== false;
  const showAvgValCol = tableCols.avgVal !== false;

  const handleExportCSV = () => {
    if (penCoordsList.length === 0) return;
    let csvContent = 'data:text/csv;charset=utf-8,Pen Name,Timestamp,Value\n';
    penCoordsList.forEach(s => {
      s.coords.forEach(c => {
        csvContent += `"${s.pen.name}","${c.time}",${c.value}\n`;
      });
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trend_export_${panel?.panelName || 'chart'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const primarySeries = penCoordsList[0];
  const c1Point = safeC1Idx !== null && primarySeries?.coords ? primarySeries.coords[safeC1Idx] : null;
  const c2Point = safeC2Idx !== null && primarySeries?.coords ? primarySeries.coords[safeC2Idx] : null;
  const deltaVal = c1Point && c2Point ? (c2Point.value - c1Point.value) : null;
  const deltaTimeStr = c1Point && c2Point ? formatTimeDiff(c1Point, c2Point) : '---';
  const deltaPct = c1Point && c2Point && c1Point.value !== 0 ? ((c2Point.value - c1Point.value) / Math.abs(c1Point.value)) * 100 : null;

  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="flex flex-col h-full w-full bg-[#020617] rounded-xl overflow-hidden border border-slate-800/80 shadow-2xl select-none relative group/graph"
    >
      {/* ── Minimalist Top Status Header ── */}
      <div className="bg-slate-950/90 border-b border-slate-800/60 px-3 py-1.5 flex items-center justify-between gap-2 z-10 shrink-0 text-xs backdrop-blur-sm">
        <div className="flex items-center space-x-2 font-mono text-slate-300">
          <i className="fas fa-chart-line text-sky-400 text-xs" />
          <span className="font-bold text-slate-200 text-[11px]">{panel?.panelName || 'Trend View'}</span>
          {unit && <span className="text-[10px] text-slate-500 font-semibold">[{unit}]</span>}
          {isPaused && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              PAUSED
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={handleTogglePause}
            className={`px-2 py-1 rounded-md font-bold text-[10px] flex items-center space-x-1 border transition-all cursor-pointer ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <i className={`fas fa-${isPaused ? 'play' : 'pause'} text-[9px]`}></i>
            <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Live'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowToolbar(prev => !prev)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center space-x-1 ${
              showToolbar ? 'bg-sky-600 text-white border-sky-500 shadow' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <i className="fas fa-sliders text-[10px]"></i>
            <span className="hidden sm:inline">Controls</span>
          </button>
        </div>
      </div>

      {/* ── Expanded Controls Toolbar ── */}
      {showToolbar && (
        <div className="bg-slate-950 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 z-20 text-xs animate-in slide-in-from-top-1">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <div className="flex items-center space-x-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              {(['1M', '10M', '30M', '1H', '8H', '1D', '1W', '1MO', '1Y', '5Y', 'ALL'] as const).map((range) => {
                const isLockedInCommunity = isCommunityEditionActive() && (['8H', '1D', '1W', '1MO', '1Y', '5Y', 'ALL'] as string[]).includes(range);
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      if (isLockedInCommunity) {
                        alert("Free Demo Limit: Maximum 1 Hour trend logging duration allowed in Community Edition. Upgrade to Engineering Studio for 8H to 5-Year historical logging.");
                        setSelectedTimeRange('1H');
                        return;
                      }
                      handleSelectPresetTimeRange(range);
                    }}
                    className={`px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer flex items-center space-x-0.5 ${
                      selectedTimeRange === range && !showCustomDatePicker
                        ? 'bg-sky-500 text-white font-bold shadow'
                        : isLockedInCommunity
                        ? 'text-slate-500 hover:text-slate-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={isLockedInCommunity ? "🔒 Free Demo Limit: 1 Hour max duration. Upgrade for 8H to 5-Year logging." : `Set time range to ${range}`}
                  >
                    <span>{range}</span>
                    {isLockedInCommunity && <i className="fas fa-lock text-[8px] text-amber-500"></i>}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowCustomDatePicker(prev => !prev)}
                className={`px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer flex items-center space-x-1 border ${selectedTimeRange === 'CUSTOM' || showCustomDatePicker ? 'bg-violet-600 text-white border-violet-400 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'}`}
                title="Custom Date & Time Range Picker"
              >
                <i className="fas fa-calendar-alt text-[9px] text-amber-400"></i>
                <span>📅</span>
              </button>
            </div>

            {/* Live Zoom & Time Span Figures Badge */}
            <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-sky-300">
              <i className="fas fa-magnifying-glass text-[9px] text-amber-400"></i>
              <span>Zoom: {Math.round(zoomScale * 100)}%</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400">Span: {formatSpanText(timeWindow.spanMs)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            <button
              type="button"
              onClick={() => setShowCursors(!showCursors)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
                showCursors
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
              title={showCursors ? "Hide Cursors (Turn Off)" : "Show Cursors (Turn On)"}
            >
              <i className={`fas fa-${showCursors ? 'location-dot' : 'eye-slash'} text-[9px]`}></i>
              <span>{showCursors ? 'Cursors ON' : 'Cursors OFF'}</span>
            </button>

            {(panOffsetMs !== 0 || zoomScale !== 1.0) && (
              <button
                type="button"
                onClick={handleResetZoomPan}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30 transition-all cursor-pointer flex items-center space-x-1"
                title="Reset Zoom & Pan to Default Live View"
              >
                <i className="fas fa-rotate-left text-[9px]"></i>
                <span>Reset View</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleDualCursor}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 border transition-all cursor-pointer ${isDualCursor ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
            >
              <i className="fas fa-arrows-left-right text-xs"></i>
              <span>{isDualCursor ? 'Dual Cursor (Δ)' : 'Single Cursor'}</span>
            </button>

            {isDualCursor && (
              <div className="flex items-center space-x-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                <button type="button" onClick={() => setActiveCursorSelect(1)} className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${activeCursorSelect === 1 ? 'bg-emerald-600 text-white' : 'text-emerald-400'}`}>📍 C1</button>
                <button type="button" onClick={() => setActiveCursorSelect(2)} className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${activeCursorSelect === 2 ? 'bg-sky-600 text-white' : 'text-sky-400'}`}>📍 C2</button>
              </div>
            )}

            <button type="button" onClick={() => setShowTable(!showTable)} className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${showTable ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-900 text-slate-400 border-slate-800'}`} title="Toggle Historical Telemetry Data Table">
              <i className="fas fa-table text-xs"></i>
            </button>

            <button type="button" onClick={handleExportCSV} className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[10px] font-bold cursor-pointer" title="Export Trend CSV">
              <i className="fas fa-download text-xs text-sky-400"></i>
            </button>

            <button type="button" onClick={() => setShowToolbar(false)} className="text-slate-500 hover:text-white p-1" title="Close Controls">
              <i className="fas fa-xmark text-xs"></i>
            </button>
          </div>

          {panel?.enableHistorianLogging && (
             <div className="w-full flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px]">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400 font-semibold">Mode:</span>
                  <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
                    <button type="button" onClick={() => setHistoryMode('live')} className={`px-2 py-0.5 rounded text-[10px] font-bold ${historyMode === 'live' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'}`}>LIVE</button>
                    <button type="button" onClick={() => setHistoryMode('historical')} className={`px-2 py-0.5 rounded text-[10px] font-bold ${historyMode === 'historical' ? 'bg-violet-600 text-white shadow' : 'text-slate-400'}`}>HISTORIAN</button>
                  </div>
                  {historyMode === 'historical' && (
                    <>
                      <input type="datetime-local" value={histQueryStart} onChange={(e) => setHistQueryStart(e.target.value)} className="bg-slate-900 border border-slate-700 text-white rounded px-1.5 py-0.5 text-[10px]" />
                      <span className="text-slate-500">to</span>
                      <input type="datetime-local" value={histQueryEnd} onChange={(e) => setHistQueryEnd(e.target.value)} className="bg-slate-900 border border-slate-700 text-white rounded px-1.5 py-0.5 text-[10px]" />
                      <button type="button" onClick={handleHistoricalQuery} className="px-2 py-0.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded text-[10px]">{histLoading ? 'Loading...' : 'Query'}</button>
                    </>
                  )}
                </div>
             </div>
          )}
        </div>
      )}

      {/* ── Dual Cursor Delta (Δ) Inspector HUD Bar ── */}
      {isDualCursor && showCursors && safeC1Idx !== null && safeC2Idx !== null && (
        <div className="bg-slate-900/95 border-b border-sky-500/30 px-3 py-1 flex items-center justify-between text-[11px] font-mono text-slate-300 z-10 shrink-0 shadow-inner">
          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <strong className="text-emerald-400">C1:</strong>
              <span>{c1Point ? `${c1Point.time} (${formatNumberReadable(c1Point.value)})` : '---'}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <strong className="text-sky-400">C2:</strong>
              <span>{c2Point ? `${c2Point.time} (${formatNumberReadable(c2Point.value)})` : '---'}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center space-x-1">
              <i className="fas fa-clock text-amber-400 text-[10px]"></i>
              <strong className="text-amber-300">Δt:</strong>
              <span className="text-amber-200">{deltaTimeStr}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center space-x-1">
              <i className="fas fa-chart-line-up text-indigo-400 text-[10px]"></i>
              <strong className="text-indigo-300">Δv:</strong>
              <span className={deltaVal !== null ? (deltaVal >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold') : ''}>
                {deltaVal !== null ? `${deltaVal >= 0 ? '+' : ''}${formatNumberReadable(deltaVal)} ${unit || ''} (${deltaPct !== null ? `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%` : ''})` : '---'}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ── Custom Date & Time Range Modal Card ── */}
      {showCustomDatePicker && (
        <div className="absolute top-12 left-3 z-50 w-72 bg-slate-950 border border-violet-500/60 rounded-xl p-3.5 shadow-2xl backdrop-blur-md space-y-3 text-xs animate-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-violet-300 flex items-center gap-1.5 text-xs">
              <i className="fas fa-calendar-days text-amber-400"></i>
              Custom Date & Time Range
            </span>
            <button
              type="button"
              onClick={() => setShowCustomDatePicker(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <i className="fas fa-xmark text-xs"></i>
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">From (Start Date & Time)</label>
            <input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono outline-none focus:border-violet-500 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">To (End Date & Time)</label>
            <input
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono outline-none focus:border-violet-500 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const from = new Date(now.getTime() - 15 * 60 * 1000);
                setCustomFrom(from.toISOString().slice(0, 16));
                setCustomTo(now.toISOString().slice(0, 16));
              }}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] rounded text-slate-300 cursor-pointer"
            >
              Last 15m
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const from = new Date(now.getTime() - 60 * 60 * 1000);
                setCustomFrom(from.toISOString().slice(0, 16));
                setCustomTo(now.toISOString().slice(0, 16));
              }}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] rounded text-slate-300 cursor-pointer"
            >
              Last 1h
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                setCustomFrom(from.toISOString().slice(0, 16));
                setCustomTo(now.toISOString().slice(0, 16));
              }}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] rounded text-slate-300 cursor-pointer"
            >
              Last 24h
            </button>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowCustomDatePicker(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-white rounded text-[11px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCustomDateRange}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded shadow text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <i className="fas fa-check text-[10px]"></i>
              Apply Range
            </button>
          </div>
        </div>
      )}

      {/* ── Main SVG Chart Viewport ── */}
      <div
        ref={graphContainerRef}
        className="flex-1 w-full relative overflow-hidden cursor-crosshair min-h-[90px]"
        onClick={() => !showToolbar && setShowToolbar(true)}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full text-slate-300 cursor-grab active:cursor-grabbing"
          onClick={handleGraphClick}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStartCustom}
          onTouchMove={handleTouchMoveCustom}
          onTouchEnd={handleTouchEndCustom}
          style={{ touchAction: 'none' }}
        >
          <defs>
            <clipPath id={`trend-clip-${safePanelId}`}>
              <rect x={LEFT_AXIS_PADDING} y={TOP_PADDING} width={chartWidth} height={chartHeight} />
            </clipPath>
            
            {/* Subtle Neon Line Glow Filter */}
            <filter id={`neon-glow-${safePanelId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#38bdf8" floodOpacity="0.4" />
            </filter>

            {penCoordsList.map(s => {
              const cleanColor = (s.pen.color || '#38bdf8').replace('#', '');
              return (
                <linearGradient key={s.pen.id} id={`trend-grad-${cleanColor}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.pen.color || '#38bdf8'} stopOpacity="0.35" />
                  <stop offset="60%" stopColor={s.pen.color || '#38bdf8'} stopOpacity="0.08" />
                  <stop offset="100%" stopColor={s.pen.color || '#38bdf8'} stopOpacity="0.0" />
                </linearGradient>
              );
            })}
          </defs>

          {/* ── Background Grid & Divisions ── */}
          <g className="text-[9px] font-mono select-none">
            {/* Vertical Y-Axis Line */}
            <line
              x1={LEFT_AXIS_PADDING}
              y1={TOP_PADDING}
              x2={LEFT_AXIS_PADDING}
              y2={TOP_PADDING + chartHeight}
              stroke="#334155"
              strokeWidth="0.8"
            />

            {/* Engineering Unit Badge */}
            {unit && (
              <text
                x={LEFT_AXIS_PADDING - 6}
                y={TOP_PADDING - 2}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="8"
                fontWeight="bold"
              >
                [{unit}]
              </text>
            )}

            {/* Generate 5 Major Divisions (6 Ticks + Values) & Sub-ticks */}
            {Array.from({ length: 6 }).map((_, i) => {
              const ratio = i / 5;
              const val = globalMin + ratio * (maxDataVal - globalMin);
              const yPos = (TOP_PADDING + chartHeight) - ratio * chartHeight;
              const isBoundary = i === 0 || i === 5;
              const formattedVal = formatNumberReadable(val);

              return (
                <g key={i}>
                  {/* Fine Horizontal Grid Line */}
                  {showGrid && (
                    <line
                      x1={LEFT_AXIS_PADDING}
                      y1={yPos}
                      x2={LEFT_AXIS_PADDING + chartWidth}
                      y2={yPos}
                      stroke="#ffffff"
                      strokeOpacity={isBoundary ? '0.09' : '0.04'}
                      strokeDasharray={isBoundary ? undefined : '2 3'}
                      strokeWidth={isBoundary ? '0.8' : '0.5'}
                    />
                  )}

                  {/* Major Scale Tick Line */}
                  <line
                    x1={LEFT_AXIS_PADDING - 4}
                    y1={yPos}
                    x2={LEFT_AXIS_PADDING}
                    y2={yPos}
                    stroke={isBoundary ? '#94a3b8' : '#475569'}
                    strokeWidth="0.8"
                  />

                  {/* Scale Value Label */}
                  <text
                    x={LEFT_AXIS_PADDING - 6}
                    y={yPos}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill={isBoundary ? '#cbd5e1' : '#64748b'}
                    fontWeight={isBoundary ? '600' : 'normal'}
                  >
                    {formattedVal}
                  </text>

                  {/* Minor Sub-Measurement Tick Mark */}
                  {i < 5 && (() => {
                    const subRatio = (i + 0.5) / 5;
                    const subYPos = (TOP_PADDING + chartHeight) - subRatio * chartHeight;
                    return (
                      <line
                        x1={LEFT_AXIS_PADDING - 2}
                        y1={subYPos}
                        x2={LEFT_AXIS_PADDING}
                        y2={subYPos}
                        stroke="#334155"
                        strokeWidth="0.5"
                      />
                    );
                  })()}
                </g>
              );
            })}
          </g>

          {/* ── X-Axis Time Labels & Vertical Gridlines ── */}
          <g className="text-[9px] font-mono select-none">
            <line
              x1={LEFT_AXIS_PADDING}
              y1={TOP_PADDING + chartHeight}
              x2={LEFT_AXIS_PADDING + chartWidth}
              y2={TOP_PADDING + chartHeight}
              stroke="#334155"
              strokeWidth="0.8"
            />

            {/* 5 Time Grid Divisions */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((tRatio, idx) => {
              const xPos = LEFT_AXIS_PADDING + tRatio * chartWidth;
              const tickTs = timeWindow.startMs + tRatio * timeWindow.spanMs;
              const tickStr = formatTimeTick(tickTs, timeWindow.spanMs);
              const isFirst = idx === 0;
              const isLast = idx === 4;

              return (
                <g key={idx}>
                  {showGrid && (
                    <line
                      x1={xPos}
                      y1={TOP_PADDING}
                      x2={xPos}
                      y2={TOP_PADDING + chartHeight}
                      stroke="#ffffff"
                      strokeOpacity="0.03"
                      strokeDasharray="2 3"
                      strokeWidth="0.5"
                    />
                  )}
                  <line
                    x1={xPos}
                    y1={TOP_PADDING + chartHeight}
                    x2={xPos}
                    y2={TOP_PADDING + chartHeight + 4}
                    stroke="#475569"
                    strokeWidth="0.8"
                  />
                  <text
                    x={xPos}
                    y={svgHeight - 6}
                    textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
                    fill={isFirst || isLast ? '#94a3b8' : '#64748b'}
                    fontWeight={isFirst || isLast ? '600' : 'normal'}
                  >
                    {tickStr}
                  </text>
                </g>
              );
            })}
          </g>

          {/* ── Active Waveform / Pen Plotting Area ── */}
          <g clipPath={`url(#trend-clip-${safePanelId})`}>
            {penCoordsList.map(s => {
              if (!s.pen.visible || s.coords.length === 0) return null;
              const pColor = s.pen.color || '#38bdf8';
              const isPenHovered = hoveredPenId === s.pen.id;
              const strokeW = (s.pen.thickness || penThickness) + (isPenHovered ? 1.0 : 0);

              if (activePenType === 'hbar') {
                 const normalizedRatio = Math.max(0, Math.min(1, (s.lastVal - globalMin) / rangeY));
                 return (
                   <g key={s.pen.id}>
                     <rect x={LEFT_AXIS_PADDING} y="30%" width={chartWidth} height="40%" fill="#1e293b" rx="4" />
                     <rect
                       x={LEFT_AXIS_PADDING}
                       y="30%"
                       width={normalizedRatio * chartWidth}
                       height="40%"
                       fill={pColor}
                       rx="4"
                       style={{ transition: 'width 0.3s ease-out, fill 0.3s ease-out' }}
                     />
                   </g>
                 );
              }
              if (activePenType === 'bar') {
                 const barW = Math.max(2, (chartWidth / s.coords.length) * 0.7);
                 return (
                   <g key={s.pen.id}>
                     {s.coords.map((c, i) => (
                       <rect
                         key={i}
                         x={c.x - barW / 2}
                         y={c.y}
                         width={barW}
                         height={TOP_PADDING + chartHeight - c.y}
                         fill={pColor}
                         opacity={isPenHovered ? "1.0" : "0.85"}
                         rx="1.5"
                         style={{ transition: 'y 0.3s ease-out, height 0.3s ease-out' }}
                       />
                     ))}
                   </g>
                 );
              }
              return (
                <g key={s.pen.id}>
                  {effectiveFillArea && (
                    <path
                      d={s.areaD}
                      fill={`url(#trend-grad-${pColor.replace('#', '')})`}
                      style={{ transition: 'd 0.3s ease-out, fill 0.3s ease-out' }}
                    />
                  )}
                  {s.pathD ? (
                    <path
                      d={s.pathD}
                      fill="none"
                      stroke={pColor}
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ transition: 'd 0.3s ease-out, stroke 0.3s ease-out, stroke-width 0.3s ease-out' }}
                    />
                  ) : null}
                  {s.badPathD ? (
                    <path
                      d={s.badPathD}
                      fill="none"
                      stroke={pColor}
                      strokeWidth={strokeW}
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.85}
                      style={{ transition: 'd 0.3s ease-out, stroke 0.3s ease-out, stroke-width 0.3s ease-out' }}
                    />
                  ) : null}
                  {(s.pen.showNodeMarkers ?? globalShowNodeMarkers) && s.coords.map((c, i) => (
                    <circle
                      key={i}
                      cx={c.x}
                      cy={c.y}
                      r={1.5}
                      fill={pColor}
                      stroke="#020617"
                      strokeWidth="0.5"
                      style={{ transition: 'cx 0.3s ease-out, cy 0.3s ease-out' }}
                    />
                  ))}
                </g>
              );
            })}
          </g>

          {/* ── Interactive Live Hover Crosshair Line & Highlight Dots ── */}
          {hoverInfo && (
            <g className="pointer-events-none">
              {/* Vertical Crosshair Guide */}
              <line
                x1={hoverInfo.svgX}
                y1={TOP_PADDING}
                x2={hoverInfo.svgX}
                y2={TOP_PADDING + chartHeight}
                stroke="#60a5fa"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.8"
              />

              {/* Glowing Highlight Dots on Every Curve */}
              {hoverInfo.points.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill={pt.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    style={{ filter: `drop-shadow(0 0 4px ${pt.color})` }}
                  />
                </g>
              ))}
            </g>
          )}

          {/* ── C1 Cursor Overlay ── */}
          {showCursors && safeC1Idx !== null && penCoordsList[0]?.coords[safeC1Idx] && (
            <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setActiveCursorSelect(1); }}>
              <line
                x1={penCoordsList[0].coords[safeC1Idx].x}
                y1={TOP_PADDING}
                x2={penCoordsList[0].coords[safeC1Idx].x}
                y2={TOP_PADDING + chartHeight}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                style={{ transition: 'x1 0.25s ease-out, x2 0.25s ease-out' }}
              />
              <rect
                x={penCoordsList[0].coords[safeC1Idx].x - 12}
                y={TOP_PADDING - 8}
                width="24"
                height="14"
                rx="3"
                fill={activeCursorSelect === 1 ? '#059669' : '#10b981'}
                style={{ transition: 'x 0.25s ease-out' }}
              />
              <text
                x={penCoordsList[0].coords[safeC1Idx].x}
                y={TOP_PADDING + 2}
                fill="#ffffff"
                textAnchor="middle"
                fontSize="9"
                fontWeight="900"
                style={{ transition: 'x 0.25s ease-out' }}
              >
                C1
              </text>
            </g>
          )}

          {/* ── C2 Cursor Overlay ── */}
          {showCursors && isDualCursor && safeC2Idx !== null && penCoordsList[0]?.coords[safeC2Idx] && (
            <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setActiveCursorSelect(2); }}>
              <line
                x1={penCoordsList[0].coords[safeC2Idx].x}
                y1={TOP_PADDING}
                x2={penCoordsList[0].coords[safeC2Idx].x}
                y2={TOP_PADDING + chartHeight}
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                style={{ transition: 'x1 0.25s ease-out, x2 0.25s ease-out' }}
              />
              <rect
                x={penCoordsList[0].coords[safeC2Idx].x - 12}
                y={TOP_PADDING - 8}
                width="24"
                height="14"
                rx="3"
                fill={activeCursorSelect === 2 ? '#2563eb' : '#3b82f6'}
                style={{ transition: 'x 0.25s ease-out' }}
              />
              <text
                x={penCoordsList[0].coords[safeC2Idx].x}
                y={TOP_PADDING + 2}
                fill="#ffffff"
                textAnchor="middle"
                fontSize="9"
                fontWeight="900"
                style={{ transition: 'x 0.25s ease-out' }}
              >
                C2
              </text>
            </g>
          )}
        </svg>

        {/* ── Glassmorphic Floating Tooltip HUD ── */}
        {hoverInfo && hoverInfo.points.length > 0 && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-950/95 border border-slate-700/80 rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[160px] animate-in fade-in-50"
            style={{
              left: hoverInfo.x > svgDimensions.width * 0.65 ? undefined : `${hoverInfo.x + 16}px`,
              right: hoverInfo.x > svgDimensions.width * 0.65 ? `${svgDimensions.width - hoverInfo.x + 16}px` : undefined,
              top: `${Math.max(10, Math.min(svgDimensions.height - 120, hoverInfo.y - 40))}px`
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 font-mono text-[11px] text-slate-400">
              <span className="flex items-center space-x-1">
                <i className="fas fa-clock text-sky-400 text-[10px]" />
                <strong className="text-slate-200">{hoverInfo.timeStr}</strong>
              </span>
            </div>
            <div className="space-y-1">
              {hoverInfo.points.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between space-x-3 font-mono text-[11px]">
                  <span className="flex items-center space-x-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="truncate max-w-[110px]">{p.penName}:</span>
                  </span>
                  <strong className="text-white font-bold" style={{ color: p.color }}>
                    {formatNumberReadable(p.value)} {p.unit}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Full Monitoring & Historical Statistics Table ── */}
      {showTable && !isCompact && (
        <div className="bg-slate-950 border-t border-slate-800 overflow-x-auto text-[10px] font-mono shrink-0">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase text-[9px] tracking-wider">
                <th className="py-1.5 px-2 text-center w-8">Vis</th>
                <th className="py-1.5 px-2">Pen Description</th>
                {showStatusCol && <th className="py-1.5 px-2 text-center">Status</th>}
                {showLastValCol && <th className="py-1.5 px-2 text-right">Live Val</th>}
                {showLastTimeCol && <th className="py-1.5 px-2 text-right">Time</th>}
                {showC1TimeCol && <th className="py-1.5 px-2 text-right text-emerald-400">C1 Time</th>}
                {showC1ValCol && <th className="py-1.5 px-2 text-right text-emerald-400">C1 Val</th>}
                {showC2TimeCol && <th className="py-1.5 px-2 text-right text-sky-400">C2 Time</th>}
                {showC2ValCol && <th className="py-1.5 px-2 text-right text-sky-400">C2 Val</th>}
                {showValDiffCol && <th className="py-1.5 px-2 text-right text-amber-400">Δv</th>}
                {showTimeDiffCol && <th className="py-1.5 px-2 text-right text-amber-400">Δt</th>}
                {showMinValCol && <th className="py-1.5 px-2 text-right text-purple-400">Min</th>}
                {showMaxValCol && <th className="py-1.5 px-2 text-right text-pink-400">Max</th>}
                {showAvgValCol && <th className="py-1.5 px-2 text-right text-cyan-400">Avg</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {penCoordsList.map((s) => {
                const c1Pt = safeC1Idx !== null ? s.coords[safeC1Idx] : null;
                const c2Pt = safeC2Idx !== null ? s.coords[safeC2Idx] : null;
                const valDiff = c1Pt && c2Pt ? c2Pt.value - c1Pt.value : null;
                const timeDiffStr = c1Pt && c2Pt ? formatTimeDiff(c1Pt, c2Pt) : '---';
                const allVals = s.coords.map(c => c.value);
                const minVal = allVals.length > 0 ? Math.min(...allVals) : null;
                const maxVal = allVals.length > 0 ? Math.max(...allVals) : null;
                const avgVal = allVals.length > 0 ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null;

                const penTopic = s.pen.topic ? s.pen.topic.trim() : undefined;
                const penDriverTagId = (s.pen as any).driverTagId ? String((s.pen as any).driverTagId).trim() : undefined;
                const livePenVal = latestValues[s.pen.id] || (penTopic ? latestValues[penTopic] : undefined) || (penDriverTagId ? latestValues[penDriverTagId] : undefined);
                const panelStatus = panel ? getPanelTelemetryStatus(panel, latestValues || {}) : { isOffline: false, isBad: false };
                const penTimestampMs = livePenVal?.timestampMs || (s.coords.length > 0 ? s.coords[s.coords.length - 1].timestampMs : undefined);
                const timeoutSec = panel?.staleTimeoutSeconds !== undefined ? panel.staleTimeoutSeconds : 5;
                const isPenStale = (panel?.enableStaleTimeout !== false) && penTimestampMs ? ((Date.now() - penTimestampMs) / 1000 > timeoutSec) : false;
                const isPenOfflineOrBad = (s as any).isBad || panelStatus.isOffline || isPenStale || livePenVal?.quality === 'bad';
                const hasData = s.coords.length > 0 || (livePenVal && livePenVal.val !== undefined);

                return (
                  <tr key={s.pen.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-1 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={s.pen.visible}
                        onChange={() => setHiddenPens(prev => ({ ...prev, [s.pen.id]: !prev[s.pen.id] }))}
                        className="rounded accent-sky-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-1 px-2 font-bold text-slate-200" title={s.pen.name}>
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: s.pen.color || '#38bdf8' }} />
                      {s.pen.name}
                    </td>
                    {showStatusCol && (
                      <td className="py-1 px-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${isPenOfflineOrBad ? 'bg-rose-500/20 text-rose-400 animate-pulse' : (hasData ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500')}`}>
                          {isPenOfflineOrBad ? 'Bad' : (hasData ? 'Good' : 'No Data')}
                        </span>
                      </td>
                    )}
                    {showLastValCol && <td className="py-1 px-2 text-right font-bold" style={{ color: s.pen.color || '#38bdf8' }}>{formatNumberReadable(s.lastVal)}</td>}
                    {showLastTimeCol && <td className="py-1 px-2 text-right text-slate-400">{s.lastTime}</td>}
                    {showC1TimeCol && <td className="py-1 px-2 text-right text-emerald-300">{c1Pt ? c1Pt.time : '---'}</td>}
                    {showC1ValCol && <td className="py-1 px-2 text-right font-bold text-emerald-300">{c1Pt ? formatNumberReadable(c1Pt.value) : '---'}</td>}
                    {showC2TimeCol && <td className="py-1 px-2 text-right text-sky-300">{c2Pt ? c2Pt.time : '---'}</td>}
                    {showC2ValCol && <td className="py-1 px-2 text-right font-bold text-sky-300">{c2Pt ? formatNumberReadable(c2Pt.value) : '---'}</td>}
                    {showValDiffCol && <td className="py-1 px-2 text-right font-bold text-amber-300">{valDiff !== null ? (valDiff >= 0 ? `+${formatNumberReadable(valDiff)}` : formatNumberReadable(valDiff)) : '---'}</td>}
                    {showTimeDiffCol && <td className="py-1 px-2 text-right font-bold text-amber-200">{timeDiffStr}</td>}
                    {showMinValCol && <td className="py-1 px-2 text-right font-bold text-purple-300">{minVal !== null ? formatNumberReadable(minVal) : '---'}</td>}
                    {showMaxValCol && <td className="py-1 px-2 text-right font-bold text-pink-300">{maxVal !== null ? formatNumberReadable(maxVal) : '---'}</td>}
                    {showAvgValCol && <td className="py-1 px-2 text-right font-bold text-cyan-300">{avgVal !== null ? formatNumberReadable(avgVal) : '---'}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LineGraph;
