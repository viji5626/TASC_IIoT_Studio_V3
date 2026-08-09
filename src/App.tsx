import React, { useState, useEffect, useRef, useCallback } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { 
  AppView, 
  AppState, 
  MqttConnection, 
  Dashboard, 
  Panel, 
  PanelType,
  MqttMessageLog,
  ProductEdition,
  ActiveAlarm
} from './types';
import PanelCard from './components/PanelCard';
import BentoGrid from './components/BentoGrid';
import AddPanelModal from './components/AddPanelModal';
import EditPanelModal from './components/EditPanelModal';
import ClonePanelModal from './components/ClonePanelModal';
import AlarmModal from './components/AlarmModal';
import AddConnectionView from './components/AddConnectionView';
import AddDashboardView from './components/AddDashboardView';
import EditDashboardModal from './components/EditDashboardModal';
import DashboardMenu from './components/DashboardMenu';
import Sidebar from './components/Sidebar';
import SettingsView from './components/SettingsView';
import BackupRestoreView from './components/BackupRestoreView';
import ShareConnectionModal from './components/ShareConnectionModal';
import PinModal from './components/PinModal';
import ClientGateView from './components/ClientGateView';
import LandingPage from './components/LandingPage';
import ExportClientPackageModal from './components/ExportClientPackageModal';
import ExitSessionModal from './components/ExitSessionModal';
import ClearAllModal from './components/ClearAllModal';
import TopicManagerView from './components/TopicManagerView';
import TagManagerView from './components/TagManagerView';
import { registerCustomTag } from './utils/tagManager';
import AppLogo from './components/AppLogo';
import EngineeringChoiceModal from './components/EngineeringChoiceModal';
import WebHmiCanvasView from './components/WebHmiCanvasView';
import { getJsonValue, formatBrokerWebSocketUrl, mqttWildcardMatch } from './utils/mqttHelper';
import { applyThemeToDocument, getAppTheme } from './utils/theme';
import { EditionManager, sanitizeAppState } from './utils/EditionManager';
import { getSampleProject } from './utils/sampleProjectPreset';
import { ConfirmModal } from './components/ConfirmModal';
import { isPanelTripped } from './utils/tripHelper';
import { recordAlarmTriggerEvent, recordAlarmAckEvent, recordAlarmResolvedEvent } from './utils/alarmHistorianEngine';
import { AlarmHistorianModal } from './components/AlarmHistorianModal';

const sampleInitial = getSampleProject('conn_demo');

const INITIAL_STATE: AppState = {
  connections: [
    {
      connectionId: 'conn_demo',
      connectionName: 'LOCAL DEMO BROKER',
      brokerAddress: 'broker.emqx.io',
      port: 8084,
      protocol: 'Websocket',
      autoConnect: true,
      cleanSession: true,
      keepAlive: 60,
      enableWillMessage: false,
      connected: false
    }
  ],
  dashboards: sampleInitial.dashboards,
  panels: sampleInitial.panels
};

