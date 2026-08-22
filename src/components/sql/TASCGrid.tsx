import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  TASCGridProps,
  TASCGridColumn,
  TASCGridThresholdRule,
  TASCGridTabConfig,
} from '../../types/sql';
import {
  Play,
  Pause,
  RefreshCw,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

export const TASCGrid: React.FC<TASCGridProps> = ({
  tabs,
  activeTabId: controlledTabId,
  onTabChange,
  dataSourceId,
  database = 'DAIKIN_EMS',
  table = 'MeterName',
  schema = 'dbo',
  customQuery,
  title,
  endpoint = '/api/scada-sql/query',
  pollIntervalMs = 3000,
  columns: userColumns,
  thresholdRules: initialThresholdRules = [],
  pageSize: initialPageSize = 10,
  className = '',
  height,
  isCompact = false,
  isHmiMode = false,
  showToolbar = true,
  showSearch = true,
  showExport = true,
  showRefresh = true,
  showStatusPill = true,
  onRowClick,
  actions = [],
  onEdit,
}) => {
  // Multi-Tab State
  const [internalTabId, setInternalTabId] = useState<string>(tabs && tabs.length > 0 ? tabs[0].id : '');
  const activeTabId = controlledTabId !== undefined ? controlledTabId : internalTabId;

  // Active configuration based on selected Tab
  const activeTabConfig = useMemo<TASCGridTabConfig | null>(() => {
    if (!tabs || tabs.length === 0) return null;
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  // Derived query parameters from Tab or direct props
  const effectiveDatabase = activeTabConfig?.database || database || 'DAIKIN_EMS';
  const effectiveTable = activeTabConfig
    ? activeTabConfig.mode === 'custom_query'
      ? undefined
      : activeTabConfig.table
    : customQuery
    ? undefined
    : table;
  const effectiveSchema = activeTabConfig?.schema || schema || 'dbo';
  const effectiveCustomQuery = activeTabConfig
    ? activeTabConfig.mode === 'table'
      ? undefined
      : activeTabConfig.customQuery
    : customQuery;
  const effectivePollInterval =
    activeTabConfig?.pollIntervalMs !== undefined ? activeTabConfig.pollIntervalMs : pollIntervalMs;
  const effectivePageSize = activeTabConfig?.pageSize || initialPageSize || 10;
  const effectiveThresholdRules = activeTabConfig?.thresholdRules || initialThresholdRules || [];

  // Query & Data State
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [inferredColumns, setInferredColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Streaming & Pagination State
  const [isStreaming, setIsStreaming] = useState<boolean>(effectivePollInterval > 0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(effectivePageSize);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Reset pagination when active tab or table changes
  useEffect(() => {
    setCurrentPage(1);
    setData([]);
  }, [activeTabId, effectiveDatabase, effectiveTable, effectiveCustomQuery, activeTabConfig?.dataSourceId]);

  // Tab switcher handler
  const handleSelectTab = (tabId: string) => {
    setInternalTabId(tabId);
    onTabChange?.(tabId);
  };

  // Fetch real data from SQL backend
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: effectiveDatabase,
          dataSourceId: activeTabConfig?.dataSourceId || dataSourceId,
          table: effectiveTable,
          schema: effectiveSchema,
          customQuery: effectiveCustomQuery || undefined,
          page: currentPage,
          limit: pageSize,
          sortBy: sortField || undefined,
          sortDir: sortDirection.toUpperCase() as 'ASC' | 'DESC',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `SQL Server returned HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json.data || []);
      setTotalCount(json.totalCount || json.data?.length || 0);
      setLatencyMs(json.latencyMs || null);
      setLastSyncTime(new Date());

      if (json.columns && json.columns.length > 0) {
        setInferredColumns(json.columns);
      } else if (json.data && json.data.length > 0) {
        setInferredColumns(Object.keys(json.data[0]));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to query SQL Server');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, effectiveDatabase, effectiveTable, effectiveSchema, effectiveCustomQuery, currentPage, pageSize, sortField, sortDirection]);

  // Initial Load & Polling Loop
  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isStreaming || effectivePollInterval <= 0) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, effectivePollInterval);

    return () => clearInterval(interval);
  }, [isStreaming, effectivePollInterval, fetchData]);

  // Evaluate Alarm Threshold Highlights
  const getThresholdMatch = useCallback(
    (column: string, value: any): TASCGridThresholdRule | null => {
      if (!effectiveThresholdRules || effectiveThresholdRules.length === 0 || value === undefined || value === null) {
        return null;
      }

      for (const rule of effectiveThresholdRules) {
        if (rule.column.toLowerCase() === column.toLowerCase()) {
          const numVal = typeof value === 'number' ? value : parseFloat(value);
          const ruleVal = typeof rule.value === 'number' ? rule.value : parseFloat(rule.value);

          switch (rule.condition) {
            case 'gt':
              if (numVal > ruleVal) return rule;
              break;
            case 'gte':
              if (numVal >= ruleVal) return rule;
              break;
            case 'lt':
              if (numVal < ruleVal) return rule;
              break;
            case 'lte':
              if (numVal <= ruleVal) return rule;
              break;
            case 'eq':
              if (String(value).toLowerCase() === String(rule.value).toLowerCase()) return rule;
              break;
            case 'neq':
              if (String(value).toLowerCase() !== String(rule.value).toLowerCase()) return rule;
              break;
          }
        }
      }
      return null;
    },
    [effectiveThresholdRules]
  );

  // Active Columns
  const activeColumns: TASCGridColumn[] = useMemo(() => {
    if (userColumns && userColumns.length > 0) return userColumns;
    if (activeTabConfig?.columns && activeTabConfig.columns.length > 0) return activeTabConfig.columns;
    return inferredColumns.map((col) => ({
      field: col,
      headerName: col,
      sortable: true,
      filterable: true,
    }));
  }, [userColumns, activeTabConfig, inferredColumns]);

  // Filtered Client Rows for Search
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm]);

  // Sorting Handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // CSV Export Utility
  const handleExportCsv = () => {
    if (data.length === 0) return;
    const headers = activeColumns.map((c) => c.headerName || c.field).join(',');
    const rows = data.map((row) =>
      activeColumns
        .map((c) => {
          const val = row[c.field];
          if (val === null || val === undefined) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `TASCGrid_${effectiveDatabase}_${effectiveTable || 'query'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasTabs = tabs && tabs.length > 1;

  // Format Display Values
  const formatCellValue = (value: any, col: TASCGridColumn) => {
    if (value === null || value === undefined) return <span className="text-slate-600">NULL</span>;
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-emerald-400 font-bold">TRUE</span>
      ) : (
        <span className="text-slate-500 font-bold">FALSE</span>
      );
    }
    if (typeof value === 'number') {
      return (
        <span className="font-mono">
          {col.decimals !== undefined ? value.toFixed(col.decimals) : value}
          {col.unit ? ` ${col.unit}` : ''}
        </span>
      );
    }
    if (typeof value === 'string' && value.length > 40) {
      return <span title={value} className="truncate block max-w-xs">{value}</span>;
    }
    return String(value);
  };

  return (
    <div
      className={`w-full h-full flex flex-col bg-[#070b14]/95 text-slate-100 rounded-xl overflow-hidden select-none border border-slate-800/80 shadow-2xl font-sans ${className}`}
      style={{ height: height || '100%' }}
    >
      {/* 1. Ultra-Sleek Modern SCADA Header */}
      {showToolbar && (
        <div className="flex flex-col border-b border-slate-800/80 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-950/95 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between px-3 py-2 gap-2">
            {/* Left Identity: Icon + Title + DB Pill + Live Status */}
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)] shrink-0">
                <Database className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-slate-100 tracking-wide truncate max-w-[200px] sm:max-w-xs">
                {title || activeTabConfig?.name || effectiveTable || 'SQL Data Grid'}
              </span>
              <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-sky-300/90 border border-slate-700/50 shadow-inner shrink-0 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-sky-400"></span>
                {effectiveDatabase}
              </span>

              {/* Ultra-Sleek Live Status Capsule */}
              {showStatusPill && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-[9px] font-medium shrink-0 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  </span>
                  <span className="tracking-wider">LIVE</span>
                  {latencyMs !== null && (
                    <span className="text-emerald-400/70 border-l border-emerald-500/20 pl-1">{latencyMs}ms</span>
                  )}
                </div>
              )}
            </div>

            {/* Right Sleek Action Controls */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* Sleek Capsule Filter Search */}
              {showSearch && (
                <div className="relative flex items-center">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-900/90 hover:bg-slate-900 focus:bg-slate-900/95 border border-slate-800 hover:border-slate-700 focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/15 text-slate-200 text-[10.5px] rounded-full pl-7 pr-2.5 py-1 outline-none w-24 sm:w-36 transition-all placeholder:text-slate-500 font-mono shadow-inner"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 text-slate-400 hover:text-white text-[11px] font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}

              {/* Segmented Action Buttons Pill */}
              <div className="flex items-center p-0.5 bg-slate-900/80 rounded-lg border border-slate-800/80 shadow-sm">
                {/* Streaming Toggle */}
                {effectivePollInterval > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsStreaming(!isStreaming)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                      isStreaming
                        ? 'text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300'
                        : 'text-amber-400 hover:bg-amber-500/15 hover:text-amber-300'
                    }`}
                    title={isStreaming ? 'Streaming: Click to Pause' : 'Paused: Click to Resume'}
                  >
                    {isStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                )}

                {/* Manual Refresh */}
                {showRefresh && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoading(true);
                      fetchData();
                    }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-sky-300 hover:bg-sky-500/15 transition-all cursor-pointer"
                    title="Refresh Query Data"
                  >
                    <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
                  </button>
                )}

                {/* CSV Export */}
                {showExport && (
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={data.length === 0}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-teal-300 hover:bg-teal-500/15 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Export as CSV"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sleek Underline Multi-Data-Source Tabs */}
          {hasTabs && (
            <div className="flex items-center px-3 py-1 gap-1.5 border-t border-slate-800/60 bg-slate-950/60 overflow-x-auto custom-scrollbar">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectTab(tab.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-medium tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.15)] font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <Layers className="w-2.5 h-2.5 opacity-70" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Main Table Body View */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar relative">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white mb-0.5">SQL Query Error</h4>
              <p className="text-[10px] text-rose-300 font-mono max-w-sm bg-rose-950/40 px-2 py-1 rounded border border-rose-500/20">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                fetchData();
              }}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-[11px] border-collapse">
            {/* Table Header */}
            <thead className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md text-slate-400 uppercase text-[9px] font-mono font-semibold tracking-wider border-b border-slate-800/80">
              <tr>
                {activeColumns.map((col) => {
                  const isSorted = sortField === col.field;
                  return (
                    <th
                      key={col.field}
                      onClick={() => col.sortable !== false && handleSort(col.field)}
                      style={{ width: col.width }}
                      className={`px-3 py-2 transition-colors select-none ${
                        col.sortable !== false ? 'cursor-pointer hover:bg-slate-800/60 hover:text-sky-300' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>{col.headerName || col.field}</span>
                        {col.sortable !== false && (
                          <span className="text-slate-500">
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="w-3 h-3 text-sky-400" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-sky-400" />
                              )
                            ) : (
                              <ArrowUpDown className="w-2.5 h-2.5 opacity-30 hover:opacity-75" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {actions.length > 0 && (
                  <th className="px-3 py-2 text-right w-20">Actions</th>
                )}
              </tr>
            </thead>

            {/* Table Body Rows */}
            <tbody className="divide-y divide-white/[0.03]">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeColumns.length + (actions.length > 0 ? 1 : 0)}
                    className="text-center py-8 text-slate-500 text-[11px]"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2 text-sky-400 font-semibold">
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Querying SQL Server...</span>
                      </div>
                    ) : searchTerm ? (
                      `No records matching "${searchTerm}"`
                    ) : (
                      'No records found'
                    )}
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rIdx) => {
                  return (
                    <tr
                      key={rIdx}
                      onClick={() => onRowClick?.(row)}
                      className={`transition-colors group ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${
                        rIdx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'
                      } hover:bg-sky-500/[0.06]`}
                    >
                      {activeColumns.map((col) => {
                        const rawVal = row[col.field];
                        const threshold = getThresholdMatch(col.field, rawVal);

                        return (
                          <td
                            key={col.field}
                            className={`px-3 py-1.5 whitespace-nowrap text-slate-200 font-mono transition-colors ${
                              threshold?.bgClass || ''
                            } ${threshold?.textClass || ''}`}
                          >
                            <div className="flex items-center space-x-1.5">
                              {threshold?.pulse && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                              )}
                              {threshold?.badgeLabel && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                  {threshold.badgeLabel}
                                </span>
                              )}
                              {col.renderCell ? (
                                col.renderCell(rawVal, row)
                              ) : (
                                <span>{formatCellValue(rawVal, col)}</span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Action buttons if defined */}
                      {actions.length > 0 && (
                        <td className="px-3 py-1 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            {actions.map((act, aIdx) => {
                              if (act.hidden && act.hidden(row)) return null;
                              return (
                                <button
                                  key={aIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    act.onClick(row);
                                  }}
                                  className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-slate-950 transition-all cursor-pointer shadow-sm"
                                >
                                  {act.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 3. Ultra-Sleek Modern SCADA Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-800/80 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-slate-950/95 backdrop-blur-xl text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          {/* Total Records Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300 font-mono text-[9.5px] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400/80"></span>
            <span>{totalCount.toLocaleString()}</span>
            <span className="text-slate-500">records</span>
          </div>

          {/* Page Size Selector */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-400 font-mono text-[9.5px] shadow-sm">
            <span className="text-slate-500">Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent text-sky-400 font-bold text-[9.5px] font-mono outline-none cursor-pointer hover:text-sky-300 pr-0.5"
            >
              <option value={5} className="bg-slate-900 text-white">5</option>
              <option value={10} className="bg-slate-900 text-white">10</option>
              <option value={25} className="bg-slate-900 text-white">25</option>
              <option value={50} className="bg-slate-900 text-white">50</option>
              <option value={100} className="bg-slate-900 text-white">100</option>
            </select>
            <span className="text-slate-500">/ page</span>
          </div>
        </div>

        {/* Page Nav Controls */}
        <div className="flex items-center gap-1.5">
          <div className="px-2.5 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300 font-mono text-[9.5px] shadow-sm">
            <span className="text-slate-500">Page</span>{' '}
            <span className="text-sky-300 font-bold">{currentPage}</span>{' '}
            <span className="text-slate-500">of</span>{' '}
            <span>{totalPages}</span>
          </div>

          <div className="flex items-center bg-slate-900/90 rounded-md border border-slate-800 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-sky-500/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer border-r border-slate-800"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-sky-500/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
