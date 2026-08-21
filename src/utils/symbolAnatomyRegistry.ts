import { SvgSubPartConfig } from '../types';

export interface SvgPartDefinition {
  partId: string;
  name: string;
  icon: string;
  category: 'structural' | 'mechanical' | 'fluid' | 'electrical' | 'indicator';
  defaultFill?: string;
  defaultStroke?: string;
  supportedAnimations?: ('spin' | 'pulse' | 'level_fill' | 'flow' | 'color_shift')[];
}

export interface SymbolAnatomy {
  symbolId: string;
  displayName: string;
  category: string;
  parts: SvgPartDefinition[];
}

export const SYMBOL_PARTS_SCHEMA: Record<string, SymbolAnatomy> = {
  tank_vertical: {
    symbolId: 'tank_vertical',
    displayName: 'Vertical Process Tank',
    category: 'Tanks & Vessels',
    parts: [
      { partId: 'body', name: 'Main Tank Cylinder', icon: 'fa-layer-group', category: 'structural', defaultFill: '#1e293b', defaultStroke: '#0f172a' },
      { partId: 'cap', name: 'Dish Head Cap / Lid', icon: 'fa-angles-up', category: 'structural', defaultFill: '#334155', defaultStroke: '#0f172a', supportedAnimations: ['color_shift'] },
      { partId: 'legs', name: 'Support Stand Legs', icon: 'fa-shoe-prints', category: 'structural', defaultFill: '#475569', defaultStroke: '#0f172a' },
      { partId: 'liquid_level', name: 'Fluid Liquid Fill', icon: 'fa-water', category: 'fluid', defaultFill: '#0284c7', supportedAnimations: ['level_fill', 'pulse', 'color_shift'] },
      { partId: 'sight_glass', name: 'Sight Glass Tube', icon: 'fa-ruler-vertical', category: 'indicator', defaultFill: '#0ea5e9' },
      { partId: 'manhole', name: 'Maintenance Manhole', icon: 'fa-circle-dot', category: 'structural', defaultFill: '#334155' },
      { partId: 'nozzle_in', name: 'Top Inlet Nozzle', icon: 'fa-arrow-down-to-line', category: 'mechanical', defaultFill: '#475569' },
      { partId: 'nozzle_out', name: 'Bottom Outlet Drain', icon: 'fa-arrow-up-from-line', category: 'mechanical', defaultFill: '#475569' }
    ]
  },
  tank_conical: {
    symbolId: 'tank_conical',
    displayName: 'Conical Bottom Hopper Tank',
    category: 'Tanks & Vessels',
    parts: [
      { partId: 'body', name: 'Cylindrical Shell', icon: 'fa-layer-group', category: 'structural', defaultFill: '#1e293b', defaultStroke: '#0f172a' },
      { partId: 'cone', name: 'Conical Discharge Hopper', icon: 'fa-filter', category: 'structural', defaultFill: '#334155', defaultStroke: '#0f172a' },
      { partId: 'cap', name: 'Top Roof Dish', icon: 'fa-angles-up', category: 'structural', defaultFill: '#334155' },
      { partId: 'legs', name: 'Leg Supports', icon: 'fa-shoe-prints', category: 'structural', defaultFill: '#475569' },
      { partId: 'liquid_level', name: 'Material / Slurry Fill', icon: 'fa-water', category: 'fluid', defaultFill: '#d97706', supportedAnimations: ['level_fill', 'pulse', 'color_shift'] }
    ]
  },
  silo_grain: {
    symbolId: 'silo_grain',
    displayName: 'Bulk Storage Silo',
    category: 'Tanks & Vessels',
    parts: [
      { partId: 'body', name: 'Corrugated Silo Body', icon: 'fa-warehouse', category: 'structural', defaultFill: '#334155', defaultStroke: '#0f172a' },
      { partId: 'roof', name: 'Conical Peak Roof', icon: 'fa-tent', category: 'structural', defaultFill: '#475569' },
      { partId: 'discharge', name: 'Discharge Chute Gate', icon: 'fa-door-open', category: 'mechanical', defaultFill: '#1e293b' },
      { partId: 'legs', name: 'Structural Column Legs', icon: 'fa-grip-lines-vertical', category: 'structural', defaultFill: '#475569' },
      { partId: 'material_level', name: 'Solid / Grain Fill', icon: 'fa-wheat-awn', category: 'fluid', defaultFill: '#eab308', supportedAnimations: ['level_fill', 'pulse'] }
    ]
  },
  pump_centrifugal: {
    symbolId: 'pump_centrifugal',
    displayName: 'Centrifugal Volute Pump',
    category: 'Pumps & Turbines',
    parts: [
      { partId: 'casing', name: 'Volute Spiral Casing', icon: 'fa-shield-halved', category: 'structural', defaultFill: '#334155', defaultStroke: '#0f172a', supportedAnimations: ['color_shift'] },
      { partId: 'impeller', name: 'Rotating Multi-Blade Impeller', icon: 'fa-fan', category: 'mechanical', defaultFill: '#10b981', supportedAnimations: ['spin', 'pulse', 'color_shift'] },
      { partId: 'status_led', name: 'Run / Alarm Status LED', icon: 'fa-lightbulb', category: 'indicator', defaultFill: '#10b981', supportedAnimations: ['pulse', 'color_shift'] },
      { partId: 'base_plate', name: 'Heavy Base Stand Plate', icon: 'fa-cube', category: 'structural', defaultFill: '#1e293b' },
      { partId: 'shaft_guard', name: 'Drive Shaft Coupling Guard', icon: 'fa-arrows-left-right', category: 'mechanical', defaultFill: '#f59e0b' },
      { partId: 'flange_top', name: 'Top Discharge Nozzle', icon: 'fa-arrow-up', category: 'mechanical', defaultFill: '#cbd5e1' }
    ]
  },
  pump_water: {
    symbolId: 'pump_water',
    displayName: 'Inline Booster Water Pump',
    category: 'Pumps & Turbines',
    parts: [
      { partId: 'casing', name: 'Pump Housing', icon: 'fa-shield-halved', category: 'structural', defaultFill: '#0284c7' },
      { partId: 'impeller', name: 'Impeller Vanes', icon: 'fa-fan', category: 'mechanical', defaultFill: '#38bdf8', supportedAnimations: ['spin', 'pulse'] },
      { partId: 'status_led', name: 'Status Indicator', icon: 'fa-lightbulb', category: 'indicator', defaultFill: '#10b981', supportedAnimations: ['pulse'] }
    ]
  },
  valve_control: {
    symbolId: 'valve_control',
    displayName: 'Pneumatic Control Valve',
    category: 'Valves & Actuators',
    parts: [
      { partId: 'actuator_dome', name: 'Actuator Diaphragm Dome', icon: 'fa-circle-half-stroke', category: 'mechanical', defaultFill: '#0284c7', defaultStroke: '#0f172a', supportedAnimations: ['color_shift'] },
      { partId: 'stem_shaft', name: 'Dynamic Stem Rod', icon: 'fa-arrows-up-down', category: 'mechanical', defaultFill: '#cbd5e1', supportedAnimations: ['level_fill'] },
      { partId: 'positioner_dial', name: 'Positioner Display', icon: 'fa-gauge-high', category: 'indicator', defaultFill: '#0f172a' },
      { partId: 'valve_body', name: 'Flanged Valve Body', icon: 'fa-triangle-exclamation', category: 'structural', defaultFill: '#334155', defaultStroke: '#0f172a' },
      { partId: 'internal_disc', name: 'Rotating Throttle Disc', icon: 'fa-compact-disc', category: 'mechanical', defaultFill: '#10b981', supportedAnimations: ['spin', 'color_shift'] },
      { partId: 'flanges', name: 'Pipe Connection Flanges', icon: 'fa-ellipsis-vertical', category: 'structural', defaultFill: '#475569' }
    ]
  },
  valve_solenoid: {
    symbolId: 'valve_solenoid',
    displayName: 'Digital Solenoid Valve',
    category: 'Valves & Actuators',
    parts: [
      { partId: 'solenoid_coil', name: 'Solenoid Coil Enclosure', icon: 'fa-box', category: 'electrical', defaultFill: '#1e293b', defaultStroke: '#0f172a' },
      { partId: 'status_indicator', name: 'Open / Close LED', icon: 'fa-lightbulb', category: 'indicator', defaultFill: '#10b981', supportedAnimations: ['pulse', 'color_shift'] },
      { partId: 'valve_body', name: 'Body Flanges & Chambers', icon: 'fa-triangle-exclamation', category: 'structural', defaultFill: '#10b981', supportedAnimations: ['color_shift'] }
    ]
  },
  motor_electric: {
    symbolId: 'motor_electric',
    displayName: '3-Phase Electric AC Motor',
    category: 'Motors & Drives',
    parts: [
      { partId: 'stator_housing', name: 'Stator Casing & Fins', icon: 'fa-cubes-stacked', category: 'structural', defaultFill: '#1e293b', defaultStroke: '#0f172a', supportedAnimations: ['color_shift'] },
      { partId: 'terminal_box', name: 'Terminal Junction Box', icon: 'fa-plug', category: 'electrical', defaultFill: '#475569' },
      { partId: 'drive_shaft', name: 'Rotor Drive Shaft', icon: 'fa-dharmachakra', category: 'mechanical', defaultFill: '#cbd5e1', supportedAnimations: ['spin'] },
      { partId: 'cooling_fan', name: 'Rear Cooling Fan Impeller', icon: 'fa-fan', category: 'mechanical', defaultFill: '#0284c7', supportedAnimations: ['spin', 'pulse'] },
      { partId: 'base_feet', name: 'Motor Mounting Feet', icon: 'fa-cube', category: 'structural', defaultFill: '#334155' }
    ]
  },
  agitator_mixer: {
    symbolId: 'agitator_mixer',
    displayName: 'Top-Entry Tank Agitator',
    category: 'Motors & Drives',
    parts: [
      { partId: 'drive_motor', name: 'Drive Gearmotor Head', icon: 'fa-gears', category: 'mechanical', defaultFill: '#334155', defaultStroke: '#0f172a', supportedAnimations: ['color_shift'] },
      { partId: 'flange_mount', name: 'Tank Mounting Flange', icon: 'fa-circle-notch', category: 'structural', defaultFill: '#475569' },
      { partId: 'mixer_shaft', name: 'Agitator Drive Shaft', icon: 'fa-grip-lines-vertical', category: 'mechanical', defaultFill: '#cbd5e1', supportedAnimations: ['spin'] },
      { partId: 'impeller_blades', name: 'Mixing Hydrofoil Blades', icon: 'fa-clover', category: 'mechanical', defaultFill: '#0ea5e9', supportedAnimations: ['spin', 'pulse', 'color_shift'] }
    ]
  },
  heat_exchanger: {
    symbolId: 'heat_exchanger',
    displayName: 'Shell & Tube Heat Exchanger',
    category: 'Process Equipment',
    parts: [
      { partId: 'shell_body', name: 'Outer Shell Cylinder', icon: 'fa-layer-group', category: 'structural', defaultFill: '#1e293b', defaultStroke: '#0f172a' },
      { partId: 'tube_bundle', name: 'Internal Tube Bundle', icon: 'fa-bars-staggered', category: 'mechanical', defaultFill: '#f59e0b', supportedAnimations: ['flow', 'pulse'] },
      { partId: 'hot_inlet', name: 'Hot Fluid Inlet Nozzle', icon: 'fa-arrow-down', category: 'fluid', defaultFill: '#ef4444', supportedAnimations: ['color_shift'] },
      { partId: 'cold_inlet', name: 'Cold Fluid Inlet Nozzle', icon: 'fa-arrow-up', category: 'fluid', defaultFill: '#0284c7', supportedAnimations: ['color_shift'] }
    ]
  },
  pipe_process: {
    symbolId: 'pipe_process',
    displayName: 'Industrial Process Pipe',
    category: 'Process Equipment',
    parts: [
      { partId: 'pipe_body', name: 'Pipe Wall & Conduit', icon: 'fa-grip-lines', category: 'structural', defaultFill: '#1e293b', defaultStroke: '#38bdf8' },
      { partId: 'flanges', name: 'Flange Joint Connectors', icon: 'fa-ellipsis-vertical', category: 'structural', defaultFill: '#475569' },
      { partId: 'flow_indicator', name: 'Dynamic Fluid Flow Stream', icon: 'fa-water', category: 'fluid', defaultFill: '#38bdf8', supportedAnimations: ['flow', 'pulse'] }
    ]
  }
};

