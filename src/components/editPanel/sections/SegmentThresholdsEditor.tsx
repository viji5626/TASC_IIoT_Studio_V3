import React from 'react';
import {
  PanelColorZone,
  PRESET_ZONE_COLORS,
  getResolvedZones,
  clampInterlockedThreshold
} from '../../../utils/gaugeThresholds';

interface SegmentThresholdsEditorProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  setPickingColorFor: (target: string | null) => void;
  title?: string;
  allowMinMax?: boolean;
}

export const SegmentThresholdsEditor: React.FC<SegmentThresholdsEditorProps> = ({
  formData,
  setFormData,
  setPickingColorFor,
  title = 'Gauge Segment Thresholds & Colors',
  allowMinMax = true
}) => {
  const resolved = getResolvedZones(formData);
  const { min: pMin, max: pMax, range: pRange, zones, thresholds } = resolved;

  // Sync to formData helper
  const updateZonesAndThresholds = (
    newZones: PanelColorZone[],
    newThresholds: number[],
    newMin: number = pMin,
    newMax: number = pMax
  ) => {
    setFormData((prev: any) => {
      const next = {
        ...prev,
        payloadMin: newMin,
        payloadMax: newMax,
        colorZones: newZones,
        thresholds: newThresholds,
        firstColor: newZones[0]?.color || prev.firstColor,
        secondColor: newZones[1]?.color || prev.secondColor,
        thirdColor: newZones[2]?.color || prev.thirdColor,
        lowThreshold: newThresholds[0] !== undefined ? newThresholds[0] : prev.lowThreshold,
        highThreshold:
          newThresholds[newThresholds.length - 1] !== undefined
            ? newThresholds[newThresholds.length - 1]
            : prev.highThreshold
      };
      return next;
    });
  };

  // Handle Scale Min Change
  const handleMinChange = (newMinVal: number) => {
    const validMin = isNaN(newMinVal) ? 0 : newMinVal;
    const currentMax = pMax;
    const effectiveMax = currentMax <= validMin ? validMin + 100 : currentMax;
    const oldRange = pMax - pMin || 1;
    const newRange = effectiveMax - validMin || 1;

    // Proportionally scale thresholds
    const scaledThresholds = thresholds.map((t) => {
      const ratio = (t - pMin) / oldRange;
      return Math.round(validMin + ratio * newRange);
    });

    updateZonesAndThresholds(zones, scaledThresholds, validMin, effectiveMax);
  };

  // Handle Scale Max Change
  const handleMaxChange = (newMaxVal: number) => {
    const validMax = isNaN(newMaxVal) ? 100 : newMaxVal;
    const currentMin = pMin;
    const effectiveMax = validMax <= currentMin ? currentMin + 100 : validMax;
    const oldRange = pMax - pMin || 1;
    const newRange = effectiveMax - currentMin || 1;

    // Proportionally scale thresholds
    const scaledThresholds = thresholds.map((t) => {
      const ratio = (t - pMin) / oldRange;
      return Math.round(currentMin + ratio * newRange);
    });

    updateZonesAndThresholds(zones, scaledThresholds, currentMin, effectiveMax);
  };

  // Add a new zone (Max 6)
  const handleAddZone = () => {
    if (zones.length >= 6) return;

    const newIndex = zones.length;
    // Find next unused preset color, or cyclic
    const usedColors = new Set(zones.map((z) => z.color.toLowerCase()));
    const nextColor =
      PRESET_ZONE_COLORS.find((c) => !usedColors.has(c.toLowerCase())) ||
      PRESET_ZONE_COLORS[newIndex % PRESET_ZONE_COLORS.length];

    const defaultLabel =
      newIndex === 3
        ? 'Zone 4'
        : newIndex === 4
        ? 'Zone 5'
        : newIndex === 5
        ? 'Zone 6'
        : `Zone ${newIndex + 1}`;

    const newZones: PanelColorZone[] = [...zones, { color: nextColor, label: defaultLabel }];

    // Redistribute thresholds cleanly across new interval
    const newCount = newZones.length;
    const newThresholds: number[] = [];
    for (let i = 1; i < newCount; i++) {
      newThresholds.push(Math.round(pMin + (pRange * i) / newCount));
    }

    updateZonesAndThresholds(newZones, newThresholds, pMin, pMax);
  };

  // Remove a zone (Min 2)
  const handleRemoveZone = (idxToRemove: number) => {
    if (zones.length <= 2) return;

    const newZones = zones.filter((_, i) => i !== idxToRemove);
    const newCount = newZones.length;

    // Redistribute thresholds across the remaining zones
    const newThresholds: number[] = [];
    for (let i = 1; i < newCount; i++) {
      newThresholds.push(Math.round(pMin + (pRange * i) / newCount));
    }

    updateZonesAndThresholds(newZones, newThresholds, pMin, pMax);
  };

  // Handle cut-off threshold change
  const handleThresholdChange = (idx: number, newVal: number) => {
    const updated = clampInterlockedThreshold(thresholds, idx, newVal, pMin, pMax);
    updateZonesAndThresholds(zones, updated, pMin, pMax);
  };

  // Handle zone label rename
  const handleZoneLabelChange = (idx: number, newLabel: string) => {
    const updatedZones = zones.map((z, i) => (i === idx ? { ...z, label: newLabel } : z));
    updateZonesAndThresholds(updatedZones, thresholds, pMin, pMax);
  };

  // Helper to get range bounds for zone i
  const getZoneBounds = (i: number) => {
    const startVal = i === 0 ? pMin : thresholds[i - 1];
    const endVal = i === zones.length - 1 ? pMax : thresholds[i];
    return { startVal, endVal };
  };

  // Sizing factors based on number of zones
  const isCompact = zones.length >= 5;
  const isMedium = zones.length === 4;

  const circleSizeClass = isCompact
    ? 'w-5 h-5'
    : isMedium
    ? 'w-6 h-6'
    : 'w-7 h-7';

  const labelSizeClass = isCompact
    ? 'text-[10px]'
    : isMedium
    ? 'text-[11px]'
    : 'text-xs';

  const rangeSizeClass = isCompact
    ? 'text-[8.5px]'
    : isMedium
    ? 'text-[9.5px]'
    : 'text-[10px]';

  return (
    <div className="space-y-4">
      {/* ─── 1. RANGE LIMITS (MIN / MAX) & ZONE TOOLBAR ─── */}
      {allowMinMax && (
        <div className="p-3 bg-gray-900/90 rounded-xl border border-gray-800 shadow-inner space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <i className="fas fa-sliders text-amber-400 text-xs"></i>
              <span>Variable Range (Min / Max) & Zone Setup</span>
            </span>
            <span className="text-[10px] font-mono text-gray-400">
              Active: {zones.length} Zones | {pMin} .. {pMax}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end pt-1">
            {/* Min Input */}
            <div>
              <label className="text-[11px] text-gray-300 font-semibold flex items-center justify-between mb-1">
                <span>Scale Min (Min Limit)</span>
                <span className="text-[10px] text-gray-500 font-mono">Def: 0</span>
              </label>
              <input
                type="number"
                name="payloadMin"
                value={formData.payloadMin !== undefined && formData.payloadMin !== '' ? formData.payloadMin : 0}
                onChange={(e) => handleMinChange(Number(e.target.value))}
                className="w-full bg-gray-950 text-white font-mono text-xs px-2.5 py-1.5 rounded-lg border border-gray-700 outline-none focus:border-amber-500 transition-colors shadow-inner"
                placeholder="0"
              />
            </div>

            {/* Max Input */}
            <div>
              <label className="text-[11px] text-gray-300 font-semibold flex items-center justify-between mb-1">
                <span>Scale Max (Max Limit)</span>
                <span className="text-[10px] text-gray-500 font-mono">Def: 100</span>
              </label>
              <input
                type="number"
                name="payloadMax"
                value={formData.payloadMax !== undefined && formData.payloadMax !== '' ? formData.payloadMax : 100}
                onChange={(e) => handleMaxChange(Number(e.target.value))}
                className="w-full bg-gray-950 text-white font-mono text-xs px-2.5 py-1.5 rounded-lg border border-gray-700 outline-none focus:border-amber-500 transition-colors shadow-inner"
                placeholder="100"
              />
            </div>

            {/* + Add Zone Button */}
            <div>
              <button
                type="button"
                onClick={handleAddZone}
                disabled={zones.length >= 6}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-md ${
                  zones.length >= 6
                    ? 'bg-gray-800 text-gray-500 border border-gray-700/60 cursor-not-allowed opacity-60'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 hover:border-amber-400 cursor-pointer active:scale-95'
                }`}
                title={zones.length >= 6 ? 'Maximum of 6 zones allowed' : 'Add another color zone (Max 6)'}
              >
                <i className="fas fa-plus text-[10px]"></i>
                <span>Add Zone</span>
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-amber-200">
                  {zones.length}/6
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. AUTOFIT COLOR PICKER CARDS ROW (1 ROW, UP TO 6 ZONES) ─── */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[11px] font-semibold text-gray-400">
            Click circle to choose zone color:
          </span>
          {zones.length > 2 && (
            <span className="text-[10px] text-gray-500 italic">
              Hover zone to remove (✕)
            </span>
          )}
        </div>

        {/* Single row flex layout that autofits smaller as up to 6 zones are added */}
        <div className="flex flex-row w-full gap-1 sm:gap-2 items-stretch overflow-hidden">
          {zones.map((zone, idx) => {
            const { startVal, endVal } = getZoneBounds(idx);

            return (
              <div
                key={idx}
                onClick={() => setPickingColorFor(`zone-${idx}`)}
                className="flex-1 min-w-0 flex flex-col items-center justify-between p-1 sm:p-2 rounded-lg bg-gray-900/90 border border-gray-800 cursor-pointer hover:border-amber-500/60 hover:bg-gray-850 transition-all text-center relative group shadow-sm select-none"
                title={`Click to pick color for ${zone.label} (${startVal} → ${endVal})`}
              >
                {/* Remove button if more than 2 zones exist */}
                {zones.length > 2 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveZone(idx);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer z-10"
                    title={`Remove ${zone.label}`}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}

                {/* Color preview circle */}
                <div
                  className={`${circleSizeClass} rounded-full border-2 border-white/20 shadow-md mb-1 shrink-0 transition-transform group-hover:scale-110`}
                  style={{ backgroundColor: zone.color }}
                />

                {/* Editable Zone Name Input */}
                <div
                  className="w-full px-0.5 mt-0.5 relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={zone.label}
                    onChange={(e) => handleZoneLabelChange(idx, e.target.value)}
                    placeholder={`Zone ${idx + 1}`}
                    className={`${labelSizeClass} font-bold text-gray-100 bg-black/40 hover:bg-black/70 focus:bg-black border border-transparent hover:border-gray-700 focus:border-amber-500 rounded px-1 py-0.5 w-full text-center outline-none transition-all truncate`}
                    title="Click to rename this zone"
                  />
                </div>

                {/* Zone numeric range */}
                <span
                  className={`${rangeSizeClass} text-gray-400 font-mono truncate max-w-full block mt-0.5`}
                >
                  {startVal} → {endVal}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 2b. RUNTIME ZONE DISPLAY TOGGLE ─── */}
      <div className="flex items-center justify-between p-2.5 bg-gray-900/70 rounded-xl border border-gray-800 transition-colors hover:border-gray-700">
        <label className="flex items-center space-x-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="showActiveZoneName"
            checked={!!formData.showActiveZoneName}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, showActiveZoneName: e.target.checked }))}
            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-200 flex items-center space-x-1.5">
              <i className="fas fa-tag text-[10px] text-amber-400"></i>
              <span>Show Active Zone Name on Runtime</span>
            </span>
            <span className="text-[10px] text-gray-400 leading-tight">
              Displays a real-time badge on the widget indicating which zone is running without blocking values
            </span>
          </div>
        </label>
        {formData.showActiveZoneName && (
          <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
            Active
          </span>
        )}
      </div>

      {/* ─── 3. VISUAL COLOR BAR PREVIEW ─── */}
      <div className="space-y-1">
        <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-gray-950 border border-gray-800 p-0.5 shadow-inner">
          {zones.map((zone, idx) => {
            const { startVal, endVal } = getZoneBounds(idx);
            const span = Math.max(0, endVal - startVal);
            const pct = Math.max(1, Math.min(100, (span / pRange) * 100));
            const isLast = idx === zones.length - 1;

            return (
              <div
                key={idx}
                style={{
                  width: isLast ? undefined : `${pct}%`,
                  flex: isLast ? 1 : undefined,
                  backgroundColor: zone.color
                }}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-150"
                title={`${zone.label}: ${startVal} → ${endVal}`}
              />
            );
          })}
        </div>
      </div>

      {/* ─── 4. INTERLOCKED THRESHOLD SLIDERS & INPUTS ─── */}
      <div className="space-y-3 pt-1">
        {thresholds.map((thresholdVal, idx) => {
          const leftZone = zones[idx];
          const rightZone = zones[idx + 1];

          return (
            <div key={idx} className="space-y-1 bg-gray-950/40 p-2.5 rounded-lg border border-gray-800/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-semibold flex items-center space-x-1.5 truncate mr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: leftZone?.color || '#38bdf8' }}
                  />
                  <span className="truncate">
                    Cut-off {idx + 1} ({leftZone?.label || `Zone ${idx + 1}`} → {rightZone?.label || `Zone ${idx + 2}`})
                  </span>
                </span>
                <input
                  type="number"
                  value={thresholdVal}
                  onChange={(e) => handleThresholdChange(idx, Number(e.target.value))}
                  className="w-16 bg-gray-950 text-white font-mono text-xs px-2 py-0.5 rounded border border-gray-700 text-right outline-none focus:border-amber-500 shrink-0"
                />
              </div>

              <input
                type="range"
                min={pMin}
                max={pMax}
                value={thresholdVal}
                onChange={(e) => handleThresholdChange(idx, Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
