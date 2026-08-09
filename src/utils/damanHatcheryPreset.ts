import { Dashboard, Panel, PanelType } from '../types';

export function getDamanHatcheryProject(connectionId: string): {
  dashboards: Dashboard[];
  panels: Panel[];
} {
  const ts = Date.now();

  const dashHomeId = `dash_daman_home_${ts}`;
  const dashMenuId = `dash_daman_menu_${ts}`;
  const dashFanTimerId = `dash_daman_fan_timer_${ts}`;
  const dashHumidityId = `dash_daman_humidity_${ts}`;
  const dashFanSetpointId = `dash_daman_fan_setpoint_${ts}`;
  const dashVfdId = `dash_daman_vfd_${ts}`;
  const dashLightingId = `dash_daman_lighting_${ts}`;
  const dashSensorCalId = `dash_daman_sensor_cal_${ts}`;
  const dashAlarmSettingId = `dash_daman_alarm_setting_${ts}`;

  const dashboards: Dashboard[] = [
    {
      dashboardId: dashHomeId,
      dashboardName: 'Daman Hatchery (Home)',
      connectionId,
      isHome: true,
      icon: 'fa-house',
      themeColor: '#0284c7',
      canvasBgColor: '#0b1329'
    },
    {
      dashboardId: dashMenuId,
      dashboardName: 'Main Menu',
      connectionId,
      isHome: false,
      icon: 'fa-bars',
      themeColor: '#38bdf8',
      canvasBgColor: '#0b1329'
    },
    {
      dashboardId: dashFanTimerId,
      dashboardName: 'Fan Timer',
      connectionId,
      isHome: false,
      icon: 'fa-fan',
      themeColor: '#10b981',
      canvasBgColor: '#0b1329'
    },
    {
      dashboardId: dashHumidityId,
      dashboardName: 'Humidity & Pump-01',
      connectionId,
      isHome: false,
      icon: 'fa-droplet',
      themeColor: '#06b6d4',
      canvasBgColor: '#0b1329'
    },
    {
      dashboardId: dashFanSetpointId,
      dashboardName: 'Fan Setpoints',
      connectionId,
      isHome: false,
      icon: 'fa-temperature-high',
      themeColor: '#f59e0b',
      canvasBgColor: '#0b1329'
    },
    {
      dashboardId: dashVfdId,
      dashboardName: 'VFD Control',
      connectionId,
      isHome: false,
      icon: 'fa-gears',
      themeColor: '#8b5cf6',
      canvasBgColor: '#0b1329'
    },
    {
      dashboardId: dashLightingId,
      dashboardName: 'Inner Lighting',
      connectionId,
      isHome: false,
      icon: 'fa-lightbulb',
      themeColor: '#eab308',
      canvasBgColor: '#0b1329'
    },
    {
      dashboardId: dashSensorCalId,
      dashboardName: 'Sensor Calibration',
      connectionId,
      isHome: false,
      icon: 'fa-sliders',
      themeColor: '#ec4899',
      canvasBgColor: '#0b1329'
    },
    {
      dashboardId: dashAlarmSettingId,
      dashboardName: 'Alarm Setting & Live Alarms',
      connectionId,
      isHome: false,
      icon: 'fa-triangle-exclamation',
      themeColor: '#ef4444',
      canvasBgColor: '#0b1329'
    }
  ];

  const panels: Panel[] = [];

  // ==========================================
  // SCREEN 1: HOME DASHBOARD (dashHomeId)
  // Widescreen canvas dimensions: 1200px x 560px
  // ==========================================
  panels.push(
    {
      panelId: `p_dh_title_${ts}`,
      dashboardId: dashHomeId,
      connectionId,
      panelName: 'Header Banner',
      type: PanelType.STATIC_TEXT,
      topic: 'daman/title',
      staticText: 'DAMAN HATCHERY',
      fontSize: '24',
      textColor: '#00f2fe',
      bgColor: '#030d22',
      borderColor: '#0284c7',
      borderWidth: 2,
      borderRadius: 12,
      textAlign: 'center',
      x: 20, y: 15, w: 1160, h: 55
    },
    {
      panelId: `p_dh_gauge_temp_${ts}`,
      dashboardId: dashHomeId,
      connectionId,
      panelName: 'AVERAGE ROOM TEMPERATURE (°C)',
      type: PanelType.GAUGE,
      topic: 'daman/room/temp',
      unit: '°C',
      payloadMin: 0,
      payloadMax: 100,
      firstColor: '#10b981',
      secondColor: '#f59e0b',
      thirdColor: '#ef4444',
      decimalPrecision: 1,
      x: 20, y: 85, w: 380, h: 220
    },
    {
      panelId: `p_dh_gauge_hum_${ts}`,
      dashboardId: dashHomeId,
      connectionId,
      panelName: 'ACTUAL ROOM HUMIDITY (%)',
      type: PanelType.GAUGE,
      topic: 'daman/room/humidity',
      unit: '%',
      payloadMin: 0,
      payloadMax: 100,
      firstColor: '#0284c7',
      secondColor: '#06b6d4',
      thirdColor: '#10b981',
      decimalPrecision: 1,
      x: 800, y: 85, w: 380, h: 220
    },
    {
      panelId: `p_dh_s1_${ts}`,
      dashboardId: dashHomeId,
      connectionId,
      panelName: 'SENSOR 01',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/sensor1',
      unit: '°C',
      decimalPrecision: 1,
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '18',
      x: 420, y: 100, w: 170, h: 80
    },
    {
      panelId: `p_dh_s2_${ts}`,
      dashboardId: dashHomeId,
      connectionId,
      panelName: 'SENSOR 02',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/sensor2',
      unit: '°C',
      decimalPrecision: 1,
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '18',
      x: 610, y: 100, w: 170, h: 80
    },
    {
      panelId: `p_dh_menu_btn_${ts}`,
      dashboardId: dashHomeId,
      connectionId,
      panelName: 'MAIN MENU',
      type: PanelType.SCREEN_JUMP,
      targetScreenId: dashMenuId,
      topic: 'daman/nav/menu',
      bgColor: '#0284c7',
      textColor: '#ffffff',
      borderColor: '#38bdf8',
      fontSize: '18',
      x: 420, y: 200, w: 360, h: 65
    },
    {
      panelId: `p_dh_hdr_status_${ts}`,
      dashboardId: dashHomeId,
      connectionId,
      panelName: 'Section Header',
      type: PanelType.STATIC_TEXT,
      topic: 'daman/hdr/status',
      staticText: 'OUTPUT STATUS (INDICATOR LAMPS)',
      fontSize: '16',
      textColor: '#f59e0b',
      bgColor: '#0b1329',
      borderColor: '#334155',
      borderWidth: 1,
      borderRadius: 8,
      textAlign: 'center',
      x: 20, y: 325, w: 1160, h: 40
    }
  );

  // Indicators Row 1 & 2 across 1160px width
  const indicators1 = ['FAN-1', 'FAN-2', 'FAN-3', 'FAN-4', 'FAN-5', 'FAN-6', 'FAN-7', 'FAN-8'];
  indicators1.forEach((name, idx) => {
    panels.push({
      panelId: `p_dh_ind_${idx}_${ts}`,
      dashboardId: dashHomeId,
      connectionId,
      panelName: name,
      type: PanelType.LED,
      topic: `daman/status/${name.toLowerCase()}`,
      payloadOn: '1',
      payloadOff: '0',
      iconOn: 'fa-fan',
      iconOff: 'fa-fan',
      iconColorOn: '#10b981',
      iconColorOff: '#475569',
      rotateOn: true,
      x: 20 + idx * 145,
      y: 380,
      w: 135,
      h: 68
    });
  });

  const indicators2 = [
    { name: 'FAN-9', icon: 'fa-fan', rotate: true },
    { name: 'FAN-10', icon: 'fa-fan', rotate: true },
    { name: 'FAN-11', icon: 'fa-fan', rotate: true },
    { name: 'PUMP-1', icon: 'fa-faucet-drip', rotate: false },
    { name: 'LIGHT IN', icon: 'fa-lightbulb', rotate: false },
    { name: 'HOOTER', icon: 'fa-bullhorn', rotate: false }
  ];
  indicators2.forEach((item, idx) => {
    panels.push({
      panelId: `p_dh_ind2_${idx}_${ts}`,
      dashboardId: dashHomeId,
      connectionId,
      panelName: item.name,
      type: PanelType.LED,
      topic: `daman/status/${item.name.toLowerCase().replace(' ', '_')}`,
      payloadOn: '1',
      payloadOff: '0',
      iconOn: item.icon,
      iconOff: item.icon,
      iconColorOn: '#06b6d4',
      iconColorOff: '#475569',
      rotateOn: item.rotate,
      x: 20 + idx * 195,
      y: 460,
      w: 180,
      h: 68
    });
  });

  // ==========================================
  // SCREEN 2: MAIN MENU (dashMenuId)
  // ==========================================
  panels.push(
    {
      panelId: `p_dm_title_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'Header Banner',
      type: PanelType.STATIC_TEXT,
      topic: 'daman/menu/title',
      staticText: 'DAMAN HATCHERY - MAIN NAVIGATION MENU',
      fontSize: '22',
      textColor: '#38bdf8',
      bgColor: '#030d22',
      borderColor: '#0284c7',
      borderWidth: 2,
      borderRadius: 12,
      textAlign: 'center',
      x: 20, y: 15, w: 1160, h: 55
    },
    {
      panelId: `p_dm_hum_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'HUMIDITY',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/room/humidity',
      unit: '%',
      decimalPrecision: 1,
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '18',
      x: 20, y: 85, w: 340, h: 70
    },
    {
      panelId: `p_dm_temp_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'AVERAGE TEMPERATURE',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/room/temp',
      unit: '°C',
      decimalPrecision: 1,
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '18',
      x: 840, y: 85, w: 340, h: 70
    },
    // Menu Navigation Buttons (2 rows x 4 buttons)
    {
      panelId: `p_dm_btn_fantimer_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'FAN TIMER',
      type: PanelType.SCREEN_JUMP,
      targetScreenId: dashFanTimerId,
      topic: 'daman/nav/fantimer',
      bgColor: '#0f172a',
      textColor: '#38bdf8',
      borderColor: '#0284c7',
      fontSize: '16',
      x: 60, y: 180, w: 240, h: 65
    },
    {
      panelId: `p_dm_btn_humidity_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'HUMIDITY',
      type: PanelType.SCREEN_JUMP,
      targetScreenId: dashHumidityId,
      topic: 'daman/nav/humidity',
      bgColor: '#0f172a',
      textColor: '#38bdf8',
      borderColor: '#0284c7',
      fontSize: '16',
      x: 340, y: 180, w: 240, h: 65
    },
    {
      panelId: `p_dm_btn_alarm_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'ALARM SETTING',
      type: PanelType.SCREEN_JUMP,
      targetScreenId: dashAlarmSettingId,
      topic: 'daman/nav/alarm',
      bgColor: '#0f172a',
      textColor: '#f87171',
      borderColor: '#ef4444',
      fontSize: '16',
      x: 620, y: 180, w: 240, h: 65
    },
    {
      panelId: `p_dm_btn_sp_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'FAN SETPOINT',
      type: PanelType.SCREEN_JUMP,
      targetScreenId: dashFanSetpointId,
      topic: 'daman/nav/fansp',
      bgColor: '#0f172a',
      textColor: '#f59e0b',
      borderColor: '#d97706',
      fontSize: '16',
      x: 900, y: 180, w: 240, h: 65
    },
    {
      panelId: `p_dm_btn_vfd_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'VFD CONTROL',
      type: PanelType.SCREEN_JUMP,
      targetScreenId: dashVfdId,
      topic: 'daman/nav/vfd',
      bgColor: '#0f172a',
      textColor: '#c084fc',
      borderColor: '#9333ea',
      fontSize: '16',
      x: 60, y: 270, w: 240, h: 65
    },
    {
      panelId: `p_dm_btn_light_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'LIGHTING',
      type: PanelType.SCREEN_JUMP,
      targetScreenId: dashLightingId,
      topic: 'daman/nav/lighting',
      bgColor: '#0f172a',
      textColor: '#facc15',
      borderColor: '#ca8a04',
      fontSize: '16',
      x: 340, y: 270, w: 240, h: 65
    },
    {
      panelId: `p_dm_btn_cal_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'SENSOR CALIBRATION',
      type: PanelType.SCREEN_JUMP,
      targetScreenId: dashSensorCalId,
      topic: 'daman/nav/cal',
      bgColor: '#0f172a',
      textColor: '#f472b6',
      borderColor: '#db2777',
      fontSize: '16',
      x: 620, y: 270, w: 240, h: 65
    },
    {
      panelId: `p_dm_btn_home_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'HOME',
      type: PanelType.SCREEN_JUMP,
      targetScreenId: dashHomeId,
      topic: 'daman/nav/home',
      bgColor: '#0284c7',
      textColor: '#ffffff',
      borderColor: '#38bdf8',
      fontSize: '16',
      x: 900, y: 270, w: 240, h: 65
    },
    // Bottom Sensor Display
    {
      panelId: `p_dm_s1_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'SENSOR #1',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/sensor1',
      unit: '°C',
      decimalPrecision: 1,
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '18',
      x: 340, y: 370, w: 240, h: 70
    },
    {
      panelId: `p_dm_s2_${ts}`,
      dashboardId: dashMenuId,
      connectionId,
      panelName: 'SENSOR #2',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/sensor2',
      unit: '°C',
      decimalPrecision: 1,
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '18',
      x: 620, y: 370, w: 240, h: 70
    }
  );

  // Helper for Top Navigation Header on Sub-screens
  const addSubscreenHeader = (dashId: string, title: string) => {
    panels.push(
      {
        panelId: `p_sub_hdr_${dashId}_${ts}`,
        dashboardId: dashId,
        connectionId,
        panelName: 'Header Banner',
        type: PanelType.STATIC_TEXT,
        topic: 'daman/sub/title',
        staticText: title,
        fontSize: '20',
        textColor: '#38bdf8',
        bgColor: '#030d22',
        borderColor: '#0284c7',
        borderWidth: 2,
        borderRadius: 10,
        textAlign: 'center',
        x: 360, y: 15, w: 460, h: 50
      },
      {
        panelId: `p_sub_nav_home_${dashId}_${ts}`,
        dashboardId: dashId,
        connectionId,
        panelName: 'HOME',
        type: PanelType.SCREEN_JUMP,
        targetScreenId: dashHomeId,
        topic: 'daman/nav/home',
        bgColor: '#0284c7',
        textColor: '#ffffff',
        borderColor: '#38bdf8',
        fontSize: '15',
        x: 20, y: 15, w: 150, h: 50
      },
      {
        panelId: `p_sub_nav_menu_${dashId}_${ts}`,
        dashboardId: dashId,
        connectionId,
        panelName: 'MENU',
        type: PanelType.SCREEN_JUMP,
        targetScreenId: dashMenuId,
        topic: 'daman/nav/menu',
        bgColor: '#0369a1',
        textColor: '#ffffff',
        borderColor: '#38bdf8',
        fontSize: '15',
        x: 185, y: 15, w: 150, h: 50
      },
      {
        panelId: `p_sub_hum_${dashId}_${ts}`,
        dashboardId: dashId,
        connectionId,
        panelName: 'HUMIDITY',
        type: PanelType.TEXT_OUTPUT,
        topic: 'daman/room/humidity',
        unit: '%',
        decimalPrecision: 1,
        bgColor: '#022c22',
        textColor: '#4ade80',
        borderColor: '#16a34a',
        fontSize: '15',
        x: 840, y: 15, w: 160, h: 50
      },
      {
        panelId: `p_sub_temp_${dashId}_${ts}`,
        dashboardId: dashId,
        connectionId,
        panelName: 'AVG TEMP',
        type: PanelType.TEXT_OUTPUT,
        topic: 'daman/room/temp',
        unit: '°C',
        decimalPrecision: 1,
        bgColor: '#022c22',
        textColor: '#4ade80',
        borderColor: '#16a34a',
        fontSize: '15',
        x: 1015, y: 15, w: 165, h: 50
      }
    );
  };

  // ==========================================
  // SCREEN 3: FAN TIMER (dashFanTimerId)
  // ==========================================
  addSubscreenHeader(dashFanTimerId, 'FAN TIMER CONTROL');
  panels.push(
    {
      panelId: `p_ft_on_12_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'KEEP ON TIME OF 1,2',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/fantimer/on_12',
      unit: 'min',
      payloadMin: 0,
      payloadMax: 999,
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 20, y: 90, w: 360, h: 80
    },
    {
      panelId: `p_ft_off_12_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'KEEP OFF TIME OF 1,2',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/fantimer/off_12',
      unit: 'min',
      payloadMin: 0,
      payloadMax: 999,
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 400, y: 90, w: 360, h: 80
    },
    {
      panelId: `p_ft_status_logic_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'TIMER LOGIC ENABLED',
      type: PanelType.LED,
      topic: 'daman/fantimer/logic_status',
      payloadOn: '1',
      iconOn: 'fa-clock',
      iconColorOn: '#10b981',
      x: 780, y: 90, w: 400, h: 80
    },
    {
      panelId: `p_ft_out1_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'FAN-1 SELECTION ON TIMER',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/fantimer/fan1_sel',
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '15',
      x: 20, y: 190, w: 360, h: 70
    },
    {
      panelId: `p_ft_sw1_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'FAN-1 ENABLE',
      type: PanelType.SWITCH,
      topic: 'daman/fantimer/fan1_enable',
      payloadOn: 'ENABLE',
      payloadOff: 'DISABLE',
      x: 400, y: 190, w: 200, h: 70
    },
    {
      panelId: `p_ft_led1_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'FAN-1 LAMP',
      type: PanelType.LED,
      topic: 'daman/status/fan-1',
      payloadOn: '1',
      iconOn: 'fa-fan',
      iconColorOn: '#10b981',
      rotateOn: true,
      x: 620, y: 190, w: 140, h: 70
    },
    {
      panelId: `p_ft_out2_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'FAN-2 SELECTION ON TIMER',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/fantimer/fan2_sel',
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '15',
      x: 20, y: 280, w: 360, h: 70
    },
    {
      panelId: `p_ft_sw2_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'FAN-2 ENABLE',
      type: PanelType.SWITCH,
      topic: 'daman/fantimer/fan2_enable',
      payloadOn: 'ENABLE',
      payloadOff: 'DISABLE',
      x: 400, y: 280, w: 200, h: 70
    },
    {
      panelId: `p_ft_led2_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'FAN-2 LAMP',
      type: PanelType.LED,
      topic: 'daman/status/fan-2',
      payloadOn: '1',
      iconOn: 'fa-fan',
      iconColorOn: '#10b981',
      rotateOn: true,
      x: 620, y: 280, w: 140, h: 70
    },
    {
      panelId: `p_ft_on_34_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'KEEP ON TIME OF 3,4',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/fantimer/on_34',
      unit: 'min',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 20, y: 370, w: 360, h: 80
    },
    {
      panelId: `p_ft_off_34_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'KEEP OFF TIME OF 3,4',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/fantimer/off_34',
      unit: 'min',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 400, y: 370, w: 360, h: 80
    },
    {
      panelId: `p_ft_sw3_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'FAN-3 ENABLE',
      type: PanelType.SWITCH,
      topic: 'daman/fantimer/fan3_enable',
      payloadOn: 'ENABLE',
      payloadOff: 'DISABLE',
      x: 780, y: 370, w: 190, h: 80
    },
    {
      panelId: `p_ft_sw4_${ts}`,
      dashboardId: dashFanTimerId,
      connectionId,
      panelName: 'FAN-4 ENABLE',
      type: PanelType.SWITCH,
      topic: 'daman/fantimer/fan4_enable',
      payloadOn: 'ENABLE',
      payloadOff: 'DISABLE',
      x: 990, y: 370, w: 190, h: 80
    }
  );

  // ==========================================
  // SCREEN 4: HUMIDITY & PUMP-01 (dashHumidityId)
  // ==========================================
  addSubscreenHeader(dashHumidityId, 'PUMP-01 CONTROL & HUMIDITY');
  panels.push(
    {
      panelId: `p_hum_hdr_${ts}`,
      dashboardId: dashHumidityId,
      connectionId,
      panelName: 'Section Banner',
      type: PanelType.STATIC_TEXT,
      topic: 'daman/pump/hdr',
      staticText: 'PUMP-01 AUTOMATION CONTROLS',
      fontSize: '16',
      textColor: '#06b6d4',
      bgColor: '#0b1329',
      borderColor: '#0891b2',
      borderWidth: 1,
      borderRadius: 8,
      textAlign: 'center',
      x: 20, y: 85, w: 1160, h: 42
    },
    {
      panelId: `p_hum_sp_on_${ts}`,
      dashboardId: dashHumidityId,
      connectionId,
      panelName: 'ON AT HUMIDITY % (SETPOINT)',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/pump/sp_on',
      unit: '%',
      payloadMin: 0,
      payloadMax: 100,
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 20, y: 140, w: 360, h: 80
    },
    {
      panelId: `p_hum_sp_off_${ts}`,
      dashboardId: dashHumidityId,
      connectionId,
      panelName: 'OFF AT HUMIDITY % (SETPOINT)',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/pump/sp_off',
      unit: '%',
      payloadMin: 0,
      payloadMax: 100,
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 20, y: 235, w: 360, h: 80
    },
    {
      panelId: `p_hum_sw_logic_${ts}`,
      dashboardId: dashHumidityId,
      connectionId,
      panelName: 'TIME LOGIC AFTER HIGH HUMIDITY LIMIT',
      type: PanelType.SWITCH,
      topic: 'daman/pump/time_logic',
      payloadOn: 'ENABLED',
      payloadOff: 'DISABLED',
      x: 20, y: 330, w: 360, h: 80
    },
    {
      panelId: `p_hum_led_pump_${ts}`,
      dashboardId: dashHumidityId,
      connectionId,
      panelName: 'PUMP-1 STATUS',
      type: PanelType.LED,
      topic: 'daman/status/pump-1',
      payloadOn: '1',
      iconOn: 'fa-faucet-drip',
      iconColorOn: '#06b6d4',
      x: 20, y: 425, w: 360, h: 75
    },
    {
      panelId: `p_hum_on_time_${ts}`,
      dashboardId: dashHumidityId,
      connectionId,
      panelName: 'KEEP ON TIME OF 01',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/pump/on_time',
      unit: 'min',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 410, y: 140, w: 360, h: 80
    },
    {
      panelId: `p_hum_off_time_${ts}`,
      dashboardId: dashHumidityId,
      connectionId,
      panelName: 'KEEP OFF TIME OF 01',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/pump/off_time',
      unit: 'min',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 800, y: 140, w: 380, h: 80
    },
    {
      panelId: `p_hum_act_on_${ts}`,
      dashboardId: dashHumidityId,
      connectionId,
      panelName: 'ACTUAL PUMP ON TIME',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/pump/actual_on',
      unit: 'min',
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '16',
      x: 410, y: 235, w: 360, h: 80
    },
    {
      panelId: `p_hum_act_off_${ts}`,
      dashboardId: dashHumidityId,
      connectionId,
      panelName: 'ACTUAL PUMP OFF TIME',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/pump/actual_off',
      unit: 'min',
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '16',
      x: 800, y: 235, w: 380, h: 80
    }
  );

  // ==========================================
  // SCREEN 5: FAN SETPOINTS (dashFanSetpointId)
  // ==========================================
  addSubscreenHeader(dashFanSetpointId, 'FAN TEMPERATURE SETPOINTS');
  for (let i = 1; i <= 8; i++) {
    const col = (i - 1) % 2;
    const row = Math.floor((i - 1) / 2);
    panels.push({
      panelId: `p_sp_fan_${i}_${ts}`,
      dashboardId: dashFanSetpointId,
      connectionId,
      panelName: `FAN-${i} ON (°C)`,
      type: PanelType.TEXT_INPUT,
      topic: `daman/fansp/fan${i}_on`,
      unit: '°C',
      payloadMin: 0,
      payloadMax: 100,
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 20 + col * 280,
      y: 85 + row * 85,
      w: 260,
      h: 75
    });
  }

  panels.push(
    {
      panelId: `p_sp_temp_min_${ts}`,
      dashboardId: dashFanSetpointId,
      connectionId,
      panelName: 'TEMP MIN',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/fansp/temp_min',
      unit: '°C',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 600, y: 85, w: 270, h: 80
    },
    {
      panelId: `p_sp_temp_max_${ts}`,
      dashboardId: dashFanSetpointId,
      connectionId,
      panelName: 'TEMP MAX',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/fansp/temp_max',
      unit: '°C',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 600, y: 180, w: 270, h: 80
    },
    {
      panelId: `p_sp_speed_min_${ts}`,
      dashboardId: dashFanSetpointId,
      connectionId,
      panelName: 'SPEED MIN',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/fansp/speed_min',
      unit: 'RPM',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 890, y: 85, w: 290, h: 80
    },
    {
      panelId: `p_sp_speed_max_${ts}`,
      dashboardId: dashFanSetpointId,
      connectionId,
      panelName: 'SPEED MAX',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/fansp/speed_max',
      unit: 'RPM',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 890, y: 180, w: 290, h: 80
    }
  );

  // ==========================================
  // SCREEN 6: VFD CONTROL (dashVfdId)
  // ==========================================
  addSubscreenHeader(dashVfdId, 'VFD DRIVE CONTROL');
  panels.push(
    {
      panelId: `p_vfd_start_${ts}`,
      dashboardId: dashVfdId,
      connectionId,
      panelName: 'START',
      type: PanelType.BUTTON,
      topic: 'daman/vfd/control',
      buttonPayload: '1',
      bgColor: '#16a34a',
      textColor: '#ffffff',
      fontSize: '18',
      x: 20, y: 90, w: 220, h: 75
    },
    {
      panelId: `p_vfd_stop_${ts}`,
      dashboardId: dashVfdId,
      connectionId,
      panelName: 'STOP',
      type: PanelType.BUTTON,
      topic: 'daman/vfd/control',
      buttonPayload: '0',
      bgColor: '#dc2626',
      textColor: '#ffffff',
      fontSize: '18',
      x: 20, y: 180, w: 220, h: 75
    },
    {
      panelId: `p_vfd_set_hz_${ts}`,
      dashboardId: dashVfdId,
      connectionId,
      panelName: 'SET HZ',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/vfd/set_hz',
      unit: 'Hz',
      payloadMin: 0,
      payloadMax: 50,
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '18',
      x: 260, y: 90, w: 320, h: 75
    },
    {
      panelId: `p_vfd_act_hz_${ts}`,
      dashboardId: dashVfdId,
      connectionId,
      panelName: 'ACTUAL HZ',
      type: PanelType.TEXT_OUTPUT,
      topic: 'daman/vfd/act_hz',
      unit: 'Hz',
      decimalPrecision: 1,
      bgColor: '#022c22',
      textColor: '#4ade80',
      borderColor: '#16a34a',
      fontSize: '18',
      x: 260, y: 180, w: 320, h: 75
    },
    {
      panelId: `p_vfd_auto_sw_${ts}`,
      dashboardId: dashVfdId,
      connectionId,
      panelName: 'AUTO SWITCHOVER CONTROL',
      type: PanelType.SWITCH,
      topic: 'daman/vfd/auto_mode',
      payloadOn: 'AUTO IS ACTIVE',
      payloadOff: 'MANUAL IS ACTIVE',
      x: 610, y: 90, w: 570, h: 165
    }
  );

  // ==========================================
  // SCREEN 7: INNER LIGHTING (dashLightingId)
  // ==========================================
  addSubscreenHeader(dashLightingId, 'INNER LIGHTING CONTROL');
  panels.push(
    {
      panelId: `p_lt_on_at_${ts}`,
      dashboardId: dashLightingId,
      connectionId,
      panelName: 'ON AT (clock hh:mm)',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/lighting/on_at',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '18',
      x: 20, y: 90, w: 360, h: 80
    },
    {
      panelId: `p_lt_off_at_${ts}`,
      dashboardId: dashLightingId,
      connectionId,
      panelName: 'OFF AT (clock hh:mm)',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/lighting/off_at',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '18',
      x: 20, y: 185, w: 360, h: 80
    },
    {
      panelId: `p_lt_sw_${ts}`,
      dashboardId: dashLightingId,
      connectionId,
      panelName: 'MANUAL ON / OFF',
      type: PanelType.SWITCH,
      topic: 'daman/lighting/manual',
      payloadOn: 'ON',
      payloadOff: 'OFF',
      x: 410, y: 90, w: 360, h: 175
    },
    {
      panelId: `p_lt_status_${ts}`,
      dashboardId: dashLightingId,
      connectionId,
      panelName: 'LIGHT STATUS',
      type: PanelType.LED,
      topic: 'daman/status/light_in',
      payloadOn: '1',
      iconOn: 'fa-lightbulb',
      iconColorOn: '#facc15',
      x: 800, y: 90, w: 380, h: 175
    }
  );

  // ==========================================
  // SCREEN 8: SENSOR CALIBRATION (dashSensorCalId)
  // ==========================================
  addSubscreenHeader(dashSensorCalId, 'SENSORS OFFSET CALIBRATION');
  panels.push({
    panelId: `p_cal_tbl_hdr_${ts}`,
    dashboardId: dashSensorCalId,
    connectionId,
    panelName: 'Table Banner',
    type: PanelType.STATIC_TEXT,
    topic: 'daman/cal/hdr',
    staticText: 'SENSORS OFFSET CALIBRATION TABLE',
    fontSize: '16',
    textColor: '#f472b6',
    bgColor: '#0b1329',
    borderColor: '#db2777',
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    x: 20, y: 85, w: 1160, h: 42
  });

  for (let i = 1; i <= 4; i++) {
    panels.push(
      {
        panelId: `p_cal_lbl_${i}_${ts}`,
        dashboardId: dashSensorCalId,
        connectionId,
        panelName: `SENSOR-0${i}`,
        type: PanelType.STATIC_TEXT,
        topic: `daman/cal/lbl_${i}`,
        staticText: `SENSOR-0${i}`,
        fontSize: '16',
        textColor: '#ffffff',
        bgColor: '#1e293b',
        x: 20,
        y: 140 + (i - 1) * 70,
        w: 260,
        h: 60
      },
      {
        panelId: `p_cal_off_${i}_${ts}`,
        dashboardId: dashSensorCalId,
        connectionId,
        panelName: `OFFSET (°C)`,
        type: PanelType.TEXT_INPUT,
        topic: `daman/cal/sensor${i}_offset`,
        unit: '°C',
        bgColor: '#422006',
        textColor: '#fef08a',
        borderColor: '#eab308',
        fontSize: '16',
        x: 300,
        y: 140 + (i - 1) * 70,
        w: 420,
        h: 60
      },
      {
        panelId: `p_cal_act_${i}_${ts}`,
        dashboardId: dashSensorCalId,
        connectionId,
        panelName: `ACTUAL (°C)`,
        type: PanelType.TEXT_OUTPUT,
        topic: `daman/sensor${i}`,
        unit: '°C',
        decimalPrecision: 1,
        bgColor: '#022c22',
        textColor: '#4ade80',
        borderColor: '#16a34a',
        fontSize: '16',
        x: 740,
        y: 140 + (i - 1) * 70,
        w: 440,
        h: 60
      }
    );
  }

  // ==========================================
  // SCREEN 9: ALARM SETTING & LIVE ALARMS (dashAlarmSettingId)
  // ==========================================
  addSubscreenHeader(dashAlarmSettingId, 'ALARM SETTINGS & LIVE ALARMS');
  panels.push(
    {
      panelId: `p_alm_hi_${ts}`,
      dashboardId: dashAlarmSettingId,
      connectionId,
      panelName: 'TEMPERATURE HIGH ALARM',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/alarm/temp_hi',
      unit: '°C',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 20, y: 90, w: 380, h: 70
    },
    {
      panelId: `p_alm_lo_${ts}`,
      dashboardId: dashAlarmSettingId,
      connectionId,
      panelName: 'TEMPERATURE LOW ALARM',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/alarm/temp_lo',
      unit: '°C',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 20, y: 170, w: 380, h: 70
    },
    {
      panelId: `p_alm_pwr_${ts}`,
      dashboardId: dashAlarmSettingId,
      connectionId,
      panelName: 'AC POWER FAIL DELAY',
      type: PanelType.TEXT_INPUT,
      topic: 'daman/alarm/pwr_delay',
      unit: 'min',
      bgColor: '#422006',
      textColor: '#fef08a',
      borderColor: '#eab308',
      fontSize: '16',
      x: 20, y: 250, w: 380, h: 70
    },
    {
      panelId: `p_alm_reset_${ts}`,
      dashboardId: dashAlarmSettingId,
      connectionId,
      panelName: 'ALARM RESET',
      type: PanelType.BUTTON,
      topic: 'daman/alarm/reset',
      buttonPayload: 'RESET',
      bgColor: '#dc2626',
      textColor: '#ffffff',
      fontSize: '16',
      x: 20, y: 335, w: 180, h: 60
    },
    {
      panelId: `p_alm_hooter_${ts}`,
      dashboardId: dashAlarmSettingId,
      connectionId,
      panelName: 'ACK HOOTER',
      type: PanelType.BUTTON,
      topic: 'daman/alarm/ack_hooter',
      buttonPayload: 'ACK',
      bgColor: '#d97706',
      textColor: '#ffffff',
      fontSize: '16',
      x: 220, y: 335, w: 180, h: 60
    },
    {
      panelId: `p_alm_log_${ts}`,
      dashboardId: dashAlarmSettingId,
      connectionId,
      panelName: 'LIVE ALARMS LOG',
      type: PanelType.LOG,
      topic: 'daman/alarm/log',
      bgColor: '#020617',
      textColor: '#ef4444',
      borderColor: '#ef4444',
      fontSize: '14',
      x: 420, y: 90, w: 760, h: 305
    }
  );

  return { dashboards, panels };
}
