import path from 'path';
import fs from 'fs';
// @ts-ignore - node:sqlite is natively available in Node.js 22.5+
import { DatabaseSync } from 'node:sqlite';

export interface HistorianTagConfig {
  tagId: string;
  enabled: boolean;
  deadband: number; // minimum absolute value change to trigger a log
  maxIntervalMs: number; // periodic heartbeat (e.g. 60,000ms to guarantee continuity)
  rocThreshold?: number; // rate-of-change limit (units per second)
}

export interface HistorianPoint {
  id?: number;
  tagId: string;
  timestamp: number;
  value: number | null;
  quality: string;
  qualityText: string;
}

export interface DownsampledPoint {
  timestamp: number;
  avgValue: number | null;
  minValue: number | null;
  maxValue: number | null;
  count: number;
}

export class ServerHistorian {
  private static instance: ServerHistorian;
  private db: DatabaseSync;
  private dbPath: string;
  
  // In-memory filter caches
  private lastLoggedPoints: Map<string, { value: number | null; timestamp: number; quality: string }> = new Map();
  private lastEvaluatedPoints: Map<string, { value: number | null; timestamp: number }> = new Map();
  private tagConfigs: Map<string, HistorianTagConfig> = new Map();
  
  // High-throughput batch commit buffer
  private buffer: HistorianPoint[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private maxBufferSize = 200;
  private flushIntervalMs = 1000;

  constructor(customDbPath?: string) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.dbPath = customDbPath || path.join(dataDir, 'tasc_historian.db');
    this.db = new DatabaseSync(this.dbPath);
    this.initSchema();
    this.startBatchFlusher();
  }

  public static getInstance(): ServerHistorian {
    if (!ServerHistorian.instance) {
      ServerHistorian.instance = new ServerHistorian();
    }
    return ServerHistorian.instance;
  }

