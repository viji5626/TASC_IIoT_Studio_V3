import {
  SymbolMetadata,
  SymbolManifest,
  SymbolSectorNode,
  SymbolCategoryNode,
  SymbolFilterOptions,
  SymbolSearchIndexEntry,
  SymbolTagIndex
} from '../types/symbol';
import { LEGACY_SYMBOLS } from '../symbols/packs/legacy/legacySymbols';
import { HVAC_SYMBOLS } from '../symbols/packs/hvac/hvacSymbols';
import { MINING_SYMBOLS } from '../symbols/packs/mining/miningSymbols';
import { MATERIAL_HANDLING_SYMBOLS } from '../symbols/packs/materialHandling/materialHandlingSymbols';
import { FAN_SYMBOLS } from '../symbols/packs/fans/fanSymbols';
import { PULLEY_SYMBOLS } from '../symbols/packs/pulleys/pulleySymbols';
import { PUMP_SYMBOLS } from '../symbols/packs/pumps/pumpSymbols';
import { DAMPER_SYMBOLS } from '../symbols/packs/dampers/damperSymbols';
import { MOTOR_SYMBOLS } from '../symbols/packs/motors/motorSymbols';
import { VALVE_SYMBOLS } from '../symbols/packs/valves/valveSymbols';
import { DUCT_SYMBOLS } from '../symbols/packs/ducts/ductSymbols';

const FAVORITES_STORAGE_KEY = 'tasc_favorite_symbols';
const RECENTS_STORAGE_KEY = 'tasc_recent_symbols';
const MAX_RECENTS = 30;

class SymbolRegistryService {
  private symbolsMap: Map<string, SymbolMetadata> = new Map();
  private searchIndex: SymbolSearchIndexEntry[] = [];
  private tagIndex: SymbolTagIndex = {};
  private sectorsList: SymbolSectorNode[] = [];
  private categoriesList: SymbolCategoryNode[] = [];
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initializes the in-memory registry, search tokens, tag indices, and category tree.
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // 1. Register all built-in industrial equipment packs
    const allInitialSymbols: SymbolMetadata[] = [
      ...LEGACY_SYMBOLS,
      ...HVAC_SYMBOLS,
      ...FAN_SYMBOLS,
      ...PULLEY_SYMBOLS,
      ...PUMP_SYMBOLS,
      ...VALVE_SYMBOLS,
      ...DUCT_SYMBOLS,
      ...DAMPER_SYMBOLS,
      ...MOTOR_SYMBOLS,
      ...MINING_SYMBOLS,
      ...MATERIAL_HANDLING_SYMBOLS
    ];

