import React, { useState, useMemo, useEffect } from 'react';
import { AppState, TagRegistryEntry, TagType, TagSourceType } from '../types';
import {
  scanAppTags,
  registerCustomTag,
  bulkUpdateTags,
  exportTagsToCsv,
  parseTagsCsv
} from '../utils/tagManager';
import { CoachMarkOverlay } from './CoachMarkOverlay';
import { isTourSuppressed } from '../utils/tourRegistry';

interface TagManagerViewProps {
  onBack: () => void;
  appState: AppState;
  onUpdateAppState: (newState: AppState) => void;
  userRole?: string;
  productEdition?: string;
}

type TabType = 'all' | 'detected_read' | 'detected_write' | 'imported_read' | 'imported_write';

export const TagManagerView: React.FC<TagManagerViewProps> = ({
  onBack,
  appState,
  onUpdateAppState
}) => {
  const [isMqttTagTourOpen, setIsMqttTagTourOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'read' | 'write'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'detected' | 'imported_manual'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (!isTourSuppressed('tag_manager')) {
      setIsMqttTagTourOpen(true);
    }
  }, []);

  // Selection for Bulk Editor
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagRegistryEntry | null>(null);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [inspectingTagWidgets, setInspectingTagWidgets] = useState<TagRegistryEntry | null>(null);

  // New/Edit Tag Form State
  const [formData, setFormData] = useState({
    tagName: '',
    tagType: 'read' as TagType,
    parsingDefinition: '',
    category: 'General',
    description: ''
  });

  // Bulk Edit Form State
  const [bulkFormData, setBulkFormData] = useState({
    category: '',
    description: '',
    findStr: '',
    replaceStr: ''
  });

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importCollisionStrategy, setImportCollisionStrategy] = useState<'merge' | 'skip' | 'new'>('merge');
  const [importParsedRows, setImportParsedRows] = useState<Omit<TagRegistryEntry, 'usageCount' | 'widgetsCount' | 'dashboardsCount' | 'linkedWidgets'>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Run full tag scan
  const tagSummary = useMemo(() => scanAppTags(appState), [appState]);

  // Unique Categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    tagSummary.tags.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats);
  }, [tagSummary]);

  // Filtered tags based on tab, search, and dropdown filters
  const filteredTags = useMemo(() => {
    return tagSummary.tags.filter(tag => {
      // Tab filter
      if (activeTab === 'detected_read' && !(tag.sourceType === 'detected' && tag.tagType === 'read')) return false;
      if (activeTab === 'detected_write' && !(tag.sourceType === 'detected' && tag.tagType === 'write')) return false;
      if (activeTab === 'imported_read' && !(tag.sourceType !== 'detected' && tag.tagType === 'read')) return false;
      if (activeTab === 'imported_write' && !(tag.sourceType !== 'detected' && tag.tagType === 'write')) return false;

      // Type filter
      if (typeFilter !== 'all' && tag.tagType !== typeFilter) return false;

      // Source filter
      if (sourceFilter === 'detected' && tag.sourceType !== 'detected') return false;
      if (sourceFilter === 'imported_manual' && tag.sourceType === 'detected') return false;

      // Category filter
      if (categoryFilter !== 'all' && tag.category !== categoryFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = tag.tagName.toLowerCase().includes(q);
        const matchDef = tag.parsingDefinition.toLowerCase().includes(q);
        const matchDesc = (tag.description || '').toLowerCase().includes(q);
        const matchCat = (tag.category || '').toLowerCase().includes(q);
        const matchWidget = (tag.linkedWidgets || []).some(
          w => w.panelName.toLowerCase().includes(q) || w.dashboardName.toLowerCase().includes(q)
        );
        if (!matchName && !matchDef && !matchDesc && !matchCat && !matchWidget) return false;
      }

      return true;
    });
  }, [tagSummary, activeTab, typeFilter, sourceFilter, categoryFilter, searchQuery]);

  // Select / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedTagIds.length === filteredTags.length && filteredTags.length > 0) {
      setSelectedTagIds([]);
    } else {
      setSelectedTagIds(filteredTags.map(t => t.tagId));
    }
  };

  const handleToggleSelectTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      tagName: '',
      tagType: 'read',
      parsingDefinition: '',
      category: 'General',
      description: ''
    });
    setEditingTag(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (tag: TagRegistryEntry) => {
    setEditingTag(tag);
    setFormData({
      tagName: tag.tagName,
      tagType: tag.tagType,
      parsingDefinition: tag.parsingDefinition,
      category: tag.category || 'General',
      description: tag.description || ''
    });
    setIsCreateModalOpen(true);
  };

  // Save Create / Edit Tag
  const handleSaveTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parsingDefinition.trim()) {
      showToast('Parsing Definition is required!');
      return;
    }

    const updatedState = registerCustomTag(appState, {
      tagId: editingTag ? editingTag.tagId : undefined,
      tagName: formData.tagName.trim() || formData.parsingDefinition.trim(),
      tagType: formData.tagType,
      sourceType: editingTag ? editingTag.sourceType : 'manual',
      parsingDefinition: formData.parsingDefinition.trim(),
      category: formData.category.trim() || 'General',
      description: formData.description.trim()
    });

    onUpdateAppState(updatedState);
    setIsCreateModalOpen(false);
    showToast(editingTag ? 'Tag updated successfully!' : 'New tag registered successfully!');
  };

  // Delete Custom Tag
  const handleDeleteCustomTag = (tag: TagRegistryEntry) => {
    if (tag.sourceType === 'detected') {
      showToast('Auto-detected tags are generated from widget configurations. To remove, clear the tag from the widget.');
      return;
    }

    const newCustom = (appState.customTags || []).filter(t => t.tagId !== tag.tagId);
    onUpdateAppState({ ...appState, customTags: newCustom });
    setSelectedTagIds(prev => prev.filter(id => id !== tag.tagId));
    showToast('Tag deleted from custom registry.');
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    const customTagIds = new Set((appState.customTags || []).map(t => t.tagId));
    const deletableIds = selectedTagIds.filter(id => customTagIds.has(id));

    if (deletableIds.length === 0) {
      showToast('None of the selected tags are custom/imported tags. Auto-detected tags cannot be directly deleted.');
      return;
    }

    const newCustom = (appState.customTags || []).filter(t => !deletableIds.includes(t.tagId));
    onUpdateAppState({ ...appState, customTags: newCustom });
    setSelectedTagIds([]);
    showToast(`Deleted ${deletableIds.length} custom/imported tag(s).`);
  };

  // Save Bulk Edit
  const handleSaveBulkEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTagIds.length === 0) return;

    const updatedState = bulkUpdateTags(appState, selectedTagIds, bulkFormData);
    onUpdateAppState(updatedState);
    setIsBulkEditModalOpen(false);
    setBulkFormData({ category: '', description: '', findStr: '', replaceStr: '' });
    showToast(`Successfully updated ${selectedTagIds.length} selected tag(s).`);
  };

  // Export CSV
  const handleExportCsv = () => {
    const csvContent = exportTagsToCsv(filteredTags);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mqtt_tags_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredTags.length} tags to CSV file.`);
  };

  // Handle CSV File Upload
  const handleCsvFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      const parsed = parseTagsCsv(text);
      setImportParsedRows(parsed.validRows);
      setImportErrors(parsed.errors);
    };
    reader.readAsText(file);
  };

  // Process Import CSV
  const handleConfirmImport = () => {
    if (importParsedRows.length === 0) {
      showToast('No valid tags to import.');
      return;
    }

    let updatedCustom = [...(appState.customTags || [])];
    let importedCount = 0;
    let updatedCount = 0;

    importParsedRows.forEach(imp => {
      const existingIdx = updatedCustom.findIndex(
        c => c.tagType === imp.tagType && c.parsingDefinition.trim().toLowerCase() === imp.parsingDefinition.trim().toLowerCase()
      );

      if (existingIdx >= 0) {
        if (importCollisionStrategy === 'merge') {
          updatedCustom[existingIdx] = {
            ...updatedCustom[existingIdx],
            tagName: imp.tagName || updatedCustom[existingIdx].tagName,
            description: imp.description || updatedCustom[existingIdx].description,
            category: imp.category || updatedCustom[existingIdx].category,
            updatedAt: new Date().toISOString()
          };
          updatedCount++;
        } else if (importCollisionStrategy === 'new') {
          updatedCustom.push({
            ...imp,
            tagId: `tag_imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
          });
          importedCount++;
        }
        // skip does nothing
      } else {
        updatedCustom.push(imp);
        importedCount++;
      }
    });

    onUpdateAppState({ ...appState, customTags: updatedCustom });
    setIsImportModalOpen(false);
    setCsvText('');
    setImportParsedRows([]);
    setImportErrors([]);
    showToast(`CSV Import complete! Added ${importedCount} new tag(s), updated ${updatedCount} existing tag(s).`);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      
      {/* Top Header Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md px-4 py-3 sm:px-6 flex items-center justify-between shadow-xl">
        <div data-tour="mqtt-tag-header" className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-700/60"
            title="Return to Dashboard"
          >
            <i className="fas fa-arrow-left text-sm"></i>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <i className="fas fa-tags text-emerald-400"></i>
                <span>MQTT Tag Manager</span>
              </h1>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Registry
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Centralized payload parsing & generation logic repository
            </p>
          </div>
        </div>

        {/* Top Header Action Buttons */}
        <div data-tour="mqtt-tag-actions" className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsMqttTagTourOpen(true)}
            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
            title="Launch MQTT Tag Manager Guided Tour"
          >
            <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
            <span>Tour</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
            title="Export Tags to CSV"
          >
            <i className="fas fa-download text-xs text-sky-400"></i>
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
            title="Import Tags from CSV"
          >
            <i className="fas fa-file-import text-xs text-purple-400"></i>
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <i className="fas fa-plus text-xs"></i>
            <span>New Tag</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">

        {/* Notification Toast */}
        {toastMessage && (
          <div className="fixed top-16 right-6 z-50 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center space-x-2 animate-in slide-in-from-top duration-200 backdrop-blur-md">
            <i className="fas fa-check-circle text-emerald-400 text-sm"></i>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Metrics Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* Total Tags Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Tags</span>
              <i className="fas fa-tags text-emerald-400 text-base"></i>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-white">{tagSummary.totalTags}</span>
              <span className="text-[10px] text-slate-400">Registered</span>
            </div>
          </div>

          {/* Read Tags Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Read Tags</span>
              <i className="fas fa-code text-emerald-400 text-base"></i>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-emerald-300">{tagSummary.totalReadTags}</span>
              <span className="text-[10px] text-slate-400">JSONPath Read</span>
            </div>
          </div>

          {/* Write Tags Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Write Tags</span>
              <i className="fas fa-code-branch text-indigo-400 text-base"></i>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-indigo-300">{tagSummary.totalWriteTags}</span>
              <span className="text-[10px] text-slate-400">Publish Patterns</span>
            </div>
          </div>

          {/* Detected Tags Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Auto-Detected</span>
              <i className="fas fa-wand-magic-sparkles text-sky-400 text-base"></i>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-sky-300">{tagSummary.totalDetectedTags}</span>
              <span className="text-[10px] text-slate-400">From Widgets</span>
            </div>
          </div>

          {/* Custom / Imported Tags Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Imported / Custom</span>
              <i className="fas fa-file-csv text-purple-400 text-base"></i>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-purple-300">{tagSummary.totalImportedTags}</span>
              <span className="text-[10px] text-slate-400">CSV & Manual</span>
            </div>
          </div>

        </div>

        {/* Tab Categorization Bar */}
        <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl overflow-x-auto text-xs font-semibold text-slate-400 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow'
                : 'hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>All Tags</span>
            <span className="text-[10px] bg-slate-950 px-1.5 py-0.2 rounded-full font-mono text-slate-300">{tagSummary.totalTags}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('detected_read')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'detected_read'
                ? 'bg-sky-500/20 text-sky-200 font-bold border border-sky-500/40 shadow'
                : 'hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <i className="fas fa-code text-sky-400 text-[10px]"></i>
            <span>Detected Read Tags</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('detected_write')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'detected_write'
                ? 'bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-500/40 shadow'
                : 'hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <i className="fas fa-code-branch text-indigo-400 text-[10px]"></i>
            <span>Detected Write Tags</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('imported_read')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'imported_read'
                ? 'bg-purple-500/20 text-purple-200 font-bold border border-purple-500/40 shadow'
                : 'hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <i className="fas fa-file-import text-purple-400 text-[10px]"></i>
            <span>Imported Read Tags</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('imported_write')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'imported_write'
                ? 'bg-amber-500/20 text-amber-200 font-bold border border-amber-500/40 shadow'
                : 'hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <i className="fas fa-file-csv text-amber-400 text-[10px]"></i>
            <span>Imported Write Tags</span>
          </button>
        </div>

        {/* Filter and Search Controls */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tag name, JSON path, pattern, or linked widget..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center space-x-2">
            
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="all">All Tag Types</option>
              <option value="read">Read Tags (JSONPath)</option>
              <option value="write">Write Tags (Patterns)</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="detected">Auto-Detected Only</option>
              <option value="imported_manual">Imported / Manual Only</option>
            </select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Bulk Actions Toolbar (Floating when items selected) */}
        {selectedTagIds.length > 0 && (
          <div className="bg-emerald-950/90 border border-emerald-500/50 p-3 rounded-2xl flex items-center justify-between text-xs font-semibold text-emerald-200 shadow-2xl animate-in fade-in duration-150 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <span className="bg-emerald-500 text-slate-950 font-extrabold px-2 py-0.5 rounded-lg text-xs">
                {selectedTagIds.length} Selected
              </span>
              <span>Bulk Actions for selected tags:</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsBulkEditModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
              >
                <i className="fas fa-pen-to-square text-xs"></i>
                <span>Bulk Edit</span>
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <i className="fas fa-trash text-xs"></i>
                <span>Bulk Delete Custom</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTagIds([])}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
                title="Clear Selection"
              >
                <i className="fas fa-xmark text-sm"></i>
              </button>
            </div>
          </div>
        )}

        {/* Tag Cards List Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Table Header */}
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-3">
            <div className="w-6 flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedTagIds.length === filteredTags.length && filteredTags.length > 0}
                onChange={handleToggleSelectAll}
                className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
            <div className="w-48">Tag Name / Category</div>
            <div className="w-24">Type</div>
            <div className="w-28">Source</div>
            <div className="flex-1 min-w-[200px]">Parsing Definition / Pattern</div>
            <div className="w-32 text-center">Linked Widgets</div>
            <div className="w-24 text-right">Actions</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-800/80">
            {filteredTags.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
                <i className="fas fa-tags text-3xl text-slate-700"></i>
                <p className="text-sm font-semibold text-slate-400">No matching MQTT tags found.</p>
                <p className="text-xs text-slate-500 max-w-md">
                  Create a new tag manually, import from CSV, or configure Read/Write tags inside your widgets to populate this registry automatically.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="mt-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  + Create First Tag
                </button>
              </div>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.tagId);

                return (
                  <div
                    key={tag.tagId}
                    className={`px-4 py-3 flex items-center space-x-3 text-xs transition-colors hover:bg-slate-800/40 ${
                      isSelected ? 'bg-emerald-500/10' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="w-6 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectTag(tag.tagId)}
                        className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Tag Name & Category */}
                    <div className="w-48 flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-slate-100 truncate" title={tag.tagName}>
                        {tag.tagName}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {tag.category || 'General'}
                        {tag.description && ` • ${tag.description}`}
                      </span>
                    </div>

                    {/* Tag Type Badge */}
                    <div className="w-24 shrink-0">
                      {tag.tagType === 'read' ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center space-x-1">
                          <i className="fas fa-code text-[9px]"></i>
                          <span>READ</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center space-x-1">
                          <i className="fas fa-code-branch text-[9px]"></i>
                          <span>WRITE</span>
                        </span>
                      )}
                    </div>

                    {/* Source Badge */}
                    <div className="w-28 shrink-0">
                      {tag.sourceType === 'detected' ? (
                        <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center space-x-1">
                          <i className="fas fa-wand-magic-sparkles text-[9px]"></i>
                          <span>DETECTED</span>
                        </span>
                      ) : tag.sourceType === 'imported' ? (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center space-x-1">
                          <i className="fas fa-file-csv text-[9px]"></i>
                          <span>IMPORTED</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-wider inline-flex items-center space-x-1">
                          <i className="fas fa-user-pen text-[9px]"></i>
                          <span>MANUAL</span>
                        </span>
                      )}
                    </div>

                    {/* Parsing Definition / Pattern */}
                    <div className="flex-1 min-w-[200px] flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-emerald-300 truncate">
                      <span className="truncate" title={tag.parsingDefinition}>
                        {tag.parsingDefinition}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(tag.parsingDefinition);
                          showToast('Copied tag definition to clipboard!');
                        }}
                        className="p-1 text-slate-500 hover:text-slate-200 transition-colors ml-auto shrink-0"
                        title="Copy definition"
                      >
                        <i className="fas fa-copy text-xs"></i>
                      </button>
                    </div>

                    {/* Linked Widgets Badge */}
                    <div className="w-32 text-center shrink-0">
                      {tag.widgetsCount && tag.widgetsCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setInspectingTagWidgets(tag)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center space-x-1"
                        >
                          <i className="fas fa-link text-sky-400 text-[10px]"></i>
                          <span>{tag.widgetsCount} Widget{tag.widgetsCount !== 1 ? 's' : ''}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Unlinked</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="w-24 text-right flex items-center justify-end space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(tag)}
                        className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Tag Details"
                      >
                        <i className="fas fa-pen-to-square text-xs"></i>
                      </button>

                      {tag.sourceType !== 'detected' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomTag(tag)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Delete Tag from Registry"
                        >
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* CREATE / EDIT TAG MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <i className="fas fa-tags text-emerald-400"></i>
                <span>{editingTag ? 'Edit Tag Definition' : 'Register New MQTT Tag'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="p-5 space-y-4 text-xs">
              
              {/* Tag Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Tag Name / Identifier *</label>
                <input
                  type="text"
                  required
                  value={formData.tagName}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagName: e.target.value }))}
                  placeholder="e.g. Temperature_Value_Path or Command_Format"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>

              {/* Tag Type Selector */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Tag Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tagType: 'read' }))}
                    className={`p-2.5 rounded-xl border text-center font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                      formData.tagType === 'read'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <i className="fas fa-code"></i>
                    <span>Read Tag (JSONPath)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tagType: 'write' }))}
                    className={`p-2.5 rounded-xl border text-center font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all ${
                      formData.tagType === 'write'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <i className="fas fa-code-branch"></i>
                    <span>Write Tag (Pattern)</span>
                  </button>
                </div>
              </div>

              {/* Parsing Definition / Pattern */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">
                  {formData.tagType === 'read' ? 'JSONPath Query Expression *' : 'Publish Payload Pattern / Template *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.parsingDefinition}
                  onChange={(e) => setFormData(prev => ({ ...prev, parsingDefinition: e.target.value }))}
                  placeholder={formData.tagType === 'read' ? 'e.g. $.data.temperature' : 'e.g. {"val": "%v"}'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 font-mono outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g. Telemetry, Controls, HVAC, Alarms"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional notes about payload structure or target device..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 transition-colors"
                ></textarea>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Save Tag Definition
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* BULK EDIT MODAL */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <i className="fas fa-pen-to-square text-emerald-400"></i>
                <span>Bulk Edit {selectedTagIds.length} Selected Tags</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveBulkEdit} className="p-5 space-y-4 text-xs">
              
              <p className="text-slate-400 text-[11px]">
                Modify properties across all {selectedTagIds.length} selected tag(s). Leave fields blank to keep existing values.
              </p>

              {/* Find and Replace in Parsing Definitions */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="font-bold text-amber-400 block uppercase tracking-wider text-[10px]">
                  Batch Find & Replace in Parsing Definitions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={bulkFormData.findStr}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, findStr: e.target.value }))}
                    placeholder="Find text (e.g. $.d.)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono outline-none"
                  />
                  <input
                    type="text"
                    value={bulkFormData.replaceStr}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, replaceStr: e.target.value }))}
                    placeholder="Replace with (e.g. $.data.)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Note: Find & Replace will also automatically update linked widget JSON paths / patterns!
                </p>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Set Category for Selected</label>
                <input
                  type="text"
                  value={bulkFormData.category}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Leave blank to preserve existing categories"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Set Description for Selected</label>
                <textarea
                  rows={2}
                  value={bulkFormData.description}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Leave blank to preserve existing descriptions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsBulkEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Apply Bulk Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <i className="fas fa-file-import text-purple-400"></i>
                <span>Import MQTT Tag Definitions from CSV</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              
              {/* File upload picker */}
              <div className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 text-center space-y-2 bg-slate-950/50 transition-colors">
                <i className="fas fa-cloud-arrow-up text-2xl text-purple-400"></i>
                <p className="font-semibold text-slate-200">Select or drop a CSV file containing tag definitions</p>
                <p className="text-[10px] text-slate-500">Headers required: tagName, tagType (read/write), parsingDefinition</p>
                
                <input
                  type="file"
                  accept=".csv"
                  id="tagCsvFileInput"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCsvFileUpload(f);
                  }}
                />
                <label
                  htmlFor="tagCsvFileInput"
                  className="inline-block px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40 rounded-xl cursor-pointer transition-all"
                >
                  Browse CSV File
                </label>
              </div>

              {/* Raw CSV Textarea option */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Or Paste Raw CSV Data</label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    const parsed = parseTagsCsv(e.target.value);
                    setImportParsedRows(parsed.validRows);
                    setImportErrors(parsed.errors);
                  }}
                  placeholder="tagName,tagType,parsingDefinition,category,description&#10;TempSensor,read,$.d.temperature,HVAC,Main sensor path&#10;PowerCommand,write,{'val': '%v'},Controls,Power switch payload"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-purple-200 font-mono outline-none focus:border-purple-500"
                ></textarea>
              </div>

              {/* Collision Strategy */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Duplicate Handling Strategy</label>
                <select
                  value={importCollisionStrategy}
                  onChange={(e) => setImportCollisionStrategy(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
                >
                  <option value="merge">Merge / Update existing tag definitions</option>
                  <option value="skip">Skip duplicates (Keep current registry)</option>
                  <option value="new">Import all as new records</option>
                </select>
              </div>

              {/* Parsed Preview Table */}
              {importParsedRows.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                  <div className="flex items-center justify-between font-bold text-emerald-400 text-[11px]">
                    <span>Found {importParsedRows.length} valid tag row(s) ready to import:</span>
                  </div>
                  <div className="divide-y divide-slate-800/60 font-mono text-[10px]">
                    {importParsedRows.map((r, i) => (
                      <div key={i} className="py-1 flex items-center justify-between text-slate-300">
                        <span className="font-bold text-white truncate max-w-[120px]">{r.tagName}</span>
                        <span className="uppercase text-purple-300 font-bold">{r.tagType}</span>
                        <span className="text-emerald-300 truncate max-w-[200px]">{r.parsingDefinition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importParsedRows.length === 0}
                  onClick={handleConfirmImport}
                  className={`px-5 py-2 font-bold rounded-xl transition-all shadow-lg ${
                    importParsedRows.length > 0
                      ? 'bg-purple-500 hover:bg-purple-400 text-slate-950 shadow-purple-500/20 cursor-pointer'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  Confirm Import ({importParsedRows.length})
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* INSPECT LINKED WIDGETS MODAL */}
      {inspectingTagWidgets && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <i className="fas fa-link text-sky-400"></i>
                <span>Linked Widgets for Tag: {inspectingTagWidgets.tagName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setInspectingTagWidgets(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-emerald-300">
                {inspectingTagWidgets.parsingDefinition}
              </div>

              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden max-h-60 overflow-y-auto">
                {(inspectingTagWidgets.linkedWidgets || []).map((w, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-900/60">
                    <div>
                      <span className="font-bold text-white block">{w.panelName}</span>
                      <span className="text-[10px] text-slate-400">{w.dashboardName}</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-sky-300 border border-slate-700 px-2 py-0.5 rounded font-mono uppercase">
                      {w.field}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectingTagWidgets(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MQTT Tag Manager Guided Tour Screen Overlay */}
      <CoachMarkOverlay
        tourId="tag_manager"
        isOpen={isMqttTagTourOpen}
        onClose={() => setIsMqttTagTourOpen(false)}
      />
    </div>
  );
};

export default TagManagerView;
