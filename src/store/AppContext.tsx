import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { 
  AppState, 
  AppView, 
  Dashboard, 
  MqttConnection, 
  Panel, 
  ActiveAlarm, 
  MqttMessageLog,
  DriverConnection,
  DriverTag,
  ProductEdition
} from '../types';
import { useSessionEngine } from './useSessionEngine';
import { useMqttEngine } from './useMqttEngine';
import { useDriverEngine } from './useDriverEngine';
import { useAlarmEngine } from './useAlarmEngine';
import { EditionManager } from '../utils/EditionManager';
import { getAppTheme, AppThemePreset } from '../utils/theme';
import { registerCustomTag } from '../utils/tagManager';
import { getSampleProject } from '../utils/sampleProjectPreset';
import { sanitizeAppState } from '../utils/EditionManager';

export interface AppContextType {
  // Session / State
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  userRole: 'admin' | 'client' | 'gate' | 'community';
  setUserRole: React.Dispatch<React.SetStateAction<'admin' | 'client' | 'gate' | 'community'>>;
  productEdition: ProductEdition;
  setProductEdition: React.Dispatch<React.SetStateAction<ProductEdition>>;
  clientInfo: AppState['clientInfo'];
  setClientInfo: React.Dispatch<React.SetStateAction<AppState['clientInfo']>>;
  isLocked: boolean;
  setIsLocked: React.Dispatch<React.SetStateAction<boolean>>;
  showLockedNotice: boolean;
  setShowLockedNotice: React.Dispatch<React.SetStateAction<boolean>>;
  isRuntimeUnlocked: boolean;
  setIsRuntimeUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  pendingAction: (() => void) | null;
  setPendingAction: React.Dispatch<React.SetStateAction<(() => void) | null>>;
  isPinModalOpen: boolean;
  setIsPinModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pinModalMode: 'enter' | 'set';
  setPinModalMode: React.Dispatch<React.SetStateAction<'enter' | 'set'>>;
  isFullscreen: boolean;
  handleToggleFullscreen: () => void;
  handleExitFullscreen: () => void;
  isTourOpen: boolean;
  setIsTourOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isHistorianPrivateBrowsing: boolean;
  unreadScheduledReports: number;
  setUnreadScheduledReports: React.Dispatch<React.SetStateAction<number>>;
  isClientSetupSaved: boolean;
  setIsClientSetupSaved: React.Dispatch<React.SetStateAction<boolean>>;
  isExportClientPackageOpen: boolean;
  setIsExportClientPackageOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showClientReadOnlyNotice: boolean;
  setShowClientReadOnlyNotice: React.Dispatch<React.SetStateAction<boolean>>;
  communityLimitNotice: string | null;
  setCommunityLimitNotice: React.Dispatch<React.SetStateAction<string | null>>;
  isExitSessionModalOpen: boolean;
  setIsExitSessionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isClearAllModalOpen: boolean;
  setIsClearAllModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  };
  setConfirmModal: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'primary';
    onConfirm: () => void;
  }>>;

  // Navigation / Active IDs
  currentView: AppView;
  setCurrentView: React.Dispatch<React.SetStateAction<AppView>>;
  activeConnectionId: string;
  setActiveConnectionId: React.Dispatch<React.SetStateAction<string>>;
  activeDashboardId: string;
  setActiveDashboardId: React.Dispatch<React.SetStateAction<string>>;
  activeMode: 'grid' | 'hmi';
  setActiveMode: React.Dispatch<React.SetStateAction<'grid' | 'hmi'>>;
  isLayoutMode: boolean;
  setIsLayoutMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedPanelId: string | null;
  setSelectedPanelId: React.Dispatch<React.SetStateAction<string | null>>;
  isEngineeringChoiceOpen: boolean;
  setIsEngineeringChoiceOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Derived Objects
  activeConnection: MqttConnection | undefined;
  activeDashboard: Dashboard | undefined;
  activePanels: Panel[];
  activeConnectionDashboards: Dashboard[];
  editionMgr: EditionManager;
  activeThemeObj: AppThemePreset;

  // Real-time Data
  latestValues: Record<string, { val: any; time: string; timestampMs?: number; quality?: string; rawPayload?: any; sentTime?: string; lastGoodValue?: any; lastGoodTimestamp?: string }>;
  setLatestValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  historyValues: Record<string, { value: number; time: string; timestampMs?: number }[]>;
  setHistoryValues: React.Dispatch<React.SetStateAction<Record<string, { value: number; time: string; timestampMs?: number }[]>>>;
  mqttLogs: MqttMessageLog[];
  mqttConnected: boolean;
  isSimulated: boolean;
  setIsSimulated: (v: boolean) => void;
  nowMs: number;

  // Alarms
  activeAlarms: ActiveAlarm[];
  acknowledgedAlarms: Record<string, boolean>;
  latestAlarmTriggered: ActiveAlarm | null;
  isAlarmModalOpen: boolean;
  setIsAlarmModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAlarmHistorianModalOpen: boolean;
  setIsAlarmHistorianModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isFddModalOpen: boolean;
  setIsFddModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isVibrateEnabled: boolean;
  setIsVibrateEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isSoundEnabled: boolean;
  setIsSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isAutoPopupEnabled: boolean;
  setIsAutoPopupEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  handleAcknowledgeAlarm: (alarmKey: string) => void;
  handleAcknowledgeAllAlarms: () => void;

  // Modals & UI
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDashMenuOpen: boolean;
  setIsDashMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAddPanelOpen: boolean;
  setIsAddPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingPanel: Partial<Panel> | null;
  setEditingPanel: React.Dispatch<React.SetStateAction<Partial<Panel> | null>>;
  editingDashboard: Dashboard | null;
  setEditingDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
  editingConnection: MqttConnection | undefined;
  setEditingConnection: React.Dispatch<React.SetStateAction<MqttConnection | undefined>>;
  activeConnMenuId: string | null;
  setActiveConnMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  activeDashTabMenuId: string | null;
  setActiveDashTabMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  sharingConnection: MqttConnection | null;
  setSharingConnection: React.Dispatch<React.SetStateAction<MqttConnection | null>>;
  isCloneModalOpen: boolean;
  setIsCloneModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Handlers
  handlePublish: (topic: string, payload: string | number) => void;
  executePublish: (topic: string, payload: string | number) => void;
  handleAddPanelSelect: (type: string) => void;
  handleSavePanel: (panelData: any) => void;
  handleDeletePanel: (panelId: string) => void;
  handleClonePanels: (panelIds: string[]) => void;
  handleQuickClonePanel: (panel: Panel) => void;
  handleReorderPanels: (reorderedActivePanels: Panel[]) => void;
  handleQuickResizePanel: (panelId: string, colSpan: number, rowSpan: number) => void;
  handleCreateConnection: (connData: MqttConnection, dashboardsData: Dashboard[]) => void;
  handleDeleteConnection: (connId: string) => void;
  handleCopyConnection: (connId: string) => void;
  handleAddDriverConnection: (conn: DriverConnection) => void;
  handleUpdateDriverConnection: (conn: DriverConnection) => void;
  handleDeleteDriverConnection: (connectionId: string) => void;
  handleAddDriverTag: (tag: DriverTag) => void;
  handleUpdateDriverTag: (tag: DriverTag) => void;
  handleDeleteDriverTag: (tagId: string) => void;
  handleImportDriverTags: (tags: DriverTag[]) => void;
  handleImportOpcUaTag: (tag: DriverTag) => void;
  handleDeleteDashboard: (dashId: string) => void;
  handleCopyDashboard: (dashId: string) => void;
  handleEditDashboard: (dash: Dashboard) => void;
  handleOpenActiveBrokerSettings: () => void;
  handleShareDashboard: (dash: Dashboard) => void;
  handleSelectDashboard: (dashId: string) => void;
  handleToggleLock: () => void;
  handleEditLayout: () => void;
  handleOpenAddPanel: () => void;
  handleLoadHatcheryDemo: () => void;
  handleSaveAndExitSession: () => void;
  handleExitSessionWithoutSave: () => void;
  handleClearClientSavedSetup: () => void;
  handleLoadSavedClientSetup: (onNavigateDashboard?: (dashId?: string, connId?: string) => void) => void;
  handleLoadSavedCommunitySetup: (asClientMode?: boolean, onNavigateDashboard?: (dashId?: string, connId?: string) => void) => void;
  handleRequestExitSession: () => void;
  handleRequestClearAll: () => void;
  handleConfirmClearAll: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const sessionEngine = useSessionEngine();
  const {
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
  } = sessionEngine;

  // Navigation & View state
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [activeMode, setActiveMode] = useState<'grid' | 'hmi'>('grid');
  const [activeConnectionId, setActiveConnectionId] = useState<string>(
    appState.connections[0]?.connectionId || ''
  );
  const [activeDashboardId, setActiveDashboardId] = useState<string>(
    appState.dashboards[0]?.dashboardId || ''
  );
  const [isLayoutMode, setIsLayoutMode] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [isEngineeringChoiceOpen, setIsEngineeringChoiceOpen] = useState(false);

  // Modals & UI Drawers
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
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Derived Objects
  const activeConnection = useMemo(() => {
    return appState.connections.find(c => c.connectionId === activeConnectionId) || appState.connections[0];
  }, [appState.connections, activeConnectionId]);

  const activeConnectionDashboards = useMemo(() => {
    return appState.dashboards.filter(d => 
      !activeConnection?.connectionId || 
      d.connectionId === activeConnection?.connectionId || 
      !d.connectionId
    );
  }, [appState.dashboards, activeConnection]);

  const activeDashboard = useMemo(() => {
    return (
      appState.dashboards.find(d => d.dashboardId === activeDashboardId) || 
      activeConnectionDashboards[0] || 
      appState.dashboards[0]
    );
  }, [appState.dashboards, activeDashboardId, activeConnectionDashboards]);

  const activePanels = useMemo(() => {
    return appState.panels.filter(p => p.dashboardId === activeDashboard?.dashboardId);
  }, [appState.panels, activeDashboard]);

  const editionMgr = useMemo(() => {
    return EditionManager.fromState(appState);
  }, [appState]);

  const activeThemeObj: AppThemePreset = useMemo(() => {
    return getAppTheme(appState.appTheme);
  }, [appState.appTheme]);

  // Driver Engine placeholder ref passed to MQTT engine
  const driverEngineRef = React.useRef<any>(null);

  // MQTT Engine
  const mqttEngine = useMqttEngine({
    appState,
    activeConnection,
    activeDashboard,
    activePanels,
    driverBridgeClientRef: driverEngineRef.current?.driverBridgeClientRef,
    onResetRuntimeTimeout: resetRuntimeTimeoutTimer
  });

  const {
    latestValues,
    setLatestValues,
    historyValues,
    setHistoryValues,
    mqttLogs,
    mqttConnected,
    isSimulated,
    setIsSimulated,
    nowMs,
    executePublish
  } = mqttEngine;

  // Driver Engine
  const driverEngine = useDriverEngine({
    appState,
    setAppState,
    activePanels,
    setLatestValues,
    setHistoryValues
  });
  driverEngineRef.current = driverEngine;

  // Alarm Engine
  const alarmEngine = useAlarmEngine({
    panels: appState.panels,
    latestValues
  });

  const {
    activeAlarms,
    acknowledgedAlarms,
    latestAlarmTriggered,
    isAlarmModalOpen,
    setIsAlarmModalOpen,
    isAlarmHistorianModalOpen,
    setIsAlarmHistorianModalOpen,
    isFddModalOpen,
    setIsFddModalOpen,
    isVibrateEnabled,
    setIsVibrateEnabled,
    isSoundEnabled,
    setIsSoundEnabled,
    isAutoPopupEnabled,
    setIsAutoPopupEnabled,
    handleAcknowledgeAlarm,
    handleAcknowledgeAllAlarms
  } = alarmEngine;

  // Publish with PIN Check
  const handlePublish = useCallback((topic: string, payload: string | number) => {
    if (appState.editPin && !isRuntimeUnlocked) {
      setPinModalMode('enter');
      setPendingAction(() => () => {
        setIsRuntimeUnlocked(true);
        executePublish(topic, payload);
      });
      setIsPinModalOpen(true);
      return;
    }
    executePublish(topic, payload);
  }, [appState.editPin, isRuntimeUnlocked, executePublish, setIsRuntimeUnlocked, setPendingAction, setIsPinModalOpen, setPinModalMode]);

  // CRUD Handlers
  const handleAddPanelSelect = useCallback((type: string) => {
    setIsAddPanelOpen(false);
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
  }, [editionMgr, appState, activeDashboard, activeConnection, setAppState, setActiveDashboardId, setEditingPanel, setShowClientReadOnlyNotice, setCommunityLimitNotice]);

  const handleSavePanel = useCallback((panelData: any) => {
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
  }, [editionMgr, appState, activeConnection, activeDashboard, activeConnectionDashboards, setAppState, setActiveConnectionId, setActiveDashboardId, setCurrentView, setEditingPanel, setShowClientReadOnlyNotice, setCommunityLimitNotice]);

  const handleDeletePanel = useCallback((panelId: string) => {
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
  }, [editionMgr, setConfirmModal, setAppState, setShowClientReadOnlyNotice]);

  const handleClonePanels = useCallback((panelIds: string[]) => {
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
  }, [editionMgr, appState, activeDashboard, setAppState, setIsCloneModalOpen, setShowClientReadOnlyNotice, setCommunityLimitNotice]);

  const handleQuickClonePanel = useCallback((panel: Panel) => {
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
  }, [editionMgr, appState, handleClonePanels, setShowClientReadOnlyNotice, setCommunityLimitNotice]);

  const handleReorderPanels = useCallback((reorderedActivePanels: Panel[]) => {
    if (!activeDashboard) return;
    setAppState(prev => {
      const otherPanels = prev.panels.filter(p => p.dashboardId !== activeDashboard.dashboardId);
      return {
        ...prev,
        panels: [...otherPanels, ...reorderedActivePanels]
      };
    });
  }, [activeDashboard, setAppState]);

  const handleQuickResizePanel = useCallback((panelId: string, colSpan: number, rowSpan: number) => {
    setAppState(prev => ({
      ...prev,
      panels: prev.panels.map(p => p.panelId === panelId ? { ...p, colSpan, rowSpan } : p)
    }));
  }, [setAppState]);

  const handleCreateConnection = useCallback((connData: MqttConnection, dashboardsData: Dashboard[]) => {
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
  }, [editionMgr, activeDashboardId, setAppState, setActiveConnectionId, setActiveDashboardId, setCurrentView, setShowClientReadOnlyNotice]);

  const handleDeleteConnection = useCallback((connId: string) => {
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
        setAppState(prev => {
          if (activeConnectionId === connId) {
            const remaining = appState.connections.filter(c => c.connectionId !== connId);
            setActiveConnectionId(remaining[0]?.connectionId || '');
          }
          return {
            ...prev,
            connections: prev.connections.filter(c => c.connectionId !== connId),
            dashboards: prev.dashboards.filter(d => d.connectionId !== connId),
            panels: prev.panels.filter(p => p.connectionId !== connId)
          };
        });
        setActiveConnMenuId(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [editionMgr, appState.connections, activeConnectionId, setConfirmModal, setAppState, setActiveConnectionId, setShowClientReadOnlyNotice]);

  const handleCopyConnection = useCallback((connId: string) => {
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
  }, [editionMgr, appState, setAppState, setShowClientReadOnlyNotice]);

  const handleAddDriverConnection = useCallback((conn: DriverConnection) => {
    setAppState(prev => ({
      ...prev,
      driverConnections: [...(prev.driverConnections || []), conn]
    }));
  }, [setAppState]);

  const handleUpdateDriverConnection = useCallback((conn: DriverConnection) => {
    setAppState(prev => ({
      ...prev,
      driverConnections: (prev.driverConnections || []).map(c =>
        c.connectionId === conn.connectionId ? conn : c
      )
    }));
  }, [setAppState]);

  const handleDeleteDriverConnection = useCallback((connectionId: string) => {
    setAppState(prev => ({
      ...prev,
      driverConnections: (prev.driverConnections || []).filter(c => c.connectionId !== connectionId)
    }));
  }, [setAppState]);

  const handleAddDriverTag = useCallback((tag: DriverTag) => {
    setAppState(prev => ({
      ...prev,
      driverTags: [...(prev.driverTags || []), { ...tag, createdAt: new Date().toISOString() }]
    }));
  }, [setAppState]);

  const handleUpdateDriverTag = useCallback((tag: DriverTag) => {
    setAppState(prev => ({
      ...prev,
      driverTags: (prev.driverTags || []).map(t =>
        t.tagId === tag.tagId ? { ...tag, updatedAt: new Date().toISOString() } : t
      )
    }));
  }, [setAppState]);

  const handleDeleteDriverTag = useCallback((tagId: string) => {
    setAppState(prev => ({
      ...prev,
      driverTags: (prev.driverTags || []).filter(t => t.tagId !== tagId)
    }));
  }, [setAppState]);

  const handleImportDriverTags = useCallback((tags: DriverTag[]) => {
    setAppState(prev => ({
      ...prev,
      driverTags: [
        ...(prev.driverTags || []).filter(t => !tags.some(imported => imported.tagId === t.tagId)),
        ...tags
      ]
    }));
  }, [setAppState]);

  const handleImportOpcUaTag = useCallback((tag: DriverTag) => {
    setAppState(prev => {
      const alreadyExists = (prev.driverTags || []).some(
        t => t.nodeId === tag.nodeId && t.connectionId === tag.connectionId
      );
      if (alreadyExists) return prev;
      return {
        ...prev,
        driverTags: [...(prev.driverTags || []), { ...tag, createdAt: new Date().toISOString() }]
      };
    });
  }, [setAppState]);

  const handleDeleteDashboard = useCallback((dashId: string) => {
    const check = editionMgr.CanDeleteScreen();
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      }
      return;
    }

    const targetDash = appState.dashboards.find(d => d.dashboardId === dashId);
    const dashName = targetDash ? targetDash.dashboardName : 'this screen';

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
  }, [editionMgr, appState.dashboards, activeDashboardId, setConfirmModal, setAppState, setActiveDashboardId, setShowClientReadOnlyNotice]);

  const handleCopyDashboard = useCallback((dashId: string) => {
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
  }, [editionMgr, appState, setAppState, setActiveDashboardId, setShowClientReadOnlyNotice, setCommunityLimitNotice]);

  const handleEditDashboard = useCallback((dash: Dashboard) => {
    const check = editionMgr.CanEditScreen();
    if (!check.allowed) {
      if (editionMgr.IsClient()) {
        setShowClientReadOnlyNotice(true);
        setTimeout(() => setShowClientReadOnlyNotice(false), 4500);
      }
      return;
    }
    setEditingDashboard(dash);
  }, [editionMgr, setEditingDashboard, setShowClientReadOnlyNotice]);

  const handleOpenActiveBrokerSettings = useCallback(() => {
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
  }, [editionMgr, appState.connections, activeConnectionId, setEditingConnection, setCurrentView, setShowClientReadOnlyNotice]);

  const handleShareDashboard = useCallback((dash: Dashboard) => {
    const conn = appState.connections.find(c => c.connectionId === dash.connectionId);
    if (conn) {
      setSharingConnection(conn);
    }
  }, [appState.connections, setSharingConnection]);

  const handleSelectDashboard = useCallback((dashId: string) => {
    const targetDash = appState.dashboards.find(d => d.dashboardId === dashId);
    if (targetDash && targetDash.connectionId) {
      setActiveConnectionId(targetDash.connectionId);
      setActiveDashboardId(dashId);
    } else {
      setActiveDashboardId(dashId);
    }
  }, [appState.dashboards, setActiveConnectionId, setActiveDashboardId]);

  const handleToggleLock = useCallback(() => {
    if (isLocked) {
      if (appState.editPin) {
        setPinModalMode('enter');
        setPendingAction(() => () => {
          setIsLocked(false);
          setIsRuntimeUnlocked(true);
          setAppState(prev => ({ ...prev, isLocked: false }));
        });
        setIsPinModalOpen(true);
      } else {
        setIsLocked(false);
        setIsRuntimeUnlocked(true);
        setAppState(prev => ({ ...prev, isLocked: false }));
      }
    } else {
      setIsLocked(true);
      setIsRuntimeUnlocked(false);
      setIsLayoutMode(false);
      setShowLockedNotice(true);
      setAppState(prev => ({ ...prev, isLocked: true }));
    }
  }, [isLocked, appState.editPin, setPinModalMode, setPendingAction, setIsLocked, setIsRuntimeUnlocked, setIsPinModalOpen, setAppState, setIsLayoutMode, setShowLockedNotice]);

  const handleEditLayout = useCallback(() => {
    if (isLocked) {
      if (appState.editPin) {
        setPinModalMode('enter');
        setPendingAction(() => () => {
          setIsLocked(false);
          setIsRuntimeUnlocked(true);
          setIsLayoutMode(true);
          setAppState(prev => ({ ...prev, isLocked: false }));
        });
        setIsPinModalOpen(true);
      } else {
        setIsLocked(false);
        setIsRuntimeUnlocked(true);
        setIsLayoutMode(true);
        setAppState(prev => ({ ...prev, isLocked: false }));
      }
    } else {
      setIsLayoutMode(prev => !prev);
    }
  }, [isLocked, appState.editPin, setPinModalMode, setPendingAction, setIsLocked, setIsRuntimeUnlocked, setIsLayoutMode, setIsPinModalOpen, setAppState]);

  const handleOpenAddPanel = useCallback(() => {
    if (isLocked) {
      if (appState.editPin) {
        setPinModalMode('enter');
        setPendingAction(() => () => {
          setIsLocked(false);
          setIsRuntimeUnlocked(true);
          setIsAddPanelOpen(true);
          setAppState(prev => ({ ...prev, isLocked: false }));
        });
        setIsPinModalOpen(true);
      } else {
        setIsLocked(false);
        setIsRuntimeUnlocked(true);
        setIsAddPanelOpen(true);
        setAppState(prev => ({ ...prev, isLocked: false }));
      }
    } else {
      setIsAddPanelOpen(true);
    }
  }, [isLocked, appState.editPin, setPinModalMode, setPendingAction, setIsLocked, setIsRuntimeUnlocked, setIsAddPanelOpen, setIsPinModalOpen, setAppState]);

  const handleLoadHatcheryDemo = useCallback(() => {
    if (window.confirm('Load Water System Sample Project? This will replace your dashboards with a clean 5-widget sample HMI screen.')) {
      const connId = activeConnectionId || 'conn_demo';
      const isCommunity = editionMgr.IsCommunity();
      const { dashboards, panels } = getSampleProject(connId, undefined, undefined, isCommunity);
      
      setAppState(prev => sanitizeAppState({
        ...prev,
        dashboards: isCommunity ? dashboards : [...prev.dashboards.filter(d => !d.dashboardId.includes('water') && !d.dashboardId.includes('air') && !d.dashboardId.includes('daman') && d.dashboardName !== 'Main Dashboard'), ...dashboards],
        panels: isCommunity ? panels : [...prev.panels.filter(p => !p.dashboardId.includes('water') && !p.dashboardId.includes('air') && !p.dashboardId.includes('daman')), ...panels]
      }));

      if (dashboards.length > 0) {
        setActiveDashboardId(dashboards[0].dashboardId);
      }
    }
  }, [activeConnectionId, editionMgr, setAppState, setActiveDashboardId]);

  const value = useMemo<AppContextType>(() => ({
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

    currentView,
    setCurrentView,
    activeConnectionId,
    setActiveConnectionId,
    activeDashboardId,
    setActiveDashboardId,
    activeMode,
    setActiveMode,
    isLayoutMode,
    setIsLayoutMode,
    selectedPanelId,
    setSelectedPanelId,
    isEngineeringChoiceOpen,
    setIsEngineeringChoiceOpen,

    activeConnection,
    activeDashboard,
    activePanels,
    activeConnectionDashboards,
    editionMgr,
    activeThemeObj,

    latestValues,
    setLatestValues,
    historyValues,
    setHistoryValues,
    mqttLogs,
    mqttConnected,
    isSimulated,
    setIsSimulated,
    nowMs,

    activeAlarms,
    acknowledgedAlarms,
    latestAlarmTriggered,
    isAlarmModalOpen,
    setIsAlarmModalOpen,
    isAlarmHistorianModalOpen,
    setIsAlarmHistorianModalOpen,
    isFddModalOpen,
    setIsFddModalOpen,
    isVibrateEnabled,
    setIsVibrateEnabled,
    isSoundEnabled,
    setIsSoundEnabled,
    isAutoPopupEnabled,
    setIsAutoPopupEnabled,
    handleAcknowledgeAlarm,
    handleAcknowledgeAllAlarms,

    isSidebarOpen,
    setIsSidebarOpen,
    isDashMenuOpen,
    setIsDashMenuOpen,
    isAddPanelOpen,
    setIsAddPanelOpen,
    editingPanel,
    setEditingPanel,
    editingDashboard,
    setEditingDashboard,
    editingConnection,
    setEditingConnection,
    activeConnMenuId,
    setActiveConnMenuId,
    activeDashTabMenuId,
    setActiveDashTabMenuId,
    sharingConnection,
    setSharingConnection,
    isCloneModalOpen,
    setIsCloneModalOpen,
    isAiDrawerOpen,
    setIsAiDrawerOpen,

    handlePublish,
    executePublish,
    handleAddPanelSelect,
    handleSavePanel,
    handleDeletePanel,
    handleClonePanels,
    handleQuickClonePanel,
    handleReorderPanels,
    handleQuickResizePanel,
    handleCreateConnection,
    handleDeleteConnection,
    handleCopyConnection,
    handleAddDriverConnection,
    handleUpdateDriverConnection,
    handleDeleteDriverConnection,
    handleAddDriverTag,
    handleUpdateDriverTag,
    handleDeleteDriverTag,
    handleImportDriverTags,
    handleImportOpcUaTag,
    handleDeleteDashboard,
    handleCopyDashboard,
    handleEditDashboard,
    handleOpenActiveBrokerSettings,
    handleShareDashboard,
    handleSelectDashboard,
    handleToggleLock,
    handleEditLayout,
    handleOpenAddPanel,
    handleLoadHatcheryDemo,
    handleSaveAndExitSession,
    handleExitSessionWithoutSave,
    handleClearClientSavedSetup,
    handleLoadSavedClientSetup,
    handleLoadSavedCommunitySetup,
    handleRequestExitSession,
    handleRequestClearAll,
    handleConfirmClearAll
  }), [
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
    currentView,
    setCurrentView,
    activeConnectionId,
    setActiveConnectionId,
    activeDashboardId,
    setActiveDashboardId,
    activeMode,
    setActiveMode,
    isLayoutMode,
    setIsLayoutMode,
    selectedPanelId,
    setSelectedPanelId,
    isEngineeringChoiceOpen,
    setIsEngineeringChoiceOpen,
    activeConnection,
    activeDashboard,
    activePanels,
    activeConnectionDashboards,
    editionMgr,
    activeThemeObj,
    latestValues,
    setLatestValues,
    historyValues,
    setHistoryValues,
    mqttLogs,
    mqttConnected,
    isSimulated,
    setIsSimulated,
    nowMs,
    activeAlarms,
    acknowledgedAlarms,
    latestAlarmTriggered,
    isAlarmModalOpen,
    setIsAlarmModalOpen,
    isAlarmHistorianModalOpen,
    setIsAlarmHistorianModalOpen,
    isFddModalOpen,
    setIsFddModalOpen,
    isVibrateEnabled,
    setIsVibrateEnabled,
    isSoundEnabled,
    setIsSoundEnabled,
    isAutoPopupEnabled,
    setIsAutoPopupEnabled,
    handleAcknowledgeAlarm,
    handleAcknowledgeAllAlarms,
    isSidebarOpen,
    setIsSidebarOpen,
    isDashMenuOpen,
    setIsDashMenuOpen,
    isAddPanelOpen,
    setIsAddPanelOpen,
    editingPanel,
    setEditingPanel,
    editingDashboard,
    setEditingDashboard,
    editingConnection,
    setEditingConnection,
    activeConnMenuId,
    setActiveConnMenuId,
    activeDashTabMenuId,
    setActiveDashTabMenuId,
    sharingConnection,
    setSharingConnection,
    isCloneModalOpen,
    setIsCloneModalOpen,
    isAiDrawerOpen,
    setIsAiDrawerOpen,
    handlePublish,
    executePublish,
    handleAddPanelSelect,
    handleSavePanel,
    handleDeletePanel,
    handleClonePanels,
    handleQuickClonePanel,
    handleReorderPanels,
    handleQuickResizePanel,
    handleCreateConnection,
    handleDeleteConnection,
    handleCopyConnection,
    handleAddDriverConnection,
    handleUpdateDriverConnection,
    handleDeleteDriverConnection,
    handleAddDriverTag,
    handleUpdateDriverTag,
    handleDeleteDriverTag,
    handleImportDriverTags,
    handleImportOpcUaTag,
    handleDeleteDashboard,
    handleCopyDashboard,
    handleEditDashboard,
    handleOpenActiveBrokerSettings,
    handleShareDashboard,
    handleSelectDashboard,
    handleToggleLock,
    handleEditLayout,
    handleOpenAddPanel,
    handleLoadHatcheryDemo,
    handleSaveAndExitSession,
    handleExitSessionWithoutSave,
    handleClearClientSavedSetup,
    handleLoadSavedClientSetup,
    handleLoadSavedCommunitySetup,
    handleRequestExitSession,
    handleRequestClearAll,
    handleConfirmClearAll
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}
