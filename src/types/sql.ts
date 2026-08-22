/**
 * SCADA SQL Database Connectivity & TASCGrid Type Definitions
 */

import type React from 'react';

export type SqlAuthType = 'windows_integrated' | 'windows_ntlm' | 'sql_server';

export interface ScadaSqlConfig {
  server: string;                   // e.g. 'localhost\\SQLEXPRESS2019' or 'localhost'
  port?: number;                    // Default: 1433 (if not using named instance)
  database: string;                 // e.g. 'DAIKIN_EMS' or 'master'
  authType: SqlAuthType;
  // For Windows NTLM or SQL Server Auth:
  user?: string;
  password?: string;
  domain?: string;
  // Connection Pool & Timeout options:
  requestTimeoutMs?: number;        // Default: 30000 (30 seconds)
  connectionTimeoutMs?: number;     // Default: 15000 (15 seconds)
  poolMin?: number;                 // Default: 2
  poolMax?: number;                 // Default: 25
  encrypt?: boolean;                // Default: false (for local / intranet SCADA)
  trustServerCertificate?: boolean; // Default: true
}

export type SqlFilterOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'in'
  | 'between'
  | 'isNull'
  | 'isNotNull'
  | 'is_null'
  | 'is_not_null';

export interface SqlFilter {
  column: string;
  op?: SqlFilterOp;
  operator?: SqlFilterOp;
  value?: any;
}

export interface SqlOrderBy {
  column: string;
  direction: 'ASC' | 'DESC' | 'asc' | 'desc';
}

export interface SqlQueryOptions {
  dataSourceId?: string;
  database?: string;
  table?: string;
  schema?: string;
  customQuery?: string;
  columns?: string[];
  filters?: SqlFilter[];
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  orderBy?: SqlOrderBy[];
  page?: number;
  limit?: number;
}

export type SqlDataType =
  | 'int'
  | 'bigint'
  | 'smallint'
  | 'tinyint'
  | 'float'
  | 'decimal'
  | 'varchar'
  | 'nvarchar'
  | 'bit'
  | 'datetime'
  | 'date'
  | 'time';

export interface SqlParameterDef {
  name: string;
  type?: SqlDataType;
  value?: any;
  defaultValue?: any;
  isOutput?: boolean;
  direction?: 'input' | 'output';
  description?: string;
}

export interface SqlPoolStatus {
  connected: boolean;
  server: string;
  database: string;
  authType: SqlAuthType;
  driver?: string;
  poolSize: number;
  availableConnections: number;
  pendingRequests: number;
  uptimeSeconds: number;
  lastPingLatencyMs: number | null;
  error?: string | null;
}

export interface SqlTableMetadata {
  schema: string;
  name: string;
  type: 'TABLE' | 'VIEW';
  rowCount?: number;
}

// ----------------------------------------------------
// SQL Data Source & Data Manipulator Definitions
// ----------------------------------------------------

export interface SqlDataSource {
  id: string;
  name: string;
  description?: string;
  database: string;                 // Target database (e.g. 'DAIKIN_EMS')
  mode: 'table' | 'query';          // Direct table vs custom SQL
  table?: string;                   // e.g. 'MeterName'
  schema?: string;                  // e.g. 'dbo'
  customQuery?: string;             // e.g. 'SELECT TOP 100 * FROM dbo.MeterName WHERE ...'
  pollIntervalMs: number;           // Default 3000ms
  columns?: TASCGridColumn[];
  thresholdRules?: TASCGridThresholdRule[];
  createdAt: string;
  updatedAt: string;
}

