/**
 * Static & Local Memory Tag Service
 * Provides persistent memory registers, recipe parameters, and setpoints
 * stored in browser LocalStorage / IndexedDB and synced to backend SQLite.
 */

const STORAGE_KEY = 'tasc_static_asset_tags_v1';

export interface StaticTagEntry {
  tagId: string;
  path: string;
  value: string | number | boolean;
  dataType: 'Float' | 'Integer' | 'Boolean' | 'String';
  updatedAt: string;
}

class StaticTagService {
  private memoryCache: Map<string, StaticTagEntry> = new Map();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Initializes cache from localStorage
   */
  public loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: StaticTagEntry[] = JSON.parse(raw);
        this.memoryCache.clear();
        parsed.forEach(entry => this.memoryCache.set(entry.tagId, entry));
      }
      this.initialized = true;
    } catch (e) {
      console.warn('[StaticTagService] Failed to load local static tags:', e);
      this.initialized = true;
    }
  }

  /**
   * Saves cache to localStorage
   */
  private persist(): void {
    try {
      const list = Array.from(this.memoryCache.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[StaticTagService] Failed to persist static tags:', e);
    }
  }

  /**
   * Reads a static tag value by tagId or path
   */
  public getTagValue(tagIdOrPath: string): string | number | boolean | undefined {
    if (!this.initialized) this.loadFromStorage();
    
    // Direct TagID match
    const entry = this.memoryCache.get(tagIdOrPath);
    if (entry !== undefined) return entry.value;

    // Search by Path (e.g. "Plant/Pumps/Pump_01/Speed_SP")
    for (const val of this.memoryCache.values()) {
      if (val.path.toLowerCase() === tagIdOrPath.toLowerCase()) {
        return val.value;
      }
    }
    return undefined;
  }

  /**
   * Writes/updates a static tag value
   */
  public setTagValue(
    tagId: string,
    path: string,
    value: string | number | boolean,
    dataType: 'Float' | 'Integer' | 'Boolean' | 'String' = 'Float'
  ): void {
    let castedVal: string | number | boolean = value;

    if (dataType === 'Float') {
      castedVal = parseFloat(String(value)) || 0;
    } else if (dataType === 'Integer') {
      castedVal = parseInt(String(value), 10) || 0;
    } else if (dataType === 'Boolean') {
      castedVal = String(value).toLowerCase() === 'true' || value === 1 || value === true;
    } else {
      castedVal = String(value);
    }

    const entry: StaticTagEntry = {
      tagId,
      path,
      value: castedVal,
      dataType,
      updatedAt: new Date().toISOString()
    };

    this.memoryCache.set(tagId, entry);
    this.persist();

    // Dispatch global event for reactive HMI canvas and Alarm update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tasc_static_tag_updated', {
          detail: entry
        })
      );
    }
  }

  /**
   * Retrieves all static tags
   */
  public getAllStaticTags(): StaticTagEntry[] {
    if (!this.initialized) this.loadFromStorage();
    return Array.from(this.memoryCache.values());
  }
}

export const staticTagService = new StaticTagService();
