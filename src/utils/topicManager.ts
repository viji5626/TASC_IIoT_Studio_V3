import { AppState, Panel, Dashboard, PanelType } from '../types';

export type TopicDirection = 'subscribe' | 'publish' | 'both';

export interface TopicOccurrence {
  panelId?: string;
  panelName?: string;
  panelType?: string;
  dashboardId: string;
  dashboardName: string;
  field: 'topic' | 'publishTopic' | 'prefixTopic';
  direction: TopicDirection;
  rawTopic: string;
  effectiveTopic: string;
  dashboardPrefix?: string;
  disableDashboardPrefix?: boolean;
}

export interface TopicRegistryEntry {
  topic: string; // Raw topic string
  usageCount: number;
  direction: TopicDirection;
  occurrences: TopicOccurrence[];
  widgetsCount: number;
  dashboardsCount: number;
  isPrefix?: boolean;
}

export interface DashboardPrefixInfo {
  dashboardId: string;
  dashboardName: string;
  prefix: string;
  widgetsCount: number;
}

export interface TopicScannerSummary {
  totalWidgets: number;
  totalTopicReferences: number;
  totalUniqueTopics: number;
  publishCount: number;
  subscribeCount: number;
  bothCount: number;
  topics: TopicRegistryEntry[];
  dashboardPrefixes: DashboardPrefixInfo[];
  conflictingOrWarningTopics: { topic: string; warning: string; level: 'warn' | 'error' }[];
}

export interface TopicSuggestionOption {
  topic: string;
  direction: TopicDirection;
  usageCount: number;
  widgetsCount: number;
  dashboardsCount: number;
  isPrefix?: boolean;
}

/**
 * Returns filtered topic suggestions from Topic Manager for widget configuration fields.
 */
export function getTopicSuggestions(
  appState: AppState,
  targetDirection: 'subscribe' | 'publish'
): TopicSuggestionOption[] {
  if (!appState) return [];
  const summary = scanAppTopics(appState);
  return summary.topics
    .filter(t => {
      if (targetDirection === 'subscribe') {
        return t.direction === 'subscribe' || t.direction === 'both';
      } else {
        return t.direction === 'publish' || t.direction === 'both';
      }
    })
    .map(t => ({
      topic: t.topic,
      direction: t.direction,
      usageCount: t.usageCount,
      widgetsCount: t.widgetsCount,
      dashboardsCount: t.dashboardsCount,
      isPrefix: t.isPrefix
    }));
}

/**
  Determines if a panel type is inherently a control (publish) widget or read-only (subscribe) widget.
 */
export function isControlPanelType(type: string): boolean {
  const controlTypes = [
    PanelType.BUTTON,
    PanelType.SWITCH,
    PanelType.SLIDER,
    PanelType.TEXT_INPUT,
    PanelType.COMBO_BOX,
    PanelType.RADIO_BUTTONS,
    PanelType.MULTI_STATE,
    PanelType.COLOR_PICKER,
    PanelType.DATE_PICKER,
  ];
  return controlTypes.includes(type as PanelType) || ['button', 'switch', 'slider', 'text_input', 'combo_box', 'radio_buttons', 'multi_state', 'color_picker', 'date_picker'].includes(type);
}

/**
  Scans all dashboards and panels in AppState to build a complete Topic Registry.
 */
