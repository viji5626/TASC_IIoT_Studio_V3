import { EventEmitter } from 'events';

export interface PollingTag {
  tagId: string;
  panelId?: string;
  pollRate: number;
  protocol: string;
  tag: any;
  connection: any;
}

export interface TagValue {
  value: any;
  quality: 'good' | 'bad' | 'uncertain';
  qualityText?: string;
  timestamp: string;
}

export type ReadHandler = (protocol: string, tag: any, connection: any, panelId?: string) => Promise<{value: any, quality: string, qualityText: string, error?: string}>;

class PollingManager extends EventEmitter {
  private tags: Map<string, PollingTag> = new Map();
  public cache: Map<string, TagValue> = new Map();
  
  private isPolling = false;
  private pollIntervalMs = 100; 
  private timer: NodeJS.Timeout | null = null;
  private lastPollTimes: Map<string, number> = new Map();
  private readHandler: ReadHandler | null = null;
  private batchReadHandler: ((protocol: string, tags: PollingTag[], connection: any) => Promise<Array<{tagId: string, value: any, quality: string, qualityText: string, error?: string}>>) | null = null;
  private pendingTags: Set<string> = new Set(); // Tags currently being read to prevent overlapping reads

  constructor() {
    super();
  }

  public setReadHandler(handler: ReadHandler) {
    this.readHandler = handler;
  }

  public setBatchReadHandler(handler: (protocol: string, tags: PollingTag[], connection: any) => Promise<Array<{tagId: string, value: any, quality: string, qualityText: string, error?: string}>>) {
    this.batchReadHandler = handler;
  }

  public syncTags(newTags: PollingTag[], merge: boolean = true) {
    console.log(`[PollingManager] Syncing ${newTags.length} tags to background poller (merge: ${merge})...`);
    if (!merge) {
      this.tags.clear();
    }
    for (const t of newTags) {
      if (!t.tagId) continue;
      const protocol = (t.protocol || t.tag?.protocol || t.connection?.protocol || '').toLowerCase();
      const pollRate = Math.max(50, Number(t.pollRate || t.tag?.pollRate || t.connection?.pollRate) || 1000);
      this.tags.set(t.tagId, {
        ...t,
        protocol,
        pollRate
      });
    }
    if (!this.isPolling) {
      this.start();
    }
  }

  public getCachedValue(tagId: string): TagValue | undefined {
    return this.cache.get(tagId);
  }

  public getAllCachedValues(): Record<string, TagValue> {
    const result: Record<string, TagValue> = {};
    for (const [k, v] of Array.from(this.cache.entries())) {
      result[k] = v;
    }
    return result;
  }

  public start() {
    if (this.isPolling) return;
    this.isPolling = true;
    this.timer = setInterval(() => this.tick(), this.pollIntervalMs);
    console.log(`[PollingManager] Started background polling engine at ${this.pollIntervalMs}ms tick.`);
  }

  public stop() {
    this.isPolling = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[PollingManager] Stopped background polling engine.');
  }

  private async tick() {
    if (!this.readHandler) return;
    const now = Date.now();
    const timestampStr = new Date().toISOString();

    const tagsByConnection = new Map<string, PollingTag[]>();
    for (const tag of Array.from(this.tags.values())) {
      const connId = tag.connection?.connectionId || 'unknown';
      if (!tagsByConnection.has(connId)) {
        tagsByConnection.set(connId, []);
      }
      tagsByConnection.get(connId)!.push(tag);
    }

    for (const [connId, tags] of Array.from(tagsByConnection.entries())) {
      const minPollRate = Math.min(...tags.map(t => Math.max(50, Number(t.pollRate) || 1000)));
      const lastPoll = this.lastPollTimes.get(connId) || 0;
      
      if (now - lastPoll < minPollRate) {
        continue;
      }
      this.lastPollTimes.set(connId, now);
      
      this.executeProtocolBlockRead(tags, timestampStr).catch(err => {
        console.error('[PollingManager] Block read error:', err);
      });
    }
  }

  private async executeProtocolBlockRead(tags: PollingTag[], timestampStr: string) {
    if (!tags.length) return;
    const protocol = (tags[0].protocol || tags[0].connection?.protocol || tags[0].tag?.protocol || '').toLowerCase();
    const connection = tags[0].connection;

    // Filter out tags that are already pending
    const tagsToRead = tags.filter(t => !this.pendingTags.has(t.tagId));
    if (!tagsToRead.length) return;
    
    // Mark as pending
    for (const t of tagsToRead) {
      this.pendingTags.add(t.tagId);
    }

    try {
      const supportedBatchProtocols = new Set(['modbus_tcp', 'modbus_rtu', 'opcua', 'melsec', 's7', 'ethernet_ip', 'iec61850']);
      if (this.batchReadHandler && supportedBatchProtocols.has(protocol)) {
        // Use batch handler for supported protocols
        const results = await this.batchReadHandler(protocol, tagsToRead, connection);
        for (const res of results) {
          this.updateCacheAndEmit(res.tagId, res.value, res.quality, res.qualityText, timestampStr);
        }
      } else if (this.readHandler) {
        // Fallback to sequential read with robust protocol resolution
        for (const t of tagsToRead) {
          try {
            const proto = (t.protocol || t.tag?.protocol || t.connection?.protocol || protocol || '').toLowerCase();
            const res = await this.readHandler(proto, t.tag, t.connection, t.panelId);
            this.updateCacheAndEmit(t.tagId, res.value, res.quality, res.qualityText, timestampStr);
          } catch (err: any) {
             // Silently handle top level throws
          }
        }
      }
    } catch (err: any) {
      console.error(`[PollingManager] Batch read error for protocol ${protocol}:`, err);
    } finally {
      for (const t of tagsToRead) {
        this.pendingTags.delete(t.tagId);
      }
    }
  }

  private updateCacheAndEmit(tagId: string, value: any, quality: string, qualityText: string, timestampStr: string) {
    const oldCache = this.cache.get(tagId);
    const tagObj = this.tags.get(tagId);
    const tagName = tagObj?.tag?.tagName || tagObj?.tag?.name || '';
    const panelId = tagObj?.panelId || tagObj?.tag?.panelId || '';

    const newValue: TagValue = {
      value: value,
      quality: quality as 'good'|'bad'|'uncertain',
      qualityText: qualityText,
      timestamp: timestampStr
    };

    this.cache.set(tagId, newValue);
    this.emit('tagChanged', { tagId, tagName, panelId, ...newValue });
  }
}

export const pollingManager = new PollingManager();
