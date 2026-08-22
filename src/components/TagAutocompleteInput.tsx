import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, TagType, TagRegistryEntry } from '../types';
import { getTagSuggestions, scanAppTags, registerCustomTag } from '../utils/tagManager';

interface TagAutocompleteInputProps {
  name: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  tagType?: TagType; // 'read' | 'write' (optional, defaults to both)
  appState?: AppState;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  compact?: boolean;
  showBrowseButton?: boolean;
  className?: string;
}

export const TagAutocompleteInput: React.FC<TagAutocompleteInputProps> = ({
  name,
  label,
  value,
  onChange,
  tagType,
  appState,
  placeholder,
  required = false,
  helpText,
  compact = false,
  showBrowseButton = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalBrowserOpen, setIsModalBrowserOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'read' | 'write' | 'driver'>('all');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isWrite = tagType === 'write';

  // Fetch all suggestions for this tag type from both MQTT, custom tags, and Driver Tags
  const allSuggestions = useMemo(() => {
    if (!appState) return [];
    return getTagSuggestions(appState, tagType);
  }, [appState, tagType]);

  // Extract unique categories across all tags
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    allSuggestions.forEach(s => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [allSuggestions]);

  // Filter suggestions based on current input text for inline typeahead
  const filteredSuggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (!query) return allSuggestions.slice(0, 30); // Top 30 when empty
    return allSuggestions.filter(
      s => s.tagName.toLowerCase().includes(query) ||
           s.parsingDefinition.toLowerCase().includes(query) ||
           (s.category && s.category.toLowerCase().includes(query)) ||
           (s.description && s.description.toLowerCase().includes(query))
    );
  }, [allSuggestions, value]);

  // Modal browser filtered list
  const modalFilteredTags = useMemo(() => {
    let list = allSuggestions;

    // Filter by type tab
    if (selectedTypeFilter === 'read') {
      list = list.filter(t => t.tagType === 'read');
    } else if (selectedTypeFilter === 'write') {
      list = list.filter(t => t.tagType === 'write');
    } else if (selectedTypeFilter === 'driver') {
      list = list.filter(t => t.category?.includes('Driver') || t.sourceType === 'imported');
    }

    // Filter by category
    if (selectedCategoryFilter !== 'all') {
      list = list.filter(t => t.category === selectedCategoryFilter);
    }

    // Filter by search query
    const q = modalSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        t => t.tagName.toLowerCase().includes(q) ||
             t.parsingDefinition.toLowerCase().includes(q) ||
             (t.description && t.description.toLowerCase().includes(q)) ||
             (t.category && t.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allSuggestions, selectedTypeFilter, selectedCategoryFilter, modalSearchQuery]);

  // Check if current value exists in registry
  const existingRegistryEntry = useMemo(() => {
    if (!appState || !value.trim()) return null;
    const summary = scanAppTags(appState);
    return summary.tags.find(
      t => (!tagType || t.tagType === tagType) &&
           (t.parsingDefinition.trim().toLowerCase() === value.trim().toLowerCase() ||
            t.tagName.trim().toLowerCase() === value.trim().toLowerCase())
    ) || null;
  }, [appState, value, tagType]);

  // Handle outside clicks for inline dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (defStr: string) => {
    onChange(defStr);
    setIsOpen(false);
    setIsModalBrowserOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        return;
      }
    }

    const totalItems = filteredSuggestions.length + (value.trim() && !filteredSuggestions.some(s => s.parsingDefinition === value.trim()) ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev - 1 + totalItems) % Math.max(1, totalItems));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightIndex >= 0) {
        e.preventDefault();
        if (highlightIndex < filteredSuggestions.length) {
          handleSelectOption(filteredSuggestions[highlightIndex].parsingDefinition);
        } else if (value.trim()) {
          handleSelectOption(value.trim());
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const exactMatch = filteredSuggestions.some(s => s.parsingDefinition.trim().toLowerCase() === value.trim().toLowerCase());
  const showCustomOption = value.trim().length > 0 && !exactMatch;

  return (
    <div className={`relative space-y-1 ${className}`} ref={containerRef}>
      {/* Label Header */}
      {label && (
        <div className="flex items-center justify-between">
          <label className={`text-xs font-semibold flex items-center space-x-1.5 ${isWrite ? 'text-indigo-400' : 'text-emerald-400'}`}>
            <i className={`fas ${isWrite ? 'fa-code-branch' : 'fa-tags'} text-[10px]`}></i>
            <span>{label}</span>
            {isWrite && <span className="text-[10px] text-gray-400 font-normal ml-1">(Optional Pattern)</span>}
          </label>

          {/* Registry Match Status Badge */}
          {value.trim().length > 0 && (
            existingRegistryEntry ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1 shadow-sm font-mono">
                <i className="fas fa-check-circle text-[9px]"></i>
                <span>Registered Tag ({existingRegistryEntry.widgetsCount || 0} link{(existingRegistryEntry.widgetsCount || 0) !== 1 ? 's' : ''})</span>
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1 shadow-sm font-mono">
                <i className="fas fa-sparkles text-[9px] text-amber-400 animate-pulse"></i>
                <span>Custom / Direct Tag</span>
              </span>
            )
          )}
        </div>
      )}

      {/* Input Field Box */}
      <div className={`relative border-b border-gray-700 py-1 flex items-center group focus-within:border-emerald-500 transition-colors ${compact ? 'py-0.5' : ''}`}>
        <input
          ref={inputRef}
          name={name}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent outline-none py-1.5 pr-20 font-mono text-sm ${isWrite ? 'text-indigo-200' : 'text-emerald-200'} placeholder-gray-600 ${compact ? 'text-xs py-1' : ''}`}
          placeholder={placeholder || (isWrite ? 'e.g. {"val": "%v"}' : 'e.g. TAG_TEMPERATURE_01')}
          required={required}
          autoComplete="off"
        />

        {/* Right-side actions: Clear, Toggle Dropdown, Full Browse Modal Button */}
        <div className="absolute right-0 flex items-center space-x-1 text-gray-400">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
                setIsOpen(true);
              }}
              className="p-1 hover:text-rose-400 transition-colors text-xs cursor-pointer rounded"
              title="Clear tag"
            >
              <i className="fas fa-times"></i>
            </button>
          )}

          {/* Quick Dropdown Toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`p-1 transition-colors text-xs cursor-pointer rounded ${isOpen ? 'text-emerald-400' : 'hover:text-emerald-300'}`}
            title="Toggle Tag Suggestions Dropdown"
          >
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
          </button>

          {/* Tag Manager Visual Browser Button */}
          {showBrowseButton && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsModalBrowserOpen(true);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-sm ml-1"
              title="Open Full Tag Browser (Tag Manager)"
            >
              <i className="fas fa-folder-tree text-[10px]"></i>
              <span className="hidden sm:inline">Browse</span>
            </button>
          )}
        </div>
      </div>

      {helpText && (
        <p className="text-[11px] text-gray-400">{helpText}</p>
      )}

      {/* ─── INLINE TYPEAHEAD DROPDOWN ─────────────────────────────────── */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#161b22] border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-800/80 animate-in fade-in duration-150">
          
          {/* Header Bar */}
          <div className="px-3 py-1.5 bg-slate-900/90 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between sticky top-0 backdrop-blur z-10 border-b border-slate-800">
            <span className="flex items-center space-x-1.5">
              <i className={`fas ${isWrite ? 'fa-code-branch text-indigo-400' : 'fa-tags text-emerald-400'}`}></i>
              <span>Tag Manager ({isWrite ? 'Write Tags' : 'Telemetry Tags'})</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsModalBrowserOpen(true);
              }}
              className="text-emerald-400 hover:underline flex items-center space-x-1 font-bold lowercase"
            >
              <span>explore all ({allSuggestions.length})</span>
              <i className="fas fa-external-link-alt text-[8px]"></i>
            </button>
          </div>

          {/* List of Suggestions */}
          <div className="py-1">
            {filteredSuggestions.length === 0 && !showCustomOption ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-1">
                <i className="fas fa-tags text-emerald-400 text-sm"></i>
                <span>No matching tags found.</span>
                <span className="text-[10px] text-slate-500">Type above to use a custom tag or browse Tag Manager.</span>
              </div>
            ) : (
              <>
                {filteredSuggestions.map((item, idx) => {
                  const isHighlighted = idx === highlightIndex;
                  const isCurrentSelected = item.parsingDefinition.trim().toLowerCase() === value.trim().toLowerCase();

                  return (
                    <button
                      key={item.tagId}
                      type="button"
                      onClick={() => handleSelectOption(item.parsingDefinition)}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between space-x-2 text-xs transition-colors cursor-pointer ${
                        isCurrentSelected
                          ? 'bg-emerald-500/20 text-emerald-200 font-bold border-l-2 border-emerald-400'
                          : isHighlighted
                          ? 'bg-slate-800/90 text-white border-l-2 border-sky-400'
                          : 'hover:bg-slate-800/50 text-slate-200'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 flex-grow pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-100 truncate">{item.tagName}</span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono">
                            {item.category || 'General'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] truncate text-emerald-300/90 mt-0.5">
                          {item.parsingDefinition}
                        </span>
                        {item.description && (
                          <span className="text-[10px] text-slate-400 font-sans truncate">
                            {item.description}
                          </span>
                        )}
                      </div>

                      {/* Source Badge */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {item.sourceType === 'detected' ? (
                          <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            DETECTED
                          </span>
                        ) : item.sourceType === 'imported' ? (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            DRIVER TAG
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            CUSTOM
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Inline "Use Custom Tag" Option */}
                {showCustomOption && (
                  <button
                    type="button"
                    onClick={() => handleSelectOption(value.trim())}
                    onMouseEnter={() => setHighlightIndex(filteredSuggestions.length)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer border-t border-slate-800/80 ${
                      highlightIndex === filteredSuggestions.length
                        ? 'bg-emerald-500/20 text-emerald-200 font-bold border-l-2 border-emerald-400'
                        : 'bg-slate-900/40 hover:bg-slate-800/60 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <i className="fas fa-plus-circle text-emerald-400 text-xs shrink-0"></i>
                      <span className="font-mono truncate">Use "{value.trim()}"</span>
                    </div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                      ✨ BIND CUSTOM
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── FULL VISUAL TAG BROWSER MODAL (TAG MANAGER DIALOG) ─────────── */}
      {isModalBrowserOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <i className="fas fa-folder-tree text-base"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Industrial Tag Browser</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-normal">
                      {allSuggestions.length} Available Tags
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Browse, search, and bind live telemetry tags from PLC/SCADA Drivers, MQTT topics, and custom registers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalBrowserOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="p-4 bg-slate-900/60 border-b border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 w-full">
                  <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    placeholder="Search by tag name, address, category, protocol, or description..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
                    autoFocus
                  />
                  {modalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setModalSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedTypeFilter('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedTypeFilter === 'all' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({allSuggestions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTypeFilter('driver')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedTypeFilter === 'driver' ? 'bg-purple-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <i className="fas fa-microchip mr-1"></i>Driver Tags
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTypeFilter('read')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedTypeFilter === 'read' ? 'bg-sky-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Read
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTypeFilter('write')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      selectedTypeFilter === 'write' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Write
                  </button>
                </div>
              </div>

              {/* Category Pills */}
              {uniqueCategories.length > 0 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider shrink-0">Categories:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                      selectedCategoryFilter === 'all'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    All Categories
                  </button>
                  {uniqueCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                        selectedCategoryFilter === cat
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tag List Table */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-800/80 max-h-[50vh]">
              {modalFilteredTags.length === 0 ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <i className="fas fa-tags text-4xl text-slate-600"></i>
                  <p className="text-sm font-semibold">No tags match your search query.</p>
                  <p className="text-xs text-slate-500">Try searching for a different keyword or create a new custom tag.</p>
                </div>
              ) : (
                modalFilteredTags.map((tag) => {
                  const isSelected = tag.parsingDefinition.trim().toLowerCase() === value.trim().toLowerCase();

                  return (
                    <div
                      key={tag.tagId}
                      onClick={() => handleSelectOption(tag.parsingDefinition)}
                      className={`py-3 px-4 rounded-xl flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-emerald-500/15 border border-emerald-500/30'
                          : 'hover:bg-slate-800/70 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start space-x-3 min-w-0 pr-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          tag.sourceType === 'imported'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : tag.tagType === 'write'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          <i className={`fas ${
                            tag.sourceType === 'imported' ? 'fa-microchip' : tag.tagType === 'write' ? 'fa-code-branch' : 'fa-tag'
                          } text-xs`}></i>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                              {tag.tagName}
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              {tag.category || 'General'}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                              tag.tagType === 'write' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {tag.tagType.toUpperCase()}
                            </span>
                          </div>
                          <div className="font-mono text-xs text-emerald-400/90 mt-0.5 truncate">
                            {tag.parsingDefinition}
                          </div>
                          {tag.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                              {tag.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectOption(tag.parsingDefinition);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                            : 'bg-slate-800 group-hover:bg-emerald-600 text-slate-300 group-hover:text-white'
                        }`}
                      >
                        {isSelected ? (
                          <span><i className="fas fa-check mr-1.5"></i>Selected</span>
                        ) : (
                          <span>Bind Tag<i className="fas fa-arrow-right ml-1.5 text-[10px]"></i></span>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {modalFilteredTags.length} of {allSuggestions.length} tags</span>
              <button
                type="button"
                onClick={() => setIsModalBrowserOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagAutocompleteInput;
