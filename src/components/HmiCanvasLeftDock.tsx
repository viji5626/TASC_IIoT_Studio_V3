import React, { useEffect, useMemo } from 'react';
import { Panel, AppState, SvgSubPartConfig, DynamicBehaviorRule, DynamicPropertyType } from '../types';
import { HmiCanvasExplorer } from './HmiCanvasExplorer';
import { HmiCanvasConfigInspector } from './HmiCanvasConfigInspector';
import { HmiCanvasDynamicsInspector } from './HmiCanvasDynamicsInspector';

interface HmiCanvasLeftDockProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeTab: 'explorer' | 'config' | 'dynamics';
  onChangeTab: (tab: 'explorer' | 'config' | 'dynamics') => void;
  dockMode?: 'push' | 'overlay';
  onToggleDockMode?: () => void;
  panels: Panel[];
  selectedPanels: Panel[];
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
  onUpdatePanelProp: (panelId: string, key: keyof Panel, value: any) => void;
  onUpdateBatchProp: (key: keyof Panel, value: any) => void;
  onUpdateSvgSubPart: (panelId: string, partId: string, updates: Partial<SvgSubPartConfig>) => void;
  onAddDynamicRule: (panelId: string, partId: string | null, ruleType: DynamicPropertyType) => void;
  onUpdateDynamicRule: (panelId: string, partId: string | null, ruleId: string, updates: Partial<DynamicBehaviorRule>) => void;
  onDeleteDynamicRule: (panelId: string, partId: string | null, ruleId: string) => void;
  onToggleDynamicRule: (panelId: string, partId: string | null, ruleId: string) => void;
  onAlignPanels?: (type: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'sameW' | 'sameH' | 'distH' | 'distV') => void;
  onDuplicateSelected?: () => void;
  onDeleteSelected?: () => void;
  onOpenFullEditModal?: (panel: Panel) => void;
  onClearSubPartSelection?: () => void;
  appState: AppState;
}

