import { HistorianAlarmEntry, HistorianStorageMetrics } from '../types';

const DB_NAME = 'TascAlarmHistorianDB';
const STORE_NAME = 'alarm_events';
const DB_VERSION = 1;

export interface HistorianConfig {
  maxRows: number; // 500 | 1000 | 2500 | 5000 | 10000
  maxStorageMb: number; // 1 | 5 | 10 | 50 | 100
  pruneStrategy: 'FIFO' | 'STORAGE_CAP';
}

const DEFAULT_CONFIG: HistorianConfig = {
  maxRows: 1000,
  maxStorageMb: 10,
  pruneStrategy: 'FIFO'
};

export function isCommunityEditionActive(): boolean {
  try {
    const role = localStorage.getItem('tasc_user_role');
    const ed = localStorage.getItem('tasc_product_edition');
    if (role === 'community' || ed === 'community') return true;

    const rawState = localStorage.getItem('tasc_studio_state');
    if (rawState) {
      const parsed = JSON.parse(rawState);
      if (parsed.userRole === 'community' || parsed.productEdition === 'community') {
        return true;
      }
    }
  } catch {}
  return false;
}

export function getHistorianConfig(): HistorianConfig {
  let cfg = { ...DEFAULT_CONFIG };
  try {
    const raw = localStorage.getItem('tasc_historian_config');
    if (raw) {
      cfg = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {}
  if (isCommunityEditionActive()) {
    cfg.maxRows = Math.min(cfg.maxRows, 50);
  }
  return cfg;
}

export function saveHistorianConfig(config: Partial<HistorianConfig>): HistorianConfig {
  const current = getHistorianConfig();
  const updated = { ...current, ...config };
  if (isCommunityEditionActive()) {
    updated.maxRows = Math.min(updated.maxRows, 50);
  }
  try {
    localStorage.setItem('tasc_historian_config', JSON.stringify(updated));
  } catch {}
  // Automatically enforce new limits immediately
  pruneFifoBuffer(updated.maxRows, updated.maxStorageMb);
  return updated;
}

// Internal memory cache for synchronous instant UI reactivity
let inMemoryHistory: HistorianAlarmEntry[] = [];
let isDbInitialized = false;
let dbInstance: IDBDatabase | null = null;
let useLocalStorageFallback = false;

/**
 * Formats byte size into human readable string (B, KB, MB)
 */
export function formatByteSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Estimates storage memory needed for a given row count
 */
export function estimateStorageForRows(rowCount: number): {
  estimatedBytes: number;
  formattedSize: string;
  recommendedMb: number;
} {
  const count = Math.max(1, rowCount || 1);
  const averageBytesPerRow = 350; // Average JSON byte size per industrial alarm entry
  const estimatedBytes = count * averageBytesPerRow;
  const recommendedMb = Math.max(1, Math.ceil((estimatedBytes * 1.5) / (1024 * 1024)));
  return {
    estimatedBytes,
    formattedSize: formatByteSize(estimatedBytes),
    recommendedMb
  };
}

/**
 * Calculates duration between triggerTime and resolvedTime/now
 */
export function calculateAlarmDuration(triggerTimeStr: string, resolvedTimeStr?: string | null): string {
  try {
    const start = new Date(triggerTimeStr).getTime();
    if (isNaN(start)) return 'ACTIVE';
    const end = resolvedTimeStr ? new Date(resolvedTimeStr).getTime() : Date.now();
    if (isNaN(end)) return 'ACTIVE';

    const diffMs = Math.max(0, end - start);
    const totalSec = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  } catch {
    return 'ACTIVE';
  }
}

/**
 * Initializes IndexedDB storage database with LocalStorage fallback
 */
export async function initAlarmHistorianDB(): Promise<boolean> {
  if (isDbInitialized) return true;
  if (typeof window === 'undefined') return false;

  if ('indexedDB' in window) {
    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
          const db = event.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('dashboardId', 'dashboardId', { unique: false });
            store.createIndex('alarmKey', 'alarmKey', { unique: false });
            store.createIndex('category', 'category', { unique: false });
            store.createIndex('triggerTime', 'triggerTime', { unique: false });
          }
        };

        request.onsuccess = (event: any) => {
          dbInstance = event.target.result as IDBDatabase;
          isDbInitialized = true;
          loadInitialHistoryFromIndexedDB().then(() => resolve(true));
        };

        request.onerror = () => {
          console.warn('IndexedDB unavailable, using LocalStorage fallback for Alarm Historian.');
          useLocalStorageFallback = true;
          loadFromLocalStorage();
          isDbInitialized = true;
          resolve(true);
        };
      } catch {
        useLocalStorageFallback = true;
        loadFromLocalStorage();
        isDbInitialized = true;
        resolve(true);
      }
    });
  } else {
    useLocalStorageFallback = true;
    loadFromLocalStorage();
    isDbInitialized = true;
    return true;
  }
}

