import React from 'react';
import { TransformMode, CoordinateSpace, TransformSnapConfig } from '../types/transform';
import { CameraPresetView, CameraProjection } from '../types/scene';

interface ViewportToolbarProps {
  onBack?: () => void;
  hasUnsavedChanges?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  mode: TransformMode;
  onSetMode: (mode: TransformMode) => void;
  space: CoordinateSpace;
  onSetSpace: (space: CoordinateSpace) => void;
  snapConfig: TransformSnapConfig;
  onSetSnapConfig: (config: Partial<TransformSnapConfig>) => void;
  projection: CameraProjection;
  onSetProjection: (proj: CameraProjection) => void;
  onSetPresetView: (preset: CameraPresetView) => void;
  onFrameSelected: () => void;
  onFrameAll: () => void;
  isRuntimeMode: boolean;
  onToggleRuntimeMode: () => void;
  onSaveScene: () => void;
  onSaveToLibrary: () => void;
  onOpenLibrary: () => void;
  onImportCad?: () => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
  axisVisible: boolean;
  onToggleAxis: () => void;
  hasSelectedObject: boolean;
}

export const ViewportToolbar: React.FC<ViewportToolbarProps> = ({
  onBack,
  hasUnsavedChanges = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  mode,
  onSetMode,
  space,
  onSetSpace,
  snapConfig,
  onSetSnapConfig,
  projection,
  onSetProjection,
  onSetPresetView,
  onFrameSelected,
  onFrameAll,
  isRuntimeMode,
  onToggleRuntimeMode,
  onSaveScene,
  onSaveToLibrary,
  onOpenLibrary,
  onImportCad,
  gridVisible,
  onToggleGrid,
  axisVisible,
  onToggleAxis,
  hasSelectedObject
}) => {
  return (
    <div 
      className="h-12 bg-slate-900/95 border-b border-slate-800 px-3 flex items-center justify-between gap-2 select-none z-20 shrink-0 text-xs shadow-md"
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Left Section: Back Button, Undo/Redo & Transform Manipulation Tools */}
      <div className="flex items-center gap-1.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 font-bold rounded-lg flex items-center gap-2 transition-all shadow-sm cursor-pointer mr-1 group"
            title="Return to 2D Dashboard"
          >
            <i className="fas fa-arrow-left text-xs text-sky-400 group-hover:-translate-x-0.5 transition-transform"></i>
            <span>Back</span>
            {hasUnsavedChanges && (
              <span 
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" 
                title="Unsaved changes in scene"
              ></span>
            )}
          </button>
        )}

        {!isRuntimeMode && (
          <>
            {/* Undo & Redo Quick Buttons (Icon-Only Compact) */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 mr-1">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  canUndo
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed opacity-30'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <i className="fas fa-rotate-left text-xs"></i>
              </button>

              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  canRedo
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed opacity-30'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <i className="fas fa-rotate-right text-xs"></i>
              </button>
            </div>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => onSetMode('select')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                  mode === 'select'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Select Tool (Q)"
              >
                <i className="fas fa-mouse-pointer text-xs"></i>
                <span className="hidden sm:inline">Select</span>
              </button>

              <button
                type="button"
                onClick={() => onSetMode('translate')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                  mode === 'translate'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Move Tool (W)"
              >
                <i className="fas fa-arrows-up-down-left-right text-xs"></i>
                <span className="hidden sm:inline">Move</span>
              </button>

              <button
                type="button"
                onClick={() => onSetMode('rotate')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                  mode === 'rotate'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Rotate Tool (E)"
              >
                <i className="fas fa-rotate text-xs"></i>
                <span className="hidden sm:inline">Rotate</span>
              </button>

              <button
                type="button"
                onClick={() => onSetMode('scale')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                  mode === 'scale'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Scale Tool (R)"
              >
                <i className="fas fa-expand text-xs"></i>
                <span className="hidden sm:inline">Scale</span>
              </button>
            </div>

            <div className="h-5 w-[1px] bg-slate-800 mx-1" />

            {/* Coordinate Space (World vs Local) */}
            <button
              type="button"
              onClick={() => onSetSpace(space === 'world' ? 'local' : 'world')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 flex items-center gap-1 font-semibold transition-colors"
              title="Toggle World / Local Coordinate Orientation"
            >
              <i className="fas fa-globe text-[11px] text-sky-400"></i>
              <span>{space === 'world' ? 'World' : 'Local'}</span>
            </button>

            {/* Snapping Toggle */}
            <button
              type="button"
              onClick={() => onSetSnapConfig({ enabled: !snapConfig.enabled })}
              className={`px-2 py-1 rounded-md border flex items-center gap-1 font-semibold transition-colors ${
                snapConfig.enabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title="Toggle Grid / Angle Snapping"
            >
              <i className="fas fa-magnet text-[11px]"></i>
              <span className="hidden md:inline">Snap</span>
            </button>
          </>
        )}

        {isRuntimeMode && (
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LIVE 3D SCADA RUNTIME</span>
          </div>
        )}
      </div>

      {/* Center Section: Camera View Presets & Projection */}
      <div className="flex items-center gap-1.5">
        {/* Projection (Perspective / Orthographic) */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onSetProjection('perspective')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              projection === 'perspective'
                ? 'bg-slate-800 text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Perspective View"
          >
            Persp
          </button>
          <button
            type="button"
            onClick={() => onSetProjection('orthographic')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              projection === 'orthographic'
                ? 'bg-slate-800 text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Orthographic Engineering CAD View"
          >
            Ortho
          </button>
        </div>

        {/* View Presets */}
        <select
          onChange={e => onSetPresetView(e.target.value as CameraPresetView)}
          defaultValue="isometric"
          className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-2 py-1 rounded-md text-xs font-medium cursor-pointer outline-none focus:border-sky-500"
        >
          <option value="isometric">Isometric View</option>
          <option value="top">Top (Plan)</option>
          <option value="front">Front (Elevation)</option>
          <option value="left">Left View</option>
          <option value="right">Right View</option>
        </select>

        {/* Frame Selected (F) */}
        <button
          type="button"
          onClick={onFrameSelected}
          disabled={!hasSelectedObject}
          className={`p-1.5 rounded-md border transition-colors ${
            hasSelectedObject
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
              : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
          }`}
          title="Frame Selected Object (F)"
        >
          <i className="fas fa-crosshairs text-xs"></i>
        </button>

        {/* Frame All */}
        <button
          type="button"
          onClick={onFrameAll}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors"
          title="Frame All Scene Objects"
        >
          <i className="fas fa-expand text-xs"></i>
        </button>

        {/* Helpers Toggle */}
        <button
          type="button"
          onClick={onToggleGrid}
          className={`p-1.5 rounded-md border transition-colors ${
            gridVisible
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}
          title="Toggle Ground Grid"
        >
          <i className="fas fa-border-all text-xs"></i>
        </button>

        <button
          type="button"
          onClick={onToggleAxis}
          className={`p-1.5 rounded-md border transition-colors ${
            axisVisible
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}
          title="Toggle Coordinate Axes"
        >
          <i className="fas fa-location-crosshairs text-xs"></i>
        </button>
      </div>

      {/* Right Section: Library + Mode Toggle + Save Scene */}
      <div className="flex items-center gap-1.5">
        {/* Library Buttons */}
        {!isRuntimeMode && (
          <>
            <button
              type="button"
              onClick={onOpenLibrary}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              title="Browse Project 3D Library"
            >
              <i className="fas fa-layer-group text-xs"></i>
              <span>Library</span>
            </button>
            {onImportCad && (
              <button
                type="button"
                onClick={onImportCad}
                className="px-3 py-1.5 bg-violet-700 hover:bg-violet-600 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Import 3D CAD Models (.STL, .OBJ, .GLB, .GLTF, .DAE, .JSON)"
              >
                <i className="fas fa-file-import text-xs"></i>
                <span>Import CAD</span>
              </button>
            )}
            <button
              type="button"
              onClick={onSaveToLibrary}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              title="Save current scene as 3D Assembly to Project Library"
            >
              <i className="fas fa-cube text-xs"></i>
              <span>Save to Library</span>
            </button>
          </>
        )}

        {/* Runtime Mode Switch */}
        <button
          type="button"
          onClick={onToggleRuntimeMode}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm ${
            isRuntimeMode
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title={isRuntimeMode ? 'Switch to 3D Editor' : 'Switch to SCADA 3D Runtime'}
        >
          <i className={`fas ${isRuntimeMode ? 'fa-pen-to-square' : 'fa-play'} text-xs`}></i>
          <span>{isRuntimeMode ? 'Edit Scene' : 'Run 3D'}</span>
        </button>

        {/* Save Scene Button */}
        {!isRuntimeMode && (
          <button
            type="button"
            onClick={onSaveScene}
            className={`px-3 py-1.5 font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400/40 shadow-amber-900/30'
                : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
            title={hasUnsavedChanges ? 'Save unsaved changes to 3D scene' : 'Save 3D Scene to Project'}
          >
            <i className={`fas ${hasUnsavedChanges ? 'fa-floppy-disk animate-bounce text-amber-200' : 'fa-floppy-disk'} text-xs`}></i>
            <span>Save</span>
            {hasUnsavedChanges && (
              <span className="text-[10px] bg-amber-950/80 text-amber-200 px-1 rounded text-xs font-mono font-normal">●</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
