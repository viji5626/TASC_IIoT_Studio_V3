import React, { useState, useEffect } from 'react';
import type {
  SqlDataSource,
  SqlDataManipulator,
  SqlTableMetadata,
  TASCGridThresholdRule,
  TASCGridTabConfig,
} from '../../../types/sql';
import {
  Database,
  Table,
  Code2,
  AlertTriangle,
  Play,
  Plus,
  Trash2,
  RefreshCw,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface PanelTASCGridConfigSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const PanelTASCGridConfigSection: React.FC<PanelTASCGridConfigSectionProps> = ({
  formData,
  setFormData,
  handleChange,
}) => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<SqlTableMetadata[]>([]);
  const [dataSources, setDataSources] = useState<SqlDataSource[]>([]);
  const [dataManipulators, setDataManipulators] = useState<SqlDataManipulator[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [testQueryResult, setTestQueryResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
  const [isTestingQuery, setIsTestingQuery] = useState(false);

  // Tabs structure: array of TASCGridTabConfig
  const tabs: TASCGridTabConfig[] = formData.sqlTabs && formData.sqlTabs.length > 0
    ? formData.sqlTabs
    : [
        {
          id: 'tab_default',
          name: formData.panelName || 'Main Data',
          database: formData.sqlDatabase || 'DAIKIN_EMS',
          mode: formData.sqlDataSourceMode || (formData.sqlCustomQuery ? 'custom_query' : 'table'),
          table: formData.sqlTableName || 'MeterName',
          schema: formData.sqlSchema || 'dbo',
          customQuery: formData.sqlCustomQuery || '',
          pollIntervalMs: formData.sqlPollIntervalMs ?? 3000,
          pageSize: formData.pageSize || 10,
          thresholdRules: formData.sqlThresholdRules || [],
          manipulatorIds: formData.sqlManipulatorIds || [],
        },
      ];

  const [activeTabIdx, setActiveTabIdx] = useState<number>(0);
  const currentTab = tabs[activeTabIdx] || tabs[0];

  const currentDb = currentTab.database || formData.sqlDatabase || 'DAIKIN_EMS';

  // Load databases & saved data sources on mount
  useEffect(() => {
    fetchDatabases();
    fetchDataSources();
    fetchDataManipulators();
  }, []);

  // Load tables whenever selected database changes
  useEffect(() => {
    if (currentDb) {
      fetchTables(currentDb);
    }
  }, [currentDb]);

  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/scada-sql/databases');
      const data = await res.json();
      if (data.databases) {
        setDatabases(data.databases);
      }
    } catch (e) {
      console.error('Error fetching databases:', e);
    }
  };

  const fetchTables = async (db: string) => {
    setIsLoadingMeta(true);
    try {
      const res = await fetch(`/api/scada-sql/tables?database=${encodeURIComponent(db)}`);
      const data = await res.json();
      if (data.tables) {
        setTables(data.tables);
      }
    } catch (e) {
      console.error('Error fetching tables:', e);
    } finally {
      setIsLoadingMeta(false);
    }
  };

  const fetchDataSources = async () => {
    try {
      const res = await fetch('/api/scada-sql/data-sources');
      const data = await res.json();
      if (data.dataSources) {
        setDataSources(data.dataSources);
      }
    } catch (e) {
      console.error('Error fetching data sources:', e);
    }
  };

  const fetchDataManipulators = async () => {
    try {
      const res = await fetch('/api/scada-sql/data-manipulators');
      const data = await res.json();
      if (data.dataManipulators) {
        setDataManipulators(data.dataManipulators);
      }
    } catch (e) {
      console.error('Error fetching data manipulators:', e);
    }
  };

  // Helper to update current tab and sync with formData
  const updateCurrentTab = (updates: Partial<TASCGridTabConfig>) => {
    const updatedTabs = tabs.map((t, idx) => {
      if (idx === activeTabIdx) {
        return { ...t, ...updates };
      }
      return t;
    });

    const active = updatedTabs[activeTabIdx];

    setFormData((prev: any) => ({
      ...prev,
      sqlTabs: updatedTabs,
      // Mirror top-level fields for backwards compatibility with active tab
      sqlDatabase: active.database,
      sqlTableName: active.table,
      sqlSchema: active.schema,
      sqlCustomQuery: active.customQuery,
      sqlDataSourceMode: active.mode,
      sqlPollIntervalMs: active.pollIntervalMs,
      pageSize: active.pageSize,
      sqlThresholdRules: active.thresholdRules,
      sqlManipulatorIds: active.manipulatorIds,
    }));
  };

  // Add new Data Source Tab
  const handleAddTab = () => {
    const newTab: TASCGridTabConfig = {
      id: `tab_${Date.now()}`,
      name: `Source ${tabs.length + 1}`,
      database: currentDb,
      mode: 'table',
      table: tables.length > 0 ? tables[0].name : 'MeterName',
      schema: tables.length > 0 ? tables[0].schema : 'dbo',
      pollIntervalMs: 3000,
      pageSize: 10,
      thresholdRules: [],
      manipulatorIds: [],
    };

    const newTabs = [...tabs, newTab];
    setFormData((prev: any) => ({ ...prev, sqlTabs: newTabs }));
    setActiveTabIdx(newTabs.length - 1);
  };

  // Delete Data Source Tab
  const handleDeleteTab = (index: number) => {
    if (tabs.length <= 1) return;
    const newTabs = tabs.filter((_, idx) => idx !== index);
    setFormData((prev: any) => ({ ...prev, sqlTabs: newTabs }));
    setActiveTabIdx(Math.max(0, index - 1));
  };

  // Test SQL Query for current tab
  const handleTestQuery = async () => {
    setIsTestingQuery(true);
    setTestQueryResult(null);
    try {
      let reqDatabase = currentTab.database;
      let reqTable = currentTab.table;
      let reqSchema = currentTab.schema || 'dbo';
      let reqCustomQuery = currentTab.customQuery;

      if (currentTab.mode === 'source' && currentTab.dataSourceId) {
        const ds = dataSources.find((s) => s.id === currentTab.dataSourceId);
        if (ds) {
          reqDatabase = ds.database || reqDatabase;
          reqTable = ds.table;
          reqSchema = ds.schema || 'dbo';
          reqCustomQuery = ds.customQuery;
        }
      }

      const res = await fetch('/api/scada-sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: reqDatabase,
          dataSourceId: currentTab.dataSourceId,
          table: currentTab.mode === 'custom_query' ? undefined : reqTable,
          schema: currentTab.mode === 'custom_query' ? undefined : reqSchema,
          customQuery: currentTab.mode === 'table' ? undefined : reqCustomQuery,
          limit: 5,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setTestQueryResult({ success: true, count: data.totalCount || data.data.length });
      } else {
        setTestQueryResult({ success: false, error: data.error || 'Query failed' });
      }
    } catch (err: any) {
      setTestQueryResult({ success: false, error: err.message });
    } finally {
      setIsTestingQuery(false);
    }
  };

  // Threshold Rules Management for current tab
  const addThresholdRule = () => {
    const newRule: TASCGridThresholdRule = {
      column: '',
      condition: 'gt',
      value: 0,
      severity: 'warning',
      badgeLabel: 'ALARM',
      pulse: true,
    };
    updateCurrentTab({
      thresholdRules: [...(currentTab.thresholdRules || []), newRule],
    });
  };

  const removeThresholdRule = (index: number) => {
    updateCurrentTab({
      thresholdRules: (currentTab.thresholdRules || []).filter((_, i) => i !== index),
    });
  };

  const updateThresholdRule = (index: number, field: string, val: any) => {
    const rules = [...(currentTab.thresholdRules || [])];
    rules[index] = { ...rules[index], [field]: val };
    updateCurrentTab({ thresholdRules: rules });
  };

  return (
    <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#0c121e] p-4 rounded-xl border border-sky-500/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-sky-400 font-bold uppercase tracking-wider flex items-center space-x-2">
          <Database className="w-4 h-4 text-sky-400" />
          <span>TASCGrid Multi-Source & Table Configuration</span>
        </label>
        <span className="text-[10px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded font-mono border border-sky-500/20">
          Native Windows Auth (msnodesqlv8)
        </span>
      </div>

      {/* Multiple Data Sources Tabs Bar */}
      <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Configured Data Source Tabs ({tabs.length})</span>
          </span>
          <button
            type="button"
            onClick={handleAddTab}
            className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-transform active:scale-95 flex items-center space-x-1 cursor-pointer shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Data Source Tab</span>
          </button>
        </div>

        {/* Tab Selection Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar pb-1">
          {tabs.map((tab, idx) => {
            const isSelected = idx === activeTabIdx;
            return (
              <div
                key={tab.id || idx}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md font-bold'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
                onClick={() => setActiveTabIdx(idx)}
              >
                <span>{tab.name || `Source ${idx + 1}`}</span>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTab(idx);
                    }}
                    className={`ml-1 p-0.5 rounded hover:bg-rose-500/20 ${
                      isSelected ? 'text-slate-950 hover:text-rose-950' : 'text-slate-500 hover:text-rose-400'
                    }`}
                    title="Delete Tab"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Tab Configuration Form */}
      <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-3.5">
        {/* Tab Name & Database */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              Tab / Source Name *
            </label>
            <input
              type="text"
              value={currentTab.name || ''}
              onChange={(e) => updateCurrentTab({ name: e.target.value })}
              placeholder="e.g. Meter Telemetry, Energy Shift Log"
              className="w-full bg-slate-950 text-white rounded-lg p-2.5 text-xs border border-slate-700 focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              Target Database
            </label>
            <select
              value={currentTab.database || 'DAIKIN_EMS'}
              onChange={(e) => updateCurrentTab({ database: e.target.value })}
              className="w-full bg-slate-950 text-white rounded-lg p-2.5 text-xs border border-slate-700 font-mono focus:border-sky-400 focus:outline-none"
            >
              {databases.map((db) => (
                <option key={db} value={db}>
                  {db}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Acquisition Mode Switcher */}
        <div>
          <label className="text-xs text-slate-300 font-semibold block mb-1.5">
            Data Query Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => updateCurrentTab({ mode: 'table' })}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border cursor-pointer transition-all ${
                currentTab.mode === 'table'
                  ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table / View</span>
            </button>

            <button
              type="button"
              onClick={() => updateCurrentTab({ mode: 'custom_query' })}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border cursor-pointer transition-all ${
                currentTab.mode === 'custom_query'
                  ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Custom SQL</span>
            </button>

            <button
              type="button"
              onClick={() => updateCurrentTab({ mode: 'source' })}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 border cursor-pointer transition-all ${
                currentTab.mode === 'source'
                  ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Saved Source</span>
            </button>
          </div>
        </div>

        {/* Table Selection Mode */}
        {currentTab.mode === 'table' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-300 font-semibold">
                Select Table / View
              </label>
              <button
                type="button"
                onClick={() => fetchTables(currentTab.database)}
                className="text-[10px] text-slate-400 hover:text-sky-400 flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingMeta ? 'animate-spin' : ''}`} />
                <span>Refresh Schema</span>
              </button>
            </div>
            <select
              value={currentTab.table || ''}
              onChange={(e) => {
                const selected = tables.find((t) => t.name === e.target.value);
                updateCurrentTab({
                  table: e.target.value,
                  schema: selected?.schema || 'dbo',
                });
              }}
              className="w-full bg-slate-950 text-white rounded-lg p-2.5 text-xs border border-slate-700 font-mono focus:border-sky-400 focus:outline-none"
            >
              {tables.map((tbl) => (
                <option key={`${tbl.schema}.${tbl.name}`} value={tbl.name}>
                  [{tbl.schema}].[{tbl.name}] ({tbl.type})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom SQL Mode */}
        {currentTab.mode === 'custom_query' && (
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              Custom SQL Query (SELECT only)
            </label>
            <textarea
              rows={3}
              value={currentTab.customQuery || ''}
              onChange={(e) => updateCurrentTab({ customQuery: e.target.value })}
              placeholder="SELECT TOP 50 MeterID, Zone, MeterName FROM dbo.MeterName WHERE Zone = 'LT Panel'"
              className="w-full bg-slate-950 text-sky-300 font-mono rounded-lg p-2.5 text-xs border border-slate-700 focus:border-sky-400 focus:outline-none"
            />
          </div>
        )}

        {/* Saved Data Source Reference Mode */}
        {currentTab.mode === 'source' && (
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              Select Saved SQL Data Source
            </label>
            <select
              value={currentTab.dataSourceId || ''}
              onChange={(e) => {
                const ds = dataSources.find((s) => s.id === e.target.value);
                if (ds) {
                  updateCurrentTab({
                    dataSourceId: ds.id,
                    database: ds.database,
                    table: ds.table,
                    schema: ds.schema,
                    customQuery: ds.customQuery,
                    pollIntervalMs: ds.pollIntervalMs,
                  });
                }
              }}
              className="w-full bg-slate-950 text-white rounded-lg p-2.5 text-xs border border-slate-700 font-mono focus:border-sky-400 focus:outline-none"
            >
              <option value="">-- Choose Data Source --</option>
              {dataSources.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.database} • {ds.table || 'Custom Query'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Polling & Pagination Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              Telemetry Poll Interval (ms)
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={currentTab.pollIntervalMs ?? 3000}
              onChange={(e) => updateCurrentTab({ pollIntervalMs: Number(e.target.value) })}
              className="w-full bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono focus:border-sky-400 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500">Set 0 to disable auto-polling</span>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              Rows Per Page
            </label>
            <select
              value={currentTab.pageSize || 10}
              onChange={(e) => updateCurrentTab({ pageSize: Number(e.target.value) })}
              className="w-full bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono focus:border-sky-400 focus:outline-none"
            >
              <option value={5}>5 rows per page</option>
              <option value={10}>10 rows per page</option>
              <option value={25}>25 rows per page</option>
              <option value={50}>50 rows per page</option>
              <option value={100}>100 rows per page</option>
            </select>
          </div>
        </div>

        {/* Test SQL Query Button & Result */}
        <div className="pt-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleTestQuery}
              disabled={isTestingQuery}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 text-sky-400 ${isTestingQuery ? 'animate-spin' : ''}`} />
              <span>{isTestingQuery ? 'Executing Query...' : 'Test SQL Query'}</span>
            </button>

            {testQueryResult && (
              <div
                className={`text-xs px-2.5 py-1 rounded-lg border font-mono flex items-center space-x-1.5 ${
                  testQueryResult.success
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}
              >
                {testQueryResult.success ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>✓ Query Succeeded ({testQueryResult.count} records)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>{testQueryResult.error}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alarm Threshold Highlights Section */}
      <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Alarm Threshold Rules for Current Tab ({currentTab.thresholdRules?.length || 0})</span>
          </label>
          <button
            type="button"
            onClick={addThresholdRule}
            className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Rule</span>
          </button>
        </div>

        {(!currentTab.thresholdRules || currentTab.thresholdRules.length === 0) ? (
          <p className="text-[11px] text-slate-500 italic">No threshold rules configured for this data source.</p>
        ) : (
          <div className="space-y-2">
            {currentTab.thresholdRules.map((rule, idx) => (
              <div key={idx} className="flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs">
                <input
                  type="text"
                  placeholder="Column (e.g. TotalEnergy)"
                  value={rule.column}
                  onChange={(e) => updateThresholdRule(idx, 'column', e.target.value)}
                  className="bg-slate-900 text-white rounded px-2 py-1 text-xs border border-slate-700 w-32 focus:border-amber-400 outline-none"
                />

                <select
                  value={rule.condition}
                  onChange={(e) => updateThresholdRule(idx, 'condition', e.target.value)}
                  className="bg-slate-900 text-white rounded px-2 py-1 text-xs border border-slate-700 focus:border-amber-400 outline-none"
                >
                  <option value="gt">&gt; (Greater than)</option>
                  <option value="gte">&ge; (Greater/Equal)</option>
                  <option value="lt">&lt; (Less than)</option>
                  <option value="lte">&le; (Less/Equal)</option>
                  <option value="eq">= (Equals)</option>
                  <option value="neq">&ne; (Not Equals)</option>
                </select>

                <input
                  type="text"
                  placeholder="Value"
                  value={rule.value}
                  onChange={(e) => updateThresholdRule(idx, 'value', e.target.value)}
                  className="bg-slate-900 text-white rounded px-2 py-1 text-xs border border-slate-700 w-20 focus:border-amber-400 outline-none font-mono"
                />

                <select
                  value={rule.severity || 'warning'}
                  onChange={(e) => {
                    const sev = e.target.value;
                    updateThresholdRule(idx, 'severity', sev);
                    updateThresholdRule(
                      idx,
                      'bgClass',
                      sev === 'critical' ? 'bg-rose-950/40' : 'bg-amber-950/30'
                    );
                    updateThresholdRule(
                      idx,
                      'textClass',
                      sev === 'critical' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'
                    );
                  }}
                  className="bg-slate-900 text-white rounded px-2 py-1 text-xs border border-slate-700 focus:border-amber-400 outline-none"
                >
                  <option value="warning">Warning (Amber)</option>
                  <option value="critical">Critical (Red Alert)</option>
                </select>

                <input
                  type="text"
                  placeholder="Badge (e.g. HIGH)"
                  value={rule.badgeLabel || ''}
                  onChange={(e) => updateThresholdRule(idx, 'badgeLabel', e.target.value)}
                  className="bg-slate-900 text-white rounded px-2 py-1 text-xs border border-slate-700 w-24 focus:border-amber-400 outline-none"
                />

                <button
                  type="button"
                  onClick={() => removeThresholdRule(idx)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