export interface SqlDataManipulator {
  id: string;
  name: string;
  description?: string;
  database: string;                 // Target database
  type: 'procedure' | 'query';      // Stored procedure vs parameterized UPDATE/INSERT/DELETE
  procedureName?: string;           // e.g. 'sp_ResetShiftMeter'
  sql?: string;                     // e.g. 'UPDATE dbo.MeterName SET Status = @status WHERE MeterID = @id'
  parameters: SqlParameterDef[];
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// SCADA Process Point & Tag Types
// ----------------------------------------------------

export type TagQuality = 'GOOD' | 'BAD' | 'UNCERTAIN' | 'COMM_FAILURE';

export interface UseSqlTagOptions<T = any> {
  database?: string;
  pollIntervalMs?: number;          // Default: 2000ms
  autoPoll?: boolean;               // Default: true
  schema?: string;                  // Default: 'dbo'
  filters?: SqlFilter[];            // Optional filter on the query
  defaultValue?: T;
  transform?: (rawValue: any) => T; // Optional transform function
}

export interface UseSqlTagResult<T = any> {
  value: T | undefined;
  isLoading: boolean;
  quality: TagQuality;
  timestamp: Date | null;
  error: string | null;
  rawRecord: Record<string, any> | null;
  refetch: () => Promise<void>;
  updateValue: (newValue: any) => Promise<boolean>;
}

// ----------------------------------------------------
// TASCGrid Component Configuration Types
// ----------------------------------------------------

export type TASCGridColumnType = 'string' | 'number' | 'date' | 'boolean' | 'badge';

export interface TASCGridColumn {
  field: string;
  headerName: string;
  type?: TASCGridColumnType;
  width?: string | number;
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'center' | 'right';
  decimals?: number;                // For number formatting
  unit?: string;                    // e.g. "°C", "bar", "RPM", "kW"
  dateFormat?: string;              // Date formatting string
  renderCell?: (value: any, row: Record<string, any>) => React.ReactNode;
}

export type ThresholdSeverity = 'normal' | 'info' | 'warning' | 'critical';

export interface TASCGridThresholdRule {
  column: string;
  condition: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'between';
  value: any;
  severity?: ThresholdSeverity;
  bgClass?: string;                 // e.g. 'bg-amber-950/30' or 'bg-rose-950/40'
  textClass?: string;               // e.g. 'text-amber-400' or 'text-rose-400'
  badgeLabel?: string;              // e.g. 'WARN' or 'CRITICAL'
  pulse?: boolean;                  // Pulsing indicator for active alarms
}

export interface TASCGridAction {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  onClick: (row: Record<string, any>) => void | Promise<void>;
  hidden?: (row: Record<string, any>) => boolean;
}

export interface TASCGridTabConfig {
  id: string;
  name: string;                     // e.g. "Meter Name", "Daily Energy", "Shift Records"
  dataSourceId?: string;            // Reference to saved DataSource
  mode?: 'table' | 'custom_query' | 'source';
  database: string;                 // Target database (e.g. 'DAIKIN_EMS')
  table?: string;                   // e.g. 'MeterName'
  schema?: string;                  // e.g. 'dbo'
  customQuery?: string;
  pollIntervalMs?: number;
  pageSize?: number;
  columns?: TASCGridColumn[];
  thresholdRules?: TASCGridThresholdRule[];
  manipulatorIds?: string[];
}

export interface TASCGridProps {
  // Multiple Data Source Tabs
  tabs?: TASCGridTabConfig[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;

  // Single Data Source Settings (fallback when no tabs)
  dataSourceId?: string;            // Reference to a saved SqlDataSource
  database?: string;                // Target database (e.g. 'DAIKIN_EMS')
  table?: string;
  schema?: string;
  customQuery?: string;
  title?: string;
  endpoint?: string;                // Default: '/api/scada-sql/query'
  manipulatorEndpoint?: string;     // Default: '/api/scada-sql/execute'
  pollIntervalMs?: number;          // Default: 3000ms (0 to disable auto-polling)
  columns?: TASCGridColumn[];       // Auto-inferred if omitted
  thresholdRules?: TASCGridThresholdRule[];
  initialFilters?: SqlFilter[];
  pageSize?: number;                // Default: 10
  
  // Visual & Behavior Options
  className?: string;
  height?: string | number;
  isCompact?: boolean;
  isHmiMode?: boolean;
  showToolbar?: boolean;            // Default: true
  showSearch?: boolean;             // Default: true
  showExport?: boolean;             // Default: true
  showRefresh?: boolean;            // Default: true
  showStatusPill?: boolean;         // Default: true
  
  // Linked Manipulators
  manipulatorIds?: string[];
  
  // Event Callbacks
  onRowClick?: (row: Record<string, any>) => void;
  actions?: TASCGridAction[];
  onEdit?: () => void;
}
