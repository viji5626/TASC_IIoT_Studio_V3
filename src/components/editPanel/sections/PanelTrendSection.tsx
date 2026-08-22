import React from 'react';
import { AppState, HistorianTag } from '../../../types';
import DriverTagSelector from '../../DriverTagSelector';
import TagAutocompleteInput from '../../TagAutocompleteInput';

interface PanelTrendSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  appState?: AppState;
  dataSourceMode: 'mqtt' | 'driver';
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onAddHistorianTag?: (tag: HistorianTag) => void;
}

export const PanelTrendSection: React.FC<PanelTrendSectionProps> = ({
  formData,
  setFormData,
  appState,
  dataSourceMode,
  handleChange,
  onAddHistorianTag
}) => {
  return (
    <div className="space-y-5 pt-3 border-t border-[#262626] bg-[#161616] p-4 rounded-xl border border-sky-500/30">
      <div className="flex items-center justify-between">
        <label className="text-xs text-sky-400 font-bold uppercase tracking-wider flex items-center space-x-2">
          <i className="fas fa-chart-line text-xs text-sky-400"></i>
          <span>Industrial Trend & Multi-Pen Graph Settings</span>
        </label>
        <span className="text-[10px] text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded font-mono border border-sky-500/20">TASCTrendz SCADA Engine</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-amber-500 font-bold block mb-1">Graph Display Type</label>
          <select
            name="graphType"
            value={formData.graphType || 'line'}
            onChange={handleChange}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="line">📈 Line — Crisp linear trend</option>
            <option value="curve">〰️ Curve — Smooth Bézier spline</option>
            <option value="stepped">⬜ Stepped — SCADA digital step</option>
            <option value="bar">📊 Bar — Vertical bar chart</option>
            <option value="hbar">▬ H-Bar — Horizontal level gauge</option>
            <option value="area">🏔 Area — Filled area chart</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-amber-500 font-bold block mb-1">Primary Pen Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              name="penColor"
              value={formData.penColor || formData.firstColor || '#38bdf8'}
              onChange={(e) => {
                setFormData((prev: any) => ({ ...prev, penColor: e.target.value, firstColor: e.target.value }));
              }}
              className="w-10 h-8 bg-transparent cursor-pointer rounded border border-slate-700"
            />
            <input
              type="text"
              value={formData.penColor || formData.firstColor || '#38bdf8'}
              onChange={(e) => {
                setFormData((prev: any) => ({ ...prev, penColor: e.target.value, firstColor: e.target.value }));
              }}
              className="flex-grow bg-slate-900 border border-slate-700 text-white font-mono text-xs p-2 rounded-lg outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div>
          <label className="text-xs text-slate-300 font-bold block mb-1">Pen Thickness ({formData.penThickness || 2}px)</label>
          <input
            type="range"
            min="1"
            max="6"
            step="1"
            name="penThickness"
            value={formData.penThickness || 2}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, penThickness: Number(e.target.value) }))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300 select-none">
            <input
              type="checkbox"
              name="showGrid"
              checked={formData.showGrid !== false}
              onChange={handleChange}
              className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
            />
            <span>Show Grid Lines</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-300 select-none">
            <input
              type="checkbox"
              name="fillArea"
              checked={formData.fillArea !== false}
              onChange={handleChange}
              className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
            />
            <span>Area Fill (Filled vs Non-Filled)</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer text-xs text-amber-300 font-semibold select-none" title="Show small dot markers at each data sample point on the trend line">
            <input
              type="checkbox"
              name="showNodeMarkers"
              checked={formData.showNodeMarkers === true}
              onChange={handleChange}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
            <span>Show Node Markers (sample dots)</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
        <label className="flex items-center space-x-2 cursor-pointer text-xs text-emerald-300 font-semibold select-none">
          <input
            type="checkbox"
            name="showMonitoringTable"
            checked={formData.showMonitoringTable !== false}
            onChange={handleChange}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
          <span>Enable Monitoring Window Table Below Chart</span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer text-xs text-sky-300 font-semibold select-none">
          <input
            type="checkbox"
            name="enableDualCursor"
            checked={formData.enableDualCursor || false}
            onChange={handleChange}
            className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
          />
          <span>Enable Dual Cursors by Default (Δt & Δv)</span>
        </label>
      </div>

      {/* Monitoring Window Column Customization */}
      {formData.showMonitoringTable !== false && (
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <i className="fas fa-table-columns text-emerald-400 text-xs"></i>
              <span>Monitoring Table Visible Columns</span>
            </span>
            <span className="text-[10px] text-slate-400">Toggle columns on/off</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            {[
              { key: 'status', label: 'Signal Status', def: true },
              { key: 'lastVal', label: 'Last Value', def: true },
              { key: 'lastTime', label: 'Last Time', def: true },
              { key: 'c1Val', label: 'C1 Value', def: true },
              { key: 'c1Time', label: 'C1 Time', def: true },
              { key: 'c2Val', label: 'C2 Value', def: true },
              { key: 'c2Time', label: 'C2 Time', def: true },
              { key: 'valDiff', label: 'Δv (Value Diff)', def: true },
              { key: 'timeDiff', label: 'Δt (Time Diff)', def: true },
              { key: 'minVal', label: 'Min (Time Frame)', def: true },
              { key: 'maxVal', label: 'Max (Time Frame)', def: true },
              { key: 'avgVal', label: 'Avg (Time Frame)', def: true }
            ].map(col => {
              const isChecked = formData.tableColumns?.[col.key] ?? col.def;
              return (
                <label key={col.key} className="flex items-center space-x-1.5 cursor-pointer text-slate-300 hover:text-white select-none bg-slate-950/50 p-1.5 rounded border border-slate-800/80">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData((prev: any) => ({
                        ...prev,
                        tableColumns: {
                          ...(prev.tableColumns || {}),
                          [col.key]: checked
                        }
                      }));
                    }}
                    className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Multi-Pen Configuration List */}
      <div className="pt-3 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
            <i className="fas fa-layer-group text-sky-400 text-xs"></i>
            <span>Multi-Pen Configuration (TASCTrendz Multi-Topic Pens)</span>
          </label>
          {(() => {
            const isCommunity = appState?.userRole === 'community' || appState?.productEdition === 'community';
            const isPenLimitReached = isCommunity && (formData.pens?.length || 0) >= 2;
            const historianTagList = appState?.historianTags || [];

            return (
              <div className="flex items-center space-x-2">
                {/* Quick Add from Historian Tags Dropdown */}
                {historianTagList.length > 0 && (
                  <select
                    disabled={isPenLimitReached}
                    value=""
                    onChange={(e) => {
                      const tagId = e.target.value;
                      if (!tagId || isPenLimitReached) return;
                      const matchedHistTag = historianTagList.find(ht => ht.id === tagId);
                      if (matchedHistTag) {
                        const newPen = {
                          id: `pen_${Date.now()}`,
                          name: matchedHistTag.name,
                          topic: matchedHistTag.topic || matchedHistTag.driverTagId || matchedHistTag.id,
                          driverTagId: matchedHistTag.driverTagId,
                          jsonPath: matchedHistTag.jsonPath || '',
                          color: matchedHistTag.color || ['#38bdf8', '#f43f5e', '#10b981', '#f59e0b', '#a855f7'][(formData.pens?.length || 0) % 5],
                          thickness: 2,
                          unit: matchedHistTag.unit || '',
                          min: matchedHistTag.min,
                          max: matchedHistTag.max,
                          showNodeMarkers: false
                        };
                        setFormData((prev: any) => ({
                          ...prev,
                          pens: [...(prev.pens || []), newPen]
                        }));
                      }
                    }}
                    className="bg-violet-950/60 border border-violet-500/40 text-violet-200 rounded px-2 py-1 text-xs font-bold outline-none cursor-pointer hover:bg-violet-900/50 transition-colors"
                  >
                    <option value="" disabled>📈 Add from Historian Tags...</option>
                    {historianTagList.map(ht => (
                      <option key={ht.id} value={ht.id}>
                        {ht.name} ({ht.sourceType.toUpperCase()} • {ht.topic || ht.driverTagId})
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  disabled={isPenLimitReached}
                  onClick={() => {
                    if (isPenLimitReached) return;
                    const firstDriverTag = appState?.driverTags?.[0];
                    const newPen = {
                      id: `pen_${Date.now()}`,
                      name: `Pen ${((formData.pens?.length || 0) + 1)}`,
                      topic: dataSourceMode === 'driver' ? (firstDriverTag?.tagId || '') : (formData.topic || ''),
                      driverTagId: dataSourceMode === 'driver' ? (firstDriverTag?.tagId || '') : undefined,
                      jsonPath: '',
                      color: ['#38bdf8', '#f43f5e', '#10b981', '#f59e0b', '#a855f7'][(formData.pens?.length || 0) % 5],
                      thickness: 2,
                      unit: dataSourceMode === 'driver' ? (firstDriverTag?.unit || formData.unit || '') : (formData.unit || ''),
                      showNodeMarkers: false
                    };
                    setFormData((prev: any) => ({
                      ...prev,
                      pens: [...(prev.pens || []), newPen]
                    }));
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center space-x-1 ${
                    isPenLimitReached
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70'
                      : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 cursor-pointer'
                  }`}
                  title={isPenLimitReached ? "Free Demo Limit: Maximum 2 Pens allowed in Community Edition." : "Add a new trend pen"}
                >
                  <i className={isPenLimitReached ? "fas fa-lock text-[10px]" : "fas fa-plus text-[10px]"}></i>
                  <span>{isPenLimitReached ? 'Max 2 Pens (Free Demo)' : '+ Add Pen'}</span>
                </button>
              </div>
            );
          })()}
        </div>

        {(appState?.userRole === 'community' || appState?.productEdition === 'community') && (
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[11px] font-medium flex items-center space-x-2">
            <i className="fas fa-crown text-amber-400 text-xs shrink-0"></i>
            <span>Free Demo Active: Maximum <strong>2 Pens</strong> per Trend panel allowed. Upgrade to Engineering Studio for unlimited pens.</span>
          </div>
        )}

        {formData.pens && formData.pens.length > 0 ? (
          <div className="space-y-3">
            {formData.pens.map((pen: any, idx: number) => {
              const isHistorianLogged = appState?.historianTags?.some(ht =>
                ht.id === pen.id ||
                (ht.topic && ht.topic === pen.topic) ||
                (ht.driverTagId && ht.driverTagId === pen.driverTagId)
              );

              return (
                <div key={pen.id || idx} className="bg-slate-900/80 rounded-xl border border-slate-700/60 relative" style={{ zIndex: 30 - idx }}>
                  {/* Pen Header Row */}
                  <div className="flex items-center gap-2 px-3 py-2 flex-wrap sm:flex-nowrap">
                    {/* Color swatch */}
                    <input
                      type="color"
                      value={pen.color || '#38bdf8'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, color: val } : p)
                        }));
                      }}
                      className="w-7 h-7 bg-transparent rounded-md border border-slate-600 cursor-pointer shrink-0"
                      title="Pen Color"
                    />
                    {/* Pen name */}
                    <input
                      type="text"
                      value={pen.name || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, name: val } : p)
                        }));
                      }}
                      placeholder="Pen Name"
                      className="w-28 bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-sky-500 font-semibold"
                    />
                    {/* MQTT Topic or Driver Tag summary badge */}
                    {dataSourceMode === 'mqtt' ? (
                      <input
                        type="text"
                        value={pen.topic || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev: any) => ({
                            ...prev,
                            pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, topic: val } : p)
                          }));
                        }}
                        placeholder="MQTT Topic (e.g. sensors/tank1/level)"
                        className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-sky-500 font-mono"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-between px-2.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs">
                        <span className="text-[11px] text-violet-300 font-semibold flex items-center gap-1.5 truncate">
                          <i className="fas fa-microchip text-[10px] text-violet-400"></i>
                          <span className="truncate">{(() => {
                            const matched = appState?.driverTags?.find(t => t.tagId === pen.driverTagId || t.tagName === pen.driverTagId);
                            return matched ? `${matched.tagName} (${matched.driverType || 'Driver'})` : (pen.driverTagId ? `Tag: ${pen.driverTagId}` : 'Select Driver Tag below');
                          })()}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                          {(() => {
                            const matched = appState?.driverTags?.find(t => t.tagId === pen.driverTagId || t.tagName === pen.driverTagId);
                            return matched ? `Addr: ${matched.address}` : 'Browse Tag';
                          })()}
                        </span>
                      </div>
                    )}

                    {/* Historian Status Badge & 1-Click Add Shortcut */}
                    {isHistorianLogged ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-lg font-mono font-bold flex items-center gap-1 shrink-0" title="This pen is actively logged to Historian">
                        <i className="fas fa-database text-[9px] text-emerald-400"></i>
                        <span>Logged</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const newHistTag: HistorianTag = {
                            id: `htag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                            name: pen.name || pen.topic || pen.driverTagId || `Pen ${idx + 1}`,
                            sourceType: dataSourceMode === 'driver' ? 'driver' : 'mqtt',
                            topic: dataSourceMode === 'mqtt' ? pen.topic : undefined,
                            jsonPath: pen.jsonPath || undefined,
                            driverTagId: dataSourceMode === 'driver' ? pen.driverTagId : undefined,
                            unit: pen.unit || '',
                            color: pen.color || '#38bdf8',
                            enabled: true,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          if (onAddHistorianTag) {
                            onAddHistorianTag(newHistTag);
                          }
                        }}
                        className="text-[10px] bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/40 px-2 py-1 rounded-lg font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors active:scale-95"
                        title="Add this tag to central Historian logging"
                      >
                        <i className="fas fa-plus text-[8px]"></i>
                        <span>Add to Historian</span>
                      </button>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev: any) => ({
                          ...prev,
                          pens: prev.pens.filter((_: any, i: number) => i !== idx)
                        }));
                      }}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer shrink-0 transition-colors"
                      title="Remove Pen"
                    >
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  </div>

                  {/* Per-Pen Advanced Settings Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center px-3 pb-3 border-t border-slate-800/60 pt-2.5">
                    {/* JSONPath Query (MQTT mode) vs Tag Browser Dropdown (Driver mode) */}
                    <div className="sm:col-span-6 relative z-30">
                      {dataSourceMode === 'mqtt' ? (
                        <div>
                          <TagAutocompleteInput
                            name={`pen_jsonPath_${idx}`}
                            label="JSONPath / Read Tag (this pen)"
                            value={pen.jsonPath || ''}
                            onChange={(val) => {
                              setFormData((prev: any) => ({
                                ...prev,
                                pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, jsonPath: val } : p)
                              }));
                            }}
                            tagType="read"
                            appState={appState}
                            compact={true}
                            placeholder="e.g. $.d.temperature, raw"
                          />
                        </div>
                      ) : (
                        <div>
                          <DriverTagSelector
                            appState={appState!}
                            selectedTagId={pen.driverTagId}
                            compact={true}
                            onChange={(tagId) => {
                              const matchedTag = appState?.driverTags?.find(t => t.tagId === tagId || t.tagName === tagId);
                              setFormData((prev: any) => ({
                                ...prev,
                                pens: prev.pens.map((p: any, i: number) => i === idx ? {
                                  ...p,
                                  driverTagId: tagId,
                                  topic: tagId,
                                  unit: p.unit || matchedTag?.unit || ''
                                } : p)
                              }));
                            }}
                            label="Tag Browser (Driver Tag)"
                            placeholder="Select Driver Tag..."
                          />
                        </div>
                      )}
                    </div>

                    {/* Right Controls: Thickness, Unit, Show Dots */}
                    <div className="sm:col-span-6 flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
                      {/* Thickness */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-slate-400 font-bold">Thickness</label>
                        <input
                          type="range" min="1" max="6" step="1"
                          value={pen.thickness ?? 2}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData((prev: any) => ({
                              ...prev,
                              pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, thickness: val } : p)
                            }));
                          }}
                          className="w-16 accent-sky-500 cursor-pointer"
                        />
                        <span className="text-[10px] text-slate-400 font-mono w-2.5">{pen.thickness ?? 2}</span>
                      </div>

                      {/* Unit */}
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-400 font-bold">Unit</label>
                        <input
                          type="text"
                          value={pen.unit || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev: any) => ({
                              ...prev,
                              pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, unit: val } : p)
                            }));
                          }}
                          placeholder="e.g. °C"
                          className="w-14 bg-slate-950 border border-slate-700 text-white rounded px-1.5 py-1 text-xs outline-none focus:border-sky-500 font-mono text-center"
                        />
                      </div>

                      {/* Node markers toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-amber-300 select-none whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={pen.showNodeMarkers === true}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setFormData((prev: any) => ({
                              ...prev,
                              pens: prev.pens.map((p: any, i: number) => i === idx ? { ...p, showNodeMarkers: val } : p)
                            }));
                          }}
                          className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
                        />
                        <span>Show Dots</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-slate-900/40 border border-slate-800 rounded-lg p-3">
            <i className="fas fa-info-circle text-sky-400 text-sm mt-0.5 shrink-0"></i>
            <p className="text-[11px] text-slate-400">
              {dataSourceMode === 'driver'
                ? <>Single pen mode — click <strong className="text-violet-300">+ Add Pen</strong> or select a tag from <strong className="text-sky-300">📈 Add from Historian Tags</strong>.</>
                : <>Single pen mode — uses the Primary MQTT Topic above. Click <strong className="text-sky-300">+ Add Pen</strong> or choose from <strong className="text-violet-300">📈 Add from Historian Tags</strong>.</>
              }
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer text-xs text-sky-300 font-semibold select-none">
            <input
              type="checkbox"
              name="autoScaleY"
              checked={formData.autoScaleY || false}
              onChange={handleChange}
              className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
            />
            <span>Auto Scale Y-Axis Ticks (Fit to live signal dynamic range)</span>
          </label>
          {formData.autoScaleY && (
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              Manual limits disabled
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`relative border-b py-2 transition-opacity ${formData.autoScaleY ? 'border-gray-800 opacity-40 pointer-events-none' : 'border-gray-700'}`}>
            <label className="text-xs text-amber-500 absolute -top-2 font-bold">Y-Axis Min Limit</label>
            <input
              type="number"
              name="payloadMin"
              disabled={formData.autoScaleY || false}
              value={formData.payloadMin ?? 0}
              onChange={handleChange}
              className="w-full bg-transparent outline-none text-white py-1 font-mono text-xs disabled:cursor-not-allowed"
            />
          </div>
          <div className={`relative border-b py-2 transition-opacity ${formData.autoScaleY ? 'border-gray-800 opacity-40 pointer-events-none' : 'border-gray-700'}`}>
            <label className="text-xs text-amber-500 absolute -top-2 font-bold">Y-Axis Max Limit</label>
            <input
              type="number"
              name="payloadMax"
              disabled={formData.autoScaleY || false}
              value={formData.payloadMax ?? 100}
              onChange={handleChange}
              className="w-full bg-transparent outline-none text-white py-1 font-mono text-xs disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
