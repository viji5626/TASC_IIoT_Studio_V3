import { Dashboard, Panel, PanelType } from '../types';

export function getSampleProject(connectionId: string): {
  dashboards: Dashboard[];
  panels: Panel[];
} {
  const ts = Date.now();

  const dashWaterId = `dash_water_${ts}`;
  const dashAirId = `dash_air_${ts}`;

  const dashboards: Dashboard[] = [
    {
      dashboardId: dashWaterId,
      dashboardName: 'Water System',
      connectionId,
      isHome: true,
      icon: 'fa-droplet',
      themeColor: '#0284c7',
      canvasBgColor: '#0b1329'
    },
    {
      dashboardId: dashAirId,
      dashboardName: 'Air Monitoring',
      connectionId,
      isHome: false,
      icon: 'fa-wind',
      themeColor: '#10b981',
      canvasBgColor: '#0b1329'
    }
  ];

  const panels: Panel[] = [
    // ==========================================
    // SCREEN 1: WATER SYSTEM (4 WIDGETS)
    // ==========================================
    {
      panelId: `p_w_title_${ts}`,
      dashboardId: dashWaterId,
      connectionId,
      panelName: 'Header Banner',
      type: PanelType.STATIC_TEXT,
      topic: 'water/title',
      staticText: 'WATER MANAGEMENT SYSTEM',
      fontSize: '22',
      textColor: '#38bdf8',
      bgColor: '#030d22',
      borderColor: '#0284c7',
      borderWidth: 2,
      borderRadius: 12,
      textAlign: 'center',
      x: 20, y: 20, w: 1160, h: 55
    },
    {
      panelId: `p_w_flow_${ts}`,
      dashboardId: dashWaterId,
      connectionId,
      panelName: 'WATER FLOW RATE',
      type: PanelType.GAUGE,
      topic: 'water/flow_rate',
      unit: 'L/min',
      payloadMin: 0,
      payloadMax: 100,
      firstColor: '#0284c7',
      secondColor: '#06b6d4',
      thirdColor: '#10b981',
      decimalPrecision: 1,
      x: 20, y: 95, w: 370, h: 230
    },
    {
      panelId: `p_w_level_${ts}`,
      dashboardId: dashWaterId,
      connectionId,
      panelName: 'STORAGE TANK LEVEL',
      type: PanelType.GAUGE,
      topic: 'water/tank_level',
      unit: '%',
      payloadMin: 0,
      payloadMax: 100,
      firstColor: '#10b981',
      secondColor: '#f59e0b',
      thirdColor: '#ef4444',
      decimalPrecision: 1,
      x: 415, y: 95, w: 370, h: 230
    },
    {
      panelId: `p_w_pump_${ts}`,
      dashboardId: dashWaterId,
      connectionId,
      panelName: 'PUMP-01 POWER CONTROL',
      type: PanelType.SWITCH,
      topic: 'water/pump_control',
      publishTopic: 'water/pump_control',
      payloadOn: 'ON',
      payloadOff: 'OFF',
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      x: 810, y: 95, w: 370, h: 230
    },

    // ==========================================
    // SCREEN 2: AIR MONITORING (4 WIDGETS)
    // ==========================================
    {
      panelId: `p_a_title_${ts}`,
      dashboardId: dashAirId,
      connectionId,
      panelName: 'Header Banner',
      type: PanelType.STATIC_TEXT,
      topic: 'air/title',
      staticText: 'AIR QUALITY MONITORING',
      fontSize: '22',
      textColor: '#4ade80',
      bgColor: '#030d22',
      borderColor: '#10b981',
      borderWidth: 2,
      borderRadius: 12,
      textAlign: 'center',
      x: 20, y: 20, w: 1160, h: 55
    },
    {
      panelId: `p_a_temp_${ts}`,
      dashboardId: dashAirId,
      connectionId,
      panelName: 'AMBIENT TEMPERATURE',
      type: PanelType.GAUGE,
      topic: 'air/temperature',
      unit: '°C',
      payloadMin: 0,
      payloadMax: 50,
      firstColor: '#10b981',
      secondColor: '#f59e0b',
      thirdColor: '#ef4444',
      decimalPrecision: 1,
      x: 20, y: 95, w: 370, h: 230
    },
    {
      panelId: `p_a_hum_${ts}`,
      dashboardId: dashAirId,
      connectionId,
      panelName: 'RELATIVE HUMIDITY',
      type: PanelType.GAUGE,
      topic: 'air/humidity',
      unit: '%',
      payloadMin: 0,
      payloadMax: 100,
      firstColor: '#0284c7',
      secondColor: '#06b6d4',
      thirdColor: '#10b981',
      decimalPrecision: 1,
      x: 415, y: 95, w: 370, h: 230
    },
    {
      panelId: `p_a_fan_${ts}`,
      dashboardId: dashAirId,
      connectionId,
      panelName: 'EXHAUST FAN CONTROL',
      type: PanelType.SWITCH,
      topic: 'air/fan_control',
      publishTopic: 'air/fan_control',
      payloadOn: 'ON',
      payloadOff: 'OFF',
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      x: 810, y: 95, w: 370, h: 230
    }
  ];

  return { dashboards, panels };
}
