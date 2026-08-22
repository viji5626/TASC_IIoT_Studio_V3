import React, { useState } from 'react';
import { AppState } from '../../../types';
import TopicAutocompleteInput from '../../TopicAutocompleteInput';
import DriverTagSelector from '../../DriverTagSelector';
import { getDynamicElementTransform } from '../../../utils/dynamicsHelper';

interface PanelDynamicsSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  appState?: AppState;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isStaticOrDecorative: boolean;
  isLineGraph: boolean;
}

export const PanelDynamicsSection: React.FC<PanelDynamicsSectionProps> = ({
  formData,
  setFormData,
  appState,
  handleChange,
  isStaticOrDecorative,
  isLineGraph
}) => {
  const [dynamicsSimVal, setDynamicsSimVal] = useState<number>(50);
  const [dynamicsSimDigital, setDynamicsSimDigital] = useState<boolean>(true);
  const [isMotionExpanded, setIsMotionExpanded] = useState<boolean>(false);
  const [isRotationExpanded, setIsRotationExpanded] = useState<boolean>(false);

  if (isStaticOrDecorative || isLineGraph) return null;

  return (
    <div className="space-y-4 pt-3 border-t border-[#262626]">
      {/* Dynamics Header Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <i className="fas fa-wand-magic-sparkles text-amber-400 text-sm"></i>
          <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
            Motion & Rotation Dynamics
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {formData.enableMotionDynamics && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Motion: ({formData.motionStartX ?? 0},{formData.motionStartY ?? 0} → {formData.motionEndX ?? 150},{formData.motionEndY ?? 0})
            </span>
          )}
          {formData.enableRotationDynamics && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Rotation: {formData.rotationMode === 'variable' ? `${formData.rotationAngleMin ?? 0}°→${formData.rotationAngleMax ?? 360}°` : `Spin ${formData.rotationDirection || 'cw'}`}
            </span>
          )}
        </div>
      </div>

      {/* ─── LIVE INTERACTIVE PREVIEW & TEST SIMULATOR ────────────────── */}
      {(formData.enableMotionDynamics || formData.enableRotationDynamics) && (
        <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <i className="fas fa-play text-emerald-400 text-xs"></i>
              <span>Live Dynamics Test Simulator</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Sim Value: <strong className="text-sky-300">{dynamicsSimVal}</strong> | Digital: <strong className={dynamicsSimDigital ? 'text-emerald-400' : 'text-rose-400'}>{dynamicsSimDigital ? '1 (ON)' : '0 (OFF)'}</strong>
            </span>
          </div>

          {/* Simulation Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Simulate Analog Tag:</span>
                <span className="font-mono font-bold text-amber-300">{dynamicsSimVal}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={dynamicsSimVal}
                onChange={(e) => setDynamicsSimVal(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end space-x-3">
              <span className="text-[10px] text-slate-400">Simulate Digital Tag:</span>
              <button
                type="button"
                onClick={() => setDynamicsSimDigital(!dynamicsSimDigital)}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer border ${
                  dynamicsSimDigital
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                }`}
              >
                <i className={`fas ${dynamicsSimDigital ? 'fa-toggle-on' : 'fa-toggle-off'} mr-1.5`}></i>
                {dynamicsSimDigital ? 'STATE: 1 (ON)' : 'STATE: 0 (OFF)'}
              </button>
            </div>
          </div>

          {/* Preview Canvas Stage */}
          <div className="relative w-full h-32 bg-slate-900/90 rounded-xl border border-dashed border-slate-700/80 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            {/* Multi-Node Motion Path Markers and Vector Polyline */}
            {formData.enableMotionDynamics && (() => {
              const effectivePoints = formData.motionPathPoints && formData.motionPathPoints.length >= 2
                ? formData.motionPathPoints
                : [
                    { x: formData.motionStartX ?? 0, y: formData.motionStartY ?? 0 },
                    { x: formData.motionEndX ?? 150, y: formData.motionEndY ?? 0 }
                  ];

              return (
                <>
                  {/* Polyline connecting all path nodes */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {effectivePoints.map((pt: any, i: number) => {
                      if (i === 0) return null;
                      const prev = effectivePoints[i - 1];
                      return (
                        <line
                          key={i}
                          x1={`calc(50% + ${prev.x}px)`}
                          y1={`calc(50% + ${prev.y}px)`}
                          x2={`calc(50% + ${pt.x}px)`}
                          y2={`calc(50% + ${pt.y}px)`}
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          opacity="0.75"
                        />
                      );
                    })}
                  </svg>

                  {/* Node point badges */}
                  {effectivePoints.map((pt: any, i: number) => {
                    const isStart = i === 0;
                    const isEnd = i === effectivePoints.length - 1;
                    return (
                      <div
                        key={i}
                        className={`absolute z-10 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[8px] font-mono font-bold pointer-events-none shadow-md ${
                          isStart
                            ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300'
                            : isEnd
                            ? 'bg-amber-500/30 border-2 border-amber-400 text-amber-300 ring-2 ring-amber-500/30'
                            : 'bg-cyan-500/30 border-2 border-cyan-400 text-cyan-300'
                        }`}
                        style={{
                          left: `calc(50% + ${pt.x}px)`,
                          top: `calc(50% + ${pt.y}px)`
                        }}
                        title={`Node ${i + 1} (${pt.x}px, ${pt.y}px)`}
                      >
                        {isStart ? '0' : isEnd ? '100' : `${i + 1}`}
                      </div>
                    );
                  })}
                </>
              );
            })()}

            {/* Simulated Moving / Rotating Object */}
            {(() => {
              const mockValues: Record<string, any> = {};
              const primaryKey = formData.driverTagId || formData.topic || formData.panelId;
              mockValues[primaryKey] = { val: formData.rotationTriggerType === 'digital' ? (dynamicsSimDigital ? 1 : 0) : dynamicsSimVal };
              if (formData.motionTopic) mockValues[formData.motionTopic] = { val: dynamicsSimVal };
              if (formData.motionDriverTagId) mockValues[formData.motionDriverTagId] = { val: dynamicsSimVal };
              if (formData.rotationTopic) mockValues[formData.rotationTopic] = { val: formData.rotationTriggerType === 'digital' ? (dynamicsSimDigital ? 1 : 0) : dynamicsSimVal };
              if (formData.rotationDriverTagId) mockValues[formData.rotationDriverTagId] = { val: formData.rotationTriggerType === 'digital' ? (dynamicsSimDigital ? 1 : 0) : dynamicsSimVal };

              const dynTransform = getDynamicElementTransform(formData, mockValues, false);

              return (
                <div
                  className="transition-transform duration-300 ease-out z-20"
                  style={{
                    transform: dynTransform.transform,
                    animation: dynTransform.animation
                  }}
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500/40 via-indigo-600/40 to-slate-900 border-2 border-sky-400 flex flex-col items-center justify-center text-white shadow-lg backdrop-blur-md">
                    <i className={`fas ${formData.iconOn || 'fa-cog'} text-lg text-sky-300`}></i>
                    <span className="text-[8px] font-mono font-bold mt-0.5 text-slate-200">
                      {formData.panelName ? formData.panelName.substring(0, 7) : 'OBJECT'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── FEATURE 1: TAG-BASED MOTION PATH DYNAMICS (RETRACTABLE) ─── */}
      <div className="bg-slate-950/70 rounded-xl border border-amber-500/30 overflow-hidden shadow-md transition-all">
        <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-900/60 select-none">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <i className="fas fa-route text-xs"></i>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide truncate">
                  1. Tag-Based Motion Path
                </span>
                {formData.enableMotionDynamics ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    {(() => {
                      const pts = formData.motionPathPoints && formData.motionPathPoints.length >= 2
                        ? formData.motionPathPoints
                        : [{ x: 0, y: 0 }, { x: 150, y: 0 }];
                      return `${pts.length} Nodes${formData.motionOrientToPath ? ' • Turn ON' : ''}`;
                    })()}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-500 border border-slate-700/60 shrink-0">
                    DISABLED
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Multi-node translation & bending path driven by telemetry
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <label className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                name="enableMotionDynamics"
                checked={!!formData.enableMotionDynamics}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData((prev: any) => ({ ...prev, enableMotionDynamics: checked }));
                  setIsMotionExpanded(checked);
                }}
                className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
              />
              <span className={`text-[11px] font-bold ${formData.enableMotionDynamics ? 'text-amber-300' : 'text-slate-400'}`}>
                {formData.enableMotionDynamics ? 'Enabled' : 'Disabled'}
              </span>
            </label>

            {formData.enableMotionDynamics && (
              <button
                type="button"
                onClick={() => setIsMotionExpanded(!isMotionExpanded)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                title={isMotionExpanded ? 'Retract Motion Settings' : 'Expand Motion Settings'}
              >
                <span>{isMotionExpanded ? 'Retract' : 'Expand Settings'}</span>
                <i className={`fas fa-chevron-${isMotionExpanded ? 'up' : 'down'} text-[10px]`}></i>
              </button>
            )}
          </div>
        </div>

        {formData.enableMotionDynamics && isMotionExpanded && (
          <div className="p-4 space-y-4 border-t border-slate-800/80 bg-slate-950/40 animate-in fade-in duration-200">
            {/* Motion Tag Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Motion Tag Source</label>
                <select
                  value={formData.motionTagMode || 'same'}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, motionTagMode: e.target.value }))}
                  className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-semibold"
                >
                  <option value="same">🔗 Use Element's Primary Tag</option>
                  <option value="custom">🏷️ Custom Motion Tag</option>
                </select>
              </div>

              {formData.motionTagMode === 'custom' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Custom Data Source Type</label>
                  <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, motionDataSourceMode: 'mqtt' }))}
                      className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all cursor-pointer ${
                        (formData.motionDataSourceMode || 'mqtt') === 'mqtt' ? 'bg-sky-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      MQTT
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, motionDataSourceMode: 'driver' }))}
                      className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all cursor-pointer ${
                        formData.motionDataSourceMode === 'driver' ? 'bg-violet-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Driver Tag
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Motion Tag Input */}
            {formData.motionTagMode === 'custom' && (
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                {(formData.motionDataSourceMode || 'mqtt') === 'mqtt' ? (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-sky-400 block">Motion MQTT Topic</label>
                    <TopicAutocompleteInput
                      value={formData.motionTopic || ''}
                      onChange={(val) => setFormData((prev: any) => ({ ...prev, motionTopic: val }))}
                      placeholder="e.g. factory/line1/conveyor/position"
                      connectionId={formData.connectionId}
                      appState={appState}
                    />
                  </div>
                ) : (
                  <DriverTagSelector
                    appState={appState!}
                    selectedTagId={formData.motionDriverTagId}
                    onChange={(tagId) => setFormData((prev: any) => ({ ...prev, motionDriverTagId: tagId }))}
                    label="MOTION DRIVER READ TAG"
                    placeholder="Select motion driver tag..."
                  />
                )}
              </div>
            )}

            {/* Turn Object With Path Checkbox Option */}
            <label className="flex items-center space-x-3 bg-slate-900/90 p-3 rounded-xl border border-amber-500/40 cursor-pointer select-none hover:border-amber-500 transition-colors">
              <input
                type="checkbox"
                name="motionOrientToPath"
                checked={!!formData.motionOrientToPath}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, motionOrientToPath: e.target.checked }))}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer shrink-0"
              />
              <div>
                <span className="text-xs font-bold text-amber-200 block flex items-center space-x-1.5">
                  <i className="fas fa-compass text-amber-400 text-xs"></i>
                  <span>Turn Object With Path (Orient / Rotate Heading Along Turns)</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  When enabled, the element automatically rotates to face the direction of the active path segment on every bend and corner.
                </span>
              </div>
            </label>

            {/* Scalable Tag Range */}
            <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div>
                <label className="text-[11px] font-bold text-amber-300 block mb-1">Tag Value at Start (0% Path)</label>
                <input
                  type="number"
                  name="motionTagMin"
                  value={formData.motionTagMin ?? 0}
                  onChange={handleChange}
                  className="w-full bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono font-bold"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-amber-300 block mb-1">Tag Value at End (100% Path)</label>
                <input
                  type="number"
                  name="motionTagMax"
                  value={formData.motionTagMax ?? 100}
                  onChange={handleChange}
                  className="w-full bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono font-bold"
                  placeholder="100"
                />
              </div>
            </div>

            {/* Multi-Node Path Waypoints & Bend Points Editor */}
            {(() => {
              const effectivePoints: { x: number; y: number }[] = formData.motionPathPoints && formData.motionPathPoints.length >= 2
                ? formData.motionPathPoints
                : [
                    { x: formData.motionStartX ?? 0, y: formData.motionStartY ?? 0 },
                    { x: formData.motionEndX ?? 150, y: formData.motionEndY ?? 0 }
                  ];

              const handleAddPoint = () => {
                const pts = [...effectivePoints];
                const lastPt = pts[pts.length - 1] || { x: 150, y: 0 };
                const prevPt = pts[pts.length - 2] || { x: 0, y: 0 };
                const newPt = {
                  x: Math.round((lastPt.x + prevPt.x) / 2),
                  y: Math.round((lastPt.y + prevPt.y) / 2) + 40
                };
                pts.splice(pts.length - 1, 0, newPt);
                setFormData((prev: any) => ({
                  ...prev,
                  motionPathPoints: pts,
                  motionStartX: pts[0].x,
                  motionStartY: pts[0].y,
                  motionEndX: pts[pts.length - 1].x,
                  motionEndY: pts[pts.length - 1].y
                }));
              };

              const handleRemovePoint = (idxToRemove: number) => {
                if (effectivePoints.length <= 2) return;
                const pts = effectivePoints.filter((_, i) => i !== idxToRemove);
                setFormData((prev: any) => ({
                  ...prev,
                  motionPathPoints: pts,
                  motionStartX: pts[0].x,
                  motionStartY: pts[0].y,
                  motionEndX: pts[pts.length - 1].x,
                  motionEndY: pts[pts.length - 1].y
                }));
              };

              const handleUpdatePoint = (idx: number, axis: 'x' | 'y', val: number) => {
                const pts = effectivePoints.map((pt, i) => {
                  if (i === idx) {
                    return { ...pt, [axis]: val };
                  }
                  return pt;
                });
                setFormData((prev: any) => ({
                  ...prev,
                  motionPathPoints: pts,
                  motionStartX: pts[0].x,
                  motionStartY: pts[0].y,
                  motionEndX: pts[pts.length - 1].x,
                  motionEndY: pts[pts.length - 1].y
                }));
              };

              const applyPathPreset = (presetPts: { x: number; y: number }[]) => {
                setFormData((prev: any) => ({
                  ...prev,
                  motionPathPoints: presetPts,
                  motionStartX: presetPts[0].x,
                  motionStartY: presetPts[0].y,
                  motionEndX: presetPts[presetPts.length - 1].x,
                  motionEndY: presetPts[presetPts.length - 1].y
                }));
              };

              return (
                <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-200 uppercase flex items-center space-x-1.5">
                        <i className="fas fa-draw-polygon text-amber-400 text-xs"></i>
                        <span>Motion Path Nodes & Bending Points ({effectivePoints.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Add bend nodes to steer the path around obstacles or pipes.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPoint}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg flex items-center space-x-1 cursor-pointer transition-transform active:scale-95 shadow-md"
                    >
                      <i className="fas fa-plus text-[10px]"></i>
                      <span>Add Node / Bend</span>
                    </button>
                  </div>

                  {/* Node Points List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {effectivePoints.map((pt, idx) => {
                      const isStart = idx === 0;
                      const isEnd = idx === effectivePoints.length - 1;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2 rounded-lg border ${
                            isStart
                              ? 'bg-emerald-950/30 border-emerald-500/40'
                              : isEnd
                              ? 'bg-amber-950/30 border-amber-500/40'
                              : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                                isStart
                                  ? 'bg-emerald-500 text-slate-950'
                                  : isEnd
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              }`}
                            >
                              {isStart ? '0' : isEnd ? '100' : idx + 1}
                            </div>
                            <span className="text-[11px] font-bold text-slate-300">
                              {isStart ? 'Start Point (0%)' : isEnd ? 'End Point (100%)' : `Bend Node #${idx + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className="flex items-center bg-slate-900 px-2 py-1 rounded border border-slate-700 w-20">
                              <span className="text-[9px] text-slate-500 mr-1 font-bold">X:</span>
                              <input
                                type="number"
                                value={pt.x}
                                onChange={(e) => handleUpdatePoint(idx, 'x', Number(e.target.value))}
                                className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none"
                              />
                              <span className="text-[8px] text-slate-600">px</span>
                            </div>

                            <div className="flex items-center bg-slate-900 px-2 py-1 rounded border border-slate-700 w-20">
                              <span className="text-[9px] text-slate-500 mr-1 font-bold">Y:</span>
                              <input
                                type="number"
                                value={pt.y}
                                onChange={(e) => handleUpdatePoint(idx, 'y', Number(e.target.value))}
                                className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none"
                              />
                              <span className="text-[8px] text-slate-600">px</span>
                            </div>

                            {!isStart && !isEnd && effectivePoints.length > 2 ? (
                              <button
                                type="button"
                                onClick={() => handleRemovePoint(idx)}
                                title="Remove this bending node"
                                className="p-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded border border-rose-500/30 text-xs transition-colors cursor-pointer"
                              >
                                <i className="fas fa-trash-can text-[10px]"></i>
                              </button>
                            ) : (
                              <div className="w-6"></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Path Preset Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPathPreset([{ x: 0, y: 0 }, { x: 200, y: 0 }])}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                    >
                      ➡️ Straight Right
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPathPreset([{ x: 0, y: 0 }, { x: 150, y: 0 }, { x: 150, y: 120 }])}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                    >
                      ↩️ L-Turn (Right & Down)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPathPreset([{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 160, y: 100 }, { x: 160, y: 0 }])}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                    >
                      🔄 U-Turn Path
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPathPreset([{ x: 0, y: 0 }, { x: 70, y: 50 }, { x: 140, y: -50 }, { x: 210, y: 0 }])}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                    >
                      〰️ S-Curve / Bends
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPathPreset([{ x: 0, y: 0 }, { x: 0, y: -150 }])}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                    >
                      ⬆️ Vertical Lift
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Bottom Retract button */}
            <div className="flex justify-end pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setIsMotionExpanded(false)}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <i className="fas fa-chevron-up text-[10px]"></i>
                <span>Retract Motion Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── FEATURE 2: TAG-BASED ROTATION DYNAMICS (RETRACTABLE) ─── */}
      <div className="bg-slate-950/70 rounded-xl border border-cyan-500/30 overflow-hidden shadow-md transition-all">
        <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-900/60 select-none">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <i className="fas fa-rotate text-xs"></i>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide truncate">
                  2. Tag-Based Rotation Dynamics
                </span>
                {formData.enableRotationDynamics ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                    {formData.rotationMode === 'variable' ? `${formData.rotationAngleMin ?? 0}°→${formData.rotationAngleMax ?? 360}°` : `${formData.rotationSpeed || 'medium'} ${formData.rotationDirection || 'cw'}`}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-500 border border-slate-700/60 shrink-0">
                    DISABLED
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Continuous motor spinning or proportional angle turn
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <label className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                name="enableRotationDynamics"
                checked={!!formData.enableRotationDynamics}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData((prev: any) => ({ ...prev, enableRotationDynamics: checked }));
                  setIsRotationExpanded(checked);
                }}
                className="w-3.5 h-3.5 accent-cyan-500 rounded cursor-pointer"
              />
              <span className={`text-[11px] font-bold ${formData.enableRotationDynamics ? 'text-cyan-300' : 'text-slate-400'}`}>
                {formData.enableRotationDynamics ? 'Enabled' : 'Disabled'}
              </span>
            </label>

            {formData.enableRotationDynamics && (
              <button
                type="button"
                onClick={() => setIsRotationExpanded(!isRotationExpanded)}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                title={isRotationExpanded ? 'Retract Rotation Settings' : 'Expand Rotation Settings'}
              >
                <span>{isRotationExpanded ? 'Retract' : 'Expand Settings'}</span>
                <i className={`fas fa-chevron-${isRotationExpanded ? 'up' : 'down'} text-[10px]`}></i>
              </button>
            )}
          </div>
        </div>

        {formData.enableRotationDynamics && isRotationExpanded && (
          <div className="p-4 space-y-4 border-t border-slate-800/80 bg-slate-950/40 animate-in fade-in duration-200">
            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, rotationMode: 'continuous' }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                  (formData.rotationMode || 'continuous') === 'continuous'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-arrows-rotate text-xs"></i>
                <span>Continuous Spin (Motor / Fan)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev: any) => ({ ...prev, rotationMode: 'variable' }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                  formData.rotationMode === 'variable'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-gauge text-xs"></i>
                <span>Variable Angle (Pointer / Valve)</span>
              </button>
            </div>

            {/* Rotation Tag Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Rotation Tag Source</label>
                <select
                  value={formData.rotationTagMode || 'same'}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, rotationTagMode: e.target.value }))}
                  className="w-full bg-slate-900 text-white rounded-lg p-2 text-xs border border-slate-700 font-semibold"
                >
                  <option value="same">🔗 Use Element's Primary Tag</option>
                  <option value="custom">🏷️ Custom Rotation Tag</option>
                </select>
              </div>

              {formData.rotationTagMode === 'custom' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Custom Data Source Type</label>
                  <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, rotationDataSourceMode: 'mqtt' }))}
                      className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all cursor-pointer ${
                        (formData.rotationDataSourceMode || 'mqtt') === 'mqtt' ? 'bg-sky-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      MQTT
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev: any) => ({ ...prev, rotationDataSourceMode: 'driver' }))}
                      className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all cursor-pointer ${
                        formData.rotationDataSourceMode === 'driver' ? 'bg-violet-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Driver Tag
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Rotation Tag Input */}
            {formData.rotationTagMode === 'custom' && (
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                {(formData.rotationDataSourceMode || 'mqtt') === 'mqtt' ? (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-sky-400 block">Rotation MQTT Topic</label>
                    <TopicAutocompleteInput
                      value={formData.rotationTopic || ''}
                      onChange={(val) => setFormData((prev: any) => ({ ...prev, rotationTopic: val }))}
                      placeholder="e.g. factory/motor1/running_status"
                      connectionId={formData.connectionId}
                      appState={appState}
                    />
                  </div>
                ) : (
                  <DriverTagSelector
                    appState={appState!}
                    selectedTagId={formData.rotationDriverTagId}
                    onChange={(tagId) => setFormData((prev: any) => ({ ...prev, rotationDriverTagId: tagId }))}
                    label="ROTATION DRIVER READ TAG"
                    placeholder="Select rotation driver tag..."
                  />
                )}
              </div>
            )}

            {(formData.rotationMode || 'continuous') === 'continuous' ? (
              /* CONTINUOUS SPIN CONTROLS */
              <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Rotation Direction</label>
                    <select
                      name="rotationDirection"
                      value={formData.rotationDirection || 'cw'}
                      onChange={handleChange}
                      className="w-full bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-semibold"
                    >
                      <option value="cw">🔄 Clockwise (CW)</option>
                      <option value="ccw">🔁 Counter-Clockwise (CCW)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Rotation Speed / Cycle Time</label>
                    <select
                      name="rotationSpeed"
                      value={formData.rotationSpeed || 'medium'}
                      onChange={handleChange}
                      className="w-full bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-semibold"
                    >
                      <option value="fast">⚡ Fast (0.6s / High RPM)</option>
                      <option value="medium">🚀 Medium (2.0s / Standard)</option>
                      <option value="slow">🐢 Slow (5.0s / Low RPM)</option>
                      <option value="custom">⚙️ Custom Cycle Duration (Seconds)</option>
                    </select>
                  </div>
                </div>

                {/* Custom Cycle Duration Slider */}
                {formData.rotationSpeed === 'custom' && (
                  <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-semibold">Custom Cycle Duration:</span>
                      <span className="font-mono font-bold text-cyan-300">{formData.rotationDurationSeconds ?? 2} sec / rotation</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.1"
                      name="rotationDurationSeconds"
                      value={formData.rotationDurationSeconds ?? 2}
                      onChange={(e) => setFormData((prev: any) => ({ ...prev, rotationDurationSeconds: parseFloat(e.target.value) }))}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                  </div>
                )}

                {/* Continuous Spin Trigger Condition */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider block">
                    Spinning Activation Trigger Condition
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <select
                        name="rotationTriggerType"
                        value={formData.rotationTriggerType || 'digital'}
                        onChange={handleChange}
                        className="w-full bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-semibold"
                      >
                        <option value="digital">🔘 Digital Tag (1 / ON = Spin, 0 / OFF = Stop)</option>
                        <option value="analog_compare">📊 Analog Tag Comparator (=, !=, &gt;, &gt;=, &lt;, &lt;=)</option>
                      </select>
                    </div>

                    {formData.rotationTriggerType === 'analog_compare' && (
                      <div className="flex items-center space-x-2">
                        <select
                          name="rotationOperator"
                          value={formData.rotationOperator || '>'}
                          onChange={handleChange}
                          className="w-20 bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono font-bold text-center"
                        >
                          <option value="=">=</option>
                          <option value="!=">!=</option>
                          <option value=">">&gt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<">&lt;</option>
                          <option value="<=">&lt;=</option>
                        </select>

                        <input
                          type="text"
                          name="rotationTriggerValue"
                          value={formData.rotationTriggerValue !== undefined ? formData.rotationTriggerValue : '0'}
                          onChange={handleChange}
                          placeholder="Threshold (e.g. 0, 50, RUN)"
                          className="flex-1 bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* VARIABLE ANGLE ROTATION CONTROLS */
              <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                <p className="text-[11px] text-amber-300">
                  Proportionally rotates the element between Min Angle and Max Angle based on incoming tag value.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[10px] text-amber-400 font-bold block mb-1">Tag Min (0%):</label>
                    <input
                      type="number"
                      name="rotationTagMin"
                      value={formData.rotationTagMin ?? 0}
                      onChange={handleChange}
                      className="w-full bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono font-bold"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-amber-400 font-bold block mb-1">Tag Max (100%):</label>
                    <input
                      type="number"
                      name="rotationTagMax"
                      value={formData.rotationTagMax ?? 100}
                      onChange={handleChange}
                      className="w-full bg-slate-950 text-white rounded-lg p-2 text-xs border border-slate-700 font-mono font-bold"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-cyan-400 font-bold block mb-1">Min Angle (Deg):</label>
                    <div className="flex items-center bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-700">
                      <input
                        type="number"
                        name="rotationAngleMin"
                        value={formData.rotationAngleMin ?? 0}
                        onChange={handleChange}
                        className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none"
                      />
                      <span className="text-[10px] text-slate-500">°</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-cyan-400 font-bold block mb-1">Max Angle (Deg):</label>
                    <div className="flex items-center bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-700">
                      <input
                        type="number"
                        name="rotationAngleMax"
                        value={formData.rotationAngleMax ?? 360}
                        onChange={handleChange}
                        className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none"
                      />
                      <span className="text-[10px] text-slate-500">°</span>
                    </div>
                  </div>
                </div>

                {/* Quick Angle Presets */}
                <div className="pt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold mr-1">Angle Presets:</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, rotationAngleMin: 0, rotationAngleMax: 360 }))}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    Full Circle (0° → 360°)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, rotationAngleMin: -90, rotationAngleMax: 90 }))}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    Gauge Arc (-90° → +90°)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, rotationAngleMin: 0, rotationAngleMax: 180 }))}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    Half Circle (0° → 180°)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev: any) => ({ ...prev, rotationAngleMin: 0, rotationAngleMax: 90 }))}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    Quarter Turn (0° → 90°)
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Retract button */}
            <div className="flex justify-end pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setIsRotationExpanded(false)}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <i className="fas fa-chevron-up text-[10px]"></i>
                <span>Retract Rotation Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