  private initSchema() {
    // 1. Raw Time-Series Points
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS historian_raw (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        value REAL,
        quality TEXT NOT NULL,
        quality_text TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_historian_tag_time ON historian_raw (tag_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_historian_time ON historian_raw (timestamp);
    `);

    // 2. Per-Tag Historian Configuration
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS historian_tag_config (
        tag_id TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 1,
        deadband REAL NOT NULL DEFAULT 0.0,
        max_interval_ms INTEGER NOT NULL DEFAULT 60000,
        roc_threshold REAL
      );
    `);

    this.loadTagConfigs();
  }

  private loadTagConfigs() {
    try {
      const rows = this.db.prepare(`SELECT tag_id, enabled, deadband, max_interval_ms, roc_threshold FROM historian_tag_config`).all();
      for (const row of rows as any[]) {
        this.tagConfigs.set(row.tag_id, {
          tagId: row.tag_id,
          enabled: row.enabled === 1,
          deadband: row.deadband,
          maxIntervalMs: row.max_interval_ms,
          rocThreshold: row.roc_threshold ?? undefined
        });
      }
    } catch (err: any) {
      console.error('[ServerHistorian] Error loading tag configs:', err.message);
    }
  }

  public setTagConfig(config: HistorianTagConfig) {
    this.tagConfigs.set(config.tagId, config);
    const stmt = this.db.prepare(`
      INSERT INTO historian_tag_config (tag_id, enabled, deadband, max_interval_ms, roc_threshold)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(tag_id) DO UPDATE SET
        enabled = excluded.enabled,
        deadband = excluded.deadband,
        max_interval_ms = excluded.max_interval_ms,
        roc_threshold = excluded.roc_threshold
    `);
    stmt.run(
      config.tagId,
      config.enabled ? 1 : 0,
      config.deadband,
      config.maxIntervalMs,
      config.rocThreshold ?? null
    );
  }

  public getTagConfig(tagId: string): HistorianTagConfig {
    return this.tagConfigs.get(tagId) || {
      tagId,
      enabled: true,
      deadband: 0.0,
      maxIntervalMs: 60000
    };
  }

  /**
   * Evaluates a tag reading against deadband, rate-of-change, and periodic heartbeat.
   * If criteria met, pushes to batch buffer for SQLite persistence.
   */
  public recordTag(tagId: string, rawVal: any, quality: string = 'good', qualityText: string = 'Good', timestampMs?: number): boolean {
    const config = this.getTagConfig(tagId);
    if (!config.enabled) return false;

    const now = timestampMs || Date.now();
    const numVal = typeof rawVal === 'number' ? rawVal : (rawVal !== null && rawVal !== undefined && !isNaN(Number(rawVal)) ? Number(rawVal) : null);

    const lastLogged = this.lastLoggedPoints.get(tagId);
    const lastEval = this.lastEvaluatedPoints.get(tagId);

    let shouldLog = false;

    if (!lastLogged) {
      // First ever reading for this tag -> always log
      shouldLog = true;
    } else if (lastLogged.quality !== quality) {
      // Quality change -> always log
      shouldLog = true;
    } else if (numVal !== null && lastLogged.value !== null) {
      const delta = Math.abs(numVal - lastLogged.value);
      
      // 1. Deadband threshold check
      if (config.deadband > 0 && delta >= config.deadband) {
        shouldLog = true;
      } else if (config.deadband === 0 && delta > 0.000001) {
        // Zero deadband -> any change triggers log
        shouldLog = true;
      }

      // 2. Rate-of-change check (delta per second)
      if (!shouldLog && config.rocThreshold && lastEval) {
        const dtSec = Math.max(0.01, (now - lastEval.timestamp) / 1000);
        const roc = Math.abs(numVal - (lastEval.value ?? numVal)) / dtSec;
        if (roc >= config.rocThreshold) {
          shouldLog = true;
        }
      }

      // 3. Heartbeat / max interval check
      if (!shouldLog && (now - lastLogged.timestamp) >= config.maxIntervalMs) {
        shouldLog = true;
      }
    } else if ((now - lastLogged.timestamp) >= config.maxIntervalMs) {
      // Non-numeric or null value heartbeat
      shouldLog = true;
    }

    this.lastEvaluatedPoints.set(tagId, { value: numVal, timestamp: now });

    if (shouldLog) {
      this.lastLoggedPoints.set(tagId, { value: numVal, timestamp: now, quality });
      this.buffer.push({
        tagId,
        timestamp: now,
        value: numVal,
        quality,
        qualityText
      });

      if (this.buffer.length >= this.maxBufferSize) {
        this.flushBatch();
      }
      return true;
    }

    return false;
  }

  private startBatchFlusher() {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flushBatch();
      }
    }, this.flushIntervalMs);
  }

  public flushBatch(): number {
    if (this.isFlushing || this.buffer.length === 0) return 0;
    this.isFlushing = true;

    const toInsert = [...this.buffer];
    this.buffer = [];

    try {
      this.db.exec('BEGIN TRANSACTION');
      const stmt = this.db.prepare(`
        INSERT INTO historian_raw (tag_id, timestamp, value, quality, quality_text)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const p of toInsert) {
        stmt.run(p.tagId, p.timestamp, p.value, p.quality, p.qualityText);
      }
      this.db.exec('COMMIT');
      return toInsert.length;
    } catch (err: any) {
      try { this.db.exec('ROLLBACK'); } catch {}
      console.error('[ServerHistorian] Batch flush failed:', err.message);
      // Restore points that failed to insert
      this.buffer.unshift(...toInsert);
      return 0;
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Queries historical points for a tag within [startMs, endMs].
   * If downsampleIntervalMs is supplied, groups by time bucket using SQL aggregates.
   */
  public queryTagHistory(tagId: string, startMs: number, endMs: number, downsampleIntervalMs?: number): Array<HistorianPoint | DownsampledPoint> {
    // Flush any pending buffer points first so query has real-time accuracy
    if (this.buffer.length > 0) {
      this.flushBatch();
    }

    if (downsampleIntervalMs && downsampleIntervalMs > 0) {
      // Bucket aggregation
      const sql = `
        SELECT
          (timestamp / ?) * ? AS bucket_time,
          AVG(value) as avg_val,
          MIN(value) as min_val,
          MAX(value) as max_val,
          COUNT(*) as pt_count
        FROM historian_raw
        WHERE tag_id = ? AND timestamp >= ? AND timestamp <= ?
        GROUP BY bucket_time
        ORDER BY bucket_time ASC
      `;
      const rows = this.db.prepare(sql).all(downsampleIntervalMs, downsampleIntervalMs, tagId, startMs, endMs);
      return (rows as any[]).map(r => ({
        timestamp: Number(r.bucket_time),
        avgValue: r.avg_val !== null ? Number(Number(r.avg_val).toFixed(3)) : null,
        minValue: r.min_val !== null ? Number(r.min_val) : null,
        maxValue: r.max_val !== null ? Number(r.max_val) : null,
        count: Number(r.pt_count)
      }));
    }

    // Raw points
    const sql = `
      SELECT id, tag_id, timestamp, value, quality, quality_text
      FROM historian_raw
      WHERE tag_id = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
      LIMIT 5000
    `;
    const rows = this.db.prepare(sql).all(tagId, startMs, endMs);
    return (rows as any[]).map(r => ({
      id: r.id,
      tagId: r.tag_id,
      timestamp: Number(r.timestamp),
      value: r.value !== null ? Number(r.value) : null,
      quality: r.quality,
      qualityText: r.quality_text
    }));
  }

  public getStats(): { totalPoints: number; databaseSizeMb: number; configuredTags: number; bufferedPoints: number } {
    const countRow: any = this.db.prepare(`SELECT COUNT(*) as total FROM historian_raw`).get();
    let sizeMb = 0;
    try {
      const stats = fs.statSync(this.dbPath);
      sizeMb = Number((stats.size / (1024 * 1024)).toFixed(2));
    } catch {}

    return {
      totalPoints: Number(countRow?.total || 0),
      databaseSizeMb: sizeMb,
      configuredTags: this.tagConfigs.size,
      bufferedPoints: this.buffer.length
    };
  }

  public pruneOldData(retentionDays: number): number {
    const cutoff = Date.now() - (retentionDays * 86400 * 1000);
    const stmt = this.db.prepare(`DELETE FROM historian_raw WHERE timestamp < ?`);
    const res: any = stmt.run(cutoff);
    return Number(res?.changes || 0);
  }

  public close() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushBatch();
    try {
      this.db.close();
    } catch {}
  }
}

export const serverHistorian = ServerHistorian.getInstance();