export function scanAppTopics(appState: AppState): TopicScannerSummary {
  const dashboardsMap = new Map<string, Dashboard>();
  (appState.dashboards || []).forEach(d => dashboardsMap.set(d.dashboardId, d));

  const totalWidgets = (appState.panels || []).length;
  const rawOccurrences: TopicOccurrence[] = [];
  const dashboardPrefixes: DashboardPrefixInfo[] = [];

  // 1. Scan Dashboard Prefixes
  (appState.dashboards || []).forEach(dash => {
    if (dash.prefixTopic && dash.prefixTopic.trim()) {
      const pfx = dash.prefixTopic.trim();
      const widgetsUsingDash = (appState.panels || []).filter(p => p.dashboardId === dash.dashboardId).length;
      dashboardPrefixes.push({
        dashboardId: dash.dashboardId,
        dashboardName: dash.dashboardName || 'Unnamed Dashboard',
        prefix: pfx,
        widgetsCount: widgetsUsingDash,
      });

      rawOccurrences.push({
        dashboardId: dash.dashboardId,
        dashboardName: dash.dashboardName || 'Unnamed Dashboard',
        field: 'prefixTopic',
        direction: 'both',
        rawTopic: pfx,
        effectiveTopic: pfx,
      });
    }
  });

  // 2. Scan Panels / Widgets
  (appState.panels || []).forEach(panel => {
    const dash = dashboardsMap.get(panel.dashboardId);
    const dashName = dash?.dashboardName || 'Unknown Dashboard';
    const dashPrefix = dash?.prefixTopic?.trim() || '';
    const disablePrefix = !!panel.disableDashboardPrefix;

    const subTopic = panel.topic?.trim() || '';
    const pubTopic = panel.publishTopic?.trim() || '';

    const isControl = isControlPanelType(panel.type);

    // Primary Topic field
    if (subTopic) {
      const effectiveSub = (!disablePrefix && dashPrefix) ? `${dashPrefix}${subTopic}` : subTopic;
      
      let direction: TopicDirection = 'subscribe';
      if (isControl) {
        if (!pubTopic || pubTopic === subTopic) {
          direction = 'both'; // Same topic used for sub state & pub control
        } else {
          direction = 'subscribe'; // Dedicated subscribe topic
        }
      }

      rawOccurrences.push({
        panelId: panel.panelId,
        panelName: panel.panelName || 'Unnamed Widget',
        panelType: panel.type,
        dashboardId: panel.dashboardId,
        dashboardName: dashName,
        field: 'topic',
        direction,
        rawTopic: subTopic,
        effectiveTopic: effectiveSub,
        dashboardPrefix: dashPrefix,
        disableDashboardPrefix: disablePrefix,
      });
    }

    // Separate Publish Topic field if specified and different from primary
    if (pubTopic && pubTopic !== subTopic) {
      const effectivePub = (!disablePrefix && dashPrefix) ? `${dashPrefix}${pubTopic}` : pubTopic;

      rawOccurrences.push({
        panelId: panel.panelId,
        panelName: panel.panelName || 'Unnamed Widget',
        panelType: panel.type,
        dashboardId: panel.dashboardId,
        dashboardName: dashName,
        field: 'publishTopic',
        direction: 'publish',
        rawTopic: pubTopic,
        effectiveTopic: effectivePub,
        dashboardPrefix: dashPrefix,
        disableDashboardPrefix: disablePrefix,
      });
    }

    // Separate Dedicated Trip Topic field if specified
    const tripTopic = panel.tripTopic?.trim() || '';
    if (tripTopic && tripTopic !== subTopic && tripTopic !== pubTopic) {
      const effectiveTrip = (!disablePrefix && dashPrefix) ? `${dashPrefix}${tripTopic}` : tripTopic;

      rawOccurrences.push({
        panelId: panel.panelId,
        panelName: panel.panelName || 'Unnamed Widget',
        panelType: panel.type,
        dashboardId: panel.dashboardId,
        dashboardName: dashName,
        field: 'tripTopic' as any,
        direction: 'subscribe',
        rawTopic: tripTopic,
        effectiveTopic: effectiveTrip,
        dashboardPrefix: dashPrefix,
        disableDashboardPrefix: disablePrefix,
      });
    }
  });

  // 3. Group by Unique Raw Topic
  const registryMap = new Map<string, TopicRegistryEntry>();

  rawOccurrences.forEach(occ => {
    const topicKey = occ.rawTopic;
    if (!registryMap.has(topicKey)) {
      registryMap.set(topicKey, {
        topic: topicKey,
        usageCount: 0,
        direction: occ.direction,
        occurrences: [],
        widgetsCount: 0,
        dashboardsCount: 0,
        isPrefix: occ.field === 'prefixTopic',
      });
    }

    const entry = registryMap.get(topicKey)!;
    entry.occurrences.push(occ);
    entry.usageCount = entry.occurrences.length;

    // Recalculate unique widgets & dashboards
    const uniquePanelIds = new Set(entry.occurrences.map(o => o.panelId).filter(Boolean));
    const uniqueDashIds = new Set(entry.occurrences.map(o => o.dashboardId));
    entry.widgetsCount = uniquePanelIds.size;
    entry.dashboardsCount = uniqueDashIds.size;

    // Combine directions
    const hasPub = entry.occurrences.some(o => o.direction === 'publish' || o.direction === 'both');
    const hasSub = entry.occurrences.some(o => o.direction === 'subscribe' || o.direction === 'both');

    if (hasPub && hasSub) {
      entry.direction = 'both';
    } else if (hasPub) {
      entry.direction = 'publish';
    } else {
      entry.direction = 'subscribe';
    }
  });

  const topicsList = Array.from(registryMap.values()).sort((a, b) => b.usageCount - a.usageCount);

  let publishCount = 0;
  let subscribeCount = 0;
  let bothCount = 0;

  topicsList.forEach(t => {
    if (t.direction === 'both') bothCount++;
    else if (t.direction === 'publish') publishCount++;
    else if (t.direction === 'subscribe') subscribeCount++;
  });

  // 4. Validation & Conflicts
  const warnings: { topic: string; warning: string; level: 'warn' | 'error' }[] = [];

  topicsList.forEach(t => {
    // Check for wildcards in publish topics
    if ((t.direction === 'publish' || t.direction === 'both') && (t.topic.includes('+') || t.topic.includes('#'))) {
      warnings.push({
        topic: t.topic,
        warning: `Topic contains MQTT wildcards (+ or #) but is used for publishing in ${t.widgetsCount} widget(s). MQTT brokers do not allow publishing to wildcard topics.`,
        level: 'error',
      });
    }

    // Check for topic with leading or trailing slashes
    if (t.topic.startsWith('/') || t.topic.endsWith('/')) {
      warnings.push({
        topic: t.topic,
        warning: `Topic has leading/trailing slashes ('${t.topic}'). This can lead to empty topic levels in MQTT brokers.`,
        level: 'warn',
      });
    }

    // Check for duplicate slashes
    if (t.topic.includes('//')) {
      warnings.push({
        topic: t.topic,
        warning: `Topic contains double slashes ('//'). Verify topic hierarchy.`,
        level: 'warn',
      });
    }
  });

  return {
    totalWidgets,
    totalTopicReferences: rawOccurrences.length,
    totalUniqueTopics: topicsList.length,
    publishCount,
    subscribeCount,
    bothCount,
    topics: topicsList,
    dashboardPrefixes,
    conflictingOrWarningTopics: warnings,
  };
}

