import React, { useState, useMemo } from 'react';
import { Panel, AppState, SvgSubPartConfig } from '../types';
import { ColorBoxPopover } from './ColorBoxPopover';
import { TagAutocompleteInput } from './TagAutocompleteInput';
import { TopicAutocompleteInput } from './TopicAutocompleteInput';
import { getSymbolParts } from '../utils/symbolAnatomyRegistry';

interface HmiCanvasConfigInspectorProps {
  appState: AppState;
  selectedPanels: Panel[];
  activeSubPartSelection: { panelId: string; partId: string } | null;
  onUpdatePanelProp: (panelId: string, key: keyof Panel, value: any) => void;
  onUpdateBatchProp: (key: keyof Panel, value: any) => void;
  onUpdateSvgSubPart: (panelId: string, partId: string, updates: Partial<SvgSubPartConfig>) => void;
  onAlignPanels?: (type: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom' | 'sameW' | 'sameH' | 'distH' | 'distV') => void;
  onUngroup?: (groupId: string) => void;
  onDuplicateSelected?: () => void;
  onDeleteSelected?: () => void;
  onOpenFullEditModal?: (panel: Panel) => void;
  onClearSubPartSelection?: () => void;
}

export const HmiCanvasConfigInspector: React.FC<HmiCanvasConfigInspectorProps> = ({
  appState,
  selectedPanels,
  activeSubPartSelection,
  onUpdatePanelProp,
  onUpdateBatchProp,
  onUpdateSvgSubPart,
  onAlignPanels,
  onUngroup,
  onDuplicateSelected,
  onDeleteSelected,
  onOpenFullEditModal,
  onClearSubPartSelection
}) => {
  // Collapsible section states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    visual: true,
    geometry: true,
    telemetry: true,
    dynamics: false,
    group: true,
    subpart: true
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Determine active mode
  const isGroupSelected = selectedPanels.length > 1;
  const isSinglePanelSelected = selectedPanels.length === 1 && !activeSubPartSelection;
  const isSubPartSelected = !!activeSubPartSelection;

  const targetPanel = selectedPanels[0];
  const targetSubPart = useMemo(() => {
    if (!activeSubPartSelection || !targetPanel) return null;
    const parts = getSymbolParts(targetPanel.symbolId);
    const partDef = parts.find(p => p.partId === activeSubPartSelection.partId);
    const subConfig = targetPanel.svgSubParts?.[activeSubPartSelection.partId] || {};
    return {
      def: partDef,
      config: subConfig
    };
  }, [activeSubPartSelection, targetPanel]);

  // Compute bounding box for multi-element groups
  const groupBoundingBox = useMemo(() => {
    if (selectedPanels.length <= 1) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedPanels.forEach(p => {
      const px = p.x ?? 0;
      const py = p.y ?? 0;
      const pw = p.w ?? 100;
      const ph = p.h ?? 60;
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px + pw);
      maxY = Math.max(maxY, py + ph);
    });

    return {
      x: minX,
      y: minY,
      w: Math.max(40, maxX - minX),
      h: Math.max(30, maxY - minY)
    };
  }, [selectedPanels]);

