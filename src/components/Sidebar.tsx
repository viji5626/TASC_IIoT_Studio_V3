import React, { useState } from 'react';
import { AppView, Dashboard } from '../types';
import { getAppTheme } from '../utils/theme';
import AppLogo from './AppLogo';
import { useDeviceCapability } from '../utils/deviceDetection';

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
  onOpenTour?: () => void;
}

interface MenuItemDef {
  id: AppView | string;
  icon: string;
  label: string;
  isLocked?: boolean;
  badge?: string;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  isOpen,
  onClose,
  onNavigate,
  currentView,
  dashboards,
  onSelectDashboard,
  currentTheme = 'sky',
  onEditDashboard,
  onCopyDashboard,
  onShareDashboard,
  onDeleteDashboard,
  userRole = 'admin',
  clientInfo,
  onSwitchRole,
  onRequestClearAll,
  onLoadHatcheryDemo,
  onOpenTour
}) => {
  const { isDesktop, isMobile } = useDeviceCapability();
  const [activeDashMenuId, setActiveDashMenuId] = useState<string | null>(null);

  // Accordion section open/collapse states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    workstations: true,
    data: true,
    analysis: true,
    system: false,
    help: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isClient = userRole === 'client';
  const isCommunity = userRole === 'community';
  const activeThemeObj = getAppTheme(currentTheme);

  const handleItemClick = (item: MenuItemDef) => {
    if (item.id === 'about') {
      alert('TASC IIoT Studio\nA modern, real-time Bento Grid dashboard for monitoring and controlling IIoT hardware devices via MQTT WebSockets.');
      onClose();
    } else if (item.id === 'quick_tour') {
      onClose();
      if (onOpenTour) onOpenTour();
    } else {
      onNavigate(item.id as AppView);
      if (item.id !== AppView.CONNECTIONS) onClose();
    }
  };

  // Group definitions (Desktop Workstation tools are hidden on mobile)
  const workstationItems: MenuItemDef[] = isDesktop ? [
    { id: AppView.SCADA_3D, icon: 'fa-cube', label: '3D SCADA Studio', badge: '3D', badgeColor: 'bg-indigo-500/20 text-indigo-300' }
  ] : [];

  const dataItems: MenuItemDef[] = isClient ? [
    { id: AppView.CONNECTIONS, icon: 'fa-network-wired', label: 'All Connections' }
  ] : isDesktop ? [
    { id: AppView.CONNECTIONS, icon: 'fa-network-wired', label: 'All Connections' },
    { id: AppView.ADD_CONNECTION, icon: 'fa-server', label: 'MQTT Broker Settings' },
    { id: AppView.TOPIC_MANAGER, icon: 'fa-sitemap', label: 'MQTT Topic Manager' },
    { id: AppView.TAG_MANAGER, icon: 'fa-tags', label: 'MQTT Tag Manager' },
    { id: AppView.DRIVER_CONNECTIONS, icon: 'fa-plug-circle-bolt', label: 'Driver Connections', badge: '12 Drivers', badgeColor: 'bg-violet-500/20 text-violet-300' },
    { id: AppView.DRIVER_TAG_MANAGER, icon: 'fa-database', label: 'Driver Tag Manager' },
    { id: AppView.SQL_STUDIO, icon: 'fa-table-columns', label: 'SQL Server & TASCGrid', badge: 'SQL', badgeColor: 'bg-cyan-500/20 text-cyan-300' },
    { id: AppView.OPC_UA_BROWSER, icon: 'fa-sitemap', label: 'OPC UA Browser' },
    { id: AppView.DRIVER_DIAGNOSTICS, icon: 'fa-stethoscope', label: 'Driver Diagnostics' }
  ] : [
    // Mobile View: Lightweight, fast MQTT broker & tag configuration
    { id: AppView.CONNECTIONS, icon: 'fa-network-wired', label: 'All Connections' },
    { id: AppView.ADD_CONNECTION, icon: 'fa-server', label: 'MQTT Broker Settings' },
    { id: AppView.TOPIC_MANAGER, icon: 'fa-sitemap', label: 'MQTT Topic Manager' },
    { id: AppView.TAG_MANAGER, icon: 'fa-tags', label: 'MQTT Tag Manager' }
  ];

  const analysisItems: MenuItemDef[] = isClient ? [
    { id: AppView.HISTORIAN_TREND, icon: 'fa-chart-line', label: 'Historian & Trends' },
    { id: AppView.REPORTING, icon: 'fa-chart-bar', label: 'Reports' }
  ] : isDesktop ? [
    { id: AppView.HISTORIAN_TREND, icon: 'fa-chart-line', label: 'Historian & Trends' },
    { id: AppView.REPORTING, icon: 'fa-chart-bar', label: 'Reports (Template & AI)' },
    { id: AppView.AI_ASSISTANT, icon: 'fa-wand-magic-sparkles', label: 'AI Copilot Assistant', badge: 'AI', badgeColor: 'bg-sky-500/20 text-sky-300' }
  ] : [
    { id: AppView.HISTORIAN_TREND, icon: 'fa-chart-line', label: 'Historian & Trends' },
    { id: AppView.REPORTING, icon: 'fa-chart-bar', label: 'Reports' }
  ];

  const systemItems: MenuItemDef[] = isClient ? [
    { id: AppView.SETTINGS, icon: 'fa-gear', label: 'App Settings' }
  ] : [
    { id: AppView.SETTINGS, icon: 'fa-gear', label: 'App Settings' },
    { id: AppView.BACKUP, icon: 'fa-cloud-arrow-up', label: 'Backup & Restore', isLocked: isCommunity }
  ];

  const helpItems: MenuItemDef[] = [
    { id: AppView.USER_MANUAL, icon: 'fa-book-bookmark', label: 'User Manual & Docs' },
    { id: 'quick_tour', icon: 'fa-wand-magic-sparkles', label: 'Quick Product Tour' },
    { id: 'about', icon: 'fa-circle-info', label: 'About TASC IIoT Studio' }
  ];

  const renderNavList = (items: MenuItemDef[]) => (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleItemClick(item)}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-all rounded-xl cursor-pointer ${
              isActive
                ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center space-x-2.5 truncate">
              <i
                className={`fas ${item.icon} w-4 text-center text-xs shrink-0`}
                style={{ color: isActive ? activeThemeObj.primary : '#94a3b8' }}
              ></i>
              <span className="truncate">{item.label}</span>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
              {item.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${item.badgeColor || 'bg-slate-800 text-slate-400'}`}>
                  {item.badge}
                </span>
              )}
              {item.isLocked && (
                <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 flex items-center space-x-1">
                  <i className="fas fa-lock text-[8px]"></i>
                  <span>Lock</span>
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderAccordionSection = (
    key: string,
    title: string,
    icon: string,
    colorClass: string,
    children: React.ReactNode
  ) => {
    const isExpanded = !!openSections[key];
    return (
      <div className="border-b border-slate-800/60 pb-1 mb-1">
        <button
          type="button"
          onClick={() => toggleSection(key)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-800/40"
        >
          <div className="flex items-center space-x-2">
            <i className={`fas ${icon} text-xs ${colorClass}`}></i>
            <span>{title}</span>
          </div>
          <i className={`fas fa-chevron-down text-[9px] text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
        </button>

        {isExpanded && (
          <div className="pt-1 pl-1 animate-in fade-in duration-150">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] transition-opacity" onClick={onClose} />
      )}
      <aside className={`theme-sidebar fixed inset-y-0 left-0 w-72 sm:w-80 max-w-[88vw] bg-slate-900/98 border-r border-slate-800 z-[110] transform transition-transform duration-300 ease-in-out h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-contain touch-scroll flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand Header */}
        <div className="p-3.5 sm:p-5 flex flex-col items-center border-b border-slate-800/80 bg-slate-900/60 shrink-0 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2.5 right-2.5 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close Side Menu"
          >
            <i className="fas fa-xmark text-base"></i>
          </button>

          <AppLogo size="lg" accentColor={activeThemeObj.primary} className="mb-1.5" isCommunity={isCommunity} />
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">TASC IIoT Studio</h2>

          {isCommunity ? (
            <div className="mt-1.5 text-center w-full space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-0.5 rounded-full inline-block">
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
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold block mx-auto underline pt-0.5 cursor-pointer"
              >
                Change Application Mode
              </button>
            </div>
          ) : isClient ? (
            <div className="mt-1.5 text-center w-full space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 px-3 py-0.5 rounded-full inline-block">
                <i className="fas fa-shield-halved mr-1"></i>
                Client Edition ({clientInfo?.clientName || 'Operator'})
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSwitchRole) onSwitchRole();
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold block mx-auto underline pt-0.5 cursor-pointer"
              >
                Change Application Mode
              </button>
            </div>
          ) : (
            <div className="mt-1.5 text-center w-full space-y-1">
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
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold block mx-auto underline pt-0.5 cursor-pointer"
              >
                Change Application Mode
              </button>
            </div>
          )}
        </div>

        {/* Grouped Accordion Navigation */}
        <nav className="p-2 sm:p-3 space-y-1 flex-grow overflow-y-auto custom-scrollbar">
          
          {/* Group 1: Workstations & Active Screens */}
          {renderAccordionSection('workstations', 'Workstations & Screens', 'fa-display', 'text-sky-400', (
            <div className="space-y-1">
              {/* Active Dashboards List */}
              {dashboards && dashboards.length > 0 && (
                <div className="space-y-0.5 mb-1 pl-1 border-l-2 border-slate-800">
                  {dashboards.map(dash => (
                    <div key={dash.dashboardId} className="relative flex items-center">
                      <button
                        onClick={() => {
                          onSelectDashboard(dash.dashboardId);
                          onNavigate(AppView.DASHBOARD);
                          onClose();
                        }}
                        className="flex-grow flex items-center space-x-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors text-left truncate cursor-pointer"
                      >
                        <i
                          className={`fas ${dash.icon || 'fa-table-cells-large'} text-xs`}
                          style={{ color: activeThemeObj.primary }}
                        ></i>
                        <span className="truncate font-medium">{dash.dashboardName}</span>
                        {dash.isHome && <span className="text-[9px] text-amber-400 font-bold">★</span>}
                      </button>

                      {!isClient && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDashMenuId(activeDashMenuId === dash.dashboardId ? null : dash.dashboardId);
                          }}
                          className={`w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer ${
                            activeDashMenuId === dash.dashboardId ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'
                          }`}
                          title="Dashboard Options"
                        >
                          <i className="fas fa-ellipsis-vertical text-xs"></i>
                        </button>
                      )}

                      {/* Dropdown for dashboard options */}
                      {!isClient && activeDashMenuId === dash.dashboardId && (
                        <div className="absolute right-0 top-7 z-[150] w-48 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 space-y-0.5 animate-in fade-in duration-150 backdrop-blur-xl">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEditDashboard) onEditDashboard(dash);
                              setActiveDashMenuId(null);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center space-x-2 transition-colors cursor-pointer"
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
                            className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center space-x-2 transition-colors cursor-pointer"
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
                            className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center space-x-2 transition-colors cursor-pointer"
                          >
                            <i className="fas fa-share-nodes text-emerald-400 text-xs w-4 text-center"></i>
                            <span>Share Dashboard</span>
                          </button>
                          <div className="border-t border-slate-800 my-1"></div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDeleteDashboard) onDeleteDashboard(dash.dashboardId);
                              setActiveDashMenuId(null);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 transition-colors cursor-pointer"
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
              {renderNavList(workstationItems)}
            </div>
          ))}

          {/* Group 2: Data Connections & Drivers */}
          {renderAccordionSection('data', 'Data & Drivers', 'fa-network-wired', 'text-emerald-400', renderNavList(dataItems))}

          {/* Group 3: Analysis & Reporting */}
          {renderAccordionSection('analysis', 'Analysis & AI', 'fa-chart-line', 'text-indigo-400', renderNavList(analysisItems))}

          {/* Group 4: System & Maintenance */}
          {renderAccordionSection('system', 'System & Setup', 'fa-gear', 'text-amber-400', (
            <div className="space-y-1.5">
              {renderNavList(systemItems)}

              {/* Demo Sample Projects Button */}
              {onLoadHatcheryDemo && !isClient && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLoadHatcheryDemo();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 text-left mt-1"
                  title="Instantly generate Water & Air Monitoring sample project"
                >
                  <i className="fas fa-droplet text-emerald-400 text-sm shrink-0"></i>
                  <div>
                    <div className="font-bold text-white text-xs leading-snug">Load Sample Project</div>
                    <div className="text-[10px] text-emerald-400/80 font-normal">Water & Air HMI Demo</div>
                  </div>
                </button>
              )}
            </div>
          ))}

          {/* Group 5: Help & Resources */}
          {renderAccordionSection('help', 'Help & Docs', 'fa-book-bookmark', 'text-sky-400', renderNavList(helpItems))}
        </nav>

        {/* Clear All Configuration Button (Engineering & Community Edition) */}
        {(userRole === 'admin' || isCommunity) && onRequestClearAll && (
          <div className="px-3 py-2.5 border-t border-slate-800/80 bg-slate-900/60 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestClearAll();
              }}
              className="w-full py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
              title="Clear all widgets and broker settings"
            >
              <i className="fas fa-trash-can text-xs text-rose-400"></i>
              <span>Clear All Configuration</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;
