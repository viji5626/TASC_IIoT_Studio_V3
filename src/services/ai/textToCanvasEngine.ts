import { Panel, PanelType } from '../../types';
import { resolveRelativeSmartTag, SmartRootSourceType } from '../../utils/smartObjectResolver';

export interface CanvasGenerationResult {
  title: string;
  theme: 'dark_industrial' | 'scada_slate' | 'cyber_clean';
  panels: Partial<Panel>[];
  connectionsSummary: string;
  tagsSummary: string[];
  smartObjectId?: string;
  rootSourceType?: SmartRootSourceType;
  rootPath?: string;
}

export interface CanvasGenerationRequest {
  prompt: string;
  dashboardId?: string;
  connectionId?: string;
  startX?: number;
  startY?: number;
  rootSourceType?: SmartRootSourceType;
  rootPath?: string;
}

/**
 * Parses natural language HMI requests and computes non-overlapping
 * coordinates, symbols, colors, thresholds, and parameterized relative bindings.
 */
export function generateCanvasFromPrompt(request: CanvasGenerationRequest): CanvasGenerationResult {
  const {
    prompt,
    dashboardId = 'active_screen',
    connectionId = 'local_driver',
    startX = 60,
    startY = 80,
    rootSourceType = 'driver_tag',
    rootPath = 'Motor_01_'
  } = request;

  const lower = prompt.toLowerCase();
  const panels: Partial<Panel>[] = [];
  const tags: string[] = [];

  const timestamp = Date.now();
  const smartObjectId = `smart_obj_${timestamp}`;
  let curX = startX;
  let curY = startY;

  // 1. Motor / VFD Pump Faceplate
  if (lower.includes('motor') || lower.includes('pump') || lower.includes('faceplate') || lower.includes('vfd')) {
    const motorName = rootPath.replace(/[_/]+$/, '') || 'Motor_01';

    // Container Background / Header (Smart Object Master Frame)
    panels.push({
      panelId: `${smartObjectId}_frame`,
      smartObjectId,
      isSmartObjectRoot: true,
      rootTagSource: rootSourceType,
      rootTagPath: rootPath,
      dashboardId,
      connectionId,
      panelName: `${motorName} Faceplate Frame`,
      type: PanelType.STATIC_TEXT,
      x: curX,
      y: curY,
      w: 420,
      h: 260,
      firstColor: '#1e293b',
      secondColor: '#0f172a'
    });

    // Start Button (Momentary / Switch)
    const startRel = 'Start';
    const startTag = resolveRelativeSmartTag(rootSourceType, rootPath, startRel);
    tags.push(startTag);
    panels.push({
      panelId: `${smartObjectId}_start`,
      smartObjectId,
      rootTagSource: rootSourceType,
      rootTagPath: rootPath,
      relativeTagBinding: startRel,
      dashboardId,
      connectionId,
      panelName: 'Start Command',
      type: PanelType.BUTTON,
      topic: startTag,
      x: curX + 15,
      y: curY + 45,
      w: 90,
      h: 60,
      firstColor: '#10b981',
      payloadOn: '1',
      payloadOff: '0'
    });

    // Stop Button
    const stopRel = 'Stop';
    const stopTag = resolveRelativeSmartTag(rootSourceType, rootPath, stopRel);
    tags.push(stopTag);
    panels.push({
      panelId: `${smartObjectId}_stop`,
      smartObjectId,
      rootTagSource: rootSourceType,
      rootTagPath: rootPath,
      relativeTagBinding: stopRel,
      dashboardId,
      connectionId,
      panelName: 'Stop Command',
      type: PanelType.BUTTON,
      topic: stopTag,
      x: curX + 115,
      y: curY + 45,
      w: 90,
      h: 60,
      firstColor: '#ef4444',
      payloadOn: '1',
      payloadOff: '0'
    });

    // Run Status Indicator Lamp
    const statusRel = 'Run_Status';
    const statusTag = resolveRelativeSmartTag(rootSourceType, rootPath, statusRel);
    tags.push(statusTag);
    panels.push({
      panelId: `${smartObjectId}_status`,
      smartObjectId,
      rootTagSource: rootSourceType,
      rootTagPath: rootPath,
      relativeTagBinding: statusRel,
      dashboardId,
      connectionId,
      panelName: 'Running State',
      type: PanelType.NODE_STATUS,
      topic: statusTag,
      x: curX + 215,
      y: curY + 45,
      w: 90,
      h: 60,
      firstColor: '#10b981',
      secondColor: '#64748b'
    });

    // Trip / Fault Indicator Lamp
    const faultRel = 'Trip_Fault';
    const faultTag = resolveRelativeSmartTag(rootSourceType, rootPath, faultRel);
    tags.push(faultTag);
    panels.push({
      panelId: `${smartObjectId}_trip`,
      smartObjectId,
      rootTagSource: rootSourceType,
      rootTagPath: rootPath,
      relativeTagBinding: faultRel,
      dashboardId,
      connectionId,
      panelName: 'Fault / Trip',
      type: PanelType.NODE_STATUS,
      topic: faultTag,
      x: curX + 315,
      y: curY + 45,
      w: 90,
      h: 60,
      firstColor: '#ef4444',
      secondColor: '#64748b'
    });

    // Speed Reference Input (Setpoint Slider / Stepper)
    const speedSpRel = 'Speed_SP';
    const speedSpTag = resolveRelativeSmartTag(rootSourceType, rootPath, speedSpRel);
    tags.push(speedSpTag);
    panels.push({
      panelId: `${smartObjectId}_speed_sp`,
      smartObjectId,
      rootTagSource: rootSourceType,
      rootTagPath: rootPath,
      relativeTagBinding: speedSpRel,
      dashboardId,
      connectionId,
      panelName: 'Speed Setpoint',
      type: PanelType.SLIDER,
      topic: speedSpTag,
      unit: 'RPM',
      payloadMin: 0,
      payloadMax: 1500,
      x: curX + 15,
      y: curY + 120,
      w: 190,
      h: 120,
      firstColor: '#38bdf8'
    });

    // Speed Feedback (Actual PV Gauge)
    const speedPvRel = 'Speed_PV';
    const speedPvTag = resolveRelativeSmartTag(rootSourceType, rootPath, speedPvRel);
    tags.push(speedPvTag);
    panels.push({
      panelId: `${smartObjectId}_speed_pv`,
      smartObjectId,
      rootTagSource: rootSourceType,
      rootTagPath: rootPath,
      relativeTagBinding: speedPvRel,
      dashboardId,
      connectionId,
      panelName: 'Speed Feedback',
      type: PanelType.GAUGE,
      topic: speedPvTag,
      unit: 'RPM',
      payloadMin: 0,
      payloadMax: 1500,
      x: curX + 215,
      y: curY + 120,
      w: 190,
      h: 120,
      firstColor: '#0284c7',
      secondColor: '#10b981'
    });

    return {
      title: `${motorName} Smart VFD Faceplate`,
      theme: 'dark_industrial',
      panels,
      connectionsSummary: `Parameterized across 6 relative tags under root: "${rootPath}"`,
      tagsSummary: tags,
      smartObjectId,
      rootSourceType,
      rootPath
    };
  }

  // 2. Default Multi-Widget Fallback (e.g. Chiller / Plant layout)
  const defaultPrefix = rootPath.replace(/[_/]+$/, '') || 'Equipment_01';
  
  // Power / Run Switch
  const runRel = 'Run_Cmd';
  const runTag = resolveRelativeSmartTag(rootSourceType, rootPath, runRel);
  panels.push({
    panelId: `${smartObjectId}_run`,
    smartObjectId,
    rootTagSource: rootSourceType,
    rootTagPath: rootPath,
    relativeTagBinding: runRel,
    dashboardId,
    connectionId,
    panelName: `${defaultPrefix} Run/Stop`,
    type: PanelType.SWITCH,
    topic: runTag,
    x: curX,
    y: curY,
    w: 160,
    h: 120,
    firstColor: '#10b981'
  });

  // Flow / Speed Gauge
  const flowRel = 'Flow_Rate';
  const flowTag = resolveRelativeSmartTag(rootSourceType, rootPath, flowRel);
  panels.push({
    panelId: `${smartObjectId}_flow`,
    smartObjectId,
    rootTagSource: rootSourceType,
    rootTagPath: rootPath,
    relativeTagBinding: flowRel,
    dashboardId,
    connectionId,
    panelName: `${defaultPrefix} Flow Rate`,
    type: PanelType.GAUGE,
    topic: flowTag,
    unit: 'm³/h',
    payloadMin: 0,
    payloadMax: 500,
    x: curX + 175,
    y: curY,
    w: 160,
    h: 120,
    firstColor: '#38bdf8'
  });

  // Telemetry Sparkline
  panels.push({
    panelId: `${smartObjectId}_trend`,
    smartObjectId,
    rootTagSource: rootSourceType,
    rootTagPath: rootPath,
    relativeTagBinding: flowRel,
    dashboardId,
    connectionId,
    panelName: `${defaultPrefix} Trend`,
    type: PanelType.LINE_GRAPH,
    topic: flowTag,
    x: curX + 350,
    y: curY,
    w: 220,
    h: 120,
    firstColor: '#0ea5e9'
  });

  return {
    title: `${defaultPrefix} Smart Instrumentation`,
    theme: 'dark_industrial',
    panels,
    connectionsSummary: `Configured 3 industrial controls under root: "${rootPath}"`,
    tagsSummary: [runTag, flowTag],
    smartObjectId,
    rootSourceType,
    rootPath
  };
}
