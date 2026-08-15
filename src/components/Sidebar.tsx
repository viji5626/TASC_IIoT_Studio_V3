import React, { useState } from 'react';
import { AppView, Dashboard } from '../types';
import { APP_THEMES, getAppTheme } from '../utils/theme';
import AppLogo from './AppLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  currentView: AppView;
  dashboards: Dashboard[];
  onSelectDashboard: (id: string) => void;
  currentTheme?: string;
  onSelectTheme?: (themeId: string) => void;
  onEditDashboard?: (dash: Dashboard) => void;
  onCopyDashboard?: (dashId: string) => void;
  onShareDashboard?: (dash: Dashboard) => void;
  onDeleteDashboard?: (dashId: string) => void;
  userRole?: 'admin' | 'client' | 'gate' | 'community';
  clientInfo?: { clientName: string; expiresAt?: string };
  onSwitchRole?: () => void;
  onRequestClearAll?: () => void;
  onLoadHatcheryDemo?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onNavigate, 
  currentView, 
  dashboards, 
  onSelectDashboard,
  currentTheme = 'sky',
  onSelectTheme,
  onEditDashboard,
  onCopyDashboard,
  onShareDashboard,
  onDeleteDashboard,
  userRole = 'admin',
  clientInfo,
  onSwitchRole,
  onRequestClearAll,
  onLoadHatcheryDemo
}) => {
  const [activeDashMenuId, setActiveDashMenuId] = useState<string | null>(null);

  const isClient = userRole === 'client';

  const menuItems = isClient ? [
    { id: AppView.CONNECTIONS, icon: 'fa-network-wired', label: 'All Connections' },
    { id: AppView.SETTINGS, icon: 'fa-gear', label: 'App Settings' },
  ] : [
    { id: AppView.CONNECTIONS, icon: 'fa-network-wired', label: 'All Connections' },
    { id: AppView.ADD_CONNECTION, icon: 'fa-server', label: 'MQTT Broker Settings' },
    { id: AppView.TOPIC_MANAGER, icon: 'fa-sitemap', label: 'MQTT Topic Manager' },
    { id: AppView.TAG_MANAGER, icon: 'fa-tags', label: 'MQTT Tag Manager' },
    { id: AppView.AI_ASSISTANT, icon: 'fa-wand-magic-sparkles', label: 'AI Assistant' },
    { id: AppView.DRIVER_CONNECTIONS, icon: 'fa-plug-circle-bolt', label: 'Driver Connections', isDriverSection: true },
    { id: AppView.DRIVER_TAG_MANAGER, icon: 'fa-database', label: 'Driver Tag Manager', isDriverSection: true },
    { id: AppView.OPC_UA_BROWSER, icon: 'fa-sitemap', label: 'OPC UA Browser', isDriverSection: true },
    { id: AppView.DRIVER_DIAGNOSTICS, icon: 'fa-stethoscope', label: 'Driver Diagnostics', isDriverSection: true },
    { id: AppView.SETTINGS, icon: 'fa-gear', label: 'App Settings' },
    { id: AppView.BACKUP, icon: 'fa-cloud-arrow-up', label: 'Backup & Restore', isLocked: userRole === 'community' },
    { id: 'about', icon: 'fa-circle-info', label: 'About TASC IIoT Studio' },
  ];

  const activeThemeObj = getAppTheme(currentTheme);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] transition-opacity" onClick={onClose} />
      )}
      <aside className={`theme-sidebar fixed inset-y-0 left-0 w-72 bg-slate-900/95 border-r border-slate-800 z-[110] transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand Header */}
        <div className="p-5 flex flex-col items-center border-b border-slate-800/80 bg-slate-900/50 shrink-0">
          <AppLogo size="lg" accentColor={activeThemeObj.primary} className="mb-2" isCommunity={userRole === 'community'} />
          <h2 className="text-lg font-bold text-white tracking-tight">TASC IIoT Studio</h2>
          
          {userRole === 'community' ? (
            <div className="mt-2 text-center w-full space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full inline-block">
                <i className="fas fa-cube mr-1"></i>
                Community Edition (Free)
              </span>
              <p className="text-[10px] text-slate-400">1 Screen / 10 Widgets Max</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSwitchRole) onSwitchRole();
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold block mx-auto underline pt-1 cursor-pointer"
              >
                Change Application Mode
              </button>
            </div>
          ) : userRole === 'client' ? (
            <div className="mt-2 text-center w-full space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 px-3 py-1 rounded-full inline-block">
                <i className="fas fa-shield-halved mr-1"></i>
                Client Edition ({clientInfo?.clientName || 'Operator'})
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSwitchRole) onSwitchRole();
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold block mx-auto underline pt-1 cursor-pointer"
              >
                Change Application Mode
              </button>
            </div>
          ) : (
            <div className="mt-2 text-center w-full space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full inline-block">
                <i className="fas fa-user-gear mr-1"></i>
                Engineering Studio (Admin)
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSwitchRole) onSwitchRole();
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold block mx-auto underline pt-1 cursor-pointer"
              >
                Change Application Mode
              </button>
            </div>
          )}
        </div>

        <nav className="p-4 space-y-2 flex-grow overflow-y-auto">
          {menuItems.map((item) => (
            <React.Fragment key={item.id}>
              {(item as any).isDriverSection && menuItems.findIndex(m => (m as any).isDriverSection) === menuItems.indexOf(item) && (
                <div className="pt-3 mt-2 border-t border-slate-800/60 flex items-center justify-between px-3 mb-1">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <i className="fas fa-microchip text-xs text-violet-400"></i>
                    <span>Data Driver Settings</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(AppView.DASHBOARD);
                      onClose();
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                    title="Return to Dashboard"
                  >
                    <i className="fas fa-arrow-left text-[9px]"></i>
                    <span>Back</span>
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  if (item.id === 'about') {
                    alert('TASC IIoT Studio\nA modern, real-time Bento Grid dashboard for monitoring and controlling IIoT hardware devices via MQTT WebSockets.');
                    onClose();
                  } else {
                    onNavigate(item.id as AppView);
                    if (item.id !== AppView.CONNECTIONS) onClose();
                  }
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-all rounded-xl cursor-pointer ${
                  currentView === item.id 
                    ? 'bg-slate-800/90 text-white border border-slate-700 shadow-md' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3.5 truncate">
                  <i 
                    className={`fas ${item.icon} w-5 text-center text-base shrink-0`}
                    style={{ color: currentView === item.id ? activeThemeObj.primary : '#94a3b8' }}
                  ></i>
                  <span className="truncate">{item.label}</span>
                </div>

                {item.isLocked && (
                  <div className="flex items-center space-x-1.5 shrink-0 ml-2" title="Unlock with Engineering Edition or Client Package">
                    <i className="fas fa-lock text-amber-400 text-xs"></i>
                    <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      Locked
                    </span>
                  </div>
                )}
              </button>
              
              {item.id === AppView.CONNECTIONS && (
                <div className="pl-6 space-y-1 my-2 border-l border-slate-800 ml-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-3 mb-1">Active Dashboards</span>
                  {dashboards.map(dash => (
                    <div key={dash.dashboardId} className="relative flex items-center">
                      <button 
                        onClick={() => {
                          onSelectDashboard(dash.dashboardId);
                          onNavigate(AppView.DASHBOARD);
                          onClose();
                        }}
                        className="flex-grow flex items-center space-x-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors text-left truncate"
                      >
                        <i 
                          className={`fas ${dash.icon || 'fa-table-cells-large'} text-xs`}
                          style={{ color: activeThemeObj.primary }}
                        ></i>
                        <span className="truncate font-medium">{dash.dashboardName}</span>
                      </button>

                      {userRole !== 'client' && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDashMenuId(activeDashMenuId === dash.dashboardId ? null : dash.dashboardId);
                          }}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-all ${
                            activeDashMenuId === dash.dashboardId ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'
                          }`}
                          title="Dashboard Options"
                        >
                          <i className="fas fa-ellipsis-vertical text-xs"></i>
                        </button>
                      )}

                      {userRole !== 'client' && activeDashMenuId === dash.dashboardId && (
                        <div className="absolute right-0 top-8 z-[150] w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-150">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEditDashboard) onEditDashboard(dash);
                              setActiveDashMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center space-x-2 transition-colors"
                          >
                            <i className="fas fa-pen text-sky-400 text-xs w-4 text-center"></i>
                            <span>Edit Dashboard</span>
                          </button>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onCopyDashboard) onCopyDashboard(dash.dashboardId);
                              setActiveDashMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center space-x-2 transition-colors"
                          >
                            <i className="fas fa-copy text-indigo-400 text-xs w-4 text-center"></i>
                            <span>Copy Dashboard</span>
                          </button>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onShareDashboard) onShareDashboard(dash);
                              setActiveDashMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center space-x-2 transition-colors"
                          >
                            <i className="fas fa-share-nodes text-emerald-400 text-xs w-4 text-center"></i>
                            <span>Share Dashboard</span>
                          </button>

                          <div className="border-t border-slate-800/80 my-1"></div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDeleteDashboard) onDeleteDashboard(dash.dashboardId);
                              setActiveDashMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 transition-colors"
                          >
                            <i className="fas fa-trash-can text-rose-400 text-xs w-4 text-center"></i>
                            <span>Delete Dashboard</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}

          {/* DEMO & SAMPLE PROJECTS SECTION */}
          {onLoadHatcheryDemo && userRole !== 'client' && (
            <div className="pt-3 my-2 border-t border-slate-800/80">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block px-2 mb-2 flex items-center space-x-1.5">
                <i className="fas fa-flask text-xs text-emerald-400"></i>
                <span>Demo & Sample Projects</span>
              </span>
              
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLoadHatcheryDemo();
                }}
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 text-left"
                title="Instantly generate Water & Air Monitoring sample project"
              >
                <i className="fas fa-droplet text-emerald-400 text-base shrink-0"></i>
                <div>
                  <div className="font-bold text-white leading-snug">Load Sample Project</div>
                  <div className="text-[10px] text-emerald-400/80 font-normal">Water & Air HMI Screens (4 Widgets each)</div>
                </div>
              </button>
            </div>
          )}
        </nav>

        {/* Clear All Configuration Button (Engineering & Community Edition) */}
        {(userRole === 'admin' || userRole === 'community') && onRequestClearAll && (
          <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-900/60 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestClearAll();
              }}
              className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
              title="Clear all widgets and broker settings"
            >
              <i className="fas fa-trash-can text-xs text-rose-400"></i>
              <span>Clear All Configuration</span>
            </button>
          </div>
        )}

        {/* App Color Theme Selector in Left Pane (Hidden in Client Edition) */}
        {userRole !== 'client' && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/80 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <i className="fas fa-palette text-xs" style={{ color: activeThemeObj.primary }}></i>
                <span>App Color Theme</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">{activeThemeObj.name}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-0.5">
              {APP_THEMES.map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onSelectTheme && onSelectTheme(theme.id)}
                    className={`h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                      isSelected 
                        ? 'ring-2 ring-white scale-105 shadow-md z-10' 
                        : 'opacity-70 hover:opacity-100 hover:scale-102'
                    }`}
                    style={{ backgroundColor: theme.primary }}
                    title={theme.name}
                  >
                    {isSelected && (
                      <i className="fas fa-check text-xs text-black font-extrabold drop-shadow"></i>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;

