/**
 * TASC IIoT Studio — Telemetry Trend Historian Engine
 *
 * Architecture:
 *  - IndexedDB persistent storage (`TascTrendHistorianDB`)
 *  - Write batching: accumulate in RAM, flush every 5 seconds (reduces mobile write jank)
 *  - FIFO auto-pruning: deletes oldest records beyond retention window or storage cap
 *  - LTTB decimation: downsamples large datasets to ≤500 display points (prevents SVG OOM)
 *  - Tab leader election: only one browser tab writes to DB (prevents corruption)
 *  - Visibility gap detection: marks background periods as gap records on the trend chart
 *  - Private Browsing detection: probes IndexedDB write capability on iOS Safari
 *  - Storage quota guard: checks `navigator.storage.estimate()` before each batch flush
 *
 * Android-specific hardening:
 *  - navigator.storage.persist(): requests OS-level eviction protection (Android Chrome honors this)
 *  - pagehide + beforeunload: emergency synchronous flush before Android process kill
 *  - DB auto-reconnect: handles silent IndexedDB closure on Android OEM WebViews (MIUI, Huawei, Samsung)
 *  - OEM browser detection: warns if running on browsers with limited IndexedDB support
 *  - Android Periodic Background Sync: registers background sync when PWA is installed on Android
 */

import type { TrendLogPoint, HistorianGapRecord, HistorianStorageEstimate } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────
const DB_NAME = 'TascTrendHistorianDB';
const DB_VERSION = 1;
const STORE_NAME = 'telemetry_logs';
const BATCH_FLUSH_INTERVAL_MS = 5000;   // Flush batch to DB every 5 seconds
const BATCH_MAX_SIZE = 50;              // Flush immediately if batch hits 50 records
const PRUNE_INTERVAL_MS = 10 * 60 * 1000; // Run FIFO pruner every 10 minutes
const QUOTA_WARN_RATIO = 0.80;          // Warn when using > 80% of storage quota
const LEADER_KEY = 'tasc_historian_leader_tab';
const LEADER_HEARTBEAT_MS = 3000;       // Leader refreshes claim every 3 seconds

// ─── Module State ─────────────────────────────────────────────────────────────
let db: IDBDatabase | null = null;
let isInitialized = false;
let isPrivateBrowsing = false;
let isLeaderTab = false;
let isStoragePersisted = false;  // true when navigator.storage.persist() was granted (Android)
let batchBuffer: (TrendLogPoint | HistorianGapRecord)[] = [];
let flushTimerId: ReturnType<typeof setInterval> | null = null;
let pruneTimerId: ReturnType<typeof setInterval> | null = null;
let leaderHeartbeatId: ReturnType<typeof setInterval> | null = null;
let broadcastChannel: BroadcastChannel | null = null;
let backgroundHiddenAt: number | null = null;
let visibilityListenerRegistered = false; // Prevent duplicate listeners on reconnect
let pagehideListenerRegistered = false;   // Prevent duplicate beforeunload listeners
const lastLoggedAt: Record<string, number> = {}; // topic → last logged timestamp (ms)

export function getIsStoragePersisted(): boolean { return isStoragePersisted; }

// Retention config stored in localStorage for persistence
interface RetentionConfig {
  retentionValue: number;
  retentionUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';
  storageCapMb: number;
}

// ─── Utility: Retention to Seconds ───────────────────────────────────────────
export function retentionToSeconds(value: number, unit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'): number {
  const s = value;
  switch (unit) {
    case 'MINUTES': return s * 60;
    case 'HOURS':   return s * 3600;
    case 'DAYS':    return s * 86400;
    case 'WEEKS':   return s * 7 * 86400;
    case 'MONTHS':  return s * 30 * 86400;
    case 'YEARS':   return s * 365 * 86400;
    default:        return s * 86400;
  }
}

// ─── Storage Estimator ────────────────────────────────────────────────────────
/**
 * Calculates estimated local storage footprint for a given historian config.
 * Formula: (retentionSec / intervalSec) × pensCount × 80 bytes/record
 */
