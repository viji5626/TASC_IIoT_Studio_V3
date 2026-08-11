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
  latestValues?: Record<string, { val: any; time: string }>;
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

// Generate Monotone Cubic Spline curve path (Fritsch-Carlson algorithm — zero overshoot / no false spikes)
const getSplinePath = (coords: { x: number; y: number }[]): string => {
  if (!coords || coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  if (coords.length === 2) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)} L ${coords[1].x.toFixed(1)} ${coords[1].y.toFixed(1)}`;

  const n = coords.length;
  const dxs: number[] = [];
  const dys: number[] = [];
  const ms: number[] = [];

  // Compute secant slopes
  for (let i = 0; i < n - 1; i++) {
    const dx = coords[i + 1].x - coords[i].x;
    const dy = coords[i + 1].y - coords[i].y;
    dxs.push(dx);
    dys.push(dy);
    ms.push(dx === 0 ? 0 : dy / dx);
  }

  // Compute initial tangents
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

  // Enforce monotonicity (Fritsch-Carlson constraint)
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

  // Build Cubic Bézier SVG path
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
    const prev = coords[idx - 1];
    return `${acc} H ${curr.x} V ${curr.y}`;
  }, '');
};

const LineGraph: React.FC<LineGraphProps> = ({
  panel,
  history = [],
  historyValues = {},
  latestValues = {},
  unit = '',
  color = '#38bdf8',
  penThickness = 2.5,
  graphType = 'line',
  showGrid = true,
  fillArea = true,
  showMonitoringTable = true,
  enableDualCursor = false,
  pens,
  payloadMin,
  payloadMax,
  height,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAtTime, setPausedAtTime] = useState<number | null>(null);
  const [showCursors, setShowCursors] = useState<boolean>(true);
  const [panOffsetMs, setPanOffsetMs] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1.0);

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
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1M' | '10M' | '30M' | '1H' | '8H' | '1D' | 'ALL' | 'CUSTOM'>('10M');
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
  const isTouchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const [, setPinchZoomActive] = useState(false);
  const [historyMode, setHistoryMode] = useState<'live' | 'historical'>('live');
  const [historicalData, setHistoricalData] = useState<Record<string, { t: number; v: number }[]>>({});
  const [gapZones, setGapZones] = useState<{ gapStartMs: number; gapEndMs: number }[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histQueryStart, setHistQueryStart] = useState(() => {
    const d = new Date(Date.now() - 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [histQueryEnd, setHistQueryEnd] = useState(() => {
    return new Date().toISOString().slice(0, 16);
  });


  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [svgDimensions, setSvgDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 180 });

  useEffect(() => {
    if (!graphContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setSvgDimensions({
            width: Math.round(width),
            height: Math.round(height)
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
    const singlePenId = panel?.panelId || 'default_pen';
    return [{
      id: singlePenId,
      name: panel?.panelName || 'Telemetry Signal',
      topic: panel?.topic || '',
      color: color || panel?.penColor || panel?.firstColor || '#38bdf8',
      thickness: penThickness || panel?.penThickness || 2.5,
      unit: unit || panel?.unit || '',
      visible: !hiddenPens[singlePenId]
    }];
  }, [pens, panel, color, penThickness, unit, hiddenPens]);

  const MAX_DISPLAY_POINTS = 500;

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
    for (const topic of topics) {
      const rawPts = await queryHistoricalRange(topic, startMs, endMs);
      results[topic] = rawPts.map(p => ({ t: p.t, v: p.v }));
    }
    const gaps = await queryGapRecords(startMs, endMs);
    setGapZones(gaps.map(g => ({ gapStartMs: g.gapStartMs, gapEndMs: g.gapEndMs })));
    setHistoricalData(results);
    setHistLoading(false);
  }, [panel, histQueryStart, histQueryEnd]);

  const handleSelectPresetTimeRange = async (range: '1M' | '10M' | '30M' | '1H' | '8H' | '1D' | 'ALL') => {
    setSelectedTimeRange(range);
    setShowCustomDatePicker(false);

    if (panel?.enableHistorianLogging && (range === '30M' || range === '1H' || range === '8H' || range === '1D')) {
      const nowMs = Date.now();
      let durationMs = 30 * 60 * 1000;
      if (range === '1H') durationMs = 60 * 60 * 1000;
      if (range === '8H') durationMs = 8 * 3600 * 1000;
      if (range === '1D') durationMs = 24 * 3600 * 1000;

      const startMs = nowMs - durationMs;
      setHistLoading(true);
      const topics: string[] = [];
      if (panel?.pens && panel.pens.length > 0) {
        panel.pens.forEach(p => topics.push(p.id || p.topic));
      } else if (panel?.topic) {
        topics.push(panel.topic);
      }
      const results: Record<string, { t: number; v: number }[]> = {};
      for (const topic of topics) {
        const rawPts = await queryHistoricalRange(topic, startMs, nowMs);
        results[topic] = rawPts.map(p => ({ t: p.t, v: p.v }));
      }
      const gaps = await queryGapRecords(startMs, nowMs);
      setGapZones(gaps.map(g => ({ gapStartMs: g.gapStartMs, gapEndMs: g.gapEndMs })));
      setHistoricalData(results);
      setHistoryMode('historical');
      setHistLoading(false);
    } else {
      setHistoryMode('live');
    }
  };

  const handleApplyCustomDateRange = async () => {
    if (!customFrom || !customTo) return;
    setSelectedTimeRange('CUSTOM');
    setShowCustomDatePicker(false);

    const fromMs = new Date(customFrom).getTime();
    const toMs = new Date(customTo).getTime();
    if (isNaN(fromMs) || isNaN(toMs)) return;

    if (panel?.enableHistorianLogging) {
      setHistLoading(true);
      const topics: string[] = [];
      if (panel?.pens && panel.pens.length > 0) {
        panel.pens.forEach(p => topics.push(p.id || p.topic));
      } else if (panel?.topic) {
        topics.push(panel.topic);
      }
      const results: Record<string, { t: number; v: number }[]> = {};
      for (const topic of topics) {
        const rawPts = await queryHistoricalRange(topic, fromMs, toMs);
        results[topic] = rawPts.map(p => ({ t: p.t, v: p.v }));
      }
      const gaps = await queryGapRecords(fromMs, toMs);
      setGapZones(gaps.map(g => ({ gapStartMs: g.gapStartMs, gapEndMs: g.gapEndMs })));
      setHistoricalData(results);
      setHistoryMode('historical');
      setHistLoading(false);
    }
  };

  const penSeries = useMemo(() => {
    return effectivePens.map(pen => {
      let series: DataPoint[] = [];
      if (historyMode === 'historical' && historicalData[pen.id || pen.topic]) {
        const hd = historicalData[pen.id || pen.topic];
        series = hd.map(p => ({ value: p.v, time: new Date(p.t).toLocaleTimeString(), timestampMs: p.t }));
      } else {
        if (historyValues[pen.id] && historyValues[pen.id].length > 0) {
          series = historyValues[pen.id];
        } else if (pen.topic && historyValues[pen.topic] && historyValues[pen.topic].length > 0) {
          series = historyValues[pen.topic];
        } else if (panel?.panelId && historyValues[panel.panelId] && historyValues[panel.panelId].length > 0) {
          series = historyValues[panel.panelId];
        } else if (history && history.length > 0) {
          series = history;
        }
      }

      if (selectedTimeRange !== 'ALL' && series.length > 0) {
        const now = Date.now();
        let cutoffMs = 0;
        let fallbackSlice = 60;

        if (selectedTimeRange === '1M') { cutoffMs = now - 1 * 60 * 1000; fallbackSlice = 60; }
        else if (selectedTimeRange === '10M') { cutoffMs = now - 10 * 60 * 1000; fallbackSlice = 600; }
        else if (selectedTimeRange === '30M') { cutoffMs = now - 30 * 60 * 1000; fallbackSlice = 1800; }
        else if (selectedTimeRange === '1H') { cutoffMs = now - 60 * 60 * 1000; fallbackSlice = 3600; }
        else if (selectedTimeRange === '8H') { cutoffMs = now - 8 * 3600 * 1000; fallbackSlice = 28800; }
        else if (selectedTimeRange === '1D') { cutoffMs = now - 24 * 3600 * 1000; fallbackSlice = 86400; }
        else if (selectedTimeRange === 'CUSTOM' && customFrom && customTo) {
          const fromMs = new Date(customFrom).getTime();
          const toMs = new Date(customTo).getTime();
          if (!isNaN(fromMs) && !isNaN(toMs)) {
            series = series.filter(p => {
              if (p.timestampMs) return p.timestampMs >= fromMs && p.timestampMs <= toMs;
              return true;
            });
          }
        }

        if (cutoffMs > 0) {
          const hasTimeStamps = series.some(p => p.timestampMs && p.timestampMs > 0);
          if (hasTimeStamps) {
            series = series.filter(p => (p.timestampMs ?? 0) >= cutoffMs);
          } else {
            series = series.slice(-fallbackSlice);
          }
        }
      }

      let decimated = series;
      if (series.length > MAX_DISPLAY_POINTS) {
        const rawPts = series.map(p => ({ t: p.timestampMs ?? 0, v: p.value }));
        const sampled = applyLTTBDecimation(rawPts, MAX_DISPLAY_POINTS);
        decimated = sampled.map(p => ({ value: p.v, time: new Date(p.t).toLocaleTimeString(), timestampMs: p.t }));
      }
      return { pen, points: decimated };
    });
  }, [effectivePens, historyValues, panel, history, selectedTimeRange, historyMode, historicalData, customFrom, customTo]);

  
  const allValues = penSeries.flatMap(s => s.points.map(p => p.value));
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
      const pad = rawSpan * 0.10; // 10% headroom and footroom margin so pens don't touch top/bottom edges
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

  const timeWindow = useMemo(() => {
    const now = isPaused && pausedAtTime ? pausedAtTime : Date.now();
    let baseWindowDurationMs = 0;
    if (selectedTimeRange === '1M') baseWindowDurationMs = 1 * 60 * 1000;
    else if (selectedTimeRange === '10M') baseWindowDurationMs = 10 * 60 * 1000;
    else if (selectedTimeRange === '30M') baseWindowDurationMs = 30 * 60 * 1000;
    else if (selectedTimeRange === '1H') baseWindowDurationMs = 60 * 60 * 1000;
    else if (selectedTimeRange === '8H') baseWindowDurationMs = 8 * 3600 * 1000;
    else if (selectedTimeRange === '1D') baseWindowDurationMs = 24 * 3600 * 1000;

    // Free Demo Limit: Clamp logging duration window to 1 Hour max in Community Edition
    if (isCommunityEditionActive() && baseWindowDurationMs > 3600000) {
      baseWindowDurationMs = 3600000;
    }

    const windowDurationMs = baseWindowDurationMs > 0 ? baseWindowDurationMs / zoomScale : 60000 / zoomScale;

    let startMs = 0;
    let endMs = now;

    if (selectedTimeRange === 'CUSTOM' && customFrom && customTo) {
      startMs = new Date(customFrom).getTime();
      endMs = new Date(customTo).getTime();
    } else {
      // Collect valid timestamps from active telemetry points
      const allPts = penSeries.flatMap(s => s.points);
      const timestamps = allPts.map(p => p.timestampMs).filter((t): t is number => typeof t === 'number' && t > 0);

      if (timestamps.length > 0) {
        const minTs = Math.min(...timestamps);
        const maxTs = Math.max(...timestamps);

        if (baseWindowDurationMs > 0) {
          const recordedSpan = maxTs - minTs;
          if (historyMode === 'live' && recordedSpan < baseWindowDurationMs && zoomScale === 1.0 && panOffsetMs === 0) {
            // Standard Trend Viewer Behavior for new/filling live sessions:
            startMs = minTs;
            endMs = Math.max(maxTs, now);
          } else {
            startMs = Math.max(minTs, now - windowDurationMs);
            endMs = now;
          }
        } else {
          startMs = minTs;
          endMs = Math.max(maxTs, now);
        }
      } else {
        startMs = now - windowDurationMs;
        endMs = now;
      }
    }

    // Apply Pan Offset (Shift backward or forward in time)
    startMs -= panOffsetMs;
    endMs -= panOffsetMs;

    if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
      startMs = endMs - (windowDurationMs || 60000);
    }

    const spanMs = (endMs - startMs) || 60000;
    const startStr = new Date(startMs).toLocaleTimeString();
    const midStr = new Date(startMs + spanMs / 2).toLocaleTimeString();
    const endStr = new Date(endMs).toLocaleTimeString();

    return { startMs, endMs, spanMs, startStr, midStr, endStr };
  }, [selectedTimeRange, customFrom, customTo, penSeries, historyMode, isPaused, pausedAtTime, zoomScale, panOffsetMs]);

  const svgWidth = Math.max(300, svgDimensions.width);
  const svgHeight = height ? Math.max(80, height - 30) : Math.max(80, svgDimensions.height);

  const penCoordsList = useMemo(() => {
    const { startMs, spanMs } = timeWindow;
    return penSeries.map(s => {
      let pts = s.points;
      if (pts.length === 0) return { ...s, coords: [], pathD: '', areaD: '', lastVal: 0, lastTime: '---' };

      // Ensure points are sorted by timestamp ascending (oldest -> newest, left -> right)
      if (pts.some(p => p.timestampMs && p.timestampMs > 0)) {
        pts = pts.slice().sort((a, b) => (a.timestampMs || 0) - (b.timestampMs || 0));
      }

      const coords = pts.map((p, idx) => {
        let ratio = 0;
        if (p.timestampMs && spanMs > 0) {
          ratio = (p.timestampMs - startMs) / spanMs;
        } else {
          ratio = idx / Math.max(1, pts.length - 1);
        }
        const x = ratio * (svgWidth - 44) + 36;
        const norm = Math.max(0, Math.min(1, (p.value - globalMin) / rangeY));
        const y = (svgHeight - 18) - norm * (svgHeight - 26);
        return { x, y, value: p.value, time: p.time, timestampMs: p.timestampMs };
      });
      let pathD = '';
      const actualType = panel?.graphType || graphType || 'line';
      if (actualType === 'curve') pathD = getSplinePath(coords);
      else if (actualType === 'stepped') pathD = getSteppedPath(coords);
      else pathD = coords.reduce((acc, curr, idx) => (idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`), '');
      const firstX = coords[0]?.x || 36;
      const lastX = coords[coords.length - 1]?.x || (svgWidth - 8);
      const areaD = `${pathD} L ${lastX} ${svgHeight - 18} L ${firstX} ${svgHeight - 18} Z`;
      const lastPoint = pts[pts.length - 1];
      return { ...s, coords, pathD, areaD, lastVal: lastPoint?.value || 0, lastTime: lastPoint?.time || '---' };
    });
  }, [penSeries, globalMin, rangeY, graphType, panel, svgHeight, svgWidth, timeWindow]);

  const maxPts = useMemo(() => Math.max(...penCoordsList.map(p => p.coords.length), 0), [penCoordsList]);
  const safeC1Idx = cursor1Idx !== null && maxPts > 0 ? Math.min(Math.max(0, cursor1Idx), maxPts - 1) : null;
  const safeC2Idx = isDualCursor && cursor2Idx !== null && maxPts > 0 ? Math.min(Math.max(0, cursor2Idx), maxPts - 1) : null;

  const toggleDualCursor = () => {
    const nextDual = !isDualCursor;
    setIsDualCursor(nextDual);
    if (nextDual) {
      if (cursor1Idx === null) setCursor1Idx(0);
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

  // Mouse Wheel Zoom Handler (Stops event propagation to prevent main canvas zoom)
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.18 : 0.82;
    setZoomScale(prev => Math.max(0.1, Math.min(25.0, prev * zoomFactor)));
  };

  // Mouse Drag Pan Handler
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    isPanningRef.current = true;
    panStartXRef.current = e.clientX;
    initialPanOffsetRef.current = panOffsetMs;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (!isPanningRef.current) return;
    const deltaX = e.clientX - panStartXRef.current;
    const timeShiftMs = (deltaX / Math.max(100, svgWidth - 44)) * timeWindow.spanMs;
    setPanOffsetMs(initialPanOffsetRef.current + timeShiftMs);
  };

  const handleMouseUp = (e?: React.MouseEvent<SVGSVGElement>) => {
    if (e) e.stopPropagation();
    isPanningRef.current = false;
  };

  // Touch Drag Pan & Touch Pinch Zoom Handler
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
      const timeShiftMs = (deltaX / Math.max(100, svgWidth - 44)) * timeWindow.spanMs;
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

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartTime.current = Date.now();
      longPressTimer.current = setTimeout(() => {
        const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
        if (!rect) return;
        const ratio = Math.max(0, Math.min(1, (touchStartX.current - rect.left) / rect.width));
        if (maxPts === 0) return;
        setCursor2Idx(Math.round(ratio * (maxPts - 1)));
        setIsDualCursor(true);
        setActiveCursorSelect(2);
        setShowToolbar(true);
      }, 500);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    const elapsed = Date.now() - touchStartTime.current;
    if (elapsed < 400 && e.changedTouches.length === 1) {
      const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
      if (!rect) return;
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

  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="flex flex-col h-full w-full bg-[#020617] rounded-xl overflow-hidden border border-slate-800/80 shadow-inner select-none relative"
    >
      {showToolbar && (
        <div className="bg-slate-950/95 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 z-20 text-xs">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleTogglePause}
              className={`px-2.5 py-1 rounded font-bold text-[10px] flex items-center space-x-1 border transition-all cursor-pointer ${isPaused ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
            >
              <i className={`fas fa-${isPaused ? 'play' : 'pause'} text-[9px]`}></i>
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <div className="flex items-center space-x-0.5 bg-slate-900 p-0.5 rounded border border-slate-800 text-[10px]">
              {(['1M', '10M', '30M', '1H', '8H', '1D', 'ALL'] as const).map((range) => {
                const isLockedInCommunity = isCommunityEditionActive() && (range === '8H' || range === '1D' || range === 'ALL');
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      if (isLockedInCommunity) {
                        alert("Free Demo Limit: Maximum 1 Hour trend logging duration allowed in Community Edition. Upgrade to Engineering Studio for 8H, 1D, and ALL historical logging.");
                        setSelectedTimeRange('1H');
                        return;
                      }
                      handleSelectPresetTimeRange(range);
                    }}
                    className={`px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer flex items-center space-x-0.5 ${
                      selectedTimeRange === range && !showCustomDatePicker
                        ? 'bg-sky-500 text-white font-bold'
                        : isLockedInCommunity
                        ? 'text-slate-500 hover:text-slate-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={isLockedInCommunity ? "🔒 Free Demo Limit: 1 Hour max duration. Upgrade to Engineering Studio for 8H/1D/ALL." : `Set time range to ${range}`}
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
            <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 text-[10px] font-mono text-sky-300">
              <i className="fas fa-magnifying-glass text-[9px] text-amber-400"></i>
              <span>Zoom: {Math.round(zoomScale * 100)}%</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400">Span: {formatSpanText(timeWindow.spanMs)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Cursors ON/OFF Toggle Button */}
            <button
              type="button"
              onClick={() => setShowCursors(!showCursors)}
              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
                showCursors
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
              title={showCursors ? "Hide Cursors (Turn Off)" : "Show Cursors (Turn On)"}
            >
              <i className={`fas fa-${showCursors ? 'location-dot' : 'eye-slash'} text-[9px]`}></i>
              <span>{showCursors ? 'Cursors ON' : 'Cursors OFF'}</span>
            </button>

            {/* Reset Zoom/Pan Button */}
            {(panOffsetMs !== 0 || zoomScale !== 1.0) && (
              <button
                type="button"
                onClick={handleResetZoomPan}
                className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30 transition-all cursor-pointer flex items-center space-x-1"
                title="Reset Zoom & Pan to Default Live View"
              >
                <i className="fas fa-rotate-left text-[9px]"></i>
                <span>Reset View</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleDualCursor}
              className={`px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1 border transition-all cursor-pointer ${isDualCursor ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'}`}
            >
              <i className="fas fa-arrows-left-right text-xs"></i>
              <span>{isDualCursor ? 'Dual Cursor (Δ)' : 'Single Cursor'}</span>
            </button>
            {isDualCursor && (
              <div className="flex items-center space-x-1 bg-slate-900/90 p-0.5 rounded border border-slate-800">
                <button type="button" onClick={() => setActiveCursorSelect(1)} className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${activeCursorSelect === 1 ? 'bg-emerald-600 text-white' : 'text-emerald-400'}`}>📍 C1</button>
                <button type="button" onClick={() => setActiveCursorSelect(2)} className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${activeCursorSelect === 2 ? 'bg-sky-600 text-white' : 'text-sky-400'}`}>📍 C2</button>
              </div>
            )}
            <button type="button" onClick={() => setShowTable(!showTable)} className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${showTable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-400'}`}>
              <i className="fas fa-table text-xs"></i>
            </button>
            <button type="button" onClick={handleExportCSV} className="px-2 py-1 bg-slate-900 text-slate-300 border rounded text-[10px] font-bold cursor-pointer">
              <i className="fas fa-download text-xs text-sky-400"></i>
            </button>
            <button type="button" onClick={() => setShowToolbar(false)} className="text-slate-500 hover:text-white p-1">
              <i className="fas fa-xmark text-xs"></i>
            </button>
          </div>

          {panel?.enableHistorianLogging && (
             <div className="w-full flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">Mode:</span>
                  <div className="flex items-center bg-slate-900 rounded border border-slate-800 p-0.5">
                    <button type="button" onClick={() => setHistoryMode('live')} className={`px-2 py-1 font-bold ${historyMode === 'live' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>LIVE</button>
                    <button type="button" onClick={() => setHistoryMode('historical')} className={`px-2 py-1 font-bold ${historyMode === 'historical' ? 'bg-violet-600 text-white' : 'text-slate-400'}`}>HISTORIAN</button>
                  </div>
                  {historyMode === 'historical' && (
                    <>
                      <input type="datetime-local" value={histQueryStart} onChange={(e) => setHistQueryStart(e.target.value)} className="bg-slate-900 text-white rounded px-1" />
                      <input type="datetime-local" value={histQueryEnd} onChange={(e) => setHistQueryEnd(e.target.value)} className="bg-slate-900 text-white rounded px-1" />
                      <button type="button" onClick={handleHistoricalQuery} className="px-2 py-1 bg-violet-600 text-white rounded">{histLoading ? '...' : 'Load'}</button>
                    </>
                  )}
                </div>
             </div>
          )}
        </div>
      )}

      {/* Floating Custom Date & Time Range Popup Card */}
      {showCustomDatePicker && (
        <div className="absolute top-10 left-3 z-50 w-72 bg-slate-950 border border-violet-500/60 rounded-xl p-3.5 shadow-2xl backdrop-blur-md space-y-3 text-xs">
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

          {/* From Date & Time */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">From (Start Date & Time)</label>
            <input
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono outline-none focus:border-violet-500 text-xs"
            />
          </div>

          {/* To Date & Time */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">To (End Date & Time)</label>
            <input
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono outline-none focus:border-violet-500 text-xs"
            />
          </div>

          {/* Quick Presets inside Popup Card */}
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

          {/* Actions */}
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

      <div ref={graphContainerRef} className="flex-1 w-full relative overflow-hidden cursor-crosshair min-h-[70px]" onClick={() => !showToolbar && setShowToolbar(true)}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full text-slate-300 cursor-grab active:cursor-grabbing"
          onClick={handleGraphClick}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStartCustom}
          onTouchMove={handleTouchMoveCustom}
          onTouchEnd={handleTouchEndCustom}
          style={{ touchAction: 'none' }}
        >

          <defs>
            <clipPath id={`trend-clip-${panel?.panelId || 'chart'}`}>
              <rect x="36" y="6" width={Math.max(10, svgWidth - 44)} height={Math.max(10, svgHeight - 24)} />
            </clipPath>
            {penCoordsList.map(s => {
              const cleanColor = (s.pen.color || '#38bdf8').replace('#', '');
              return <linearGradient key={s.pen.id} id={`trend-grad-${cleanColor}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.pen.color || '#38bdf8'} stopOpacity="0.4" /><stop offset="100%" stopColor={s.pen.color || '#38bdf8'} stopOpacity="0.0" /></linearGradient>;
            })}
          </defs>

          {/* Y-Axis Value Labels & Fine Sub-Measurement Scale */}
          <g className="text-[8px] font-mono select-none">
            {/* Fine Vertical Y-Axis Line */}
            <line x1="36" y1="6" x2="36" y2={svgHeight - 18} stroke="#334155" strokeWidth="0.8" />

            {/* Generate 5 Major Divisions (6 Ticks + Values) & Sub-ticks */}
            {Array.from({ length: 6 }).map((_, i) => {
              const ratio = i / 5;
              const val = globalMin + ratio * (maxDataVal - globalMin);
              const yPos = (svgHeight - 18) - ratio * (svgHeight - 26);
              const isBoundary = i === 0 || i === 5;
              const formattedVal = Math.abs(val) >= 100 ? val.toFixed(0) : val.toFixed(1);

              return (
                <g key={i}>
                  {/* Fine Horizontal Grid Line */}
                  {showGrid && (
                    <line
                      x1="36"
                      y1={yPos}
                      x2={svgWidth - 8}
                      y2={yPos}
                      stroke="#ffffff"
                      strokeOpacity={isBoundary ? '0.08' : '0.04'}
                      strokeWidth="0.5"
                    />
                  )}

                  {/* Major Scale Tick Line */}
                  <line
                    x1="32"
                    y1={yPos}
                    x2="36"
                    y2={yPos}
                    stroke={isBoundary ? '#64748b' : '#475569'}
                    strokeWidth="0.8"
                  />

                  {/* Scale Value Label */}
                  <text
                    x="30"
                    y={yPos}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill={isBoundary ? '#94a3b8' : '#64748b'}
                    fontWeight={isBoundary ? '600' : 'normal'}
                  >
                    {formattedVal}
                  </text>

                  {/* Minor Sub-Measurement Tick Mark (In-between ticks) */}
                  {i < 5 && (() => {
                    const subRatio = (i + 0.5) / 5;
                    const subYPos = (svgHeight - 18) - subRatio * (svgHeight - 26);
                    return (
                      <line
                        x1="34"
                        y1={subYPos}
                        x2="36"
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

          {/* X-Axis Time Labels & Line */}
          <g className="text-[8px] font-mono select-none">
            <line x1="36" y1={svgHeight - 18} x2={svgWidth - 8} y2={svgHeight - 18} stroke="#334155" strokeWidth="0.8" />

            {/* Start Time of selected window */}
            <text x="38" y={svgHeight - 5} textAnchor="start" fill="#64748b">
              {timeWindow.startStr}
            </text>
            <line x1="38" y1={svgHeight - 18} x2="38" y2={svgHeight - 14} stroke="#475569" strokeWidth="0.8" />

            {/* Mid Time of selected window */}
            <text x={(36 + svgWidth - 8) / 2} y={svgHeight - 5} textAnchor="middle" fill="#64748b">
              {timeWindow.midStr}
            </text>
            <line x1={(36 + svgWidth - 8) / 2} y1={svgHeight - 18} x2={(36 + svgWidth - 8) / 2} y2={svgHeight - 14} stroke="#475569" strokeWidth="0.8" />

            {/* End Time of selected window */}
            <text x={svgWidth - 8} y={svgHeight - 5} textAnchor="end" fill="#64748b">
              {timeWindow.endStr}
            </text>
            <line x1={svgWidth - 8} y1={svgHeight - 18} x2={svgWidth - 8} y2={svgHeight - 14} stroke="#475569" strokeWidth="0.8" />
          </g>

          <g clipPath={`url(#trend-clip-${panel?.panelId || 'chart'})`}>
            {penCoordsList.map(s => {
              if (!s.pen.visible || s.coords.length === 0) return null;
              const pColor = s.pen.color || '#38bdf8';
              if (activePenType === 'hbar') {
                 const normalizedRatio = Math.max(0, Math.min(1, (s.lastVal - globalMin) / rangeY));
                 return (
                   <g key={s.pen.id}>
                     <rect x="0" y="30%" width={svgWidth} height="40%" fill="#1e293b" rx="4" />
                     <rect
                       x="0"
                       y="30%"
                       width={normalizedRatio * svgWidth}
                       height="40%"
                       fill={pColor}
                       rx="4"
                       style={{ transition: 'width 0.3s ease-out, fill 0.3s ease-out' }}
                     />
                   </g>
                 );
              }
              if (activePenType === 'bar') {
                 const barW = Math.max(2, (svgWidth / s.coords.length) * 0.7);
                 return (
                   <g key={s.pen.id}>
                     {s.coords.map((c, i) => (
                       <rect
                         key={i}
                         x={c.x - barW / 2}
                         y={c.y}
                         width={barW}
                         height={svgHeight - c.y}
                         fill={pColor}
                         opacity="0.8"
                         rx="1"
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
                  <path
                    d={s.pathD}
                    fill="none"
                    stroke={pColor}
                    strokeWidth={s.pen.thickness || penThickness}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: 'd 0.3s ease-out, stroke 0.3s ease-out, stroke-width 0.3s ease-out' }}
                  />
                  {(s.pen.showNodeMarkers ?? globalShowNodeMarkers) && s.coords.map((c, i) => (
                    <circle
                      key={i}
                      cx={c.x}
                      cy={c.y}
                      r={0.85}
                      fill={pColor}
                      stroke="#020617"
                      strokeWidth="0.3"
                      style={{ transition: 'cx 0.3s ease-out, cy 0.3s ease-out' }}
                    />
                  ))}
                </g>
              );
            })}
          </g>
          {showCursors && safeC1Idx !== null && (
            <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setActiveCursorSelect(1); }}>
              <line
                x1={penCoordsList[0].coords[safeC1Idx].x}
                y1="0"
                x2={penCoordsList[0].coords[safeC1Idx].x}
                y2={svgHeight}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                style={{ transition: 'x1 0.25s ease-out, x2 0.25s ease-out' }}
              />
              <rect
                x={penCoordsList[0].coords[safeC1Idx].x - 12}
                y="0"
                width="24"
                height="13"
                rx="3"
                fill={activeCursorSelect === 1 ? '#059669' : '#10b981'}
                style={{ transition: 'x 0.25s ease-out' }}
              />
              <text
                x={penCoordsList[0].coords[safeC1Idx].x}
                y="9.5"
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
          {showCursors && isDualCursor && safeC2Idx !== null && (
            <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setActiveCursorSelect(2); }}>
              <line
                x1={penCoordsList[0].coords[safeC2Idx].x}
                y1="0"
                x2={penCoordsList[0].coords[safeC2Idx].x}
                y2={svgHeight}
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                style={{ transition: 'x1 0.25s ease-out, x2 0.25s ease-out' }}
              />
              <rect
                x={penCoordsList[0].coords[safeC2Idx].x - 12}
                y="0"
                width="24"
                height="13"
                rx="3"
                fill={activeCursorSelect === 2 ? '#2563eb' : '#3b82f6'}
                style={{ transition: 'x 0.25s ease-out' }}
              />
              <text
                x={penCoordsList[0].coords[safeC2Idx].x}
                y="9.5"
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
      </div>
      {showTable && (
        <div className="bg-slate-950 border-t border-slate-800 overflow-x-auto text-[10px] font-mono shrink-0">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase text-[9px] tracking-wider">
                <th className="py-1 px-2 text-center w-8">Vis</th>
                <th className="py-1 px-2">Pen Description</th>
                {showStatusCol && <th className="py-1 px-2 text-center">Status</th>}
                {showLastValCol && <th className="py-1 px-2 text-right">Last Val</th>}
                {showLastTimeCol && <th className="py-1 px-2 text-right">Last Time</th>}
                {showC1TimeCol && <th className="py-1 px-2 text-right text-emerald-400">C1 Time</th>}
                {showC1ValCol && <th className="py-1 px-2 text-right text-emerald-400">C1 Val</th>}
                {showC2TimeCol && <th className="py-1 px-2 text-right text-sky-400">C2 Time</th>}
                {showC2ValCol && <th className="py-1 px-2 text-right text-sky-400">C2 Val</th>}
                {showValDiffCol && <th className="py-1 px-2 text-right text-amber-400">Δv</th>}
                {showTimeDiffCol && <th className="py-1 px-2 text-right text-amber-400">Δt</th>}
                {showMinValCol && <th className="py-1 px-2 text-right text-purple-400">Min</th>}
                {showMaxValCol && <th className="py-1 px-2 text-right text-pink-400">Max</th>}
                {showAvgValCol && <th className="py-1 px-2 text-right text-cyan-400">Avg</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {penCoordsList.map((s) => {
                const c1Point = safeC1Idx !== null ? s.coords[safeC1Idx] : null;
                const c2Point = safeC2Idx !== null ? s.coords[safeC2Idx] : null;
                const valDiff = c1Point && c2Point ? c2Point.value - c1Point.value : null;
                const timeDiffStr = c1Point && c2Point ? formatTimeDiff(c1Point, c2Point) : '---';
                const allVals = s.coords.map(c => c.value);
                const minVal = allVals.length > 0 ? Math.min(...allVals) : null;
                const maxVal = allVals.length > 0 ? Math.max(...allVals) : null;
                const avgVal = allVals.length > 0 ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null;

                const penTopic = s.pen.topic ? s.pen.topic.trim() : undefined;
                const livePenVal = penTopic ? (latestValues ? latestValues[penTopic] : undefined) : undefined;
                const panelStatus = panel ? getPanelTelemetryStatus(panel, latestValues || {}) : { isOffline: false, isBad: false };
                const penTimestampMs = livePenVal?.timestampMs || (s.coords.length > 0 ? s.coords[s.coords.length - 1].timestampMs : undefined);
                const timeoutSec = panel?.staleTimeoutSeconds !== undefined ? panel.staleTimeoutSeconds : 10;
                const isPenStale = (panel?.enableStaleTimeout !== false) && penTimestampMs ? ((Date.now() - penTimestampMs) / 1000 > timeoutSec) : false;
                const isPenOfflineOrBad = panelStatus.isOffline || isPenStale || livePenVal?.quality === 'bad';

                return (
                  <tr key={s.pen.id} className="hover:bg-slate-900/50">
                    <td className="py-1 px-2 text-center"><input type="checkbox" checked={s.pen.visible} onChange={() => setHiddenPens(prev => ({ ...prev, [s.pen.id]: !prev[s.pen.id] }))} /></td>
                    <td className="py-1 px-2 font-bold text-slate-200" title={s.pen.name}>{s.pen.name}</td>
                    {showStatusCol && (
                      <td className="py-1 px-2 text-center">
                        <span className={`px-1 rounded text-[8px] font-bold ${isPenOfflineOrBad ? 'text-rose-400 animate-pulse' : (s.coords.length > 0 ? 'text-emerald-400' : 'text-slate-500')}`}>
                          {isPenOfflineOrBad ? 'Bad' : (s.coords.length > 0 ? 'Good' : 'No Data')}
                        </span>
                      </td>
                    )}
                    {showLastValCol && <td className="py-1 px-2 text-right" style={{ color: s.pen.color || '#38bdf8' }}>{s.lastVal.toFixed(1)}</td>}
                    {showLastTimeCol && <td className="py-1 px-2 text-right text-slate-400">{s.lastTime}</td>}
                    {showC1TimeCol && <td className="py-1 px-2 text-right text-emerald-300">{c1Point ? c1Point.time : '---'}</td>}
                    {showC1ValCol && <td className="py-1 px-2 text-right font-bold text-emerald-300">{c1Point ? c1Point.value.toFixed(1) : '---'}</td>}
                    {showC2TimeCol && <td className="py-1 px-2 text-right text-sky-300">{c2Point ? c2Point.time : '---'}</td>}
                    {showC2ValCol && <td className="py-1 px-2 text-right font-bold text-sky-300">{c2Point ? c2Point.value.toFixed(1) : '---'}</td>}
                    {showValDiffCol && <td className="py-1 px-2 text-right font-bold text-amber-300">{valDiff !== null ? (valDiff >= 0 ? `+${valDiff.toFixed(1)}` : valDiff.toFixed(1)) : '---'}</td>}
                    {showTimeDiffCol && <td className="py-1 px-2 text-right font-bold text-amber-200">{timeDiffStr}</td>}
                    {showMinValCol && <td className="py-1 px-2 text-right font-bold text-purple-300">{minVal !== null ? minVal.toFixed(1) : '---'}</td>}
                    {showMaxValCol && <td className="py-1 px-2 text-right font-bold text-pink-300">{maxVal !== null ? maxVal.toFixed(1) : '---'}</td>}
                    {showAvgValCol && <td className="py-1 px-2 text-right font-bold text-cyan-300">{avgVal !== null ? avgVal.toFixed(1) : '---'}</td>}
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
