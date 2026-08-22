import React, { useState, useRef, useEffect } from 'react';
import { 
  AppView, 
  AppState, 
  MqttConnection, 
  Dashboard, 
  ProductEdition 
} from '../types';
import AppLogo from './AppLogo';
import { MultiDriverStatusPill } from './MultiDriverStatusPill';
import { useDeviceCapability } from '../utils/deviceDetection';
import { EditionManager } from '../utils/EditionManager';

export interface TopNavbarProps {
  appState: AppState;
  userRole: 'admin' | 'client' | 'gate' | 'community';
  productEdition: ProductEdition;
  clientInfo?: { clientName: string; expiresAt?: string; isSignedPackage?: boolean };
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  activeConnection?: MqttConnection;
  activeDashboardId: string;
  setActiveDashboardId: (id: string) => void;
  activeMode: 'grid' | 'hmi';
  setActiveMode: (mode: 'grid' | 'hmi') => void;
  isHmiEditMode?: boolean;
  isLayoutMode: boolean;
  setIsLayoutMode: (val: boolean) => void;
  isLocked: boolean;
  handleToggleLock: () => void;
  isFullscreen: boolean;
  handleToggleFullscreen: () => void;
  handleExitFullscreen: () => void;
  unreadScheduledReports: number;
  setUnreadScheduledReports: (val: number) => void;
  mqttConnected: boolean;
  isSimulated: boolean;
  activeAlarms: any[];
  activeThemeObj: { primary: string; bgCanvas: string };
  editionMgr: EditionManager;
  setIsSidebarOpen: (val: boolean) => void;
  setIsAlarmModalOpen: (val: boolean) => void;
  setIsAlarmHistorianModalOpen: (val: boolean) => void;
  setIsFddModalOpen: (val: boolean) => void;
  setIsEngineeringChoiceOpen: (val: boolean) => void;
  setIsCloneModalOpen: (val: boolean) => void;
  setIsDashMenuOpen: (val: boolean) => void;
  handleOpenActiveBrokerSettings: () => void;
  handleSelectDashboard: (id: string) => void;
  handleRequestExitSession: () => void;
  setShowClientReadOnlyNotice: (val: boolean) => void;
  setCommunityLimitNotice: (reason: string | null) => void;
  handleOpenAddPanel?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = React.memo(({
  appState,
  userRole,
  productEdition,
  clientInfo,
  currentView,
  setCurrentView,
  activeConnection,
  activeDashboardId,
  setActiveDashboardId,
  activeMode,
  setActiveMode,
  isHmiEditMode,
  isLayoutMode,
  setIsLayoutMode,
  isLocked,
  handleToggleLock,
  isFullscreen,
  handleToggleFullscreen,
  handleExitFullscreen,
  unreadScheduledReports,
  setUnreadScheduledReports,
  mqttConnected,
  isSimulated,
  activeAlarms,
  activeThemeObj,
  editionMgr,
  setIsSidebarOpen,
  setIsAlarmModalOpen,
  setIsAlarmHistorianModalOpen,
  setIsFddModalOpen,
  setIsEngineeringChoiceOpen,
  setIsCloneModalOpen,
  setIsDashMenuOpen,
  handleOpenActiveBrokerSettings,
  handleSelectDashboard,
  handleRequestExitSession,
  setShowClientReadOnlyNotice,
  setCommunityLimitNotice,
  handleOpenAddPanel,
}) => {
  const { isDesktop, isMobile } = useDeviceCapability();
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    if (isToolsMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isToolsMenuOpen]);

  const isCommunity = userRole === 'community' || productEdition === ProductEdition.COMMUNITY;
  const isClient = userRole === 'client' || productEdition === ProductEdition.CLIENT_RUNTIME;

  const handleCreateScreenCheck = () => {
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
  };

  return (
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
      {/* Left Toolbar: Brand & Connections */}
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
            isCommunity={isCommunity} 
          />
          <span className="font-extrabold text-white text-xs sm:text-sm tracking-tight whitespace-nowrap shrink-0 hidden lg:inline">TASC IIoT Studio</span>
        </div>

        {/* Multi-Driver & MQTT Live Connection Status Pill */}
        <div data-tour="drivers-pill">
          <MultiDriverStatusPill
            mqttConnection={activeConnection}
            allMqttConnections={appState.connections}
            mqttConnected={mqttConnected}
            isSimulated={isSimulated}
            driverConnections={appState.driverConnections}
            isClient={editionMgr.IsClient() || isClient || !!appState.isLockedPackage}
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

        {/* Quick Tools & Insights Dropdown Menu (Consolidates Historian, FDD, Reports, Docs) */}
        <div className="relative shrink-0" ref={toolsMenuRef}>
          <button
            type="button"
            onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer shadow-sm shrink-0 min-h-[30px] ${
              isToolsMenuOpen || unreadScheduledReports > 0
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 hover:bg-sky-500/30'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:text-white'
            }`}
            title="Analysis, Diagnostics & Quick Tools"
          >
            <i className="fas fa-toolbox text-xs text-sky-400"></i>
            <span className="hidden xl:inline">TOOLS</span>
            {unreadScheduledReports > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-[8px] px-1 py-0.2 rounded-full animate-pulse">
                {unreadScheduledReports}
              </span>
            )}
            <i className={`fas fa-chevron-down text-[9px] transition-transform ${isToolsMenuOpen ? 'rotate-180' : ''}`}></i>
          </button>

          {/* Quick Tools Dropdown Panel */}
          {isToolsMenuOpen && (
            <div className="absolute left-0 top-9 z-50 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 space-y-0.5 backdrop-blur-xl">
              <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                Analysis & Insights
              </div>

              {/* Historian */}
              <button
                type="button"
                data-tour="historian-btn"
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  setIsAlarmHistorianModalOpen(true);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-indigo-500/20 hover:text-indigo-200 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <i className="fas fa-history text-indigo-400 w-4 text-center text-xs"></i>
                  <span>Alarm Historian</span>
                </div>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">FIFO</span>
              </button>

              {/* FDD / CBM (Desktop only) */}
              {isDesktop && (
                <button
                  type="button"
                  data-tour="fdd-btn"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    setIsFddModalOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-amber-500/20 hover:text-amber-200 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-shield-halved text-amber-400 w-4 text-center text-xs"></i>
                    <span>TASC FDD / CBM</span>
                  </div>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">Predictive</span>
                </button>
              )}

              {/* Reports */}
              <button
                type="button"
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  setCurrentView(AppView.REPORTING);
                  setUnreadScheduledReports(0);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-sky-500/20 hover:text-sky-200 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <i className="fas fa-chart-bar text-sky-400 w-4 text-center text-xs"></i>
                  <span>Reports & AI Generation</span>
                </div>
                {unreadScheduledReports > 0 && (
                  <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full font-black">
                    {unreadScheduledReports}
                  </span>
                )}
              </button>

              <div className="border-t border-slate-800/80 my-1"></div>
              <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                Documentation & View
              </div>

              {/* User Manual */}
              <button
                type="button"
                data-tour="manual-btn"
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  setCurrentView(AppView.USER_MANUAL);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center space-x-2 transition-colors"
              >
                <i className="fas fa-book-bookmark text-sky-400 w-4 text-center text-xs"></i>
                <span>User Manual & Schematics</span>
              </button>

              {/* Fullscreen Toggle in Dropdown */}
              <button
                type="button"
                onClick={() => {
                  setIsToolsMenuOpen(false);
                  if (isFullscreen) {
                    handleExitFullscreen();
                  } else {
                    handleToggleFullscreen();
                  }
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <i className={`fas ${isFullscreen ? 'fa-compress text-sky-400' : 'fa-expand text-emerald-400'} w-4 text-center text-xs`}></i>
                  <span>{isFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen'}</span>
                </div>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">F11</span>
              </button>
            </div>
          )}
        </div>

        {/* Edition Status Badge */}
        {isCommunity ? (
          <button
            type="button"
            onClick={handleRequestExitSession}
            className="flex items-center space-x-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-500/30 transition-all cursor-pointer shrink-0 min-h-[30px]"
            title={`Community Edition (Free) • ${appState.dashboards.length} Screens / 10 Widgets Max — Click to exit / change mode`}
          >
            <i className="fas fa-cube text-xs text-emerald-400"></i>
            <span className="hidden 2xl:inline">COMMUNITY</span>
            <span className={`text-[9px] px-1 rounded font-mono font-extrabold ${appState.panels.length > 10 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'}`}>
              ({appState.panels.length}/10W)
            </span>
          </button>
        ) : isClient ? (
          <button
            type="button"
            onClick={handleRequestExitSession}
            className="flex items-center space-x-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-sky-500/30 transition-all cursor-pointer shrink-0 min-h-[30px]"
            title="Client Edition (Operator Mode) — Click to exit / change mode"
          >
            <i className="fas fa-shield-halved text-xs text-sky-400"></i>
            <span className="hidden lg:inline">{clientInfo?.clientName || 'CLIENT'}</span>
            <span className="text-[9px] bg-sky-500 text-slate-950 px-1 rounded font-mono font-extrabold">OPERATOR</span>
          </button>
        ) : null}

        {/* Workstation Mode Switcher Toggle (Grid Studio / HMI Canvas) */}
        <div data-tour="view-toggle" className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0 min-h-[30px]">
          <button
            type="button"
            onClick={() => setActiveMode('grid')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all flex items-center space-x-1 cursor-pointer ${
              activeMode === 'grid'
                ? isCommunity ? 'bg-emerald-500 text-slate-950 shadow' : isClient ? 'bg-sky-500 text-slate-950 shadow' : 'bg-amber-500 text-slate-950 shadow'
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
          {!isClient && (
            <button
              type="button"
              onClick={() => setIsEngineeringChoiceOpen(true)}
              className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
              title="Change Engineering Architecture Mode"
            >
              <i className="fas fa-sliders text-xs"></i>
            </button>
          )}
        </div>

        {/* HMI Screen Switcher Dropdown & Add Screen (+) Button */}
        {appState.dashboards && appState.dashboards.length > 0 && (
          <div className="flex items-center space-x-1 shrink-0">
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

            {/* Add Screen (+) Button - Visible in HMI Canvas edit mode */}
            {activeMode === 'hmi' && !isFullscreen && isHmiEditMode && !isLocked && !isClient && (
              <button
                type="button"
                onClick={handleCreateScreenCheck}
                className="h-[30px] w-[30px] bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-md active:scale-95 border border-sky-400/80 hover:shadow-sky-500/20"
                title="Add New HMI Screen"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            )}
          </div>
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

      {/* Right Toolbar: Contextual Actions in Grid Dashboard Mode */}
      <div className={`flex items-center gap-1.5 ${isDesktop ? 'flex-wrap' : 'shrink-0'}`}>
        {currentView === AppView.DASHBOARD && activeMode === 'grid' && (
          <>
            {!isFullscreen && !isClient && (
              <button 
                type="button"
                onClick={handleOpenAddPanel}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-md active:scale-95"
                title="Add Component (TASCGrid, Line Graph, Gauge, etc.)"
              >
                <i className="fas fa-plus-circle text-xs"></i>
                <span>+ Component</span>
              </button>
            )}

            {!isFullscreen && !isClient && (
              <button 
                type="button"
                onClick={handleCreateScreenCheck}
                className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold rounded-lg text-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-md active:scale-95"
                title="Create New HMI Dashboard Screen Page"
              >
                <i className="fas fa-plus text-xs"></i>
                <span>New Screen</span>
              </button>
            )}

            {!isLocked && !isFullscreen && !isClient && (
              <button 
                type="button"
                onClick={() => setIsCloneModalOpen(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Clone Panel"
              >
                <i className="fas fa-clone text-sm" style={{ color: activeThemeObj.primary }}></i>
              </button>
            )}

            {isLocked && (
              <button
                type="button"
                onClick={handleToggleLock}
                className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 hover:bg-amber-500/30 transition-colors cursor-pointer"
                title="Panel Edits Locked — Click to unlock"
              >
                <i className="fas fa-lock text-[11px]"></i>
                <span className="hidden sm:inline">Locked</span>
              </button>
            )}

            {isLayoutMode && (
              <button
                type="button"
                onClick={() => setIsLayoutMode(false)}
                className="px-2.5 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 animate-pulse hover:bg-sky-500/30 transition-colors cursor-pointer"
                title="Layout Editing Active — Click done when finished"
              >
                <i className="fas fa-table-cells text-[11px]"></i>
                <span className="hidden sm:inline">Editing Layout</span>
              </button>
            )}

            {/* 3-Dot Dropdown Menu */}
            <button 
              type="button"
              onClick={() => setIsDashMenuOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Dashboard Options Menu"
            >
              <i className="fas fa-ellipsis-vertical text-sm"></i>
            </button>
          </>
        )}
      </div>
    </header>
  );
});

TopNavbar.displayName = 'TopNavbar';
export default TopNavbar;
