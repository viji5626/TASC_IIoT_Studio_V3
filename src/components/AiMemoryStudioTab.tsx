import React, { useState, useEffect, useCallback } from 'react';
import {
  LearnedTagAlias,
  PlantKnowledgeNote,
  QueryPattern,
  AiMemoryStats,
  PlantKnowledgeCategory,
  AppState
} from '../types';
import {
  getAllLearnedAliases,
  saveLearnedAlias,
  deleteLearnedAlias,
  getAllPlantKnowledgeNotes,
  savePlantKnowledgeNote,
  deletePlantKnowledgeNote,
  getTopQueryPatterns,
  getAiMemoryStats,
  clearPrecomputedChunks,
  exportAiMemoryBackup,
  importAiMemoryBackup,
  subscribeAiMemorySync
} from '../utils/aiMemoryStore';
import { validateAllAliases, validateTagAlias } from '../utils/aiAliasValidator';
import { runPreChunkingCycle } from '../utils/aiChunkingWorker';
import { useDeviceCapability } from '../utils/deviceDetection';

interface Props {
  appState: AppState;
}

type MemorySubTab = 'aliases' | 'notes' | 'analytics' | 'health';

const CATEGORY_COLORS: Record<PlantKnowledgeCategory, { bg: string; text: string; border: string }> = {
  energy: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  hvac: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  electrical: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  safety: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
  production: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  general: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' }
};