/**
 * Get list of anatomical sub-parts for any symbol
 */
export function getSymbolParts(symbolId?: string): SvgPartDefinition[] {
  if (!symbolId) return [];
  const normalizedId = symbolId.toLowerCase();
  
  if (SYMBOL_PARTS_SCHEMA[normalizedId]) {
    return SYMBOL_PARTS_SCHEMA[normalizedId].parts;
  }

  // Fallback pattern matching
  for (const [key, schema] of Object.entries(SYMBOL_PARTS_SCHEMA)) {
    if (normalizedId.includes(key) || key.includes(normalizedId)) {
      return schema.parts;
    }
  }

  // Generic parts fallback for unknown custom symbols
  return [
    { partId: 'body', name: 'Main Body Shell', icon: 'fa-layer-group', category: 'structural' },
    { partId: 'indicator', name: 'Status Indicator / LED', icon: 'fa-lightbulb', category: 'indicator', supportedAnimations: ['pulse', 'color_shift'] },
    { partId: 'rotor', name: 'Rotating Mechanism', icon: 'fa-fan', category: 'mechanical', supportedAnimations: ['spin'] }
  ];
}

/**
 * Cleanse and sanitize sub-parts when switching symbol types to prevent orphan state
 */
export function sanitizeSvgSubParts(
  symbolId: string,
  existingSubParts?: Record<string, SvgSubPartConfig>
): Record<string, SvgSubPartConfig> | undefined {
  if (!existingSubParts || Object.keys(existingSubParts).length === 0) return undefined;
  
  const validParts = getSymbolParts(symbolId).map(p => p.partId);
  const sanitized: Record<string, SvgSubPartConfig> = {};
  
  for (const [partId, config] of Object.entries(existingSubParts)) {
    if (validParts.includes(partId)) {
      sanitized[partId] = config;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}
