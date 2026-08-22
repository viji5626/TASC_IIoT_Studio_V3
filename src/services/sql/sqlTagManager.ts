/**
 * Client-Side SQL Tag Polling Coordinator & Batching Manager
 * 
 * Groups multiple tag subscriptions by table/interval into a single consolidated HTTP polling cycle.
 * Automatically pauses polling when the browser tab is hidden and resumes when focused.
 */

import { TagQuality, SqlFilter, SqlParameterDef } from '../../types/sql';

export interface ParsedTagPath {
  raw: string;
  schema: string;
  table: string;
  rowIndex: number;
  column: string;
}

export interface TagDataSnapshot {
  value: any;
  quality: TagQuality;
  rawRecord: Record<string, any> | null;
  timestamp: Date | null;
  error: string | null;
}

export type TagUpdateCallback = (snapshot: TagDataSnapshot) => void;

interface Subscription {
  id: string;
  parsedPath: ParsedTagPath;
  filters?: SqlFilter[];
  pollIntervalMs: number;
  callback: TagUpdateCallback;
  transform?: (val: any) => any;
  lastSnapshot?: TagDataSnapshot;
}

interface TablePollingGroup {
  groupKey: string;
  table: string;
  schema: string;
  pollIntervalMs: number;
  filters?: SqlFilter[];
  timerId: number | null;
  subscriptions: Map<string, Subscription>;
  isFetching: boolean;
  lastFetchTime: number;
  latestRecords: any[];
  latestTotalCount: number;
  lastError: string | null;
}

export class SqlTagManager {
  private static instance: SqlTagManager;
  private groups: Map<string, TablePollingGroup> = new Map();
  private subCounter = 0;
  private isTabVisible = true;
  private baseQueryEndpoint = '/api/scada-sql/query';
  private baseExecuteEndpoint = '/api/scada-sql/execute';

  private constructor() {
    if (typeof document !== 'undefined') {
      this.isTabVisible = !document.hidden;
      document.addEventListener('visibilitychange', () => {
        const visible = !document.hidden;
        this.isTabVisible = visible;
        if (visible) {
          // Tab became visible again - trigger immediate refresh for all active groups
          this.groups.forEach((group) => {
            if (group.subscriptions.size > 0) {
              this.fetchGroupData(group);
              this.startGroupTimer(group);
            }
          });
        } else {
          // Tab hidden - stop polling timers to save resources
          this.groups.forEach((group) => this.stopGroupTimer(group));
        }
      });
    }
  }

  public static getInstance(): SqlTagManager {
    if (!SqlTagManager.instance) {
      SqlTagManager.instance = new SqlTagManager();
    }
    return SqlTagManager.instance;
  }