export function App() {
  // Persistence state
  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('mqtt_dash_pro_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.connections && parsed.dashboards && parsed.panels) {
          return sanitizeAppState(parsed);
        }
      }
    } catch {}
    return sanitizeAppState(INITIAL_STATE);
  });

  useEffect(() => {
    localStorage.setItem('mqtt_dash_pro_state', JSON.stringify(appState));
    applyThemeToDocument(appState.appTheme);
  }, [appState]);

  const activeThemeObj = getAppTheme(appState.appTheme);

  // User Role & Product Edition State
  const [userRole, setUserRole] = useState<'admin' | 'client' | 'gate' | 'community'>(() => {
    return appState.userRole || 'gate';
  });

  const [productEdition, setProductEdition] = useState<ProductEdition>(() => {
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
      activeDashboardId: 'dash_main',
      activeConnectionId: ''
    };

    setAppState(newCleanState);
    setActiveDashboardId('dash_main');
    setActiveConnectionId('');

    try {
      localStorage.setItem('mqtt_dash_pro_state', JSON.stringify(newCleanState));
    } catch {}

    setIsClearAllModalOpen(false);
  };

  const handleSaveAndExitSession = () => {
    try {
      localStorage.setItem('tasc_client_setup_saved', 'true');
      localStorage.setItem('mqtt_dash_pro_state', JSON.stringify(appState));
    } catch {}
    setIsClientSetupSaved(true);
    setIsExitSessionModalOpen(false);
    setUserRole('gate');
    setProductEdition(ProductEdition.LANDING);
  };

  const handleExitSessionWithoutSave = () => {
    setIsExitSessionModalOpen(false);
    setUserRole('gate');
    setProductEdition(ProductEdition.LANDING);
  };

  // Client setup persistence acknowledgement state
  const [isClientSetupSaved, setIsClientSetupSaved] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tasc_client_setup_saved') === 'true';
    } catch {
      return false;
    }
  });

  // Fullscreen state supporting both Native Browser Fullscreen and Mobile / Weblet Virtual Fullscreen
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isVirtualFullscreen, setIsVirtualFullscreen] = useState(false);

  const isFullscreen = isNativeFullscreen || isVirtualFullscreen;

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
          reqFn.call(docEl).catch(() => {
            // Virtual fullscreen handles mobile / Weblet app wrappers if native request is blocked
          });
        } catch (err) {
          // Virtual fullscreen handles mobile / Weblet app wrappers
        }
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

  const autoFullscreenDoneRef = useRef(false);

  const handleClearClientSavedSetup = () => {
    const cleanDefaultState = sanitizeAppState(INITIAL_STATE);
    try {
      localStorage.removeItem('tasc_client_setup_saved');
      localStorage.setItem('mqtt_dash_pro_state', JSON.stringify(cleanDefaultState));
    } catch {}
    setIsClientSetupSaved(false);
    setAppState(cleanDefaultState);
    setClientInfo(undefined);
    autoFullscreenDoneRef.current = false;
    setUserRole('gate');
    setProductEdition(ProductEdition.LANDING);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleLoadSavedClientSetup = () => {
    try {
      const saved = localStorage.getItem('mqtt_dash_pro_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.connections && parsed.dashboards) {
          const sanitized = sanitizeAppState(parsed);
          const newAppState: AppState = {
            ...sanitized,
            userRole: 'client',
            productEdition: ProductEdition.CLIENT_RUNTIME,
            isLockedPackage: true
          };
          setAppState(newAppState);
          setUserRole('client');
          setProductEdition(ProductEdition.CLIENT_RUNTIME);
          if (sanitized.clientInfo) {
            setClientInfo(sanitized.clientInfo);
          }
          if (sanitized.dashboards[0]) {
            setActiveDashboardId(sanitized.dashboards[0].dashboardId);
          }
          if (sanitized.connections[0]) {
            setActiveConnectionId(sanitized.connections[0].connectionId);
          }
          setIsClientSetupSaved(true);
          setCurrentView(AppView.DASHBOARD);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to load saved client setup:', err);
    }
  };

  // Sync state changes to persistence
  useEffect(() => {
    setAppState(prev => ({
      ...prev,
      userRole,
      productEdition,
      clientInfo
    }));
  }, [userRole, productEdition, clientInfo]);
  // View state
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  // Reset autoFullscreenDoneRef when not in Client Edition
  useEffect(() => {
    const isClient = userRole === 'client' || productEdition === ProductEdition.CLIENT_RUNTIME || !!appState.isLockedPackage;
    if (!isClient) {
      autoFullscreenDoneRef.current = false;
    }
  }, [userRole, productEdition, appState.isLockedPackage]);

  // Auto-fullscreen ONCE after 2 seconds when launching Client Edition
  useEffect(() => {
    const isClient = userRole === 'client' || productEdition === ProductEdition.CLIENT_RUNTIME || !!appState.isLockedPackage;
    if (isClient && currentView === AppView.DASHBOARD && !autoFullscreenDoneRef.current) {
      const timer = setTimeout(() => {
        if (!autoFullscreenDoneRef.current) {
          autoFullscreenDoneRef.current = true;
          if (!isFullscreen) {
            handleToggleFullscreen();
          }
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [userRole, productEdition, appState.isLockedPackage, currentView]);
  const [activeMode, setActiveMode] = useState<'grid' | 'hmi'>('grid');
  const [isEngineeringChoiceOpen, setIsEngineeringChoiceOpen] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState<string>(
    appState.connections[0]?.connectionId || ''
  );
  const [activeDashboardId, setActiveDashboardId] = useState<string>(
    appState.dashboards[0]?.dashboardId || ''
  );

  // UI Modals & Drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDashMenuOpen, setIsDashMenuOpen] = useState(false);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Partial<Panel> | null>(null);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [editingConnection, setEditingConnection] = useState<MqttConnection | undefined>(undefined);
  const [activeConnMenuId, setActiveConnMenuId] = useState<string | null>(null);
  const [activeDashTabMenuId, setActiveDashTabMenuId] = useState<string | null>(null);
  const [sharingConnection, setSharingConnection] = useState<MqttConnection | null>(null);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => appState.isLocked ?? false);
  const [showLockedNotice, setShowLockedNotice] = useState<boolean>(false);
  const [isLayoutMode, setIsLayoutMode] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);

  // Auto-dismiss locked notice after 5 seconds
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

  // Security PIN modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'enter' | 'set'>('enter');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const handleQuickResizePanel = (panelId: string, colSpan: number, rowSpan: number) => {
    setAppState(prev => ({
      ...prev,
      panels: prev.panels.map(p => p.panelId === panelId ? { ...p, colSpan, rowSpan } : p)
    }));
  };

  const handleToggleLock = () => {
    if (isLocked) {
      if (appState.editPin) {
        setPinModalMode('enter');
        setPendingAction(() => () => {
          setIsLocked(false);
          setAppState(prev => ({ ...prev, isLocked: false }));
        });
        setIsPinModalOpen(true);
      } else {
        setIsLocked(false);
        setAppState(prev => ({ ...prev, isLocked: false }));
      }
    } else {
      setIsLocked(true);
      setIsLayoutMode(false);
      setShowLockedNotice(true);
      setAppState(prev => ({ ...prev, isLocked: true }));
    }
  };

  const handleEditLayout = () => {
    if (isLocked) {
      if (appState.editPin) {
        setPinModalMode('enter');
        setPendingAction(() => () => {
          setIsLocked(false);
          setIsLayoutMode(true);
          setAppState(prev => ({ ...prev, isLocked: false }));
        });
        setIsPinModalOpen(true);
      } else {
        setIsLocked(false);
        setIsLayoutMode(true);
        setAppState(prev => ({ ...prev, isLocked: false }));
      }
    } else {
      setIsLayoutMode(prev => !prev);
    }
  };

  const handleOpenAddPanel = () => {
    if (isLocked) {
      if (appState.editPin) {
        setPinModalMode('enter');
        setPendingAction(() => () => {
          setIsLocked(false);
          setIsAddPanelOpen(true);
          setAppState(prev => ({ ...prev, isLocked: false }));
        });
        setIsPinModalOpen(true);
      } else {
        setIsLocked(false);
        setIsAddPanelOpen(true);
        setAppState(prev => ({ ...prev, isLocked: false }));
      }
    } else {
      setIsAddPanelOpen(true);
    }
  };

  // Simulation mode
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  // Real-time MQTT data stores
  const [latestValues, setLatestValues] = useState<Record<string, { val: any; time: string }>>({});
  const [historyValues, setHistoryValues] = useState<Record<string, { value: number; time: string }[]>>({});
  const [mqttLogs, setMqttLogs] = useState<MqttMessageLog[]>([]);
  const [mqttConnected, setMqttConnected] = useState(false);

  // Inbuilt Alarm System State & Haptic Control
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([]);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isAlarmHistorianModalOpen, setIsAlarmHistorianModalOpen] = useState(false);
  const [isVibrateEnabled, setIsVibrateEnabled] = useState(true);
  const [acknowledgedAlarms, setAcknowledgedAlarms] = useState<Record<string, boolean>>({});
  const [latestAlarmTriggered, setLatestAlarmTriggered] = useState<ActiveAlarm | null>(null);
  const prevAlarmKeysRef = useRef<string[]>([]);
  const prevAlarmCountRef = useRef<number>(0);

  // Live Alarm Evaluation Loop
  useEffect(() => {
    const newAlarmsList: ActiveAlarm[] = [];

    appState.panels.forEach(panel => {
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

    setActiveAlarms(newAlarmsList);

    // 1. Record triggered events into Historian Engine
    newAlarmsList.forEach(alarm => {
      const panelObj = appState.panels.find(p => p.panelId === alarm.panelId);
      recordAlarmTriggerEvent({
        alarmKey: alarm.alarmKey,
        panelId: alarm.panelId,
        panelName: alarm.panelName,
        dashboardId: alarm.dashboardId,
        zone: alarm.zone,
        value: alarm.value,
        unit: alarm.unit,
        threshold: alarm.threshold,
        message: alarm.message,
        color: alarm.color,
        timestamp: alarm.timestamp,
        topic: panelObj?.topic,
        jsonPath: panelObj?.tripJsonPath || panelObj?.jsonPath
      });
    });

    // 2. Detect cleared alarms and record resolution in Historian Engine
    const currentAlarmKeys = newAlarmsList.map(a => a.alarmKey);
    const clearedKeys = prevAlarmKeysRef.current.filter(k => !currentAlarmKeys.includes(k));
    clearedKeys.forEach(key => {
      recordAlarmResolvedEvent(key);
    });

    // Check if new alarm triggered or alarm count changed
    const newKeysFound = currentAlarmKeys.filter(k => !prevAlarmKeysRef.current.includes(k));
    const countChanged = newAlarmsList.length !== prevAlarmCountRef.current;

    if (newKeysFound.length > 0 || (countChanged && newAlarmsList.length > prevAlarmCountRef.current)) {
      const newestAlarm = newAlarmsList.find(a => newKeysFound.includes(a.alarmKey)) || newAlarmsList[newAlarmsList.length - 1];
      if (newestAlarm) {
        setLatestAlarmTriggered(newestAlarm);
      }

      // Automatically open alarm pop-up modal
      setIsAlarmModalOpen(true);

      // Trigger 5-second mobile vibration haptic
      if (isVibrateEnabled && typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([1000, 200, 1000, 200, 1000, 200, 1000]); // 5 seconds vibration pattern
        } catch (err) {
          console.warn('Vibration API not supported on this device:', err);
        }
      }
    }

    prevAlarmKeysRef.current = currentAlarmKeys;
    prevAlarmCountRef.current = newAlarmsList.length;
  }, [latestValues, appState.panels, acknowledgedAlarms, isVibrateEnabled]);

  const handleAcknowledgeAlarm = (alarmKey: string) => {
    setAcknowledgedAlarms(prev => ({ ...prev, [alarmKey]: true }));
    recordAlarmAckEvent(alarmKey);
  };

  const handleAcknowledgeAllAlarms = () => {
    const updated: Record<string, boolean> = {};
    activeAlarms.forEach(a => {
      updated[a.alarmKey] = true;
      recordAlarmAckEvent(a.alarmKey);
    });
    setAcknowledgedAlarms(prev => ({ ...prev, ...updated }));
  };

  const clientRef = useRef<MqttClient | null>(null);

  // Active Connection & Dashboard
  const activeConnection = appState.connections.find(c => c.connectionId === activeConnectionId) || appState.connections[0];
  
  // Get dashboards belonging to active connection
  const activeConnectionDashboards = appState.dashboards.filter(
    d => d.connectionId === activeConnection?.connectionId
  );

  const activeDashboard = 
    activeConnectionDashboards.find(d => d.dashboardId === activeDashboardId) ||
    activeConnectionDashboards[0] ||
    appState.dashboards.find(d => d.dashboardId === activeDashboardId) ||
    appState.dashboards[0];

  const activePanels = appState.panels.filter(p => p.dashboardId === activeDashboard?.dashboardId);

  // Always up-to-date refs for stable callback closures
  const appStateRef = useRef(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const activeDashboardRef = useRef(activeDashboard);
  useEffect(() => {
    activeDashboardRef.current = activeDashboard;
  }, [activeDashboard]);

  // Ensure every active connection has at least one dashboard
  useEffect(() => {
    if (!activeConnection) return;
    const dashesForConn = appState.dashboards.filter(d => d.connectionId === activeConnection.connectionId);
    if (dashesForConn.length === 0) {
      const defaultDash: Dashboard = {
        dashboardId: `dash_${Date.now()}`,
        dashboardName: `${activeConnection.connectionName || 'Broker'} Dashboard`,
        connectionId: activeConnection.connectionId,
        isHome: true,
        icon: 'fa-house',
        themeColor: '#0ea5e9'
      };
      setAppState(prev => ({
        ...prev,
        dashboards: [...prev.dashboards, defaultDash]
      }));
      setActiveDashboardId(defaultDash.dashboardId);
    }
  }, [activeConnection, appState.dashboards]);

  // Sync activeDashboardId when activeConnectionId changes
  useEffect(() => {
    if (!activeConnectionId) return;
    const connDashboards = appState.dashboards.filter(d => d.connectionId === activeConnectionId);
    if (connDashboards.length > 0) {
      const isCurrentInConn = connDashboards.some(d => d.dashboardId === activeDashboardId);
      if (!isCurrentInConn) {
        setActiveDashboardId(connDashboards[0].dashboardId);
      }
    }
  }, [activeConnectionId, appState.dashboards]);

  const handleSelectDashboard = (dashId: string) => {
    const targetDash = appState.dashboards.find(d => d.dashboardId === dashId);
    if (targetDash) {
      setActiveDashboardId(targetDash.dashboardId);
      if (targetDash.connectionId) {
        setActiveConnectionId(targetDash.connectionId);
      }
    } else {
      setActiveDashboardId(dashId);
    }
  };

  // Helper for message payload parsing
  const processIncomingMessage = useCallback((topic: string, payloadStr: string) => {
    const timeStr = new Date().toLocaleTimeString();

    setMqttLogs(prev => [
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        topic,
        payload: payloadStr,
        timestamp: timeStr
      },
      ...prev.slice(0, 99)
    ]);

    const cleanTopic = topic.trim();
    const currentAppState = appStateRef.current;
    const currentDash = activeDashboardRef.current;

    // Update panel matching topics
    currentAppState.panels.forEach(panel => {
      if (!panel.topic && !panel.publishTopic) return;
      const rawTopics = [panel.topic?.trim(), panel.publishTopic?.trim()].filter(Boolean) as string[];
      const prefix = currentDash?.prefixTopic ? currentDash.prefixTopic.trim() : '';

      let matches = false;
      for (const rawPanelTopic of rawTopics) {
        const fullTopic = panel.disableDashboardPrefix 
          ? rawPanelTopic 
          : `${prefix}${rawPanelTopic}`;

        if (
          cleanTopic === fullTopic ||
          cleanTopic === rawPanelTopic ||
          cleanTopic.endsWith('/' + rawPanelTopic) ||
          cleanTopic.endsWith(rawPanelTopic) ||
          rawPanelTopic.endsWith('/' + cleanTopic) ||
          mqttWildcardMatch(fullTopic, cleanTopic) ||
          mqttWildcardMatch(rawPanelTopic, cleanTopic)
        ) {
          matches = true;
          break;
        }
      }

      if (matches) {
        let extracted: any = payloadStr;

        if (panel.jsonPath) {
          const jsonVal = getJsonValue(payloadStr, panel.jsonPath);
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

        setLatestValues(prev => {
          const existing = prev[panel.panelId];
          return {
            ...prev,
            [panel.panelId]: {
              val: extracted,
              rawPayload: payloadStr,
              time: timeStr,
              sentTime: existing?.sentTime
            }
          };
        });

        const numVal = typeof extracted === 'number' ? extracted : parseFloat(extracted);
        if (!isNaN(numVal)) {
          setHistoryValues(prev => ({
            ...prev,
            [panel.panelId]: [
              ...(prev[panel.panelId] || []),
              { value: numVal, time: timeStr }
            ].slice(-30)
          }));
        }
      }
    });
  }, []);

  // MQTT Connection Manager
  useEffect(() => {
    if (!activeConnection || isSimulated) {
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
      setMqttConnected(false);
      return;
    }

    try {
      const wsUrl = formatBrokerWebSocketUrl(activeConnection);
      console.log('Connecting to MQTT WebSocket:', wsUrl);

      const client = mqtt.connect(wsUrl, {
        clientId: activeConnection.clientId || `mqtt_dash_${Math.random().toString(16).substring(2, 8)}`,
        username: activeConnection.username || undefined,
        password: activeConnection.password || undefined,
        keepalive: activeConnection.keepAlive || 60,
        clean: activeConnection.cleanSession,
        reconnectPeriod: 5000,
        connectTimeout: 10000
      });

      clientRef.current = client;

      client.on('connect', () => {
        setMqttConnected(true);
        console.log('MQTT Connected successfully to', activeConnection.connectionName);
      });

      client.on('message', (topic, message) => {
        processIncomingMessage(topic, message.toString());
      });

      client.on('error', (err) => {
        console.warn('MQTT connection error:', err);
        setMqttConnected(false);
      });

      client.on('close', () => {
        setMqttConnected(false);
      });

      return () => {
        if (client) {
          client.end(true);
        }
      };
    } catch (err) {
      console.warn('Failed to initialize MQTT connection:', err);
      setMqttConnected(false);
    }
  }, [
    activeConnection?.connectionId, 
    activeConnection?.brokerAddress, 
    activeConnection?.port, 
    activeConnection?.protocol, 
    isSimulated, 
    processIncomingMessage
  ]);

  // MQTT Dynamic Topic Subscriptions Manager
  useEffect(() => {
    if (!mqttConnected || !clientRef.current || isSimulated) return;

    const topicsToSubscribe = new Set<string>();

    appState.panels.forEach(panel => {
      const rawTopics = [panel.topic?.trim(), panel.publishTopic?.trim(), panel.tripTopic?.trim()].filter(Boolean) as string[];
      rawTopics.forEach(rawTopic => {
        topicsToSubscribe.add(rawTopic);
        if (activeDashboard?.prefixTopic) {
          topicsToSubscribe.add(`${activeDashboard.prefixTopic.trim()}${rawTopic}`);
        }
      });
    });

    if (activeDashboard?.prefixTopic && activeDashboard.prefixTopic.trim()) {
      const p = activeDashboard.prefixTopic.trim();
      topicsToSubscribe.add(p.endsWith('/') ? `${p}#` : `${p}/#`);
    }

    topicsToSubscribe.forEach(topic => {
      try {
        clientRef.current?.subscribe(topic, { qos: 0 }, (err) => {
          if (err) {
            console.warn(`Failed to subscribe to topic ${topic}:`, err);
          } else {
            console.log(`Subscribed to topic: ${topic}`);
          }
        });
      } catch (e) {
        console.warn(`Error subscribing to ${topic}:`, e);
      }
    });
  }, [mqttConnected, appState.panels, activeDashboard?.prefixTopic, isSimulated]);

  // Demo Data Simulation Engine
  useEffect(() => {
    if (!isSimulated) return;

    const interval = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString();

      activePanels.forEach(panel => {
        let simVal: any;

        switch (panel.type) {
          case PanelType.GAUGE: {
            const min = panel.payloadMin ?? 10;
            const max = panel.payloadMax ?? 50;
            const prev = latestValues[panel.panelId]?.val ?? (min + (max - min) / 2);
            simVal = Math.max(min, Math.min(max, prev + (Math.random() - 0.48) * 3));
            break;
          }
          case PanelType.LINE_GRAPH: {
            const prev = latestValues[panel.panelId]?.val ?? 12.5;
            simVal = Math.max(0, prev + (Math.random() - 0.49) * 2.5);
            break;
          }
          case PanelType.PROGRESS: {
            const prev = latestValues[panel.panelId]?.val ?? 80;
            simVal = Math.max(10, Math.min(100, prev + (Math.random() - 0.52) * 2));
            break;
          }
          case PanelType.LED:
            simVal = Math.random() > 0.3 ? '1' : '0';
            break;
          case PanelType.NODE_STATUS:
            simVal = 'online';
            break;
          case PanelType.IMAGE:
          case 'image' as any:
          case 'symbol' as any: {
            if (panel.symbolId || panel.symbolAnimType) {
              const min = panel.payloadMin ?? 0;
              const max = panel.payloadMax ?? 100;
              const prev = latestValues[panel.panelId]?.val ?? (min + (max - min) * 0.85);
              simVal = Math.max(min, Math.min(max, prev + (Math.random() - 0.48) * 3));
            } else {
              return;
            }
            break;
          }
          default:
            return;
        }

        setLatestValues(prev => {
          const existing = prev[panel.panelId];
          return {
            ...prev,
            [panel.panelId]: {
              val: simVal,
              time: timeStr,
              sentTime: existing?.sentTime
            }
          };
        });

        const numVal = typeof simVal === 'number' ? simVal : parseFloat(simVal);
        if (!isNaN(numVal)) {
          setHistoryValues(prev => ({
            ...prev,
            [panel.panelId]: [
              ...(prev[panel.panelId] || []),
              { value: numVal, time: timeStr }
            ].slice(-30)
          }));
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulated, activePanels, latestValues]);

  // Publish MQTT Handler
  const handlePublish = (topic: string, payload: string | number) => {
    const timeStr = new Date().toLocaleTimeString();
    const payloadStr = String(payload);

    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish(topic, payloadStr);
    }

    setMqttLogs(prev => [
      {
        id: `pub_${Date.now()}`,
        topic,
        payload: `[PUBLISHED] ${payloadStr}`,
        timestamp: timeStr
      },
      ...prev.slice(0, 99)
    ]);

    // Local echo & publish timestamp update
    const currentDash = activeDashboardRef.current;
    const prefix = currentDash?.prefixTopic ? currentDash.prefixTopic.trim() : '';

    appState.panels.forEach(p => {
      const rawTopics = [p.topic?.trim(), p.publishTopic?.trim()].filter(Boolean) as string[];
      const isMatch = rawTopics.some(rt => {
        const fullTopic = p.disableDashboardPrefix ? rt : `${prefix}${rt}`;
        return topic === rt || topic === fullTopic || topic.endsWith('/' + rt) || topic.endsWith(rt);
      });

      if (isMatch) {
        let extractedVal: any = payload;
        if (p.isJSONPayload || p.jsonPath || (typeof payload === 'string' && (payload.startsWith('{') || payload.startsWith('[')))) {
          const parsed = getJsonValue(payload, p.jsonPath || '');
          if (parsed !== undefined) {
            extractedVal = parsed;
          }
        }
        setLatestValues(prev => {
          const existing = prev[p.panelId];
          return {
            ...prev,
            [p.panelId]: {
              val: extractedVal,
              time: existing?.time || '',
              sentTime: timeStr
            }
          };
        });
      }
    });
  };

  // Panel CRUD
  const handleAddPanelSelect = (type: string) => {
    setIsAddPanelOpen(false);
    const editionMgr = EditionManager.fromState(appState);
    const check = editionMgr.CanCreateWidget(appState, 1);
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      } else if (check.reason) {
        setCommunityLimitNotice(check.reason);
        setTimeout(() => setCommunityLimitNotice(null), 5000);
      }
      return;
    }

    let targetDashId = activeDashboard?.dashboardId;
    let targetConnId = activeConnection?.connectionId || appState.connections[0]?.connectionId || 'conn_demo';

    if (!targetDashId) {
      targetDashId = `dash_${Date.now()}`;
      const autoDash: Dashboard = {
        dashboardId: targetDashId,
        dashboardName: 'Main Dashboard',
        connectionId: targetConnId,
        isHome: true,
        icon: 'fa-house',
        themeColor: '#0ea5e9'
      };
      setAppState(prev => ({ ...prev, dashboards: [...prev.dashboards, autoDash] }));
      setActiveDashboardId(targetDashId);
    }

    setEditingPanel({
      type,
      dashboardId: targetDashId,
      connectionId: targetConnId,
      panelName: `New ${type.toUpperCase()}`,
      topic: `sensors/${type}`,
      qos: 0
    });
  };

  const handleSavePanel = (panelData: any) => {
    const editionMgr = EditionManager.fromState(appState);
    const isNewPanel = !panelData.panelId || !appState.panels.some(p => p.panelId === panelData.panelId);

    if (isNewPanel) {
      const check = editionMgr.CanCreateWidget(appState, 1);
      if (!check.allowed) {
        if (editionMgr.IsClient()) {
          setShowClientReadOnlyNotice(true);
          setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
        } else if (check.reason) {
          setCommunityLimitNotice(check.reason);
          setTimeout(() => setCommunityLimitNotice(null), 5000);
        }
        setEditingPanel(null);
        return;
      }
    } else {
      const check = editionMgr.CanEditWidget();
      if (!check.allowed) {
        if (editionMgr.IsClient()) {
          setShowClientReadOnlyNotice(true);
          setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
        }
        setEditingPanel(null);
        return;
      }
    }

    const targetConnId = panelData.connectionId || activeConnection?.connectionId || appState.connections[0]?.connectionId || 'conn_demo';
    let targetDashId = panelData.dashboardId || activeDashboard?.dashboardId || activeConnectionDashboards[0]?.dashboardId;

    let updatedDashboards = appState.dashboards;
    if (!targetDashId) {
      targetDashId = `dash_${Date.now()}`;
      const autoDash: Dashboard = {
        dashboardId: targetDashId,
        dashboardName: 'Main Dashboard',
        connectionId: targetConnId,
        isHome: true,
        icon: 'fa-house',
        themeColor: '#0ea5e9'
      };
      updatedDashboards = [...updatedDashboards, autoDash];
    }

    const completePanel: Panel = {
      ...panelData,
      dashboardId: targetDashId,
      connectionId: targetConnId,
      panelId: panelData.panelId || `panel_${Date.now()}`
    };

    setAppState(prev => {
      const existingPanelIdx = prev.panels.findIndex(p => p.panelId === completePanel.panelId);
      const newPanels = existingPanelIdx >= 0
        ? prev.panels.map(p => p.panelId === completePanel.panelId ? completePanel : p)
        : [...prev.panels, completePanel];

      let nextState: AppState = {
        ...prev,
        dashboards: updatedDashboards,
        panels: newPanels
      };

      if (completePanel.jsonPath && completePanel.jsonPath.trim()) {
        nextState = registerCustomTag(nextState, {
          tagName: completePanel.jsonPath.trim(),
          tagType: 'read',
          sourceType: 'manual',
          parsingDefinition: completePanel.jsonPath.trim(),
          description: `Used by widget ${completePanel.panelName}`
        });
      }

      if (completePanel.publishPattern && completePanel.publishPattern.trim()) {
        nextState = registerCustomTag(nextState, {
          tagName: completePanel.publishPattern.trim(),
          tagType: 'write',
          sourceType: 'manual',
          parsingDefinition: completePanel.publishPattern.trim(),
          description: `Used by widget ${completePanel.panelName}`
        });
      }

      return nextState;
    });

    setActiveConnectionId(targetConnId);
    setActiveDashboardId(targetDashId);
    setCurrentView(AppView.DASHBOARD);
    setEditingPanel(null);
  };

  const handleDeletePanel = (panelId: string) => {
    const editionMgr = EditionManager.fromState({ ...appState, userRole });
    const check = editionMgr.CanDeleteWidget();
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      }
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Delete Widget',
      message: 'Are you sure you want to delete this widget?',
      confirmLabel: 'Delete Widget',
      confirmVariant: 'danger',
      onConfirm: () => {
        setAppState(prev => ({ ...prev, panels: prev.panels.filter(p => p.panelId !== panelId) }));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleClonePanels = (panelIds: string[]) => {
    const editionMgr = EditionManager.fromState(appState);
    const check = editionMgr.CanCloneWidget(appState, panelIds.length);
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      } else if (check.reason) {
        setCommunityLimitNotice(check.reason);
        setTimeout(() => setCommunityLimitNotice(null), 5000);
      }
      setIsCloneModalOpen(false);
      return;
    }

    const cloned = appState.panels
      .filter(p => panelIds.includes(p.panelId))
      .map(p => ({
        ...p,
        panelId: `panel_clone_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        dashboardId: activeDashboard?.dashboardId || p.dashboardId,
        panelName: `${p.panelName} (Copy)`
      }));

    setAppState(prev => ({ ...prev, panels: [...prev.panels, ...cloned] }));
    setIsCloneModalOpen(false);
  };

  const handleQuickClonePanel = (panel: Panel) => {
    const editionMgr = EditionManager.fromState(appState);
    const check = editionMgr.CanCloneWidget(appState, 1);
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      } else if (check.reason) {
        setCommunityLimitNotice(check.reason);
        setTimeout(() => setCommunityLimitNotice(null), 5000);
      }
      return;
    }
    handleClonePanels([panel.panelId]);
  };

  const handleReorderPanels = (reorderedActivePanels: Panel[]) => {
    if (!activeDashboard) return;
    setAppState(prev => {
      const otherPanels = prev.panels.filter(p => p.dashboardId !== activeDashboard.dashboardId);
      return {
        ...prev,
        panels: [...otherPanels, ...reorderedActivePanels]
      };
    });
  };

  // Connection CRUD
  const handleCreateConnection = (connData: MqttConnection, dashboardsData: Dashboard[]) => {
    const editionMgr = EditionManager.fromState(appState);
    const check = editionMgr.CanEditBroker();
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      }
      setCurrentView(AppView.DASHBOARD);
      return;
    }

    const connId = connData.connectionId || `conn_${Date.now()}`;
    const newConn = { ...connData, connectionId: connId };

    const formattedDashboards = dashboardsData.map(d => ({ ...d, connectionId: connId }));

    setAppState(prev => {
      const existingConnIdx = prev.connections.findIndex(c => c.connectionId === connId);
      const newConns = existingConnIdx >= 0 
        ? prev.connections.map(c => c.connectionId === connId ? newConn : c)
        : [...prev.connections, newConn];

      let updatedDashboards = [...prev.dashboards];

      if (formattedDashboards.length > 0) {
        const otherDashes = prev.dashboards.filter(d => d.connectionId !== connId);
        updatedDashboards = [...otherDashes, ...formattedDashboards];
      } else if (prev.dashboards.length === 0) {
        // Only if there are ZERO dashboards in the whole app, create a default Main Dashboard
        const defaultDash: Dashboard = {
          dashboardId: `dash_${Date.now()}`,
          dashboardName: 'Main Dashboard',
          connectionId: connId,
          isHome: true,
          icon: 'fa-house',
          themeColor: '#0ea5e9'
        };
        updatedDashboards = [defaultDash];
      } else {
        // Associate connectionId with dashboards that don't have one set
        updatedDashboards = prev.dashboards.map(d => !d.connectionId ? { ...d, connectionId: connId } : d);
      }

      return {
        ...prev,
        connections: newConns,
        dashboards: updatedDashboards
      };
    });

    setActiveConnectionId(connId);

    if (formattedDashboards.length > 0) {
      setActiveDashboardId(formattedDashboards[0].dashboardId);
    } else {
      setAppState(prev => {
        if (!prev.dashboards.some(d => d.dashboardId === activeDashboardId) && prev.dashboards.length > 0) {
          const homeOrFirst = prev.dashboards.find(d => d.isHome) || prev.dashboards[0];
          setActiveDashboardId(homeOrFirst.dashboardId);
        }
        return prev;
      });
    }

    setCurrentView(AppView.DASHBOARD);
  };

  const handleDeleteConnection = (connId: string) => {
    const editionMgr = EditionManager.fromState({ ...appState, userRole });
    const check = editionMgr.CanDeleteBroker();
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      }
      return;
    }
    const targetConn = appState.connections.find(c => c.connectionId === connId);
    const connName = targetConn ? targetConn.connectionName : 'this connection';

    setConfirmModal({
      isOpen: true,
      title: 'Delete Connection',
      message: `Are you sure you want to delete "${connName}" and all associated dashboards and widgets?`,
      confirmLabel: 'Delete Connection',
      confirmVariant: 'danger',
      onConfirm: () => {
        setAppState(prev => ({
          ...prev,
          connections: prev.connections.filter(c => c.connectionId !== connId),
          dashboards: prev.dashboards.filter(d => d.connectionId !== connId),
          panels: prev.panels.filter(p => p.connectionId !== connId)
        }));
        setActiveConnMenuId(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleCopyConnection = (connId: string) => {
    const editionMgr = EditionManager.fromState({ ...appState, userRole });
    const check = editionMgr.CanEditBroker();
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      }
      return;
    }

    const sourceConn = appState.connections.find(c => c.connectionId === connId);
    if (!sourceConn) return;

    const newConnId = `conn_${Date.now()}`;
    const newConn: MqttConnection = {
      ...sourceConn,
      connectionId: newConnId,
      connectionName: `${sourceConn.connectionName} (Copy)`
    };

    const sourceDashboards = appState.dashboards.filter(d => d.connectionId === connId);
    const dashIdMap: Record<string, string> = {};

    const newDashboards: Dashboard[] = sourceDashboards.map(d => {
      const newDashId = `dash_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      dashIdMap[d.dashboardId] = newDashId;
      return {
        ...d,
        dashboardId: newDashId,
        connectionId: newConnId
      };
    });

    const sourcePanels = appState.panels.filter(p => sourceDashboards.some(d => d.dashboardId === p.dashboardId));
    const newPanels: Panel[] = sourcePanels.map(p => ({
      ...p,
      panelId: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      connectionId: newConnId,
      dashboardId: dashIdMap[p.dashboardId] || p.dashboardId
    }));

    setAppState(prev => ({
      ...prev,
      connections: [...prev.connections, newConn],
      dashboards: [...prev.dashboards, ...newDashboards],
      panels: [...prev.panels, ...newPanels]
    }));
    setActiveConnMenuId(null);
  };

  const handleDeleteDashboard = (dashId: string) => {
    const editionMgr = EditionManager.fromState({ ...appState, userRole });
    const check = editionMgr.CanDeleteScreen();
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      }
      return;
    }

    const targetDash = appState.dashboards.find(d => d.dashboardId === dashId);
    const dashName = targetDash ? targetDash.name : 'this screen';

    setConfirmModal({
      isOpen: true,
      title: 'Delete Screen / Dashboard',
      message: `Are you sure you want to delete "${dashName}"? All widgets on this screen will be permanently removed.`,
      confirmLabel: 'Delete Screen',
      confirmVariant: 'danger',
      onConfirm: () => {
        setAppState(prev => {
          let remainingDashboards = prev.dashboards.filter(d => d.dashboardId !== dashId);
          if (remainingDashboards.length === 0) {
            const newDefaultDash: Dashboard = {
              dashboardId: `dash_main_${Date.now()}`,
              dashboardName: 'Main Screen',
              connectionId: prev.connections[0]?.connectionId || '',
              isHome: true,
              icon: 'fa-desktop',
              themeColor: '#38bdf8'
            };
            remainingDashboards = [newDefaultDash];
            setActiveDashboardId(newDefaultDash.dashboardId);
          } else {
            if (!remainingDashboards.some(d => d.isHome)) {
              remainingDashboards[0] = { ...remainingDashboards[0], isHome: true };
            }
            if (activeDashboardId === dashId) {
              const homeDash = remainingDashboards.find(d => d.isHome) || remainingDashboards[0];
              setActiveDashboardId(homeDash.dashboardId);
            }
          }
          return {
            ...prev,
            dashboards: remainingDashboards,
            panels: prev.panels.filter(p => p.dashboardId !== dashId)
          };
        });
        setActiveDashTabMenuId(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleCopyDashboard = (dashId: string) => {
    const editionMgr = EditionManager.fromState(appState);
    const check = editionMgr.CanCreateScreen(appState);
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      } else if (check.reason) {
        setCommunityLimitNotice(check.reason);
        setTimeout(() => setCommunityLimitNotice(null), 5000);
      }
      return;
    }

    const sourceDash = appState.dashboards.find(d => d.dashboardId === dashId);
    if (!sourceDash) return;

    const newDashId = `dash_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newDash: Dashboard = {
      ...sourceDash,
      dashboardId: newDashId,
      dashboardName: `${sourceDash.dashboardName} (Copy)`
    };

    const sourcePanels = appState.panels.filter(p => p.dashboardId === dashId);
    const newPanels: Panel[] = sourcePanels.map(p => ({
      ...p,
      panelId: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      dashboardId: newDashId
    }));

    setAppState(prev => ({
      ...prev,
      dashboards: [...prev.dashboards, newDash],
      panels: [...prev.panels, ...newPanels]
    }));
    setActiveDashboardId(newDashId);
  };

  const handleEditDashboard = (dash: Dashboard) => {
    const editionMgr = EditionManager.fromState(appState);
    const check = editionMgr.CanEditScreen();
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      }
      return;
    }

    setEditingDashboard(dash);
  };

  const handleOpenActiveBrokerSettings = () => {
    const editionMgr = EditionManager.fromState(appState);
    const check = editionMgr.CanEditBroker();
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      }
      return;
    }
    const conn = appState.connections.find(c => c.connectionId === activeConnectionId) || appState.connections[0];
    if (conn) {
      setEditingConnection(conn);
      setCurrentView(AppView.ADD_CONNECTION);
    }
  };

  const handleShareDashboard = (dash: Dashboard) => {
    const conn = appState.connections.find(c => c.connectionId === dash.connectionId);
    if (conn) {
      setSharingConnection(conn);
    }
  };

  // Render Landing Page view when on startup gate
  if (userRole === 'gate' || productEdition === ProductEdition.LANDING) {
    return (
      <LandingPage
        appState={appState}
        hasSavedClientSetup={isClientSetupSaved}
        onLoadSavedClientSetup={handleLoadSavedClientSetup}
        onSelectCommunityMode={() => {
          setUserRole('community');
          setProductEdition(ProductEdition.COMMUNITY);
          setAppState(prev => sanitizeAppState({
            ...prev,
            userRole: 'community',
            productEdition: ProductEdition.COMMUNITY,
            isLockedPackage: false
          }));
          setIsEngineeringChoiceOpen(true);
          setCurrentView(AppView.DASHBOARD);
        }}
        onLoginAdmin={() => {
          setUserRole('admin');
          setProductEdition(ProductEdition.ENGINEERING);
          setAppState(prev => ({
            ...prev,
            userRole: 'admin',
            productEdition: ProductEdition.ENGINEERING,
            isLockedPackage: false
          }));
          setIsEngineeringChoiceOpen(true);
          setCurrentView(AppView.DASHBOARD);
        }}
        onImportClientPackage={(newAppState, clientName, expiresAt, preferredWorkstationMode) => {
          setAppState({
            ...newAppState,
            userRole: 'client',
            productEdition: ProductEdition.CLIENT_RUNTIME,
            isLockedPackage: true
          });
          setUserRole('client');
          setProductEdition(ProductEdition.CLIENT_RUNTIME);
          setClientInfo({ clientName, expiresAt, isSignedPackage: true });
          if (preferredWorkstationMode) {
            setActiveMode(preferredWorkstationMode);
          }
          if (newAppState.dashboards[0]) {
            setActiveDashboardId(newAppState.dashboards[0].dashboardId);
          }
          if (newAppState.connections[0]) {
            setActiveConnectionId(newAppState.connections[0].connectionId);
          }
          try {
            localStorage.removeItem('tasc_client_setup_saved');
          } catch {}
          setIsClientSetupSaved(false);
          setCurrentView(AppView.DASHBOARD);
        }}
        accentColor={activeThemeObj.primary}
      />
    );
  }

  const handleLoadHatcheryDemo = () => {
    if (window.confirm('Load Water & Air Monitoring Sample Project? This will load 2 clean HMI screens (Water & Air) with 4 widgets each.')) {
      const connId = activeConnectionId || 'conn_demo';
      const { dashboards, panels } = getSampleProject(connId);
      
      setAppState(prev => sanitizeAppState({
        ...prev,
        dashboards: [...prev.dashboards.filter(d => !d.dashboardId.includes('water') && !d.dashboardId.includes('air') && !d.dashboardId.includes('daman')), ...dashboards],
        panels: [...prev.panels.filter(p => !p.dashboardId.includes('water') && !p.dashboardId.includes('air') && !p.dashboardId.includes('daman')), ...panels]
      }));

      if (dashboards.length > 0) {
        setActiveDashboardId(dashboards[0].dashboardId);
      }
    }
  };

  const editionMgr = EditionManager.fromState(appState);

  // Render main screen view
  return (
    <div className="flex flex-col h-screen w-screen text-slate-200 overflow-hidden font-sans select-none" style={{ backgroundColor: activeThemeObj.bgCanvas }}>
      {/* Top Navbar */}
      <header className="theme-header h-11 px-3 border-b border-slate-800 flex items-center justify-between shrink-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <i className="fas fa-bars text-lg"></i>
          </button>
          
          <div className="flex items-center space-x-2.5">
            <AppLogo 
              size="sm" 
              accentColor={activeThemeObj.primary} 
              isCommunity={userRole === 'community' || productEdition === ProductEdition.COMMUNITY} 
            />
            <span className="font-extrabold text-white text-sm sm:text-base tracking-tight whitespace-nowrap shrink-0 hidden sm:inline">TASC IIoT Studio</span>
            <button
              type="button"
              onClick={editionMgr.IsClient() ? undefined : handleOpenActiveBrokerSettings}
              className={`flex items-center space-x-1.5 bg-slate-950/80 ${editionMgr.IsClient() ? 'cursor-default' : 'hover:bg-slate-800 cursor-pointer'} px-3 py-1 rounded-lg border border-slate-800 transition-all group`}
              title={editionMgr.IsClient() ? "MQTT Connection Status" : "Click to configure MQTT Broker Settings (Address, Port, Auth)"}
            >
              <span className={`w-2 h-2 rounded-full ${isSimulated ? 'bg-amber-400 animate-pulse' : mqttConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-[11px] font-mono text-slate-300 group-hover:text-white font-semibold">
                {isSimulated ? 'SIMULATED' : mqttConnected ? 'CONNECTED' : 'OFFLINE'}
              </span>
              {!editionMgr.IsClient() && <i className="fas fa-server text-[10px] text-sky-400 opacity-70 group-hover:opacity-100 ml-0.5"></i>}
            </button>

            {/* Inbuilt Alarm Center Bell Button */}
            <button
              type="button"
              onClick={() => setIsAlarmModalOpen(true)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer relative ${
                activeAlarms.length > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/60 hover:bg-rose-500/30 animate-pulse'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white'
              }`}
              title="Telemetry Inbuilt Parameter Alarms"
            >
              <i className={`fas fa-bell text-xs ${activeAlarms.length > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`}></i>
              <span className="hidden sm:inline">ALARMS</span>
              {activeAlarms.length > 0 && (
                <span className="bg-rose-500 text-black text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full">
                  {activeAlarms.length}
                </span>
              )}
            </button>

            {/* Alarm Historian Button */}
            <button
              type="button"
              onClick={() => setIsAlarmHistorianModalOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30 transition-all cursor-pointer shadow-sm"
              title="Industrial Alarm Historian Window (FIFO Storage & Exporter)"
            >
              <i className="fas fa-history text-xs text-indigo-400"></i>
              <span className="hidden sm:inline">HISTORIAN</span>
            </button>

            {userRole === 'community' || productEdition === ProductEdition.COMMUNITY ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleRequestExitSession}
                  className="flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-emerald-500/30 transition-all cursor-pointer"
                  title={`Community Edition (Free) • ${appState.dashboards.length} Screens / 10 Widgets Max — Click to exit / change mode`}
                >
                  <i className="fas fa-cube text-xs text-emerald-400"></i>
                  <span className="hidden lg:inline">COMMUNITY EDITION</span>
                  <span className={`text-[9px] px-1 rounded font-mono font-extrabold ${appState.panels.length > 10 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'}`}>
                    FREE ({appState.panels.length}/10W)
                  </span>
                </button>

                {!isFullscreen && (
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="flex items-center space-x-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    title="Toggle Fullscreen Mode"
                  >
                    <i className="fas fa-expand text-xs text-emerald-400"></i>
                    <span className="hidden sm:inline">Full Screen</span>
                  </button>
                )}

                {/* Workstation Mode Switcher Toggle for Community Edition */}
                <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveMode('grid')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                      activeMode === 'grid'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to IIoT Grid Dashboard Studio"
                  >
                    <i className="fas fa-border-all text-xs"></i>
                    <span className="hidden xl:inline">Grid Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode('hmi')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                      activeMode === 'hmi'
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to Absolute Web HMI Canvas Designer"
                  >
                    <i className="fas fa-microchip text-xs"></i>
                    <span className="hidden xl:inline">HMI Canvas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEngineeringChoiceOpen(true)}
                    className="p-1 text-slate-400 hover:text-emerald-400"
                    title="Change Workstation Architecture Mode"
                  >
                    <i className="fas fa-sliders text-xs"></i>
                  </button>
                </div>
              </div>
            ) : userRole === 'client' || productEdition === ProductEdition.CLIENT_RUNTIME ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleRequestExitSession}
                  className="flex items-center space-x-1.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-sky-500/30 transition-all cursor-pointer"
                  title="Client Edition (Operator Mode) — Click to exit / change mode"
                >
                  <i className="fas fa-shield-halved text-xs text-sky-400"></i>
                  <span className="hidden lg:inline">{clientInfo?.clientName || 'CLIENT EDITION'}</span>
                  <span className="text-[9px] bg-sky-500 text-slate-950 px-1 rounded font-mono font-extrabold">OPERATOR MODE</span>
                </button>

                {!isFullscreen && (
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="flex items-center space-x-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    title="Toggle Fullscreen Mode"
                  >
                    <i className="fas fa-expand text-xs text-sky-400"></i>
                    <span className="hidden sm:inline">Full Screen</span>
                  </button>
                )}

                {/* Workstation Mode Switcher Toggle for Client Edition */}
                <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveMode('grid')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                      activeMode === 'grid'
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to IIoT Grid Dashboard View"
                  >
                    <i className="fas fa-border-all text-xs"></i>
                    <span className="hidden xl:inline">Grid View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode('hmi')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                      activeMode === 'hmi'
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to Absolute Web HMI Canvas View"
                  >
                    <i className="fas fa-microchip text-xs"></i>
                    <span className="hidden xl:inline">HMI View</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">

                {!isFullscreen && (
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="flex items-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    title="Toggle Fullscreen Mode"
                  >
                    <i className="fas fa-expand text-xs text-amber-400"></i>
                    <span className="hidden sm:inline">Full Screen</span>
                  </button>
                )}

                {/* Workstation Mode Switcher Toggle */}
                <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveMode('grid')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                      activeMode === 'grid'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to IIoT Grid Dashboard Studio"
                  >
                    <i className="fas fa-border-all text-xs"></i>
                    <span className="hidden xl:inline">Grid Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode('hmi')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                      activeMode === 'hmi'
                        ? 'bg-sky-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Switch to Absolute Web HMI Canvas Designer"
                  >
                    <i className="fas fa-microchip text-xs"></i>
                    <span className="hidden xl:inline">HMI Canvas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEngineeringChoiceOpen(true)}
                    className="p-1 text-slate-400 hover:text-amber-400"
                    title="Change Engineering Architecture Mode"
                  >
                    <i className="fas fa-sliders text-xs"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>



        {/* Right Toolbar */}
        <div className="flex items-center space-x-1.5">
          {currentView === AppView.DASHBOARD && (
            <>
              {!isFullscreen && (
                <button 
                  type="button"
                  onClick={() => {
                    const editionMgr = EditionManager.fromState(appState);
                    const check = editionMgr.CanCreateScreen(appState);
                    if (!check.allowed) {
                      if (editionMgr.IsClient()) {
                        setShowClientReadOnlyNotice(true);
                        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
                      } else if (check.reason) {
                        setCommunityLimitNotice(check.reason);
                        setTimeout(() => setCommunityLimitNotice(null), 5000);
                      }
                      return;
                    }
                    setCurrentView(AppView.ADD_DASHBOARD);
                  }}
                  className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold rounded-lg text-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-md active:scale-95"
                  title="Create New HMI Dashboard Screen Page"
                >
                  <i className="fas fa-plus text-xs"></i>
                  <span>New Screen</span>
                </button>
              )}

              {!isLocked && !isFullscreen && (
                <button 
                  onClick={() => setIsCloneModalOpen(true)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Clone Panel"
                >
                  <i className="fas fa-clone text-sm" style={{ color: activeThemeObj.primary }}></i>
                </button>
              )}

              {isLocked && (
                <button
                  onClick={handleToggleLock}
                  className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 hover:bg-amber-500/30 transition-colors"
                  title="Panel Edits Locked — Click to unlock"
                >
                  <i className="fas fa-lock text-[11px]"></i>
                  <span className="hidden sm:inline">Locked</span>
                </button>
              )}

              {isLayoutMode && (
                <button
                  onClick={() => setIsLayoutMode(false)}
                  className="px-2.5 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 animate-pulse hover:bg-sky-500/30 transition-colors"
                  title="Layout Editing Active — Click done when finished"
                >
                  <i className="fas fa-table-cells text-[11px]"></i>
                  <span className="hidden sm:inline">Editing Layout</span>
                </button>
              )}
            </>
          )}

          {currentView === AppView.DASHBOARD && (
            <button 
              onClick={() => setIsDashMenuOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <i className="fas fa-ellipsis-vertical text-sm"></i>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow overflow-hidden flex flex-col relative">
        {currentView === AppView.DASHBOARD && (
          <div className={`flex-grow ${activeMode === 'hmi' ? 'p-0.5 flex flex-col overflow-hidden h-full' : 'p-2 sm:p-3 overflow-y-auto'}`}>
            {communityLimitNotice && (
              <div className="bg-amber-950/80 border border-amber-500/40 rounded-2xl p-3.5 mb-4 flex items-center justify-between text-amber-200 text-xs font-medium shadow-lg animate-in slide-in-from-top duration-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <i className="fas fa-circle-exclamation text-sm"></i>
                  </div>
                  <div>
                    <strong className="block font-bold text-white text-xs">Community Edition Limit Notice</strong>
                    <span className="text-[11px] text-amber-300">{communityLimitNotice}</span>
                  </div>
                </div>
                <button
                  onClick={() => setCommunityLimitNotice(null)}
                  className="p-1.5 text-amber-400 hover:text-white rounded-lg hover:bg-amber-500/20"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>
            )}



            {isLayoutMode && (
              <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3 mb-4 flex items-center justify-between text-amber-300 text-xs font-semibold animate-in fade-in">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-hand-pointer text-amber-400 text-sm animate-bounce"></i>
                  <span>Layout Editing Active — Drag yellow panel handles to reorder cards. Select 1x to 4x column spans in panel edit.</span>
                </div>
                <button
                  onClick={() => setIsLayoutMode(false)}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 text-xs shrink-0 ml-2"
                >
                  Done Editing
                </button>
              </div>
            )}

            {isLocked && showLockedNotice && (
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 mb-4 flex items-center justify-between text-slate-300 text-xs font-medium shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-shield-halved text-sky-400 text-sm"></i>
                  <span>Panel Edits Locked. Panel reordering, editing & deletion are restricted.</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleToggleLock}
                    className="text-sky-400 hover:text-sky-300 font-bold text-xs underline decoration-sky-400/40"
                  >
                    Unlock Edits
                  </button>
                  <button
                    onClick={() => setShowLockedNotice(false)}
                    className="text-slate-500 hover:text-slate-200 p-1 rounded-lg"
                    title="Dismiss notice"
                  >
                    <i className="fas fa-xmark text-xs"></i>
                  </button>
                </div>
              </div>
            )}

            {activeMode === 'hmi' ? (
              <WebHmiCanvasView
                appState={appState}
                activeDashboardId={activeDashboardId}
                onSelectDashboard={handleSelectDashboard}
                onUpdateAppState={setAppState}
                onPublish={handlePublish}
                latestValues={latestValues}
                userRole={userRole}
                isFullscreen={isFullscreen}
                onOpenAddPanel={handleOpenAddPanel}
                onEditPanel={(p) => setEditingPanel(p)}
                onDeletePanel={handleDeletePanel}
                onClonePanel={handleQuickClonePanel}
              />
            ) : activePanels.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div 
                  className="w-20 h-20 rounded-2xl border flex items-center justify-center text-3xl"
                  style={{
                    backgroundColor: activeThemeObj.accentSoft,
                    borderColor: activeThemeObj.primary + '40',
                    color: activeThemeObj.primary
                  }}
                >
                  <i className="fas fa-gauge-high"></i>
                </div>
                <h2 className="text-xl font-bold text-white">No Panels Added Yet</h2>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click the button below to add real-time gauges, switches, line graphs, and controls to this Bento dashboard.
                </p>
                <button 
                  onClick={handleOpenAddPanel}
                  className="px-6 py-3 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95"
                  style={{
                    backgroundColor: activeThemeObj.primary,
                    boxShadow: `0 10px 25px -5px ${activeThemeObj.primary}40`
                  }}
                >
                  Create First Panel
                </button>
              </div>
            ) : (
              <BentoGrid
                panels={activePanels}
                latestValues={latestValues}
                historyValues={historyValues}
                onEdit={(p) => {
                  if (userRole === 'client' || appState.isLockedPackage) {
                    setShowClientReadOnlyNotice(true);
                    setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
                    return;
                  }
                  setEditingPanel(p);
                }}
                onDelete={handleDeletePanel}
                onClone={handleQuickClonePanel}
                onQuickResize={handleQuickResizePanel}
                onPublish={handlePublish}
                onReorderPanels={handleReorderPanels}
                isLayoutMode={isLayoutMode}
                isLocked={isLocked}
                selectedPanelId={selectedPanelId}
              />
            )}
          </div>
        )}

        {currentView === AppView.CONNECTIONS && (
          <div className="flex-grow p-6 overflow-y-auto max-w-3xl mx-auto w-full space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-white">MQTT Connections</h1>
                <p className="text-xs text-slate-400">Configure WebSocket and TCP brokers for remote telemetry</p>
              </div>
              <button 
                onClick={() => {
                  if (userRole === 'client' || appState.isLockedPackage) {
                    setShowClientReadOnlyNotice(true);
                    setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
                    return;
                  }
                  setEditingConnection(undefined);
                  setCurrentView(AppView.ADD_CONNECTION);
                }}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs uppercase rounded-xl shadow-lg"
              >
                + Add Connection
              </button>
            </div>

            <div className="space-y-4">
              {appState.connections.map(conn => {
                const connDashboards = appState.dashboards.filter(d => d.connectionId === conn.connectionId);
                const connPanels = appState.panels.filter(p => connDashboards.some(d => d.dashboardId === p.dashboardId));

                return (
                  <div key={conn.connectionId} className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 flex items-center justify-between hover:border-sky-500/40 transition-all shadow-xl relative">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center text-xl shadow-inner">
                        <i className="fas fa-network-wired"></i>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-base">{conn.connectionName}</span>
                          <span className="text-[10px] bg-slate-800 text-sky-400 px-2 py-0.5 rounded-md font-mono">{conn.protocol}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">{conn.brokerAddress}:{conn.port}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      <button 
                        onClick={() => {
                          setActiveConnectionId(conn.connectionId);
                          setCurrentView(AppView.DASHBOARD);
                        }}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center space-x-1.5"
                      >
                        <i className="fas fa-plug text-[11px]"></i>
                        <span>Connect</span>
                      </button>

                      {/* 3-dot button right beside dashboard / connection */}
                      <div className="relative">
                        <button 
                          onClick={() => setActiveConnMenuId(activeConnMenuId === conn.connectionId ? null : conn.connectionId)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all ${
                            activeConnMenuId === conn.connectionId ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'hover:bg-slate-800/80'
                          }`}
                          title="Connection Options"
                        >
                          <i className="fas fa-ellipsis-vertical text-base"></i>
                        </button>

                        {/* Dropdown menu */}
                        {activeConnMenuId === conn.connectionId && (
                          <div className="absolute right-0 top-11 z-50 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1.5 animate-in fade-in duration-150 space-y-0.5">
                            <button 
                              onClick={() => {
                                setEditingConnection(conn);
                                setCurrentView(AppView.ADD_CONNECTION);
                                setActiveConnMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center space-x-2.5 transition-colors"
                            >
                              <i className="fas fa-pen text-sky-400 text-xs w-4 text-center"></i>
                              <span>Edit Connection</span>
                            </button>

                            <button 
                              onClick={() => handleCopyConnection(conn.connectionId)}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center space-x-2.5 transition-colors"
                            >
                              <i className="fas fa-copy text-indigo-400 text-xs w-4 text-center"></i>
                              <span>Copy Connection</span>
                            </button>

                            <button 
                              onClick={() => {
                                setSharingConnection(conn);
                                setActiveConnMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center space-x-2.5 transition-colors"
                            >
                              <i className="fas fa-share-nodes text-emerald-400 text-xs w-4 text-center"></i>
                              <span>Share (Export JSON)</span>
                            </button>

                            <div className="border-t border-slate-800/80 my-1"></div>

                            <button 
                              onClick={() => handleDeleteConnection(conn.connectionId)}
                              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2.5 transition-colors"
                            >
                              <i className="fas fa-trash-can text-rose-400 text-xs w-4 text-center"></i>
                              <span>Delete Connection</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentView === AppView.ADD_CONNECTION && (() => {
          const targetConn = editingConnection || appState.connections.find(c => c.connectionId === activeConnectionId) || appState.connections[0];
          return (
            <AddConnectionView 
              initialData={targetConn}
              initialDashboards={targetConn ? appState.dashboards.filter(d => d.connectionId === targetConn.connectionId) : []}
              onCancel={() => setCurrentView(AppView.DASHBOARD)}
              onCreate={handleCreateConnection}
            />
          );
        })()}

        {currentView === AppView.ADD_DASHBOARD && (
          <AddDashboardView 
            connectionId={activeConnectionId}
            onCancel={() => setCurrentView(AppView.DASHBOARD)}
            onCreate={(newDash) => {
              setAppState(prev => ({ ...prev, dashboards: [...prev.dashboards, newDash] }));
              setActiveDashboardId(newDash.dashboardId);
              setCurrentView(AppView.DASHBOARD);
            }}
          />
        )}

        {currentView === AppView.SETTINGS && (
          <SettingsView 
            onBack={() => setCurrentView(AppView.DASHBOARD)} 
            connections={appState.connections}
            editPin={appState.editPin}
            onSavePin={(pin) => setAppState(prev => ({ ...prev, editPin: pin }))}
            onRequestSetPin={() => {
              setPinModalMode('set');
              setIsPinModalOpen(true);
            }}
            appState={appState}
            onSelectTheme={(themeId) => setAppState(prev => ({ ...prev, appTheme: themeId }))}
            onClearSavedSetup={handleClearClientSavedSetup}
            onOpenBrokerSettings={handleOpenActiveBrokerSettings}
            onOpenTopicManager={() => setCurrentView(AppView.TOPIC_MANAGER)}
            onOpenTagManager={() => setCurrentView(AppView.TAG_MANAGER)}
            userRole={userRole}
            productEdition={productEdition}
            onRequestClearAll={handleRequestClearAll}
          />
        )}

        {currentView === AppView.TOPIC_MANAGER && (
          <TopicManagerView
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            appState={appState}
            onUpdateAppState={(newState) => setAppState(newState)}
            userRole={userRole}
            productEdition={productEdition}
          />
        )}

        {currentView === AppView.TAG_MANAGER && (
          <TagManagerView
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            appState={appState}
            onUpdateAppState={(newState) => setAppState(newState)}
            userRole={userRole}
            productEdition={productEdition}
          />
        )}

        {currentView === AppView.BACKUP && (
          <BackupRestoreView 
            onBack={() => setCurrentView(AppView.DASHBOARD)} 
            appState={appState}
            userRole={userRole}
            onRestoreState={(newState) => {
              if (userRole === 'client') {
                setShowClientReadOnlyNotice(true);
                setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
                return;
              }
              setAppState(newState);
            }}
            onRequestExportClientPackage={userRole === 'admin' ? () => setIsExportClientPackageOpen(true) : undefined}
          />
        )}
      </main>



      {/* Modals and Drawers */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={setCurrentView}
        currentView={currentView}
        dashboards={appState.dashboards}
        onSelectDashboard={handleSelectDashboard}
        currentTheme={appState.appTheme || 'sky'}
        onSelectTheme={(themeId) => setAppState(prev => ({ ...prev, appTheme: themeId }))}
        onEditDashboard={handleEditDashboard}
        onCopyDashboard={handleCopyDashboard}
        onShareDashboard={handleShareDashboard}
        onDeleteDashboard={handleDeleteDashboard}
        userRole={userRole}
        clientInfo={clientInfo}
        onSwitchRole={handleRequestExitSession}
        onRequestClearAll={handleRequestClearAll}
        onLoadHatcheryDemo={handleLoadHatcheryDemo}
      />

      <DashboardMenu 
        isOpen={isDashMenuOpen} 
        onClose={() => setIsDashMenuOpen(false)} 
        isLocked={isLocked}
        isLayoutMode={isLayoutMode}
        hasPin={!!appState.editPin}
        onToggleLock={handleToggleLock}
        onEditLayout={handleEditLayout}
        onAddDashboard={() => {
          const editionMgr = EditionManager.fromState(appState);
          const check = editionMgr.CanCreateScreen(appState);
          if (!check.allowed) {
            if (check.reason) {
              setCommunityLimitNotice(check.reason);
              setTimeout(() => setCommunityLimitNotice(null), 5000);
            }
            return;
          }
          setCurrentView(AppView.ADD_DASHBOARD);
        }}
      />

      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingAction(null);
        }}
        mode={pinModalMode}
        correctPin={appState.editPin}
        onSuccess={(newPin) => {
          if (pinModalMode === 'set') {
            setAppState(prev => ({ ...prev, editPin: newPin }));
            setIsPinModalOpen(false);
          } else {
            setIsPinModalOpen(false);
            if (pendingAction) {
              pendingAction();
              setPendingAction(null);
            }
          }
        }}
      />

      <AddPanelModal 
        isOpen={isAddPanelOpen}
        onClose={() => setIsAddPanelOpen(false)}
        onSelect={handleAddPanelSelect}
      />

      <EditPanelModal 
        panel={editingPanel || {}}
        isOpen={!!editingPanel}
        onClose={() => setEditingPanel(null)}
        onSave={handleSavePanel}
        appState={appState}
      />

      {editingDashboard && (
        <EditDashboardModal
          dashboard={editingDashboard}
          onCancel={() => setEditingDashboard(null)}
          onSave={(updatedDash) => {
            setAppState(prev => {
              let updatedDashboards = prev.dashboards.map(d => {
                if (d.dashboardId === updatedDash.dashboardId) {
                  return updatedDash;
                }
                if (updatedDash.isHome) {
                  return { ...d, isHome: false };
                }
                return d;
              });

              if (!updatedDashboards.some(d => d.isHome) && updatedDashboards.length > 0) {
                updatedDashboards[0] = { ...updatedDashboards[0], isHome: true };
              }

              return { ...prev, dashboards: updatedDashboards };
            });
            setEditingDashboard(null);
          }}
        />
      )}

      <ClonePanelModal 
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        dashboards={appState.dashboards}
        panels={appState.panels}
        onClone={handleClonePanels}
      />

      {sharingConnection && (
        <ShareConnectionModal 
          connection={sharingConnection}
          dashboards={appState.dashboards.filter(d => d.connectionId === sharingConnection.connectionId)}
          panels={appState.panels.filter(p => appState.dashboards.filter(d => d.connectionId === sharingConnection.connectionId).some(d => d.dashboardId === p.dashboardId))}
          onClose={() => setSharingConnection(null)}
        />
      )}

      <ExportClientPackageModal
        isOpen={isExportClientPackageOpen}
        onClose={() => setIsExportClientPackageOpen(false)}
        appState={appState}
      />

      <ClearAllModal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirmClearAll={handleConfirmClearAll}
        widgetCount={appState.panels.length}
        connectionCount={appState.connections.length}
        dashboardCount={appState.dashboards.length}
        editionName={userRole === 'community' || productEdition === ProductEdition.COMMUNITY ? 'Community Edition' : 'Engineering Studio'}
      />

      {/* Floating Exit Fullscreen button inside browser when fullscreen */}
      {isFullscreen && (
        <button
          type="button"
          onClick={handleExitFullscreen}
          className="fixed top-3 right-4 z-[9999] bg-slate-950/90 hover:bg-slate-900 text-sky-300 border border-sky-500/50 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-2xl flex items-center space-x-2 transition-all cursor-pointer backdrop-blur-md animate-in fade-in"
          title="Exit Full Screen Mode"
        >
          <i className="fas fa-compress text-xs text-sky-400"></i>
          <span>Exit Full Screen</span>
        </button>
      )}

      {/* Mandatory Client Edition Save Setup Modal */}
      {!isClientSetupSaved && (userRole === 'client' || productEdition === ProductEdition.CLIENT_RUNTIME) && (
        <div className="fixed inset-0 z-[500] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-sky-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <i className="fas fa-floppy-disk"></i>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white">Save Setup for Future Operation</h3>
              <p className="text-xs text-slate-400">Client Edition Browser Local Storage</p>
            </div>

            <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 text-center space-y-2">
              <p className="text-sm font-extrabold text-sky-300">
                Please save the setup for future operation
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Saving this HMI layout and MQTT connection setup will store it securely in your browser memory so it automatically loads every time you open this app.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem('tasc_client_setup_saved', 'true');
                  localStorage.setItem('mqtt_dash_pro_state', JSON.stringify(appState));
                } catch {}
                setIsClientSetupSaved(true);
              }}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-sky-500/25 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <i className="fas fa-check-circle text-base"></i>
              <span>Save Setup to Browser Memory</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Inbuilt Telemetry Alarm Pop-up Modal */}
      <AlarmModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
        activeAlarms={activeAlarms}
        onAcknowledgeAlarm={handleAcknowledgeAlarm}
        onAcknowledgeAll={handleAcknowledgeAllAlarms}
        isVibrateEnabled={isVibrateEnabled}
        onToggleVibrate={() => setIsVibrateEnabled(!isVibrateEnabled)}
        latestAlarmTriggered={latestAlarmTriggered}
        onOpenHistorian={() => {
          setIsAlarmModalOpen(false);
          setIsAlarmHistorianModalOpen(true);
        }}
      />

      {/* Industrial Alarm Historian Resizable Window & Lifecycle Table */}
      <AlarmHistorianModal
        isOpen={isAlarmHistorianModalOpen}
        onClose={() => setIsAlarmHistorianModalOpen(false)}
        dashboardId={activeDashboard?.dashboardId}
        onAcknowledgeAlarm={handleAcknowledgeAlarm}
        onOpenLiveAlarms={() => {
          setIsAlarmHistorianModalOpen(false);
          setIsAlarmModalOpen(true);
        }}
      />

      {/* Session Exit Confirmation Modal */}
      <ExitSessionModal
        isOpen={isExitSessionModalOpen}
        onClose={() => setIsExitSessionModalOpen(false)}
        onSaveAndExit={handleSaveAndExitSession}
        onExitWithoutSave={handleExitSessionWithoutSave}
        editionName={
          userRole === 'community' || productEdition === ProductEdition.COMMUNITY
            ? 'Community Edition'
            : userRole === 'client' || productEdition === ProductEdition.CLIENT_RUNTIME
            ? 'Client Edition'
            : 'Engineering Studio'
        }
      />

      {/* Engineering Architecture Workstation Choice Modal */}
      <EngineeringChoiceModal
        isOpen={isEngineeringChoiceOpen}
        onClose={() => setIsEngineeringChoiceOpen(false)}
        onSelectMode={(mode) => setActiveMode(mode)}
        currentMode={activeMode}
      />

      {/* Global Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmVariant={confirmModal.confirmVariant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default App;
