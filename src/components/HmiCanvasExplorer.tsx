import React, { useState, useMemo } from 'react';
import { Panel } from '../types';
import { getSymbolParts } from '../utils/symbolAnatomyRegistry';

interface HmiCanvasExplorerProps {
  panels: Panel[];
  selectedPanelIds: string[];
  activeSubPartSelection: { panelId: string; partId: string } | null;
  onSelectPanel: (panelId: string, isMulti: boolean) => void;
  onSelectGroup: (groupId: string) => void;
  onSelectSubPart: (panelId: string, partId: string) => void;
  onToggleVisibility: (panelId: string) => void;
  onToggleLock: (panelId: string) => void;
  onToggleGroupVisibility?: (groupId: string) => void;
  onToggleGroupLock?: (groupId: string) => void;
  onUngroup?: (groupId: string) => void;
  onRenameGroup?: (groupId: string, newName: string) => void;
  onReorderZIndex?: (panelId: string, action: 'up' | 'down' | 'top' | 'bottom') => void;
  onMovePanelToIndex?: (sourcePanelId: string, targetPanelId: string, position: 'before' | 'after') => void;
  onNestPanelIntoGroup?: (panelId: string, targetGroupId: string | null) => void;
  onDeletePanel: (panelId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  onOpenAddPanel?: () => void;
}

// Helper to determine panel display icon
function getPanelIcon(panel: Panel): { icon: string; color: string } {
  if (panel.symbolId || panel.symbolAnimType) {
    return { icon: 'fa-industry', color: 'text-sky-400' };
  }
  if (panel.shapeType) {
    return { icon: 'fa-shapes', color: 'text-amber-400' };
  }
  switch (panel.type) {
    case 'gauge':
    case 'radial_gauge':
    case 'linear_gauge':
      return { icon: 'fa-gauge-high', color: 'text-emerald-400' };
    case 'switch':
    case 'toggle':
    case 'push_button':
      return { icon: 'fa-toggle-on', color: 'text-cyan-400' };
    case 'linegraph':
    case 'trend':
    case 'historian':
      return { icon: 'fa-chart-line', color: 'text-purple-400' };
    case 'text':
    case 'numeric_label':
    case 'static_text':
      return { icon: 'fa-font', color: 'text-amber-300' };
    case 'alarm_banner':
    case 'alarm_table':
      return { icon: 'fa-bell', color: 'text-rose-400' };
    case 'pipe':
      return { icon: 'fa-grip-lines', color: 'text-blue-400' };
    default:
      return { icon: 'fa-cube', color: 'text-slate-400' };
  }
}

interface GroupItem {
  groupName: string;
  panels: Panel[];
}

export const HmiCanvasExplorer: React.FC<HmiCanvasExplorerProps> = ({
  panels,
  selectedPanelIds,
  activeSubPartSelection,
  onSelectPanel,
  onSelectGroup,
  onSelectSubPart,
  onToggleVisibility,
  onToggleLock,
  onToggleGroupVisibility,
  onToggleGroupLock,
  onUngroup,
  onRenameGroup,
  onReorderZIndex,
  onMovePanelToIndex,
  onNestPanelIntoGroup,
  onDeletePanel,
  onDeleteGroup,
  onOpenAddPanel
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedSymbols, setExpandedSymbols] = useState<Record<string, boolean>>({});
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState('');

  // Drag and Drop state
  const [draggingPanelId, setDraggingPanelId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | 'inside_group' | null>(null);

  // Group panels by groupId vs standalone
  const { groupsMap, standalonePanels } = useMemo<{
    groupsMap: Record<string, GroupItem>;
    standalonePanels: Panel[];
  }>(() => {
    const groups: Record<string, GroupItem> = {};
    const standalone: Panel[] = [];

    panels.forEach(p => {
      if (p.groupId) {
        if (!groups[p.groupId]) {
          groups[p.groupId] = {
            groupName: p.groupName || `Group Container (${p.groupId.slice(-4)})`,
            panels: []
          };
        }
        groups[p.groupId].panels.push(p);
      } else {
        standalone.push(p);
      }
    });

    return { groupsMap: groups, standalonePanels: standalone };
  }, [panels]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleSymbolExpand = (panelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSymbols(prev => ({ ...prev, [panelId]: !prev[panelId] }));
  };

  const isPanelMatching = (p: Panel) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (p.panelName && p.panelName.toLowerCase().includes(q)) ||
      (p.topic && p.topic.toLowerCase().includes(q)) ||
      (p.driverTagId && p.driverTagId.toLowerCase().includes(q)) ||
      p.type.toLowerCase().includes(q) ||
      (p.symbolId && p.symbolId.toLowerCase().includes(q))
    );
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, panelId: string) => {
    setDraggingPanelId(panelId);
    e.dataTransfer.setData('text/plain', panelId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetPanelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingPanelId || draggingPanelId === targetPanelId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';

    setDragOverTargetId(targetPanelId);
    setDragOverPosition(position);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTargetId(null);
    setDragOverPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetPanelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingPanelId || e.dataTransfer.getData('text/plain');
    if (sourceId && targetPanelId && sourceId !== targetPanelId && dragOverPosition) {
      if (onMovePanelToIndex && (dragOverPosition === 'before' || dragOverPosition === 'after')) {
        onMovePanelToIndex(sourceId, targetPanelId, dragOverPosition);
      }
    }
    setDraggingPanelId(null);
    setDragOverTargetId(null);
    setDragOverPosition(null);
  };

  // Drop on Group Container Header to nest
  const handleGroupDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingPanelId) return;
    setDragOverTargetId(`group_${groupId}`);
    setDragOverPosition('inside_group');
  };

