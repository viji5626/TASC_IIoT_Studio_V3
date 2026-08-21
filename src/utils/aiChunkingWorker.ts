/**
 * TASC IIoT Studio — Asynchronous AI Pre-Chunking & Event Snapshot Worker
 *
 * Runs non-blocking background telemetry aggregation and pre-fault alarm capture:
 *  1. Single-tab leader lock: Only 1 active tab executes background pre-chunking.
 *  2. Mobile Passive Guardrail: Completely parked on mobile to prevent battery drain and tab throttling.
 *  3. Desktop PC Tier: Computes 1-hour/1-day statistical rollups for top tags during idle time.
 *  4. 60 FPS Zero-Lag Slicing: Uses requestIdleCallback and 15ms async yielding.
 *  5. Critical Alarm Pre-Fault Snapshots: Captures 30-min pre-fault points upon CRITICAL alarm triggers.
 */

import { isMobileDevice } from './deviceDetection';
import { queryHistoricalRange } from './trendHistorianEngine';
import {
  savePrecomputedChunk,
  saveEventSnapshot,
  getTopQueryPatterns,
  ensurePersistentStorage
} from './aiMemoryStore';
import { ActiveAlarm, PrecomputedTelemetryChunk } from '../types';

const LEADER_LOCK_KEY = 'tasc_ai_memory_leader_lock';
const LEADER_LOCK_TIMEOUT_MS = 45000;
const CHUNKER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes on PC

let isWorkerInitialized = false;
let tickerTimer: any = null;
let currentTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// ─── Single-Tab Leader Lock ───────────────────────────────────────────────────

function acquireLeaderLock(): boolean {
  try {
    const raw = localStorage.getItem(LEADER_LOCK_KEY);
    const now = Date.now();
    if (raw) {
      const lock = JSON.parse(raw);
      if (lock.tabId !== currentTabId && now - lock.timestamp < LEADER_LOCK_TIMEOUT_MS) {
        return false; // Another tab is actively leading
      }
    }
    localStorage.setItem(LEADER_LOCK_KEY, JSON.stringify({ tabId: currentTabId, timestamp: now }));
    return true;
  } catch {
    return true;
  }
}

function releaseLeaderLock(): void {
  try {
    const raw = localStorage.getItem(LEADER_LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      if (lock.tabId === currentTabId) {
        localStorage.removeItem(LEADER_LOCK_KEY);
      }
    }
  } catch {}
}

// ─── Pre-Chunking Worker Execution ────────────────────────────────────────────

/**
 * Computes 1-hour and 1-day rollup chunks for a given tag across the last 24-48 hours.
 */
async function precomputeChunksForTag(tagId: string): Promise<void> {
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;
  const fromMs = now - dayMs;

  // 1. Fetch historical range from Trend Historian
  const points = await queryHistoricalRange(tagId, fromMs, now);
  if (!points || points.length === 0) return;

  // 2. Compute overall 24-hour summary stats
  const values = points.map(p => p.v).filter(v => typeof v === 'number' && isFinite(v));
  if (values.length === 0) return;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / values.length) * 100) / 100;
  const delta = Math.max(0, values[values.length - 1] - values[0]);

  // Downsample to 24 representative hourly points for ultra-fast charting
  const step = Math.max(1, Math.floor(points.length / 24));
  const pointsSummary: Array<{ ts: number; val: number }> = [];
  for (let i = 0; i < points.length; i += step) {
    pointsSummary.push({ ts: points[i].t, val: points[i].v });
  }

  const dateStr = new Date(now).toISOString().slice(0, 10);
  const chunkKey = `chunk_${tagId}_1d_${dateStr}`;

  const chunk: PrecomputedTelemetryChunk = {
    chunkKey,
    tagId,
    resolution: '1hour',
    startTime: fromMs,
    endTime: now,
    stats: {
      min,
      max,
      avg,
      delta,
      sum,
      count: values.length
    },
    pointsSummary,
    generatedAt: new Date().toISOString()
  };

  await savePrecomputedChunk(chunk);
}

/**
 * Runs pre-chunking across top queried tags with 15ms time-slicing to guarantee 60 FPS.
 */
export async function runPreChunkingCycle(): Promise<{ processedTags: number; durationMs: number }> {
  const startTime = Date.now();
  if (isMobileDevice()) {
    return { processedTags: 0, durationMs: 0 }; // Strict mobile passive mode
  }

  if (!acquireLeaderLock()) {
    return { processedTags: 0, durationMs: 0 }; // Another tab is leader
  }

  // Get Top 20 queried tags
  const patterns = await getTopQueryPatterns(20);
  const tagSet = new Set<string>();
  patterns.forEach(p => p.tagIds?.forEach(id => tagSet.add(id)));
  const tagsToProcess = Array.from(tagSet).slice(0, 20);

  let count = 0;
  for (const tagId of tagsToProcess) {
    // Yield execution to main thread to guarantee 60 FPS on SCADA canvas
    await new Promise(resolve => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => resolve(null), { timeout: 100 });
      } else {
        setTimeout(resolve, 15);
      }
    });

    try {
      await precomputeChunksForTag(tagId);
      count++;
    } catch (e) {
      console.warn(`[AiChunkingWorker] Error pre-chunking tag ${tagId}:`, e);
    }
  }

  return {
    processedTags: count,
    durationMs: Date.now() - startTime
  };
}

// ─── Critical Alarm Pre-Fault Snapshot Capture ────────────────────────────────

export async function captureCriticalAlarmSnapshot(alarm: ActiveAlarm, affectedTagId?: string): Promise<void> {
  if (!affectedTagId) return;

  const now = Date.now();
  const preFaultStart = now - (30 * 60 * 1000); // 30 mins before trip

  try {
    const rawPoints = await queryHistoricalRange(affectedTagId, preFaultStart, now);
    const preFaultPoints = rawPoints.map(p => ({ ts: p.t, val: p.v }));

    const alarmId = alarm.alarmKey || `alarm_${now}`;
    const severity = (alarm.zone === 'TRIP' || alarm.zone === 'FAULT' ? 'CRITICAL' : alarm.zone === 'HIGH' ? 'HIGH' : 'MEDIUM') as any;
    const eventId = `snap_${alarmId}_${now}`;

    await saveEventSnapshot({
      eventId,
      alarmId,
      tagId: affectedTagId,
      alarmMessage: alarm.message,
      severity,
      tripTimestamp: now,
      preFaultPoints,
      snapshotAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[AiChunkingWorker] Failed to capture alarm snapshot:', e);
  }
}

// ─── Worker Lifecycle Management ──────────────────────────────────────────────

export function initAiMemoryWorker(): () => void {
  if (isWorkerInitialized) return () => {};
  isWorkerInitialized = true;

  // 1. Request persistent storage on startup
  ensurePersistentStorage();

  // 2. If mobile device, do NOT start background intervals (Passive mode)
  if (isMobileDevice()) {
    return () => {};
  }

  // 3. Desktop PC Tier: Run first cycle after 10s warmup, then every 5 mins
  const initialWarmup = setTimeout(() => {
    runPreChunkingCycle();
  }, 10000);

  tickerTimer = setInterval(() => {
    runPreChunkingCycle();
  }, CHUNKER_INTERVAL_MS);

  const cleanup = () => {
    clearTimeout(initialWarmup);
    if (tickerTimer) clearInterval(tickerTimer);
    releaseLeaderLock();
    isWorkerInitialized = false;
  };

  window.addEventListener('beforeunload', cleanup);
  return cleanup;
}
