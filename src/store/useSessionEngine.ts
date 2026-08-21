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
  dashboards: [
    {
      dashboardId: 'dash_main',
      dashboardName: 'Main Dashboard',
      connectionId: 'conn_demo',
      isHome: true,
      themeColor: '#38bdf8'
    }
  ],
  panels: [],
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
  historianTags: []
};

export function useSessionEngine() {
  const [appState, setAppState] = useState<AppState>(() => {
    const persisted = loadPersistedState();
    if (persisted) return persisted;
    return sanitizeAppState(INITIAL_STATE);
  });

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
    const isCommunity = 
      appState.packageOrigin === 'community' ||
      userRole === 'community' || 
      productEdition === ProductEdition.COMMUNITY ||
      appState.clientInfo?.clientName === 'Community Edition Save' ||
      (!appState.clientInfo?.isSignedPackage && userRole !== 'admin');

    if (isCommunity) {
      saveCommunityState(appState);
    } else {
      saveCommercialState(appState);
      setIsClientSetupSaved(true);
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