    this.registerSymbols(allInitialSymbols);
    this.isInitialized = true;
  }

  /**
   * Register an array of symbols into the registry.
   */
  public registerSymbols(symbols: SymbolMetadata[]): void {
    for (const sym of symbols) {
      this.symbolsMap.set(sym.id, sym);
      if (sym.legacyId) {
        this.symbolsMap.set(sym.legacyId, sym);
      }
    }

    this.rebuildIndices();
  }

  /**
   * Rebuilds fast search index, tag index, and sector/category hierarchical tree.
   */
  private rebuildIndices(): void {
    const uniqueSymbols = Array.from(new Set(this.symbolsMap.values()));
    
    // 1. Build Search Index & Tag Index
    this.searchIndex = [];
    this.tagIndex = {};

    const sectorMap: Map<string, { name: string; count: number; categories: Map<string, { name: string; count: number; subcategories: Map<string, number> }> }> = new Map();
    const catMap: Map<string, SymbolCategoryNode> = new Map();

    for (const sym of uniqueSymbols) {
      // Tokenize for fast search
      const tokenSet = new Set<string>();
      const addTokens = (str?: string) => {
        if (!str) return;
        str.toLowerCase().split(/[\s._\-/]+/).filter(Boolean).forEach(t => tokenSet.add(t));
      };

      addTokens(sym.id);
      addTokens(sym.name);
      addTokens(sym.sector);
      addTokens(sym.category);
      addTokens(sym.subcategory);
      sym.tags.forEach(t => addTokens(t));

      this.searchIndex.push({
        id: sym.id,
        name: sym.name,
        tokens: Array.from(tokenSet),
        sector: sym.sector,
        category: sym.category,
        subcategory: sym.subcategory,
        styleVariant: sym.styleVariant,
        tags: sym.tags
      });

      // Tag index
      sym.tags.forEach(tag => {
        const normTag = tag.toLowerCase().trim();
        if (!this.tagIndex[normTag]) this.tagIndex[normTag] = [];
        if (!this.tagIndex[normTag].includes(sym.id)) {
          this.tagIndex[normTag].push(sym.id);
        }
      });

      // Category / Sector aggregations
      const secName = sym.sector || 'General Equipment';
      const catName = sym.category || 'Miscellaneous';
      const subCatName = sym.subcategory || 'General';

      if (!sectorMap.has(secName)) {
        sectorMap.set(secName, { name: secName, count: 0, categories: new Map() });
      }
      const secData = sectorMap.get(secName)!;
      secData.count++;

      if (!secData.categories.has(catName)) {
        secData.categories.set(catName, { name: catName, count: 0, subcategories: new Map() });
      }
      const catData = secData.categories.get(catName)!;
      catData.count++;

      const subCount = catData.subcategories.get(subCatName) || 0;
      catData.subcategories.set(subCatName, subCount + 1);

      // Flat categories map
      const catKey = `${secName}::${catName}`;
      if (!catMap.has(catKey)) {
        catMap.set(catKey, {
          id: catKey,
          name: catName,
          sector: secName,
          icon: this.getCategoryIcon(catName),
          count: 0
        });
      }
      catMap.get(catKey)!.count++;
    }

    // Build Sector Nodes
    this.sectorsList = Array.from(sectorMap.entries()).map(([secName, sec]) => ({
      id: secName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: secName,
      icon: this.getSectorIcon(secName),
      count: sec.count,
      categories: Array.from(sec.categories.entries()).map(([cName, c]) => ({
        id: `${secName}::${cName}`,
        name: cName,
        icon: this.getCategoryIcon(cName),
        sector: secName,
        count: c.count,
        subcategories: Array.from(c.subcategories.entries()).map(([subName, count]) => ({
          id: `${secName}::${cName}::${subName}`,
          name: subName,
          count
        }))
      }))
    }));

    this.categoriesList = Array.from(catMap.values());
  }

  private getSectorIcon(sector: string): string {
    const s = sector.toLowerCase();
    if (s.includes('hvac')) return 'fa-wind';
    if (s.includes('mining')) return 'fa-gem';
    if (s.includes('material') || s.includes('handling')) return 'fa-boxes-packing';
    if (s.includes('pump')) return 'fa-gears';
    if (s.includes('valve')) return 'fa-faucet';
    if (s.includes('tank')) return 'fa-oil-can';
    if (s.includes('motor')) return 'fa-bolt';
    if (s.includes('power')) return 'fa-plug-circle-bolt';
    if (s.includes('water')) return 'fa-water';
    if (s.includes('heat') || s.includes('cool')) return 'fa-temperature-half';
    if (s.includes('sensor')) return 'fa-gauge-high';
    return 'fa-cubes';
  }

  private getCategoryIcon(category: string): string {
    const c = category.toLowerCase();
    if (c.includes('duct')) return 'fa-grip-lines';
    if (c.includes('fan') || c.includes('blower')) return 'fa-fan';
    if (c.includes('damper')) return 'fa-table-cells';
    if (c.includes('ahu')) return 'fa-server';
    if (c.includes('diffuser') || c.includes('grille')) return 'fa-border-all';
    if (c.includes('chiller')) return 'fa-snowflake';
    if (c.includes('crusher')) return 'fa-hammer';
    if (c.includes('conveyor')) return 'fa-arrows-left-right';
    if (c.includes('feeder')) return 'fa-forward';
    if (c.includes('screen')) return 'fa-filter';
    if (c.includes('packaging')) return 'fa-box-open';
    if (c.includes('capper') || c.includes('filling')) return 'fa-bottle-water';
    if (c.includes('valve')) return 'fa-faucet';
    if (c.includes('tank') || c.includes('silo')) return 'fa-oil-can';
    if (c.includes('motor')) return 'fa-bolt';
    return 'fa-cube';
  }

  /**
   * Get all registered symbols
   */
  public getAllSymbols(): SymbolMetadata[] {
    return Array.from(new Set(this.symbolsMap.values()));
  }

  /**
   * Look up a symbol by ID or legacy ID
   */
  public getSymbol(id?: string): SymbolMetadata | undefined {
    if (!id) return undefined;
    return this.symbolsMap.get(id);
  }

  /**
   * Get Category tree & Sector hierarchy
   */
  public getSectors(): SymbolSectorNode[] {
    return this.sectorsList;
  }

  public getCategories(): SymbolCategoryNode[] {
    return this.categoriesList;
  }

  /**
   * Query filtered symbols with ultra-fast search indexing
   */
  public querySymbols(options: SymbolFilterOptions = {}): SymbolMetadata[] {
    const {
      query = '',
      sector,
      category,
      subcategory,
      styleVariant = 'all',
      tags = [],
      favoritesOnly = false,
      recentOnly = false
    } = options;

    const favorites = favoritesOnly ? new Set(this.getFavoriteIds()) : null;
    const recents = recentOnly ? new Set(this.getRecentIds()) : null;

    const queryTokens = query.toLowerCase().trim().split(/[\s._\-/]+/).filter(Boolean);

    let candidateIds: Set<string> | null = null;

    // Filter by search query tokens
    if (queryTokens.length > 0) {
      candidateIds = new Set();
      for (const entry of this.searchIndex) {
        const matchesAll = queryTokens.every(qToken => 
          entry.tokens.some(t => t.includes(qToken)) || entry.name.toLowerCase().includes(qToken)
        );
        if (matchesAll) {
          candidateIds.add(entry.id);
        }
      }
    }

    // Filter by tag index
    if (tags.length > 0) {
      const tagMatches = new Set<string>();
      tags.forEach(tag => {
        const list = this.tagIndex[tag.toLowerCase().trim()] || [];
        list.forEach(id => tagMatches.add(id));
      });
      if (candidateIds === null) {
        candidateIds = tagMatches;
      } else {
        candidateIds = new Set([...candidateIds].filter(id => tagMatches.has(id)));
      }
    }

    const all = this.getAllSymbols();

    return all.filter(sym => {
      if (candidateIds !== null && !candidateIds.has(sym.id)) return false;
      if (favorites && !favorites.has(sym.id)) return false;
      if (recents && !recents.has(sym.id)) return false;

      if (sector && sector !== 'all' && sym.sector.toLowerCase() !== sector.toLowerCase()) return false;
      if (category && category !== 'all' && sym.category.toLowerCase() !== category.toLowerCase()) return false;
      if (subcategory && subcategory !== 'all' && sym.subcategory?.toLowerCase() !== subcategory.toLowerCase()) return false;

      if (styleVariant !== 'all' && sym.styleVariant !== styleVariant) return false;

      return true;
    });
  }

  /**
   * Find counterpart 2D or 3D variant of a symbol
   */
  public getCounterpartVariant(symbolId: string, targetVariant: 'flat2d' | '3d'): SymbolMetadata | undefined {
    const sym = this.getSymbol(symbolId);
    if (!sym) return undefined;
    if (sym.styleVariant === targetVariant) return sym;

    let targetId = '';
    if (sym.id.endsWith('.flat2d') && targetVariant === '3d') {
      targetId = sym.id.replace(/\.flat2d$/, '.3d');
    } else if (sym.id.endsWith('.3d') && targetVariant === 'flat2d') {
      targetId = sym.id.replace(/\.3d$/, '.flat2d');
    }

    return targetId ? this.getSymbol(targetId) : undefined;
  }

  // --- Favorites Management ---
  public getFavoriteIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public isFavorite(id: string): boolean {
    return this.getFavoriteIds().includes(id);
  }

  public toggleFavorite(id: string): boolean {
    if (typeof window === 'undefined') return false;
    const favs = this.getFavoriteIds();
    let next: string[];
    let isFavNow = false;
    if (favs.includes(id)) {
      next = favs.filter(f => f !== id);
    } else {
      next = [id, ...favs];
      isFavNow = true;
    }
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    return isFavNow;
  }

  // --- Recent Symbols Management ---
  public getRecentIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public addRecent(id: string): void {
    if (typeof window === 'undefined') return;
    const recents = this.getRecentIds().filter(r => r !== id);
    const updated = [id, ...recents].slice(0, MAX_RECENTS);
    try {
      localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  /**
   * Export Global Manifest for external indexing and automated builds
   */
  public generateManifest(): SymbolManifest {
    const all = this.getAllSymbols();
    const flat2dCount = all.filter(s => s.styleVariant === 'flat2d').length;
    const threeDCount = all.filter(s => s.styleVariant === '3d').length;

    return {
      version: '1.0.0',
      schemaVersion: '2.0',
      generatedAt: new Date().toISOString(),
      totalSymbols: all.length,
      sectors: this.sectorsList,
      categories: this.categoriesList,
      variants: {
        flat2d: flat2dCount,
        '3d': threeDCount
      },
      symbols: all
    };
  }
}

export const symbolRegistry = new SymbolRegistryService();
