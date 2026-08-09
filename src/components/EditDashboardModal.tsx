import React, { useState } from 'react';
import { Dashboard } from '../types';

interface EditDashboardModalProps {
  dashboard: Dashboard;
  onCancel: () => void;
  onSave: (updatedDash: Dashboard) => void;
}

const COLORS = ['#0ea5e9', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#ffffff'];
const ICONS = [
  'fa-house', 
  'fa-gauge-high', 
  'fa-fan', 
  'fa-house-signal', 
  'fa-lightbulb', 
  'fa-gear', 
  'fa-rss', 
  'fa-microchip', 
  'fa-terminal',
  'fa-chart-line',
  'fa-temperature-high',
  'fa-bolt',
  'fa-water',
  'fa-industry',
  'fa-flask',
  'fa-plug'
];

const EditDashboardModal: React.FC<EditDashboardModalProps> = ({ dashboard, onCancel, onSave }) => {
  const [dashboardForm, setDashboardForm] = useState<Dashboard>({
    ...dashboard,
    dashboardName: dashboard.dashboardName || '',
    icon: dashboard.icon || 'fa-house',
    themeColor: dashboard.themeColor || COLORS[0],
    isHome: !!dashboard.isHome
  });

  const handleSave = () => {
    if (!dashboardForm.dashboardName.trim()) return;
    onSave(dashboardForm);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Window Heading */}
        <header className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <i className="fas fa-pen text-sm"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Edit Dashboard Settings</h1>
              <p className="text-xs text-slate-400">Configure screen name, icon, theme, and default home status</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <i className="fas fa-times text-base"></i>
          </button>
        </header>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Dashboard Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-sky-400">Dashboard / Screen Name *</label>
            <input 
              type="text"
              value={dashboardForm.dashboardName} 
              onChange={(e) => setDashboardForm({ ...dashboardForm, dashboardName: e.target.value })} 
              placeholder="e.g. Living Room Telemetry"
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-600 font-medium" 
              autoFocus 
              required
            />
          </div>

          {/* Set as Home Screen */}
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
                  name="editIsHomeRadio" 
                  checked={dashboardForm.isHome === true} 
                  onChange={() => setDashboardForm({ ...dashboardForm, isHome: true })}
                  className="w-4 h-4 accent-sky-400 cursor-pointer" 
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Yes (Home Screen)</span>
                  <span className="text-[10px] text-slate-500">Default primary landing view</span>
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
                  name="editIsHomeRadio" 
                  checked={dashboardForm.isHome === false} 
                  onChange={() => setDashboardForm({ ...dashboardForm, isHome: false })}
                  className="w-4 h-4 accent-sky-400 cursor-pointer" 
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">No (Standard)</span>
                  <span className="text-[10px] text-slate-500">Secondary screen view</span>
                </div>
              </label>
            </div>
          </div>

          {/* Icon Choice */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dashboard Icon</span>
            <div className="flex flex-wrap gap-2.5">
              {ICONS.map(icon => (
                <button 
                  key={icon}
                  type="button"
                  onClick={() => setDashboardForm({ ...dashboardForm, icon: icon })}
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

          {/* Color Choice */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Theme Color</span>
            <div className="flex flex-wrap gap-3">
              {COLORS.map(c => (
                <button 
                  key={c}
                  type="button"
                  onClick={() => setDashboardForm({ ...dashboardForm, themeColor: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    dashboardForm.themeColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Buttons */}
        <footer className="p-4 px-6 border-t border-slate-800 bg-slate-950/80 flex space-x-3">
          <button 
            type="button" 
            onClick={onCancel} 
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSave}
            disabled={!dashboardForm.dashboardName.trim()}
            className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider rounded-xl text-xs shadow-lg shadow-sky-500/20 transition-all"
          >
            Save Changes
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EditDashboardModal;
