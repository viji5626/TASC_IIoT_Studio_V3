import React, { useState, useMemo, useEffect } from 'react';
import { SymbolMetadata, SymbolStyleVariant } from '../types/symbol';
import { symbolRegistry } from '../services/symbolRegistryService';
import { generatePngPreviewFromSvg } from '../utils/symbolPreviewGenerator';
import { useAppContext } from '../store/AppContext';
import TagAutocompleteInput from './TagAutocompleteInput';
import TopicAutocompleteInput from './TopicAutocompleteInput';

export interface IndustrialSymbolItem {
  id: string;
  name: string;
  category: any;
  tags: string[];
  defaultW: number;
  defaultH: number;
  svgContent: string;
}

export const CATEGORIES = [
  { id: 'all', label: 'All Equipment', icon: 'fa-cubes' },
  { id: 'hvac', label: 'HVAC & Ducts', icon: 'fa-wind' },
  { id: 'mining', label: 'Mining & Crushers', icon: 'fa-gem' },
  { id: 'material_handling', label: 'Material Handling', icon: 'fa-boxes-packing' },
  { id: 'valves', label: 'Valves & Actuators', icon: 'fa-faucet' },
  { id: 'tanks', label: 'Tanks & Vessels', icon: 'fa-oil-can' },
  { id: 'motors', label: 'Motors & Drives', icon: 'fa-bolt' },
  { id: 'agitators', label: 'Agitators & Mixers', icon: 'fa-fan' },
  { id: 'silos', label: 'Silos & Hoppers', icon: 'fa-building' },
  { id: 'pumps', label: 'Pumps & Compressors', icon: 'fa-gears' },
  { id: 'heat_exchangers', label: 'Heat Exchangers & Boilers', icon: 'fa-fire' },
  { id: 'sensors', label: 'Sensors & Instruments', icon: 'fa-gauge-high' }
];

// Backward-compatible helper export for WebHmiCanvasView
export const convertSvgToPngDataUrl = (svgString: string, width = 400, height = 400): Promise<string> => {
  return generatePngPreviewFromSvg(svgString, { width, height });
};

// Export legacy array for any direct consumer
export const INDUSTRIAL_SYMBOLS: IndustrialSymbolItem[] = symbolRegistry.getAllSymbols().map(s => ({
  id: s.id,
  name: s.name,
  category: s.category.toLowerCase(),
  tags: s.tags,
  defaultW: s.defaultW,
  defaultH: s.defaultH,
  svgContent: s.svgContent || ''
}));

interface SymbolLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (
    symbol: IndustrialSymbolItem,
    format: 'svg' | 'png',
    bindingConfig?: { dataSourceMode?: 'driver' | 'mqtt'; driverTagId?: string; topic?: string }
  ) => void;
}