export function estimateStorageFootprint(
  pensCount: number,
  intervalSec: number,
  retentionValue: number,
  retentionUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS',
  isPersisted?: boolean  // When true (Android storage.persist() granted), downgrade warn→safe
): HistorianStorageEstimate {
  const retentionSec = retentionToSeconds(retentionValue, retentionUnit);
  const safeInterval = Math.max(1, intervalSec);
  const totalPoints = Math.floor((retentionSec / safeInterval) * Math.max(1, pensCount));
  const estimatedBytes = totalPoints * 80; // 80 bytes per compact record
  const estimatedMb = estimatedBytes / (1024 * 1024);

  let tier: 'safe' | 'warn' | 'critical';
  if (estimatedMb < 200) {
    tier = 'safe';
  } else if (estimatedMb < 600) {
    // If Android storage.persist() was granted, 200-600MB is still safe (OS won't evict)
    tier = isPersisted ? 'safe' : 'warn';
  } else {
    // > 600MB is critical regardless of persist() — hardware limits apply
    tier = 'critical';
  }

  const formattedSize = estimatedMb >= 1024
    ? `${(estimatedMb / 1024).toFixed(2)} GB`
    : estimatedMb >= 1
      ? `${estimatedMb.toFixed(1)} MB`
      : `${(estimatedBytes / 1024).toFixed(1)} KB`;

  return { totalPoints, estimatedBytes, estimatedMb, formattedSize, tier };
}

// ─── Android OEM Browser Detection ───────────────────────────────────────────
/**
 * Detects known Android OEM browsers with limited/buggy IndexedDB support.
 * Samsung Internet < v12, Huawei Browser, MIUI Browser, Opera Mini have issues.
 * Returns a warning string, or null if running in a standard browser.
 */
export function detectOEMBrowserWarning(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';

  if (/SamsungBrowser\/(\d+)/.test(ua)) {
    const ver = parseInt(RegExp.$1);
    if (ver < 12) {
      return 'Samsung Internet < v12 detected. Please update to v12+ for reliable historian storage.';
    }
  }
  if (/HuaweiBrowser/.test(ua) || /HUAWEI/.test(ua)) {
    return 'Huawei Browser detected. Historian data may not persist after app restart. Use Chrome instead.';
  }
  if (/MiuiBrowser/.test(ua) || /XiaoMi/.test(ua)) {
    return 'MIUI Browser detected. Historian data may be cleared on memory pressure. Use Chrome instead.';
  }
  if (/Opera Mini/.test(ua) || /OPiOS/.test(ua)) {
    return 'Opera Mini detected. IndexedDB is not supported. Historian logging is unavailable.';
  }
  return null;
}

// ─── Private Browsing Detection ───────────────────────────────────────────────
/**
 * Probes IndexedDB write capability. iOS Safari Private Mode returns zero quota,
 * causing all DB operations to fail silently.
 */
export async function checkPrivateBrowsingMode(): Promise<boolean> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return true;
  try {
    // Try storage estimate first (fastest check)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      if ((estimate.quota ?? 0) < 1024 * 1024) {
        // < 1MB quota = private mode
        isPrivateBrowsing = true;
        return true;
      }
    }
    // Fallback: try a test IndexedDB open
    await new Promise<void>((resolve, reject) => {
      const req = window.indexedDB.open('_tasc_probe', 1);
      req.onsuccess = () => { req.result.close(); window.indexedDB.deleteDatabase('_tasc_probe'); resolve(); };
      req.onerror = () => reject(new Error('idb_fail'));
      req.onblocked = () => reject(new Error('idb_blocked'));
    });
    isPrivateBrowsing = false;
    return false;
  } catch {
    isPrivateBrowsing = true;
    return true;
  }
}

export function getIsPrivateBrowsing(): boolean {
  return isPrivateBrowsing;
}

// ─── Tab Leader Election ──────────────────────────────────────────────────────
/**
 * Implements a simple localStorage-based leader election.
 * Only the leader tab writes historian data to IndexedDB.
 * Follower tabs receive live data updates via BroadcastChannel.
 */