function loadInitialHistoryFromIndexedDB(): Promise<void> {
  return new Promise((resolve) => {
    if (!dbInstance) {
      resolve();
      return;
    }
    try {
      const tx = dbInstance.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        inMemoryHistory = (request.result as HistorianAlarmEntry[]) || [];
        inMemoryHistory.sort((a, b) => new Date(b.triggerTime).getTime() - new Date(a.triggerTime).getTime());
        resolve();
      };
      request.onerror = () => {
        resolve();
      };
    } catch {
      resolve();
    }
  });
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('tasc_alarm_historian_db');
    if (raw) {
      inMemoryHistory = JSON.parse(raw);
    }
  } catch {
    inMemoryHistory = [];
  }
}

function saveToLocalStorage() {
  try {
    const cfg = getHistorianConfig();
    localStorage.setItem('tasc_alarm_historian_db', JSON.stringify(inMemoryHistory.slice(0, cfg.maxRows)));
  } catch {
    // quiet fallback
  }
}

function saveEntryToIndexedDB(entry: HistorianAlarmEntry) {
  if (!dbInstance) return;
  try {
    const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(entry);
  } catch (e) {
    console.warn('Failed to put item in IndexedDB:', e);
  }
}

function pruneFifoBuffer(maxRowsParam?: number, maxStorageMbParam?: number) {
  const cfg = getHistorianConfig();
  const maxRows = maxRowsParam || cfg.maxRows;
  const maxBytes = (maxStorageMbParam || cfg.maxStorageMb) * 1024 * 1024;

  let pruned = false;

  // 1. Row count pruning
  if (inMemoryHistory.length > maxRows) {
    inMemoryHistory = inMemoryHistory.slice(0, maxRows);
    pruned = true;
  }

  // 2. Storage bytes capacity pruning
  let currentBytes = new Blob([JSON.stringify(inMemoryHistory)]).size;
  while (inMemoryHistory.length > 50 && currentBytes > maxBytes) {
    inMemoryHistory.pop();
    currentBytes = new Blob([JSON.stringify(inMemoryHistory)]).size;
    pruned = true;
  }

  if (pruned) {
    if (useLocalStorageFallback) {
      saveToLocalStorage();
    } else if (dbInstance) {
      try {
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        inMemoryHistory.forEach(item => store.put(item));
      } catch {}
    }
  }
}

export function recordAlarmTriggerEvent(
  alarm: {
    alarmKey: string;
    panelId: string;
    panelName: string;
    dashboardId: string;
    zone: 'LOW' | 'MID' | 'HIGH' | 'TRIP' | 'FAULT';
    value: any;
    unit?: string;
    threshold?: number;
    message: string;
    color: string;
    timestamp: string;
    topic?: string;
    jsonPath?: string;
  }
): HistorianAlarmEntry {
  initAlarmHistorianDB();

  const cfg = getHistorianConfig();
  const nowISO = new Date().toISOString();

  const tagTopicStr = [alarm.topic, alarm.jsonPath].filter(Boolean).join(' | ') || alarm.alarmKey;

  const existingIdx = inMemoryHistory.findIndex(
    e => e.alarmKey === alarm.alarmKey && (e.status === 'ACTIVE_UNACK' || e.status === 'ACTIVE_ACK')
  );

  if (existingIdx >= 0) {
    return inMemoryHistory[existingIdx];
  }

  const newEntry: HistorianAlarmEntry = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    alarmKey: alarm.alarmKey,
    panelId: alarm.panelId,
    panelName: alarm.panelName || 'Equipment',
    dashboardId: alarm.dashboardId || 'global',
    category: alarm.zone,
    tagTopic: tagTopicStr,
    triggerValue: alarm.value,
    threshold: alarm.threshold,
    unit: alarm.unit || '',
    message: alarm.message,
    color: alarm.color,
    triggerTime: nowISO,
    ackTime: null,
    resolvedTime: null,
    duration: 'ACTIVE',
    status: 'ACTIVE_UNACK'
  };

  inMemoryHistory.unshift(newEntry);
  pruneFifoBuffer(cfg.maxRows, cfg.maxStorageMb);

  if (useLocalStorageFallback) {
    saveToLocalStorage();
  } else {
    saveEntryToIndexedDB(newEntry);
  }

  return newEntry;
}