/**
  Validates an MQTT topic string syntax.
 */
export function validateMqttTopic(topic: string, isPublish: boolean = false): { valid: boolean; error?: string } {
  if (!topic || !topic.trim()) {
    return { valid: false, error: 'Topic cannot be empty.' };
  }

  const trimmed = topic.trim();

  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'Topic cannot contain spaces.' };
  }

  if (isPublish && (trimmed.includes('+') || trimmed.includes('#'))) {
    return { valid: false, error: 'Publish topics cannot contain wildcards (+ or #).' };
  }

  return { valid: true };
}

export interface AffectedWidgetPreview {
  panelId?: string;
  panelName: string;
  panelType: string;
  dashboardName: string;
  field: 'topic' | 'publishTopic' | 'prefixTopic';
  oldTopic: string;
  newTopic: string;
}

/**
  Previews affected widgets for a single topic rename.
 */
export function previewTopicRename(
  appState: AppState,
  oldTopic: string,
  newTopic: string
): AffectedWidgetPreview[] {
  const summary = scanAppTopics(appState);
  const targetEntry = summary.topics.find(t => t.topic === oldTopic);
  if (!targetEntry) return [];

  return targetEntry.occurrences.map(occ => ({
    panelId: occ.panelId,
    panelName: occ.panelName || (occ.field === 'prefixTopic' ? 'Dashboard Prefix' : 'Widget'),
    panelType: occ.panelType || 'Dashboard Setting',
    dashboardName: occ.dashboardName,
    field: occ.field,
    oldTopic,
    newTopic,
  }));
}

