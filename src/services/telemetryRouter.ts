import { enqueueTelemetryPoint } from '../utils/trendHistorianEngine';
import { Panel, HistorianConfig, HistorianTag } from '../types';

export interface RouteTelemetryParams {
  numVal: number;
  topic?: string;
  tagId?: string;
  penId?: string;
  panelId?: string;
  historianConfig?: HistorianConfig;
  historianTags?: HistorianTag[];
  panels?: Panel[];
  sourceType: 'mqtt' | 'driver';
  sourceMode: 'primary' | 'pen' | 'historian_tag';
  logIntervalSeconds?: number;
  loggingEnabled?: boolean;
}

/**
 * Unified telemetry routing service for the Centralized Historian Engine.
 * Consolidates all scattered enqueueTelemetryPoint calls across MQTT and Driver subsystems.
 */
export function routeTelemetryToHistorian(params: RouteTelemetryParams): void {
  const {
    numVal,
    topic,
    tagId,
    penId,
    panelId,
    historianConfig,
    sourceMode,
    logIntervalSeconds,
    loggingEnabled
  } = params;

  if (isNaN(numVal) || numVal === null || numVal === undefined) return;

  const globalHistEnabled = historianConfig?.enabled !== false;
  const globalInterval = historianConfig?.logIntervalSeconds || 10;

  // 1. Direct centralized historian tag mode
  if (sourceMode === 'historian_tag') {
    if (!globalHistEnabled) return;
    const effectiveInterval = logIntervalSeconds || globalInterval;
    const targetId = tagId || panelId || '';
    const penIdentifier = penId || topic || tagId || '';
    if (targetId && penIdentifier) {
      enqueueTelemetryPoint(targetId, penIdentifier, numVal, effectiveInterval, tagId);
    }
    return;
  }

  // 2. Multi-pen mode on a panel
  if (sourceMode === 'pen') {
    if (loggingEnabled === false) return;
    if (panelId && logIntervalSeconds) {
      const penIdentifier = topic || penId || panelId;
      enqueueTelemetryPoint(panelId, penIdentifier, numVal, logIntervalSeconds, penId);
    }
    return;
  }

  // 3. Primary single-pen or standard panel mode
  if (sourceMode === 'primary') {
    if (loggingEnabled === false) return;
    if (panelId && logIntervalSeconds) {
      const penIdentifier = topic || tagId || panelId;
      enqueueTelemetryPoint(panelId, penIdentifier, numVal, logIntervalSeconds);
    }
    return;
  }
}