  if (selectedPanels.length === 0 && !activeSubPartSelection) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500 space-y-3 select-none">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
          <i className="fas fa-sliders text-xl"></i>
        </div>
        <div>
          <h4 className="font-bold text-slate-300 text-xs">No Element Selected</h4>
          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
            Click any widget on the canvas or Explorer tree to inspect and adjust its properties live.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-slate-200 select-none text-xs overflow-y-auto custom-scrollbar">
      {/* ------------------------------------------------------------- */}
      {/* 1. SVG SUB-PART INSPECTION MODE                                */}
      {/* ------------------------------------------------------------- */}
      {isSubPartSelected && targetSubPart && targetPanel && (
        <div className="p-3 space-y-3">
          {/* Sub-Part Header */}
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 min-w-0">
                <i className={`fas ${targetSubPart.def?.icon || 'fa-puzzle-piece'} text-sky-400 text-sm`}></i>
                <span className="font-bold text-sky-200 truncate text-xs">
                  {targetSubPart.def?.name || activeSubPartSelection.partId}
                </span>
              </div>
              {onClearSubPartSelection && (
                <button
                  type="button"
                  onClick={onClearSubPartSelection}
                  className="text-slate-400 hover:text-white p-1 text-[10px]"
                  title="Close Sub-Part Inspector"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-mono">
              <span>Parent: <strong className="text-slate-200">{targetPanel.panelName}</strong></span>
              <span>•</span>
              <span className="uppercase text-sky-300">{targetSubPart.def?.category || 'part'}</span>
            </div>
          </div>

          {/* Sub-Part Visual Styling Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div
              onClick={() => toggleSection('subpart')}
              className="flex items-center justify-between px-3 py-2 bg-slate-900/90 cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                <i className="fas fa-palette text-amber-400"></i>
                <span>Part Visual Styling</span>
              </div>
              <i className={`fas ${openSections.subpart ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] text-slate-500`}></i>
            </div>

            {openSections.subpart && (
              <div className="p-3 space-y-2.5">
                {/* Part Fill Color */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-medium">Fill Color:</span>
                  <ColorBoxPopover
                    label="Fill"
                    icon="fa-fill-drip"
                    iconColorClass="text-amber-400"
                    color={targetSubPart.config.fill || targetSubPart.def?.defaultFill || '#0284c7'}
                    onChange={(newColor) =>
                      onUpdateSvgSubPart(targetPanel.panelId, activeSubPartSelection.partId, { fill: newColor })
                    }
                    defaultColor={targetSubPart.def?.defaultFill || '#0284c7'}
                  />
                </div>

                {/* Part Stroke / Border Color */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-medium">Border Stroke:</span>
                  <ColorBoxPopover
                    label="Stroke"
                    icon="fa-border-all"
                    iconColorClass="text-sky-400"
                    color={targetSubPart.config.stroke || targetSubPart.def?.defaultStroke || '#0f172a'}
                    onChange={(newColor) =>
                      onUpdateSvgSubPart(targetPanel.panelId, activeSubPartSelection.partId, { stroke: newColor })
                    }
                    defaultColor="#0f172a"
                  />
                </div>

                {/* Part Stroke Width */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Stroke Width:</span>
                    <span className="font-mono text-slate-200">{targetSubPart.config.strokeWidth ?? 1.2}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.5"
                    value={targetSubPart.config.strokeWidth ?? 1.2}
                    onChange={(e) =>
                      onUpdateSvgSubPart(targetPanel.panelId, activeSubPartSelection.partId, {
                        strokeWidth: parseFloat(e.target.value)
                      })
                    }
                    className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Part Opacity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Part Opacity:</span>
                    <span className="font-mono text-purple-300">{Math.round((targetSubPart.config.opacity ?? 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={targetSubPart.config.opacity ?? 1}
                    onChange={(e) =>
                      onUpdateSvgSubPart(targetPanel.panelId, activeSubPartSelection.partId, {
                        opacity: parseFloat(e.target.value)
                      })
                    }
                    className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Part Visibility Toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-[11px] text-slate-300 font-medium">Part Visible on Canvas:</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSvgSubPart(targetPanel.panelId, activeSubPartSelection.partId, {
                        isHidden: !targetSubPart.config.isHidden
                      })
                    }
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      targetSubPart.config.isHidden
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    <i className={`fas ${targetSubPart.config.isHidden ? 'fa-eye-slash' : 'fa-eye'} mr-1`}></i>
                    {targetSubPart.config.isHidden ? 'Hidden' : 'Visible'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sub-Part Animation Override Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 font-bold text-slate-200 text-xs flex items-center space-x-1.5">
              <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
              <span>Part Animation</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium">Animation Effect:</label>
                <select
                  value={targetSubPart.config.animType || 'none'}
                  onChange={(e) =>
                    onUpdateSvgSubPart(targetPanel.panelId, activeSubPartSelection.partId, {
                      animType: e.target.value as any
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none cursor-pointer"
                >
                  <option value="none">None (Static)</option>
                  <option value="spin">Continuous Rotation Spin</option>
                  <option value="pulse">Pulse / Glow Flashing</option>
                  <option value="level_fill">Dynamic Level Fill</option>
                  <option value="color_shift">Tag Threshold Color Shift</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. GROUP CONTAINER INSPECTION MODE (2+ elements selected)      */}
      {/* ------------------------------------------------------------- */}
      {isGroupSelected && !isSubPartSelected && (
        <div className="p-3 space-y-3">
          {/* Group Header Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <i className="fas fa-layer-group text-amber-400 text-sm"></i>
                <span className="font-extrabold text-amber-300 text-xs">
                  {targetPanel?.groupName || `Group Container (${selectedPanels.length} Items)`}
                </span>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/30">
                {selectedPanels.length} Selected
              </span>
            </div>
            <p className="text-[9px] text-slate-400">
              Changes applied here will synchronize across all {selectedPanels.length} container members.
            </p>
          </div>

          {/* Group Common Physical Styling Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div
              onClick={() => toggleSection('visual')}
              className="flex items-center justify-between px-3 py-2 bg-slate-900/90 cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                <i className="fas fa-palette text-amber-400"></i>
                <span>Common Physical Styling</span>
              </div>
              <i className={`fas ${openSections.visual ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] text-slate-500`}></i>
            </div>

            {openSections.visual && (
              <div className="p-3 space-y-2.5">
                {/* Batch Background Color */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-medium">Element BG:</span>
                  <ColorBoxPopover
                    label="BG"
                    icon="fa-fill-drip"
                    iconColorClass="text-amber-400"
                    color={targetPanel?.bgColor || 'transparent'}
                    onChange={(newColor) => onUpdateBatchProp('bgColor', newColor)}
                    defaultColor="#09152b"
                  />
                </div>

                {/* Batch Text Color */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-medium">Text Color:</span>
                  <ColorBoxPopover
                    label="Text"
                    icon="fa-font"
                    iconColorClass="text-sky-400"
                    color={targetPanel?.textColor || '#f8fafc'}
                    onChange={(newColor) => onUpdateBatchProp('textColor', newColor)}
                    defaultColor="#f8fafc"
                  />
                </div>

                {/* Batch Border Color */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-medium">Border Color:</span>
                  <ColorBoxPopover
                    label="Border"
                    icon="fa-border-all"
                    iconColorClass="text-emerald-400"
                    color={targetPanel?.borderColor || '#1e293b'}
                    onChange={(newColor) => onUpdateBatchProp('borderColor', newColor)}
                    defaultColor="#0284c7"
                  />
                </div>

                {/* Batch Opacity Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Common Opacity:</span>
                    <span className="font-mono text-purple-300">{Math.round((targetPanel?.opacity ?? 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={targetPanel?.opacity ?? 1}
                    onChange={(e) => onUpdateBatchProp('opacity', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Batch Rotation Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Common Rotation:</span>
                    <span className="font-mono text-amber-300">{(targetPanel?.rotation ?? 0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={targetPanel?.rotation ?? 0}
                    onChange={(e) => onUpdateBatchProp('rotation', parseInt(e.target.value) || 0)}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Batch Corner Radius */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Corner Radius:</span>
                    <span className="font-mono text-sky-300">{targetPanel?.borderRadius ?? 8}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="2"
                    value={targetPanel?.borderRadius ?? 8}
                    onChange={(e) => onUpdateBatchProp('borderRadius', parseInt(e.target.value) || 0)}
                    className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Group Batch Alignment Card */}
          {onAlignPanels && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 font-bold text-slate-200 text-xs flex items-center space-x-1.5">
                <i className="fas fa-align-left text-sky-400"></i>
                <span>Align Container Elements</span>
              </div>
              <div className="p-2.5 grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => onAlignPanels('left')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white flex flex-col items-center space-y-1 text-[9px]"
                  title="Align Left"
                >
                  <i className="fas fa-align-left"></i>
                  <span>Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPanels('centerH')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white flex flex-col items-center space-y-1 text-[9px]"
                  title="Align Center Horizontal"
                >
                  <i className="fas fa-align-center"></i>
                  <span>Center</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPanels('right')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white flex flex-col items-center space-y-1 text-[9px]"
                  title="Align Right"
                >
                  <i className="fas fa-align-right"></i>
                  <span>Right</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPanels('top')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white flex flex-col items-center space-y-1 text-[9px]"
                  title="Align Top"
                >
                  <i className="fas fa-arrow-up"></i>
                  <span>Top</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPanels('centerV')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white flex flex-col items-center space-y-1 text-[9px]"
                  title="Align Middle Vertical"
                >
                  <i className="fas fa-arrows-up-down"></i>
                  <span>Middle</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPanels('bottom')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white flex flex-col items-center space-y-1 text-[9px]"
                  title="Align Bottom"
                >
                  <i className="fas fa-arrow-down"></i>
                  <span>Bottom</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPanels('sameW')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white flex flex-col items-center space-y-1 text-[9px]"
                  title="Make Same Width"
                >
                  <i className="fas fa-arrows-left-right"></i>
                  <span>= Width</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignPanels('sameH')}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white flex flex-col items-center space-y-1 text-[9px]"
                  title="Make Same Height"
                >
                  <i className="fas fa-arrows-up-down"></i>
                  <span>= Height</span>
                </button>
              </div>
            </div>
          )}

          {/* Group Operations Toolbar */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5">
            {onUngroup && targetPanel?.groupId && (
              <button
                type="button"
                onClick={() => onUngroup(targetPanel.groupId!)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
              >
                <i className="fas fa-link-slash"></i>
                <span>Ungroup</span>
              </button>
            )}

            {onDuplicateSelected && (
              <button
                type="button"
                onClick={onDuplicateSelected}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
              >
                <i className="fas fa-copy"></i>
                <span>Duplicate</span>
              </button>
            )}

            {onDeleteSelected && (
              <button
                type="button"
                onClick={onDeleteSelected}
                className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                title="Delete Group"
              >
                <i className="fas fa-trash"></i>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SINGLE ELEMENT INSPECTION MODE                              */}
      {/* ------------------------------------------------------------- */}
      {isSinglePanelSelected && targetPanel && (
        <div className="p-3 space-y-3">
          {/* Element Identity Header */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={targetPanel.panelName || ''}
                onChange={(e) => onUpdatePanelProp(targetPanel.panelId, 'panelName', e.target.value)}
                placeholder="Element Name"
                className="bg-transparent font-extrabold text-white text-xs outline-none w-full focus:bg-slate-950 focus:px-1 rounded"
              />
              <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-mono mt-0.5">
                <span className="uppercase text-sky-400">{targetPanel.type}</span>
                <span>•</span>
                <span>ID: {targetPanel.panelId.slice(-6)}</span>
              </div>
            </div>

            {onOpenFullEditModal && (
              <button
                type="button"
                onClick={() => onOpenFullEditModal(targetPanel)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white rounded-lg transition-colors shrink-0 ml-2"
                title="Open Full Parameter Configuration Modal"
              >
                <i className="fas fa-gear text-xs"></i>
              </button>
            )}
          </div>

          {/* Visual Styling Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div
              onClick={() => toggleSection('visual')}
              className="flex items-center justify-between px-3 py-2 bg-slate-900/90 cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                <i className="fas fa-palette text-amber-400"></i>
                <span>Visual Styling</span>
              </div>
              <i className={`fas ${openSections.visual ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] text-slate-500`}></i>
            </div>

            {openSections.visual && (
              <div className="p-3 space-y-2.5">
                {/* Element BG */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-medium">Element BG:</span>
                  <ColorBoxPopover
                    label="BG"
                    icon="fa-fill-drip"
                    iconColorClass="text-amber-400"
                    color={targetPanel.bgColor || 'transparent'}
                    onChange={(newColor) => onUpdatePanelProp(targetPanel.panelId, 'bgColor', newColor)}
                    defaultColor="#09152b"
                  />
                </div>

                {/* Text Color */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-medium">Text Color:</span>
                  <ColorBoxPopover
                    label="Text"
                    icon="fa-font"
                    iconColorClass="text-sky-400"
                    color={targetPanel.textColor || '#f8fafc'}
                    onChange={(newColor) => onUpdatePanelProp(targetPanel.panelId, 'textColor', newColor)}
                    defaultColor="#f8fafc"
                  />
                </div>

                {/* Border Color */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-medium">Border Color:</span>
                  <ColorBoxPopover
                    label="Border"
                    icon="fa-border-all"
                    iconColorClass="text-emerald-400"
                    color={targetPanel.borderColor || '#1e293b'}
                    onChange={(newColor) => onUpdatePanelProp(targetPanel.panelId, 'borderColor', newColor)}
                    defaultColor="#0284c7"
                  />
                </div>

                {/* Opacity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Opacity:</span>
                    <span className="font-mono text-purple-300">{Math.round((targetPanel.opacity ?? 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={targetPanel.opacity ?? 1}
                    onChange={(e) => onUpdatePanelProp(targetPanel.panelId, 'opacity', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Rotation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Rotation:</span>
                    <span className="font-mono text-amber-300">{(targetPanel.rotation ?? 0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={targetPanel.rotation ?? 0}
                    onChange={(e) => onUpdatePanelProp(targetPanel.panelId, 'rotation', parseInt(e.target.value) || 0)}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>

                {/* Corner Radius */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Corner Radius:</span>
                    <span className="font-mono text-sky-300">{targetPanel.borderRadius ?? 8}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="2"
                    value={targetPanel.borderRadius ?? 8}
                    onChange={(e) => onUpdatePanelProp(targetPanel.panelId, 'borderRadius', parseInt(e.target.value) || 0)}
                    className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Geometry & Coordinates Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div
              onClick={() => toggleSection('geometry')}
              className="flex items-center justify-between px-3 py-2 bg-slate-900/90 cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                <i className="fas fa-vector-square text-sky-400"></i>
                <span>Position & Dimensions</span>
              </div>
              <i className={`fas ${openSections.geometry ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] text-slate-500`}></i>
            </div>

            {openSections.geometry && (
              <div className="p-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">X Pos (px):</label>
                  <input
                    type="number"
                    value={targetPanel.x ?? 0}
                    onChange={(e) => onUpdatePanelProp(targetPanel.panelId, 'x', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Y Pos (px):</label>
                  <input
                    type="number"
                    value={targetPanel.y ?? 0}
                    onChange={(e) => onUpdatePanelProp(targetPanel.panelId, 'y', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Width (W):</label>
                  <input
                    type="number"
                    value={targetPanel.w ?? 100}
                    onChange={(e) => onUpdatePanelProp(targetPanel.panelId, 'w', Math.max(20, parseInt(e.target.value) || 20))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Height (H):</label>
                  <input
                    type="number"
                    value={targetPanel.h ?? 60}
                    onChange={(e) => onUpdatePanelProp(targetPanel.panelId, 'h', Math.max(20, parseInt(e.target.value) || 20))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 font-mono text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Telemetry Tag Binding Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div
              onClick={() => toggleSection('telemetry')}
              className="flex items-center justify-between px-3 py-2 bg-slate-900/90 cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                <i className="fas fa-bolt text-emerald-400"></i>
                <span>Telemetry & Tag Binding</span>
              </div>
              <i className={`fas ${openSections.telemetry ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] text-slate-500`}></i>
            </div>

            {openSections.telemetry && (
              <div className="p-3 space-y-2.5">
                {/* Data Source Mode */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">Source Mode:</span>
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => onUpdatePanelProp(targetPanel.panelId, 'dataSourceMode', 'mqtt')}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                        (targetPanel.dataSourceMode || 'mqtt') === 'mqtt'
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      MQTT
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdatePanelProp(targetPanel.panelId, 'dataSourceMode', 'driver')}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                        targetPanel.dataSourceMode === 'driver'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Driver Tag
                    </button>
                  </div>
                </div>

                {/* Topic / Driver Tag ID input */}
                {targetPanel.dataSourceMode === 'driver' ? (
                  <div>
                    <TagAutocompleteInput
                      name="driverTagId"
                      label="Driver Tag ID (Modbus / Siemens / OPC-UA / Serial)"
                      value={targetPanel.driverTagId || ''}
                      onChange={(val) => onUpdatePanelProp(targetPanel.panelId, 'driverTagId', val)}
                      tagType="read"
                      appState={appState}
                      placeholder="e.g. MODBUS_HOLDING_40001, SIEMENS_DB1_DBD0"
                    />
                  </div>
                ) : (
                  <div>
                    <TopicAutocompleteInput
                      name="topic"
                      label="MQTT Telemetry Topic"
                      value={targetPanel.topic || ''}
                      onChange={(val) => onUpdatePanelProp(targetPanel.panelId, 'topic', val)}
                      direction="subscribe"
                      appState={appState}
                      placeholder="e.g. factory/boiler/temperature"
                    />
                  </div>
                )}

                {/* Unit & Decimals */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">Unit String:</label>
                    <input
                      type="text"
                      value={targetPanel.unit || ''}
                      onChange={(e) => onUpdatePanelProp(targetPanel.panelId, 'unit', e.target.value)}
                      placeholder="e.g. °C, PSI, RPM"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono">Decimals:</label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={targetPanel.decimals ?? 1}
                      onChange={(e) => onUpdatePanelProp(targetPanel.panelId, 'decimals', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
