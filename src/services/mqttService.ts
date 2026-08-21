import { Panel } from '../types';
import { mqttWildcardMatch, getJsonValue } from '../utils/mqttHelper';

/**
 * Tests whether an incoming MQTT topic matches any of the panel's topics,
 * taking into account dashboard topic prefixes and wildcard subscriptions.
 */
export function matchesTopic(
  incomingTopic: string,
  panelTopics: string[],
  dashboardPrefix: string | undefined,
  disableDashboardPrefix: boolean
): boolean {
  const cleanTopic = incomingTopic.trim();
  const prefix = dashboardPrefix ? dashboardPrefix.trim() : '';

  for (const rawPanelTopic of panelTopics) {
    if (!rawPanelTopic) continue;
    const cleanRawTopic = rawPanelTopic.trim();
    if (!cleanRawTopic) continue;

    const fullTopic = disableDashboardPrefix 
      ? cleanRawTopic 
      : `${prefix}${cleanRawTopic}`;

    if (
      cleanTopic === fullTopic ||
      cleanTopic === cleanRawTopic ||
      cleanTopic.endsWith('/' + cleanRawTopic) ||
      cleanTopic.endsWith(cleanRawTopic) ||
      cleanRawTopic.endsWith('/' + cleanTopic) ||
      mqttWildcardMatch(fullTopic, cleanTopic) ||
      mqttWildcardMatch(cleanRawTopic, cleanTopic)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts the parsed panel value from an incoming MQTT topic and payload,
 * matching against primary topic, publishTopic, and pen topics.
 */
export function extractPanelValue(
  topic: string,
  payloadStr: string,
  panel: Panel,
  dashboardPrefixTopic: string | undefined
): { panelId: string; extracted: any; rawPayload: string } | null {
  if (!panel.topic && !panel.publishTopic && (!panel.pens || panel.pens.length === 0)) return null;

  const penTopics = (panel.pens || []).map(p => p.topic?.trim()).filter(Boolean) as string[];
  const rawTopics = [panel.topic?.trim(), panel.publishTopic?.trim(), ...penTopics].filter(Boolean) as string[];

  const isMatch = matchesTopic(
    topic,
    rawTopics,
    dashboardPrefixTopic,
    !!panel.disableDashboardPrefix
  );

  if (!isMatch) return null;

  let extracted: any = payloadStr;
  const effectiveJsonPath = panel.jsonPath || (panel.pens && panel.pens.length > 0 ? panel.pens[0]?.jsonPath : undefined);

  if (effectiveJsonPath) {
    const jsonVal = getJsonValue(payloadStr, effectiveJsonPath);
    if (jsonVal !== undefined) {
      extracted = jsonVal;
    }
  } else if (panel.isJSONPayload) {
    try {
      extracted = JSON.parse(payloadStr);
    } catch {
      extracted = payloadStr;
    }
  }

  return {
    panelId: panel.panelId,
    extracted,
    rawPayload: payloadStr
  };
}

/**
 * Extracts individual pen values for multi-pen Line Graph panels from payload.
 */
export function extractPenValues(
  payloadStr: string,
  panel: Panel
): Array<{ penId: string; penTopic: string | undefined; numVal: number }> {
  if (!panel.pens || panel.pens.length === 0) return [];
  const results: Array<{ penId: string; penTopic: string | undefined; numVal: number }> = [];

  panel.pens.forEach(pen => {
    const queryPath = (pen.jsonPath && pen.jsonPath.trim()) ? pen.jsonPath.trim() : (panel.jsonPath || '');
    let penVal: any;
    if (queryPath) {
      penVal = getJsonValue(payloadStr, queryPath);
    } else {
      penVal = getJsonValue(payloadStr, '');
    }

    const penNum = typeof penVal === 'number' ? penVal : parseFloat(String(penVal ?? ''));
    if (!isNaN(penNum)) {
      results.push({
        penId: pen.id,
        penTopic: pen.topic,
        numVal: penNum
      });
    }
  });

  return results;
}
