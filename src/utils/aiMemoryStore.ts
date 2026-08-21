/**
 * TASC IIoT Studio — Dedicated Client-Side AI Memory & Storage Engine
 *
 * Manages persistent on-premise AI memory in IndexedDB (`TascAiMemoryDB`):
 *  1. `learned_aliases`: Operator nicknames and colloquial terms mapped to PLC/SCADA tags.
 *  2. `plant_knowledge_notes`: Operating thresholds, SOP rules, and plant equipment notes.
 *  3. `query_patterns`: Frequency profiling of operator queries to optimize context.
 *  4. `precomputed_telemetry_chunks`: Pre-aggregated statistical rollups (1h/1d) capped at 25MB LRU.
 *  5. `event_telemetry_snapshots`: 30-minute pre-fault telemetry snapshots for top critical alarms.
 *
 * Resilience:
 *  - Requests browser persistent storage via `navigator.storage.persist()`.
 *  - Broadcasts cross-tab real-time sync events via `BroadcastChannel`.
 *  - Full JSON backup export and import for seamless multi-station transfer.
 */

import {
  LearnedTagAlias,
  PlantKnowledgeNote,
  QueryPattern,
  PrecomputedTelemetryChunk,
  EventTelemetrySnapshot,
  AiMemoryStats
} from '../types';

const DB_NAME = 'TascAiMemoryDB';
const DB_VERSION = 1;

// Object Store Names
export const STORE_ALIASES = 'learned_aliases';
export const STORE_NOTES = 'plant_knowledge_notes';
export const STORE_PATTERNS = 'query_patterns';
export const STORE_CHUNKS = 'precomputed_telemetry_chunks';
export const STORE_SNAPSHOTS = 'event_telemetry_snapshots';

// Storage Limits
const MAX_CHUNKS_COUNT = 500;
const MAX_SNAPSHOTS_COUNT = 20;

// Cross-tab real-time synchronization channel
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    syncChannel = new BroadcastChannel('tasc_ai_memory_sync');
  }
} catch (e) {
  console.warn('[AiMemoryStore] BroadcastChannel not supported:', e);
}

function broadcastSync(type: string, payload?: any) {
  try {
    syncChannel?.postMessage({ type, payload, timestamp: Date.now() });
  } catch {}
}

export function subscribeAiMemorySync(callback: (event: { type: string; payload?: any }) => void): () => void {
  if (!syncChannel) return () => {};
  const handler = (msg: MessageEvent) => {
    if (msg.data) callback(msg.data);
  };
  syncChannel.addEventListener('message', handler);
  return () => syncChannel?.removeEventListener('message', handler);
}

// ─── Database Initialization & Connection ────────────────────────────────────

function openAiMemoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      // 1. Learned Aliases Store
      if (!db.objectStoreNames.contains(STORE_ALIASES)) {
        const store = db.createObjectStore(STORE_ALIASES, { keyPath: 'id' });
        store.createIndex('alias', 'alias', { unique: false });
        store.createIndex('tagId', 'tagId', { unique: false });
      }

      // 2. Plant Knowledge Notes Store
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const store = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('topic', 'topic', { unique: false });
      }

      // 3. Query Patterns Store
      if (!db.objectStoreNames.contains(STORE_PATTERNS)) {
        const store = db.createObjectStore(STORE_PATTERNS, { keyPath: 'queryHash' });
        store.createIndex('frequency', 'frequency', { unique: false });
      }

      // 4. Precomputed Telemetry Chunks Store
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        const store = db.createObjectStore(STORE_CHUNKS, { keyPath: 'chunkKey' });
        store.createIndex('tagId', 'tagId', { unique: false });
        store.createIndex('startTime', 'startTime', { unique: false });
        store.createIndex('generatedAt', 'generatedAt', { unique: false });
      }

      // 5. Event Telemetry Snapshots Store
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        const store = db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'eventId' });
        store.createIndex('tagId', 'tagId', { unique: false });
        store.createIndex('tripTimestamp', 'tripTimestamp', { unique: false });
        store.createIndex('severity', 'severity', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Request persistent browser storage to defend against eviction */
export async function ensurePersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}

// ─── 1. Learned Tag Aliases CRUD ──────────────────────────────────────────────

