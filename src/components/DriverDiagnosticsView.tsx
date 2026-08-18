import React, { useState, useEffect } from 'react';
import { AppState, AppView } from '../types';
import { CoachMarkOverlay } from './CoachMarkOverlay';
import { isTourSuppressed } from '../utils/tourRegistry';

interface DriverDiagnosticsViewProps {
  onBack?: () => void;
  appState: AppState;
  onNavigate?: (view: AppView) => void;
}

const DriverDiagnosticsView: React.FC<DriverDiagnosticsViewProps> = ({ onBack, appState, onNavigate }) => {
  const [isDiagTourOpen, setIsDiagTourOpen] = useState(false);
  const connections = appState.driverConnections || [];
  const tags = appState.driverTags || [];
  const driverPanels = (appState.panels || []).filter(p => p.dataSourceMode === 'driver');

  useEffect(() => {
    if (!isTourSuppressed('driver_diagnostics')) {
      setIsDiagTourOpen(true);
    }
  }, []);

  return (
    <div className="flex-grow overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div data-tour="diag-header" className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              if (onBack) onBack();
              else if (onNavigate) onNavigate(AppView.DASHBOARD);
            }}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-all cursor-pointer flex items-center space-x-2 shrink-0 active:scale-95"
            title="Back to Dashboard"
          >
            <i className="fas fa-arrow-left text-sm"></i>
            <span className="text-xs font-bold">Back</span>
          </button>
          <i className="fas fa-stethoscope text-violet-400 text-2xl"></i>
          <div>
            <h1 className="text-xl font-bold text-white">Driver Diagnostics & Audit</h1>
            <p className="text-xs text-slate-400">Live connection health, tag configuration audit, and widget bindings</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDiagTourOpen(true)}
          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
          title="Launch Driver Diagnostics Guided Tour"
        >
          <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
          <span>Tour</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 text-xl font-bold">
            {connections.length}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Driver Connections</p>
            <p className="text-sm font-bold text-white">{connections.length > 0 ? `${connections.length} Configured` : 'None Configured'}</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xl font-bold">
            {tags.length}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Driver Tags</p>
            <p className="text-sm font-bold text-white">{tags.length > 0 ? `${tags.length} Created` : 'None Created'}</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold">
            {driverPanels.length}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Bound Widgets</p>
            <p className="text-sm font-bold text-white">{driverPanels.length > 0 ? `${driverPanels.length} Widgets in Driver Mode` : '0 Widgets Bound'}</p>
          </div>
        </div>
      </div>

      {/* Troubleshooting Alert if no Widgets bound */}
      {tags.length > 0 && driverPanels.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start space-x-3 text-amber-300">
          <i className="fas fa-triangle-exclamation text-amber-400 text-lg mt-0.5"></i>
          <div className="space-y-1 text-xs">
            <p className="font-bold text-sm text-amber-200">Action Required: Driver Tag is created but not bound to a Widget</p>
            <p>You have created <strong>{tags.length} driver tag(s)</strong>, but zero dashboard widgets are currently configured to use them.</p>
            <p className="pt-1">
              👉 <strong>Solution:</strong> Go to Dashboard → Click <strong>Edit Panel</strong> on a widget → Toggle <strong>DATA SOURCE</strong> to <strong>Driver Tag</strong> → Select your tag from the list.
            </p>
          </div>
        </div>
      )}

      {/* 1. Driver Connections Audit */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-slate-800/60 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <i className="fas fa-network-wired text-sky-400"></i>
            <span>1. Configured Driver Connections & Health Diagnostics</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">{connections.length} total</span>
        </div>
        {connections.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No driver connections configured. Add one in <strong>Data Driver Settings → Driver Connections</strong>.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {connections.map(conn => {
              const state = conn.connectionState || (conn.enabled ? 'connected' : 'disconnected');
              const stateColors: Record<string, string> = {
                connected: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                reconnecting: 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse',
                stale: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                disconnected: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                unavailable: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                error: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              };

              return (
                <div key={conn.connectionId} className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{conn.connectionName}</span>
                      <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 font-mono text-[10px] rounded border border-violet-500/30 uppercase">
                        {conn.protocol}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${stateColors[state] || 'bg-slate-800 text-slate-400'}`}>
                        ● {state}
                      </span>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      Failures: <span className={conn.consecutiveFailureCount ? 'text-amber-400 font-bold' : 'text-slate-300'}>{conn.consecutiveFailureCount || 0}</span> | Retries: <span className="text-slate-300">{conn.retryCount || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                    <div>
                      {conn.protocol === 'opcua' ? (
                        <span>Endpoint: <span className="text-slate-200">{conn.endpointUrl || conn.host}</span></span>
                      ) : (
                        <span>Host: <span className="text-slate-200">{conn.host}</span> | Port: <span className="text-slate-200">{conn.port}</span> | Unit ID: <span className="text-slate-200">{conn.unitId ?? 1}</span></span>
                      )}
                    </div>
                    <div>
                      {conn.lastDisconnectedAt && (
                        <span>Last Disconnected: <span className="text-rose-400">{new Date(conn.lastDisconnectedAt).toLocaleTimeString()}</span></span>
                      )}
                    </div>
                  </div>

                  {conn.lastError && (
                    <div className="bg-rose-500/10 border border-rose-500/25 rounded-lg p-2 text-rose-300 font-mono text-[11px] flex items-center space-x-2">
                      <i className="fas fa-triangle-exclamation text-rose-400"></i>
                      <span>Last Diagnostic Error: {conn.lastError}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Driver Tags Audit */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-slate-800/60 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <i className="fas fa-tags text-violet-400"></i>
            <span>2. Configured Driver Tags</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">{tags.length} total</span>
        </div>
        {tags.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No driver tags created yet. Create one in <strong>Data Driver Settings → Driver Tag Manager</strong>.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {tags.map(tag => {
              const boundPanels = (appState.panels || []).filter(p => p.driverTagId === tag.tagId || p.driverWriteTagId === tag.tagId);
              const conn = connections.find(c => c.connectionId === tag.connectionId);

              return (
                <div key={tag.tagId} className="p-4 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{tag.tagName}</span>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 font-mono text-[10px] rounded border border-amber-500/20">
                        {tag.protocol}
                      </span>
                      <span className="px-2 py-0.5 bg-sky-500/10 text-sky-300 font-mono text-[10px] rounded border border-sky-500/20">
                        {tag.dataType}
                      </span>
                    </div>
                    <p className="text-slate-400 font-mono">
                      Connection: <span className="text-slate-200">{conn?.connectionName || tag.connectionId}</span> | Register: <span className="text-slate-200">{tag.registerType || 'holding_register'}</span> | Address: <span className="text-amber-400 font-bold">{tag.address}</span> | Poll Rate: <span className="text-slate-200">{tag.pollRate}ms</span>
                    </p>
                  </div>

                  <div>
                    {boundPanels.length > 0 ? (
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 font-semibold text-[11px] rounded-lg border border-emerald-500/30 flex items-center space-x-1">
                        <i className="fas fa-check-circle"></i>
                        <span>Bound to {boundPanels.length} Widget(s)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 font-semibold text-[11px] rounded-lg border border-amber-500/30 flex items-center space-x-1">
                        <i className="fas fa-circle-exclamation"></i>
                        <span>Unbound (Not assigned)</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Dashboard Widget Binding Audit */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="bg-slate-800/60 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <i className="fas fa-[#0ea5e9] fa-desktop text-sky-400"></i>
            <span>3. Dashboard Widget Binding Audit</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">{(appState.panels || []).length} widgets on screen</span>
        </div>
        {(appState.panels || []).length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No widgets on dashboard. Click "+ Add Widget" on the dashboard to create one.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {appState.panels.map(panel => {
              const isDriver = panel.dataSourceMode === 'driver';
              const readTag = isDriver ? tags.find(t => t.tagId === panel.driverTagId) : null;

              return (
                <div key={panel.panelId} className="p-4 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{panel.panelName || panel.panelId}</span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded font-mono uppercase">
                        {panel.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDriver ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'}`}>
                        {isDriver ? 'DRIVER MODE' : 'MQTT MODE'}
                      </span>
                    </div>
                    {isDriver ? (
                      <p className="text-slate-400 font-mono">
                        Read Tag: {readTag ? <span className="text-emerald-400 font-bold">{readTag.tagName} (Address: {readTag.address})</span> : <span className="text-rose-400 font-bold">MISSING / UNASSIGNED</span>}
                      </p>
                    ) : (
                      <p className="text-slate-400 font-mono">
                        MQTT Topic: <span className="text-sky-300">{panel.topic || 'None'}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    {isDriver && readTag ? (
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 font-medium text-[11px] rounded border border-emerald-500/20">
                        Ready to Poll
                      </span>
                    ) : isDriver ? (
                      <span className="px-2 py-1 bg-rose-500/10 text-rose-400 font-medium text-[11px] rounded border border-rose-500/20">
                        Select Tag in Edit Panel
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-800 text-slate-400 text-[11px] rounded">
                        MQTT Mode
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Driver Diagnostics Guided Tour Screen Overlay */}
      <CoachMarkOverlay
        tourId="driver_diagnostics"
        isOpen={isDiagTourOpen}
        onClose={() => setIsDiagTourOpen(false)}
      />
    </div>
  );
};

export default DriverDiagnosticsView;