  const handleGroupDrop = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggingPanelId || e.dataTransfer.getData('text/plain');
    if (sourceId && onNestPanelIntoGroup) {
      onNestPanelIntoGroup(sourceId, groupId);
    }
    setDraggingPanelId(null);
    setDragOverTargetId(null);
    setDragOverPosition(null);
  };

  return (
    <div className="flex flex-col h-full text-slate-200 select-none text-xs">
      {/* Header Search & Quick Actions */}
      <div className="p-2.5 bg-slate-900/90 border-b border-slate-800/80 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-extrabold text-white text-xs">
            <i className="fas fa-layer-group text-sky-400 text-xs"></i>
            <span>Scene Graph & Layers</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {panels.length} Elements | {Object.keys(groupsMap).length} Groups
          </span>
        </div>

        {/* Search filter input */}
        <div className="relative">
          <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]"></i>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search elements, tags, symbols..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-7 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <i className="fas fa-times text-[10px]"></i>
            </button>
          )}
        </div>
      </div>

      {/* Tree Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {panels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-8 px-4 space-y-2">
            <i className="fas fa-folder-open text-2xl opacity-40 text-slate-400"></i>
            <p className="text-xs font-bold text-slate-400">No Elements on Screen</p>
            <p className="text-[10px] text-slate-500 max-w-[180px]">
              Click "+ Add Element" or drag symbols from the library to populate this HMI screen.
            </p>
            {onOpenAddPanel && (
              <button
                type="button"
                onClick={onOpenAddPanel}
                className="mt-2 px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold rounded-lg text-xs border border-sky-500/40 transition-colors"
              >
                + Add Element
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 1. Group Containers */}
            {(Object.entries(groupsMap) as [string, GroupItem][]).map(([groupId, group]) => {
              const isCollapsed = !!collapsedGroups[groupId];
              const groupPanelIds = group.panels.map(p => p.panelId);
              const isGroupSelected = groupPanelIds.every(id => selectedPanelIds.includes(id)) && selectedPanelIds.length >= groupPanelIds.length;
              const isAllHidden = group.panels.every(p => p.isHidden);
              const isAllLocked = group.panels.every(p => p.isLocked);
              const isGroupDragTarget = dragOverTargetId === `group_${groupId}`;

              return (
                <div
                  key={groupId}
                  onDragOver={(e) => handleGroupDragOver(e, groupId)}
                  onDrop={(e) => handleGroupDrop(e, groupId)}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isGroupDragTarget
                      ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/50'
                      : isGroupSelected
                      ? 'bg-amber-500/10 border-amber-500/50'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  {/* Group Header Row */}
                  <div
                    onClick={() => onSelectGroup(groupId)}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/60 hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroupCollapse(groupId);
                        }}
                        className="p-0.5 text-slate-400 hover:text-white"
                      >
                        <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'} text-[10px] w-3 text-center`}></i>
                      </button>

                      <i className="fas fa-layer-group text-amber-400 text-xs shrink-0"></i>

                      {editingGroupId === groupId ? (
                        <input
                          type="text"
                          value={tempGroupName}
                          onChange={(e) => setTempGroupName(e.target.value)}
                          onBlur={() => {
                            if (onRenameGroup && tempGroupName.trim()) {
                              onRenameGroup(groupId, tempGroupName.trim());
                            }
                            setEditingGroupId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (onRenameGroup && tempGroupName.trim()) {
                                onRenameGroup(groupId, tempGroupName.trim());
                              }
                              setEditingGroupId(null);
                            }
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          className="bg-slate-900 border border-amber-400 rounded px-1 py-0.2 text-[11px] text-white font-bold outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingGroupId(groupId);
                            setTempGroupName(group.groupName);
                          }}
                          className="font-bold text-amber-300 text-[11px] truncate"
                          title="Double click to rename group"
                        >
                          {group.groupName}
                        </span>
                      )}

                      <span className="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                        {group.panels.length}
                      </span>
                    </div>

                    {/* Group Action Icons */}
                    <div className="flex items-center space-x-1 shrink-0 ml-1">
                      {onToggleGroupVisibility && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleGroupVisibility(groupId);
                          }}
                          className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                            isAllHidden ? 'text-slate-600' : 'text-slate-400 hover:text-sky-300'
                          }`}
                          title={isAllHidden ? "Show Group Elements" : "Hide Group Elements"}
                        >
                          <i className={`fas ${isAllHidden ? 'fa-eye-slash' : 'fa-eye'} text-[10px]`}></i>
                        </button>
                      )}

                      {onToggleGroupLock && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleGroupLock(groupId);
                          }}
                          className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                            isAllLocked ? 'text-amber-400' : 'text-slate-500 hover:text-amber-300'
                          }`}
                          title={isAllLocked ? "Unlock Group Movement" : "Lock Group Movement"}
                        >
                          <i className={`fas ${isAllLocked ? 'fa-lock' : 'fa-lock-open'} text-[10px]`}></i>
                        </button>
                      )}

                      {onUngroup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUngroup(groupId);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-300 rounded hover:bg-slate-800 transition-colors"
                          title="Ungroup Elements"
                        >
                          <i className="fas fa-link-slash text-[10px]"></i>
                        </button>
                      )}

                      {onDeleteGroup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteGroup(groupId);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                          title="Delete Entire Group"
                        >
                          <i className="fas fa-trash text-[10px]"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Child Items inside Group */}
                  {!isCollapsed && (
                    <div className="pl-3 pr-1 py-1 space-y-1 border-t border-slate-800/40 bg-slate-950/40">
                      {group.panels.filter(isPanelMatching).map(panel => (
                        <SceneTreeItem
                          key={panel.panelId}
                          panel={panel}
                          isSelected={selectedPanelIds.includes(panel.panelId)}
                          activeSubPartSelection={activeSubPartSelection}
                          isExpanded={!!expandedSymbols[panel.panelId]}
                          isDragging={draggingPanelId === panel.panelId}
                          isDragOver={dragOverTargetId === panel.panelId}
                          dragOverPosition={dragOverTargetId === panel.panelId ? dragOverPosition : null}
                          onToggleExpand={(e) => toggleSymbolExpand(panel.panelId, e)}
                          onSelectPanel={onSelectPanel}
                          onSelectSubPart={onSelectSubPart}
                          onToggleVisibility={onToggleVisibility}
                          onToggleLock={onToggleLock}
                          onReorderZIndex={onReorderZIndex}
                          onDeletePanel={onDeletePanel}
                          onDragStart={(e) => handleDragStart(e, panel.panelId)}
                          onDragOver={(e) => handleDragOver(e, panel.panelId)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, panel.panelId)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Standalone Elements */}
            {standalonePanels.filter(isPanelMatching).map(panel => (
              <SceneTreeItem
                key={panel.panelId}
                panel={panel}
                isSelected={selectedPanelIds.includes(panel.panelId)}
                activeSubPartSelection={activeSubPartSelection}
                isExpanded={!!expandedSymbols[panel.panelId]}
                isDragging={draggingPanelId === panel.panelId}
                isDragOver={dragOverTargetId === panel.panelId}
                dragOverPosition={dragOverTargetId === panel.panelId ? dragOverPosition : null}
                onToggleExpand={(e) => toggleSymbolExpand(panel.panelId, e)}
                onSelectPanel={onSelectPanel}
                onSelectSubPart={onSelectSubPart}
                onToggleVisibility={onToggleVisibility}
                onToggleLock={onToggleLock}
                onReorderZIndex={onReorderZIndex}
                onDeletePanel={onDeletePanel}
                onDragStart={(e) => handleDragStart(e, panel.panelId)}
                onDragOver={(e) => handleDragOver(e, panel.panelId)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, panel.panelId)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// Sub-Component: Individual Tree Element with Drag Handle & SVG Sub-Part Decomposition
interface SceneTreeItemProps {
  panel: Panel;
  isSelected: boolean;
  activeSubPartSelection: { panelId: string; partId: string } | null;
  isExpanded: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  dragOverPosition?: 'before' | 'after' | 'inside_group' | null;
  onToggleExpand: (e: React.MouseEvent) => void;
  onSelectPanel: (panelId: string, isMulti: boolean) => void;
  onSelectSubPart: (panelId: string, partId: string) => void;
  onToggleVisibility: (panelId: string) => void;
  onToggleLock: (panelId: string) => void;
  onReorderZIndex?: (panelId: string, action: 'up' | 'down' | 'top' | 'bottom') => void;
  onDeletePanel: (panelId: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

const SceneTreeItem: React.FC<SceneTreeItemProps> = ({
  panel,
  isSelected,
  activeSubPartSelection,
  isExpanded,
  isDragging = false,
  isDragOver = false,
  dragOverPosition = null,
  onToggleExpand,
  onSelectPanel,
  onSelectSubPart,
  onToggleVisibility,
  onToggleLock,
  onReorderZIndex,
  onDeletePanel,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const { icon, color } = getPanelIcon(panel);
  const isSymbol = !!panel.symbolId || !!panel.symbolAnimType;
  const svgParts = isSymbol ? getSymbolParts(panel.symbolId) : [];
  const hasSubParts = svgParts.length > 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-xl border transition-all overflow-hidden ${
        isDragging ? 'opacity-40 border-dashed border-sky-400 bg-sky-950/20' : ''
      } ${
        isDragOver && dragOverPosition === 'before'
          ? 'border-t-2 border-t-sky-400'
          : isDragOver && dragOverPosition === 'after'
          ? 'border-b-2 border-b-sky-400'
          : 'border-slate-800/80 bg-slate-900/60'
      }`}
    >
      {/* Drop Indicator Lines */}
      {isDragOver && dragOverPosition === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-sky-400 z-30 shadow-[0_0_8px_rgba(56,189,248,1)]"></div>
      )}
      {isDragOver && dragOverPosition === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 z-30 shadow-[0_0_8px_rgba(56,189,248,1)]"></div>
      )}

      {/* Main Element Item Row */}
      <div
        onClick={(e) => onSelectPanel(panel.panelId, e.ctrlKey || e.metaKey || e.shiftKey)}
        className={`flex items-center justify-between px-2 py-1.5 cursor-pointer transition-all ${
          isSelected
            ? 'bg-sky-500/20 text-sky-200 border-l-2 border-sky-400 font-bold'
            : 'hover:bg-slate-800/60 text-slate-300'
        } ${panel.isHidden ? 'opacity-40' : ''}`}
      >
        <div className="flex items-center space-x-1.5 min-w-0 flex-1">
          {/* Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-300 px-0.5"
            title="Drag up or down to reorder layer z-index"
          >
            <i className="fas fa-grip-vertical text-[10px]"></i>
          </div>

          {hasSubParts ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-0.5 text-slate-400 hover:text-white"
            >
              <i className={`fas ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-[9px] w-3 text-center`}></i>
            </button>
          ) : (
            <span className="w-3"></span>
          )}

          <i className={`fas ${icon} ${color} text-xs shrink-0`}></i>
          <span className="truncate text-[11px] font-medium" title={panel.panelName || 'Unnamed'}>
            {panel.panelName || panel.type || 'Widget'}
          </span>

          {/* Active Data Source Badge */}
          {(panel.driverTagId || panel.topic) && (
            <span className="text-[8px] font-mono bg-slate-950 px-1 py-0.2 rounded text-slate-400 border border-slate-800 shrink-0 truncate max-w-[70px]">
              {panel.driverTagId || panel.topic}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-0.5 shrink-0 ml-1">
          {/* Step Reorder Controls (Z-Index) */}
          {onReorderZIndex && isSelected && (
            <div className="flex items-center space-x-0.5 mr-1 bg-slate-950 px-0.5 py-0.2 rounded border border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReorderZIndex(panel.panelId, 'up');
                }}
                className="p-0.5 text-slate-400 hover:text-sky-300 text-[8px]"
                title="Move Layer Up"
              >
                <i className="fas fa-arrow-up"></i>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReorderZIndex(panel.panelId, 'down');
                }}
                className="p-0.5 text-slate-400 hover:text-sky-300 text-[8px]"
                title="Move Layer Down"
              >
                <i className="fas fa-arrow-down"></i>
              </button>
            </div>
          )}

          {/* Visibility Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(panel.panelId);
            }}
            className={`p-1 rounded hover:bg-slate-800 transition-colors ${
              panel.isHidden ? 'text-slate-600' : 'text-slate-400 hover:text-sky-300'
            }`}
            title={panel.isHidden ? "Unhide on Canvas" : "Hide on Canvas"}
          >
            <i className={`fas ${panel.isHidden ? 'fa-eye-slash' : 'fa-eye'} text-[10px]`}></i>
          </button>

          {/* Lock / Unlock Movement Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(panel.panelId);
            }}
            className={`p-1 rounded hover:bg-slate-800 transition-colors ${
              panel.isLocked ? 'text-amber-400' : 'text-slate-500 hover:text-amber-300'
            }`}
            title={panel.isLocked ? "Unlock Position & Movement" : "Lock Position & Movement"}
          >
            <i className={`fas ${panel.isLocked ? 'fa-lock' : 'fa-lock-open'} text-[10px]`}></i>
          </button>

          {/* Delete Element */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeletePanel(panel.panelId);
            }}
            className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
            title="Delete Element"
          >
            <i className="fas fa-trash text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* SVG Sub-Part Decomposition Nodes */}
      {hasSubParts && isExpanded && (
        <div className="pl-6 pr-2 py-1 space-y-0.5 bg-slate-950/70 border-t border-slate-800/40">
          <div className="text-[9px] font-bold text-sky-400/80 uppercase tracking-wider mb-1 flex items-center space-x-1">
            <i className="fas fa-puzzle-piece text-[8px]"></i>
            <span>SVG Anatomy Parts ({svgParts.length})</span>
          </div>

          {svgParts.map(part => {
            const isSubPartActive = activeSubPartSelection?.panelId === panel.panelId && activeSubPartSelection?.partId === part.partId;
            const subConfig = panel.svgSubParts?.[part.partId];
            const currentFill = subConfig?.fill || part.defaultFill || '#0284c7';

            return (
              <div
                key={part.partId}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSubPart(panel.panelId, part.partId);
                }}
                className={`flex items-center justify-between px-2 py-1 rounded text-[10px] cursor-pointer transition-colors ${
                  isSubPartActive
                    ? 'bg-sky-500/30 text-sky-200 font-bold border border-sky-500/50 shadow-sm'
                    : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-700 shrink-0"
                    style={{ backgroundColor: currentFill }}
                  ></span>
                  <i className={`fas ${part.icon} text-[9px] text-slate-400`}></i>
                  <span className="truncate">{part.name}</span>
                </div>

                {subConfig?.animType && subConfig.animType !== 'none' && (
                  <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1 py-0.2 rounded border border-indigo-500/40 shrink-0 font-mono">
                    {subConfig.animType}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
