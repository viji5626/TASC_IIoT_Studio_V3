import { Panel, PanelType, ActiveAlarm } from '../types';
import { isPanelTripped } from '../utils/tripHelper';
import { getResolvedZones } from '../utils/gaugeThresholds';

/**
 * Pure evaluation function for live alarms across all panels.
 * Evaluates equipment trips, fault statuses, and high/mid/low threshold boundaries.
 */
export function evaluateAlarms(
  panels: Panel[],
  latestValues: Record<string, { val: any; time: string; rawPayload?: any }>,
  acknowledgedAlarms: Record<string, boolean> = {}
): ActiveAlarm[] {
  const newAlarmsList: ActiveAlarm[] = [];

  (panels || []).forEach(panel => {
    const isSymbolPanel = !!panel.symbolId || !!panel.symbolAnimType;
    const isOutputPanel = [
      PanelType.GAUGE,
      PanelType.LINE_GRAPH,
      PanelType.PROGRESS,
      PanelType.TEXT_OUTPUT,
      PanelType.LOG,
      PanelType.LED,
      PanelType.NODE_STATUS
    ].includes(panel.type as PanelType) || panel.type === 'log' || panel.type === 'text_display' || isSymbolPanel;

    // Dedicated Equipment Trip Tag & Fault Alarm Evaluation
    const tripStatus = isPanelTripped(panel, latestValues);
    if (tripStatus.isTripped) {
      const tripAlarmKey = `${panel.panelId}_TRIP`;
      const nowIso = new Date().toISOString();
      newAlarmsList.push({
        alarmKey: tripAlarmKey,
        panelId: panel.panelId,
        panelName: panel.panelName || 'Equipment',
        panelTitle: panel.panelName || 'Equipment',
        dashboardId: panel.dashboardId,
        zone: 'TRIP',
        alarmType: 'TRIP',
        value: tripStatus.tripValue,
        currentValue: tripStatus.tripValue,
        unit: '',
        threshold: 1,
        limitThreshold: 'Digital Trip',
        message: tripStatus.message,
        color: tripStatus.tripColor,
        timestamp: nowIso,
        triggeredAt: nowIso,
        topic: panel.topic || panel.tripTopic,
        acknowledged: !!acknowledgedAlarms[tripAlarmKey]
      });
    }

    if (!isOutputPanel) return;

    const panelValObj = latestValues[panel.panelId] || (panel.topic ? latestValues[panel.topic] : undefined);
    if (!panelValObj) return;

    const rawVal = panelValObj.val;
    let numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
    if (isNaN(numVal)) return;

    if (panel.enableDecimalScaling) {
      const frac = panel.scaleFractionDigits !== undefined ? Number(panel.scaleFractionDigits) : 2;
      const divisor = panel.scaleDivisor ? Number(panel.scaleDivisor) : Math.pow(10, frac);
      if (divisor > 0) {
        numVal = numVal / divisor;
      }
    }

    const resolved = getResolvedZones(panel);
    const lowLimit = resolved.thresholds[0];
    const highLimit = resolved.thresholds[resolved.thresholds.length - 1];

    let matchedZone: 'LOW' | 'MID' | 'HIGH' | null = null;
    let alarmMsg = '';
    let alarmColor = '';
    let thresholdVal = 0;

    if (numVal <= lowLimit && panel.enableLowAlarm) {
      matchedZone = 'LOW';
      alarmMsg = panel.lowAlarmMsg || 'Low Zone Warning';
      alarmColor = resolved.zones[0]?.color || panel.firstColor || '#f59e0b';
      thresholdVal = lowLimit;
    } else if (numVal > lowLimit && numVal <= highLimit && panel.enableMidAlarm) {
      matchedZone = 'MID';
      alarmMsg = panel.midAlarmMsg || 'Mid Zone Warning';
      alarmColor = resolved.zones[1]?.color || panel.secondColor || '#10b981';
      thresholdVal = highLimit;
    } else if (numVal > highLimit && panel.enableHighAlarm) {
      matchedZone = 'HIGH';
      alarmMsg = panel.highAlarmMsg || 'High Critical Alarm';
      alarmColor = resolved.zones[resolved.zones.length - 1]?.color || panel.thirdColor || '#f43f5e';
      thresholdVal = highLimit;
    }

    if (matchedZone) {
      const alarmKey = `${panel.panelId}_${matchedZone}`;
      const nowIso = panelValObj.time && !isNaN(new Date(panelValObj.time).getTime())
        ? new Date(panelValObj.time).toISOString()
        : new Date().toISOString();

      newAlarmsList.push({
        alarmKey,
        panelId: panel.panelId,
        panelName: panel.panelName || 'Symbol Asset',
        panelTitle: panel.panelName || 'Symbol Asset',
        dashboardId: panel.dashboardId,
        zone: matchedZone,
        alarmType: matchedZone,
        value: numVal,
        currentValue: numVal,
        unit: panel.unit || '',
        threshold: thresholdVal,
        limitThreshold: thresholdVal,
        message: alarmMsg,
        color: alarmColor,
        timestamp: nowIso,
        triggeredAt: nowIso,
        topic: panel.topic,
        acknowledged: !!acknowledgedAlarms[alarmKey]
      });
    }
  });

  return newAlarmsList;
}