  /**
   * Parses SCADA tag paths such as:
   * - "db.Sensors[0].ActualTemp"
   * - "dbo.Sensors[0].ActualTemp"
   * - "Sensors[0].ActualTemp"
   * - "Sensors.ActualTemp" (defaults to row 0)
   * - "db.Sensors.ActualTemp"
   */
  public parseTagPath(pathStr: string, defaultSchema = 'dbo'): ParsedTagPath {
    const clean = (pathStr || '').trim();
    let schema = defaultSchema;
    let table = '';
    let rowIndex = 0;
    let column = '';

    // Regex pattern matching: [db/schema.]tableName[index].columnName
    // or [db/schema.]tableName.columnName
    const bracketMatch = clean.match(/^(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+)\[(\d+)\]\.([a-zA-Z0-9_]+)$/);
    if (bracketMatch) {
      const prefix = bracketMatch[1];
      if (prefix && prefix.toLowerCase() !== 'db') {
        schema = prefix;
      }
      table = bracketMatch[2];
      rowIndex = parseInt(bracketMatch[3], 10);
      column = bracketMatch[4];
    } else {
      const dotMatch = clean.match(/^(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/);
      if (dotMatch) {
        const first = dotMatch[1];
        if (first && first.toLowerCase() === 'db') {
          table = dotMatch[2];
          column = dotMatch[3];
        } else if (first) {
          schema = first;
          table = dotMatch[2];
          column = dotMatch[3];
        } else {
          table = dotMatch[2];
          column = dotMatch[3];
        }
      } else {
        // Fallback for simple "Column"
        table = 'default';
        column = clean;
      }
    }

    return {
      raw: clean,
      schema,
      table,
      rowIndex,
      column,
    };
  }

  /**
   * Registers a tag subscription and starts batch polling if needed.
   * Returns an unsubscribe function.
   */
  public subscribe(
    tagPath: string,
    options: {
      pollIntervalMs?: number;
      autoPoll?: boolean;
      schema?: string;
      filters?: SqlFilter[];
      transform?: (val: any) => any;
    } = {},
    callback: TagUpdateCallback
  ): () => void {
    const subId = `sub_${++this.subCounter}_${Date.now()}`;
    const parsedPath = this.parseTagPath(tagPath, options.schema || 'dbo');
    const interval = Math.max(500, options.pollIntervalMs || 2000);
    const autoPoll = options.autoPoll !== false;

    const groupKey = `${parsedPath.schema}.${parsedPath.table}:${JSON.stringify(options.filters || [])}:${interval}`;

    let group = this.groups.get(groupKey);
    if (!group) {
      group = {
        groupKey,
        table: parsedPath.table,
        schema: parsedPath.schema,
        pollIntervalMs: interval,
        filters: options.filters,
        timerId: null,
        subscriptions: new Map(),
        isFetching: false,
        lastFetchTime: 0,
        latestRecords: [],
        latestTotalCount: 0,
        lastError: null,
      };
      this.groups.set(groupKey, group);
    }

    const subscription: Subscription = {
      id: subId,
      parsedPath,
      filters: options.filters,
      pollIntervalMs: interval,
      callback,
      transform: options.transform,
    };

    group.subscriptions.set(subId, subscription);

    // Initial fetch and start timer if autoPoll is enabled
    if (autoPoll) {
      if (group.latestRecords.length > 0 && Date.now() - group.lastFetchTime < 1000) {
        // Reuse recent cache immediately
        this.notifySubscription(subscription, group.latestRecords, group.lastError);
      } else {
        this.fetchGroupData(group);
      }

      if (this.isTabVisible && !group.timerId) {
        this.startGroupTimer(group);
      }
    }

    return () => {
      this.unsubscribe(groupKey, subId);
    };
  }

  private unsubscribe(groupKey: string, subId: string): void {
    const group = this.groups.get(groupKey);
    if (!group) return;

    group.subscriptions.delete(subId);

    if (group.subscriptions.size === 0) {
      this.stopGroupTimer(group);
      this.groups.delete(groupKey);
    }
  }

  private startGroupTimer(group: TablePollingGroup): void {
    this.stopGroupTimer(group);
    group.timerId = window.setInterval(() => {
      if (this.isTabVisible) {
        this.fetchGroupData(group);
      }
    }, group.pollIntervalMs);
  }

  private stopGroupTimer(group: TablePollingGroup): void {
    if (group.timerId !== null) {
      clearInterval(group.timerId);
      group.timerId = null;
    }
  }

  /**
   * Executes a single batched HTTP query for the table group
   */
  public async fetchGroupData(group: TablePollingGroup): Promise<void> {
    if (group.isFetching || !group.table) return;

    group.isFetching = true;
    try {
      const params = new URLSearchParams({
        table: group.table,
        schema: group.schema,
        limit: '100',
        page: '1',
      });

      if (group.filters && group.filters.length > 0) {
        params.set('filters', JSON.stringify(group.filters));
      }

      const res = await fetch(`${this.baseQueryEndpoint}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (!json.success && json.error) {
        throw new Error(json.error);
      }

      group.latestRecords = json.data || [];
      group.latestTotalCount = json.totalCount || group.latestRecords.length;
      group.lastError = null;
      group.lastFetchTime = Date.now();

      // Dispatch to all subscribers in this group
      group.subscriptions.forEach((sub) => {
        this.notifySubscription(sub, group.latestRecords, null);
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Polling error';
      group.lastError = errorMsg;
      group.subscriptions.forEach((sub) => {
        this.notifySubscription(sub, [], errorMsg);
      });
    } finally {
      group.isFetching = false;
    }
  }

  /**
   * Evaluates parsed path against records and invokes subscription callback safely
   */
  private notifySubscription(sub: Subscription, records: any[], error: string | null): void {
    const { parsedPath, transform } = sub;
    const now = new Date();

    if (error) {
      sub.callback({
        value: undefined,
        quality: 'COMM_FAILURE',
        rawRecord: null,
        timestamp: now,
        error,
      });
      return;
    }

    if (!records || records.length === 0) {
      sub.callback({
        value: undefined,
        quality: 'BAD',
        rawRecord: null,
        timestamp: now,
        error: 'Table returned no records',
      });
      return;
    }

    const row = records[parsedPath.rowIndex];
    if (!row) {
      sub.callback({
        value: undefined,
        quality: 'BAD',
        rawRecord: null,
        timestamp: now,
        error: `Row index [${parsedPath.rowIndex}] out of bounds (total rows: ${records.length})`,
      });
      return;
    }

    const rawVal = row[parsedPath.column];
    if (rawVal === undefined) {
      sub.callback({
        value: undefined,
        quality: 'BAD',
        rawRecord: row,
        timestamp: now,
        error: `Column "${parsedPath.column}" not found in row`,
      });
      return;
    }

    let finalValue = rawVal;
    if (typeof transform === 'function') {
      try {
        finalValue = transform(rawVal);
      } catch (tErr: any) {
        console.warn(`[SqlTagManager] Transform error for ${parsedPath.raw}:`, tErr);
      }
    }

    sub.callback({
      value: finalValue,
      quality: 'GOOD',
      rawRecord: row,
      timestamp: now,
      error: null,
    });
  }

  /**
   * Writes back a new value to the SQL database using Data Manipulator endpoint
   */
  public async writeTagValue(
    tagPath: string,
    newValue: any,
    keyColumn = 'id',
    options?: { schema?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const parsed = this.parseTagPath(tagPath, options?.schema || 'dbo');

    try {
      const fullTable = `[${parsed.schema}].[${parsed.table}]`;
      const updateSql = `UPDATE ${fullTable} SET [${parsed.column}] = @val WHERE [${keyColumn}] = @key`;

      const params: SqlParameterDef[] = [
        { name: 'val', value: newValue },
        { name: 'key', value: parsed.rowIndex + 1 }, // default 1-indexed key fallback
      ];

      const res = await fetch(this.baseExecuteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'query',
          sql: updateSql,
          params,
        }),
      });

      const json = await res.json();
      return { success: json.success, error: json.error };
    } catch (err: any) {
      return { success: false, error: err.message || 'Write failed' };
    }
  }
}

export const sqlTagManager = SqlTagManager.getInstance();
