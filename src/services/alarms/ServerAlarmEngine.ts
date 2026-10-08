import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
// @ts-ignore - node:sqlite is natively available in Node.js 22.5+
import { DatabaseSync } from 'node:sqlite';
import { ServerSmsEngine } from '../sms/ServerSmsEngine';
import { ServerAlarmEmailEngine } from './ServerAlarmEmailEngine';

export type AlarmSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlarmCategory = 'HH' | 'H' | 'L' | 'LL' | 'ROC' | 'TRIP' | 'FAULT';
export type AlarmStatus = 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'RESOLVED_UNACK' | 'RESOLVED_ACK';

export interface TagAlarmConfig {
  tagId: string;
  enabled?: boolean;
  highHigh?: number;      // Critical upper threshold (HH)
  high?: number;          // Warning upper threshold (H)
  low?: number;           // Warning lower threshold (L)
  lowLow?: number;        // Critical lower threshold (LL)
  rateOfChange?: number;  // Max allowed rate-of-change (units per second)
  deadband?: number;      // Anti-chattering deadband
  highHighMsg?: string;
  highMsg?: string;
  lowMsg?: string;
  lowLowMsg?: string;
  rocMsg?: string;
}

export interface ServerAlarm {
  id: string;
  alarmKey: string;
  tagId: string;
  tagName?: string;
  category: AlarmCategory;
  severity: AlarmSeverity;
  triggerValue: number;
  threshold: number;
  message: string;
  triggerTime: number;
  ackTime?: number | null;
  resolvedTime?: number | null;
  status: AlarmStatus;
}

export class ServerAlarmEngine extends EventEmitter {
  private static instance: ServerAlarmEngine;
  private db: DatabaseSync;
  private dbPath: string;

  // Active alarms in-memory cache: alarmKey -> ServerAlarm
  private activeAlarms: Map<string, ServerAlarm> = new Map();
  // Tag alarm configurations: tagId -> TagAlarmConfig
  private tagConfigs: Map<string, TagAlarmConfig> = new Map();
  // Last tag evaluations for Rate of Change: tagId -> { value, timestamp }
  private lastEvaluations: Map<string, { value: number; timestamp: number }> = new Map();

  constructor(customDbPath?: string) {
    super();
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = customDbPath || path.join(dataDir, 'tasc_historian.db');
    this.db = new DatabaseSync(this.dbPath);
    this.initSchema();
  }

