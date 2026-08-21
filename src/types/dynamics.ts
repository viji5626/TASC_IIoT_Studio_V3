export type DynamicPropertyType = 
  | 'color_shift'          // Threshold / state-based fill/stroke/text color change
  | 'rotation'             // Continuous rotation speed by tag or angular deflection
  | 'discrete_motion'      // 2D linear or multi-node motion path translation
  | 'level_fill'           // Analog liquid/fluid percentage level filling (tanks, pipes)
  | 'visibility_blink'     // Tag condition based hide/show or flashing strobe
  | 'size_scale'           // Dynamic scaling (W/H stretch)
  | 'opacity_fade';        // Dynamic alpha fading

export interface DynamicBehaviorRule {
  id: string;
  type: DynamicPropertyType;
  name: string;
  enabled: boolean;
  dataSourceMode: 'driver' | 'mqtt';
  driverTagId?: string;
  topic?: string;
  jsonPath?: string;            // Per-rule JSONPath query when dataSourceMode === 'mqtt'

  // Tag Data Format: 'analog' (Continuous / Threshold / Range) vs 'digital' (2-State Discrete)
  tagDataType?: 'analog' | 'digital';

  // 2-State Digital (Discrete) Settings (Default State 1 = '0', State 2 = '1'):
  state1Value?: string | number; // Default '0'
  state2Value?: string | number; // Default '1'
  state1Label?: string;          // e.g. "State 0 / Off"
  state2Label?: string;          // e.g. "State 1 / On"

  // Digital State 1 Actions:
  state1Visibility?: 'show' | 'hide' | 'blink';
  state1Fill?: string;
  state1Stroke?: string;
  state1Opacity?: number;
  state1Rotate?: boolean;
  state1RotationSpeed?: number;
  state1RotationDirection?: 'cw' | 'ccw';

  // Digital State 2 Actions:
  state2Visibility?: 'show' | 'hide' | 'blink';
  state2Fill?: string;
  state2Stroke?: string;
  state2Opacity?: number;
  state2Rotate?: boolean;
  state2RotationSpeed?: number;
  state2RotationDirection?: 'cw' | 'ccw';

  // Analog Trigger & Condition Settings
  conditionType: 'always' | 'threshold' | 'digital_state' | 'range' | 'continuous_analog';
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
  conditionValue?: number | string;
  conditionValueHigh?: number; // for range
  actionOnMatch?: 'show' | 'hide' | 'blink'; // For analog visibility
  actionOnElse?: 'show' | 'hide';            // For analog visibility

  // Action / Visual targets
  targetFill?: string;
  targetStroke?: string;
  targetTextColor?: string;
  targetOpacity?: number;
  targetVisible?: boolean;
  isBlinking?: boolean;
  blinkSpeed?: 'slow' | 'medium' | 'fast';

  // Motion & Rotation parameters
  rotationMode?: 'continuous_spin' | 'angle_deflection';
  rotationSpeed?: number; // RPM or duration
  rotationDirection?: 'cw' | 'ccw';
  minAngle?: number; // e.g. 0 deg
  maxAngle?: number; // e.g. 90 deg
  minTagValue?: number; // e.g. 0
  maxTagValue?: number; // e.g. 100

  // Level fill parameters
  fillDirection?: 'bottom_to_top' | 'top_to_bottom' | 'left_to_right' | 'right_to_left';
  fillColor?: string;
  fillMin?: number;
  fillMax?: number;
  showPercentage?: boolean;

  // Motion Translation
  motionPathPoints?: Array<{ x: number; y: number }>;
}

export interface SvgSubPartConfig {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  isHidden?: boolean;
  animType?: 'none' | 'spin' | 'pulse' | 'level_fill' | 'flow' | 'color_shift';
  rotationSpeed?: number;
  dataSourceMode?: 'mqtt' | 'driver';
  topic?: string;
  driverTagId?: string;
  lowThreshold?: number;
  highThreshold?: number;
  alarmColor?: string;
  // Multiple Dynamic Behaviors Pipeline
  dynamics?: DynamicBehaviorRule[];
}
