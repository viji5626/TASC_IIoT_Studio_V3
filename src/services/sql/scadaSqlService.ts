/**
 * Industrial SCADA SQL Database Connection Service
 * Supports Native Windows Authentication (msnodesqlv8) & Tedious SQL Server Authentication
 * Manages Connection Pooling, Dynamic Database Switching, Real Queries, Data Sources & Manipulators.
 */

import sqlTedious from 'mssql';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
import type {
  ScadaSqlConfig,
  SqlFilter,
  SqlParameterDef,
  SqlPoolStatus,
  SqlTableMetadata,
  SqlQueryOptions,
  SqlDataSource,
  SqlDataManipulator,
} from '../../types/sql';

// Storage file for persistent Data Sources & Manipulators
const CONFIG_FILE_PATH = path.resolve(process.cwd(), 'data', 'sql_scada_config.json');

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.dirname(CONFIG_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Read saved Data Sources & Manipulators
function loadSavedConfig(): { dataSources: SqlDataSource[]; dataManipulators: SqlDataManipulator[] } {
  try {
    ensureDataDir();
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[ScadaSqlService] Error loading saved config:', err);
  }
  return { dataSources: [], dataManipulators: [] };
}

// Write saved Data Sources & Manipulators
function saveConfig(data: { dataSources: SqlDataSource[]; dataManipulators: SqlDataManipulator[] }) {
  try {
    ensureDataDir();
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[ScadaSqlService] Error saving config:', err);
  }
}

export class ScadaSqlService {
  private static instance: ScadaSqlService;

  private config: ScadaSqlConfig = {
    server: 'localhost\\SQLEXPRESS2019',
    database: 'DAIKIN_EMS',
    authType: 'windows_integrated',
    requestTimeoutMs: 30000,
    connectionTimeoutMs: 15000,
    poolMin: 2,
    poolMax: 25,
    encrypt: false,
    trustServerCertificate: true,
  };

  private pool: any = null;
  private isConnected = false;
  private connectingPromise: Promise<any> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionStartTime: Date | null = null;
  private lastPingLatency: number | null = null;
  private activeDriver: 'msnodesqlv8' | 'tedious' = 'msnodesqlv8';

  // In-flight query deduplication cache (500ms TTL)
  private queryCache = new Map<string, { timestamp: number; promise: Promise<any> }>();
  private readonly CACHE_TTL_MS = 500;

  // Saved Data Sources & Manipulators
  private dataSources: Map<string, SqlDataSource> = new Map();
  private dataManipulators: Map<string, SqlDataManipulator> = new Map();

  private constructor() {
    // Load saved Data Sources & Manipulators
    const saved = loadSavedConfig();
    saved.dataSources.forEach((ds) => this.dataSources.set(ds.id, ds));
    saved.dataManipulators.forEach((dm) => this.dataManipulators.set(dm.id, dm));

    // Initialize initial default connection asynchronously
    this.connect().catch((err) => {
      console.warn(`[ScadaSqlService] Initial connection deferred: ${err.message}`);
    });
  }

  public static getInstance(): ScadaSqlService {
    if (!ScadaSqlService.instance) {
      ScadaSqlService.instance = new ScadaSqlService();
    }
    return ScadaSqlService.instance;
  }

  /**
   * Build driver-specific connection config
   */
  private buildDriverConfig(overrideDatabase?: string): any {
    const db = overrideDatabase || this.config.database || 'master';
    const srv = this.config.server || 'localhost\\SQLEXPRESS2019';

    if (this.config.authType === 'windows_integrated') {
      // Use native Windows Authentication with msnodesqlv8
      this.activeDriver = 'msnodesqlv8';
      return {
        server: srv,
        database: db,
        driver: 'msnodesqlv8',
        options: {
          trustedConnection: true,
          trustServerCertificate: this.config.trustServerCertificate ?? true,
          encrypt: this.config.encrypt ?? false,
          requestTimeout: this.config.requestTimeoutMs || 30000,
          connectTimeout: this.config.connectionTimeoutMs || 15000,
        },
        pool: {
          min: this.config.poolMin || 2,
          max: this.config.poolMax || 25,
          idleTimeoutMillis: 30000,
        },
      };
    } else if (this.config.authType === 'windows_ntlm') {
      // Tedious with explicit Windows domain/user/password
      this.activeDriver = 'tedious';
      return {
        server: srv.split('\\')[0],
        port: this.config.port || 1433,
        database: db,
        domain: this.config.domain,
        user: this.config.user,
        password: this.config.password,
        options: {
          instanceName: srv.includes('\\') ? srv.split('\\')[1] : undefined,
          encrypt: this.config.encrypt ?? false,
          trustServerCertificate: this.config.trustServerCertificate ?? true,
          requestTimeout: this.config.requestTimeoutMs || 30000,
          connectTimeout: this.config.connectionTimeoutMs || 15000,
        },
        pool: {
          min: this.config.poolMin || 2,
          max: this.config.poolMax || 25,
          idleTimeoutMillis: 30000,
        },
      };
    } else {
      // SQL Server Authentication (user & password)
      this.activeDriver = 'tedious';
      return {
        server: srv.split('\\')[0],
        port: this.config.port || 1433,
        database: db,
        user: this.config.user,
        password: this.config.password,
        options: {
          instanceName: srv.includes('\\') ? srv.split('\\')[1] : undefined,
          encrypt: this.config.encrypt ?? false,
          trustServerCertificate: this.config.trustServerCertificate ?? true,
          requestTimeout: this.config.requestTimeoutMs || 30000,
          connectTimeout: this.config.connectionTimeoutMs || 15000,
        },
        pool: {
          min: this.config.poolMin || 2,
          max: this.config.poolMax || 25,
          idleTimeoutMillis: 30000,
        },
      };
    }
  }

  /**
   * Connect or Reconnect to SQL Server
   */
  public async connect(): Promise<any> {
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    if (this.pool) {
      try {
        await this.pool.close();
      } catch (e) {
        // ignore close error
      }
      this.pool = null;
    }

    this.connectingPromise = (async () => {
      try {
        const connConfig = this.buildDriverConfig();
        console.log(`[ScadaSqlService] Connecting to SQL Server: ${connConfig.server}, DB: ${connConfig.database}, Driver: ${this.activeDriver}...`);

        let sqlModule: any;
        if (this.activeDriver === 'msnodesqlv8') {
          // Dynamic require msnodesqlv8 driver
          sqlModule = require('mssql/msnodesqlv8');
        } else {
          sqlModule = sqlTedious;
        }

        const poolInstance = new sqlModule.ConnectionPool(connConfig);

        poolInstance.on('error', (err: any) => {
          console.error('[ScadaSqlService] Connection Pool Event Error:', err);
          this.handleDisconnect();
        });

        const startTime = Date.now();
        await poolInstance.connect();
        this.lastPingLatency = Date.now() - startTime;

        this.pool = poolInstance;
        this.isConnected = true;
        this.connectionStartTime = new Date();

        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        console.log(`[ScadaSqlService] Connected successfully to SQL Server in ${this.lastPingLatency}ms!`);
        return this.pool;
      } catch (err: any) {
        this.isConnected = false;
        this.pool = null;
        console.error(`[ScadaSqlService] Connection error: ${err.message}`);
        this.scheduleAutoReconnect();
        throw err;
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  private handleDisconnect() {
    this.isConnected = false;
    this.scheduleAutoReconnect();
  }

  private scheduleAutoReconnect() {
    if (this.reconnectTimer) return;
    console.log('[ScadaSqlService] Auto-reconnection loop scheduled (every 10s)...');
    this.reconnectTimer = setInterval(async () => {
      if (!this.isConnected) {
        try {
          console.log('[ScadaSqlService] Attempting scheduled reconnection...');
          await this.connect();
        } catch (e) {
          // Will retry on next interval
        }
      }
    }, 10000);
  }

  /**
   * Update configuration & reconnect immediately
   */
  public async configure(newConfig: Partial<ScadaSqlConfig>): Promise<SqlPoolStatus> {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    try {
      await this.connect();
    } catch (err) {
      // Return status even if connection failed so UI receives the error
    }
    return this.getStatus();
  }

  /**
   * Test a specific connection configuration without affecting current pool
   */
  public async testConnection(testCfg: Partial<ScadaSqlConfig>): Promise<{ success: boolean; latencyMs?: number; version?: string; error?: string }> {
    const merged: ScadaSqlConfig = {
      ...this.config,
      ...testCfg,
    };

    const srv = merged.server || 'localhost\\SQLEXPRESS2019';
    const db = merged.database || 'master';
    const startTime = Date.now();

    try {
      let pool: any;
      if (merged.authType === 'windows_integrated') {
        const sqlMv8 = require('mssql/msnodesqlv8');
        pool = new sqlMv8.ConnectionPool({
          server: srv,
          database: db,
          driver: 'msnodesqlv8',
          options: {
            trustedConnection: true,
            trustServerCertificate: true,
            requestTimeout: 10000,
            connectTimeout: 8000,
          },
        });
      } else {
        pool = new sqlTedious.ConnectionPool({
          server: srv.split('\\')[0],
          port: merged.port || 1433,
          database: db,
          domain: merged.domain,
          user: merged.user,
          password: merged.password,
          options: {
            instanceName: srv.includes('\\') ? srv.split('\\')[1] : undefined,
            encrypt: false,
            trustServerCertificate: true,
            requestTimeout: 10000,
            connectTimeout: 8000,
          },
        });
      }

      await pool.connect();
      const res = await pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS currentDb');
      const latencyMs = Date.now() - startTime;
      const version = res.recordset[0]?.version?.split('\n')[0] || 'Microsoft SQL Server';
      await pool.close();

      return { success: true, latencyMs, version };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: err.message || 'Connection failed',
      };
    }
  }

  /**
   * Get Pool Status & Metrics
   */
  public async getStatus(): Promise<SqlPoolStatus> {
    let poolSize = 0;
    let availableConnections = 0;
    let pendingRequests = 0;

    if (this.isConnected && this.pool) {
      try {
        poolSize = this.pool.size || (this.pool._pool?.size ?? 1);
        availableConnections = this.pool.available || (this.pool._pool?.available ?? 1);
        pendingRequests = this.pool.pending || (this.pool._pool?.pending ?? 0);
      } catch (e) {
        poolSize = 1;
        availableConnections = 1;
      }
    }

    const uptimeSeconds = this.connectionStartTime
      ? Math.floor((Date.now() - this.connectionStartTime.getTime()) / 1000)
      : 0;

    return {
      connected: this.isConnected,
      server: this.config.server,
      database: this.config.database,
      authType: this.config.authType,
      driver: this.activeDriver,
      poolSize,
      availableConnections,
      pendingRequests,
      uptimeSeconds,
      lastPingLatencyMs: this.lastPingLatency,
    };
  }

  /**
   * Get all databases accessible on the SQL Server
   */
  public async getDatabases(): Promise<string[]> {
    if (!this.isConnected || !this.pool) {
      await this.connect();
    }

    const res = await this.pool.request().query(
      "SELECT name FROM sys.databases WHERE state_desc = 'ONLINE' ORDER BY name ASC"
    );

    return res.recordset.map((r: any) => r.name);
  }

  /**
   * Get all user tables and views in a database
   */
  public async getTables(database?: string): Promise<SqlTableMetadata[]> {
    const targetDb = database || this.config.database;
    if (!this.isConnected || !this.pool) {
      await this.connect();
    }

    // Query INFORMATION_SCHEMA for tables in the specified database
    const dbPrefix = targetDb ? `[${targetDb.replace(/\]/g, '')}].` : '';
    const sql = `
      SELECT 
        TABLE_SCHEMA AS [schema], 
        TABLE_NAME AS [name], 
        TABLE_TYPE AS [type]
      FROM ${dbPrefix}INFORMATION_SCHEMA.TABLES
      ORDER BY TABLE_TYPE, TABLE_SCHEMA, TABLE_NAME ASC
    `;

    const res = await this.pool.request().query(sql);

    return res.recordset.map((r: any) => ({
      schema: r.schema,
      name: r.name,
      type: r.type === 'VIEW' ? 'VIEW' : 'TABLE',
    }));
  }

  /**
   * Execute real SQL query (Custom SQL or Table query)
   */
  public async executeQuery(options: SqlQueryOptions): Promise<{
    data: any[];
    totalCount: number;
    page: number;
    limit: number;
    latencyMs: number;
    columns: string[];
  }> {
    const cacheKey = JSON.stringify(options);
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.promise;
    }

    const queryPromise = (async () => {
      const startTime = Date.now();

      let effectiveOptions = { ...options };
      if (effectiveOptions.dataSourceId && !effectiveOptions.table && !effectiveOptions.customQuery) {
        const savedSource = this.dataSources.get(effectiveOptions.dataSourceId);
        if (savedSource) {
          effectiveOptions.database = savedSource.database || effectiveOptions.database;
          effectiveOptions.table = savedSource.table || effectiveOptions.table;
          effectiveOptions.schema = savedSource.schema || effectiveOptions.schema;
          effectiveOptions.customQuery = savedSource.customQuery || effectiveOptions.customQuery;
        }
      }

      if (!this.isConnected || !this.pool) {
        await this.connect();
      }

      const targetDb = effectiveOptions.database || this.config.database;
      const req = this.pool.request();

      // If database switch is needed:
      if (targetDb && targetDb !== this.config.database) {
        await req.query(`USE [${targetDb.replace(/\]/g, '')}]`);
      }

      let data: any[] = [];
      let totalCount = 0;
      let columns: string[] = [];

      if (effectiveOptions.customQuery && effectiveOptions.customQuery.trim().length > 0) {
        // Direct custom query execution (sanitize any schema typo like dbol -> dbo)
        let q = effectiveOptions.customQuery.replace(/\bdbol\b/gi, 'dbo');
        const res = await req.query(q);
        data = res.recordset || [];
        totalCount = data.length;
        if (data.length > 0) {
          columns = Object.keys(data[0]);
        }
      } else if (effectiveOptions.table) {
        // Table / View query with optional pagination, columns, sorting, filters
        const page = effectiveOptions.page && effectiveOptions.page > 0 ? effectiveOptions.page : 1;
        const limit = effectiveOptions.limit && effectiveOptions.limit > 0 ? effectiveOptions.limit : 50;
        const offset = (page - 1) * limit;

        let rawTable = (effectiveOptions.table || '').trim();
        let schema = (effectiveOptions.schema || 'dbo').trim().replace(/[\[\]]/g, '');

        // Remove any bracket wrapping from table string: "[dbo].[Order Details]" or "[Order Details]"
        rawTable = rawTable.replace(/^\[+|\]+$/g, '').trim();

        // If table string has schema prefix (e.g. "dbo.Order Details")
        let tableName = rawTable;
        if (rawTable.includes('.')) {
          const parts = rawTable.split('.');
          schema = parts[0].replace(/[\[\]]/g, '').trim() || 'dbo';
          tableName = parts.slice(1).join('.').replace(/[\[\]]/g, '').trim();
        }

        if (!schema || schema.toLowerCase() === 'dbol') schema = 'dbo';

        // Verify identifier safety (supports spaces, alphanumeric, underscores, hyphens, and hashes)
        const isSafeIdent = (str: string) => /^[a-zA-Z0-9_#$ \-\(\)]+$/.test(str) && !str.includes('--') && !str.includes('/*');
        if (!isSafeIdent(schema) || !isSafeIdent(tableName)) {
          throw new Error(`Invalid table or schema name: ${schema}.${tableName}`);
        }

        const fullTable = `[${schema.replace(/\]/g, '')}].[${tableName.replace(/\]/g, '')}]`;

        // Build WHERE clause with parameterized values
        const whereClauses: string[] = [];
        if (options.filters && options.filters.length > 0) {
          options.filters.forEach((f, idx) => {
            if (!isSafeIdent(f.column)) return;
            const paramName = `p_flt_${idx}`;
            const op = f.op || f.operator || 'eq';

            switch (op) {
              case 'eq':
                whereClauses.push(`[${f.column}] = @${paramName}`);
                req.input(paramName, f.value);
                break;
              case 'neq':
                whereClauses.push(`[${f.column}] <> @${paramName}`);
                req.input(paramName, f.value);
                break;
              case 'gt':
                whereClauses.push(`[${f.column}] > @${paramName}`);
                req.input(paramName, f.value);
                break;
              case 'gte':
                whereClauses.push(`[${f.column}] >= @${paramName}`);
                req.input(paramName, f.value);
                break;
              case 'lt':
                whereClauses.push(`[${f.column}] < @${paramName}`);
                req.input(paramName, f.value);
                break;
              case 'lte':
                whereClauses.push(`[${f.column}] <= @${paramName}`);
                req.input(paramName, f.value);
                break;
              case 'like':
                whereClauses.push(`[${f.column}] LIKE @${paramName}`);
                req.input(paramName, `%${f.value}%`);
                break;
              case 'isNull':
              case 'is_null':
                whereClauses.push(`[${f.column}] IS NULL`);
                break;
              case 'isNotNull':
              case 'is_not_null':
                whereClauses.push(`[${f.column}] IS NOT NULL`);
                break;
            }
          });
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Count total rows
        const countRes = await req.query(`SELECT COUNT(*) AS total FROM ${fullTable} ${whereSql}`);
        totalCount = countRes.recordset[0]?.total ?? 0;

        // Selected columns
        const colSql =
          options.columns && options.columns.length > 0
            ? options.columns.map((c) => (isSafeIdent(c) ? `[${c.replace(/\]/g, '')}]` : c)).join(', ')
            : '*';

        // Order By
        let orderSql = '';
        if (options.sortBy && isSafeIdent(options.sortBy)) {
          const dir = (options.sortDir || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          orderSql = `ORDER BY [${options.sortBy.replace(/\]/g, '')}] ${dir}`;
        } else if (options.orderBy && options.orderBy.length > 0) {
          const parts = options.orderBy
            .filter((o) => isSafeIdent(o.column))
            .map((o) => `[${o.column.replace(/\]/g, '')}] ${o.direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`);
          if (parts.length > 0) orderSql = `ORDER BY ${parts.join(', ')}`;
        }

        if (!orderSql) {
          orderSql = 'ORDER BY (SELECT NULL)';
        }

        // Pagination query
        const dataSql = `
          SELECT ${colSql}
          FROM ${fullTable}
          ${whereSql}
          ${orderSql}
          OFFSET ${offset} ROWS
          FETCH NEXT ${limit} ROWS ONLY
        `;

        const dataRes = await req.query(dataSql);
        data = dataRes.recordset || [];
        if (data.length > 0) {
          columns = Object.keys(data[0]);
        }
      } else {
        throw new Error('Either table name or customQuery must be provided');
      }

      const latencyMs = Date.now() - startTime;
      return {
        data,
        totalCount,
        page: options.page || 1,
        limit: options.limit || data.length,
        latencyMs,
        columns,
      };
    })();

    this.queryCache.set(cacheKey, { timestamp: Date.now(), promise: queryPromise });
    return queryPromise;
  }

  /**
   * Execute Stored Procedure or Parameterized Query (Data Manipulator)
   */
  public async executeManipulator(options: {
    database?: string;
    type: 'procedure' | 'query';
    procedureName?: string;
    sql?: string;
    parameters?: SqlParameterDef[];
  }): Promise<{
    success: boolean;
    rowsAffected: number;
    returnValue?: any;
    outputParameters?: Record<string, any>;
    recordsets?: any[];
    latencyMs: number;
  }> {
    const startTime = Date.now();

    if (!this.isConnected || !this.pool) {
      await this.connect();
    }

    const targetDb = options.database || this.config.database;
    const req = this.pool.request();

    if (targetDb && targetDb !== this.config.database) {
      await req.query(`USE [${targetDb.replace(/\]/g, '')}]`);
    }

    // Attach parameters
    if (options.parameters && options.parameters.length > 0) {
      options.parameters.forEach((p) => {
        const cleanName = p.name.replace(/^@/, '');
        if (p.isOutput || p.direction === 'output') {
          req.output(cleanName, undefined, p.value);
        } else {
          req.input(cleanName, p.value ?? p.defaultValue);
        }
      });
    }

    if (options.type === 'procedure') {
      if (!options.procedureName) throw new Error('procedureName is required for procedure execution');
      const res = await req.execute(options.procedureName);
      const latencyMs = Date.now() - startTime;

      const rowsAffected = Array.isArray(res.rowsAffected)
        ? res.rowsAffected.reduce((a: number, b: number) => a + b, 0)
        : res.rowsAffected || 0;

      return {
        success: true,
        rowsAffected,
        returnValue: res.returnValue,
        outputParameters: res.output,
        recordsets: res.recordsets,
        latencyMs,
      };
    } else {
      if (!options.sql) throw new Error('sql command is required for query execution');
      const res = await req.query(options.sql);
      const latencyMs = Date.now() - startTime;

      const rowsAffected = Array.isArray(res.rowsAffected)
        ? res.rowsAffected.reduce((a: number, b: number) => a + b, 0)
        : res.rowsAffected || 0;

      return {
        success: true,
        rowsAffected,
        recordsets: res.recordsets,
        latencyMs,
      };
    }
  }

  // ----------------------------------------------------
  // SQL Data Sources CRUD
  // ----------------------------------------------------

  public getDataSources(): SqlDataSource[] {
    return Array.from(this.dataSources.values());
  }

  public getDataSource(id: string): SqlDataSource | undefined {
    return this.dataSources.get(id);
  }

  public saveDataSource(ds: Partial<SqlDataSource> & { name: string }): SqlDataSource {
    const id = ds.id || `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const fullDs: SqlDataSource = {
      id,
      name: ds.name,
      description: ds.description || '',
      database: ds.database || this.config.database || 'DAIKIN_EMS',
      mode: ds.mode || (ds.customQuery ? 'query' : 'table'),
      table: ds.table,
      schema: ds.schema || 'dbo',
      customQuery: ds.customQuery,
      pollIntervalMs: ds.pollIntervalMs || 3000,
      columns: ds.columns || [],
      thresholdRules: ds.thresholdRules || [],
      createdAt: ds.createdAt || now,
      updatedAt: now,
    };

    this.dataSources.set(id, fullDs);
    this.persistConfig();
    return fullDs;
  }

  public deleteDataSource(id: string): boolean {
    const res = this.dataSources.delete(id);
    if (res) this.persistConfig();
    return res;
  }

  // ----------------------------------------------------
  // SQL Data Manipulators CRUD
  // ----------------------------------------------------

  public getDataManipulators(): SqlDataManipulator[] {
    return Array.from(this.dataManipulators.values());
  }

  public getDataManipulator(id: string): SqlDataManipulator | undefined {
    return this.dataManipulators.get(id);
  }

  public saveDataManipulator(dm: Partial<SqlDataManipulator> & { name: string }): SqlDataManipulator {
    const id = dm.id || `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const fullDm: SqlDataManipulator = {
      id,
      name: dm.name,
      description: dm.description || '',
      database: dm.database || this.config.database || 'DAIKIN_EMS',
      type: dm.type || 'procedure',
      procedureName: dm.procedureName,
      sql: dm.sql,
      parameters: dm.parameters || [],
      createdAt: dm.createdAt || now,
      updatedAt: now,
    };

    this.dataManipulators.set(id, fullDm);
    this.persistConfig();
    return fullDm;
  }

  public deleteDataManipulator(id: string): boolean {
    const res = this.dataManipulators.delete(id);
    if (res) this.persistConfig();
    return res;
  }

  private persistConfig() {
    saveConfig({
      dataSources: Array.from(this.dataSources.values()),
      dataManipulators: Array.from(this.dataManipulators.values()),
    });
  }
}

export const scadaSqlService = ScadaSqlService.getInstance();
