import React, { useEffect } from 'react';
import { 
  AppView, 
  AppState, 
  MqttConnection, 
  Dashboard, 
  Panel, 
  ProductEdition
} from './types';
import { AppContextProvider, useAppContext } from './store/AppContext';
import Sidebar from './components/Sidebar';
import AddConnectionView from './components/AddConnectionView';
import AddDashboardView from './components/AddDashboardView';
import SettingsView from './components/SettingsView';
import BackupRestoreView from './components/BackupRestoreView';
import LandingPage from './components/LandingPage';
import TopicManagerView from './components/TopicManagerView';
import TagManagerView from './components/TagManagerView';
import { HistorianTrendView } from './components/HistorianTrendView';
import DriverConnectionsView from './components/DriverConnectionsView';
import DriverTagManagerView from './components/DriverTagManagerView';
import OpcUaBrowserView from './components/OpcUaBrowserView';
import DriverDiagnosticsView from './components/DriverDiagnosticsView';
import WebHmiCanvasView from './components/WebHmiCanvasView';
import { sanitizeAppState } from './utils/EditionManager';
import { UserManualView } from './components/UserManualView';
import { ReportingView } from './components/ReportingView';
import { SqlStudioView } from './components/SqlStudioView';
import { useDeviceCapability } from './utils/deviceDetection';
import { saveCommercialState } from './utils/editionStorage';
import { AiAssistantView } from './components/AiAssistantView';
import { AiErrorBoundary } from './components/AiErrorBoundary';
import { Scada3dEditorView } from './3d/ui/Scada3dEditorView';
import { OeeStudioView } from './components/oee/OeeStudioView';
import { TraceabilityStudioView } from './components/traceability/TraceabilityStudioView';
import { TopNavbar } from './components/TopNavbar';
import { ModalRegistry } from './components/ModalRegistry';

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
    isHmiEditMode,
    selectedPanelId,
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

  // Global listener for cross-studio navigation events
  useEffect(() => {
    const handleNavEvent = (e: any) => {
      if (e.detail && Object.values(AppView).includes(e.detail)) {
        setCurrentView(e.detail as AppView);
      }
    };
    window.addEventListener('tasc_navigate_view', handleNavEvent);
    return () => window.removeEventListener('tasc_navigate_view', handleNavEvent);
  }, [setCurrentView]);

  const activeMqttConnection = activeConnection;

  // Render main screen view
  return (
    <div className="flex flex-col h-screen w-screen text-slate-200 overflow-hidden font-sans select-none" style={{ backgroundColor: activeThemeObj.bgCanvas }}>
      {/* Top Navbar */}
      <TopNavbar
        appState={appState}
        userRole={userRole}
        productEdition={productEdition}
        clientInfo={clientInfo}
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeConnection={activeConnection}
        activeDashboardId={activeDashboardId}
        setActiveDashboardId={setActiveDashboardId}
        isHmiEditMode={isHmiEditMode}
        isLocked={isLocked}
        handleToggleLock={handleToggleLock}
        isFullscreen={isFullscreen}
        handleToggleFullscreen={handleToggleFullscreen}
        handleExitFullscreen={handleExitFullscreen}
        unreadScheduledReports={unreadScheduledReports}
        setUnreadScheduledReports={setUnreadScheduledReports}
        mqttConnected={mqttConnected}
        isSimulated={isSimulated}
        activeAlarms={activeAlarms}
        activeThemeObj={activeThemeObj}
        editionMgr={editionMgr}
        setIsSidebarOpen={setIsSidebarOpen}
        setIsAlarmModalOpen={setIsAlarmModalOpen}
        setIsAlarmHistorianModalOpen={setIsAlarmHistorianModalOpen}
        setIsFddModalOpen={setIsFddModalOpen}
        setIsCloneModalOpen={setIsCloneModalOpen}
        setIsDashMenuOpen={setIsDashMenuOpen}
        handleOpenActiveBrokerSettings={handleOpenActiveBrokerSettings}
        handleSelectDashboard={handleSelectDashboard}
        handleRequestExitSession={handleRequestExitSession}
        setShowClientReadOnlyNotice={setShowClientReadOnlyNotice}
        setCommunityLimitNotice={setCommunityLimitNotice}
        handleOpenAddPanel={handleOpenAddPanel}
      />


      {/* Main Content Area */}
      <main className="flex-grow overflow-hidden flex flex-col relative">
        {currentView === AppView.DASHBOARD && (
          <div className="flex-grow p-0.5 flex flex-col overflow-hidden h-full">
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

            <WebHmiCanvasView />
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

        {currentView === AppView.SCADA_3D && (
          isMobile ? (
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl mb-3 shadow-lg">
                <i className="fas fa-cube"></i>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Desktop SCADA Feature</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                3D SCADA Studio scene authoring requires a desktop PC environment.
              </p>
              <button
                onClick={() => setCurrentView(AppView.DASHBOARD)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <Scada3dEditorView
              onBack={() => setCurrentView(AppView.DASHBOARD)}
              latestValues={latestValues}
              dashboards={appState.dashboards}
              onNavigateTo2dDashboard={(dashId) => {
                setActiveDashboardId(dashId);
                setActiveMode('hmi');
                setCurrentView(AppView.DASHBOARD);
              }}
              userRole={userRole}
            />
          )
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

        {currentView === AppView.SQL_STUDIO && (
          isMobile ? (
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-2xl mb-3 shadow-lg">
                <i className="fas fa-table-columns"></i>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Desktop Workstation Feature</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                SQL Server Connector & Database Studio requires a desktop PC environment for multi-tab SQL querying and data manipulation.
              </p>
              <button
                onClick={() => setCurrentView(AppView.DASHBOARD)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <SqlStudioView
              onBack={() => setCurrentView(AppView.DASHBOARD)}
              appState={appState}
              onNavigate={setCurrentView}
            />
          )
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

        {currentView === AppView.OEE_STUDIO && (
          <OeeStudioView
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            latestValues={latestValues}
            onNavigateTo2dDashboard={(dashId) => {
              setActiveDashboardId(dashId);
              setActiveMode('hmi');
              setCurrentView(AppView.DASHBOARD);
            }}
          />
        )}

        {currentView === AppView.TRACEABILITY_STUDIO && (
          <TraceabilityStudioView
            onBack={() => setCurrentView(AppView.DASHBOARD)}
            latestValues={latestValues}
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

      <ModalRegistry
        appState={appState}
        setAppState={setAppState}
        userRole={userRole}
        productEdition={productEdition}
        clientInfo={clientInfo}
        currentView={currentView}
        setCurrentView={setCurrentView}
        isLocked={isLocked}
        editionMgr={editionMgr}
        activeDashboard={activeDashboard}
        activeAlarms={activeAlarms}
        latestAlarmTriggered={latestAlarmTriggered}
        latestValues={latestValues}
        isDashMenuOpen={isDashMenuOpen}
        setIsDashMenuOpen={setIsDashMenuOpen}
        isPinModalOpen={isPinModalOpen}
        setIsPinModalOpen={setIsPinModalOpen}
        pinModalMode={pinModalMode}
        pendingAction={pendingAction}
        setPendingAction={setPendingAction}
        isAddPanelOpen={isAddPanelOpen}
        setIsAddPanelOpen={setIsAddPanelOpen}
        editingPanel={editingPanel}
        setEditingPanel={setEditingPanel}
        editingDashboard={editingDashboard}
        setEditingDashboard={setEditingDashboard}
        isCloneModalOpen={isCloneModalOpen}
        setIsCloneModalOpen={setIsCloneModalOpen}
        sharingConnection={sharingConnection}
        setSharingConnection={setSharingConnection}
        isExportClientPackageOpen={isExportClientPackageOpen}
        setIsExportClientPackageOpen={setIsExportClientPackageOpen}
        isClearAllModalOpen={isClearAllModalOpen}
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        isClientSetupSaved={isClientSetupSaved}
        setIsClientSetupSaved={setIsClientSetupSaved}
        isAlarmModalOpen={isAlarmModalOpen}
        setIsAlarmModalOpen={setIsAlarmModalOpen}
        isAlarmHistorianModalOpen={isAlarmHistorianModalOpen}
        setIsAlarmHistorianModalOpen={setIsAlarmHistorianModalOpen}
        isFddModalOpen={isFddModalOpen}
        setIsFddModalOpen={setIsFddModalOpen}
        isVibrateEnabled={isVibrateEnabled}
        setIsVibrateEnabled={setIsVibrateEnabled}
        isSoundEnabled={isSoundEnabled}
        setIsSoundEnabled={setIsSoundEnabled}
        isAutoPopupEnabled={isAutoPopupEnabled}
        setIsAutoPopupEnabled={setIsAutoPopupEnabled}
        handleAcknowledgeAlarm={handleAcknowledgeAlarm}
        handleAcknowledgeAllAlarms={handleAcknowledgeAllAlarms}
        isTourOpen={isTourOpen}
        setIsTourOpen={setIsTourOpen}
        isAiDrawerOpen={isAiDrawerOpen}
        setIsAiDrawerOpen={setIsAiDrawerOpen}
        isExitSessionModalOpen={isExitSessionModalOpen}
        setIsExitSessionModalOpen={setIsExitSessionModalOpen}
        handleToggleLock={handleToggleLock}
        handleAddPanelSelect={handleAddPanelSelect}
        handleClonePanels={handleClonePanels}
        handleConfirmClearAll={handleConfirmClearAll}
        handleSaveAndExitSession={handleSaveAndExitSession}
        handleExitSessionWithoutSave={handleExitSessionWithoutSave}
        setCommunityLimitNotice={setCommunityLimitNotice}
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
