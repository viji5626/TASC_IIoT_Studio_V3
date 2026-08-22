import React, { useState, useEffect } from 'react';
import type {
  SqlDataSource,
  SqlDataManipulator,
  SqlTableMetadata,
  SqlParameterDef,
  TASCGridThresholdRule,
} from '../../types/sql';
import {
  Database,
  Layers,
  Terminal,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Table,
  Code2,
  X,
} from 'lucide-react';

interface SqlDataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlDataSourcesModal: React.FC<SqlDataSourcesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'sources' | 'manipulators'>('sources');

  // List State
  const [dataSources, setDataSources] = useState<SqlDataSource[]>([]);
  const [dataManipulators, setDataManipulators] = useState<SqlDataManipulator[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<SqlTableMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State - Data Source
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [sourceForm, setSourceForm] = useState<Partial<SqlDataSource>>({
    name: 'New Data Source',
    database: 'DAIKIN_EMS',
    mode: 'table',
    table: 'MeterName',
    schema: 'dbo',
    customQuery: 'SELECT TOP 50 * FROM dbo.MeterName ORDER BY MeterID ASC',
    pollIntervalMs: 3000,
    thresholdRules: [],
  });

  // Form State - Data Manipulator
  const [isEditingManipulator, setIsEditingManipulator] = useState(false);
  const [manipulatorForm, setManipulatorForm] = useState<Partial<SqlDataManipulator>>({
    name: 'New Data Manipulator',
    database: 'DAIKIN_EMS',
    type: 'procedure',
    procedureName: 'sp_UpdateSetpoint',
    sql: 'UPDATE dbo.MeterName SET Zone = @zone WHERE MeterID = @id',
    parameters: [
      { name: '@id', type: 'int', value: 1 },
      { name: '@zone', type: 'nvarchar', value: 'Zone A' },
    ],
  });

  // Test Results
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (sourceForm.database) {
      fetchTables(sourceForm.database);
    }
  }, [sourceForm.database]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [dsRes, dmRes, dbRes] = await Promise.all([
        fetch('/api/scada-sql/data-sources').then((r) => r.json()),
        fetch('/api/scada-sql/data-manipulators').then((r) => r.json()),
        fetch('/api/scada-sql/databases').then((r) => r.json()),
      ]);

      if (dsRes.dataSources) setDataSources(dsRes.dataSources);
      if (dmRes.dataManipulators) setDataManipulators(dmRes.dataManipulators);
      if (dbRes.databases) setDatabases(dbRes.databases);
    } catch (e) {
      console.error('Failed to load SQL metadata:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTables = async (db: string) => {
    try {
      const res = await fetch(`/api/scada-sql/tables?database=${encodeURIComponent(db)}`);
      const json = await res.json();
      if (json.tables) setTables(json.tables);
    } catch (e) {
      console.error('Failed to fetch tables:', e);
    }
  };

  // Save Data Source
  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/scada-sql/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceForm),
      });
      const json = await res.json();
      if (json.success) {
        setIsEditingSource(false);
        loadAll();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Data Source
  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SQL Data Source?')) return;
    try {
      await fetch(`/api/scada-sql/data-sources/${id}`, { method: 'DELETE' });
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Data Manipulator
  const handleSaveManipulator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/scada-sql/data-manipulators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manipulatorForm),
      });
      const json = await res.json();
      if (json.success) {
        setIsEditingManipulator(false);
        loadAll();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Data Manipulator
  const handleDeleteManipulator = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SQL Data Manipulator?')) return;
    try {
      await fetch(`/api/scada-sql/data-manipulators/${id}`, { method: 'DELETE' });
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Test Query Execution
  const handleTestSourceQuery = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/scada-sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: sourceForm.database,
          table: sourceForm.mode === 'table' ? sourceForm.table : undefined,
          schema: sourceForm.mode === 'table' ? sourceForm.schema : undefined,
          customQuery: sourceForm.mode === 'query' ? sourceForm.customQuery : undefined,
          limit: 5,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setTestResult({ success: true, count: json.totalCount, data: json.data });
      } else {
        setTestResult({ success: false, error: json.error });
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">SQL Data Sources & Data Manipulators</h2>
              <p className="text-xs text-slate-400">
                Create reusable SQL datasets and Stored Procedure runners for TASCGrid & HMI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('sources');
                setIsEditingSource(false);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'sources'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>SQL Data Sources ({dataSources.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('manipulators');
                setIsEditingManipulator(false);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'manipulators'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>SQL Data Manipulators ({dataManipulators.length})</span>
            </button>
          </div>

          <div>
            {activeTab === 'sources' && !isEditingSource && (
              <button
                type="button"
                onClick={() => {
                  setSourceForm({
                    name: `Data Source ${dataSources.length + 1}`,
                    database: 'DAIKIN_EMS',
                    mode: 'table',
                    table: tables[0]?.name || 'MeterName',
                    schema: 'dbo',
                    pollIntervalMs: 3000,
                    thresholdRules: [],
                  });
                  setIsEditingSource(true);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Data Source</span>
              </button>
            )}

            {activeTab === 'manipulators' && !isEditingManipulator && (
              <button
                type="button"
                onClick={() => {
                  setManipulatorForm({
                    name: `Data Manipulator ${dataManipulators.length + 1}`,
                    database: 'DAIKIN_EMS',
                    type: 'procedure',
                    procedureName: 'sp_UpdateSetpoint',
                    parameters: [{ name: '@id', type: 'int', value: 1 }],
                  });
                  setIsEditingManipulator(true);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Data Manipulator</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'sources' ? (
            /* ================= DATA SOURCES ================= */
            isEditingSource ? (
              <form onSubmit={handleSaveSource} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">Configure SQL Data Source</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingSource(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Back to List
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Data Source Name *</label>
                    <input
                      type="text"
                      required
                      value={sourceForm.name || ''}
                      onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                      placeholder="e.g. Daikin Meter Telemetry"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Target Database</label>
                    <select
                      value={sourceForm.database || 'DAIKIN_EMS'}
                      onChange={(e) => setSourceForm({ ...sourceForm, database: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    >
                      {databases.map((db) => (
                        <option key={db} value={db}>
                          {db}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Query Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSourceForm({ ...sourceForm, mode: 'table' })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer ${
                        sourceForm.mode === 'table'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      <Table className="w-4 h-4" />
                      <span>Table / View Browser</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceForm({ ...sourceForm, mode: 'query' })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer ${
                        sourceForm.mode === 'query'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      <Code2 className="w-4 h-4" />
                      <span>Custom SQL Query</span>
                    </button>
                  </div>
                </div>

                {sourceForm.mode === 'table' ? (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Select Table</label>
                    <select
                      value={sourceForm.table || ''}
                      onChange={(e) => {
                        const tbl = tables.find((t) => t.name === e.target.value);
                        setSourceForm({
                          ...sourceForm,
                          table: e.target.value,
                          schema: tbl?.schema || 'dbo',
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    >
                      {tables.map((t) => (
                        <option key={`${t.schema}.${t.name}`} value={t.name}>
                          [{t.schema}].[{t.name}] ({t.type})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Custom SQL Query</label>
                    <textarea
                      rows={4}
                      value={sourceForm.customQuery || ''}
                      onChange={(e) => setSourceForm({ ...sourceForm, customQuery: e.target.value })}
                      placeholder="SELECT TOP 50 * FROM dbo.MeterName ORDER BY MeterID ASC"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Poll Interval */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Poll Interval (ms)</label>
                    <input
                      type="number"
                      value={sourceForm.pollIntervalMs || 3000}
                      onChange={(e) =>
                        setSourceForm({ ...sourceForm, pollIntervalMs: Number(e.target.value) })
                      }
                      step={500}
                      min={500}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* Test Query Button */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={handleTestSourceQuery}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isTesting ? 'Testing Query...' : 'Test SQL Query'}</span>
                  </button>

                  {testResult && (
                    <span
                      className={`text-xs font-mono px-3 py-1 rounded-lg ${
                        testResult.success
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                      }`}
                    >
                      {testResult.success
                        ? `✓ Query Succeeded (${testResult.count} records)`
                        : `✗ Error: ${testResult.error}`}
                    </span>
                  )}
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingSource(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    Save Data Source
                  </button>
                </div>
              </form>
            ) : dataSources.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
                <Layers className="w-12 h-12 text-slate-700" />
                <p className="text-sm font-semibold text-slate-300">No SQL Data Sources Created Yet</p>
                <p className="text-xs text-slate-500 text-center max-w-md">
                  Create a SQL Data Source to query tables or views in SQL Server and stream live telemetry to TASCGrid widgets.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dataSources.map((ds) => (
                  <div
                    key={ds.id}
                    className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block">{ds.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            DB: [{ds.database}] &bull; {ds.mode === 'table' ? `[${ds.schema}].[${ds.table}]` : 'Custom SQL'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSource(ds.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs font-mono bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-slate-300 truncate">
                      {ds.mode === 'table' ? `SELECT * FROM [${ds.schema}].[${ds.table}]` : ds.customQuery}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Rate: {ds.pollIntervalMs}ms</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSourceForm(ds);
                          setIsEditingSource(true);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                      >
                        Edit Source &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* ================= DATA MANIPULATORS ================= */
            isEditingManipulator ? (
              <form onSubmit={handleSaveManipulator} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">Configure SQL Data Manipulator</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditingManipulator(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Back to List
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Manipulator Name *</label>
                    <input
                      type="text"
                      required
                      value={manipulatorForm.name || ''}
                      onChange={(e) => setManipulatorForm({ ...manipulatorForm, name: e.target.value })}
                      placeholder="e.g. Set Motor Setpoint"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Target Database</label>
                    <select
                      value={manipulatorForm.database || 'DAIKIN_EMS'}
                      onChange={(e) => setManipulatorForm({ ...manipulatorForm, database: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    >
                      {databases.map((db) => (
                        <option key={db} value={db}>
                          {db}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Type Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Command Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setManipulatorForm({ ...manipulatorForm, type: 'procedure' })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer ${
                        manipulatorForm.type === 'procedure'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      <Terminal className="w-4 h-4" />
                      <span>Stored Procedure</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManipulatorForm({ ...manipulatorForm, type: 'query' })}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer ${
                        manipulatorForm.type === 'query'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      <Code2 className="w-4 h-4" />
                      <span>Parameterized Command</span>
                    </button>
                  </div>
                </div>

                {manipulatorForm.type === 'procedure' ? (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Stored Procedure Name</label>
                    <input
                      type="text"
                      value={manipulatorForm.procedureName || ''}
                      onChange={(e) => setManipulatorForm({ ...manipulatorForm, procedureName: e.target.value })}
                      placeholder="e.g. sp_UpdateSetpoint"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">SQL UPDATE / INSERT Statement</label>
                    <textarea
                      rows={3}
                      value={manipulatorForm.sql || ''}
                      onChange={(e) => setManipulatorForm({ ...manipulatorForm, sql: e.target.value })}
                      placeholder="UPDATE dbo.MeterName SET Zone = @zone WHERE MeterID = @id"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Parameters */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Parameters</label>
                    <button
                      type="button"
                      onClick={() =>
                        setManipulatorForm({
                          ...manipulatorForm,
                          parameters: [
                            ...(manipulatorForm.parameters || []),
                            { name: `@param${(manipulatorForm.parameters?.length || 0) + 1}`, type: 'nvarchar', value: '' },
                          ],
                        })
                      }
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Parameter</span>
                    </button>
                  </div>

                  {(manipulatorForm.parameters || []).map((p, pIdx) => (
                    <div key={pIdx} className="flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => {
                          const updated = [...(manipulatorForm.parameters || [])];
                          updated[pIdx].name = e.target.value;
                          setManipulatorForm({ ...manipulatorForm, parameters: updated });
                        }}
                        placeholder="@name"
                        className="w-32 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                      />
                      <select
                        value={p.type || 'nvarchar'}
                        onChange={(e) => {
                          const updated = [...(manipulatorForm.parameters || [])];
                          updated[pIdx].type = e.target.value as any;
                          setManipulatorForm({ ...manipulatorForm, parameters: updated });
                        }}
                        className="w-28 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300"
                      >
                        <option value="int">int</option>
                        <option value="float">float</option>
                        <option value="nvarchar">nvarchar</option>
                        <option value="bit">bit</option>
                        <option value="datetime">datetime</option>
                      </select>
                      <input
                        type="text"
                        value={p.value ?? ''}
                        onChange={(e) => {
                          const updated = [...(manipulatorForm.parameters || [])];
                          updated[pIdx].value = e.target.value;
                          setManipulatorForm({ ...manipulatorForm, parameters: updated });
                        }}
                        placeholder="Default Value"
                        className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setManipulatorForm({
                            ...manipulatorForm,
                            parameters: manipulatorForm.parameters?.filter((_, i) => i !== pIdx),
                          })
                        }
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingManipulator(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    Save Data Manipulator
                  </button>
                </div>
              </form>
            ) : dataManipulators.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
                <Terminal className="w-12 h-12 text-slate-700" />
                <p className="text-sm font-semibold text-slate-300">No SQL Data Manipulators Created Yet</p>
                <p className="text-xs text-slate-500 text-center max-w-md">
                  Create Stored Procedure runners or parameterized commands to let operators execute database updates from TASCGrid.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dataManipulators.map((dm) => (
                  <div
                    key={dm.id}
                    className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                          <Terminal className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block">{dm.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            DB: [{dm.database}] &bull; {dm.type === 'procedure' ? `SP: ${dm.procedureName}` : 'Command'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteManipulator(dm.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs font-mono bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-slate-300 truncate">
                      {dm.type === 'procedure' ? `EXEC ${dm.procedureName}` : dm.sql}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Params: {dm.parameters?.length || 0}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setManipulatorForm(dm);
                          setIsEditingManipulator(true);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                      >
                        Edit Manipulator &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