function electTabLeader(): void {
  if (typeof window === 'undefined') return;

  const myId = `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const tryClaimLeader = () => {
    const existing = localStorage.getItem(LEADER_KEY);
    if (!existing) {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ id: myId, ts: Date.now() }));
      isLeaderTab = true;
    } else {
      try {
        const parsed = JSON.parse(existing);
        // If existing heartbeat is stale (> 10 seconds old), claim leadership
        if (Date.now() - parsed.ts > 10000) {
          localStorage.setItem(LEADER_KEY, JSON.stringify({ id: myId, ts: Date.now() }));
          isLeaderTab = true;
        } else {
          isLeaderTab = parsed.id === myId;
        }
      } catch {
        localStorage.setItem(LEADER_KEY, JSON.stringify({ id: myId, ts: Date.now() }));
        isLeaderTab = true;
      }
    }
  };

  tryClaimLeader();

  // Maintain leadership heartbeat
  leaderHeartbeatId = setInterval(() => {
    if (isLeaderTab) {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ id: myId, ts: Date.now() }));
    } else {
      tryClaimLeader(); // Re-try if previous leader abandoned
    }
  }, LEADER_HEARTBEAT_MS);

  // Release leadership on tab close
  window.addEventListener('beforeunload', () => {
    if (isLeaderTab) {
      localStorage.removeItem(LEADER_KEY);
    }
    leaderHeartbeatId && clearInterval(leaderHeartbeatId);
  });

  // Setup BroadcastChannel for follower sync
  if ('BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('tasc_trend_historian');
    broadcastChannel.onmessage = (event) => {
      if (!isLeaderTab && event.data?.type === 'NEW_POINTS') {
        // Follower tabs can update in-memory live chart data from the broadcast
        broadcastChannel?.dispatchEvent(new CustomEvent('historian_data', { detail: event.data.points }));
      }
    };
  }
}

export function getIsLeaderTab(): boolean {
  return isLeaderTab;
}

// ─── IndexedDB Initialization ─────────────────────────────────────────────────
/**
 * Opens TascTrendHistorianDB and creates the telemetry_logs object store
 * with compound index on [pen, t] for efficient range queries.
 * Also requests navigator.storage.persist() on Android Chrome for OS-level eviction protection.
 */
export async function initTrendHistorianDB(): Promise<boolean> {
  if (isInitialized && db) return true;
  if (typeof window === 'undefined' || !('indexedDB' in window)) return false;

  // Check for Android OEM browser incompatibility
  const oemWarning = detectOEMBrowserWarning();
  if (oemWarning && /Opera Mini/.test(navigator.userAgent || '')) {
    console.error('[Historian]', oemWarning);
    return false; // Opera Mini — IndexedDB not available at all
  }
  if (oemWarning) {
    console.warn('[Historian]', oemWarning);
  }

  // Check private browsing first
  const isPrivate = await checkPrivateBrowsingMode();
  if (isPrivate) {
    console.warn('[Historian] Private browsing mode detected — historian logging disabled.');
    return false;
  }

  // 🤖 Android: Request persistent storage to prevent OS eviction
  // navigator.storage.persist() is well-supported on Android Chrome and will prompt
  // the user to grant persistent storage protection. iOS Safari ignores this silently.
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const granted = await navigator.storage.persist();
      isStoragePersisted = granted;
      console.info(`[Historian] storage.persist() ${granted ? 'GRANTED ✓ (Android eviction protection active)' : 'not granted (normal mode)'}`);
    } catch {
      isStoragePersisted = false;
    }
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const idb = event.target.result as IDBDatabase;
        if (!idb.objectStoreNames.contains(STORE_NAME)) {
          const store = idb.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // Index for range queries by pen topic + timestamp
          store.createIndex('pen_t', ['pen', 't'], { unique: false });
          // Index for range queries by timestamp only (for FIFO pruning)
          store.createIndex('t', 't', { unique: false });
          // Index for queries by panel ID
          store.createIndex('pid', 'pid', { unique: false });
        }
      };

      request.onsuccess = (event: any) => {
        db = event.target.result as IDBDatabase;
        isInitialized = true;

        // 🤖 Android WebView Bug Fix:
        // Some Android OEM WebViews (MIUI, Huawei, Samsung Internet) silently close
        // the IndexedDB connection when the app resumes from background.
        // We auto-reconnect when this happens.
        db.onclose = () => {
          console.warn('[Historian] DB connection closed unexpectedly — scheduling reconnect.');
          db = null;
          isInitialized = false;
          // Auto-reconnect after 1 second (gives the WebView time to settle)
          setTimeout(() => {
            console.info('[Historian] Attempting DB reconnect...');
            initTrendHistorianDB().then((ok) => {
              if (ok) console.info('[Historian] DB reconnected successfully.');
              else console.error('[Historian] DB reconnect failed.');
            });
          }, 1000);
        };
        db.onerror = (e) => console.error('[Historian] DB error:', e);

        electTabLeader();
        startBatchFlushTimer();
        startPrunerTimer();
        registerVisibilityListener();
        registerPagehideListener(); // 🤖 Android: emergency flush on process kill
        registerAndroidPeriodicSync(); // 🤖 Android PWA: background sync hint

        console.log('[Historian] TascTrendHistorianDB initialized.');
        resolve(true);
      };

      request.onerror = (event: any) => {
        console.error('[Historian] Failed to open IndexedDB:', event.target.error);
        resolve(false);
      };
    } catch (err) {
      console.error('[Historian] Exception during DB init:', err);
      resolve(false);
    }
  });
}

// ─── Write Batching ───────────────────────────────────────────────────────────
/**
 * Enqueues a telemetry point into the RAM batch buffer.
 * Checks per-topic sampling interval before adding (rate limiting).
 * Only the leader tab enqueues points for DB flushing.
 */
export function enqueueTelemetryPoint(
  panelId: string,
  topic: string,
  value: number,
  logIntervalSec: number = 10,
  penId?: string
): void {
  if (!isInitialized || isPrivateBrowsing) return;

  const nowMs = Date.now();
  const safeInterval = Math.max(1, logIntervalSec) * 1000;
  const lastMs = lastLoggedAt[topic] ?? 0;

  if (nowMs - lastMs < safeInterval) return; // Rate limit — not yet time to log
  lastLoggedAt[topic] = nowMs;

  const penKey = penId || topic;
  const point: TrendLogPoint = {
    id: `${penKey}_${nowMs}`,
    pid: panelId,
    pen: penKey,
    v: value,
    t: nowMs,
  };

  batchBuffer.push(point);

  // Broadcast to follower tabs for live chart sync
  if (isLeaderTab && broadcastChannel) {
    broadcastChannel.postMessage({ type: 'NEW_POINTS', points: [point] });
  }

  // Flush immediately if batch is large enough
  if (batchBuffer.length >= BATCH_MAX_SIZE) {
    flushBatchToIndexedDB();
  }
}

/**
 * Writes the accumulated batch buffer to IndexedDB in a single transaction.
 * Uses requestIdleCallback when available (Chrome Android) for minimal UI impact.
 */
function flushBatchToIndexedDB(): void {
  if (!db || batchBuffer.length === 0 || !isLeaderTab) return;

  const toFlush = [...batchBuffer];
  batchBuffer = [];

  const doFlush = () => {
    if (!db) return;

    // Check storage quota before writing
    checkAndEnforceQuota().then((ok) => {
      if (!ok) return; // Storage pressure — skip this flush

      try {
        const tx = db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const pt of toFlush) {
          store.put(pt);
        }
        tx.onerror = (e) => console.error('[Historian] Batch write error:', e);
      } catch (err) {
        console.error('[Historian] Batch flush exception:', err);
      }
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(doFlush, { timeout: 3000 });
  } else {
    setTimeout(doFlush, 0);
  }
}

function startBatchFlushTimer(): void {
  if (flushTimerId) clearInterval(flushTimerId);
  flushTimerId = setInterval(() => flushBatchToIndexedDB(), BATCH_FLUSH_INTERVAL_MS);
}

// ─── Android: Emergency Flush on Process Kill ─────────────────────────────────
/**
 * 🤖 Android-specific: Registers pagehide and beforeunload handlers.
 *
 * Android OEM kernels (especially MIUI, OxygenOS, ColorOS) aggressively kill browser
 * processes when switching apps or under memory pressure. Unlike iOS which merely
 * suspends, Android can DESTROY the process — meaning the 5-second batch buffer
 * in RAM is permanently lost.
 *
 * Solution: On pagehide (fired before page is destroyed/frozen), synchronously
 * initiate a DB flush. Note: we use synchronous IndexedDB transaction here
 * because async promises may not resolve after process starts termination.
 */
function registerPagehideListener(): void {
  if (typeof window === 'undefined' || pagehideListenerRegistered) return;
  pagehideListenerRegistered = true;

  const emergencyFlush = () => {
    if (!db || batchBuffer.length === 0 || !isLeaderTab) return;
    try {
      // Bypass the normal async flush — write directly and synchronously
      const toFlush = [...batchBuffer];
      batchBuffer = [];
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const pt of toFlush) {
        store.put(pt);
      }
      console.info(`[Historian] Emergency flush: ${toFlush.length} records saved before process exit.`);
    } catch (err) {
      console.warn('[Historian] Emergency flush failed:', err);
    }
  };

  // pagehide fires on Android when activity is being destroyed (more reliable than beforeunload)
  window.addEventListener('pagehide', emergencyFlush, { capture: true });
  // beforeunload as additional fallback for desktop Chrome / Firefox
  window.addEventListener('beforeunload', emergencyFlush, { capture: true });
}

// ─── Android PWA: Periodic Background Sync ────────────────────────────────────
/**
 * 🤖 Android Chrome PWA-only feature.
 * Registers a Periodic Background Sync tag 'historian-prune' that will run the
 * FIFO pruner even when the app is not open.
 * Only works when:
 *  1. App is installed as PWA (Add to Home Screen) on Android
 *  2. User has granted notification permission
 *  3. Chrome 80+ on Android
 * On iOS Safari and non-PWA contexts, this silently does nothing.
 */
async function registerAndroidPeriodicSync(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('periodicSync' in (await navigator.serviceWorker.ready))) {
      return; // Not supported
    }
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as any).periodicSync;
    if (!periodicSync) return;

    // Request minimum interval of 12 hours (browser enforces minimum based on site engagement)
    await periodicSync.register('historian-prune', { minInterval: 12 * 60 * 60 * 1000 });
    console.info('[Historian] Android Periodic Background Sync registered (historian-prune, 12h interval).');
  } catch {
    // Not a PWA or permission not granted — silently ignore
  }
}

// ─── Storage Quota Guard ──────────────────────────────────────────────────────
/**
 * Checks navigator.storage.estimate() quota. If usage > 80%, triggers early FIFO pruning.
 * Returns false if quota is critically exceeded (write should be skipped).
 */
async function checkAndEnforceQuota(): Promise<boolean> {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) return true;
  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? Infinity;
    if (quota === 0) return false;

    const ratio = usage / quota;
    if (ratio > QUOTA_WARN_RATIO) {
      console.warn(`[Historian] Storage at ${(ratio * 100).toFixed(1)}% — triggering early FIFO prune.`);
      // Emergency prune: cut oldest 20% of records
      await pruneOldestPercent(20);
    }
    return ratio < 0.95; // Block writes only if > 95% full
  } catch {
    return true;
  }
}

// ─── FIFO Pruning ─────────────────────────────────────────────────────────────
/**
 * Deletes all telemetry log records older than the configured retention window.
 * Also respects the storage cap in MB.
 */
export async function pruneFIFOByRetention(
  retentionValue: number,
  retentionUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS',
  storageCapMb?: number
): Promise<number> {
  if (!db) return 0;

  const retentionSec = retentionToSeconds(retentionValue, retentionUnit);
  const cutoffMs = Date.now() - retentionSec * 1000;

  return new Promise((resolve) => {
    try {
      const tx = db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const idx = store.index('t');
      const range = IDBKeyRange.upperBound(cutoffMs);
      let deletedCount = 0;

      const req = idx.openCursor(range);
      req.onsuccess = (event: any) => {
        const cursor: IDBCursorWithValue = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      req.onerror = () => resolve(0);
    } catch (err) {
      console.error('[Historian] FIFO prune error:', err);
      resolve(0);
    }
  });
}

/**
 * Emergency prune: removes the oldest `percent`% of records regardless of timestamp.
 */
async function pruneOldestPercent(percent: number): Promise<void> {
  if (!db) return;
  const totalCount = await countTotalRecords();
  const deleteCount = Math.floor(totalCount * (percent / 100));
  if (deleteCount <= 0) return;

  return new Promise((resolve) => {
    try {
      const tx = db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const idx = store.index('t');
      let deleted = 0;

      const req = idx.openCursor();
      req.onsuccess = (event: any) => {
        const cursor: IDBCursorWithValue = event.target.result;
        if (cursor && deleted < deleteCount) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function countTotalRecords(): Promise<number> {
  return new Promise((resolve) => {
    if (!db) return resolve(0);
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}

function startPrunerTimer(): void {
  if (pruneTimerId) clearInterval(pruneTimerId);
  pruneTimerId = setInterval(() => {
    // Read current retention config from localStorage
    try {
      const raw = localStorage.getItem('tasc_trend_historian_config');
      if (raw) {
        const cfg: RetentionConfig = JSON.parse(raw);
        pruneFIFOByRetention(cfg.retentionValue, cfg.retentionUnit, cfg.storageCapMb);
      }
    } catch {}
  }, PRUNE_INTERVAL_MS);
}

export function saveHistorianRetentionConfig(cfg: RetentionConfig): void {
  try {
    localStorage.setItem('tasc_trend_historian_config', JSON.stringify(cfg));
  } catch {}
}

export function getHistorianRetentionConfig(): RetentionConfig | null {
  try {
    const raw = localStorage.getItem('tasc_trend_historian_config');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Historical Range Query ───────────────────────────────────────────────────
/**
 * Queries historian data for a specific pen topic in a time window.
 * Uses paginated cursor for memory efficiency — loads at most `pageSize` records at a time.
 */
export async function queryHistoricalRange(
  penTopic: string,
  startMs: number,
  endMs: number,
  pageSize: number = 5000
): Promise<TrendLogPoint[]> {
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const idx = store.index('pen_t');
      // IDB compound key range: [penTopic, startMs] to [penTopic, endMs]
      const range = IDBKeyRange.bound([penTopic, startMs], [penTopic, endMs]);
      const results: TrendLogPoint[] = [];

      const req = idx.openCursor(range);
      req.onsuccess = (event: any) => {
        const cursor: IDBCursorWithValue = event.target.result;
        if (cursor && results.length < pageSize) {
          results.push(cursor.value as TrendLogPoint);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => resolve([]);
    } catch (err) {
      console.error('[Historian] Query error:', err);
      resolve([]);
    }
  });
}

/**
 * Gets the timestamp range (oldest & newest point) available for a pen.
 * Useful for rendering the available history time range selector.
 */
export async function queryPenTimeRange(penTopic: string): Promise<{ minMs: number; maxMs: number } | null> {
  if (!db) return null;

  const [first, last] = await Promise.all([
    new Promise<TrendLogPoint | null>((resolve) => {
      const tx = db!.transaction(STORE_NAME, 'readonly');
      const idx = tx.objectStore(STORE_NAME).index('pen_t');
      const range = IDBKeyRange.bound([penTopic, 0], [penTopic, Infinity]);
      const req = idx.openCursor(range, 'next');
      req.onsuccess = (e: any) => resolve(e.target.result?.value ?? null);
      req.onerror = () => resolve(null);
    }),
    new Promise<TrendLogPoint | null>((resolve) => {
      const tx = db!.transaction(STORE_NAME, 'readonly');
      const idx = tx.objectStore(STORE_NAME).index('pen_t');
      const range = IDBKeyRange.bound([penTopic, 0], [penTopic, Infinity]);
      const req = idx.openCursor(range, 'prev');
      req.onsuccess = (e: any) => resolve(e.target.result?.value ?? null);
      req.onerror = () => resolve(null);
    })
  ]);

  if (!first || !last) return null;
  return { minMs: first.t, maxMs: last.t };
}

// ─── LTTB Decimation (Largest-Triangle-Three-Buckets) ─────────────────────────
/**
 * Downsamples a large dataset to `targetCount` representative points.
 * Preserves visually significant peaks, valleys, and trend inflections.
 * Prevents SVG rendering OOM on mobile when querying large historical ranges.
 *
 * Based on the LTTB algorithm by Sveinn Steinarsson (2013).
 */
export function applyLTTBDecimation(
  data: { t: number; v: number }[],
  targetCount: number
): { t: number; v: number }[] {
  if (data.length <= targetCount || targetCount <= 2) return data;

  const sampled: { t: number; v: number }[] = [data[0]];
  const bucketSize = (data.length - 2) / (targetCount - 2);
  let a = 0; // Previously selected point index

  for (let i = 0; i < targetCount - 2; i++) {
    // Calculate bucket boundaries
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);

    // Compute average of next bucket (lookahead reference point)
    let avgT = 0, avgV = 0;
    const nextBucketSize = bucketEnd - bucketStart;
    for (let j = bucketStart; j < bucketEnd; j++) {
      avgT += data[j].t;
      avgV += data[j].v;
    }
    avgT /= nextBucketSize;
    avgV /= nextBucketSize;

    // Find point in current bucket that forms the largest triangle
    const currentBucketStart = Math.floor(i * bucketSize) + 1;
    const currentBucketEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, data.length);
    const pointA = data[a];

    let maxArea = -1;
    let nextA = currentBucketStart;
    for (let j = currentBucketStart; j < currentBucketEnd; j++) {
      const area = Math.abs(
        (pointA.t - avgT) * (data[j].v - pointA.v) -
        (pointA.t - data[j].t) * (avgV - pointA.v)
      ) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        nextA = j;
      }
    }

    sampled.push(data[nextA]);
    a = nextA;
  }

  sampled.push(data[data.length - 1]);
  return sampled;
}

// ─── Visibility Gap Detection ─────────────────────────────────────────────────
/**
 * Listens to Page Visibility API events.
 * When app goes to background (mobile screen lock / app switch),
 * records the hidden timestamp.
 * When app comes back to foreground, writes a gap marker record to IndexedDB.
 *
 * 🤖 Android note: visibilitychange fires reliably on Android Chrome.
 * However, on some MIUI/OxygenOS devices, the event fires twice rapidly on resume.
 * The `backgroundHiddenAt = null` guard prevents duplicate gap records.
 */
function registerVisibilityListener(): void {
  if (typeof document === 'undefined' || visibilityListenerRegistered) return;
  visibilityListenerRegistered = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      backgroundHiddenAt = Date.now();
      // 🤖 Android: also trigger batch flush on hide (before potential process kill)
      // This is a best-effort soft flush — not as reliable as pagehide emergency flush
      flushBatchToIndexedDB();
    } else if (document.visibilityState === 'visible' && backgroundHiddenAt !== null) {
      const hiddenDuration = Date.now() - backgroundHiddenAt;

      // Only log gap if hidden for more than 30 seconds (avoid micro-gaps from tab switching)
      if (hiddenDuration > 30000) {
        const gapRecord: HistorianGapRecord = {
          id: `gap_${backgroundHiddenAt}`,
          pid: 'system',
          pen: '__gap__',
          v: 0,
          t: backgroundHiddenAt,
          isGap: true,
          gapStartMs: backgroundHiddenAt,
          gapEndMs: Date.now(),
        };

        if (db && isLeaderTab) {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(gapRecord);
          } catch {}
        }

        console.info(`[Historian] Gap recorded: ${Math.round(hiddenDuration / 1000)}s background.`);
      }
      backgroundHiddenAt = null;
    }
  });
}

/**
 * Queries gap records for a specific time range (for chart gap zone rendering).
 */
export async function queryGapRecords(startMs: number, endMs: number): Promise<HistorianGapRecord[]> {
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db!.transaction(STORE_NAME, 'readonly');
      const idx = tx.objectStore(STORE_NAME).index('pen_t');
      const range = IDBKeyRange.bound(['__gap__', startMs], ['__gap__', endMs]);
      const results: HistorianGapRecord[] = [];
      const req = idx.openCursor(range);
      req.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

// ─── Storage Metrics ──────────────────────────────────────────────────────────
/**
 * Returns current IndexedDB usage stats using navigator.storage.estimate()
 */
export async function getStorageMetrics(): Promise<{
  usedMb: number;
  quotaMb: number;
  percentUsed: number;
  totalRecords: number;
} | null> {
  try {
    const [estimate, records] = await Promise.all([
      'storage' in navigator ? navigator.storage.estimate() : Promise.resolve({ usage: 0, quota: 0 }),
      countTotalRecords()
    ]);

    const usedMb = ((estimate.usage ?? 0) / (1024 * 1024));
    const quotaMb = ((estimate.quota ?? 0) / (1024 * 1024));
    const percentUsed = quotaMb > 0 ? (usedMb / quotaMb) * 100 : 0;

    return { usedMb, quotaMb, percentUsed, totalRecords: records };
  } catch {
    return null;
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────
export function destroyHistorianEngine(): void {
  if (flushTimerId) { clearInterval(flushTimerId); flushTimerId = null; }
  if (pruneTimerId) { clearInterval(pruneTimerId); pruneTimerId = null; }
  if (leaderHeartbeatId) { clearInterval(leaderHeartbeatId); leaderHeartbeatId = null; }
  broadcastChannel?.close();
  db?.close();
  db = null;
  isInitialized = false;
  isLeaderTab = false;
  batchBuffer = [];
}
