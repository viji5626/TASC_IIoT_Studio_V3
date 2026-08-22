import React, { useState } from 'react';
import { Scada3dObject } from '../types/scene';
import { ASSET_CATALOG_3D } from '../assets/AssetRegistry';

interface SceneHierarchyTreeProps {
  objects: Scada3dObject[];
  selectedId: string | null;
  selectedSubPartId?: string | null;
  onSelectObject: (id: string | null, subPartId?: string | null) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onToggleLock: (id: string, locked: boolean) => void;
  onDeleteObject: (id: string) => void;
  onRenameObject: (id: string, newName: string) => void;
}

export const SceneHierarchyTree: React.FC<SceneHierarchyTreeProps> = ({
  objects,
  selectedId,
  selectedSubPartId,
  onSelectObject,
  onToggleVisibility,
  onToggleLock,
  onDeleteObject,
  onRenameObject
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedObjectIds, setExpandedObjectIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedObjectIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartRename = (obj: Scada3dObject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(obj.id);
    setEditName(obj.name);
  };

  const handleCommitRename = (id: string) => {
    if (editName.trim()) {
      onRenameObject(id, editName.trim());
    }
    setEditingId(null);
  };

  const getEquipmentIcon = (assetId: string): string => {
    if (assetId.includes('diesel') || assetId.includes('genset') || assetId.includes('generator')) return 'fa-bolt-lightning text-amber-400';
    if (assetId.includes('gas_turbine') || assetId.includes('turbine')) return 'fa-gauge-high text-cyan-400';
    if (assetId.includes('pump')) return 'fa-gears text-sky-400';
    if (assetId.includes('motor')) return 'fa-bolt text-amber-400';
    if (assetId.includes('tank') || assetId.includes('vessel')) return 'fa-oil-can text-indigo-400';
    if (assetId.includes('silo')) return 'fa-monument text-amber-400';
    if (assetId.includes('valve')) return 'fa-faucet text-emerald-400';
    if (assetId.includes('fan') || assetId.includes('blower')) return 'fa-fan text-teal-400';
    if (assetId.includes('exchanger') || assetId.includes('tower')) return 'fa-snowflake text-cyan-400';
    if (assetId.includes('conveyor')) return 'fa-boxes-packing text-orange-400';
    return 'fa-cube text-sky-400';
  };

  const getSubPartIcon = (partId: string): string => {
    if (partId.includes('rotor') || partId.includes('impeller')) return 'fa-rotate text-sky-400';
    if (partId.includes('fan') || partId.includes('blades')) return 'fa-fan text-teal-400';
    if (partId.includes('shaft')) return 'fa-arrows-rotate text-indigo-400';
    if (partId.includes('valve') || partId.includes('disc') || partId.includes('stem')) return 'fa-sliders text-emerald-400';
    if (partId.includes('liquid') || partId.includes('level') || partId.includes('fluid')) return 'fa-water text-cyan-400';
    if (partId.includes('panel') || partId.includes('control')) return 'fa-microchip text-violet-400';
    return 'fa-shapes text-slate-400';
  };

  return (
    <div 
      className="flex-1 flex flex-col min-h-0 bg-slate-900 border-t border-slate-800 text-xs select-none"
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between font-bold text-slate-300">
        <div className="flex items-center gap-1.5">
          <i className="fas fa-sitemap text-sky-400 text-xs"></i>
          <span>Scene Hierarchy & Sub-Parts</span>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
          {objects.length} Equipment
        </span>
      </div>

      {/* Object List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
        {objects.length === 0 ? (
          <div className="p-6 text-center text-slate-500 italic">
            No equipment in scene. Drag from library above.
          </div>
        ) : (
          objects.map(obj => {
            const isSelected = obj.id === selectedId && !selectedSubPartId;
            const isEditing = editingId === obj.id;
            const catalogItem = ASSET_CATALOG_3D.find(a => a.id === obj.assetId);
            const subParts = catalogItem?.animatableParts || [];
            const isExpanded = expandedObjectIds[obj.id] ?? true; // Default expanded
            const hasBindings = obj.bindings && obj.bindings.length > 0;

            return (
              <div key={obj.id} className="space-y-0.5">
                {/* Equipment Root Row */}
                <div
                  onClick={() => onSelectObject(obj.id, null)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all group ${
                    isSelected
                      ? 'bg-sky-600/30 text-sky-200 border border-sky-500/50 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  {/* Left: Expand Arrow + Icon + Name */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {subParts.length > 0 ? (
                      <button
                        type="button"
                        onClick={e => toggleExpand(obj.id, e)}
                        className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-[9px]`}></i>
                      </button>
                    ) : (
                      <span className="w-4"></span>
                    )}

                    <i className={`fas ${getEquipmentIcon(obj.assetId)} text-xs shrink-0`}></i>
                    
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={() => handleCommitRename(obj.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCommitRename(obj.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="bg-slate-950 text-white px-1.5 py-0.5 rounded border border-sky-500 outline-none text-xs w-full font-bold"
                      />
                    ) : (
                      <div className="truncate font-semibold flex items-center gap-1.5">
                        <span onDoubleClick={e => handleStartRename(obj, e)} title="Double click to rename">
                          {obj.name}
                        </span>
                        {hasBindings && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50" title={`${obj.bindings?.length} live SCADA binding(s)`}></span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Action Icons (Hide, Lock, Delete) */}
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onToggleVisibility(obj.id, obj.visible === false);
                      }}
                      className="p-1 hover:text-white transition-colors"
                      title={obj.visible !== false ? 'Hide equipment' : 'Show equipment'}
                    >
                      <i className={`fas ${obj.visible !== false ? 'fa-eye text-slate-400' : 'fa-eye-slash text-slate-600'} text-[11px]`}></i>
                    </button>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onToggleLock(obj.id, !obj.locked);
                      }}
                      className="p-1 hover:text-white transition-colors"
                      title={obj.locked ? 'Unlock transform' : 'Lock in place'}
                    >
                      <i className={`fas ${obj.locked ? 'fa-lock text-amber-400' : 'fa-lock-open text-slate-500'} text-[11px]`}></i>
                    </button>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteObject(obj.id);
                      }}
                      className="p-1 hover:text-red-400 transition-colors"
                      title="Delete equipment from 3D scene"
                    >
                      <i className="fas fa-trash-can text-[11px]"></i>
                    </button>
                  </div>
                </div>

                {/* Sub-Parts Anatomy Child Rows */}
                {isExpanded && subParts.length > 0 && (
                  <div className="ml-5 pl-2 border-l border-slate-800 space-y-0.5">
                    {subParts.map(partId => {
                      const isSubSelected = obj.id === selectedId && selectedSubPartId === partId;
                      const boundRules = (obj.bindings || []).filter(b => b.subPartId === partId || b.property === partId);
                      const hasSubBinding = boundRules.length > 0;

                      return (
                        <div
                          key={partId}
                          onClick={() => onSelectObject(obj.id, partId)}
                          className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer text-[11px] transition-all ${
                            isSubSelected
                              ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <i className={`fas ${getSubPartIcon(partId)} text-[10px]`}></i>
                            <span className="capitalize">{partId.replace(/_/g, ' ')}</span>
                          </div>

                          {/* Binding Badges */}
                          {hasSubBinding && (
                            <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-1 py-0.2 rounded font-mono font-bold flex items-center gap-1">
                              <i className="fas fa-bolt text-[8px]"></i>
                              {boundRules[0].property === 'continuous_spin' || boundRules[0].property === 'running' ? 'Spin' :
                               boundRules[0].property === 'angular_position' ? 'Angle' :
                               boundRules[0].property === 'linear_travel' ? 'Travel' :
                               boundRules[0].property === 'fluid_level' ? 'Level' : 'Bound'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