export const SymbolLibraryModal: React.FC<SymbolLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol
}) => {
  const { appState } = useAppContext();
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [variantFilter, setVariantFilter] = useState<'all' | 'flat2d' | '3d'>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'favorites' | 'recent'>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolMetadata | null>(null);
  const [bindingSourceMode, setBindingSourceMode] = useState<'driver' | 'mqtt'>('driver');
  const [targetBindingTag, setTargetBindingTag] = useState<string>('');
  const [previewBg, setPreviewBg] = useState<'dark' | 'grid' | 'light'>('dark');
  const [sizePreset, setSizePreset] = useState<'default' | 'sm' | 'md' | 'lg' | 'hero'>('default');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => symbolRegistry.getFavoriteIds());

  // Sectors & categories from registry
  const sectors = useMemo(() => symbolRegistry.getSectors(), []);
  const totalCount = useMemo(() => symbolRegistry.getAllSymbols().length, []);

  // Filtered symbols query
  const filteredSymbols = useMemo(() => {
    return symbolRegistry.querySymbols({
      query: searchQuery,
      sector: selectedSector !== 'all' ? selectedSector : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      styleVariant: variantFilter,
      tags: activeTag ? [activeTag] : undefined,
      favoritesOnly: viewMode === 'favorites',
      recentOnly: viewMode === 'recent'
    });
  }, [searchQuery, selectedSector, selectedCategory, variantFilter, activeTag, viewMode]);

  // Set default selection on load or filter change
  useEffect(() => {
    if (filteredSymbols.length > 0) {
      if (!selectedSymbol || !filteredSymbols.some(s => s.id === selectedSymbol.id)) {
        setSelectedSymbol(filteredSymbols[0]);
      }
    } else {
      setSelectedSymbol(null);
    }
  }, [filteredSymbols]);

  if (!isOpen) return null;

  const getEffectiveDimensions = (sym: SymbolMetadata) => {
    const baseW = sym.defaultW || 120;
    const baseH = sym.defaultH || 120;
    const aspect = baseW / baseH;

    switch (sizePreset) {
      case 'sm': return { w: 48, h: Math.round(48 / aspect) };
      case 'md': return { w: 96, h: Math.round(96 / aspect) };
      case 'lg': return { w: 192, h: Math.round(192 / aspect) };
      case 'hero': return { w: 384, h: Math.round(384 / aspect) };
      default: return { w: baseW, h: baseH };
    }
  };

  const handleInsert = (symbol: SymbolMetadata, format: 'svg' | 'png') => {
    symbolRegistry.addRecent(symbol.id);

    const bindingConfig = {
      dataSourceMode: bindingSourceMode,
      driverTagId: bindingSourceMode === 'driver' ? (targetBindingTag.trim() || undefined) : undefined,
      topic: bindingSourceMode === 'mqtt' ? (targetBindingTag.trim() || undefined) : undefined
    };

    const dims = getEffectiveDimensions(symbol);

    const item: IndustrialSymbolItem = {
      id: symbol.id,
      name: symbol.name,
      category: symbol.category.toLowerCase(),
      tags: symbol.tags,
      defaultW: dims.w,
      defaultH: dims.h,
      svgContent: symbol.svgContent || ''
    };

    onSelectSymbol(item, format, bindingConfig);
  };

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    symbolRegistry.toggleFavorite(id);
    setFavoriteIds(symbolRegistry.getFavoriteIds());
  };

  const counterpartVariant = selectedSymbol ? symbolRegistry.getCounterpartVariant(
    selectedSymbol.id,
    selectedSymbol.styleVariant === 'flat2d' ? '3d' : 'flat2d'
  ) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-7xl h-[92vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden">
        
        {/* ── Top Header & Global Search Bar ── */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <i className="fas fa-industry text-sky-400 text-lg"></i>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">Industrial Graphics Library</h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-mono font-bold">
                  {totalCount}+ Symbols
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                  2D / 3D Vector
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                ASHRAE HVAC, Mining, Material Handling, Process Equipment & Sensors
              </p>
            </div>
          </div>

          {/* Center Search Input */}
          <div className="flex-1 max-w-md min-w-[240px] relative">
            <i className="fas fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by equipment, tag, standard (e.g. duct, crusher, fan, pump)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <i className="fas fa-xmark text-xs"></i>
              </button>
            )}
          </div>

          {/* Top Actions: 2D/3D Filter & Close */}
          <div className="flex items-center space-x-2">
            {/* 2D / 3D Toggle Pills */}
            <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setVariantFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  variantFilter === 'all' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setVariantFilter('flat2d')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                  variantFilter === 'flat2d' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-vector-square text-[10px]"></i>
                <span>2D Vector</span>
              </button>
              <button
                type="button"
                onClick={() => setVariantFilter('3d')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 ${
                  variantFilter === '3d' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-cube text-[10px]"></i>
                <span>3D Shaded</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-all cursor-pointer"
            >
              <i className="fas fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* ── Main 3-Pane Body ── */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ═══ LEFT PANE: Sector & Category Tree (250px) ═══ */}
          <div className="w-60 border-r border-slate-800 bg-slate-950/60 flex flex-col shrink-0 overflow-y-auto p-3 space-y-3">
            
            {/* Quick Views: All / Favorites / Recent */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setViewMode('all');
                  setSelectedSector('all');
                  setSelectedCategory('all');
                  setActiveTag(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'all' && selectedSector === 'all' && selectedCategory === 'all'
                    ? 'bg-sky-500 text-slate-950 font-black shadow-lg shadow-sky-500/20'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <i className="fas fa-border-all text-xs"></i>
                  <span>All Symbols</span>
                </span>
                <span className="text-[10px] opacity-75 font-mono">{totalCount}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('favorites');
                  setSelectedSector('all');
                  setSelectedCategory('all');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'favorites'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/20'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <i className="fas fa-star text-xs text-amber-400"></i>
                  <span>Favorites</span>
                </span>
                <span className="text-[10px] opacity-75 font-mono">{favoriteIds.length}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('recent');
                  setSelectedSector('all');
                  setSelectedCategory('all');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'recent'
                    ? 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-400/20'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <i className="fas fa-clock-rotate-left text-xs text-emerald-400"></i>
                  <span>Recently Used</span>
                </span>
              </button>
            </div>

            <div className="h-px bg-slate-800 my-1"></div>

            {/* Industrial Sectors List */}
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold px-2 mb-1.5 flex items-center justify-between">
                <span>Equipment Sectors</span>
                <i className="fas fa-layer-group text-[10px]"></i>
              </div>
              <div className="space-y-1">
                {sectors.map((sec) => {
                  const isSecSelected = selectedSector === sec.name;
                  return (
                    <div key={sec.name} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('all');
                          setSelectedSector(isSecSelected ? 'all' : sec.name);
                          setSelectedCategory('all');
                          setActiveTag(null);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          isSecSelected
                            ? 'bg-sky-500/20 text-sky-300 font-extrabold border border-sky-500/30'
                            : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                        }`}
                      >
                        <span className="truncate pr-1">{sec.name}</span>
                        <span className="text-[10px] font-mono opacity-60 shrink-0">{sec.count}</span>
                      </button>

                      {/* Subcategory tree under active sector */}
                      {isSecSelected && sec.categories.length > 0 && (
                        <div className="pl-3 py-1 space-y-0.5 border-l border-sky-500/30 ml-2">
                          {sec.categories.map((cat) => (
                            <button
                              key={cat.name}
                              type="button"
                              onClick={() => setSelectedCategory(cat.name)}
                              className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] transition-all ${
                                selectedCategory === cat.name
                                  ? 'bg-sky-500 text-slate-950 font-bold'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
                              }`}
                            >
                              <span className="truncate pr-1">{cat.name}</span>
                              <span className="text-[9px] font-mono opacity-70">{cat.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ═══ CENTER PANE: Symbols Grid & Filter Chips ═══ */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950/40">
            
            {/* Filter Bar */}
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-900/40">
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400 font-medium">Showing:</span>
                <span className="font-bold text-white">
                  {filteredSymbols.length} symbol{filteredSymbols.length !== 1 ? 's' : ''}
                </span>
                {selectedSector !== 'all' && (
                  <span className="px-2 py-0.5 bg-sky-500/20 border border-sky-500/40 text-sky-300 rounded text-[10px] font-mono">
                    {selectedSector}
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded text-[10px] font-mono">
                    {selectedCategory}
                  </span>
                )}
              </div>

              {/* Sizing Chips */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px] font-mono">
                <span className="text-slate-400 px-1.5 font-bold">Size:</span>
                {(['default', 'sm', 'md', 'lg', 'hero'] as const).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSizePreset(preset)}
                    className={`px-1.5 py-0.5 rounded capitalize font-bold transition-all ${
                      sizePreset === preset ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset === 'default' ? 'Orig' : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Symbol Cards */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {filteredSymbols.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shadow-inner">
                    <i className="fas fa-magnifying-glass text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-300">No matching industrial symbols found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Try searching with different keywords, clear active category filters, or switch between 2D and 3D styles.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSector('all');
                      setSelectedCategory('all');
                      setVariantFilter('all');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredSymbols.map((sym) => {
                    const isSelected = selectedSymbol?.id === sym.id;
                    const isFav = favoriteIds.includes(sym.id);

                    return (
                      <div
                        key={sym.id}
                        onClick={() => setSelectedSymbol(sym)}
                        className={`group relative rounded-2xl border p-2.5 flex flex-col transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/10 border-sky-500 shadow-xl shadow-sky-500/10 ring-1 ring-sky-500'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        {/* Top Badges: Style + Favorite Button */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            sym.styleVariant === '3d'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {sym.styleVariant === '3d' ? '3D' : '2D'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(e, sym.id)}
                            className={`p-1 rounded-lg transition-all ${
                              isFav ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                            }`}
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <i className={`${isFav ? 'fas' : 'far'} fa-star text-xs`}></i>
                          </button>
                        </div>

                        {/* Thumbnail Viewport */}
                        <div className="w-full aspect-square bg-slate-950 rounded-xl p-2 flex items-center justify-center relative overflow-hidden border border-slate-800/80 group-hover:border-slate-700">
                          <div
                            className="w-full h-full flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200"
                            dangerouslySetInnerHTML={{ __html: sym.svgContent || '' }}
                          />
                        </div>

                        {/* Name & Category */}
                        <div className="mt-2 min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-sky-300 transition-colors" title={sym.name}>
                            {sym.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            {sym.category}
                          </p>
                        </div>

                        {/* Hover Quick Action Toolbar */}
                        <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInsert(sym, 'svg');
                            }}
                            className="flex-1 py-1 bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 border border-sky-500/40 rounded-lg text-[9px] font-extrabold transition-all text-center cursor-pointer"
                            title="Insert Vector SVG"
                          >
                            + SVG
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInsert(sym, 'png');
                            }}
                            className="flex-1 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 rounded-lg text-[9px] font-extrabold transition-all text-center cursor-pointer"
                            title="Insert PNG"
                          >
                            + PNG
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ═══ RIGHT PANE: Detail & Inspection Preview (320px) ═══ */}
          <div className="w-80 border-l border-slate-800 bg-slate-950/80 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
            {selectedSymbol ? (
              <>
                {/* Preview Box with Background Switcher */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                      Live Vector Preview
                    </span>
                    <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5 text-[9px]">
                      <button
                        type="button"
                        onClick={() => setPreviewBg('dark')}
                        className={`px-1.5 py-0.5 rounded ${previewBg === 'dark' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500'}`}
                      >
                        Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewBg('grid')}
                        className={`px-1.5 py-0.5 rounded ${previewBg === 'grid' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500'}`}
                      >
                        Grid
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewBg('light')}
                        className={`px-1.5 py-0.5 rounded ${previewBg === 'light' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500'}`}
                      >
                        Light
                      </button>
                    </div>
                  </div>

                  <div className={`w-full h-48 rounded-2xl border border-slate-800 p-4 flex items-center justify-center relative overflow-hidden ${
                    previewBg === 'dark' ? 'bg-slate-950' : previewBg === 'light' ? 'bg-slate-200' : 'bg-slate-900 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px]'
                  }`}>
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: selectedSymbol.svgContent || '' }}
                    />
                  </div>
                </div>

                {/* Title & Category Info */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-white">{selectedSymbol.name}</h3>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] shrink-0 font-bold">
                      {selectedSymbol.styleVariant.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {selectedSymbol.sector} &gt; {selectedSymbol.category}
                  </p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                    ID: <code className="text-sky-300">{selectedSymbol.id}</code>
                  </p>
                </div>

                {/* 2D <-> 3D Switch Button (if counterpart exists) */}
                {counterpartVariant && (
                  <button
                    type="button"
                    onClick={() => setSelectedSymbol(counterpartVariant)}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <i className="fas fa-arrows-rotate text-xs"></i>
                    <span>Switch to {counterpartVariant.styleVariant === '3d' ? '3D Model' : '2D Schematic'}</span>
                  </button>
                )}

                {/* Insertion Dimensions Preview */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Insert Dimensions:</span>
                  <span className="text-sky-400 font-bold">
                    {getEffectiveDimensions(selectedSymbol).w} × {getEffectiveDimensions(selectedSymbol).h} px
                  </span>
                </div>

                {/* Target Telemetry Binding Configuration */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                      Live Telemetry Binding
                    </span>
                    <div className="flex bg-slate-950 border border-slate-800 rounded p-0.5 text-[9px]">
                      <button
                        type="button"
                        onClick={() => setBindingSourceMode('driver')}
                        className={`px-1.5 py-0.5 rounded ${bindingSourceMode === 'driver' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                      >
                        Driver Tag
                      </button>
                      <button
                        type="button"
                        onClick={() => setBindingSourceMode('mqtt')}
                        className={`px-1.5 py-0.5 rounded ${bindingSourceMode === 'mqtt' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                      >
                        MQTT Topic
                      </button>
                    </div>
                  </div>

                  {bindingSourceMode === 'driver' ? (
                    <TagAutocompleteInput
                      name="symbol_binding_tag"
                      label=""
                      value={targetBindingTag}
                      onChange={(val) => setTargetBindingTag(val)}
                      tagType="read"
                      appState={appState}
                      compact={true}
                      placeholder="e.g. MODBUS_HOLDING_40001 (or auto)"
                    />
                  ) : (
                    <TopicAutocompleteInput
                      name="symbol_binding_topic"
                      label=""
                      value={targetBindingTag}
                      onChange={(val) => setTargetBindingTag(val)}
                      direction="subscribe"
                      appState={appState}
                      placeholder="e.g. scada/equipment/telemetry"
                    />
                  )}
                </div>

                {/* Primary Canvas Insertion Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleInsert(selectedSymbol, 'svg')}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-sky-500/20 cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <i className="fas fa-vector-square"></i>
                    <span>Insert as SVG Vector</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsert(selectedSymbol, 'png')}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <i className="fas fa-file-image"></i>
                    <span>Insert as PNG Image</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-600">
                <i className="fas fa-hand-pointer text-3xl mb-2"></i>
                <span className="text-xs">Select a symbol to preview and insert</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
