import React from 'react';
import { 
  AppView, 
  AppState, 
  MqttConnection, 
  Dashboard, 
  Panel, 
  ProductEdition
} from './types';
import { AppContextProvider, useAppContext } from './store/AppContext';
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
import LandingPage from './components/LandingPage';
import ExportClientPackageModal from './components/ExportClientPackageModal';
import ExitSessionModal from './components/ExitSessionModal';
import ClearAllModal from './components/ClearAllModal';
import TopicManagerView from './components/TopicManagerView';
import TagManagerView from './components/TagManagerView';
import { HistorianTrendView } from './components/HistorianTrendView';
import DriverConnectionsView from './components/DriverConnectionsView';
import DriverTagManagerView from './components/DriverTagManagerView';
import OpcUaBrowserView from './components/OpcUaBrowserView';
import DriverDiagnosticsView from './components/DriverDiagnosticsView';
import AppLogo from './components/AppLogo';
import EngineeringChoiceModal from './components/EngineeringChoiceModal';
import WebHmiCanvasView from './components/WebHmiCanvasView';
import { sanitizeAppState } from './utils/EditionManager';
import { ConfirmModal } from './components/ConfirmModal';
import { FddPredictiveMaintenanceModal } from './components/FddPredictiveMaintenanceModal';
import { CoachMarkOverlay } from './components/CoachMarkOverlay';
import { UserManualView } from './components/UserManualView';
import { ReportingView } from './components/ReportingView';
import { useDeviceCapability } from './utils/deviceDetection';
import { MultiDriverStatusPill } from './components/MultiDriverStatusPill';
import { saveCommercialState } from './utils/editionStorage';
import { AlarmHistorianModal } from './components/AlarmHistorianModal';
import { AiAssistantView } from './components/AiAssistantView';
import { AiChatFab } from './components/AiChatFab';
import { AiChatDrawer } from './components/AiChatDrawer';
import { AiErrorBoundary } from './components/AiErrorBoundary';

