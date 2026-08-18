import React, { useState, useEffect } from 'react';
import { MqttConnection, Dashboard } from '../types';
import { CoachMarkOverlay } from './CoachMarkOverlay';
import { isTourSuppressed } from '../utils/tourRegistry';

interface AddConnectionViewProps {
  onCancel: () => void;
  onCreate: (conn: MqttConnection, dashboards: Dashboard[]) => void;
  initialData?: MqttConnection;
  initialDashboards?: Dashboard[];
}

const COLORS = ['#0ea5e9', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#ffffff'];
const ICONS = ['fa-house', 'fa-fan', 'fa-house-signal', 'fa-lightbulb', 'fa-gear', 'fa-rss', 'fa-gauge-high', 'fa-microchip', 'fa-terminal'];

const AddConnectionView: React.FC<AddConnectionViewProps> = ({ onCancel, onCreate, initialData, initialDashboards = [] }) => {
  const [formData, setFormData] = useState<any>({
    connectionName: '',
    brokerAddress: 'broker.emqx.io',
    port: 8084,
    protocol: 'WebSocket',
    clientId: '',
    username: '',
    password: '',
    autoConnect: true,
    cleanSession: true,
    keepAlive: 300,
    enableWillMessage: false
  });

  const [dashboards, setDashboards] = useState<Dashboard[]>(initialDashboards);
  const [isBrokerTourOpen, setIsBrokerTourOpen] = useState(false);
  const [editingDashId, setEditingDashId] = useState<string | null>(null);

  useEffect(() => {
    if (!isTourSuppressed('add_connection')) {
      setIsBrokerTourOpen(true);
    }
  }, []);
  const [dashboardForm, setDashboardForm] = useState<Partial<Dashboard>>({
    dashboardName: '',
    prefixTopic: '',
    themeColor: COLORS[0],
    icon: ICONS[0],
    isHome: false,
    legacyLayout: false
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        connectionName: initialData.connectionName ?? '',
        brokerAddress: initialData.brokerAddress ?? 'broker.emqx.io',
        port: initialData.port ?? 8084,
        protocol: initialData.protocol ?? 'WebSocket',
        clientId: initialData.clientId ?? '',
        username: initialData.username ?? '',
        password: initialData.password ?? '',
        autoConnect: initialData.autoConnect ?? true,
        cleanSession: initialData.cleanSession ?? true,
        keepAlive: initialData.keepAlive ?? 300,
        enableWillMessage: initialData.enableWillMessage ?? false,
        connectionId: initialData.connectionId
      });
    }
  }, [initialData]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDashModal, setShowDashModal] = useState(false);
  const [dashContextMenu, setDashContextMenu] = useState<string | null>(null);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openAddDash = () => {
    setEditingDashId(null);
    setDashboardForm({
      dashboardName: '',
      prefixTopic: '',
      themeColor: COLORS[0],
      icon: ICONS[0],
      isHome: dashboards.length === 0,
      legacyLayout: false
    });
    setShowDashModal(true);
  };

  const openEditDash = (dash: Dashboard) => {
    setEditingDashId(dash.dashboardId);
    setDashboardForm(dash);
    setShowDashModal(true);
    setDashContextMenu(null);
  };

  const saveDash = () => {
    if (!dashboardForm.dashboardName) return;
    
    if (editingDashId) {
      setDashboards(prev => prev.map(d => {
        const isTarget = d.dashboardId === editingDashId;
        if (isTarget && dashboardForm.isHome) {
          return { ...d, ...dashboardForm } as Dashboard;
        }
        if (!isTarget && dashboardForm.isHome) {
          return { ...d, isHome: false } as Dashboard;
        }
        return isTarget ? { ...d, ...dashboardForm } as Dashboard : d;
      }));
    } else {
      const newDash: Dashboard = {
        ...dashboardForm as Dashboard,
        dashboardId: `dash_${Date.now()}`,
        connectionId: initialData?.connectionId || ''
      };
      if (newDash.isHome) {
        setDashboards(prev => [...prev.map(d => ({ ...d, isHome: false } as Dashboard)), newDash]);
      } else {
        setDashboards([...dashboards, newDash]);
      }
    }
    setShowDashModal(false);
  };

  const deleteDash = (id: string) => {
    setDashboards(prev => prev.filter(d => d.dashboardId !== id));
    setDashContextMenu(null);
  };

  const moveDash = (id: string, dir: 'up' | 'down') => {
    const idx = dashboards.findIndex(d => d.dashboardId === id);
    if (idx === -1) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= dashboards.length) return;
    
    const newDashes = [...dashboards];
    const temp = newDashes[idx];
    newDashes[idx] = newDashes[newIdx];
    newDashes[newIdx] = temp;
    setDashboards(newDashes);
    setDashContextMenu(null);
  };

  return (
    <div className="flex-grow flex flex-col bg-slate-950 overflow-y-auto pb-20">
      <header data-tour="broker-header" className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center">
          <button onClick={onCancel} className="p-2 mr-3 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">{initialData ? 'Edit Connection' : 'Add Connection'}</h1>
            <p className="text-xs text-slate-400">Broker settings & telemetry parameters</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsBrokerTourOpen(true)}
          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
          title="Launch Broker Settings Guided Tour"
        >
          <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
          <span>Tour</span>
        </button>
      </header>

      <form className="p-6 space-y-6 max-w-xl mx-auto w-full" onSubmit={(e) => e.preventDefault()}>
        {/* Main Broker Settings Section */}
        <div className="space-y-5 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800/80">
            <i className="fas fa-server text-sky-400 text-base"></i>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Broker Settings</h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-sky-400">Connection Name *</label>
            <input 
              name="connectionName" 
              value={formData.connectionName ?? ''} 
              onChange={handleChange} 
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none text-white px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors" 
              placeholder="e.g. Home Automation Broker" 
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Client ID (optional)</label>
            <input 
              name="clientId" 
              value={formData.clientId ?? ''} 
              onChange={handleChange} 
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none text-slate-200 px-3.5 py-2.5 rounded-xl font-mono text-xs transition-colors" 
              placeholder="Leave empty to auto-generate" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-sky-400">Broker Address *</label>
            <input 
              name="brokerAddress" 
              value={formData.brokerAddress ?? ''} 
              onChange={handleChange} 
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none text-white px-3.5 py-2.5 rounded-xl font-mono text-sm transition-colors" 
              placeholder="e.g. broker.emqx.io" 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-sky-400">Port *</label>
              <input 
                type="number" 
                name="port" 
                value={formData.port ?? ''} 
                onChange={handleChange} 
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none text-white px-3.5 py-2.5 rounded-xl font-mono text-sm transition-colors" 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Network Protocol</label>
              <div className="relative">
                <select 
                  name="protocol" 
                  value={formData.protocol ?? 'WebSocket'} 
                  onChange={handleChange} 
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none text-white px-3.5 py-2.5 rounded-xl font-mono text-xs appearance-none transition-colors"
                >
                  <option value="TCP" className="bg-slate-900">TCP (standard)</option>
                  <option value="TCP-SSL" className="bg-slate-900">TCP-SSL (secure)</option>
                  <option value="WebSocket" className="bg-slate-900">WebSocket (WS)</option>
                  <option value="WebSocket-SSL" className="bg-slate-900">WebSocket-SSL (WSS)</option>
                </select>
                <i className="fas fa-chevron-down absolute right-3.5 top-3.5 text-slate-500 text-xs pointer-events-none"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Option Section with Expand/Retract button at right */}
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 shadow-xl overflow-hidden transition-all">
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)} 
            className="flex items-center justify-between w-full p-6 text-white font-bold text-sm text-left hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <i className="fas fa-[#0ea5e9] fa-sliders text-sky-400"></i>
              <span>Additional Options</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-sky-400 font-semibold bg-sky-500/10 px-3 py-1 rounded-xl border border-sky-500/20">
              <span>{showAdvanced ? 'Retract' : 'Expand'}</span>
              <i className={`fas fa-chevron-${showAdvanced ? 'up' : 'down'} text-xs`}></i>
            </div>
          </button>
          
          {showAdvanced && (
            <div className="p-6 pt-0 space-y-5 border-t border-slate-800/80 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Username</label>
                  <input 
                    name="username" 
                    value={formData.username || ''} 
                    onChange={handleChange} 
                    placeholder="User name"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none text-white px-3.5 py-2 rounded-xl text-xs font-mono transition-colors" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Password</label>
                  <input 
                    type="password" 
                    name="password" 
                    value={formData.password || ''} 
                    onChange={handleChange} 
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none text-white px-3.5 py-2 rounded-xl text-xs font-mono transition-colors" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="flex items-center space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                  <input 
                    type="checkbox" 
                    id="autoConnect" 
                    name="autoConnect" 
                    checked={formData.autoConnect ?? true} 
                    onChange={handleChange} 
                    className="w-4 h-4 accent-sky-400 rounded cursor-pointer" 
                  />
                  <span className="text-slate-200 text-xs font-medium">Auto connect (tick)</span>
                </label>

                <label className="flex items-center space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                  <input 
                    type="checkbox" 
                    id="cleanSession" 
                    name="cleanSession" 
                    checked={formData.cleanSession ?? true} 
                    onChange={handleChange} 
                    className="w-4 h-4 accent-sky-400 rounded cursor-pointer" 
                  />
                  <span className="text-slate-200 text-xs font-medium">Clean session (tick)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sky-400">Keep Alive (seconds)</label>
                  <input 
                    type="number" 
                    name="keepAlive" 
                    value={formData.keepAlive ?? 300} 
                    onChange={handleChange} 
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 outline-none text-white px-3.5 py-2 rounded-xl text-xs font-mono transition-colors" 
                  />
                </div>

                <label className="flex items-center space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors mt-auto">
                  <input 
                    type="checkbox" 
                    id="enableWillMessage" 
                    name="enableWillMessage" 
                    checked={formData.enableWillMessage ?? false} 
                    onChange={handleChange} 
                    className="w-4 h-4 accent-sky-400 rounded cursor-pointer" 
                  />
                  <span className="text-slate-200 text-xs font-medium">Enable Will message (tick)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Associated Dashboards Manager */}
        <div className="space-y-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <span className="text-white font-bold text-sm uppercase tracking-wider">Associated Dashboards</span>
            <button 
              type="button" 
              onClick={openAddDash} 
              className="px-3.5 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <i className="fas fa-plus text-xs"></i>
              <span>Add Dashboard</span>
            </button>
          </div>
          
          <div className="space-y-2.5">
            {dashboards.length === 0 ? (
              <div className="text-center py-5 text-xs text-slate-500">No dashboards added for this connection yet.</div>
            ) : (
              dashboards.map((dash) => (
                <div key={dash.dashboardId} className="flex flex-col">
                  <div className="flex items-center space-x-3 p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-sm">
                      <i className={`fas ${dash.icon || 'fa-table-cells-large'}`}></i>
                    </div>
                    <div className="flex-grow flex flex-col">
                      <span className="font-semibold text-sm text-slate-100">{dash.dashboardName}</span>
                      {dash.isHome && <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Home Screen</span>}
                    </div>
                    <button type="button" onClick={() => setDashContextMenu(dashContextMenu === dash.dashboardId ? null : dash.dashboardId)} className="p-2 text-slate-400 hover:text-white">
                      <i className="fas fa-ellipsis-vertical"></i>
                    </button>
                  </div>
                  
                  {dashContextMenu === dash.dashboardId && (
                    <div className="flex items-center justify-around bg-slate-950 rounded-b-xl border-x border-b border-slate-800 py-2 animate-in fade-in duration-150">
                      <button type="button" onClick={() => deleteDash(dash.dashboardId)} className="p-2 text-rose-400 hover:text-rose-300"><i className="fas fa-trash-can text-sm"></i></button>
                      <button type="button" onClick={() => openEditDash(dash)} className="p-2 text-sky-400 hover:text-sky-300"><i className="fas fa-pen text-sm"></i></button>
                      <button type="button" onClick={() => moveDash(dash.dashboardId, 'up')} className="p-2 text-slate-400 hover:text-white"><i className="fas fa-chevron-up text-sm"></i></button>
                      <button type="button" onClick={() => moveDash(dash.dashboardId, 'down')} className="p-2 text-slate-400 hover:text-white"><i className="fas fa-chevron-down text-sm"></i></button>
                      <button type="button" onClick={() => setDashContextMenu(null)} className="p-2 text-slate-400 hover:text-white"><i className="fas fa-times text-sm"></i></button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cancel and Save Bottom Buttons */}
        <div className="flex space-x-4 pt-2">
          <button 
            type="button" 
            onClick={onCancel} 
            className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider rounded-2xl text-xs transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button" 
            data-tour="broker-test-btn"
            onClick={() => onCreate(formData, dashboards)} 
            className="flex-1 py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold uppercase tracking-wider rounded-2xl text-xs shadow-lg shadow-sky-500/20 transition-all"
          >
            {initialData ? 'Save Connection' : 'Create Connection'}
          </button>
        </div>
      </form>

      {/* Dashboard Sub-Modal */}
      {showDashModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <header className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <i className="fas fa-plus text-sm"></i>
                </div>
                <h1 className="text-lg font-bold text-white">{editingDashId ? 'Edit Dashboard' : 'Add Dashboard'}</h1>
              </div>
              <button type="button" onClick={() => setShowDashModal(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                <i className="fas fa-times text-base"></i>
              </button>
            </header>
             
            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-sky-400">Dashboard Name *</label>
                <input 
                  value={dashboardForm.dashboardName || ''} 
                  onChange={(e) => setDashboardForm({...dashboardForm, dashboardName: e.target.value})} 
                  placeholder="e.g. Living Room Telemetry"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 text-white rounded-xl px-4 py-3 text-sm outline-none font-medium" 
                  autoFocus 
                  required 
                />
              </div>

              {/* Radio selection for Home Screen */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Set as Home Screen</label>
                <div className="grid grid-cols-2 gap-3">
                  <label 
                    onClick={() => setDashboardForm({ ...dashboardForm, isHome: true })}
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      dashboardForm.isHome 
                        ? 'bg-sky-500/10 border-sky-500/50 text-white' 
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="isSubDashHome" 
                      checked={dashboardForm.isHome === true} 
                      onChange={() => setDashboardForm({ ...dashboardForm, isHome: true })}
                      className="w-4 h-4 accent-sky-400 cursor-pointer" 
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">Yes (Home Screen)</span>
                      <span className="text-[10px] text-slate-500">Default landing view</span>
                    </div>
                  </label>

                  <label 
                    onClick={() => setDashboardForm({ ...dashboardForm, isHome: false })}
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      !dashboardForm.isHome 
                        ? 'bg-sky-500/10 border-sky-500/50 text-white' 
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="isSubDashHome" 
                      checked={dashboardForm.isHome === false} 
                      onChange={() => setDashboardForm({ ...dashboardForm, isHome: false })}
                      className="w-4 h-4 accent-sky-400 cursor-pointer" 
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">No (Standard)</span>
                      <span className="text-[10px] text-slate-500">Secondary view</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dashboard Icon</span>
                <div className="flex flex-wrap gap-2.5">
                  {ICONS.map(icon => (
                    <button 
                      key={icon}
                      type="button"
                      onClick={() => setDashboardForm({...dashboardForm, icon: icon})}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm transition-all ${
                        dashboardForm.icon === icon 
                          ? 'bg-sky-500 text-slate-950 font-bold shadow-lg shadow-sky-500/20 scale-105' 
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <i className={`fas ${icon}`}></i>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Theme Color</span>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map(c => (
                    <button 
                      key={c}
                      type="button"
                      onClick={() => setDashboardForm({...dashboardForm, themeColor: c})}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        dashboardForm.themeColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <footer className="p-4 px-6 border-t border-slate-800 bg-slate-950/80 flex space-x-3">
              <button 
                type="button" 
                onClick={() => setShowDashModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={saveDash}
                disabled={!dashboardForm.dashboardName}
                className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider rounded-xl text-xs shadow-lg shadow-sky-500/20 transition-all"
              >
                Save Dashboard
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MQTT Broker Settings Guided Tour Screen Overlay */}
      <CoachMarkOverlay
        tourId="add_connection"
        isOpen={isBrokerTourOpen}
        onClose={() => setIsBrokerTourOpen(false)}
      />
    </div>
  );
};

export default AddConnectionView;