/**
  Renames a specific raw topic across all panels and dashboards in AppState.
 */
export function executeTopicRename(
  appState: AppState,
  oldTopic: string,
  newTopic: string
): { newState: AppState; affectedWidgetsCount: number } {
  if (!oldTopic || !newTopic || oldTopic === newTopic) {
    return { newState: appState, affectedWidgetsCount: 0 };
  }

  const cleanOld = oldTopic.trim();
  const cleanNew = newTopic.trim();
  let affectedCount = 0;

  // Update panels
  const updatedPanels = (appState.panels || []).map(panel => {
    let changed = false;
    let updatedTopic = panel.topic;
    let updatedPublishTopic = panel.publishTopic;

    if (panel.topic === cleanOld) {
      updatedTopic = cleanNew;
      changed = true;
    }

    if (panel.publishTopic === cleanOld) {
      updatedPublishTopic = cleanNew;
      changed = true;
    }

    if (changed) {
      affectedCount++;
      return {
        ...panel,
        topic: updatedTopic,
        publishTopic: updatedPublishTopic,
      };
    }
    return panel;
  });

  // Update dashboards prefix if matching
  const updatedDashboards = (appState.dashboards || []).map(dash => {
    if (dash.prefixTopic === cleanOld) {
      return { ...dash, prefixTopic: cleanNew };
    }
    return dash;
  });

  return {
    newState: {
      ...appState,
      panels: updatedPanels,
      dashboards: updatedDashboards,
    },
    affectedWidgetsCount: affectedCount,
  };
}

/**
  Finds and replaces string occurrences in topics across all panels and dashboard prefixes.
  Ideal for swapping base prefixes like `/factory/line1` -> `/factory/line2` or `/clientA/` -> `/clientB/`.
 */
export function previewBulkFindReplace(
  appState: AppState,
  findStr: string,
  replaceStr: string
): AffectedWidgetPreview[] {
  if (!findStr) return [];

  const previews: AffectedWidgetPreview[] = [];
  const summary = scanAppTopics(appState);

  summary.topics.forEach(entry => {
    if (entry.topic.includes(findStr)) {
      const newTopic = entry.topic.replaceAll(findStr, replaceStr);
      entry.occurrences.forEach(occ => {
        previews.push({
          panelId: occ.panelId,
          panelName: occ.panelName || 'Dashboard Prefix',
          panelType: occ.panelType || 'Setting',
          dashboardName: occ.dashboardName,
          field: occ.field,
          oldTopic: entry.topic,
          newTopic,
        });
      });
    }
  });

  return previews;
}

/**
  Executes bulk Find & Replace across all panel topics, publish topics, and dashboard prefixes.
 */
export function executeBulkFindReplace(
  appState: AppState,
  findStr: string,
  replaceStr: string
): { newState: AppState; affectedWidgetsCount: number } {
  if (!findStr) return { newState: appState, affectedWidgetsCount: 0 };

  let affectedCount = 0;

  const updatedPanels = (appState.panels || []).map(panel => {
    let changed = false;
    let newSub = panel.topic;
    let newPub = panel.publishTopic;

    if (panel.topic && panel.topic.includes(findStr)) {
      newSub = panel.topic.replaceAll(findStr, replaceStr);
      changed = true;
    }

    if (panel.publishTopic && panel.publishTopic.includes(findStr)) {
      newPub = panel.publishTopic.replaceAll(findStr, replaceStr);
      changed = true;
    }

    if (changed) {
      affectedCount++;
      return {
        ...panel,
        topic: newSub,
        publishTopic: newPub,
      };
    }
    return panel;
  });

  const updatedDashboards = (appState.dashboards || []).map(dash => {
    if (dash.prefixTopic && dash.prefixTopic.includes(findStr)) {
      return {
        ...dash,
        prefixTopic: dash.prefixTopic.replaceAll(findStr, replaceStr),
      };
    }
    return dash;
  });

  return {
    newState: {
      ...appState,
      panels: updatedPanels,
      dashboards: updatedDashboards,
    },
    affectedWidgetsCount: affectedCount,
  };
}