export const HmiCanvasLeftDock: React.FC<HmiCanvasLeftDockProps> = ({
  isOpen,
  onToggleOpen,
  activeTab,
  onChangeTab,
  dockMode = 'push',
  onToggleDockMode,
  panels,
  selectedPanels,
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
  onOpenAddPanel,
  onUpdatePanelProp,
  onUpdateBatchProp,
  onUpdateSvgSubPart,
  onAddDynamicRule,
  onUpdateDynamicRule,
  onDeleteDynamicRule,
  onToggleDynamicRule,
  onAlignPanels,
  onDuplicateSelected,
  onDeleteSelected,
  onOpenFullEditModal,
  onClearSubPartSelection,
  appState
}) => {
  // Global hotkeys (Alt+E for Explorer, Alt+C for Config, Alt+D for Dynamics)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        onChangeTab('explorer');
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        onChangeTab('config');
      } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        onChangeTab('dynamics');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChangeTab]);

  // Calculate dynamic rule count for current target (Sub-Part or Panel)
  const targetDynamicsCount = useMemo(() => {
    const p = selectedPanels[0];
    if (!p) return 0;
    if (activeSubPartSelection) {
      const subConfig = p.svgSubParts?.[activeSubPartSelection.partId];
      return subConfig?.dynamics?.length || 0;
    }
    return p.dynamics?.length || 0;
  }, [selectedPanels, activeSubPartSelection]);

  return (
    <div className="relative flex shrink-0 z-30 h-full">
      {/* Main Drawer Panel */}
      <div
        className={`h-full bg-slate-950/95 border-r border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'w-[320px] sm:w-[340px] lg:w-[360px]' : 'w-0 border-r-0'
        }`}
      >
        {/* Dock Top Header Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950 px-2 py-1.5 shrink-0">
          <div className="flex items-center space-x-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
            {/* Explorer Tab Button */}
            <button
              type="button"
              onClick={() => onChangeTab('explorer')}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'explorer'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Scene Graph & Tree Hierarchy (Alt+E)"
            >
              <i className="fas fa-folder-tree text-xs"></i>
              <span>Explorer</span>
              <span className={`text-[9px] font-mono px-1 py-0.2 rounded-full ${
                activeTab === 'explorer' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {panels.length}
              </span>
            </button>

            {/* Config Tab Button */}
            <button
              type="button"
              onClick={() => onChangeTab('config')}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Physical Properties (Alt+C)"
            >
              <i className="fas fa-sliders text-xs"></i>
              <span>Config</span>
              {selectedPanels.length > 0 && (
                <span className={`text-[9px] font-mono px-1 py-0.2 rounded-full font-bold ${
                  activeTab === 'config' ? 'bg-slate-950/30 text-slate-950' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {activeSubPartSelection ? 'Part' : selectedPanels.length}
                </span>
              )}
            </button>

            {/* Dynamics Tab Button */}
            <button
              type="button"
              onClick={() => onChangeTab('dynamics')}
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dynamics'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Multi-Dynamics & Telemetry Pipeline (Alt+D)"
            >
              <i className="fas fa-bolt text-xs"></i>
              <span>Dynamics</span>
              {targetDynamicsCount > 0 && (
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === 'dynamics' ? 'bg-slate-950/40 text-slate-950' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {targetDynamicsCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Dock Actions */}
          <div className="flex items-center space-x-1">
            {onToggleDockMode && (
              <button
                type="button"
                onClick={onToggleDockMode}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  dockMode === 'push'
                    ? 'text-sky-400 hover:bg-slate-800'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
                title={dockMode === 'push' ? "Dock Pinned (Push Canvas)" : "Dock Floating (Overlay)"}
              >
                <i className={`fas ${dockMode === 'push' ? 'fa-thumbtack' : 'fa-window-restore'}`}></i>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Collapse Studio Panel"
            >
              <i className="fas fa-chevron-left text-xs"></i>
            </button>
          </div>
        </div>

        {/* Tab Body Content (Vertically Scrollable) */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {activeTab === 'explorer' ? (
            <HmiCanvasExplorer
              panels={panels}
              selectedPanelIds={selectedPanelIds}
              activeSubPartSelection={activeSubPartSelection}
              onSelectPanel={onSelectPanel}
              onSelectGroup={onSelectGroup}
              onSelectSubPart={onSelectSubPart}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onToggleGroupVisibility={onToggleGroupVisibility}
              onToggleGroupLock={onToggleGroupLock}
              onUngroup={onUngroup}
              onRenameGroup={onRenameGroup}
              onReorderZIndex={onReorderZIndex}
              onMovePanelToIndex={onMovePanelToIndex}
              onNestPanelIntoGroup={onNestPanelIntoGroup}
              onDeletePanel={onDeletePanel}
              onDeleteGroup={onDeleteGroup}
              onOpenAddPanel={onOpenAddPanel}
            />
          ) : activeTab === 'config' ? (
            <HmiCanvasConfigInspector
              appState={appState}
              selectedPanels={selectedPanels}
              activeSubPartSelection={activeSubPartSelection}
              onUpdatePanelProp={onUpdatePanelProp}
              onUpdateBatchProp={onUpdateBatchProp}
              onUpdateSvgSubPart={onUpdateSvgSubPart}
              onAlignPanels={onAlignPanels}
              onUngroup={onUngroup}
              onDuplicateSelected={onDuplicateSelected}
              onDeleteSelected={onDeleteSelected}
              onOpenFullEditModal={onOpenFullEditModal}
              onClearSubPartSelection={onClearSubPartSelection}
            />
          ) : (
            <HmiCanvasDynamicsInspector
              appState={appState}
              selectedPanels={selectedPanels}
              activeSubPartSelection={activeSubPartSelection}
              onAddDynamicRule={onAddDynamicRule}
              onUpdateDynamicRule={onUpdateDynamicRule}
              onDeleteDynamicRule={onDeleteDynamicRule}
              onToggleDynamicRule={onToggleDynamicRule}
              onClearSubPartSelection={onClearSubPartSelection}
            />
          )}
        </div>
      </div>

      {/* Retractable Outer Edge Grab Handle */}
      <button
        type="button"
        onClick={onToggleOpen}
        className={`absolute top-1/2 -translate-y-1/2 z-40 bg-slate-900 hover:bg-sky-500 text-slate-400 hover:text-slate-950 border border-slate-700 hover:border-sky-400 py-3 px-1 rounded-r-xl shadow-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
          isOpen ? 'left-[320px] sm:left-[340px] lg:left-[360px]' : 'left-0'
        }`}
        title={isOpen ? "Collapse Studio Dock (Alt+E)" : "Open Scene Explorer & Config Dock (Alt+E)"}
      >
        <i className={`fas ${isOpen ? 'fa-chevron-left' : 'fa-chevron-right'} text-[10px]`}></i>
      </button>
    </div>
  );
};
