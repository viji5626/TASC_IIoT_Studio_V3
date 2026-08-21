import { Panel } from '../types';

export interface TelemetryStatusResult {
  hasData: boolean;
  isStale: boolean;
  isBad: boolean;
  isOffline: boolean;
  statusText: 'GOOD' | 'OFFLINE' | 'BAD' | 'NO_DATA';
  secondsSinceUpdate?: number;
  lastUpdatedMs?: number;
}

/**
 * Evaluates whether an element/widget has stale or disconnected telemetry based on
 * configurable time interval (staleTimeoutSeconds, default 10s).
 */
export function getPanelTelemetryStatus(
  panel: Panel,
  latestValues: Record<string, { val: any; time: string; timestampMs?: number; quality?: string }> = {},
  nowMs: number = Date.now()
): TelemetryStatusResult {
  // Find any active dynamic rule tag/topic binding on this panel
  const dynamicTagKey = panel.dynamics?.find(d => d.enabled && (d.driverTagId || d.topic))?.driverTagId 
    || panel.dynamics?.find(d => d.enabled && (d.driverTagId || d.topic))?.topic;

  const hasDataBinding = Boolean(panel.topic?.trim() || panel.driverTagId || dynamicTagKey);

  // Static, decorative, clock, alarm log, or trend line graphs are never marked offline
  const isStaticOrNonTelemetry =
    panel.type === 'static_text' ||
    (panel.type as string) === 'static_text' ||
    (panel.type as string) === 'label' ||
    panel.type === 'clock' ||
    panel.type === 'screen_jump' ||
    panel.type === 'alarm_log' ||
    panel.type === 'line_graph' ||
    (panel.type as string) === 'line_graph' ||
    panel.type === 'chart' ||
    (panel.type as string) === 'chart' ||
    (panel.type === 'image' && !hasDataBinding) ||
    (!hasDataBinding);

  if (isStaticOrNonTelemetry || !hasDataBinding) {
    return {
      hasData: true,
      isStale: false,
      isBad: false,
      isOffline: false,
      statusText: 'GOOD'
    };
  }

  // Determine key to look up in latestValues store
  let dataKey: string | undefined;
  if (panel.dataSourceMode === 'driver' && panel.driverTagId) {
    dataKey = panel.driverTagId;
  } else if (panel.topic && panel.topic.trim()) {
    dataKey = panel.topic.trim();
  } else if (dynamicTagKey) {
    dataKey = dynamicTagKey.trim();
  }

  // Lookup in latestValues store
  let liveData = dataKey ? (latestValues[dataKey] || latestValues[panel.panelId]) : latestValues[panel.panelId];

  // Try finding by clean key, case-insensitive or tag_panel_ prefix if not found directly
  if (!liveData && dataKey) {
    const cleanKey = dataKey.trim().toLowerCase();
    for (const [k, v] of Object.entries(latestValues)) {
      if (k.toLowerCase() === cleanKey || k.toLowerCase() === `tag_panel_${cleanKey}`) {
        liveData = v;
        break;
      }
    }
  }

  // Also check clean topic format
  if (!liveData && panel.topic) {
    const cleanTopic = panel.topic.trim();
    liveData = latestValues[cleanTopic];
  }

  if (!liveData) {
    return {
      hasData: false,
      isStale: true,
      isBad: true,
      isOffline: true,
      statusText: 'NO_DATA'
    };
  }

  // Check quality badge if reported directly by backend driver
  if (liveData.quality === 'bad') {
    return {
      hasData: liveData.val !== undefined && liveData.val !== null,
      isStale: false,
      isBad: true,
      isOffline: true,
      statusText: 'BAD',
      lastUpdatedMs: liveData.timestampMs
    };
  }

  if (liveData.val === undefined || liveData.val === null) {
    return {
      hasData: false,
      isStale: true,
      isBad: true,
      isOffline: true,
      statusText: 'NO_DATA',
      lastUpdatedMs: liveData.timestampMs
    };
  }

  // Stale Watchdog Timeout Calculation
  // Default timeout interval is 10 seconds if not explicitly set
  const timeoutSec = panel.staleTimeoutSeconds !== undefined ? panel.staleTimeoutSeconds : 10;
  const isTimeoutEnabled = panel.enableStaleTimeout !== false && timeoutSec > 0;

  if (isTimeoutEnabled && liveData.timestampMs) {
    const elapsedSec = (nowMs - liveData.timestampMs) / 1000;
    if (elapsedSec > timeoutSec) {
      return {
        hasData: true,
        isStale: true,
        isBad: false,
        isOffline: true,
        statusText: 'OFFLINE',
        secondsSinceUpdate: Math.floor(elapsedSec),
        lastUpdatedMs: liveData.timestampMs
      };
    }
  }

  return {
    hasData: true,
    isStale: false,
    isBad: false,
    isOffline: false,
    statusText: 'GOOD',
    lastUpdatedMs: liveData.timestampMs
  };
}