export function recordAlarmAckEvent(alarmKey: string): void {
  initAlarmHistorianDB();
  const ackTimeISO = new Date().toISOString();

  let modified = false;
  inMemoryHistory.forEach(entry => {
    if (entry.alarmKey === alarmKey && !entry.ackTime) {
      entry.ackTime = ackTimeISO;
      entry.status = entry.resolvedTime ? 'RESOLVED_ACK' : 'ACTIVE_ACK';
      modified = true;
      if (dbInstance && !useLocalStorageFallback) {
        saveEntryToIndexedDB(entry);
      }
    }
  });

  if (modified && useLocalStorageFallback) {
    saveToLocalStorage();
  }
}

export function recordAlarmResolvedEvent(alarmKey: string): void {
  initAlarmHistorianDB();
  const resolvedTimeISO = new Date().toISOString();

  let modified = false;
  inMemoryHistory.forEach(entry => {
    if (entry.alarmKey === alarmKey && !entry.resolvedTime) {
      entry.resolvedTime = resolvedTimeISO;
      entry.duration = calculateAlarmDuration(entry.triggerTime, resolvedTimeISO);
      entry.status = entry.ackTime ? 'RESOLVED_ACK' : 'RESOLVED_UNACK';
      modified = true;
      if (dbInstance && !useLocalStorageFallback) {
        saveEntryToIndexedDB(entry);
      }
    }
  });

  if (modified && useLocalStorageFallback) {
    saveToLocalStorage();
  }
}

export function getAlarmHistory(
  dashboardId?: string,
  categoryFilter?: 'ALL' | 'TRIP_FAULT' | 'HIGH' | 'MID' | 'LOW' | 'ACTIVE' | 'RESOLVED',
  searchQuery?: string
): HistorianAlarmEntry[] {
  initAlarmHistorianDB();

  let result = [...inMemoryHistory];

  if (dashboardId && dashboardId !== 'all') {
    result = result.filter(e => e.dashboardId === dashboardId || e.dashboardId === 'global');
  }

  if (categoryFilter && categoryFilter !== 'ALL') {
    if (categoryFilter === 'TRIP_FAULT') {
      result = result.filter(e => e.category === 'TRIP' || e.category === 'FAULT');
    } else if (categoryFilter === 'ACTIVE') {
      result = result.filter(e => e.status === 'ACTIVE_UNACK' || e.status === 'ACTIVE_ACK');
    } else if (categoryFilter === 'RESOLVED') {
      result = result.filter(e => e.status === 'RESOLVED_UNACK' || e.status === 'RESOLVED_ACK');
    } else {
      result = result.filter(e => e.category === categoryFilter);
    }
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    result = result.filter(
      e =>
        e.panelName.toLowerCase().includes(q) ||
        e.tagTopic.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }

  return result;
}

export function clearAlarmHistory(dashboardId?: string): void {
  initAlarmHistorianDB();

  if (dashboardId && dashboardId !== 'all') {
    inMemoryHistory = inMemoryHistory.filter(e => e.dashboardId !== dashboardId);
  } else {
    inMemoryHistory = [];
  }

  if (useLocalStorageFallback) {
    saveToLocalStorage();
  } else if (dbInstance) {
    try {
      const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (!dashboardId || dashboardId === 'all') {
        store.clear();
      } else {
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result as HistorianAlarmEntry[];
          all.forEach(item => {
            if (item.dashboardId === dashboardId) {
              store.delete(item.id);
            }
          });
        };
      }
    } catch {
      // quiet fallback
    }
  }
}

export function getStorageMetrics(dashboardId?: string): HistorianStorageMetrics {
  initAlarmHistorianDB();
  const cfg = getHistorianConfig();

  const entries = getAlarmHistory(dashboardId);
  const totalRows = entries.length;

  const jsonString = JSON.stringify(entries);
  const usedBytes = new Blob([jsonString]).size;

  const percentUsed = Math.min(100, Math.round((totalRows / cfg.maxRows) * 100));
  const engineType = useLocalStorageFallback ? 'Mobile LocalStorage' : 'PC IndexedDB Storage Engine';

  return {
    usedBytes,
    formattedSize: formatByteSize(usedBytes),
    totalRows,
    maxRows: cfg.maxRows,
    maxStorageMb: cfg.maxStorageMb,
    percentUsed,
    engineType
  };
}