function AppContent() {
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
    showLockedNotice,
    setShowLockedNotice,
    isPinModalOpen,
    setIsPinModalOpen,
    pinModalMode,
    setPinModalMode,
    pendingAction,
    setPendingAction,
    isFullscreen,
    handleToggleFullscreen,
    handleExitFullscreen,
    isTourOpen,
    setIsTourOpen,
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
    isEngineeringChoiceOpen,
    setIsEngineeringChoiceOpen,
    activeConnection,
    activeDashboard,
    activePanels,
    editionMgr,
    activeThemeObj,
    latestValues,
    historyValues,
    mqttConnected,
    isSimulated,
    activeAlarms,
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
    sharingConnection,
    setSharingConnection,
    isCloneModalOpen,
    setIsCloneModalOpen,
    isAiDrawerOpen,
    setIsAiDrawerOpen,
    handlePublish,
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
  } = useAppContext();

  const { isDesktop, isMobile } = useDeviceCapability();

  // Render Landing Page view when on startup gate
  if (userRole === 'gate' || productEdition === ProductEdition.LANDING) {
    return (
      <LandingPage
        appState={appState}
        hasSavedClientSetup={isClientSetupSaved}
        onLoadSavedClientSetup={() => handleLoadSavedClientSetup((dashId, connId) => {
          if (dashId) setActiveDashboardId(dashId);
          if (connId) setActiveConnectionId(connId);
          setCurrentView(AppView.DASHBOARD);
        })}
        onLoadSavedCommunitySetup={(asClientMode) => handleLoadSavedCommunitySetup(asClientMode, (dashId, connId) => {
          if (dashId) setActiveDashboardId(dashId);
          if (connId) setActiveConnectionId(connId);
          setCurrentView(AppView.DASHBOARD);
        })}
        onSelectCommunityMode={() => {
          const freshDash: Dashboard = {
            dashboardId: 'dash_main',
            dashboardName: 'Main Dashboard',
            connectionId: 'conn_demo',
            isHome: true,
            themeColor: '#10b981'
          };
          setUserRole('community');
          setProductEdition(ProductEdition.COMMUNITY);
          setAppState(prev => sanitizeAppState({
            ...prev,
            userRole: 'community',
            productEdition: ProductEdition.COMMUNITY,
            packageOrigin: 'community',
            isLockedPackage: false,
            dashboards: prev.dashboards.length > 0 && prev.panels.length === 0 ? prev.dashboards : [freshDash],
            panels: []
          }));
          setActiveDashboardId('dash_main');
          setIsEngineeringChoiceOpen(true);
          setCurrentView(AppView.DASHBOARD);
        }}
        onLoginAdmin={() => {
          const freshDash: Dashboard = {
            dashboardId: 'dash_main',
            dashboardName: 'Main Dashboard',
            connectionId: 'conn_demo',
            isHome: true,
            themeColor: '#0ea5e9'
          };
          setUserRole('admin');
          setProductEdition(ProductEdition.ENGINEERING);
          setAppState(prev => ({
            ...prev,
            userRole: 'admin',
            productEdition: ProductEdition.ENGINEERING,
            packageOrigin: 'engineering',
            isLockedPackage: false,
            dashboards: prev.dashboards.length > 0 && prev.panels.length === 0 ? prev.dashboards : [freshDash],
            panels: []
          }));
          setActiveDashboardId('dash_main');
          setIsEngineeringChoiceOpen(true);
          setCurrentView(AppView.DASHBOARD);
        }}
        onImportClientPackage={(newAppState, clientName, expiresAt, preferredWorkstationMode) => {
          const finalState: AppState = {
            ...newAppState,
            userRole: 'client',
            productEdition: ProductEdition.CLIENT_RUNTIME,
            packageOrigin: 'commercial',
            isLockedPackage: true,
            clientInfo: {
              clientName,
              expiresAt,
              isSignedPackage: true
            }
          };
          setAppState(finalState);
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
          saveCommercialState(finalState);
          setIsClientSetupSaved(true);
          setCurrentView(AppView.DASHBOARD);
        }}
        accentColor={activeThemeObj.primary}
      />
    );
  }

  const activeMqttConnection = activeConnection;

  // Render main screen view
  return (
    <div className="flex flex-col h-screen w-screen text-slate-200 overflow-hidden font-sans select-none" style={{ backgroundColor: activeThemeObj.bgCanvas }}>
      {/* Top Navbar */}
      <header 
        onWheel={(e) => {
          if (isMobile && e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className={`theme-header px-2 sm:px-3 border-b border-slate-800 flex items-center justify-between z-40 backdrop-blur-md w-full max-w-full ${
          isDesktop
            ? 'flex-wrap min-h-[48px] py-1 gap-y-1.5 overflow-visible'
            : 'h-11 sm:h-[48px] overflow-x-auto custom-horizontal-scrollbar touch-scroll overscroll-x-contain shrink-0'
        }`}
      >
        <div className={`flex items-center gap-1.5 sm:gap-2 ${isDesktop ? 'flex-wrap' : 'shrink-0'}`}>
          
          {/* Sticky Left Brand Container (Hamburger + Logo + Title) */}
          <div className="flex items-center space-x-1.5 shrink-0 sticky left-0 theme-header z-30 pr-1.5">
            <button 
              type="button" 
              data-tour="sidebar-btn"
              onClick={() => setIsSidebarOpen(true)}
              className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/80 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Open Menu"
            >
              <i className="fas fa-bars text-sm sm:text-base"></i>
            </button>
            
            <AppLogo 
              size="sm" 
              accentColor={activeThemeObj.primary} 
              isCommunity={userRole === 'community' || productEdition === ProductEdition.COMMUNITY} 
            />
            <span className="font-extrabold text-white text-xs sm:text-sm tracking-tight whitespace-nowrap shrink-0 hidden lg:inline">TASC IIoT Studio</span>
          </div>

          {/* Multi-Driver & MQTT Live Connection Status Pill with Multi-Dots & Dropdown Popover */}
          <div data-tour="drivers-pill">
            <MultiDriverStatusPill
              mqttConnection={activeMqttConnection}
              allMqttConnections={appState.connections}
              mqttConnected={mqttConnected}
              isSimulated={isSimulated}
              driverConnections={appState.driverConnections}
              isClient={editionMgr.IsClient() || userRole === 'client' || !!appState.isLockedPackage}
              onOpenMqttSettings={handleOpenActiveBrokerSettings}
              onOpenDriverConnections={() => setCurrentView(AppView.DRIVER_CONNECTIONS)}
            />
          </div>

          {/* Inbuilt Alarm Center Bell Button */}
          <button
            type="button"
            data-tour="alarms-btn"
            onClick={() => setIsAlarmModalOpen(true)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer relative shrink-0 min-h-[30px] ${
              activeAlarms.length > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/60 hover:bg-rose-500/30 animate-pulse'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white'
            }`}
            title="Telemetry Inbuilt Parameter Alarms"
          >
            <i className={`fas fa-bell text-xs ${activeAlarms.length > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`}></i>
            <span className="hidden lg:inline">ALARMS</span>
            {activeAlarms.length > 0 && (
              <span className="bg-rose-500 text-black text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full">
                {activeAlarms.length}
              </span>
            )}
          </button>

          {/* Alarm Historian Button */}
          <button
            type="button"
            data-tour="historian-btn"
            onClick={() => setIsAlarmHistorianModalOpen(true)}
            className="flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/30 transition-all cursor-pointer shadow-sm shrink-0 min-h-[30px]"
            title="Industrial Alarm Historian Window (FIFO Storage & Exporter)"
          >
            <i className="fas fa-history text-xs text-indigo-400"></i>
            <span className="hidden xl:inline">HISTORIAN</span>
          </button>

          {/* TASC FDD & Predictive CBM Button (PC / Desktop Exclusive) */}
          {isDesktop && (
            <button
              type="button"
              data-tour="fdd-btn"
              onClick={() => setIsFddModalOpen(true)}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-gradient-to-r from-amber-600/20 to-indigo-600/20 text-amber-300 border border-amber-500/50 hover:bg-amber-600/30 transition-all cursor-pointer shadow-sm shrink-0 min-h-[30px]"
              title="TASC FDD Fault Detection, CBM & Predictive Maintenance"
            >
              <i className="fas fa-shield-halved text-xs text-amber-400"></i>
              <span className="hidden xl:inline">FDD / CBM</span>
            </button>
          )}

          {/* User Manual Handbook Button */}
          <button
            type="button"
            data-tour="manual-btn"
            onClick={() => setCurrentView(AppView.USER_MANUAL)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer shadow-sm shrink-0 min-h-[30px] ${
              currentView === AppView.USER_MANUAL
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-slate-800/90 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-750'
            }`}
            title="Comprehensive Engineering User Manual & Schematics Book"
          >
            <i className="fas fa-book-bookmark text-xs text-sky-400" />
            <span className="hidden 2xl:inline">MANUAL</span>
          </button>

          {/* Reports Button */}
          <button
            type="button"
            onClick={() => {
              setCurrentView(AppView.REPORTING);
              setUnreadScheduledReports(0);
            }}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer shadow-sm shrink-0 min-h-[30px] ${
              currentView === AppView.REPORTING
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-slate-800/90 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-750'
            }`}
            title="Reports — Template Ingestion, Automated Schedules & AI Reports"
          >
            <i className="fas fa-chart-bar text-xs text-sky-400" />
            <span className="hidden 2xl:inline">REPORTS</span>
            {unreadScheduledReports > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] animate-pulse">
                {unreadScheduledReports}
              </span>
            )}
          </button>

          {userRole === 'community' || productEdition === ProductEdition.COMMUNITY ? (
            <div className="flex items-center space-x-1.5 shrink-0">
              {/* Ultra-Compact Community Edition Badge */}
              <button
                type="button"
                onClick={handleRequestExitSession}
                className="flex items-center space-x-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-500/30 transition-all cursor-pointer shrink-0 min-h-[30px]"
                title={`Community Edition (Free) • ${appState.dashboards.length} Screens / 10 Widgets Max — Click to exit / change mode`}
              >
                <i className="fas fa-cube text-xs text-emerald-400"></i>
                <span className="hidden 2xl:inline">COMMUNITY</span>
                <span className={`text-[9px] px-1 rounded font-mono font-extrabold ${appState.panels.length > 10 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'}`}>
                  Demo ({appState.panels.length}/10W)
                </span>
              </button>

              {!isFullscreen && (
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="flex items-center space-x-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 min-h-[30px]"
                  title="Toggle Fullscreen Mode"
                >
                  <i className="fas fa-expand text-xs text-emerald-400"></i>
                  <span className="hidden md:inline">Full Screen</span>
                </button>
              )}

              {/* Workstation Mode Switcher Toggle for Community Edition */}
              <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0 min-h-[30px]">
                <button
                  type="button"
                  onClick={() => setActiveMode('grid')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                    activeMode === 'grid'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to IIoT Grid Dashboard Studio"
                >
                  <i className="fas fa-border-all text-xs"></i>
                  <span className="hidden sm:inline">Grid Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('hmi')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                    activeMode === 'hmi'
                      ? 'bg-sky-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to Absolute Web HMI Canvas Designer"
                >
                  <i className="fas fa-microchip text-xs"></i>
                  <span className="hidden sm:inline">HMI Canvas</span>
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

              {/* HMI Screen Switcher Dropdown */}
              {appState.dashboards && appState.dashboards.length > 0 && (
                <select
                  value={activeDashboardId}
                  onChange={(e) => handleSelectDashboard(e.target.value)}
                  className="bg-slate-950 text-sky-400 font-bold text-xs px-2 py-1 rounded-lg border border-slate-800 outline-none focus:border-sky-500 cursor-pointer max-w-[130px] sm:max-w-[180px] shadow-inner shrink-0 truncate hover:border-slate-700 transition-colors min-h-[30px]"
                  title="Switch Active HMI Screen Page"
                >
                  {appState.dashboards.map(d => (
                    <option key={d.dashboardId} value={d.dashboardId} className="bg-slate-900 text-white font-normal">
                      {d.dashboardName} {d.isHome ? '★ (Home)' : ''}
                    </option>
                  ))}
                </select>
              )}

              {/* Inline Fullscreen Controls */}
              {isFullscreen && (
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('hmi-restore-autofit'))}
                    className="flex items-center space-x-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition-all cursor-pointer shrink-0 min-h-[30px]"
                    title="Restore Fit (Reset zoom to fit all screen elements)"
                  >
                    <i className="fas fa-compress-arrows-alt text-xs text-indigo-400"></i>
                    <span className="hidden md:inline">Restore Fit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExitFullscreen}
                    className="flex items-center space-x-1 bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition-all cursor-pointer shrink-0 min-h-[30px]"
                    title="Exit Full Screen Mode"
                  >
                    <i className="fas fa-compress text-xs text-sky-400"></i>
                    <span className="hidden md:inline">Exit Full Screen</span>
                  </button>
                </div>
              )}
            </div>
          ) : userRole === 'client' || productEdition === ProductEdition.CLIENT_RUNTIME ? (
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={handleRequestExitSession}
                className="flex items-center space-x-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-sky-500/30 transition-all cursor-pointer shrink-0 min-h-[30px]"
                title="Client Edition (Operator Mode) — Click to exit / change mode"
              >
                <i className="fas fa-shield-halved text-xs text-sky-400"></i>
                <span className="hidden lg:inline">{clientInfo?.clientName || 'CLIENT EDITION'}</span>
                <span className="text-[9px] bg-sky-500 text-slate-950 px-1 rounded font-mono font-extrabold">OPERATOR</span>
              </button>

              {!isFullscreen && (
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="flex items-center space-x-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 min-h-[30px]"
                  title="Toggle Fullscreen Mode"
                >
                  <i className="fas fa-expand text-xs text-sky-400"></i>
                  <span className="hidden md:inline">Full Screen</span>
                </button>
              )}

              {/* Workstation Mode Switcher Toggle for Client Edition */}
              <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0 min-h-[30px]">
                <button
                  type="button"
                  onClick={() => setActiveMode('grid')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                    activeMode === 'grid'
                      ? 'bg-sky-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to IIoT Grid Dashboard View"
                >
                  <i className="fas fa-border-all text-xs"></i>
                  <span className="hidden sm:inline">Grid View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('hmi')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                    activeMode === 'hmi'
                      ? 'bg-sky-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to Absolute Web HMI Canvas View"
                >
                  <i className="fas fa-microchip text-xs"></i>
                  <span className="hidden sm:inline">HMI View</span>
                </button>
              </div>

              {/* HMI Screen Switcher Dropdown */}
              {appState.dashboards && appState.dashboards.length > 0 && (
                <select
                  value={activeDashboardId}
                  onChange={(e) => handleSelectDashboard(e.target.value)}
                  className="bg-slate-950 text-sky-400 font-bold text-xs px-2 py-1 rounded-lg border border-slate-800 outline-none focus:border-sky-500 cursor-pointer max-w-[130px] sm:max-w-[180px] shadow-inner shrink-0 truncate hover:border-slate-700 transition-colors min-h-[30px]"
                  title="Switch Active HMI Screen Page"
                >
                  {appState.dashboards.map(d => (
                    <option key={d.dashboardId} value={d.dashboardId} className="bg-slate-900 text-white font-normal">
                      {d.dashboardName} {d.isHome ? '★ (Home)' : ''}
                    </option>
                  ))}
                </select>
              )}

              {/* Inline Fullscreen Controls */}
              {isFullscreen && (
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('hmi-restore-autofit'))}
                    className="flex items-center space-x-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition-all cursor-pointer shrink-0 min-h-[30px]"
                    title="Restore Fit (Reset zoom to fit all screen elements)"
                  >
                    <i className="fas fa-compress-arrows-alt text-xs text-indigo-400"></i>
                    <span className="hidden md:inline">Restore Fit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExitFullscreen}
                    className="flex items-center space-x-1 bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition-all cursor-pointer shrink-0 min-h-[30px]"
                    title="Exit Full Screen Mode"
                  >
                    <i className="fas fa-compress text-xs text-sky-400"></i>
                    <span className="hidden md:inline">Exit Full Screen</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 shrink-0">

              {!isFullscreen && (
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="flex items-center space-x-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 min-h-[30px]"
                  title="Toggle Fullscreen Mode"
                >
                  <i className="fas fa-expand text-xs text-amber-400"></i>
                  <span className="hidden md:inline">Full Screen</span>
                </button>
              )}

              {/* Workstation Mode Switcher Toggle */}
              <div data-tour="view-toggle" className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0 min-h-[30px]">
                <button
                  type="button"
                  onClick={() => setActiveMode('grid')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                    activeMode === 'grid'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to IIoT Grid Dashboard Studio"
                >
                  <i className="fas fa-border-all text-xs"></i>
                  <span className="hidden sm:inline">Grid Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('hmi')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
                    activeMode === 'hmi'
                      ? 'bg-sky-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to Absolute Web HMI Canvas Designer"
                >
                  <i className="fas fa-microchip text-xs"></i>
                  <span className="hidden sm:inline">HMI Canvas</span>
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

              {/* HMI Screen Switcher Dropdown */}
              {appState.dashboards && appState.dashboards.length > 0 && (
                <select
                  value={activeDashboardId}
                  onChange={(e) => handleSelectDashboard(e.target.value)}
                  className="bg-slate-950 text-sky-400 font-bold text-xs px-2 py-1 rounded-lg border border-slate-800 outline-none focus:border-sky-500 cursor-pointer max-w-[130px] sm:max-w-[180px] shadow-inner shrink-0 truncate hover:border-slate-700 transition-colors min-h-[30px]"
                  title="Switch Active HMI Screen Page"
                >
                  {appState.dashboards.map(d => (
                    <option key={d.dashboardId} value={d.dashboardId} className="bg-slate-900 text-white font-normal">
                      {d.dashboardName} {d.isHome ? '★ (Home)' : ''}
                    </option>
                  ))}
                </select>
              )}

              {/* Inline Fullscreen Controls */}
              {isFullscreen && (
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('hmi-restore-autofit'))}
                    className="flex items-center space-x-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition-all cursor-pointer shrink-0 min-h-[30px]"
                    title="Restore Fit (Reset zoom to fit all screen elements)"
                  >
                    <i className="fas fa-compress-arrows-alt text-xs text-indigo-400"></i>
                    <span className="hidden md:inline">Restore Fit</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExitFullscreen}
                    className="flex items-center space-x-1 bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold transition-all cursor-pointer shrink-0 min-h-[30px]"
                    title="Exit Full Screen Mode"
                  >
                    <i className="fas fa-compress text-xs text-sky-400"></i>
                    <span className="hidden md:inline">Exit Full Screen</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Toolbar */}
        <div className={`flex items-center gap-1.5 ${isDesktop ? 'flex-wrap' : 'shrink-0'}`}>

          {currentView === AppView.DASHBOARD && activeMode === 'grid' && (
            <>
              {!isFullscreen && (
                <button 
                  type="button"
                  onClick={() => {
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

              {/* 3-Dot Dropdown Menu - Shown strictly in Grid Studio mode */}
              <button 
                onClick={() => setIsDashMenuOpen(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Dashboard Options Menu"
              >
                <i className="fas fa-ellipsis-vertical text-sm"></i>
              </button>
            </>
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
              <WebHmiCanvasView />
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
                  {editionMgr.IsClient() || userRole === 'client' || appState.isLockedPackage
                    ? 'No dashboard panels deployed on this screen yet.'
                    : 'Click the button below to add real-time gauges, switches, line graphs, and controls to this Bento dashboard.'}
                </p>
                {!editionMgr.IsClient() && userRole !== 'client' && !appState.isLockedPackage && (
                  <button 
                    onClick={handleOpenAddPanel}
                    className="px-6 py-3 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: activeThemeObj.primary,
                      boxShadow: `0 10px 25px -5px ${activeThemeObj.primary}40`
                    }}
                  >
                    Create First Panel
                  </button>
                )}
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
            onSaveRuntimeTimeout={(mins) => setAppState(prev => ({ ...prev, runtimePinTimeoutMinutes: mins }))}
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

        {currentView === AppView.HISTORIAN_TREND && (
          <HistorianTrendView />
        )}

        {currentView === AppView.DRIVER_CONNECTIONS && (
          <DriverConnectionsView />
        )}

        {currentView === AppView.DRIVER_TAG_MANAGER && (
          <DriverTagManagerView />
        )}

        {currentView === AppView.OPC_UA_BROWSER && (
          <OpcUaBrowserView
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            appState={appState}
            onNavigate={setCurrentView}
            onImportTag={handleImportOpcUaTag}
          />
        )}

        {currentView === AppView.DRIVER_DIAGNOSTICS && (
          <DriverDiagnosticsView
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            appState={appState}
            onNavigate={setCurrentView}
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

        {currentView === AppView.AI_ASSISTANT && (
          <AiErrorBoundary>
            <AiAssistantView />
          </AiErrorBoundary>
        )}

        {currentView === AppView.USER_MANUAL && (
          <UserManualView
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            onNavigate={setCurrentView}
            onOpenTour={() => setIsTourOpen(true)}
          />
        )}

        {currentView === AppView.REPORTING && (
          <ReportingView
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            onNavigate={setCurrentView}
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
        onOpenTour={() => setIsTourOpen(true)}
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
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirmClearAll={handleConfirmClearAll}
        widgetCount={appState.panels.length}
        connectionCount={appState.connections.length}
        dashboardCount={appState.dashboards.length}
        editionName={userRole === 'community' || productEdition === ProductEdition.COMMUNITY ? 'Community Edition' : 'Engineering Studio'}
      />

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
        isSoundEnabled={isSoundEnabled}
        onToggleSound={() => setIsSoundEnabled(!isSoundEnabled)}
        isAutoPopupEnabled={isAutoPopupEnabled}
        onToggleAutoPopup={() => setIsAutoPopupEnabled(!isAutoPopupEnabled)}
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
        isCommunity={userRole === 'community' || productEdition === ProductEdition.COMMUNITY}
      />

      {/* TASC FDD Fault Detection, CBM & Predictive Maintenance (Desktop Only) */}
      {isDesktop && (
        <FddPredictiveMaintenanceModal
          isOpen={isFddModalOpen}
          onClose={() => setIsFddModalOpen(false)}
        />
      )}

      {/* Interactive Coach Mark Screen Overlay Walkthrough */}
      <CoachMarkOverlay
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigate={setCurrentView}
        onOpenFdd={() => setIsFddModalOpen(true)}
        onOpenAlarms={() => setIsAlarmModalOpen(true)}
        onOpenHistorian={() => setIsAlarmHistorianModalOpen(true)}
      />

      {/* AI Copilot FAB */}
      {userRole !== 'client' &&
       (currentView === AppView.DASHBOARD || currentView === AppView.WEB_HMI) && (
        <AiChatFab onClick={() => setIsAiDrawerOpen(true)} />
      )}

      {/* AI Copilot Slide-in Drawer */}
      {userRole !== 'client' && (
        <AiChatDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          latestValues={latestValues}
          appState={appState}
          activeAlarms={activeAlarms}
          onOpenFullAssistant={() => {
            setIsAiDrawerOpen(false);
            setCurrentView(AppView.AI_ASSISTANT);
          }}
        />
      )}

      {/* Session Exit Confirmation Modal */}
      <ExitSessionModal
        isOpen={isExitSessionModalOpen}
        onClose={() => setIsExitSessionModalOpen(false)}
        onSaveAndExit={handleSaveAndExitSession}
        onExitWithoutSave={handleExitSessionWithoutSave}
        isCommunitySave={
          appState.packageOrigin === 'community' ||
          userRole === 'community' ||
          productEdition === ProductEdition.COMMUNITY ||
          appState.clientInfo?.clientName === 'Community Edition Save' ||
          (!appState.clientInfo?.isSignedPackage && userRole !== 'admin')
        }
        editionName={
          userRole === 'community' || productEdition === ProductEdition.COMMUNITY
            ? 'Community Edition'
            : appState.packageOrigin === 'community' || appState.clientInfo?.clientName === 'Community Edition Save'
            ? 'Client Edition (Community Demo Save)'
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

export function App() {
  return (
    <AppContextProvider>
      <AppContent />
    </AppContextProvider>
  );
}

export default App;
