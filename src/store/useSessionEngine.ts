import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, ProductEdition, Dashboard, HistorianTag, PanelType } from '../types';
import { sanitizeAppState } from '../utils/EditionManager';
import { loadPersistedState, savePersistedState, markClientSetupSaved, clearClientSetupSaved } from '../services/persistenceService';
import { applyThemeToDocument } from '../utils/theme';
import {
  initTrendHistorianDB,
  pruneFIFOByRetention,
  getHistorianRetentionConfig,
  getIsPrivateBrowsing
} from '../utils/trendHistorianEngine';
import { initReportScheduler, getUnreadScheduledCount } from '../utils/reportScheduler';
import { initAiMemoryWorker } from '../utils/aiChunkingWorker';
import { initMobileHapticPriming } from '../utils/hapticFeedback';
import {
  saveCommunityState,
  saveCommercialState,
  getCommunitySavedPackage,
  getCommercialSavedPackage
} from '../utils/editionStorage';

export const INITIAL_STATE: AppState = {
  connections: [
  {
    "connectionName": "broker1",
    "brokerAddress": "test.mosquitto.org",
    "port": "1883",
    "protocol": "Websocket",
    "clientId": "",
    "username": "",
    "password": "",
    "autoConnect": true,
    "cleanSession": true,
    "keepAlive": 60,
    "enableWillMessage": false,
    "connectionId": "conn_demo"
  }
],
  dashboards: [
  {
    "dashboardId": "dash_home",
    "dashboardName": "Smart Home Controls",
    "connectionId": "conn_demo",
    "isHome": false,
    "icon": "fa-house",
    "themeColor": "#f59e0b",
    "bgColor": "#00a8db",
    "canvasBgColor": "#00a8db"
  },
  {
    "dashboardId": "dash_daman_home_1786206817829",
    "dashboardName": "Daman Hatchery (Home)",
    "connectionId": "conn_demo",
    "isHome": true,
    "icon": "fa-house",
    "themeColor": "#0284c7",
    "canvasBgColor": "#0b1329"
  },
  {
    "dashboardId": "dash_daman_menu_1786206817829",
    "dashboardName": "Main Menu",
    "connectionId": "conn_demo",
    "isHome": false,
    "icon": "fa-bars",
    "themeColor": "#38bdf8",
    "canvasBgColor": "#010404",
    "bgColor": "#010404"
  },
  {
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "dashboardName": "Fan Timer",
    "connectionId": "conn_demo",
    "isHome": false,
    "icon": "fa-fan",
    "themeColor": "#10b981",
    "canvasBgColor": "#0b1329"
  },
  {
    "dashboardId": "dash_daman_humidity_1786206817829",
    "dashboardName": "Humidity & Pump-01",
    "connectionId": "conn_demo",
    "isHome": false,
    "icon": "fa-droplet",
    "themeColor": "#06b6d4",
    "canvasBgColor": "#0b1329"
  },
  {
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "dashboardName": "Fan Setpoints",
    "connectionId": "conn_demo",
    "isHome": false,
    "icon": "fa-temperature-high",
    "themeColor": "#f59e0b",
    "canvasBgColor": "#0b1329"
  },
  {
    "dashboardId": "dash_daman_vfd_1786206817829",
    "dashboardName": "VFD Control",
    "connectionId": "conn_demo",
    "isHome": false,
    "icon": "fa-gears",
    "themeColor": "#8b5cf6",
    "canvasBgColor": "#0b1329"
  },
  {
    "dashboardId": "dash_daman_lighting_1786206817829",
    "dashboardName": "Inner Lighting",
    "connectionId": "conn_demo",
    "isHome": false,
    "icon": "fa-lightbulb",
    "themeColor": "#eab308",
    "canvasBgColor": "#0b1329"
  },
  {
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "dashboardName": "Sensor Calibration",
    "connectionId": "conn_demo",
    "isHome": false,
    "icon": "fa-sliders",
    "themeColor": "#ec4899",
    "canvasBgColor": "#0b1329"
  },
  {
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "dashboardName": "Alarm Setting & Live Alarms",
    "connectionId": "conn_demo",
    "isHome": false,
    "icon": "fa-triangle-exclamation",
    "themeColor": "#ef4444",
    "canvasBgColor": "#0b1329"
  }
],
  panels: [
  {
    "panelId": "panel_temp",
    "dashboardId": "dash_home",
    "connectionId": "conn_demo",
    "panelName": "Living Room Temperature",
    "type": "gauge",
    "topic": "home/livingroom/temperature",
    "unit": "\u00b0C",
    "payloadMin": 10,
    "payloadMax": 50,
    "firstColor": "#10b981",
    "secondColor": "#f59e0b",
    "thirdColor": "#ef4444",
    "decimalPrecision": 1,
    "textColor": "#ffffff",
    "x": 530,
    "y": 170,
    "w": 160,
    "h": 140
  },
  {
    "panelId": "panel_fan",
    "dashboardId": "dash_home",
    "connectionId": "conn_demo",
    "panelName": "HVAC Ventilation Fan",
    "type": "led",
    "topic": "home/livingroom/fan",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#4b5563",
    "x": 220,
    "y": 80,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "panel_switch",
    "dashboardId": "dash_home",
    "connectionId": "conn_demo",
    "panelName": "Ceiling Ambient Lights",
    "type": "switch",
    "topic": "home/lights/livingroom",
    "payloadOn": "ON",
    "payloadOff": "OFF",
    "switchSize": 48,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "panel_dimmer",
    "dashboardId": "dash_home",
    "connectionId": "conn_demo",
    "panelName": "Dimmer Brightness",
    "type": "slider",
    "topic": "home/lights/brightness",
    "payloadMin": 0,
    "payloadMax": 100,
    "unit": "%",
    "sliderStep": 5
  },
  {
    "type": "gauge",
    "dashboardId": "dash_home",
    "connectionId": "conn_demo",
    "panelName": "New GAUGE",
    "topic": "vijay",
    "qos": 0,
    "messageFactor": 1,
    "decimalPrecision": 1,
    "payloadMin": 0,
    "payloadMax": 100,
    "lowThreshold": 33,
    "highThreshold": 66,
    "colSpan": 1,
    "rowSpan": 1,
    "firstColor": "#38bdf8",
    "secondColor": "#f59e0b",
    "thirdColor": "#ef4444",
    "penColor": "#38bdf8",
    "penThickness": 2,
    "graphType": "line",
    "showGrid": true,
    "fillArea": true,
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#4b5563",
    "fontSize": "Normal",
    "payloadOn": "1",
    "payloadOff": "0",
    "showReceivedTimeStamp": true,
    "showSentTimeStamp": true,
    "buttonPayload": "1",
    "sliderStep": 1,
    "publishPattern": "",
    "publishTopic": "",
    "confirmPublish": false,
    "clearOnPublish": false,
    "enableLowAlarm": false,
    "enableMidAlarm": false,
    "enableHighAlarm": false,
    "lowAlarmMsg": "Low Zone Warning",
    "midAlarmMsg": "Mid Zone Warning",
    "highAlarmMsg": "High Critical Alarm",
    "options": [
      "Selection 1:20",
      "Selection 2:40",
      "Selection 3:60",
      "Selection 4:80"
    ],
    "optionItems": [
      {
        "label": "Selection 1",
        "value": "20"
      },
      {
        "label": "Selection 2",
        "value": "40"
      },
      {
        "label": "Selection 3",
        "value": "60"
      },
      {
        "label": "Selection 4",
        "value": "80"
      }
    ],
    "isJSONPayload": true,
    "jsonPath": "$.d.write1[0]",
    "panelId": "panel_1786194476444"
  },
  {
    "type": "gauge",
    "dashboardId": "dash_home",
    "connectionId": "conn_demo",
    "panelName": "New GAUGE",
    "topic": "vijay",
    "qos": 0,
    "messageFactor": 1,
    "decimalPrecision": 1,
    "payloadMin": 0,
    "payloadMax": 100,
    "lowThreshold": 33,
    "highThreshold": 66,
    "colSpan": 1,
    "rowSpan": 1,
    "firstColor": "#38bdf8",
    "secondColor": "#f59e0b",
    "thirdColor": "#ef4444",
    "penColor": "#38bdf8",
    "penThickness": 2,
    "graphType": "line",
    "showGrid": true,
    "fillArea": true,
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#4b5563",
    "fontSize": "Normal",
    "payloadOn": "1",
    "payloadOff": "0",
    "showReceivedTimeStamp": true,
    "showSentTimeStamp": true,
    "buttonPayload": "1",
    "sliderStep": 1,
    "publishPattern": "",
    "publishTopic": "",
    "confirmPublish": false,
    "clearOnPublish": false,
    "enableLowAlarm": false,
    "enableMidAlarm": false,
    "enableHighAlarm": false,
    "lowAlarmMsg": "Low Zone Warning",
    "midAlarmMsg": "Mid Zone Warning",
    "highAlarmMsg": "High Critical Alarm",
    "options": [
      "Selection 1:20",
      "Selection 2:40",
      "Selection 3:60",
      "Selection 4:80"
    ],
    "optionItems": [
      {
        "label": "Selection 1",
        "value": "20"
      },
      {
        "label": "Selection 2",
        "value": "40"
      },
      {
        "label": "Selection 3",
        "value": "60"
      },
      {
        "label": "Selection 4",
        "value": "80"
      }
    ],
    "isJSONPayload": true,
    "jsonPath": "$.d.data_shankar[0]",
    "panelId": "panel_1786194604164"
  },
  {
    "panelId": "p_dh_title_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Header Banner",
    "type": "static_text",
    "topic": "daman/title",
    "staticText": "DAMAN HATCHERY",
    "fontSize": "24",
    "textColor": "#00f2fe",
    "bgColor": "#030d22",
    "borderColor": "#0284c7",
    "borderWidth": 2,
    "borderRadius": 12,
    "textAlign": "center",
    "x": 20,
    "y": 15,
    "w": 1160,
    "h": 55
  },
  {
    "panelId": "p_dh_gauge_temp_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AVERAGE ROOM TEMPERATURE (\u00b0C)",
    "type": "gauge",
    "topic": "daman/room/temp",
    "unit": "\u00b0C",
    "payloadMin": 0,
    "payloadMax": 100,
    "firstColor": "#10b981",
    "secondColor": "#f59e0b",
    "thirdColor": "#ef4444",
    "decimalPrecision": 1,
    "x": 20,
    "y": 85,
    "w": 380,
    "h": 220
  },
  {
    "panelId": "p_dh_gauge_hum_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ACTUAL ROOM HUMIDITY (%)",
    "type": "gauge",
    "topic": "daman/room/humidity",
    "unit": "%",
    "payloadMin": 0,
    "payloadMax": 100,
    "firstColor": "#0284c7",
    "secondColor": "#06b6d4",
    "thirdColor": "#10b981",
    "decimalPrecision": 1,
    "x": 800,
    "y": 85,
    "w": 380,
    "h": 220
  },
  {
    "panelId": "p_dh_s1_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SENSOR 01",
    "type": "text_output",
    "topic": "daman/sensor1",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "18",
    "x": 420,
    "y": 100,
    "w": 170,
    "h": 80
  },
  {
    "panelId": "p_dh_s2_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SENSOR 02",
    "type": "text_output",
    "topic": "daman/sensor2",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "18",
    "x": 610,
    "y": 100,
    "w": 170,
    "h": 80
  },
  {
    "panelId": "p_dh_menu_btn_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "MAIN MENU",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_menu_1786206817829",
    "topic": "daman/nav/menu",
    "bgColor": "#0284c7",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "18",
    "x": 420,
    "y": 200,
    "w": 360,
    "h": 65
  },
  {
    "panelId": "p_dh_hdr_status_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Section Header",
    "type": "static_text",
    "topic": "daman/hdr/status",
    "staticText": "OUTPUT STATUS (INDICATOR LAMPS)",
    "fontSize": "16",
    "textColor": "#f59e0b",
    "bgColor": "#0b1329",
    "borderColor": "#334155",
    "borderWidth": 1,
    "borderRadius": 8,
    "textAlign": "center",
    "x": 20,
    "y": 325,
    "w": 1160,
    "h": 40
  },
  {
    "panelId": "p_dh_ind_0_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-1",
    "type": "led",
    "topic": "daman/status/fan-1",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 20,
    "y": 380,
    "w": 135,
    "h": 68,
    "iconSize": 24,
    "fontSize": 14,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind_1_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-2",
    "type": "led",
    "topic": "daman/status/fan-2",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 165,
    "y": 380,
    "w": 135,
    "h": 68,
    "iconSize": 32,
    "fontSize": 20,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind_2_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-3",
    "type": "led",
    "topic": "daman/status/fan-3",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 310,
    "y": 380,
    "w": 135,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind_3_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-4",
    "type": "led",
    "topic": "daman/status/fan-4",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 455,
    "y": 380,
    "w": 135,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind_4_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-5",
    "type": "led",
    "topic": "daman/status/fan-5",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 600,
    "y": 380,
    "w": 135,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind_5_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-6",
    "type": "led",
    "topic": "daman/status/fan-6",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 745,
    "y": 380,
    "w": 135,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind_6_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-7",
    "type": "led",
    "topic": "daman/status/fan-7",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 890,
    "y": 380,
    "w": 135,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind_7_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-8",
    "type": "led",
    "topic": "daman/status/fan-8",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#10b981",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 1035,
    "y": 380,
    "w": 135,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind2_0_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-9",
    "type": "led",
    "topic": "daman/status/fan-9",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#06b6d4",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 20,
    "y": 460,
    "w": 180,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind2_1_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-10",
    "type": "led",
    "topic": "daman/status/fan-10",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#06b6d4",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 215,
    "y": 460,
    "w": 180,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind2_2_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-11",
    "type": "led",
    "topic": "daman/status/fan-11",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-fan",
    "iconOff": "fa-fan",
    "iconColorOn": "#06b6d4",
    "iconColorOff": "#475569",
    "rotateOn": true,
    "x": 410,
    "y": 460,
    "w": 180,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind2_3_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "PUMP-1",
    "type": "led",
    "topic": "daman/status/pump-1",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-faucet-drip",
    "iconOff": "fa-faucet-drip",
    "iconColorOn": "#06b6d4",
    "iconColorOff": "#475569",
    "rotateOn": false,
    "x": 605,
    "y": 460,
    "w": 180,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind2_4_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "LIGHT IN",
    "type": "led",
    "topic": "daman/status/light_in",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-lightbulb",
    "iconOff": "fa-lightbulb",
    "iconColorOn": "#06b6d4",
    "iconColorOff": "#475569",
    "rotateOn": false,
    "x": 800,
    "y": 460,
    "w": 180,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dh_ind2_5_1786206817829",
    "dashboardId": "dash_daman_home_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HOOTER",
    "type": "led",
    "topic": "daman/status/hooter",
    "payloadOn": "1",
    "payloadOff": "0",
    "iconOn": "fa-bullhorn",
    "iconOff": "fa-bullhorn",
    "iconColorOn": "#06b6d4",
    "iconColorOff": "#475569",
    "rotateOn": false,
    "x": 995,
    "y": 460,
    "w": 180,
    "h": 68,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_dm_title_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Header Banner",
    "type": "static_text",
    "topic": "daman/menu/title",
    "staticText": "DAMAN HATCHERY - MAIN NAVIGATION MENU",
    "fontSize": "22",
    "textColor": "#38bdf8",
    "bgColor": "#030d22",
    "borderColor": "#0284c7",
    "borderWidth": 2,
    "borderRadius": 12,
    "textAlign": "center",
    "x": 20,
    "y": 15,
    "w": 1160,
    "h": 55,
    "shadowEnabled": true
  },
  {
    "panelId": "p_dm_hum_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HUMIDITY",
    "type": "text_output",
    "topic": "daman/room/humidity",
    "unit": "%",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "18",
    "x": 20,
    "y": 85,
    "w": 340,
    "h": 70
  },
  {
    "panelId": "p_dm_temp_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AVERAGE TEMPERATURE",
    "type": "text_output",
    "topic": "daman/room/temp",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "18",
    "x": 840,
    "y": 85,
    "w": 340,
    "h": 70
  },
  {
    "panelId": "p_dm_btn_fantimer_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN TIMER",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_fan_timer_1786206817829",
    "topic": "daman/nav/fantimer",
    "bgColor": "#0f172a",
    "textColor": "#38bdf8",
    "borderColor": "#0284c7",
    "fontSize": "16",
    "x": 60,
    "y": 180,
    "w": 240,
    "h": 65
  },
  {
    "panelId": "p_dm_btn_humidity_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HUMIDITY",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_humidity_1786206817829",
    "topic": "daman/nav/humidity",
    "bgColor": "#0f172a",
    "textColor": "#38bdf8",
    "borderColor": "#0284c7",
    "fontSize": "16",
    "x": 340,
    "y": 180,
    "w": 240,
    "h": 65
  },
  {
    "panelId": "p_dm_btn_alarm_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ALARM SETTING",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_alarm_setting_1786206817829",
    "topic": "daman/nav/alarm",
    "bgColor": "#0f172a",
    "textColor": "#f87171",
    "borderColor": "#ef4444",
    "fontSize": "16",
    "x": 620,
    "y": 180,
    "w": 240,
    "h": 65
  },
  {
    "panelId": "p_dm_btn_sp_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN SETPOINT",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_fan_setpoint_1786206817829",
    "topic": "daman/nav/fansp",
    "bgColor": "#0f172a",
    "textColor": "#f59e0b",
    "borderColor": "#d97706",
    "fontSize": "16",
    "x": 900,
    "y": 180,
    "w": 240,
    "h": 65
  },
  {
    "panelId": "p_dm_btn_vfd_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "VFD CONTROL",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_vfd_1786206817829",
    "topic": "daman/nav/vfd",
    "bgColor": "#0f172a",
    "textColor": "#c084fc",
    "borderColor": "#9333ea",
    "fontSize": "16",
    "x": 60,
    "y": 270,
    "w": 240,
    "h": 65
  },
  {
    "panelId": "p_dm_btn_light_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "LIGHTING",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_lighting_1786206817829",
    "topic": "daman/nav/lighting",
    "bgColor": "#0f172a",
    "textColor": "#facc15",
    "borderColor": "#ca8a04",
    "fontSize": "16",
    "x": 340,
    "y": 270,
    "w": 240,
    "h": 65
  },
  {
    "panelId": "p_dm_btn_cal_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SENSOR CALIBRATION",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_sensor_cal_1786206817829",
    "topic": "daman/nav/cal",
    "bgColor": "#0f172a",
    "textColor": "#f472b6",
    "borderColor": "#db2777",
    "fontSize": "16",
    "x": 620,
    "y": 270,
    "w": 240,
    "h": 65
  },
  {
    "panelId": "p_dm_btn_home_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HOME",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_home_1786206817829",
    "topic": "daman/nav/home",
    "bgColor": "#0284c7",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "16",
    "x": 900,
    "y": 270,
    "w": 240,
    "h": 65
  },
  {
    "panelId": "p_dm_s1_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SENSOR #1",
    "type": "text_output",
    "topic": "daman/sensor1",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "18",
    "x": 340,
    "y": 370,
    "w": 240,
    "h": 70
  },
  {
    "panelId": "p_dm_s2_1786206817829",
    "dashboardId": "dash_daman_menu_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SENSOR #2",
    "type": "text_output",
    "topic": "daman/sensor2",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "18",
    "x": 620,
    "y": 370,
    "w": 240,
    "h": 70
  },
  {
    "panelId": "p_sub_hdr_dash_daman_fan_timer_1786206817829_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Header Banner",
    "type": "static_text",
    "topic": "daman/sub/title",
    "staticText": "FAN TIMER CONTROL",
    "fontSize": "20",
    "textColor": "#38bdf8",
    "bgColor": "#030d22",
    "borderColor": "#0284c7",
    "borderWidth": 2,
    "borderRadius": 10,
    "textAlign": "center",
    "x": 360,
    "y": 15,
    "w": 460,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_home_dash_daman_fan_timer_1786206817829_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HOME",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_home_1786206817829",
    "topic": "daman/nav/home",
    "bgColor": "#0284c7",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 20,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_menu_dash_daman_fan_timer_1786206817829_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "MENU",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_menu_1786206817829",
    "topic": "daman/nav/menu",
    "bgColor": "#0369a1",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 185,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_hum_dash_daman_fan_timer_1786206817829_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HUMIDITY",
    "type": "text_output",
    "topic": "daman/room/humidity",
    "unit": "%",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 840,
    "y": 15,
    "w": 160,
    "h": 50
  },
  {
    "panelId": "p_sub_temp_dash_daman_fan_timer_1786206817829_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AVG TEMP",
    "type": "text_output",
    "topic": "daman/room/temp",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 1015,
    "y": 15,
    "w": 165,
    "h": 50
  },
  {
    "panelId": "p_ft_on_12_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "KEEP ON TIME OF 1,2",
    "type": "text_input",
    "topic": "daman/fantimer/on_12",
    "unit": "min",
    "payloadMin": 0,
    "payloadMax": 999,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 90,
    "w": 360,
    "h": 80
  },
  {
    "panelId": "p_ft_off_12_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "KEEP OFF TIME OF 1,2",
    "type": "text_input",
    "topic": "daman/fantimer/off_12",
    "unit": "min",
    "payloadMin": 0,
    "payloadMax": 999,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 400,
    "y": 90,
    "w": 360,
    "h": 80
  },
  {
    "panelId": "p_ft_status_logic_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "TIMER LOGIC ENABLED",
    "type": "led",
    "topic": "daman/fantimer/logic_status",
    "payloadOn": "1",
    "iconOn": "fa-clock",
    "iconColorOn": "#10b981",
    "x": 780,
    "y": 90,
    "w": 400,
    "h": 80,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_ft_out1_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-1 SELECTION ON TIMER",
    "type": "text_output",
    "topic": "daman/fantimer/fan1_sel",
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 20,
    "y": 190,
    "w": 360,
    "h": 70
  },
  {
    "panelId": "p_ft_sw1_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-1 ENABLE",
    "type": "switch",
    "topic": "daman/fantimer/fan1_enable",
    "payloadOn": "ENABLE",
    "payloadOff": "DISABLE",
    "x": 400,
    "y": 190,
    "w": 200,
    "h": 70,
    "switchSize": 64,
    "fontSize": 18,
    "textAlign": "left"
  },
  {
    "panelId": "p_ft_led1_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-1 LAMP",
    "type": "led",
    "topic": "daman/status/fan-1",
    "payloadOn": "1",
    "iconOn": "fa-fan",
    "iconColorOn": "#10b981",
    "rotateOn": true,
    "x": 620,
    "y": 190,
    "w": 140,
    "h": 70,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_ft_out2_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-2 SELECTION ON TIMER",
    "type": "text_output",
    "topic": "daman/fantimer/fan2_sel",
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 20,
    "y": 280,
    "w": 360,
    "h": 70
  },
  {
    "panelId": "p_ft_sw2_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-2 ENABLE",
    "type": "switch",
    "topic": "daman/fantimer/fan2_enable",
    "payloadOn": "ENABLE",
    "payloadOff": "DISABLE",
    "x": 400,
    "y": 280,
    "w": 200,
    "h": 70,
    "switchSize": 48,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_ft_led2_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-2 LAMP",
    "type": "led",
    "topic": "daman/status/fan-2",
    "payloadOn": "1",
    "iconOn": "fa-fan",
    "iconColorOn": "#10b981",
    "rotateOn": true,
    "x": 620,
    "y": 280,
    "w": 140,
    "h": 70,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_ft_on_34_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "KEEP ON TIME OF 3,4",
    "type": "text_input",
    "topic": "daman/fantimer/on_34",
    "unit": "min",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 370,
    "w": 360,
    "h": 80
  },
  {
    "panelId": "p_ft_off_34_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "KEEP OFF TIME OF 3,4",
    "type": "text_input",
    "topic": "daman/fantimer/off_34",
    "unit": "min",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 400,
    "y": 370,
    "w": 360,
    "h": 80
  },
  {
    "panelId": "p_ft_sw3_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-3 ENABLE",
    "type": "switch",
    "topic": "daman/fantimer/fan3_enable",
    "payloadOn": "ENABLE",
    "payloadOff": "DISABLE",
    "x": 780,
    "y": 370,
    "w": 190,
    "h": 80,
    "switchSize": 48,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_ft_sw4_1786206817829",
    "dashboardId": "dash_daman_fan_timer_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-4 ENABLE",
    "type": "switch",
    "topic": "daman/fantimer/fan4_enable",
    "payloadOn": "ENABLE",
    "payloadOff": "DISABLE",
    "x": 990,
    "y": 370,
    "w": 190,
    "h": 80,
    "switchSize": 48,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_sub_hdr_dash_daman_humidity_1786206817829_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Header Banner",
    "type": "static_text",
    "topic": "daman/sub/title",
    "staticText": "PUMP-01 CONTROL & HUMIDITY",
    "fontSize": "20",
    "textColor": "#38bdf8",
    "bgColor": "#030d22",
    "borderColor": "#0284c7",
    "borderWidth": 2,
    "borderRadius": 10,
    "textAlign": "center",
    "x": 360,
    "y": 15,
    "w": 460,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_home_dash_daman_humidity_1786206817829_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HOME",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_home_1786206817829",
    "topic": "daman/nav/home",
    "bgColor": "#0284c7",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 20,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_menu_dash_daman_humidity_1786206817829_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "MENU",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_menu_1786206817829",
    "topic": "daman/nav/menu",
    "bgColor": "#0369a1",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 185,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_hum_dash_daman_humidity_1786206817829_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HUMIDITY",
    "type": "text_output",
    "topic": "daman/room/humidity",
    "unit": "%",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 840,
    "y": 15,
    "w": 160,
    "h": 50
  },
  {
    "panelId": "p_sub_temp_dash_daman_humidity_1786206817829_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AVG TEMP",
    "type": "text_output",
    "topic": "daman/room/temp",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 1015,
    "y": 15,
    "w": 165,
    "h": 50
  },
  {
    "panelId": "p_hum_hdr_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Section Banner",
    "type": "static_text",
    "topic": "daman/pump/hdr",
    "staticText": "PUMP-01 AUTOMATION CONTROLS",
    "fontSize": "16",
    "textColor": "#06b6d4",
    "bgColor": "#0b1329",
    "borderColor": "#0891b2",
    "borderWidth": 1,
    "borderRadius": 8,
    "textAlign": "center",
    "x": 20,
    "y": 85,
    "w": 1160,
    "h": 42
  },
  {
    "panelId": "p_hum_sp_on_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ON AT HUMIDITY % (SETPOINT)",
    "type": "text_input",
    "topic": "daman/pump/sp_on",
    "unit": "%",
    "payloadMin": 0,
    "payloadMax": 100,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 140,
    "w": 360,
    "h": 80
  },
  {
    "panelId": "p_hum_sp_off_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "OFF AT HUMIDITY % (SETPOINT)",
    "type": "text_input",
    "topic": "daman/pump/sp_off",
    "unit": "%",
    "payloadMin": 0,
    "payloadMax": 100,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 235,
    "w": 360,
    "h": 80
  },
  {
    "panelId": "p_hum_sw_logic_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "TIME LOGIC AFTER HIGH HUMIDITY LIMIT",
    "type": "switch",
    "topic": "daman/pump/time_logic",
    "payloadOn": "ENABLED",
    "payloadOff": "DISABLED",
    "x": 20,
    "y": 330,
    "w": 360,
    "h": 80,
    "switchSize": 48,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_hum_led_pump_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "PUMP-1 STATUS",
    "type": "led",
    "topic": "daman/status/pump-1",
    "payloadOn": "1",
    "iconOn": "fa-faucet-drip",
    "iconColorOn": "#06b6d4",
    "x": 20,
    "y": 425,
    "w": 360,
    "h": 75,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_hum_on_time_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "KEEP ON TIME OF 01",
    "type": "text_input",
    "topic": "daman/pump/on_time",
    "unit": "min",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 410,
    "y": 140,
    "w": 360,
    "h": 80
  },
  {
    "panelId": "p_hum_off_time_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "KEEP OFF TIME OF 01",
    "type": "text_input",
    "topic": "daman/pump/off_time",
    "unit": "min",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 800,
    "y": 140,
    "w": 380,
    "h": 80
  },
  {
    "panelId": "p_hum_act_on_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ACTUAL PUMP ON TIME",
    "type": "text_output",
    "topic": "daman/pump/actual_on",
    "unit": "min",
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "16",
    "x": 410,
    "y": 235,
    "w": 360,
    "h": 80
  },
  {
    "panelId": "p_hum_act_off_1786206817829",
    "dashboardId": "dash_daman_humidity_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ACTUAL PUMP OFF TIME",
    "type": "text_output",
    "topic": "daman/pump/actual_off",
    "unit": "min",
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "16",
    "x": 800,
    "y": 235,
    "w": 380,
    "h": 80
  },
  {
    "panelId": "p_sub_hdr_dash_daman_fan_setpoint_1786206817829_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Header Banner",
    "type": "static_text",
    "topic": "daman/sub/title",
    "staticText": "FAN TEMPERATURE SETPOINTS",
    "fontSize": "20",
    "textColor": "#38bdf8",
    "bgColor": "#030d22",
    "borderColor": "#0284c7",
    "borderWidth": 2,
    "borderRadius": 10,
    "textAlign": "center",
    "x": 360,
    "y": 15,
    "w": 460,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_home_dash_daman_fan_setpoint_1786206817829_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HOME",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_home_1786206817829",
    "topic": "daman/nav/home",
    "bgColor": "#0284c7",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 20,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_menu_dash_daman_fan_setpoint_1786206817829_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "MENU",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_menu_1786206817829",
    "topic": "daman/nav/menu",
    "bgColor": "#0369a1",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 185,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_hum_dash_daman_fan_setpoint_1786206817829_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HUMIDITY",
    "type": "text_output",
    "topic": "daman/room/humidity",
    "unit": "%",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 840,
    "y": 15,
    "w": 160,
    "h": 50
  },
  {
    "panelId": "p_sub_temp_dash_daman_fan_setpoint_1786206817829_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AVG TEMP",
    "type": "text_output",
    "topic": "daman/room/temp",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 1015,
    "y": 15,
    "w": 165,
    "h": 50
  },
  {
    "panelId": "p_sp_fan_1_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-1 ON (\u00b0C)",
    "type": "text_input",
    "topic": "daman/fansp/fan1_on",
    "unit": "\u00b0C",
    "payloadMin": 0,
    "payloadMax": 100,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 85,
    "w": 260,
    "h": 75
  },
  {
    "panelId": "p_sp_fan_2_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-2 ON (\u00b0C)",
    "type": "text_input",
    "topic": "daman/fansp/fan2_on",
    "unit": "\u00b0C",
    "payloadMin": 0,
    "payloadMax": 100,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 300,
    "y": 85,
    "w": 260,
    "h": 75
  },
  {
    "panelId": "p_sp_fan_3_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-3 ON (\u00b0C)",
    "type": "text_input",
    "topic": "daman/fansp/fan3_on",
    "unit": "\u00b0C",
    "payloadMin": 0,
    "payloadMax": 100,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 170,
    "w": 260,
    "h": 75
  },
  {
    "panelId": "p_sp_fan_4_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-4 ON (\u00b0C)",
    "type": "text_input",
    "topic": "daman/fansp/fan4_on",
    "unit": "\u00b0C",
    "payloadMin": 0,
    "payloadMax": 100,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 300,
    "y": 170,
    "w": 260,
    "h": 75
  },
  {
    "panelId": "p_sp_fan_5_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-5 ON (\u00b0C)",
    "type": "text_input",
    "topic": "daman/fansp/fan5_on",
    "unit": "\u00b0C",
    "payloadMin": 0,
    "payloadMax": 100,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 255,
    "w": 260,
    "h": 75
  },
  {
    "panelId": "p_sp_fan_6_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-6 ON (\u00b0C)",
    "type": "text_input",
    "topic": "daman/fansp/fan6_on",
    "unit": "\u00b0C",
    "payloadMin": 0,
    "payloadMax": 100,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 300,
    "y": 255,
    "w": 260,
    "h": 75
  },
  {
    "panelId": "p_sp_fan_7_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-7 ON (\u00b0C)",
    "type": "text_input",
    "topic": "daman/fansp/fan7_on",
    "unit": "\u00b0C",
    "payloadMin": 0,
    "payloadMax": 100,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 340,
    "w": 260,
    "h": 75
  },
  {
    "panelId": "p_sp_fan_8_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "FAN-8 ON (\u00b0C)",
    "type": "text_input",
    "topic": "daman/fansp/fan8_on",
    "unit": "\u00b0C",
    "payloadMin": 0,
    "payloadMax": 100,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 300,
    "y": 340,
    "w": 260,
    "h": 75
  },
  {
    "panelId": "p_sp_temp_min_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "TEMP MIN",
    "type": "text_input",
    "topic": "daman/fansp/temp_min",
    "unit": "\u00b0C",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 600,
    "y": 85,
    "w": 270,
    "h": 80
  },
  {
    "panelId": "p_sp_temp_max_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "TEMP MAX",
    "type": "text_input",
    "topic": "daman/fansp/temp_max",
    "unit": "\u00b0C",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 600,
    "y": 180,
    "w": 270,
    "h": 80
  },
  {
    "panelId": "p_sp_speed_min_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SPEED MIN",
    "type": "text_input",
    "topic": "daman/fansp/speed_min",
    "unit": "RPM",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 890,
    "y": 85,
    "w": 290,
    "h": 80
  },
  {
    "panelId": "p_sp_speed_max_1786206817829",
    "dashboardId": "dash_daman_fan_setpoint_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SPEED MAX",
    "type": "text_input",
    "topic": "daman/fansp/speed_max",
    "unit": "RPM",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 890,
    "y": 180,
    "w": 290,
    "h": 80
  },
  {
    "panelId": "p_sub_hdr_dash_daman_vfd_1786206817829_1786206817829",
    "dashboardId": "dash_daman_vfd_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Header Banner",
    "type": "static_text",
    "topic": "daman/sub/title",
    "staticText": "VFD DRIVE CONTROL",
    "fontSize": "20",
    "textColor": "#38bdf8",
    "bgColor": "#030d22",
    "borderColor": "#0284c7",
    "borderWidth": 2,
    "borderRadius": 10,
    "textAlign": "center",
    "x": 360,
    "y": 15,
    "w": 460,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_home_dash_daman_vfd_1786206817829_1786206817829",
    "dashboardId": "dash_daman_vfd_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HOME",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_home_1786206817829",
    "topic": "daman/nav/home",
    "bgColor": "#0284c7",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 20,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_menu_dash_daman_vfd_1786206817829_1786206817829",
    "dashboardId": "dash_daman_vfd_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "MENU",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_menu_1786206817829",
    "topic": "daman/nav/menu",
    "bgColor": "#0369a1",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 185,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_hum_dash_daman_vfd_1786206817829_1786206817829",
    "dashboardId": "dash_daman_vfd_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HUMIDITY",
    "type": "text_output",
    "topic": "daman/room/humidity",
    "unit": "%",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 840,
    "y": 15,
    "w": 160,
    "h": 50
  },
  {
    "panelId": "p_sub_temp_dash_daman_vfd_1786206817829_1786206817829",
    "dashboardId": "dash_daman_vfd_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AVG TEMP",
    "type": "text_output",
    "topic": "daman/room/temp",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 1015,
    "y": 15,
    "w": 165,
    "h": 50
  },
  {
    "panelId": "p_vfd_start_1786206817829",
    "dashboardId": "dash_daman_vfd_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "START",
    "type": "button",
    "topic": "daman/vfd/control",
    "buttonPayload": "1",
    "bgColor": "#16a34a",
    "textColor": "#ffffff",
    "fontSize": "18",
    "x": 20,
    "y": 90,
    "w": 220,
    "h": 75
  },
  {
    "panelId": "p_vfd_stop_1786206817829",
    "dashboardId": "dash_daman_vfd_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "STOP",
    "type": "button",
    "topic": "daman/vfd/control",
    "buttonPayload": "0",
    "bgColor": "#dc2626",
    "textColor": "#ffffff",
    "fontSize": "18",
    "x": 20,
    "y": 180,
    "w": 220,
    "h": 75
  },
  {
    "panelId": "p_vfd_set_hz_1786206817829",
    "dashboardId": "dash_daman_vfd_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SET HZ",
    "type": "text_input",
    "topic": "daman/vfd/set_hz",
    "unit": "Hz",
    "payloadMin": 0,
    "payloadMax": 50,
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "18",
    "x": 260,
    "y": 90,
    "w": 320,
    "h": 75
  },
  {
    "panelId": "p_vfd_act_hz_1786206817829",
    "dashboardId": "dash_daman_vfd_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ACTUAL HZ",
    "type": "text_output",
    "topic": "daman/vfd/act_hz",
    "unit": "Hz",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "18",
    "x": 260,
    "y": 180,
    "w": 320,
    "h": 75
  },
  {
    "panelId": "p_vfd_auto_sw_1786206817829",
    "dashboardId": "dash_daman_vfd_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AUTO SWITCHOVER CONTROL",
    "type": "switch",
    "topic": "daman/vfd/auto_mode",
    "payloadOn": "AUTO IS ACTIVE",
    "payloadOff": "MANUAL IS ACTIVE",
    "x": 610,
    "y": 90,
    "w": 570,
    "h": 165,
    "switchSize": 48,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_sub_hdr_dash_daman_lighting_1786206817829_1786206817829",
    "dashboardId": "dash_daman_lighting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Header Banner",
    "type": "static_text",
    "topic": "daman/sub/title",
    "staticText": "INNER LIGHTING CONTROL",
    "fontSize": "20",
    "textColor": "#38bdf8",
    "bgColor": "#030d22",
    "borderColor": "#0284c7",
    "borderWidth": 2,
    "borderRadius": 10,
    "textAlign": "center",
    "x": 360,
    "y": 15,
    "w": 460,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_home_dash_daman_lighting_1786206817829_1786206817829",
    "dashboardId": "dash_daman_lighting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HOME",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_home_1786206817829",
    "topic": "daman/nav/home",
    "bgColor": "#0284c7",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 20,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_menu_dash_daman_lighting_1786206817829_1786206817829",
    "dashboardId": "dash_daman_lighting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "MENU",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_menu_1786206817829",
    "topic": "daman/nav/menu",
    "bgColor": "#0369a1",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 185,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_hum_dash_daman_lighting_1786206817829_1786206817829",
    "dashboardId": "dash_daman_lighting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HUMIDITY",
    "type": "text_output",
    "topic": "daman/room/humidity",
    "unit": "%",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 840,
    "y": 15,
    "w": 160,
    "h": 50
  },
  {
    "panelId": "p_sub_temp_dash_daman_lighting_1786206817829_1786206817829",
    "dashboardId": "dash_daman_lighting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AVG TEMP",
    "type": "text_output",
    "topic": "daman/room/temp",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 1015,
    "y": 15,
    "w": 165,
    "h": 50
  },
  {
    "panelId": "p_lt_on_at_1786206817829",
    "dashboardId": "dash_daman_lighting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ON AT (clock hh:mm)",
    "type": "text_input",
    "topic": "daman/lighting/on_at",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "18",
    "x": 20,
    "y": 90,
    "w": 360,
    "h": 80
  },
  {
    "panelId": "p_lt_off_at_1786206817829",
    "dashboardId": "dash_daman_lighting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "OFF AT (clock hh:mm)",
    "type": "text_input",
    "topic": "daman/lighting/off_at",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "18",
    "x": 20,
    "y": 185,
    "w": 360,
    "h": 80
  },
  {
    "panelId": "p_lt_sw_1786206817829",
    "dashboardId": "dash_daman_lighting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "MANUAL ON / OFF",
    "type": "switch",
    "topic": "daman/lighting/manual",
    "payloadOn": "ON",
    "payloadOff": "OFF",
    "x": 410,
    "y": 90,
    "w": 360,
    "h": 175,
    "switchSize": 48,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_lt_status_1786206817829",
    "dashboardId": "dash_daman_lighting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "LIGHT STATUS",
    "type": "led",
    "topic": "daman/status/light_in",
    "payloadOn": "1",
    "iconOn": "fa-lightbulb",
    "iconColorOn": "#facc15",
    "x": 800,
    "y": 90,
    "w": 380,
    "h": 175,
    "iconSize": 24,
    "fontSize": 12,
    "textAlign": "left"
  },
  {
    "panelId": "p_sub_hdr_dash_daman_sensor_cal_1786206817829_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Header Banner",
    "type": "static_text",
    "topic": "daman/sub/title",
    "staticText": "SENSORS OFFSET CALIBRATION",
    "fontSize": "20",
    "textColor": "#38bdf8",
    "bgColor": "#030d22",
    "borderColor": "#0284c7",
    "borderWidth": 2,
    "borderRadius": 10,
    "textAlign": "center",
    "x": 360,
    "y": 15,
    "w": 460,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_home_dash_daman_sensor_cal_1786206817829_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HOME",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_home_1786206817829",
    "topic": "daman/nav/home",
    "bgColor": "#0284c7",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 20,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_menu_dash_daman_sensor_cal_1786206817829_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "MENU",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_menu_1786206817829",
    "topic": "daman/nav/menu",
    "bgColor": "#0369a1",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 185,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_hum_dash_daman_sensor_cal_1786206817829_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HUMIDITY",
    "type": "text_output",
    "topic": "daman/room/humidity",
    "unit": "%",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 840,
    "y": 15,
    "w": 160,
    "h": 50
  },
  {
    "panelId": "p_sub_temp_dash_daman_sensor_cal_1786206817829_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AVG TEMP",
    "type": "text_output",
    "topic": "daman/room/temp",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 1015,
    "y": 15,
    "w": 165,
    "h": 50
  },
  {
    "panelId": "p_cal_tbl_hdr_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Table Banner",
    "type": "static_text",
    "topic": "daman/cal/hdr",
    "staticText": "SENSORS OFFSET CALIBRATION TABLE",
    "fontSize": "16",
    "textColor": "#f472b6",
    "bgColor": "#0b1329",
    "borderColor": "#db2777",
    "borderWidth": 1,
    "borderRadius": 8,
    "textAlign": "center",
    "x": 20,
    "y": 85,
    "w": 1160,
    "h": 42
  },
  {
    "panelId": "p_cal_lbl_1_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SENSOR-01",
    "type": "static_text",
    "topic": "daman/cal/lbl_1",
    "staticText": "SENSOR-01",
    "fontSize": "16",
    "textColor": "#ffffff",
    "bgColor": "#1e293b",
    "x": 20,
    "y": 140,
    "w": 260,
    "h": 60
  },
  {
    "panelId": "p_cal_off_1_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "OFFSET (\u00b0C)",
    "type": "text_input",
    "topic": "daman/cal/sensor1_offset",
    "unit": "\u00b0C",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 300,
    "y": 140,
    "w": 420,
    "h": 60
  },
  {
    "panelId": "p_cal_act_1_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ACTUAL (\u00b0C)",
    "type": "text_output",
    "topic": "daman/sensor1",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "16",
    "x": 740,
    "y": 140,
    "w": 440,
    "h": 60
  },
  {
    "panelId": "p_cal_lbl_2_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SENSOR-02",
    "type": "static_text",
    "topic": "daman/cal/lbl_2",
    "staticText": "SENSOR-02",
    "fontSize": "16",
    "textColor": "#ffffff",
    "bgColor": "#1e293b",
    "x": 20,
    "y": 210,
    "w": 260,
    "h": 60
  },
  {
    "panelId": "p_cal_off_2_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "OFFSET (\u00b0C)",
    "type": "text_input",
    "topic": "daman/cal/sensor2_offset",
    "unit": "\u00b0C",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 300,
    "y": 210,
    "w": 420,
    "h": 60
  },
  {
    "panelId": "p_cal_act_2_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ACTUAL (\u00b0C)",
    "type": "text_output",
    "topic": "daman/sensor2",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "16",
    "x": 740,
    "y": 210,
    "w": 440,
    "h": 60
  },
  {
    "panelId": "p_cal_lbl_3_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SENSOR-03",
    "type": "static_text",
    "topic": "daman/cal/lbl_3",
    "staticText": "SENSOR-03",
    "fontSize": "16",
    "textColor": "#ffffff",
    "bgColor": "#1e293b",
    "x": 20,
    "y": 280,
    "w": 260,
    "h": 60
  },
  {
    "panelId": "p_cal_off_3_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "OFFSET (\u00b0C)",
    "type": "text_input",
    "topic": "daman/cal/sensor3_offset",
    "unit": "\u00b0C",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 300,
    "y": 280,
    "w": 420,
    "h": 60
  },
  {
    "panelId": "p_cal_act_3_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ACTUAL (\u00b0C)",
    "type": "text_output",
    "topic": "daman/sensor3",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "16",
    "x": 740,
    "y": 280,
    "w": 440,
    "h": 60
  },
  {
    "panelId": "p_cal_lbl_4_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "SENSOR-04",
    "type": "static_text",
    "topic": "daman/cal/lbl_4",
    "staticText": "SENSOR-04",
    "fontSize": "16",
    "textColor": "#ffffff",
    "bgColor": "#1e293b",
    "x": 20,
    "y": 350,
    "w": 260,
    "h": 60
  },
  {
    "panelId": "p_cal_off_4_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "OFFSET (\u00b0C)",
    "type": "text_input",
    "topic": "daman/cal/sensor4_offset",
    "unit": "\u00b0C",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 300,
    "y": 350,
    "w": 420,
    "h": 60
  },
  {
    "panelId": "p_cal_act_4_1786206817829",
    "dashboardId": "dash_daman_sensor_cal_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ACTUAL (\u00b0C)",
    "type": "text_output",
    "topic": "daman/sensor4",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "16",
    "x": 740,
    "y": 350,
    "w": 440,
    "h": 60
  },
  {
    "panelId": "p_sub_hdr_dash_daman_alarm_setting_1786206817829_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "Header Banner",
    "type": "static_text",
    "topic": "daman/sub/title",
    "staticText": "ALARM SETTINGS & LIVE ALARMS",
    "fontSize": "20",
    "textColor": "#38bdf8",
    "bgColor": "#030d22",
    "borderColor": "#0284c7",
    "borderWidth": 2,
    "borderRadius": 10,
    "textAlign": "center",
    "x": 360,
    "y": 15,
    "w": 460,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_home_dash_daman_alarm_setting_1786206817829_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HOME",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_home_1786206817829",
    "topic": "daman/nav/home",
    "bgColor": "#0284c7",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 20,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_nav_menu_dash_daman_alarm_setting_1786206817829_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "MENU",
    "type": "screen_jump",
    "targetScreenId": "dash_daman_menu_1786206817829",
    "topic": "daman/nav/menu",
    "bgColor": "#0369a1",
    "textColor": "#ffffff",
    "borderColor": "#38bdf8",
    "fontSize": "15",
    "x": 185,
    "y": 15,
    "w": 150,
    "h": 50
  },
  {
    "panelId": "p_sub_hum_dash_daman_alarm_setting_1786206817829_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "HUMIDITY",
    "type": "text_output",
    "topic": "daman/room/humidity",
    "unit": "%",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 840,
    "y": 15,
    "w": 160,
    "h": 50
  },
  {
    "panelId": "p_sub_temp_dash_daman_alarm_setting_1786206817829_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AVG TEMP",
    "type": "text_output",
    "topic": "daman/room/temp",
    "unit": "\u00b0C",
    "decimalPrecision": 1,
    "bgColor": "#022c22",
    "textColor": "#4ade80",
    "borderColor": "#16a34a",
    "fontSize": "15",
    "x": 1015,
    "y": 15,
    "w": 165,
    "h": 50
  },
  {
    "panelId": "p_alm_hi_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "TEMPERATURE HIGH ALARM",
    "type": "text_input",
    "topic": "daman/alarm/temp_hi",
    "unit": "\u00b0C",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 90,
    "w": 380,
    "h": 70
  },
  {
    "panelId": "p_alm_lo_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "TEMPERATURE LOW ALARM",
    "type": "text_input",
    "topic": "daman/alarm/temp_lo",
    "unit": "\u00b0C",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 170,
    "w": 380,
    "h": 70
  },
  {
    "panelId": "p_alm_pwr_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "AC POWER FAIL DELAY",
    "type": "text_input",
    "topic": "daman/alarm/pwr_delay",
    "unit": "min",
    "bgColor": "#422006",
    "textColor": "#fef08a",
    "borderColor": "#eab308",
    "fontSize": "16",
    "x": 20,
    "y": 250,
    "w": 380,
    "h": 70
  },
  {
    "panelId": "p_alm_reset_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ALARM RESET",
    "type": "button",
    "topic": "daman/alarm/reset",
    "buttonPayload": "RESET",
    "bgColor": "#dc2626",
    "textColor": "#ffffff",
    "fontSize": "16",
    "x": 20,
    "y": 335,
    "w": 180,
    "h": 60
  },
  {
    "panelId": "p_alm_hooter_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "ACK HOOTER",
    "type": "button",
    "topic": "daman/alarm/ack_hooter",
    "buttonPayload": "ACK",
    "bgColor": "#d97706",
    "textColor": "#ffffff",
    "fontSize": "16",
    "x": 220,
    "y": 335,
    "w": 180,
    "h": 60
  },
  {
    "panelId": "p_alm_log_1786206817829",
    "dashboardId": "dash_daman_alarm_setting_1786206817829",
    "connectionId": "conn_demo",
    "panelName": "LIVE ALARMS LOG",
    "type": "log",
    "topic": "daman/alarm/log",
    "bgColor": "#020617",
    "textColor": "#ef4444",
    "borderColor": "#ef4444",
    "fontSize": "14",
    "x": 420,
    "y": 90,
    "w": 760,
    "h": 305
  }
],
  driverConnections: [
    {
      connectionId: 'conn_modbus_local',
      connectionName: 'Local Modbus TCP Server',
      protocol: 'modbus_tcp',
      host: '127.0.0.1',
      port: 502,
      unitId: 1,
      enabled: true,
      connected: false
    }
  ],
  driverTags: [
    {
      tagId: 'tag_modbus_reg0',
      tagName: 'Modbus_Holding_Reg_0',
      protocol: 'modbus_tcp',
      sourceType: 'manual',
      connectionId: 'conn_modbus_local',
      registerType: 'holding_register',
      address: 0,
      dataType: 'int16',
      accessType: 'read',
      pollRate: 100,
      enabled: true,
      unit: ''
    }
  ],
  historianConfig: {
    enabled: true,
    logIntervalSeconds: 10,
    retentionValue: 30,
    retentionUnit: 'DAYS',
    logStorageCapMb: 1000,
    archiveAfterMonths: 1,
    archiveClusterDuration: '1_WEEK'
  },
  historianTags: [],
  userRole: 'gate',
  productEdition: ProductEdition.LANDING
};

