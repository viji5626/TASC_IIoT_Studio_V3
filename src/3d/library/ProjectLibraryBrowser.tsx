import React, { useState, useEffect, useMemo } from 'react';
import { ProjectLibrary, Scada3dAssembly } from './ProjectLibrary';

interface ProjectLibraryBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, clicking an assembly calls this with the assembly (import mode) */
  onImport?: (assembly: Scada3dAssembly) => void;
  /** If true, shows in "manage" mode (no import button, only delete) */
  manageMode?: boolean;
}

export const ProjectLibraryBrowser: React.FC<ProjectLibraryBrowserProps> = ({
  isOpen,
  onClose,
  onImport,
  manageMode = false,
}) => {
  const [assemblies, setAssemblies] = useState<Scada3dAssembly[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'presets' | 'custom'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const reload = () => setAssemblies(ProjectLibrary.getAll());

  useEffect(() => {
    if (isOpen) reload();
  }, [isOpen]);

  const filtered = useMemo(() => {
    return assemblies.filter(a => {
      // Tab filter
      if (activeTab === 'presets' && !a.isPreset) return false;
      if (activeTab === 'custom' && a.isPreset) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = a.name.toLowerCase().includes(q);
        const matchDesc = a.description?.toLowerCase().includes(q);
        const matchCat = a.category?.toLowerCase().includes(q);
        return matchName || matchDesc || matchCat;
      }
      return true;
    });
  }, [assemblies, activeTab, search]);

  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    ProjectLibrary.delete(id);
    reload();
    setConfirmDeleteId(null);
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-800 bg-slate-950/60">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <i className="fas fa-cubes text-indigo-400 text-base"></i>
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              {manageMode ? '3D Assembly Library Manager' : 'Import 3D Industrial Assembly'}
              <span className="text-[11px] bg-slate-800 text-sky-400 px-2 py-0.5 rounded-full font-mono font-normal">
                {assemblies.length} System{assemblies.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">Pre-built multi-equipment SCADA assemblies and saved project models</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
            <i className="fas fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Toolbar: Search + Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-800 flex items-center gap-3 bg-slate-900">
          {/* Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({assemblies.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className="fas fa-wand-magic-sparkles text-[10px] text-amber-400"></i>
              Pre-Engineered ({assemblies.filter(a => a.isPreset).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'custom'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Custom ({assemblies.filter(a => !a.isPreset).length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search assemblies, pumps, valves, silos..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        {/* Grid of Assemblies */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 text-slate-600">
                <i className="fas fa-cube text-2xl"></i>
              </div>
              <p className="text-slate-300 font-semibold text-sm">
                {assemblies.length === 0 ? 'No assemblies saved yet' : 'No matching assemblies found'}
              </p>
              <p className="text-slate-500 text-xs mt-1 max-w-sm">
                {assemblies.length === 0 ? 'Design a 3D scene in 3D Studio and click "Save to Library"' : 'Try adjusting your search query or switching tabs'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {filtered.map(assembly => (
                <div
                  key={assembly.assemblyId}
                  className="group bg-slate-950/70 border border-slate-800 hover:border-sky-500/60 rounded-xl p-3.5 flex flex-col gap-2.5 transition-all cursor-pointer shadow-md hover:shadow-sky-950/20"
                  onClick={() => !manageMode && onImport && onImport(assembly)}
                >
                  {/* Header info */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 text-sky-400 shadow-inner">
                      {assembly.thumbnail ? (
                        <img src={assembly.thumbnail} alt={assembly.name} className="w-full h-full object-cover" />
                      ) : (
                        <i className="fas fa-cube text-xl text-sky-400/80"></i>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {assembly.isPreset && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                            PRESET
                          </span>
                        )}
                        {assembly.category && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                            {assembly.category}
                          </span>
                        )}
                      </div>
                      <p className="text-white font-bold text-xs truncate group-hover:text-sky-300 transition-colors">
                        {assembly.name}
                      </p>
                      {assembly.description && (
                        <p className="text-slate-400 text-[10px] line-clamp-2 mt-0.5 leading-relaxed">
                          {assembly.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <i className="fas fa-cubes text-sky-400"></i>
                      <span className="font-mono">{assembly.objectCount}</span> Equipment
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <i className="fas fa-bolt text-amber-400"></i>
                      <span className="font-mono">{assembly.tagCount}</span> SCADA Tag{assembly.tagCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {formatDate(assembly.updatedAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    {!manageMode && onImport && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onImport(assembly); }}
                        className="flex-1 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <i className="fas fa-arrow-down-to-bracket text-[11px]"></i>
                        Import Assembly
                      </button>
                    )}
                    {confirmDeleteId === assembly.assemblyId ? (
                      <>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleDelete(assembly.assemblyId); }}
                          className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all"
                        >
                          <i className="fas fa-check text-[10px]"></i> Confirm
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      !assembly.isPreset && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setConfirmDeleteId(assembly.assemblyId); }}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 text-xs transition-all"
                          title="Delete assembly"
                        >
                          <i className="fas fa-trash-can text-[11px]"></i>
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
