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
  // Static, decorative, clock, shape, or non-telemetry elements are never marked offline
  const isStaticOrNonTelemetry =
    panel.type === 'static_text' ||
    (panel.type as string) === 'static_text' ||
    (panel.type as string) === 'label' ||
    panel.type === 'shape' ||
    panel.type === 'clock' ||
    panel.type === 'screen_jump' ||
    panel.type === 'alarm_log' ||
    (panel.type === 'image' && !panel.topic && !panel.driverTagId);

  const hasNoDataBinding = !panel.topic?.trim() && !panel.driverTagId;

  if (isStaticOrNonTelemetry || hasNoDataBinding) {
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
  }

  // Lookup in latestValues store
  let liveData = dataKey ? (latestValues[dataKey] || latestValues[panel.panelId]) : latestValues[panel.panelId];

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