export function useSessionEngine() {
  const [appState, setAppState] = useState<AppState>(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isExplicitGate = params?.has('gate') || params?.has('landing') || (typeof window !== 'undefined' && (window.location.hash === '#gate' || window.location.hash === '#landing'));

    const persisted = loadPersistedState();
    if (persisted) {
      if (isExplicitGate) {
        persisted.userRole = 'gate';
        persisted.productEdition = ProductEdition.LANDING;
      }
      return persisted;
    }
    return sanitizeAppState(INITIAL_STATE);
  });

  // User Role & Product Edition State
  const [userRole, setUserRole] = useState<'admin' | 'client' | 'gate' | 'community'>(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params?.has('gate') || params?.has('landing') || (typeof window !== 'undefined' && (window.location.hash === '#gate' || window.location.hash === '#landing'))) {
      return 'gate';
    }
    return appState.userRole || 'gate';
  });

  const [productEdition, setProductEdition] = useState<ProductEdition>(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params?.has('gate') || params?.has('landing') || (typeof window !== 'undefined' && (window.location.hash === '#gate' || window.location.hash === '#landing'))) {
      return ProductEdition.LANDING;
    }
    return appState.productEdition || ProductEdition.LANDING;
  });

  const [clientInfo, setClientInfo] = useState<AppState['clientInfo']>(() => {
    return appState.clientInfo || undefined;
  });

  const [isExportClientPackageOpen, setIsExportClientPackageOpen] = useState(false);
  const [showClientReadOnlyNotice, setShowClientReadOnlyNotice] = useState(false);
  const [communityLimitNotice, setCommunityLimitNotice] = useState<string | null>(null);
  const [isExitSessionModalOpen, setIsExitSessionModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isHistorianPrivateBrowsing, setIsHistorianPrivateBrowsing] = useState(false);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Client setup persistence acknowledgement state
  const [isClientSetupSaved, setIsClientSetupSaved] = useState<boolean>(() => {
    try {
      return !!getCommercialSavedPackage();
    } catch {
      return false;
    }
  });

  // Security PIN modal state & Runtime Control Safeguard
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'enter' | 'set'>('enter');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isRuntimeUnlocked, setIsRuntimeUnlocked] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => appState.isLocked ?? false);
  const [showLockedNotice, setShowLockedNotice] = useState<boolean>(false);

  // Fullscreen state
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isVirtualFullscreen, setIsVirtualFullscreen] = useState(false);
  const isFullscreen = isNativeFullscreen || isVirtualFullscreen;
  const autoFullscreenDoneRef = useRef(false);

  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('tasc_product_tour_completed');
    } catch {
      return false;
    }
  });

  const [unreadScheduledReports, setUnreadScheduledReports] = useState<number>(0);

  // Auto-persist appState and theme changes
  useEffect(() => {
    savePersistedState(appState);
    applyThemeToDocument(appState.appTheme);
  }, [appState]);

  // Sync role/edition/clientInfo into appState
  useEffect(() => {
    setAppState(prev => ({
      ...prev,
      userRole,
      productEdition,
      clientInfo
    }));
  }, [userRole, productEdition, clientInfo]);

  // Initialize Telemetry Trend Historian DB on startup
  useEffect(() => {
    initTrendHistorianDB().then((ok) => {
      if (!ok) {
        setIsHistorianPrivateBrowsing(getIsPrivateBrowsing());
      }
    });

    const prunerTimer = setInterval(() => {
      const cfg = getHistorianRetentionConfig();
      if (cfg) {
        pruneFIFOByRetention(cfg.retentionValue, cfg.retentionUnit, cfg.storageCapMb);
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(prunerTimer);
  }, []);

  // Background report scheduler & unread count
  useEffect(() => {
    initReportScheduler();
    setUnreadScheduledReports(getUnreadScheduledCount());

    const onScheduledReportEvent = () => {
      setUnreadScheduledReports(getUnreadScheduledCount());
    };

    window.addEventListener('tasc_scheduled_report_event', onScheduledReportEvent);
    return () => window.removeEventListener('tasc_scheduled_report_event', onScheduledReportEvent);
  }, []);

  // Mobile haptic priming
  useEffect(() => {
    initMobileHapticPriming();
  }, []);

  // AI chunking worker
  useEffect(() => {
    const cleanup = initAiMemoryWorker();
    return cleanup;
  }, []);

  // Auto-initialize HistorianConfig and migrate legacy LineGraph pens if empty
  useEffect(() => {
    setAppState(prev => {
      let changed = false;
      let newHistConfig = prev.historianConfig;
      if (!newHistConfig) {
        newHistConfig = {
          enabled: true,
          logIntervalSeconds: 10,
          retentionValue: 30,
          retentionUnit: 'DAYS',
          logStorageCapMb: 1000,
          archiveAfterMonths: 1,
          archiveClusterDuration: '1_WEEK'
        };
        changed = true;
      }

      let newHistTags = prev.historianTags || [];
      if (newHistTags.length === 0 && prev.panels && prev.panels.length > 0) {
        const migrated: HistorianTag[] = [];
        prev.panels.forEach(p => {
          if (p.type === PanelType.LINE_GRAPH) {
            if (p.pens && p.pens.length > 0) {
              p.pens.forEach((pen, i) => {
                if (pen.topic || pen.driverTagId) {
                  migrated.push({
                    id: pen.id || `htag_${Date.now()}_${i}`,
                    name: pen.name || `Trend Pen ${i + 1}`,
                    sourceType: pen.driverTagId ? 'driver' : 'mqtt',
                    topic: pen.topic,
                    jsonPath: pen.jsonPath,
                    driverTagId: pen.driverTagId,
                    unit: pen.unit,
                    color: pen.color,
                    enabled: pen.loggingEnabled !== false,
                    createdAt: new Date().toISOString()
                  });
                }
              });
            } else if (p.topic || p.driverTagId) {
              migrated.push({
                id: `htag_${Date.now()}_0`,
                name: (p as any).title || p.panelName || 'Trend Signal',
                sourceType: p.driverTagId ? 'driver' : 'mqtt',
                topic: p.topic,
                jsonPath: p.jsonPath,
                driverTagId: p.driverTagId,
                unit: p.unit,
                color: (p as any).color || p.firstColor || '#38bdf8',
                enabled: true,
                createdAt: new Date().toISOString()
              });
            }
          }
        });
        if (migrated.length > 0) {
          newHistTags = migrated;
          changed = true;
        }
      }

      if (changed) {
        return {
          ...prev,
          historianConfig: newHistConfig,
          historianTags: newHistTags
        };
      }
      return prev;
    });
  }, []);

  // Lock notice auto-dismiss
  useEffect(() => {
    if (isLocked) {
      setShowLockedNotice(true);
      const timer = setTimeout(() => {
        setShowLockedNotice(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowLockedNotice(false);
    }
  }, [isLocked]);

  // Fullscreen listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNative = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsNativeFullscreen(isNative);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (isFullscreen) {
      setIsVirtualFullscreen(false);
      const isNative = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (isNative) {
        const exitFn =
          document.exitFullscreen ||
          (document as any).webkitExitFullscreen ||
          (document as any).mozCancelFullScreen ||
          (document as any).msExitFullscreen;
        if (exitFn) {
          try {
            exitFn.call(document).catch(() => {});
          } catch (err) {}
        }
      }
    } else {
      setIsVirtualFullscreen(true);
      const docEl = document.documentElement as any;
      const reqFn =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;
      if (reqFn) {
        try {
          reqFn.call(docEl).catch(() => {});
        } catch (err) {}
      }
    }
  };

  const handleExitFullscreen = () => {
    setIsVirtualFullscreen(false);
    const isNative = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    if (isNative) {
      const exitFn =
        document.exitFullscreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).mozCancelFullScreen ||
        (document as any).msExitFullscreen;
      if (exitFn) {
        try {
          exitFn.call(document).catch(() => {});
        } catch (err) {}
      }
    }
  };

  // Runtime safeguard auto-lock timeout logic
  const runtimeTimeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetRuntimeTimeoutTimer = useCallback(() => {
    if (runtimeTimeoutTimerRef.current) {
      clearTimeout(runtimeTimeoutTimerRef.current);
      runtimeTimeoutTimerRef.current = null;
    }

    const timeoutMinutes = appState.runtimePinTimeoutMinutes ?? 2;
    if (isRuntimeUnlocked && timeoutMinutes > 0) {
      const timeoutMs = timeoutMinutes * 60 * 1000;
      runtimeTimeoutTimerRef.current = setTimeout(() => {
        console.log(`Runtime safeguard auto-locked after ${timeoutMinutes} minutes idle timeout.`);
        setIsRuntimeUnlocked(false);
      }, timeoutMs);
    }
  }, [isRuntimeUnlocked, appState.runtimePinTimeoutMinutes]);

  useEffect(() => {
    resetRuntimeTimeoutTimer();
    return () => {
      if (runtimeTimeoutTimerRef.current) {
        clearTimeout(runtimeTimeoutTimerRef.current);
      }
    };
  }, [resetRuntimeTimeoutTimer]);

  const handleSaveAndExitSession = () => {
    // 1. Always save the full active project state directly to persisted localStorage
    savePersistedState(appState);

    // 2. Also save to commercial/client slot if multi-screen or not explicitly locked community
    saveCommercialState(appState);
    setIsClientSetupSaved(true);

    // 3. If community origin, also mirror to community demo slot
    const isCommunity = 
      appState.packageOrigin === 'community' ||
      userRole === 'community' || 
      productEdition === ProductEdition.COMMUNITY ||
      appState.clientInfo?.clientName === 'Community Edition Save';

    if (isCommunity) {
      saveCommunityState(appState);
    }

    setIsExitSessionModalOpen(false);
    setUserRole('gate');
    setProductEdition(ProductEdition.LANDING);
  };

  const handleExitSessionWithoutSave = () => {
    setIsExitSessionModalOpen(false);
    setUserRole('gate');
    setProductEdition(ProductEdition.LANDING);
  };

  const handleClearClientSavedSetup = () => {
    const cleanDefaultState = sanitizeAppState(INITIAL_STATE);
    clearClientSetupSaved();
    savePersistedState(cleanDefaultState);
    setIsClientSetupSaved(false);
    setAppState(cleanDefaultState);
    setClientInfo(undefined);
    autoFullscreenDoneRef.current = false;
    setUserRole('gate');
    setProductEdition(ProductEdition.LANDING);
  };

  const handleLoadSavedClientSetup = (onNavigateDashboard?: (dashId?: string, connId?: string) => void) => {
    try {
      const savedPkg = getCommercialSavedPackage();
      if (savedPkg && savedPkg.state) {
        const sanitized = sanitizeAppState(savedPkg.state);
        const newAppState: AppState = {
          ...sanitized,
          userRole: 'client',
          productEdition: ProductEdition.CLIENT_RUNTIME,
          packageOrigin: 'commercial',
          isLockedPackage: true
        };
        setAppState(newAppState);
        setUserRole('client');
        setProductEdition(ProductEdition.CLIENT_RUNTIME);
        if (sanitized.clientInfo) {
          setClientInfo(sanitized.clientInfo);
        }
        setIsClientSetupSaved(true);
        if (onNavigateDashboard) {
          onNavigateDashboard(sanitized.dashboards[0]?.dashboardId, sanitized.connections[0]?.connectionId);
        }
      }
    } catch (err) {
      console.error('Failed to load saved client setup:', err);
    }
  };

  const handleLoadSavedCommunitySetup = (asClientMode = false, onNavigateDashboard?: (dashId?: string, connId?: string) => void) => {
    try {
      const savedPkg = getCommunitySavedPackage();
      if (savedPkg && savedPkg.state) {
        const sanitized = sanitizeAppState(savedPkg.state);
        if (asClientMode) {
          const newAppState: AppState = {
            ...sanitized,
            userRole: 'client',
            productEdition: ProductEdition.CLIENT_RUNTIME,
            packageOrigin: 'community',
            isLockedPackage: true,
            clientInfo: {
              clientName: 'Community Edition Save',
              isSignedPackage: false
            }
          };
          setAppState(newAppState);
          setUserRole('client');
          setProductEdition(ProductEdition.CLIENT_RUNTIME);
        } else {
          const newAppState: AppState = {
            ...sanitized,
            userRole: 'community',
            productEdition: ProductEdition.COMMUNITY,
            packageOrigin: 'community',
            isLockedPackage: false
          };
          setAppState(newAppState);
          setUserRole('community');
          setProductEdition(ProductEdition.COMMUNITY);
        }

        if (onNavigateDashboard) {
          onNavigateDashboard(sanitized.dashboards[0]?.dashboardId, sanitized.connections[0]?.connectionId);
        }
      }
    } catch (err) {
      console.error('Failed to load saved community setup:', err);
    }
  };

  const handleRequestExitSession = () => {
    setIsExitSessionModalOpen(true);
  };

  const handleRequestClearAll = () => {
    setIsClearAllModalOpen(true);
  };

  const handleConfirmClearAll = () => {
    const cleanDefaultDash: Dashboard = {
      dashboardId: 'dash_main',
      dashboardName: 'Main Dashboard',
      connectionId: '',
      isHome: true,
      themeColor: '#f59e0b'
    };

    const newCleanState: AppState = {
      ...appState,
      connections: [],
      dashboards: [cleanDefaultDash],
      panels: [],
      driverConnections: [],
      driverTags: []
    };

    setAppState(newCleanState);
    savePersistedState(newCleanState);
    setIsClearAllModalOpen(false);
  };

  return {
    appState,
    setAppState,
    userRole,
    setUserRole,
    productEdition,
    setProductEdition,
    clientInfo,
    setClientInfo,
    isLocked,
    setIsLocked,
    showLockedNotice,
    setShowLockedNotice,
    isRuntimeUnlocked,
    setIsRuntimeUnlocked,
    pendingAction,
    setPendingAction,
    isPinModalOpen,
    setIsPinModalOpen,
    pinModalMode,
    setPinModalMode,
    isFullscreen,
    handleToggleFullscreen,
    handleExitFullscreen,
    autoFullscreenDoneRef,
    isTourOpen,
    setIsTourOpen,
    isHistorianPrivateBrowsing,
    unreadScheduledReports,
    setUnreadScheduledReports,
    isClientSetupSaved,
    setIsClientSetupSaved,
    isExportClientPackageOpen,
    setIsExportClientPackageOpen,
    showClientReadOnlyNotice,
    setShowClientReadOnlyNotice,
    communityLimitNotice,
    setCommunityLimitNotice,
    isExitSessionModalOpen,
    setIsExitSessionModalOpen,
    isClearAllModalOpen,
    setIsClearAllModalOpen,
    confirmModal,
    setConfirmModal,
    resetRuntimeTimeoutTimer,
    handleSaveAndExitSession,
    handleExitSessionWithoutSave,
    handleClearClientSavedSetup,
    handleLoadSavedClientSetup,
    handleLoadSavedCommunitySetup,
    handleRequestExitSession,
    handleRequestClearAll,
    handleConfirmClearAll
  };
}
