export interface PanelColorZone {
  color: string;
  label?: string;
}

export const PRESET_ZONE_COLORS: string[] = [
  '#eab308', // Low / Zone 1 (Amber/Yellow)
  '#10b981', // Mid / Zone 2 (Emerald/Green)
  '#f97316', // High / Zone 3 (Orange)
  '#ef4444', // Zone 4 (Rose/Red)
  '#a855f7', // Zone 5 (Purple)
  '#06b6d4', // Zone 6 (Cyan)
];

export interface ResolvedGaugeZones {
  min: number;
  max: number;
  range: number;
  zones: PanelColorZone[];
  thresholds: number[];
}

/**
 * Resolves active min, max, zones, and cut-off thresholds for any panel with safe backward-compatibility.
 */
export function getResolvedZones(panel: {
  payloadMin?: number;
  payloadMax?: number;
  lowThreshold?: number;
  highThreshold?: number;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  colorZones?: PanelColorZone[];
  thresholds?: number[];
  [key: string]: any;
}): ResolvedGaugeZones {
  const rawMin = panel.payloadMin !== undefined && panel.payloadMin !== null && !isNaN(Number(panel.payloadMin))
    ? Number(panel.payloadMin)
    : 0;
  const rawMax = panel.payloadMax !== undefined && panel.payloadMax !== null && !isNaN(Number(panel.payloadMax))
    ? Number(panel.payloadMax)
    : 100;

  const min = rawMin;
  const max = rawMax <= rawMin ? rawMin + 100 : rawMax;
  const range = max - min || 1;

  let zones: PanelColorZone[] = [];
  let thresholds: number[] = [];

  if (panel.colorZones && Array.isArray(panel.colorZones) && panel.colorZones.length >= 2) {
    zones = panel.colorZones.slice(0, 6).map((z, i) => ({
      color: z.color || PRESET_ZONE_COLORS[i % PRESET_ZONE_COLORS.length],
      label: z.label !== undefined ? z.label : (i === 0 ? 'Low Zone' : i === panel.colorZones!.length - 1 ? 'High Zone' : `Zone ${i + 1}`)
    }));

    const expectedCount = zones.length - 1;
    if (panel.thresholds && Array.isArray(panel.thresholds) && panel.thresholds.length === expectedCount) {
      thresholds = [...panel.thresholds].map(Number);
    } else {
      thresholds = [];
      for (let i = 1; i < zones.length; i++) {
        thresholds.push(Math.round(min + (range * i) / zones.length));
      }
    }
  } else {
    // Standard default 3 zones
    const lowTh = panel.lowThreshold !== undefined && !isNaN(Number(panel.lowThreshold))
      ? Number(panel.lowThreshold)
      : Math.round(min + range * 0.33);
    const highTh = panel.highThreshold !== undefined && !isNaN(Number(panel.highThreshold))
      ? Number(panel.highThreshold)
      : Math.round(min + range * 0.66);

    zones = [
      { color: panel.firstColor || PRESET_ZONE_COLORS[0], label: 'Low Zone' },
      { color: panel.secondColor || PRESET_ZONE_COLORS[1], label: 'Mid Zone' },
      { color: panel.thirdColor || PRESET_ZONE_COLORS[2], label: 'High Zone' },
    ];
    thresholds = [lowTh, highTh];
  }

  // Interlocked sorting and bounds clamping
  for (let i = 0; i < thresholds.length; i++) {
    const prevLimit = i === 0 ? min : thresholds[i - 1];
    if (thresholds[i] < prevLimit) {
      thresholds[i] = prevLimit;
    }
    if (thresholds[i] > max) {
      thresholds[i] = max;
    }
  }

  return { min, max, range, zones, thresholds };
}

/**
 * Finds matching zone for an incoming process value.
 */
export function getZoneForValue(
  numVal: number,
  resolved: ResolvedGaugeZones
): { index: number; zone: PanelColorZone } {
  const { min, max, zones, thresholds } = resolved;
  if (isNaN(numVal)) {
    return { index: 0, zone: zones[0] };
  }

  const val = Math.max(min, Math.min(max, numVal));
  for (let i = 0; i < thresholds.length; i++) {
    if (val <= thresholds[i]) {
      return { index: i, zone: zones[i] };
    }
  }
  return { index: zones.length - 1, zone: zones[zones.length - 1] };
}

/**
 * Handles interlocked adjustment of cut-off thresholds so no cut-off crosses its neighbor.
 */
export function clampInterlockedThreshold(
  thresholds: number[],
  indexChanged: number,
  newVal: number,
  min: number,
  max: number
): number[] {
  const updated = [...thresholds];
  const clamped = Math.max(min, Math.min(max, newVal));
  updated[indexChanged] = clamped;

  // Push forward if exceeding upper neighbors
  for (let i = indexChanged + 1; i < updated.length; i++) {
    if (updated[i] < updated[i - 1]) {
      updated[i] = updated[i - 1];
    }
  }

  // Push backward if subceeding lower neighbors
  for (let i = indexChanged - 1; i >= 0; i--) {
    if (updated[i] > updated[i + 1]) {
      updated[i] = updated[i + 1];
    }
  }

  return updated;
}
