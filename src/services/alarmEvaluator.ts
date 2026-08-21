import { Panel, PanelType, ActiveAlarm } from '../types';
import { isPanelTripped } from '../utils/tripHelper';

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
      newAlarmsList.push({
        alarmKey: tripAlarmKey,
        panelId: panel.panelId,
        panelName: panel.panelName || 'Equipment',
        dashboardId: panel.dashboardId,
        zone: 'TRIP',
        value: tripStatus.tripValue,
        unit: '',
        threshold: 1,
        message: tripStatus.message,
        color: tripStatus.tripColor,
        timestamp: new Date().toLocaleTimeString(),
        acknowledged: !!acknowledgedAlarms[tripAlarmKey]
      });
    }

    if (!isOutputPanel) return;

    const panelValObj = latestValues[panel.panelId] || (panel.topic ? latestValues[panel.topic] : undefined);
    if (!panelValObj) return;

    const rawVal = panelValObj.val;
    const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
    if (isNaN(numVal)) return;

    const min = panel.payloadMin ?? 0;
    const max = panel.payloadMax ?? 100;
    const range = max - min || 1;

    const lowLimit = panel.lowThreshold !== undefined ? panel.lowThreshold : (min + range * 0.25);
    const highLimit = panel.highThreshold !== undefined ? panel.highThreshold : (min + range * 0.75);

    let matchedZone: 'LOW' | 'MID' | 'HIGH' | null = null;
    let alarmMsg = '';
    let alarmColor = '';
    let thresholdVal = 0;

    if (numVal <= lowLimit && panel.enableLowAlarm) {
      matchedZone = 'LOW';
      alarmMsg = panel.lowAlarmMsg || 'Low Zone Warning';
      alarmColor = panel.firstColor || '#f59e0b';
      thresholdVal = lowLimit;
    } else if (numVal > lowLimit && numVal <= highLimit && panel.enableMidAlarm) {
      matchedZone = 'MID';
      alarmMsg = panel.midAlarmMsg || 'Mid Zone Warning';
      alarmColor = panel.secondColor || '#10b981';
      thresholdVal = highLimit;
    } else if (numVal > highLimit && panel.enableHighAlarm) {
      matchedZone = 'HIGH';
      alarmMsg = panel.highAlarmMsg || 'High Critical Alarm';
      alarmColor = panel.thirdColor || '#f43f5e';
      thresholdVal = highLimit;
    }

    if (matchedZone) {
      const alarmKey = `${panel.panelId}_${matchedZone}`;
      newAlarmsList.push({
        alarmKey,
        panelId: panel.panelId,
        panelName: panel.panelName || 'Symbol Asset',
        dashboardId: panel.dashboardId,
        zone: matchedZone,
        value: numVal,
        unit: panel.unit || '',
        threshold: thresholdVal,
        message: alarmMsg,
        color: alarmColor,
        timestamp: panelValObj.time || new Date().toLocaleTimeString(),
        acknowledged: !!acknowledgedAlarms[alarmKey]
      });
    }
  });

  return newAlarmsList;
}