  public static getInstance(): ServerAlarmEngine {
    if (!ServerAlarmEngine.instance) {
      ServerAlarmEngine.instance = new ServerAlarmEngine();
    }
    return ServerAlarmEngine.instance;
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS active_alarms (
        alarm_key TEXT PRIMARY KEY,
        id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        value REAL,
        threshold REAL,
        message TEXT,
        trigger_time INTEGER NOT NULL,
        ack_time INTEGER,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS alarm_history (
        id TEXT PRIMARY KEY,
        alarm_key TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        trigger_value REAL,
        threshold REAL,
        message TEXT,
        trigger_time INTEGER NOT NULL,
        ack_time INTEGER,
        resolved_time INTEGER,
        status TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_alarm_history_time ON alarm_history (trigger_time);
      CREATE INDEX IF NOT EXISTS idx_alarm_history_tag ON alarm_history (tag_id);

      CREATE TABLE IF NOT EXISTS tag_alarm_config (
        tag_id TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 1,
        hh REAL,
        h REAL,
        l REAL,
        ll REAL,
        roc REAL,
        deadband REAL NOT NULL DEFAULT 0.0,
        hh_msg TEXT,
        h_msg TEXT,
        l_msg TEXT,
        ll_msg TEXT,
        roc_msg TEXT
      );
    `);

    this.loadState();
  }

  private loadState() {
    try {
      // 1. Load Configurations
      const configRows = this.db.prepare(`SELECT * FROM tag_alarm_config`).all();
      for (const row of configRows as any[]) {
        this.tagConfigs.set(row.tag_id, {
          tagId: row.tag_id,
          enabled: row.enabled === 1,
          highHigh: row.hh ?? undefined,
          high: row.h ?? undefined,
          low: row.l ?? undefined,
          lowLow: row.ll ?? undefined,
          rateOfChange: row.roc ?? undefined,
          deadband: row.deadband ?? 0,
          highHighMsg: row.hh_msg ?? undefined,
          highMsg: row.h_msg ?? undefined,
          lowMsg: row.l_msg ?? undefined,
          lowLowMsg: row.ll_msg ?? undefined,
          rocMsg: row.roc_msg ?? undefined
        });
      }

      // 2. Load Active Alarms
      const activeRows = this.db.prepare(`SELECT * FROM active_alarms`).all();
      for (const row of activeRows as any[]) {
        this.activeAlarms.set(row.alarm_key, {
          id: row.id,
          alarmKey: row.alarm_key,
          tagId: row.tag_id,
          category: row.category,
          severity: row.severity,
          triggerValue: row.value,
          threshold: row.threshold,
          message: row.message,
          triggerTime: row.trigger_time,
          ackTime: row.ack_time,
          status: row.status
        });
      }
    } catch (err: any) {
      console.error('[ServerAlarmEngine] Error loading alarm state:', err.message);
    }
  }

  public setTagAlarmConfig(config: TagAlarmConfig) {
    this.tagConfigs.set(config.tagId, config);
    const stmt = this.db.prepare(`
      INSERT INTO tag_alarm_config (tag_id, enabled, hh, h, l, ll, roc, deadband, hh_msg, h_msg, l_msg, ll_msg, roc_msg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tag_id) DO UPDATE SET
        enabled = excluded.enabled,
        hh = excluded.hh,
        h = excluded.h,
        l = excluded.l,
        ll = excluded.ll,
        roc = excluded.roc,
        deadband = excluded.deadband,
        hh_msg = excluded.hh_msg,
        h_msg = excluded.h_msg,
        l_msg = excluded.l_msg,
        ll_msg = excluded.ll_msg,
        roc_msg = excluded.roc_msg
    `);
    stmt.run(
      config.tagId,
      config.enabled !== false ? 1 : 0,
      config.highHigh ?? null,
      config.high ?? null,
      config.low ?? null,
      config.lowLow ?? null,
      config.rateOfChange ?? null,
      config.deadband ?? 0.0,
      config.highHighMsg ?? null,
      config.highMsg ?? null,
      config.lowMsg ?? null,
      config.lowLowMsg ?? null,
      config.rocMsg ?? null
    );
  }

  public getTagAlarmConfig(tagId: string): TagAlarmConfig | undefined {
    return this.tagConfigs.get(tagId);
  }

  /**
   * Evaluates all alarm conditions for a tag reading in real-time.
   */
  public evaluateTag(tagId: string, rawVal: any, quality: string = 'good', timestampMs?: number) {
    const config = this.tagConfigs.get(tagId);
    if (!config || config.enabled === false) return;

    const numVal = typeof rawVal === 'number' ? rawVal : (rawVal !== null && rawVal !== undefined && !isNaN(Number(rawVal)) ? Number(rawVal) : null);
    if (numVal === null) return;

    const now = timestampMs || Date.now();
    const deadband = config.deadband || 0;

    // 1. Evaluate High-High (HH)
    if (config.highHigh !== undefined) {
      const alarmKey = `${tagId}_HH`;
      const isCurrentlyActive = this.activeAlarms.has(alarmKey);
      if (!isCurrentlyActive && numVal >= config.highHigh) {
        this.triggerAlarm(alarmKey, tagId, 'HH', 'critical', numVal, config.highHigh, config.highHighMsg || `Tag ${tagId} High-High limit exceeded!`, now);
      } else if (isCurrentlyActive && numVal < (config.highHigh - deadband)) {
        this.clearAlarm(alarmKey, now);
      }
    }

    // 2. Evaluate High (H)
    if (config.high !== undefined) {
      const alarmKey = `${tagId}_H`;
      const isCurrentlyActive = this.activeAlarms.has(alarmKey);
      const isUnderHh = config.highHigh === undefined || numVal < config.highHigh;
      if (!isCurrentlyActive && numVal >= config.high && isUnderHh) {
        this.triggerAlarm(alarmKey, tagId, 'H', 'high', numVal, config.high, config.highMsg || `Tag ${tagId} High limit exceeded.`, now);
      } else if (isCurrentlyActive && numVal < (config.high - deadband)) {
        this.clearAlarm(alarmKey, now);
      }
    }

    // 3. Evaluate Low-Low (LL)
    if (config.lowLow !== undefined) {
      const alarmKey = `${tagId}_LL`;
      const isCurrentlyActive = this.activeAlarms.has(alarmKey);
      if (!isCurrentlyActive && numVal <= config.lowLow) {
        this.triggerAlarm(alarmKey, tagId, 'LL', 'critical', numVal, config.lowLow, config.lowLowMsg || `Tag ${tagId} Low-Low limit exceeded!`, now);
      } else if (isCurrentlyActive && numVal > (config.lowLow + deadband)) {
        this.clearAlarm(alarmKey, now);
      }
    }

    // 4. Evaluate Low (L)
    if (config.low !== undefined) {
      const alarmKey = `${tagId}_L`;
      const isCurrentlyActive = this.activeAlarms.has(alarmKey);
      const isAboveLl = config.lowLow === undefined || numVal > config.lowLow;
      if (!isCurrentlyActive && numVal <= config.low && isAboveLl) {
        this.triggerAlarm(alarmKey, tagId, 'L', 'low', numVal, config.low, config.lowMsg || `Tag ${tagId} Low limit warning.`, now);
      } else if (isCurrentlyActive && numVal > (config.low + deadband)) {
        this.clearAlarm(alarmKey, now);
      }
    }

    // 5. Evaluate Rate of Change (ROC)
    if (config.rateOfChange !== undefined && config.rateOfChange > 0) {
      const last = this.lastEvaluations.get(tagId);
      if (last) {
        const dtSec = Math.max(0.01, (now - last.timestamp) / 1000);
        const roc = Math.abs(numVal - last.value) / dtSec;
        const alarmKey = `${tagId}_ROC`;
        const isCurrentlyActive = this.activeAlarms.has(alarmKey);

        if (!isCurrentlyActive && roc >= config.rateOfChange) {
          this.triggerAlarm(alarmKey, tagId, 'ROC', 'medium', roc, config.rateOfChange, config.rocMsg || `Tag ${tagId} excessive Rate of Change (${roc.toFixed(2)}/s)!`, now);
        } else if (isCurrentlyActive && roc < (config.rateOfChange * 0.8)) {
          this.clearAlarm(alarmKey, now);
        }
      }
    }

    this.lastEvaluations.set(tagId, { value: numVal, timestamp: now });
  }

  private triggerAlarm(alarmKey: string, tagId: string, category: AlarmCategory, severity: AlarmSeverity, val: number, threshold: number, message: string, now: number) {
    const id = `alarm_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const alarm: ServerAlarm = {
      id,
      alarmKey,
      tagId,
      category,
      severity,
      triggerValue: Number(val.toFixed(3)),
      threshold: Number(threshold.toFixed(3)),
      message,
      triggerTime: now,
      ackTime: null,
      resolvedTime: null,
      status: 'ACTIVE_UNACK'
    };

    this.activeAlarms.set(alarmKey, alarm);

    // Save to active_alarms
    const stmtActive = this.db.prepare(`
      INSERT INTO active_alarms (alarm_key, id, tag_id, category, severity, value, threshold, message, trigger_time, ack_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(alarm_key) DO UPDATE SET
        value = excluded.value,
        trigger_time = excluded.trigger_time,
        status = excluded.status
    `);
    stmtActive.run(alarmKey, id, tagId, category, severity, alarm.triggerValue, threshold, message, now, null, 'ACTIVE_UNACK');

    // Save to alarm_history
    const stmtHistory = this.db.prepare(`
      INSERT INTO alarm_history (id, alarm_key, tag_id, category, severity, trigger_value, threshold, message, trigger_time, ack_time, resolved_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmtHistory.run(id, alarmKey, tagId, category, severity, alarm.triggerValue, threshold, message, now, null, null, 'ACTIVE_UNACK');

    console.log(`[ServerAlarmEngine] 🚨 ALARM TRIGGERED: [${severity.toUpperCase()}] ${alarmKey} -> ${message} (Value: ${val}, Threshold: ${threshold})`);
    this.emit('alarm_event', { event: 'TRIGGERED', alarm });

    // Industrial SMS Alert Integration (LibreSMS / GSM Gateway)
    try {
      ServerSmsEngine.getInstance().sendAlarmAlert(alarm).catch((err: any) => {
        console.error('[ServerAlarmEngine] SMS dispatch error:', err.message);
      });
    } catch (smsErr: any) {
      console.error('[ServerAlarmEngine] Failed to initiate SMS alert:', smsErr.message);
    }

    // Industrial Email Alert Integration (Secondary Server SMTP)
    try {
      ServerAlarmEmailEngine.getInstance().sendAlarmAlert(alarm).catch((err: any) => {
        console.error('[ServerAlarmEngine] Email dispatch error:', err.message);
      });
    } catch (emailErr: any) {
      console.error('[ServerAlarmEngine] Failed to initiate Email alert:', emailErr.message);
    }
  }

  private clearAlarm(alarmKey: string, now: number) {
    const active = this.activeAlarms.get(alarmKey);
    if (!active) return;

    const newStatus: AlarmStatus = active.status === 'ACTIVE_ACK' ? 'RESOLVED_ACK' : 'RESOLVED_UNACK';
    active.resolvedTime = now;
    active.status = newStatus;

    this.activeAlarms.delete(alarmKey);

    // Remove from active_alarms table
    this.db.prepare(`DELETE FROM active_alarms WHERE alarm_key = ?`).run(alarmKey);

    // Update record in alarm_history table
    this.db.prepare(`
      UPDATE alarm_history
      SET resolved_time = ?, status = ?
      WHERE id = ?
    `).run(now, newStatus, active.id);

    console.log(`[ServerAlarmEngine] ✓ ALARM CLEARED: ${alarmKey} (Resolved at ${new Date(now).toLocaleTimeString()})`);
    this.emit('alarm_event', { event: 'CLEARED', alarm: active });
  }

  public acknowledgeAlarm(alarmKey: string, operator: string = 'Operator'): boolean {
    const active = this.activeAlarms.get(alarmKey);
    if (!active) return false;

    const now = Date.now();
    active.ackTime = now;
    active.status = 'ACTIVE_ACK';

    this.db.prepare(`
      UPDATE active_alarms
      SET ack_time = ?, status = 'ACTIVE_ACK'
      WHERE alarm_key = ?
    `).run(now, alarmKey);

    this.db.prepare(`
      UPDATE alarm_history
      SET ack_time = ?, status = 'ACTIVE_ACK'
      WHERE id = ?
    `).run(now, active.id);

    console.log(`[ServerAlarmEngine] 👁️ ALARM ACKNOWLEDGED: ${alarmKey} by ${operator}`);
    this.emit('alarm_event', { event: 'ACKNOWLEDGED', alarm: active, operator });
    return true;
  }

  public getActiveAlarms(): ServerAlarm[] {
    return Array.from(this.activeAlarms.values());
  }

  public getAlarmHistory(options: { startMs?: number; endMs?: number; limit?: number; offset?: number; tagId?: string } = {}): ServerAlarm[] {
    const start = options.startMs || 0;
    const end = options.endMs || Date.now() + 86400000;
    const limit = Math.min(options.limit || 100, 500);
    const offset = options.offset || 0;

    let sql = `
      SELECT id, alarm_key, tag_id, category, severity, trigger_value, threshold, message, trigger_time, ack_time, resolved_time, status
      FROM alarm_history
      WHERE trigger_time >= ? AND trigger_time <= ?
    `;
    const params: any[] = [start, end];

    if (options.tagId) {
      sql += ` AND tag_id = ?`;
      params.push(options.tagId);
    }

    sql += ` ORDER BY trigger_time DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params);
    return (rows as any[]).map(r => ({
      id: r.id,
      alarmKey: r.alarm_key,
      tagId: r.tag_id,
      category: r.category,
      severity: r.severity,
      triggerValue: Number(r.trigger_value),
      threshold: Number(r.threshold),
      message: r.message,
      triggerTime: Number(r.trigger_time),
      ackTime: r.ack_time ? Number(r.ack_time) : null,
      resolvedTime: r.resolved_time ? Number(r.resolved_time) : null,
      status: r.status
    }));
  }

  /**
   * Dispatches and records an alarm triggered externally (e.g. from SCADA UI or MQTT panel evaluation).
   * Automatically executes Telecom SMS and Server Email dispatches.
   */
  public recordExternalAlarm(data: {
    alarmKey: string;
    tagId?: string;
    tagName?: string;
    category?: AlarmCategory;
    severity?: AlarmSeverity;
    value?: number;
    threshold?: number;
    message: string;
    timestamp?: number;
  }) {
    const now = data.timestamp || Date.now();
    const cat: AlarmCategory = data.category || 'HH';
    const sev: AlarmSeverity = data.severity || (cat === 'HH' || cat === 'TRIP' || cat === 'FAULT' ? 'critical' : 'high');
    const val = typeof data.value === 'number' ? data.value : 0;
    const thresh = typeof data.threshold === 'number' ? data.threshold : 0;
    const tag = data.tagId || data.alarmKey;

    this.triggerAlarm(
      data.alarmKey,
      tag,
      cat,
      sev,
      val,
      thresh,
      data.message,
      now
    );
  }

  /**
   * Clears an externally triggered alarm when condition normalizes.
   */
  public clearExternalAlarm(alarmKey: string) {
    this.clearAlarm(alarmKey, Date.now());
  }

  public close() {
    try {
      this.db.close();
    } catch {}
  }
}

export const serverAlarmEngine = ServerAlarmEngine.getInstance();
