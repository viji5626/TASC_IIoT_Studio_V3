import { Panel } from '../types';
import { getJsonValue } from './mqttHelper';

export interface TripStatusResult {
  isTripped: boolean;
  tripValue: any;
  message: string;
  tripColor: string;
}

/**
 * Checks whether a panel/equipment symbol is currently in a TRIP / FAULT state
 * based on JSONPath Read Tag or Payload Trip condition on the topic.
 */
export function isPanelTripped(
  panel: Panel, 
  latestValues: Record<string, { val: any; rawPayload?: any; time: string }>
): TripStatusResult {
  const tripColor = panel.tripColor || '#ef4444'; // Bright Red Hazard

  if (!panel.enableTrip) {
    return { isTripped: false, tripValue: null, message: '', tripColor };
  }

  // Look up by explicit panel ID first, then tripTopic, then main topic
  let dataObj = latestValues[panel.panelId];
  if (!dataObj && panel.tripTopic) {
    const cleanTopic = panel.tripTopic.trim().replace(/^\//, '');
    dataObj = latestValues[panel.tripTopic.trim()] || latestValues[cleanTopic];
  }
  if (!dataObj && panel.topic) {
    const cleanTopic = panel.topic.trim().replace(/^\//, '');
    dataObj = latestValues[panel.topic.trim()] || latestValues[cleanTopic];
  }

  if (!dataObj) {
    return { isTripped: false, tripValue: null, message: '', tripColor };
  }

  let liveVal: any = dataObj.val;

  // If a JSONPath Query for Trip Read Tag is specified, evaluate it against raw payload or object
  if (panel.tripJsonPath && panel.tripJsonPath.trim()) {
    const payloadToQuery = dataObj.rawPayload !== undefined ? dataObj.rawPayload : dataObj.val;
    const extractedTrip = getJsonValue(payloadToQuery, panel.tripJsonPath);
    if (extractedTrip !== undefined) {
      liveVal = extractedTrip;
    }
  }

  if (liveVal === undefined || liveVal === null) {
    return { isTripped: false, tripValue: null, message: '', tripColor };
  }

  const expectedTripPayload = String(panel.payloadTrip !== undefined && panel.payloadTrip !== null ? panel.payloadTrip : '1').trim().toLowerCase();
  const actualValStr = String(liveVal).trim().toLowerCase();

  const isTripped = (
    actualValStr === expectedTripPayload ||
    (expectedTripPayload === '1' && (actualValStr === 'true' || actualValStr === 'trip' || actualValStr === 'fault' || actualValStr === 'error')) ||
    actualValStr === 'trip' ||
    actualValStr === 'fault'
  );

  const message = panel.tripMessage || `${panel.panelName || 'Equipment'} CRITICAL TRIP ALARM`;

  return {
    isTripped,
    tripValue: liveVal,
    message,
    tripColor
  };
}