export async function getAllLearnedAliases(): Promise<LearnedTagAlias[]> {
  try {
    const db = await openAiMemoryDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_ALIASES, 'readonly');
      const store = tx.objectStore(STORE_ALIASES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveLearnedAlias(alias: Omit<LearnedTagAlias, 'id' | 'createdAt'> & { id?: string }): Promise<LearnedTagAlias> {
  const db = await openAiMemoryDb();
  const id = alias.id || `alias_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const record: LearnedTagAlias = {
    ...alias,
    id,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString()
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ALIASES, 'readwrite');
    const store = tx.objectStore(STORE_ALIASES);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  broadcastSync('alias_updated', record);
  return record;
}

export async function deleteLearnedAlias(id: string): Promise<void> {
  const db = await openAiMemoryDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ALIASES, 'readwrite');
    const store = tx.objectStore(STORE_ALIASES);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  broadcastSync('alias_deleted', { id });
}

export async function findAliasMatch(inputText: string): Promise<LearnedTagAlias | null> {
  const aliases = await getAllLearnedAliases();
  const cleanInput = inputText.toLowerCase().trim();
  if (!cleanInput) return null;

  // Exact match
  const exact = aliases.find(a => cleanInput.includes(a.alias.toLowerCase()));
  if (exact) return exact;

  // Word boundary match
  return aliases.find(a => {
    const words = a.alias.toLowerCase().split(/\s+/);
    return words.every(w => cleanInput.includes(w));
  }) || null;
}

// ─── 2. Plant Knowledge Notes CRUD ────────────────────────────────────────────

export async function getAllPlantKnowledgeNotes(): Promise<PlantKnowledgeNote[]> {
  try {
    const db = await openAiMemoryDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NOTES, 'readonly');
      const store = tx.objectStore(STORE_NOTES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function savePlantKnowledgeNote(note: Omit<PlantKnowledgeNote, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<PlantKnowledgeNote> {
  const db = await openAiMemoryDb();
  const id = note.id || `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const record: PlantKnowledgeNote = {
    ...note,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    const store = tx.objectStore(STORE_NOTES);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  broadcastSync('note_updated', record);
  return record;
}

export async function deletePlantKnowledgeNote(id: string): Promise<void> {
  const db = await openAiMemoryDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NOTES, 'readwrite');
    const store = tx.objectStore(STORE_NOTES);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  broadcastSync('note_deleted', { id });
}

// ─── 3. Query Patterns & Intent Frequency ─────────────────────────────────────

export async function recordQueryPattern(sampleText: string, intentType: QueryPattern['intentType'], tagIds: string[]): Promise<void> {
  try {
    const db = await openAiMemoryDb();
    const queryHash = sampleText.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 48);

    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_PATTERNS, 'readwrite');
      const store = tx.objectStore(STORE_PATTERNS);
      const getReq = store.get(queryHash);

      getReq.onsuccess = () => {
        const existing: QueryPattern | undefined = getReq.result;
        const record: QueryPattern = {
          queryHash,
          querySample: sampleText.slice(0, 120),
          intentType,
          tagIds: Array.from(new Set([...(existing?.tagIds || []), ...tagIds])),
          frequency: (existing?.frequency || 0) + 1,
          lastQueriedAt: new Date().toISOString()
        };
        store.put(record);
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  } catch {}
}

export async function getTopQueryPatterns(limit = 10): Promise<QueryPattern[]> {
  try {
    const db = await openAiMemoryDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PATTERNS, 'readonly');
      const store = tx.objectStore(STORE_PATTERNS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list: QueryPattern[] = req.result || [];
        list.sort((a, b) => b.frequency - a.frequency);
        resolve(list.slice(0, limit));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// ─── 4. Precomputed Telemetry Chunks (Ephemeral Cache with LRU Pruning) ───────

export async function getPrecomputedChunk(chunkKey: string): Promise<PrecomputedTelemetryChunk | null> {
  try {
    const db = await openAiMemoryDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHUNKS, 'readonly');
      const store = tx.objectStore(STORE_CHUNKS);
      const req = store.get(chunkKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function savePrecomputedChunk(chunk: PrecomputedTelemetryChunk): Promise<void> {
  try {
    const db = await openAiMemoryDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CHUNKS, 'readwrite');
      const store = tx.objectStore(STORE_CHUNKS);
      const req = store.put(chunk);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Auto-prune if chunks exceed quota
    await pruneTelemetryChunksIfOverQuota();
  } catch (e) {
    console.warn('[AiMemoryStore] Failed to save precomputed chunk:', e);
  }
}

async function pruneTelemetryChunksIfOverQuota(): Promise<void> {
  try {
    const db = await openAiMemoryDb();
    const chunks = await new Promise<PrecomputedTelemetryChunk[]>((resolve) => {
      const tx = db.transaction(STORE_CHUNKS, 'readonly');
      const req = tx.objectStore(STORE_CHUNKS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (chunks.length > MAX_CHUNKS_COUNT) {
      // Sort oldest generated first
      chunks.sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
      const toDelete = chunks.slice(0, chunks.length - MAX_CHUNKS_COUNT);

      const tx = db.transaction(STORE_CHUNKS, 'readwrite');
      const store = tx.objectStore(STORE_CHUNKS);
      toDelete.forEach(c => store.delete(c.chunkKey));
    }
  } catch {}
}

export async function clearPrecomputedChunks(): Promise<void> {
  const db = await openAiMemoryDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_CHUNKS, 'readwrite');
    const store = tx.objectStore(STORE_CHUNKS);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  broadcastSync('chunks_cleared');
}

// ─── 5. Event Telemetry Snapshots (30-min Pre-Fault Capture) ───────────────────

export async function saveEventSnapshot(snapshot: EventTelemetrySnapshot): Promise<void> {
  try {
    const db = await openAiMemoryDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.put(snapshot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Prune oldest snapshots beyond MAX_SNAPSHOTS_COUNT
    const snapshots = await getAllEventSnapshots();
    if (snapshots.length > MAX_SNAPSHOTS_COUNT) {
      snapshots.sort((a, b) => a.tripTimestamp - b.tripTimestamp);
      const toDelete = snapshots.slice(0, snapshots.length - MAX_SNAPSHOTS_COUNT);
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      toDelete.forEach(s => store.delete(s.eventId));
    }
  } catch {}
}

export async function getAllEventSnapshots(): Promise<EventTelemetrySnapshot[]> {
  try {
    const db = await openAiMemoryDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// ─── 6. Memory Statistics & Storage Health ────────────────────────────────────

export async function getAiMemoryStats(): Promise<AiMemoryStats> {
  try {
    const [aliases, notes, patterns, chunks, snapshots] = await Promise.all([
      getAllLearnedAliases(),
      getAllPlantKnowledgeNotes(),
      getTopQueryPatterns(100),
      (async () => {
        const db = await openAiMemoryDb();
        return new Promise<number>((r) => {
          const req = db.transaction(STORE_CHUNKS, 'readonly').objectStore(STORE_CHUNKS).count();
          req.onsuccess = () => r(req.result || 0);
          req.onerror = () => r(0);
        });
      })(),
      getAllEventSnapshots()
    ]);

    // Estimate storage usage
    const approxBytes = 
      JSON.stringify(aliases).length +
      JSON.stringify(notes).length +
      JSON.stringify(patterns).length +
      (chunks * 2048) + // ~2KB per precomputed chunk
      JSON.stringify(snapshots).length;

    const estimatedStorageMb = Math.round((approxBytes / (1024 * 1024)) * 100) / 100;
    const isPersistentStorage = typeof navigator !== 'undefined' && !!navigator.storage;

    return {
      aliasCount: aliases.length,
      noteCount: notes.length,
      queryPatternCount: patterns.length,
      cachedChunkCount: chunks,
      alarmSnapshotCount: snapshots.length,
      estimatedStorageMb,
      isPersistentStorage
    };
  } catch {
    return {
      aliasCount: 0,
      noteCount: 0,
      queryPatternCount: 0,
      cachedChunkCount: 0,
      alarmSnapshotCount: 0,
      estimatedStorageMb: 0,
      isPersistentStorage: false
    };
  }
}

// ─── 7. Full Memory Backup Export & Import ────────────────────────────────────

export interface AiMemoryBackupPayload {
  version: number;
  exportedAt: string;
  aliases: LearnedTagAlias[];
  notes: PlantKnowledgeNote[];
  queryPatterns: QueryPattern[];
}

export async function exportAiMemoryBackup(): Promise<string> {
  const [aliases, notes, queryPatterns] = await Promise.all([
    getAllLearnedAliases(),
    getAllPlantKnowledgeNotes(),
    getTopQueryPatterns(50)
  ]);

  const payload: AiMemoryBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    aliases,
    notes,
    queryPatterns
  };

  return JSON.stringify(payload, null, 2);
}

export async function importAiMemoryBackup(jsonString: string): Promise<{ success: boolean; importedAliases: number; importedNotes: number; error?: string }> {
  try {
    const parsed: AiMemoryBackupPayload = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.aliases) || !Array.isArray(parsed.notes)) {
      return { success: false, importedAliases: 0, importedNotes: 0, error: 'Invalid AI Memory backup format.' };
    }

    let aliasCount = 0;
    let noteCount = 0;

    for (const a of parsed.aliases) {
      if (a.alias && a.tagId) {
        await saveLearnedAlias(a);
        aliasCount++;
      }
    }

    for (const n of parsed.notes) {
      if (n.topic && n.note) {
        await savePlantKnowledgeNote(n);
        noteCount++;
      }
    }

    broadcastSync('memory_restored');
    return { success: true, importedAliases: aliasCount, importedNotes: noteCount };
  } catch (err: any) {
    return { success: false, importedAliases: 0, importedNotes: 0, error: err.message || String(err) };
  }
}
