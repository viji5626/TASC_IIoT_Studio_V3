/**
 * SqlStudioView: SQL Database Connection Manager & TASCGrid Studio
 * 
 * Provides an interactive UI to:
 * 1. Configure and test SQL Server connections with Windows Authentication (SSPI/NTLM)
 * 2. Explore database tables and views
 * 3. Interact with live Data Source streams and Data Manipulator executions in TASCGrid
 * 4. Manage SQL Data Sources & Data Manipulators
 * 5. Generate ready-to-use React code snippets for useSqlTag and TASCGrid
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  Key,
  ShieldCheck,
  Activity,
  Layers,
  Terminal,
  Code2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Copy,
  Check,
  Table as TableIcon,
  Play,
  Sliders,
  Settings,
} from 'lucide-react';
import { AppState, AppView, SqlAuthType, ScadaSqlConfig, SqlPoolStatus, SqlTableMetadata } from '../types';
import { TASCGrid, SqlDataSourcesModal } from './sql';

interface SqlStudioViewProps {
  onBack?: () => void;
  appState?: AppState;
  onNavigate?: (view: AppView) => void;
}

export const SqlStudioView: React.FC<SqlStudioViewProps> = ({ onBack, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'connection' | 'tables' | 'snippets'>('grid');

  // Connection config state
  const [config, setConfig] = useState<ScadaSqlConfig>({
    server: 'localhost\\SQLEXPRESS2019',
    port: 1433,
    database: 'DAIKIN_EMS',
    authType: 'windows_integrated',
    user: '',
    password: '',
    domain: '',
    requestTimeoutMs: 30000,
    connectionTimeoutMs: 15000,
    poolMin: 2,
    poolMax: 25,
    encrypt: false,
    trustServerCertificate: true,
  });

  const [poolStatus, setPoolStatus] = useState<SqlPoolStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; version?: string; error?: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Databases & Tables state
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<SqlTableMetadata[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('MeterName');
  const [selectedSchema, setSelectedSchema] = useState<string>('dbo');
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Modal state
  const [isDataSourcesModalOpen, setIsDataSourcesModalOpen] = useState(false);

  // Snippet copy state
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Fetch connection status
  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/scada-sql/status');
      const json = await res.json();
      if (json && json.connected !== undefined) {
        setPoolStatus(json);
        setConfig((prev) => ({
          ...prev,
          server: json.server || prev.server,
          database: json.database || prev.database,
          authType: json.authType || prev.authType,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch SQL status', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Fetch databases
  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/scada-sql/databases');
      const json = await res.json();
      if (json.databases) {
        setDatabases(json.databases);
      }
    } catch (err) {
      console.error('Failed to fetch databases', err);
    }
  };

  // Fetch tables
  const fetchTables = async (db?: string) => {
    setIsLoadingTables(true);
    try {
      const targetDb = db || config.database || 'DAIKIN_EMS';
      const res = await fetch(`/api/scada-sql/tables?database=${encodeURIComponent(targetDb)}`);
      const json = await res.json();
      if (json.tables && Array.isArray(json.tables)) {
        setTables(json.tables);
        if (json.tables.length > 0 && (!selectedTable || !json.tables.some((t: any) => t.name === selectedTable))) {
          setSelectedTable(json.tables[0].name);
          setSelectedSchema(json.tables[0].schema);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tables', err);
    } finally {
      setIsLoadingTables(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchDatabases();
    fetchTables(config.database);
  }, []);

  // Save and reconnect
  const handleSaveAndReconnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/scada-sql/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.success) {
        setPoolStatus(json.status);
        setStatusMessage({ text: 'Configuration saved and connection pool reconnected!', type: 'success' });
        fetchDatabases();
        fetchTables(config.database);
      } else {
        setStatusMessage({ text: `Reconnection failed: ${json.error}`, type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `Error: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/scada-sql/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  // Copy code snippet
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const activeTableName = selectedTable || (tables[0]?.name ?? 'MeterName');

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Banner & Navigation */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white tracking-tight">SQL Server & TASCGrid Studio</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Native Windows Auth & SCADA Grid
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Configure SQL Server Windows Authentication, stream live Data Sources, and execute Stored Procedures
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsDataSourcesModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manage Data Sources & Manipulators</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchStatus();
              fetchDatabases();
              fetchTables(config.database);
            }}
            disabled={isLoadingStatus}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* KPI Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 shrink-0">
        {/* Card 1: Connection Status */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center space-x-3.5 shadow-sm">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              poolStatus?.connected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            <Server className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Connection State
            </span>
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  poolStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-sm font-bold text-white truncate">
                {poolStatus?.connected ? 'Connected' : 'Offline / Standby'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono truncate block">
              {poolStatus?.server || config.server}/{poolStatus?.database || config.database}
            </span>
          </div>
        </div>

        {/* Card 2: Auth Mode */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center space-x-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Authentication
            </span>
            <span className="text-sm font-bold text-white block truncate">
              {config.authType === 'windows_integrated'
                ? 'Windows Native (SSPI)'
                : config.authType === 'windows_ntlm'
                ? 'Windows NTLM'
                : 'SQL Server Auth'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Driver: {poolStatus?.driver || 'msnodesqlv8'}
            </span>
          </div>
        </div>

        {/* Card 3: Latency & Health */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center space-x-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Latency & Health
            </span>
            <span className="text-sm font-bold text-white font-mono block">
              {poolStatus?.lastPingLatencyMs !== null && poolStatus?.lastPingLatencyMs !== undefined
                ? `${poolStatus.lastPingLatencyMs} ms`
                : 'N/A'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Timeout: {config.requestTimeoutMs ? `${config.requestTimeoutMs / 1000}s` : '30s'}
            </span>
          </div>
        </div>

        {/* Card 4: Discovered Objects */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center space-x-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold shrink-0">
            <TableIcon className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              Discovered Tables
            </span>
            <span className="text-sm font-bold text-white font-mono block">
              {tables.length} Objects
            </span>
            <span className="text-[10px] text-slate-500 font-mono truncate block">
              Active: [{selectedSchema}].[{activeTableName}]
            </span>
          </div>
        </div>
      </div>

      {/* Main Studio Navigation Tabs */}
      <div className="px-6 flex items-center space-x-2 border-b border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('grid')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold cursor-pointer transition-all border-t border-x ${
            activeTab === 'grid'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
              : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Interactive TASCGrid Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('connection')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold cursor-pointer transition-all border-t border-x ${
            activeTab === 'connection'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
              : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>SQL Connection Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tables')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold cursor-pointer transition-all border-t border-x ${
            activeTab === 'tables'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
              : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span>Schema & Tables Explorer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('snippets')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold cursor-pointer transition-all border-t border-x ${
            activeTab === 'snippets'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
              : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Code & Hook Snippets</span>
        </button>
      </div>

      {/* Main Studio Viewport Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'grid' && (
          <div className="h-full flex flex-col space-y-4">
            {/* Table & Database Switcher Header */}
            <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-2xl border border-slate-800 shrink-0">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-300">Database:</span>
                <select
                  value={config.database}
                  onChange={(e) => {
                    const newDb = e.target.value;
                    setConfig({ ...config, database: newDb });
                    fetchTables(newDb);
                  }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                >
                  {databases.map((db) => (
                    <option key={db} value={db}>
                      {db}
                    </option>
                  ))}
                </select>

                <span className="text-xs font-bold text-slate-300 ml-2">Target Table:</span>
                <select
                  value={selectedTable}
                  onChange={(e) => {
                    const t = tables.find((item) => item.name === e.target.value);
                    setSelectedTable(e.target.value);
                    if (t) setSelectedSchema(t.schema);
                  }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                >
                  {tables.map((t) => (
                    <option key={`${t.schema}.${t.name}`} value={t.name}>
                      [{t.schema}].[{t.name}] ({t.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Dual-Mode Active</span>
              </div>
            </div>

            {/* Embedded TASCGrid Component */}
            <div className="flex-1 min-h-[450px]">
              <TASCGrid
                key={`${config.database}_${selectedSchema}_${activeTableName}`}
                database={config.database}
                table={activeTableName}
                schema={selectedSchema}
                title={`TASCGrid: [${selectedSchema}].[${activeTableName}]`}
                pollIntervalMs={3000}
                pageSize={10}
                showToolbar={true}
                showSearch={true}
                showExport={true}
                showManipulatorTab={true}
              />
            </div>
          </div>
        )}

        {activeTab === 'connection' && (
          <form onSubmit={handleSaveAndReconnect} className="max-w-3xl p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Server className="w-5 h-5 text-indigo-400" />
                <span>SQL Server Connection & Windows Authentication</span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure connection parameters, Windows Integrated Security, NTLM domains, and connection pool sizing
              </p>
            </div>

            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
                    : 'bg-rose-950/40 border border-rose-800/50 text-rose-300'
                }`}
              >
                {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Server Hostname */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Server Hostname / Instance</label>
                <input
                  type="text"
                  required
                  value={config.server}
                  onChange={(e) => setConfig({ ...config, server: e.target.value })}
                  placeholder="e.g. localhost\SQLEXPRESS2019 or localhost"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Port */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Port (Default 1433)</label>
                <input
                  type="number"
                  value={config.port || 1433}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 1433 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Database */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Database Name</label>
                <input
                  type="text"
                  required
                  value={config.database}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                  placeholder="e.g. DAIKIN_EMS or master"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Auth Mode */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Authentication Mode</label>
                <select
                  value={config.authType}
                  onChange={(e) => setConfig({ ...config, authType: e.target.value as SqlAuthType })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="windows_integrated">Windows Integrated Authentication (SSPI / msnodesqlv8)</option>
                  <option value="windows_ntlm">Windows NTLM Domain Authentication</option>
                  <option value="sql_server">SQL Server Authentication (Username & Password)</option>
                </select>
              </div>

              {/* Windows Domain */}
              {config.authType === 'windows_ntlm' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Windows Domain (Optional)</label>
                  <input
                    type="text"
                    value={config.domain || ''}
                    onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                    placeholder="e.g. CORP or WORKGROUP"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* User */}
              {config.authType !== 'windows_integrated' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Username</label>
                  <input
                    type="text"
                    value={config.user || ''}
                    onChange={(e) => setConfig({ ...config, user: e.target.value })}
                    placeholder="e.g. sa or DOMAIN\user"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Password */}
              {config.authType !== 'windows_integrated' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <input
                    type="password"
                    value={config.password || ''}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Query Timeout */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Query Timeout (ms)</label>
                <input
                  type="number"
                  value={config.requestTimeoutMs || 30000}
                  onChange={(e) => setConfig({ ...config, requestTimeoutMs: parseInt(e.target.value, 10) || 30000 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div
                className={`p-4 rounded-xl text-xs space-y-1 ${
                  testResult.success
                    ? 'bg-emerald-950/30 border border-emerald-800/40 text-emerald-300'
                    : 'bg-rose-950/30 border border-rose-800/40 text-rose-300'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{testResult.success ? 'Connection Test Succeeded!' : 'Connection Test Failed'}</span>
                  {testResult.latencyMs !== undefined && (
                    <span className="text-slate-400 font-mono">({testResult.latencyMs} ms)</span>
                  )}
                </div>
                {testResult.version && (
                  <p className="font-mono text-[11px] text-slate-300">{testResult.version}</p>
                )}
                {testResult.error && (
                  <p className="font-mono text-[11px] text-rose-400">{testResult.error}</p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={isTesting}
                onClick={handleTestConnection}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-slate-700 disabled:opacity-50"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSaving ? 'Connecting...' : 'Save & Reconnect Pool'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'tables' && (
          <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <TableIcon className="w-5 h-5 text-indigo-400" />
                  <span>SQL Server Schema & Tables Explorer</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Discovered database tables and views available for Data Source polling in [{config.database}]
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchTables(config.database)}
                disabled={isLoadingTables}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTables ? 'animate-spin' : ''}`} />
                <span>Scan Database</span>
              </button>
            </div>

            {tables.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                No tables discovered. Connect to SQL Server first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tables.map((t) => (
                  <div
                    key={`${t.schema}.${t.name}`}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl flex items-center justify-between transition-all"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-white font-mono">
                          [{t.schema}].[{t.name}]
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            t.type === 'VIEW'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-indigo-500/20 text-indigo-300'
                          }`}
                        >
                          {t.type}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTable(t.name);
                        setSelectedSchema(t.schema);
                        setActiveTab('grid');
                      }}
                      className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      <span>Open Grid</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'snippets' && (
          <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <span>Developer Integration Snippets</span>
              </h3>
              <p className="text-xs text-slate-400">
                Copy-paste ready React hooks and components for your custom dashboards
              </p>
            </div>

            {/* Snippet 1: useSqlTag Hook */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  1. Process Point Subscription (`useSqlTag`)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `import { useSqlTag } from './src/hooks';\n\nconst { value, quality, isLoading, updateValue } = useSqlTag<number>('db.${activeTableName}[0].ActualTemp', {\n  database: '${config.database}',\n  pollIntervalMs: 2000,\n});`,
                      'hook'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center space-x-1 cursor-pointer"
                >
                  {copiedSnippet === 'hook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet === 'hook' ? 'Copied!' : 'Copy Hook'}</span>
                </button>
              </div>
              <pre className="font-mono text-xs text-indigo-300 bg-slate-900 p-3 rounded-lg overflow-x-auto">
{`import { useSqlTag } from './src/hooks';

// Inside your React component:
const { value, quality, isLoading, updateValue } = useSqlTag<number>('db.${activeTableName}[0].ActualTemp', {
  database: '${config.database}',
  pollIntervalMs: 2000,
});`}
              </pre>
            </div>

            {/* Snippet 2: TASCGrid Component */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  2. Drop-In `<TASCGrid />` Dashboard Component
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `import { TASCGrid } from './src/components/sql';\n\n<TASCGrid\n  database="${config.database}"\n  table="${activeTableName}"\n  schema="${selectedSchema}"\n  title="Live ${activeTableName} Telemetry"\n  pollIntervalMs={3000}\n  pageSize={10}\n  showToolbar={true}\n  showSearch={true}\n  showExport={true}\n/>`,
                      'grid'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center space-x-1 cursor-pointer"
                >
                  {copiedSnippet === 'grid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet === 'grid' ? 'Copied!' : 'Copy Component'}</span>
                </button>
              </div>
              <pre className="font-mono text-xs text-cyan-300 bg-slate-900 p-3 rounded-lg overflow-x-auto">
{`import { TASCGrid } from './src/components/sql';

<TASCGrid
  database="${config.database}"
  table="${activeTableName}"
  schema="${selectedSchema}"
  title="Live ${activeTableName} Telemetry"
  pollIntervalMs={3000}
  pageSize={10}
  showToolbar={true}
  showSearch={true}
  showExport={true}
/>`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* SQL Data Sources & Data Manipulators Manager Modal */}
      <SqlDataSourcesModal
        isOpen={isDataSourcesModalOpen}
        onClose={() => {
          setIsDataSourcesModalOpen(false);
          fetchTables(config.database);
        }}
      />
    </div>
  );
};
