export type Scada3dTargetProperty =
  | 'running'         // Drives continuous spin animation
  | 'speed'           // Drives variable speed rotation / particle rate
  | 'continuous_spin' // Explicit continuous 3-axis rotation
  | 'angular_position'// Drives 0-90° or 0-360° angular position travel
  | 'position'        // Legacy alias for angular position
  | 'rotation_angle'  // Legacy alias for angular position
  | 'linear_travel'   // Drives 3D translation along X/Y/Z (e.g. valve stem, piston, conveyor)
  | 'level'           // Drives fluid surface translation or vertical scale
  | 'fluid_level'     // Explicit 3D fluid level scaling
  | 'color'           // Drives primary body material diffuse color
  | 'color_shift'     // Material diffuse color shift
  | 'emissive'        // Drives glowing emissive highlight (alarms/warnings)
  | 'emissive_glow'   // Material emissive glow with pulse
  | 'opacity'         // Drives transparency/fade
  | 'visibility';     // Drives object/submesh show/hide

export type Scada3dAnimationType =
  | 'continuous_spin'
  | 'angular_position'
  | 'variable_rotation'
  | 'fluid_level'
  | 'linear_travel'
  | 'alarm_pulse'
  | 'color_shift'
  | 'glb_clip';

export type Scada3dSignalMode = 'digital' | 'analog' | 'combined';

export interface Scada3dThresholdRule {
  id: string;
  condition: '>' | '>=' | '<' | '<=' | '=' | '!=';
  value: number | string;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  label?: string;
  state?: 'normal' | 'running' | 'warning' | 'alarm' | 'fault' | 'maintenance' | 'offline';
  pulse?: boolean;
}

export interface Scada3dBinding {
  id: string;
  name?: string;
  property: Scada3dTargetProperty;
  
  // Sub-Part target targeting
  subPartId?: string;       // Sub-part ID (e.g. "rotor", "impeller", "valve_stem", "cooling_fan", "liquid")
  targetNodeName?: string;  // Explicit Three.js object name (e.g. "Impeller_Rotor")

  // Data source
  dataSourceMode: 'mqtt' | 'driver';
  topic?: string;
  jsonPath?: string;
  driverTagId?: string;

  // Signal mode
  signalMode?: Scada3dSignalMode; // 'digital' | 'analog' | 'combined'

  // Digital 2-State Configuration
  digitalActiveValue?: any;        // Value evaluated as Active (default truthy / 1 / 'RUN' / 'ON')
  activeSpeedRpm?: number;         // Speed when Digital is Active (e.g. 1500 RPM)
  inactiveSpeedRpm?: number;       // Speed when Digital is Inactive (default 0 RPM)
  activeAngleDeg?: number;         // Angle when Digital is Active (e.g. 90° for Open)
  inactiveAngleDeg?: number;       // Angle when Digital is Inactive (e.g. 0° for Closed)
  activeOffsetMeters?: number;     // Displacement when Active (e.g. 0.15m)
  inactiveOffsetMeters?: number;   // Displacement when Inactive (e.g. 0m)

  // Secondary Data Source for Combined Mode (Digital Permissive + Analog Speed)
  speedDataSourceMode?: 'mqtt' | 'driver';
  speedTopic?: string;
  speedJsonPath?: string;
  speedDriverTagId?: string;

  // Analog Scaling & Range
  minRaw?: number;                 // Raw tag min (e.g. 0)
  maxRaw?: number;                 // Raw tag max (e.g. 100 or 3000)
  minTarget?: number;              // Target min value in 3D (RPM, Deg, or Meters)
  maxTarget?: number;              // Target max value in 3D (RPM, Deg, or Meters)
  clamp?: boolean;                 // Clamps value within min/max bounds (default true)
  deadband?: number;               // Noise suppression threshold
  unit?: string;

  // 3-Axis Motion Parameters
  animationType?: Scada3dAnimationType;
  axis?: 'x' | 'y' | 'z';          // 3-Axis selector
  direction?: 'cw' | 'ccw';        // Rotation direction
  spinAxis?: 'x' | 'y' | 'z';      // Backward compatibility alias for axis
  spinDirection?: 'cw' | 'ccw';    // Backward compatibility alias for direction
  baseSpeedRpm?: number;           // Backward compatibility alias for activeSpeedRpm

  // Angular Position Travel (0° to 90° / 0° to 360°)
  rotationAxis?: 'x' | 'y' | 'z';
  rotationMinDeg?: number;
  rotationMaxDeg?: number;

  // Linear Displacement Travel (Meters)
  travelAxis?: 'x' | 'y' | 'z';
  travelMinMeters?: number;
  travelMaxMeters?: number;

  // Visual state & threshold alarms
  thresholds?: Scada3dThresholdRule[];
  defaultColor?: string;
  defaultEmissive?: string;
  defaultEmissiveIntensity?: number;
  
  // GLB Native Animation Clip (if embedded in GLTF)
  clipName?: string;
}
