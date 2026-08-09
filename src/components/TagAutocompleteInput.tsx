import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, TagType, TagRegistryEntry } from '../types';
import { getTagSuggestions, scanAppTags } from '../utils/tagManager';

interface TagAutocompleteInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  tagType: TagType; // 'read' | 'write'
  appState?: AppState;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
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
  helpText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isWrite = tagType === 'write';

  // Fetch all suggestions for this tag type
  const allSuggestions = useMemo(() => {
    if (!appState) return [];
    return getTagSuggestions(appState, tagType);
  }, [appState, tagType]);

  // Filter suggestions based on current input text
  const filteredSuggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (!query) return allSuggestions;
    return allSuggestions.filter(
      s => s.tagName.toLowerCase().includes(query) || s.parsingDefinition.toLowerCase().includes(query)
    );
  }, [allSuggestions, value]);

  // Check if current value exists in registry
  const existingRegistryEntry = useMemo(() => {
    if (!appState || !value.trim()) return null;
    const summary = scanAppTags(appState);
    return summary.tags.find(
      t => t.tagType === tagType && t.parsingDefinition.trim().toLowerCase() === value.trim().toLowerCase()
    ) || null;
  }, [appState, value, tagType]);

  // Handle outside clicks
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
    <div className="relative space-y-1" ref={containerRef}>
      {/* Label Header */}
      <div className="flex items-center justify-between">
        <label className={`text-xs font-semibold flex items-center space-x-1.5 ${isWrite ? 'text-indigo-400' : 'text-emerald-400'}`}>
          <i className={`fas ${isWrite ? 'fa-code-branch' : 'fa-code'} text-[10px]`}></i>
          <span>{label}</span>
          {isWrite && <span className="text-[10px] text-gray-400 font-normal ml-1">(Optional Pattern)</span>}
        </label>

        {/* Registry Match Status Badge */}
        {value.trim().length > 0 && (
          existingRegistryEntry ? (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1 shadow-sm">
              <i className="fas fa-check-circle text-[9px]"></i>
              <span>Tag Registry ({existingRegistryEntry.widgetsCount || 0} widget{(existingRegistryEntry.widgetsCount || 0) !== 1 ? 's' : ''})</span>
            </span>
          ) : (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1 shadow-sm">
              <i className="fas fa-sparkles text-[9px] text-amber-400 animate-pulse"></i>
              <span>New Tag (Registers on save)</span>
            </span>
          )
        )}
      </div>

      {/* Input Field Box */}
      <div className="relative border-b border-gray-700 py-1 flex items-center group focus-within:border-emerald-500 transition-colors">
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
          className={`w-full bg-transparent outline-none py-1.5 pr-14 font-mono text-sm ${isWrite ? 'text-indigo-200' : 'text-emerald-200'} placeholder-gray-600`}
          placeholder={placeholder || (isWrite ? 'e.g. {"val": "%v"}' : 'e.g. data.temperature')}
          required={required}
          autoComplete="off"
        />

        {/* Right-side actions */}
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

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`p-1 transition-colors text-xs cursor-pointer rounded ${isOpen ? 'text-emerald-400' : 'hover:text-emerald-300'}`}
            title="Toggle Tag Suggestions Dropdown"
          >
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
          </button>
        </div>
      </div>

      {helpText && (
        <p className="text-[11px] text-gray-400">{helpText}</p>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#161b22] border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-800/80 animate-in fade-in duration-150">
          
          {/* Header Bar */}
          <div className="px-3 py-1.5 bg-slate-900/90 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between sticky top-0 backdrop-blur z-10 border-b border-slate-800">
            <span className="flex items-center space-x-1.5">
              <i className={`fas ${isWrite ? 'fa-code-branch text-indigo-400' : 'fa-code text-emerald-400'}`}></i>
              <span>Tag Manager ({isWrite ? 'Write Tags' : 'Read Tags'})</span>
            </span>
            <span className="text-slate-500 font-normal">
              {filteredSuggestions.length} option{filteredSuggestions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* List of Suggestions */}
          <div className="py-1">
            {filteredSuggestions.length === 0 && !showCustomOption ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-1">
                <i className="fas fa-tags text-emerald-400 text-sm"></i>
                <span>No matching tags in Tag Manager.</span>
                <span className="text-[10px] text-slate-500">Type above to create a new tag.</span>
              </div>
            ) : (
              <>
                {filteredSuggestions.map((item, idx) => {
                  const isHighlighted = idx === highlightIndex;
                  const isCurrentSelected = item.parsingDefinition.trim() === value.trim();

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
                        <span className="text-[10px] text-slate-400 font-sans truncate">
                          Used in {item.widgetsCount || 0} widget{(item.widgetsCount || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Source Badge */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {item.sourceType === 'detected' ? (
                          <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            DETECTED
                          </span>
                        ) : item.sourceType === 'imported' ? (
                          <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            IMPORTED
                          </span>
                        ) : (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            MANUAL
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Inline "Create New Tag" Option */}
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
                      ✨ NEW TAG
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagAutocompleteInput;