export const AiMemoryStudioTab: React.FC<Props> = ({ appState }) => {
  const [activeSubTab, setActiveSubTab] = useState<MemorySubTab>('aliases');
  const [aliases, setAliases] = useState<LearnedTagAlias[]>([]);
  const [notes, setNotes] = useState<PlantKnowledgeNote[]>([]);
  const [patterns, setPatterns] = useState<QueryPattern[]>([]);
  const [stats, setStats] = useState<AiMemoryStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isChunkingRunning, setIsChunkingRunning] = useState(false);

  // Modals state
  const [isAddAliasOpen, setIsAddAliasOpen] = useState(false);
  const [editingAlias, setEditingAlias] = useState<LearnedTagAlias | null>(null);
  const [aliasForm, setAliasForm] = useState({ alias: '', tagId: '', tagName: '', notes: '' });

  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PlantKnowledgeNote | null>(null);
  const [noteForm, setNoteForm] = useState<{ category: PlantKnowledgeCategory; topic: string; note: string }>({
    category: 'general',
    topic: '',
    note: ''
  });

  const { isDesktop } = useDeviceCapability();

  const refreshData = useCallback(async () => {
    const [allAliases, allNotes, topPatterns, memStats] = await Promise.all([
      getAllLearnedAliases(),
      getAllPlantKnowledgeNotes(),
      getTopQueryPatterns(20),
      getAiMemoryStats()
    ]);
    setAliases(allAliases);
    setNotes(allNotes);
    setPatterns(topPatterns);
    setStats(memStats);
  }, []);

  useEffect(() => {
    refreshData();
    const unsub = subscribeAiMemorySync(() => {
      refreshData();
    });
    return unsub;
  }, [refreshData]);

  // Handle Save Alias
  const handleSaveAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasForm.alias.trim() || !aliasForm.tagId.trim()) return;

    await saveLearnedAlias({
      id: editingAlias?.id,
      alias: aliasForm.alias.trim(),
      tagId: aliasForm.tagId.trim(),
      tagName: aliasForm.tagName.trim() || aliasForm.tagId.trim(),
      source: 'manual_entry',
      confidence: 1.0,
      notes: aliasForm.notes.trim() || undefined
    });

    setIsAddAliasOpen(false);
    setEditingAlias(null);
    setAliasForm({ alias: '', tagId: '', tagName: '', notes: '' });
    refreshData();
  };

  // Handle Save Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.topic.trim() || !noteForm.note.trim()) return;

    await savePlantKnowledgeNote({
      id: editingNote?.id,
      category: noteForm.category,
      topic: noteForm.topic.trim(),
      note: noteForm.note.trim(),
      author: 'Engineer'
    });

    setIsAddNoteOpen(false);
    setEditingNote(null);
    setNoteForm({ category: 'general', topic: '', note: '' });
    refreshData();
  };

  // Handle Manual Pre-Chunking
  const handleRunChunking = async () => {
    setIsChunkingRunning(true);
    try {
      await runPreChunkingCycle();
      await refreshData();
    } finally {
      setIsChunkingRunning(false);
    }
  };

  // Handle Export Backup
  const handleExportBackup = async () => {
    const json = await exportAiMemoryBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasc_ai_memory_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Handle Import Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await importAiMemoryBackup(String(reader.result));
      if (res.success) {
        alert(`Successfully restored ${res.importedAliases} aliases and ${res.importedNotes} plant notes.`);
        refreshData();
      } else {
        alert(`Failed to import backup: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Validation results
  const validationSummary = validateAllAliases(aliases, appState);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* ── Sub-Tab Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {([
            { id: 'aliases', label: 'Tag Aliases', icon: 'fa-tags', count: aliases.length },
            { id: 'notes', label: 'Plant SOP Rules', icon: 'fa-book-bookmark', count: notes.length },
            { id: 'analytics', label: 'Query Analytics', icon: 'fa-chart-pie', count: patterns.length },
            { id: 'health', label: 'Cache & Health', icon: 'fa-hard-drive', count: stats?.cachedChunkCount }
          ] as const).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <i className={`fas ${tab.icon} text-xs`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="bg-slate-900/60 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Platform Tier Pill */}
        <div className="hidden sm:flex items-center space-x-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center space-x-1.5 ${
              isDesktop
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
            }`}
          >
            <i className={`fas ${isDesktop ? 'fa-desktop' : 'fa-mobile-screen'} text-[10px]`} />
            <span>{isDesktop ? 'PC Full Multi-Agent' : 'Mobile Low-Power'}</span>
          </span>
        </div>
      </div>

      {/* ── Content Body ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* ── Sub-Tab 1: Tag Aliases ──────────────────────────────────────── */}
        {activeSubTab === 'aliases' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Learned Tag Aliases ({aliases.length})</h3>
                <p className="text-xs text-slate-400">
                  Maps operator colloquial terms and plant vernacular to physical PLC & Historian tags.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Filter aliases..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setEditingAlias(null);
                    setAliasForm({ alias: '', tagId: '', tagName: '', notes: '' });
                    setIsAddAliasOpen(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0"
                >
                  <i className="fas fa-plus text-xs" />
                  <span>Add Alias</span>
                </button>
              </div>
            </div>

            {aliases.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-xl p-8">
                <i className="fas fa-tags text-3xl text-slate-600 mb-2 block" />
                <p className="text-sm font-semibold text-slate-300">No Learned Aliases Yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Tell the AI in chat (e.g. <em>"Remember that Main Power refers to MTR_01"</em>) or click "Add Alias" above.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-400 border-b border-slate-700/80 uppercase text-[10px] tracking-wider">
                        <th className="p-3">Operator Alias</th>
                        <th className="p-3">Physical Tag Mapping</th>
                        <th className="p-3">Schema Status</th>
                        <th className="p-3">Learned Source</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {aliases
                        .filter(a => !searchQuery || a.alias.toLowerCase().includes(searchQuery.toLowerCase()) || a.tagName.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(alias => {
                          const validation = validateTagAlias(alias, appState);
                          return (
                            <tr key={alias.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-3 font-semibold text-indigo-300">
                                <i className="fas fa-quote-left text-[10px] text-indigo-400 mr-1.5 opacity-60" />
                                {alias.alias}
                              </td>
                              <td className="p-3 text-slate-300 font-mono">
                                <span className="text-slate-200 font-medium">{alias.tagName}</span>
                                <span className="text-[10px] text-slate-500 block">{alias.tagId}</span>
                              </td>
                              <td className="p-3">
                                {validation.isValid ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center space-x-1 w-fit">
                                    <i className="fas fa-circle-check text-[9px]" />
                                    <span>Active Tag</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/60 border border-amber-500/40 text-amber-300 flex items-center space-x-1 w-fit" title="Tag may have been renamed or deleted">
                                    <i className="fas fa-triangle-exclamation text-[9px]" />
                                    <span>Orphaned Tag</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-400 capitalize text-[11px]">
                                {alias.source.replace('_', ' ')}
                              </td>
                              <td className="p-3 text-right space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAlias(alias);
                                    setAliasForm({
                                      alias: alias.alias,
                                      tagId: alias.tagId,
                                      tagName: alias.tagName,
                                      notes: alias.notes || ''
                                    });
                                    setIsAddAliasOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                  title="Edit Alias"
                                >
                                  <i className="fas fa-pen-to-square text-xs" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Delete alias "${alias.alias}"?`)) {
                                      await deleteLearnedAlias(alias.id);
                                      refreshData();
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition-colors"
                                  title="Delete Alias"
                                >
                                  <i className="fas fa-trash text-xs" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sub-Tab 2: Plant SOP Notes ──────────────────────────────────── */}
        {activeSubTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Plant SOP Rules & Operational Memory ({notes.length})</h3>
                <p className="text-xs text-slate-400">
                  Operating limits, technician guidelines, shift timings, and standard operating procedures.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingNote(null);
                    setNoteForm({ category: 'general', topic: '', note: '' });
                    setIsAddNoteOpen(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shrink-0"
                >
                  <i className="fas fa-plus text-xs" />
                  <span>Add Plant SOP Note</span>
                </button>
              </div>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-xl p-8">
                <i className="fas fa-book-bookmark text-3xl text-slate-600 mb-2 block" />
                <p className="text-sm font-semibold text-slate-300">No Plant SOP Rules Recorded</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Tell the AI in chat (e.g. <em>"Record SOP: Boiler pressure must stay below 10.5 bar"</em>) or click "Add Plant SOP Note".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {notes.map(note => {
                  const style = CATEGORY_COLORS[note.category] || CATEGORY_COLORS.general;
                  return (
                    <div
                      key={note.id}
                      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${style.bg} ${style.text} ${style.border}`}>
                            {note.category}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 mb-1">{note.topic}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{note.note}</p>
                      </div>

                      <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNote(note);
                            setNoteForm({ category: note.category, topic: note.topic, note: note.note });
                            setIsAddNoteOpen(true);
                          }}
                          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          <i className="fas fa-pen-to-square mr-1" />Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Delete note "${note.topic}"?`)) {
                              await deletePlantKnowledgeNote(note.id);
                              refreshData();
                            }
                          }}
                          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <i className="fas fa-trash mr-1" />Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Sub-Tab 3: Query Analytics ──────────────────────────────────── */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <h3 className="text-sm font-bold text-slate-200">Operator Query Intent Patterns</h3>
              <p className="text-xs text-slate-400">
                Frequently recurring inquiries profiled to optimize prompt context and pre-compute telemetry chunks.
              </p>
            </div>

            {patterns.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-xl p-8">
                <i className="fas fa-chart-pie text-3xl text-slate-600 mb-2 block" />
                <p className="text-sm font-semibold text-slate-300">No Query History Recorded</p>
                <p className="text-xs text-slate-500">Query patterns will populate automatically as operators chat with the AI.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {patterns.map((p, idx) => (
                  <div key={p.queryHash || idx} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-200 truncate">{p.querySample}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Last asked: {new Date(p.lastQueriedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded text-xs">
                        {p.frequency}x
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sub-Tab 4: Cache & Storage Health ───────────────────────────── */}
        {activeSubTab === 'health' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Local Storage Usage</span>
                <p className="text-xl font-bold text-indigo-300">{stats?.estimatedStorageMb || 0} MB <span className="text-xs text-slate-500 font-normal">/ 25 MB Max</span></p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, ((stats?.estimatedStorageMb || 0) / 25) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Precomputed Chunks</span>
                <p className="text-xl font-bold text-cyan-300">{stats?.cachedChunkCount || 0} <span className="text-xs text-slate-500 font-normal">rollups</span></p>
                <p className="text-[11px] text-slate-500 mt-1">Sub-10ms instantaneous telemetry retrieval</p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Eviction Defense</span>
                <p className="text-base font-bold text-emerald-300 flex items-center space-x-1.5 mt-1">
                  <i className="fas fa-shield-halved text-emerald-400" />
                  <span>{stats?.isPersistentStorage ? 'Persistent Storage Active' : 'Standard Browser Storage'}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Permanent layer protected against cache cleanup</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-slate-200">Maintenance & Data Portability</h4>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleRunChunking}
                  disabled={isChunkingRunning}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center space-x-2"
                >
                  <i className={`fas ${isChunkingRunning ? 'fa-circle-notch fa-spin' : 'fa-bolt'} text-xs`} />
                  <span>{isChunkingRunning ? 'Crunching Rollups...' : 'Re-Compute Chunks Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Clear precomputed telemetry chunks cache? (Learned aliases & plant SOP notes will NOT be deleted)')) {
                      await clearPrecomputedChunks();
                      refreshData();
                    }
                  }}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1.5"
                >
                  <i className="fas fa-broom text-xs" />
                  <span>Clear Telemetry Cache</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1.5"
                >
                  <i className="fas fa-download text-xs" />
                  <span>Export Memory Backup (JSON)</span>
                </button>

                <label className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer">
                  <i className="fas fa-upload text-xs" />
                  <span>Import Memory Backup</span>
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Add / Edit Tag Alias ────────────────────────────────────── */}
      {isAddAliasOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[120]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">
              {editingAlias ? 'Edit Tag Alias' : 'Add Learned Tag Alias'}
            </h3>
            <form onSubmit={handleSaveAlias} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Operator Alias / Nickname</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Incomer, Chiller Outlet Temp"
                  value={aliasForm.alias}
                  onChange={e => setAliasForm({ ...aliasForm, alias: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Physical Tag ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. htag_1786890, modbus_holding_40001"
                  value={aliasForm.tagId}
                  onChange={e => setAliasForm({ ...aliasForm, tagId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Display Tag Name</label>
                <input
                  type="text"
                  placeholder="e.g. Main_Power_KW"
                  value={aliasForm.tagName}
                  onChange={e => setAliasForm({ ...aliasForm, tagName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAliasOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  Save Alias
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add / Edit Plant SOP Note ───────────────────────────────── */}
      {isAddNoteOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[120]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">
              {editingNote ? 'Edit Plant SOP Note' : 'Add Plant SOP Note'}
            </h3>
            <form onSubmit={handleSaveNote} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={noteForm.category}
                    onChange={e => setNoteForm({ ...noteForm, category: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 capitalize"
                  >
                    {Object.keys(CATEGORY_COLORS).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Topic / Equipment</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boiler Steam Limit"
                    value={noteForm.topic}
                    onChange={e => setNoteForm({ ...noteForm, topic: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">SOP Rule / Note Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Normal operating pressure should not exceed 10.5 bar. If pressure rises above 10.2 bar, check secondary relief valve."
                  value={noteForm.note}
                  onChange={e => setNoteForm({ ...noteForm, note: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddNoteOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  Save Plant Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
