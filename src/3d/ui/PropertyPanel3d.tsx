import React, { useState } from 'react';
import { Scada3dObject } from '../types/scene';
import { ObjectTransformData } from '../types/transform';
import { INDUSTRIAL_MATERIAL_PRESETS } from '../core/MaterialManager';
import { Scada3dBinding, Scada3dThresholdRule } from '../types/bindings';
import { ASSET_CATALOG_3D } from '../assets/AssetRegistry';
import { Scada3dTagSelector } from './Scada3dTagSelector';

interface PropertyPanel3dProps {
  selectedObject: Scada3dObject | null;
  selectedSubPartId?: string | null;
  onSelectSubPart?: (subPartId: string | null) => void;
  onUpdateTransform: (id: string, transform: ObjectTransformData) => void;
  onUpdateObjectData: (id: string, updates: Partial<Scada3dObject>) => void;
  onPreviewDynamic?: (equipmentId: string, binding: Scada3dBinding, testVal: any) => void;
  availableDashboards?: { id: string; name: string }[];
}

export const PropertyPanel3d: React.FC<PropertyPanel3dProps> = ({
  selectedObject,
  selectedSubPartId,
  onSelectSubPart,
  onUpdateTransform,
  onUpdateObjectData,
  onPreviewDynamic,
  availableDashboards = []
}) => {
  const [activeTab, setActiveTab] = useState<'transform' | 'bindings' | 'appearance'>('bindings');
  const [testValues, setTestValues] = useState<Record<string, any>>({});
  const [activePresetNotification, setActivePresetNotification] = useState<string | null>(null);

  if (!selectedObject) {
    return (
      <div 
        className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col items-center justify-center text-center text-slate-500 text-xs select-none"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-600 mb-3 shadow-inner">
          <i className="fas fa-cube text-2xl text-sky-500/50"></i>
        </div>
        <h4 className="font-bold text-slate-300 mb-1">No Object Selected</h4>
        <p className="text-[11px] leading-relaxed max-w-xs">
          Select an equipment model or expand its sub-parts in the hierarchy tree to configure 3D transforms, SCADA dynamics, and telemetry bindings.
        </p>
      </div>
    );
  }

  const transform = selectedObject.transform;
  const catalogItem = ASSET_CATALOG_3D.find(a => a.id === selectedObject.assetId);
  const animatableParts = catalogItem?.animatableParts || [];

  const handlePositionChange = (axis: 'x' | 'y' | 'z', val: number) => {
    const updated: ObjectTransformData = {
      ...transform,
      position: { ...transform.position, [axis]: val }
    };
    onUpdateTransform(selectedObject.id, updated);
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', val: number) => {
    const updated: ObjectTransformData = {
      ...transform,
      rotation: { ...transform.rotation, [axis]: val }
    };
    onUpdateTransform(selectedObject.id, updated);
  };

  const handleScaleChange = (axis: 'x' | 'y' | 'z', val: number) => {
    const updated: ObjectTransformData = {
      ...transform,
      scale: { ...transform.scale, [axis]: Math.max(0.01, val) }
    };
    onUpdateTransform(selectedObject.id, updated);
  };

  const handleAddBinding = (presetType?: string) => {
    let newBinding: Scada3dBinding;

    if (presetType === 'rotor_spin') {
      newBinding = {
        id: `b_${Date.now()}`,
        name: 'Generator/Motor Rotor Spin',
        property: 'continuous_spin',
        subPartId: animatableParts.find(p => p.includes('rotor')) || 'rotor',
        axis: 'x',
        direction: 'cw',
        signalMode: 'digital',
        dataSourceMode: 'mqtt',
        topic: 'plant/generator/status',
        activeSpeedRpm: 1500,
        inactiveSpeedRpm: 0
      };
    } else if (presetType === 'impeller_spin') {
      newBinding = {
        id: `b_${Date.now()}`,
        name: 'Pump/Fan Impeller Rotation',
        property: 'continuous_spin',
        subPartId: animatableParts.find(p => p.includes('impeller') || p.includes('fan')) || 'impeller',
        axis: 'x',
        direction: 'cw',
        signalMode: 'analog',
        dataSourceMode: 'mqtt',
        topic: 'plant/pumps/speed',
        minRaw: 0,
        maxRaw: 3000,
        minTarget: 0,
        maxTarget: 3000,
        clamp: true
      };
    } else if (presetType === 'valve_travel') {
      newBinding = {
        id: `b_${Date.now()}`,
        name: 'Valve Disc 0-90° Travel',
        property: 'angular_position',
        subPartId: animatableParts.find(p => p.includes('disc') || p.includes('valve')) || 'valve_disc',
        axis: 'y',
        direction: 'cw',
        signalMode: 'analog',
        dataSourceMode: 'mqtt',
        topic: 'plant/valves/position',
        minRaw: 0,
        maxRaw: 100,
        rotationMinDeg: 0,
        rotationMaxDeg: 90
      };
    } else if (presetType === 'damper_open') {
      newBinding = {
        id: `b_${Date.now()}`,
        name: 'Dampers / Louvers 0-70° Travel',
        property: 'angular_position',
        subPartId: animatableParts.find(p => p.includes('louver') || p.includes('damper')) || 'louvers',
        axis: 'x',
        direction: 'cw',
        signalMode: 'analog',
        dataSourceMode: 'mqtt',
        topic: 'plant/fans/speed',
        minRaw: 0,
        maxRaw: 100,
        rotationMinDeg: 0,
        rotationMaxDeg: 70
      };
    } else if (presetType === 'stem_lift') {
      newBinding = {
        id: `b_${Date.now()}`,
        name: 'Linear Stem Lift',
        property: 'linear_travel',
        subPartId: animatableParts.find(p => p.includes('stem')) || 'valve_stem',
        axis: 'y',
        direction: 'cw',
        signalMode: 'analog',
        dataSourceMode: 'mqtt',
        topic: 'plant/actuators/stroke',
        minRaw: 0,
        maxRaw: 100,
        travelMinMeters: 0,
        travelMaxMeters: 0.15
      };
    } else if (presetType === 'liquid_level') {
      newBinding = {
        id: `b_${Date.now()}`,
        name: 'Tank Liquid Level 0-100%',
        property: 'fluid_level',
        subPartId: 'liquid',
        dataSourceMode: 'mqtt',
        topic: 'plant/tanks/level',
        minRaw: 0,
        maxRaw: 100
      };
    } else if (presetType === 'alarm_glow') {
      newBinding = {
        id: `b_${Date.now()}`,
        name: 'Alarm Status Emissive Glow',
        property: 'emissive_glow',
        dataSourceMode: 'mqtt',
        topic: 'plant/alarms/status',
        thresholds: [
          { id: 't1', condition: '=', value: 'ALARM', emissive: '#ef4444', emissiveIntensity: 1.0, pulse: true, label: 'High Alarm' },
          { id: 't2', condition: '=', value: 'WARN', emissive: '#f59e0b', emissiveIntensity: 0.6, pulse: false, label: 'Warning' }
        ]
      };
    } else {
      newBinding = {
        id: `b_${Date.now()}`,
        name: selectedSubPartId ? `${selectedSubPartId} Motion` : 'Equipment Dynamic',
        property: 'continuous_spin',
        subPartId: selectedSubPartId || (animatableParts.length > 0 ? animatableParts[0] : undefined),
        axis: 'x',
        direction: 'cw',
        signalMode: 'digital',
        dataSourceMode: 'mqtt',
        topic: 'plant/telemetry',
        activeSpeedRpm: 1500
      };
    }

    const bindings = [...(selectedObject.bindings || []), newBinding];
    onUpdateObjectData(selectedObject.id, { bindings });

    if (presetType) {
      setActivePresetNotification(`Added preset: ${newBinding.name}`);
      setTimeout(() => setActivePresetNotification(null), 2500);
    }
  };

  const handleUpdateBinding = (index: number, updates: Partial<Scada3dBinding>) => {
    const bindings = [...(selectedObject.bindings || [])];
    bindings[index] = { ...bindings[index], ...updates };
    onUpdateObjectData(selectedObject.id, { bindings });
  };

  const handleDeleteBinding = (index: number) => {
    const bindings = (selectedObject.bindings || []).filter((_, i) => i !== index);
    onUpdateObjectData(selectedObject.id, { bindings });
  };

  return (
    <div 
      className="w-84 bg-slate-900 border-l border-slate-800 flex flex-col min-h-0 text-xs select-none z-20 shadow-2xl"
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Header: Object ID & Name */}
      <div className="p-3 bg-slate-950/90 border-b border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-mono text-[10px] bg-sky-950 text-sky-400 border border-sky-800/80 px-2 py-0.5 rounded font-bold flex items-center gap-1">
            <i className="fas fa-cube text-[9px]"></i>
            {selectedObject.id}
          </span>
          <span className="text-[10px] text-slate-400 font-mono truncate">{selectedObject.assetId}</span>
        </div>

        <input
          type="text"
          value={selectedObject.name}
          onChange={e => onUpdateObjectData(selectedObject.id, { name: e.target.value })}
          className="w-full bg-slate-900 text-slate-100 font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-sky-500 text-xs"
        />

        {/* Sub-Part Breadcrumb Target */}
        {animatableParts.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <i className="fas fa-crosshairs text-sky-400"></i> Target Part:
            </span>
            <select
              value={selectedSubPartId || ''}
              onChange={e => onSelectSubPart && onSelectSubPart(e.target.value || null)}
              className="bg-slate-900 text-sky-300 font-bold text-[11px] px-2 py-0.5 rounded border border-slate-700 outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="">Root Equipment (All)</option>
              {animatableParts.map(part => (
                <option key={part} value={part}>{part.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950/40 p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('transform')}
          className={`flex-1 py-1.5 rounded-lg text-center font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'transform'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="fas fa-arrows-up-down-left-right text-[10px]"></i>
          Transform
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bindings')}
          className={`flex-1 py-1.5 rounded-lg text-center font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'bindings'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="fas fa-bolt text-[10px] text-amber-400"></i>
          Dynamics & SCADA
          {(selectedObject.bindings?.length || 0) > 0 && (
            <span className="text-[9px] bg-sky-500/40 text-sky-200 px-1.5 rounded-full font-mono font-normal">
              {selectedObject.bindings?.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex-1 py-1.5 rounded-lg text-center font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'appearance'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <i className="fas fa-palette text-[10px]"></i>
          Style
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* =================================================================== */}
        {/* 1. TRANSFORM TAB */}
        {/* =================================================================== */}
        {activeTab === 'transform' && (
          <div className="space-y-3.5">
            {/* Position (Meters) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 flex items-center justify-between">
                <span>Position (Meters)</span>
                <span className="text-[10px] text-slate-500 font-mono">X / Y / Z</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['x', 'y', 'z'] as const).map(axis => (
                  <div key={axis} className="relative">
                    <span className={`absolute left-1.5 top-1 font-bold text-[10px] uppercase ${axis === 'x' ? 'text-red-400' : axis === 'y' ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {axis}
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={transform.position[axis]}
                      onChange={e => handlePositionChange(axis, parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 text-slate-200 pl-5 pr-1 py-1 rounded-lg border border-slate-700 outline-none focus:border-sky-500 text-xs font-mono text-right"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Rotation (Degrees) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 flex items-center justify-between">
                <span>Rotation (Degrees)</span>
                <span className="text-[10px] text-slate-500 font-mono">X / Y / Z</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['x', 'y', 'z'] as const).map(axis => (
                  <div key={axis} className="relative">
                    <span className={`absolute left-1.5 top-1 font-bold text-[10px] uppercase ${axis === 'x' ? 'text-red-400' : axis === 'y' ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {axis}
                    </span>
                    <input
                      type="number"
                      step="5"
                      value={transform.rotation[axis]}
                      onChange={e => handleRotationChange(axis, parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 text-slate-200 pl-5 pr-1 py-1 rounded-lg border border-slate-700 outline-none focus:border-sky-500 text-xs font-mono text-right"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 flex items-center justify-between">
                <span>Scale Multiplier</span>
                <span className="text-[10px] text-slate-500 font-mono">X / Y / Z</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['x', 'y', 'z'] as const).map(axis => (
                  <div key={axis} className="relative">
                    <span className={`absolute left-1.5 top-1 font-bold text-[10px] uppercase ${axis === 'x' ? 'text-red-400' : axis === 'y' ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {axis}
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.01"
                      value={transform.scale[axis]}
                      onChange={e => handleScaleChange(axis, parseFloat(e.target.value) || 1)}
                      className="w-full bg-slate-950 text-slate-200 pl-5 pr-1 py-1 rounded-lg border border-slate-700 outline-none focus:border-sky-500 text-xs font-mono text-right"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Linked 2D Dashboard */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <i className="fas fa-arrow-up-right-from-square text-sky-400 text-xs"></i>
                <span>Linked 2D Diagnostics Screen</span>
              </label>
              <select
                value={selectedObject.linkedDashboardId || ''}
                onChange={e => onUpdateObjectData(selectedObject.id, { linkedDashboardId: e.target.value || undefined })}
                className="w-full bg-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-sky-500 text-xs cursor-pointer"
              >
                <option value="">None (No 2D screen link)</option>
                {availableDashboards.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 2. DYNAMICS & SCADA BINDINGS TAB */}
        {/* =================================================================== */}
        {activeTab === 'bindings' && (
          <div className="space-y-3.5">
            {/* 1-Click Dynamics Presets Banner */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <i className="fas fa-wand-magic-sparkles text-amber-400 text-xs"></i>
                  1-Click Dynamic Presets
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddBinding('rotor_spin')}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-sky-950/70 border border-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 text-[11px] text-left transition-all flex items-center gap-1.5"
                >
                  <i className="fas fa-rotate text-sky-400 text-xs"></i>
                  <span>Rotor Spin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBinding('impeller_spin')}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-sky-950/70 border border-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 text-[11px] text-left transition-all flex items-center gap-1.5"
                >
                  <i className="fas fa-arrows-rotate text-teal-400 text-xs"></i>
                  <span>Impeller RPM</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBinding('valve_travel')}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-sky-950/70 border border-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 text-[11px] text-left transition-all flex items-center gap-1.5"
                >
                  <i className="fas fa-sliders text-emerald-400 text-xs"></i>
                  <span>Valve 0-90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBinding('damper_open')}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-sky-950/70 border border-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 text-[11px] text-left transition-all flex items-center gap-1.5"
                >
                  <i className="fas fa-bars-staggered text-amber-400 text-xs"></i>
                  <span>Dampers 0-70°</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBinding('stem_lift')}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-sky-950/70 border border-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 text-[11px] text-left transition-all flex items-center gap-1.5"
                >
                  <i className="fas fa-arrows-up-down text-indigo-400 text-xs"></i>
                  <span>Stem Lift</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBinding('liquid_level')}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-sky-950/70 border border-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-sky-300 text-[11px] text-left transition-all flex items-center gap-1.5"
                >
                  <i className="fas fa-water text-cyan-400 text-xs"></i>
                  <span>Tank 0-100%</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddBinding('alarm_glow')}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/70 border border-slate-800 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 text-[11px] text-left transition-all flex items-center gap-1.5"
                >
                  <i className="fas fa-triangle-exclamation text-rose-400 text-xs"></i>
                  <span>Alarm Glow</span>
                </button>
              </div>

              {activePresetNotification && (
                <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/80 px-2 py-1 rounded-lg">
                  {activePresetNotification}
                </div>
              )}
            </div>

            {/* Header: Add Custom Rule */}
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-slate-300 text-xs">Dynamic Rules</span>
              <button
                type="button"
                onClick={() => handleAddBinding()}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <i className="fas fa-plus text-[9px]"></i>
                <span>Add Dynamic</span>
              </button>
            </div>

            {/* Rules List */}
            {(!selectedObject.bindings || selectedObject.bindings.length === 0) ? (
              <div className="p-5 text-center text-slate-500 text-xs italic bg-slate-950/60 rounded-xl border border-slate-800 leading-relaxed">
                No dynamics configured yet. Click a 1-Click Preset above or &quot;Add Dynamic&quot; to bind 3D motion, rotation, levels, and alarm glow to live PLC tags.
              </div>
            ) : (
              selectedObject.bindings.map((binding, idx) => {
                const isSpin = binding.property === 'continuous_spin' || binding.property === 'running' || binding.property === 'speed';
                const isAngle = binding.property === 'angular_position' || binding.property === 'position' || binding.property === 'rotation_angle';
                const isTravel = binding.property === 'linear_travel';
                const isLevel = binding.property === 'fluid_level' || binding.property === 'level';
                const isColor = binding.property === 'color' || binding.property === 'color_shift' || binding.property === 'emissive' || binding.property === 'emissive_glow';

                const axis = binding.axis || binding.spinAxis || binding.rotationAxis || binding.travelAxis || 'x';
                const direction = binding.direction || binding.spinDirection || 'cw';
                const signalMode = binding.signalMode || (isSpin && binding.property === 'speed' ? 'analog' : 'digital');

                return (
                  <div key={binding.id || idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3 shadow-md">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center font-bold text-[10px] font-mono">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={binding.name || `Rule #${idx + 1}`}
                          onChange={e => handleUpdateBinding(idx, { name: e.target.value })}
                          className="bg-transparent font-bold text-slate-200 text-xs outline-none hover:border-b hover:border-slate-700 focus:border-b focus:border-sky-500 px-0.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteBinding(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Remove dynamic rule"
                      >
                        <i className="fas fa-trash-can text-xs"></i>
                      </button>
                    </div>

                    {/* Target Subpart & Dynamic Property Type */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1 font-medium">Target Sub-Part</label>
                        <select
                          value={binding.subPartId || ''}
                          onChange={e => handleUpdateBinding(idx, { subPartId: e.target.value || undefined })}
                          className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs"
                        >
                          <option value="">Entire Equipment</option>
                          {animatableParts.map(part => (
                            <option key={part} value={part}>{part.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1 font-medium">3D Dynamic Type</label>
                        <select
                          value={binding.property}
                          onChange={e => handleUpdateBinding(idx, { property: e.target.value as any })}
                          className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs font-semibold"
                        >
                          <option value="continuous_spin">Continuous 3D Spin</option>
                          <option value="angular_position">Angular Position (Deg)</option>
                          <option value="linear_travel">Linear Displacement (M)</option>
                          <option value="fluid_level">Fluid / Solid Level</option>
                          <option value="emissive_glow">Emissive Alarm Glow</option>
                          <option value="visibility">Visibility (Show/Hide)</option>
                        </select>
                      </div>
                    </div>

                    {/* 3-Axis Selector ($X, $Y, $Z$) & Direction (CW/CCW) */}
                    {(isSpin || isAngle || isTravel) && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-400 font-medium">Motion Axis & Direction</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateBinding(idx, { direction: 'cw', spinDirection: 'cw' })}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                direction === 'cw' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              CW ↻
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateBinding(idx, { direction: 'ccw', spinDirection: 'ccw' })}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                direction === 'ccw' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              CCW ↺
                            </button>
                          </div>
                        </div>

                        {/* 3-Axis Buttons */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['x', 'y', 'z'] as const).map(ax => (
                            <button
                              key={ax}
                              type="button"
                              onClick={() => handleUpdateBinding(idx, { axis: ax, spinAxis: ax, rotationAxis: ax, travelAxis: ax })}
                              className={`py-1 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                                axis === ax
                                  ? ax === 'x' ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-sm' :
                                    ax === 'y' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm' :
                                    'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm'
                                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                              }`}
                            >
                              <span className="uppercase">{ax}-Axis</span>
                              {axis === ax && <i className="fas fa-check text-[9px]"></i>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Signal Mode (Digital vs Analog vs Combined) */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                      <label className="text-[10px] text-slate-400 font-medium block">Signal Mode</label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleUpdateBinding(idx, { signalMode: 'digital' })}
                          className={`py-1 rounded font-bold transition-all ${
                            signalMode === 'digital' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Digital (2-State)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateBinding(idx, { signalMode: 'analog' })}
                          className={`py-1 rounded font-bold transition-all ${
                            signalMode === 'analog' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Analog (Range)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateBinding(idx, { signalMode: 'combined' })}
                          className={`py-1 rounded font-bold transition-all ${
                            signalMode === 'combined' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Combined
                        </button>
                      </div>
                    </div>

                    {/* Telemetry Tag Data Source (Browsable & Editable) */}
                    <div className="space-y-2 pt-1 border-t border-slate-800/60">
                      <div className="grid grid-cols-2 gap-2 items-start">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Source Mode</label>
                          <select
                            value={binding.dataSourceMode}
                            onChange={e => handleUpdateBinding(idx, { dataSourceMode: e.target.value as any })}
                            className="w-full bg-slate-900 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-700 outline-none text-xs font-medium focus:border-sky-500"
                          >
                            <option value="mqtt">MQTT Topic</option>
                            <option value="driver">Driver Tag (PLC)</option>
                          </select>
                        </div>

                        <div>
                          <Scada3dTagSelector
                            dataSourceMode={binding.dataSourceMode}
                            value={binding.dataSourceMode === 'driver' ? (binding.driverTagId || '') : (binding.topic || '')}
                            onChange={(val, meta) => {
                              if (binding.dataSourceMode === 'driver') {
                                handleUpdateBinding(idx, { driverTagId: val });
                              } else {
                                handleUpdateBinding(idx, { topic: val });
                              }
                            }}
                            jsonPath={binding.jsonPath}
                            onJsonPathChange={jp => handleUpdateBinding(idx, { jsonPath: jp })}
                            label={binding.dataSourceMode === 'driver' ? 'Driver Tag (PLC)' : 'MQTT Topic'}
                            placeholder={binding.dataSourceMode === 'driver' ? 'Select or type PLC Tag' : 'Select or type topic'}
                            compact
                          />
                        </div>
                      </div>

                      {binding.dataSourceMode === 'mqtt' && (
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">JSON Path (Optional)</label>
                          <input
                            type="text"
                            value={binding.jsonPath || ''}
                            onChange={e => handleUpdateBinding(idx, { jsonPath: e.target.value })}
                            placeholder="$.telemetry.speed or $.val"
                            className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs font-mono focus:border-sky-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Combined Signal Mode: Secondary Speed Telemetry Source */}
                    {signalMode === 'combined' && (
                      <div className="space-y-2 pt-1 border-t border-slate-800/60 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                            <i className="fas fa-tachometer-alt text-[9px]"></i> Secondary Speed Source (Analog RPM)
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-2 items-start">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Speed Source Mode</label>
                            <select
                              value={binding.speedDataSourceMode || 'mqtt'}
                              onChange={e => handleUpdateBinding(idx, { speedDataSourceMode: e.target.value as any })}
                              className="w-full bg-slate-900 text-slate-200 px-2 py-1.5 rounded-lg border border-slate-700 outline-none text-xs font-medium focus:border-sky-500"
                            >
                              <option value="mqtt">MQTT Topic</option>
                              <option value="driver">Driver Tag (PLC)</option>
                            </select>
                          </div>

                          <div>
                            <Scada3dTagSelector
                              dataSourceMode={binding.speedDataSourceMode || 'mqtt'}
                              value={(binding.speedDataSourceMode === 'driver' ? binding.speedDriverTagId : binding.speedTopic) || ''}
                              onChange={(val) => {
                                if (binding.speedDataSourceMode === 'driver') {
                                  handleUpdateBinding(idx, { speedDriverTagId: val });
                                } else {
                                  handleUpdateBinding(idx, { speedTopic: val });
                                }
                              }}
                              jsonPath={binding.speedJsonPath}
                              onJsonPathChange={jp => handleUpdateBinding(idx, { speedJsonPath: jp })}
                              label={binding.speedDataSourceMode === 'driver' ? 'Speed Driver Tag ID' : 'Speed Topic'}
                              placeholder={binding.speedDataSourceMode === 'driver' ? 'Select or type Tag ID' : 'Select or type Topic'}
                              compact
                            />
                          </div>
                        </div>

                        {(binding.speedDataSourceMode || 'mqtt') === 'mqtt' && (
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Speed JSON Path (Optional)</label>
                            <input
                              type="text"
                              value={binding.speedJsonPath || ''}
                              onChange={e => handleUpdateBinding(idx, { speedJsonPath: e.target.value })}
                              placeholder="$.speed or $.frequency"
                              className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs font-mono"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Raw Range (Min - Max)</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={binding.minRaw ?? 0}
                                onChange={e => handleUpdateBinding(idx, { minRaw: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 text-slate-200 px-1.5 py-1 rounded border border-slate-700 text-xs font-mono"
                              />
                              <span className="text-slate-500">-</span>
                              <input
                                type="number"
                                value={binding.maxRaw ?? 3000}
                                onChange={e => handleUpdateBinding(idx, { maxRaw: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 text-slate-200 px-1.5 py-1 rounded border border-slate-700 text-xs font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Target RPM (Min - Max)</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={binding.minTarget ?? 0}
                                onChange={e => handleUpdateBinding(idx, { minTarget: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 text-slate-200 px-1.5 py-1 rounded border border-slate-700 text-xs font-mono"
                              />
                              <span className="text-slate-500">-</span>
                              <input
                                type="number"
                                value={binding.maxTarget ?? 3000}
                                onChange={e => handleUpdateBinding(idx, { maxTarget: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 text-slate-200 px-1.5 py-1 rounded border border-slate-700 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mode Specific Config Parameters */}
                    {signalMode === 'digital' && isSpin && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Active Speed (RPM)</label>
                          <input
                            type="number"
                            value={binding.activeSpeedRpm || binding.baseSpeedRpm || 1500}
                            onChange={e => handleUpdateBinding(idx, { activeSpeedRpm: parseFloat(e.target.value) || 0, baseSpeedRpm: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Active Value Match</label>
                          <input
                            type="text"
                            value={binding.digitalActiveValue || ''}
                            onChange={e => handleUpdateBinding(idx, { digitalActiveValue: e.target.value })}
                            placeholder="true, 1, or RUN"
                            className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {signalMode === 'analog' && isSpin && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Raw Range (Min - Max)</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={binding.minRaw ?? 0}
                              onChange={e => handleUpdateBinding(idx, { minRaw: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-900 text-slate-200 px-1.5 py-1 rounded border border-slate-700 text-xs font-mono"
                            />
                            <span className="text-slate-500">-</span>
                            <input
                              type="number"
                              value={binding.maxRaw ?? 3000}
                              onChange={e => handleUpdateBinding(idx, { maxRaw: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-900 text-slate-200 px-1.5 py-1 rounded border border-slate-700 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Target RPM (Min - Max)</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={binding.minTarget ?? 0}
                              onChange={e => handleUpdateBinding(idx, { minTarget: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-900 text-slate-200 px-1.5 py-1 rounded border border-slate-700 text-xs font-mono"
                            />
                            <span className="text-slate-500">-</span>
                            <input
                              type="number"
                              value={binding.maxTarget ?? 3000}
                              onChange={e => handleUpdateBinding(idx, { maxTarget: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-slate-900 text-slate-200 px-1.5 py-1 rounded border border-slate-700 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {isAngle && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Min Angle (°)</label>
                          <input
                            type="number"
                            value={binding.rotationMinDeg ?? 0}
                            onChange={e => handleUpdateBinding(idx, { rotationMinDeg: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Max Angle (°)</label>
                          <input
                            type="number"
                            value={binding.rotationMaxDeg ?? 90}
                            onChange={e => handleUpdateBinding(idx, { rotationMaxDeg: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {isTravel && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Travel Min (Meters)</label>
                          <input
                            type="number"
                            step="0.05"
                            value={binding.travelMinMeters ?? 0}
                            onChange={e => handleUpdateBinding(idx, { travelMinMeters: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Travel Max (Meters)</label>
                          <input
                            type="number"
                            step="0.05"
                            value={binding.travelMaxMeters ?? 0.5}
                            onChange={e => handleUpdateBinding(idx, { travelMaxMeters: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-900 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 outline-none text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* Multi-Threshold Rules (Alarm Glow / Color Shift) */}
                    {isColor && (
                      <div className="space-y-2 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-300 font-bold">Color / Glow Thresholds</label>
                          <button
                            type="button"
                            onClick={() => {
                              const rules = [...(binding.thresholds || [])];
                              rules.push({
                                id: `t_${Date.now()}`,
                                condition: '=',
                                value: '1',
                                emissive: '#ef4444',
                                emissiveIntensity: 1.0,
                                pulse: true,
                                label: 'Alarm'
                              });
                              handleUpdateBinding(idx, { thresholds: rules });
                            }}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-400 px-1.5 py-0.5 rounded font-bold"
                          >
                            + Add State
                          </button>
                        </div>

                        {(binding.thresholds || []).map((rule, rIdx) => (
                          <div key={rule.id || rIdx} className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              <select
                                value={rule.condition}
                                onChange={e => {
                                  const rules = [...(binding.thresholds || [])];
                                  rules[rIdx] = { ...rules[rIdx], condition: e.target.value as any };
                                  handleUpdateBinding(idx, { thresholds: rules });
                                }}
                                className="bg-slate-950 text-slate-200 px-1 py-0.5 rounded text-[10px] border border-slate-700 font-mono"
                              >
                                <option value="=">==</option>
                                <option value="!=">!=</option>
                                <option value=">">&gt;</option>
                                <option value=">=">&gt;=</option>
                                <option value="<">&lt;</option>
                                <option value="<=">&lt;=</option>
                              </select>

                              <input
                                type="text"
                                value={rule.value}
                                onChange={e => {
                                  const rules = [...(binding.thresholds || [])];
                                  rules[rIdx] = { ...rules[rIdx], value: e.target.value };
                                  handleUpdateBinding(idx, { thresholds: rules });
                                }}
                                placeholder="Value"
                                className="bg-slate-950 text-slate-200 px-1.5 py-0.5 rounded text-[10px] border border-slate-700 flex-1 font-mono"
                              />

                              <input
                                type="color"
                                value={rule.emissive || '#ef4444'}
                                onChange={e => {
                                  const rules = [...(binding.thresholds || [])];
                                  rules[rIdx] = { ...rules[rIdx], emissive: e.target.value };
                                  handleUpdateBinding(idx, { thresholds: rules });
                                }}
                                className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                              />

                              <button
                                type="button"
                                onClick={() => {
                                  const rules = (binding.thresholds || []).filter((_, i) => i !== rIdx);
                                  handleUpdateBinding(idx, { thresholds: rules });
                                }}
                                className="text-slate-500 hover:text-rose-400 p-0.5"
                              >
                                <i className="fas fa-xmark text-xs"></i>
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-[10px]">
                              <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={rule.pulse !== false}
                                  onChange={e => {
                                    const rules = [...(binding.thresholds || [])];
                                    rules[rIdx] = { ...rules[rIdx], pulse: e.target.checked };
                                    handleUpdateBinding(idx, { thresholds: rules });
                                  }}
                                  className="rounded border-slate-700"
                                />
                                Pulse Blink
                              </label>

                              <div className="flex items-center gap-1">
                                <span className="text-slate-500">Glow:</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="2"
                                  step="0.1"
                                  value={rule.emissiveIntensity ?? 1.0}
                                  onChange={e => {
                                    const rules = [...(binding.thresholds || [])];
                                    rules[rIdx] = { ...rules[rIdx], emissiveIntensity: parseFloat(e.target.value) };
                                    handleUpdateBinding(idx, { thresholds: rules });
                                  }}
                                  className="w-16 accent-sky-500 cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive In-Editor Motion Preview */}
                    <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-sky-300 flex items-center gap-1">
                          <i className="fas fa-play text-[9px]"></i> Live 3D Preview
                        </span>
                        <span className="text-slate-400 font-mono">
                          {testValues[binding.id] !== undefined ? String(testValues[binding.id]) : 'Off'}
                        </span>
                      </div>

                      {signalMode === 'digital' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = testValues[binding.id] === true;
                              const next = !cur;
                              setTestValues(prev => ({ ...prev, [binding.id]: next }));
                              onPreviewDynamic && onPreviewDynamic(selectedObject.id, binding, next);
                            }}
                            className={`w-full py-1 rounded-md font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                              testValues[binding.id] === true
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <i className={`fas fa-${testValues[binding.id] === true ? 'stop' : 'play'} text-[9px]`}></i>
                            <span>{testValues[binding.id] === true ? 'Stop Simulation' : 'Simulate Run (1)'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="range"
                            min={binding.minRaw ?? 0}
                            max={binding.maxRaw ?? 100}
                            value={testValues[binding.id] ?? binding.minRaw ?? 0}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              setTestValues(prev => ({ ...prev, [binding.id]: val }));
                              onPreviewDynamic && onPreviewDynamic(selectedObject.id, binding, val);
                            }}
                            className="w-full accent-sky-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>{binding.minRaw ?? 0}</span>
                            <span>{binding.maxRaw ?? 100}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* 3. APPEARANCE & STYLE TAB */}
        {/* =================================================================== */}
        {activeTab === 'appearance' && (
          <div className="space-y-3.5">
            {/* PBR Material Preset */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 block">PBR Material Preset</label>
              <select
                value={selectedObject.materialPreset || 'painted_steel_blue'}
                onChange={e => onUpdateObjectData(selectedObject.id, { materialPreset: e.target.value })}
                className="w-full bg-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-sky-500 text-xs cursor-pointer"
              >
                {Object.entries(INDUSTRIAL_MATERIAL_PRESETS).map(([id, preset]) => (
                  <option key={id} value={id}>{preset.name}</option>
                ))}
              </select>
            </div>

            {/* Custom Color Override */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 block">Custom Color Tint</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedObject.customColor || '#3b82f6'}
                  onChange={e => onUpdateObjectData(selectedObject.id, { customColor: e.target.value })}
                  className="w-8 h-8 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={selectedObject.customColor || '#3b82f6'}
                  onChange={e => onUpdateObjectData(selectedObject.id, { customColor: e.target.value })}
                  className="flex-1 bg-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none text-xs font-mono"
                />
              </div>
            </div>

            {/* Metalness & Roughness */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Metalness</span>
                  <span className="font-mono text-slate-300">{selectedObject.customMetalness ?? 0.7}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedObject.customMetalness ?? 0.7}
                  onChange={e => onUpdateObjectData(selectedObject.id, { customMetalness: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Roughness</span>
                  <span className="font-mono text-slate-300">{selectedObject.customRoughness ?? 0.3}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={selectedObject.customRoughness ?? 0.3}
                  onChange={e => onUpdateObjectData(selectedObject.id, { customRoughness: parseFloat(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
