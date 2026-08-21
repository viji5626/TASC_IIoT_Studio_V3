import { Panel, DynamicBehaviorRule } from '../types';
import { getJsonValue } from './mqttHelper';

export interface EvaluatedPanelDynamics {
  levelFill: {
    isLevelFill: boolean;
    percentage: number;
    fillDirection: 'bottom_to_top' | 'top_to_bottom' | 'left_to_right' | 'right_to_left';
    fillColor: string;
    fillMin: number;
    fillMax: number;
    currentValue: number;
    showPercentage: boolean;
  } | null;
  colorShift: {
    fill?: string;
    stroke?: string;
  } | null;
  visibility: {
    isHidden: boolean;
    isBlinking: boolean;
    blinkSpeed: 'slow' | 'medium' | 'fast';
  } | null;
  opacity: number | null;
  rotation: {
    isSpinning: boolean;
    spinDirection: 'cw' | 'ccw';
    spinDuration: number;
    angle: number;
  } | null;
}

/**
 * Evaluates all stacked DynamicBehaviorRule items assigned to an element (panel.dynamics).
 */
export function evaluatePanelDynamics(
  panel: Panel,
  latestValues: Record<string, any>
): EvaluatedPanelDynamics {
  const result: EvaluatedPanelDynamics = {
    levelFill: null,
    colorShift: null,
    visibility: null,
    opacity: null,
    rotation: null
  };

  const dynamicRules = panel.dynamics || [];
  if (!Array.isArray(dynamicRules) || dynamicRules.length === 0) {
    return result;
  }

  for (const rule of dynamicRules) {
    if (!rule.enabled) continue;

    // 1. Resolve live raw value for this rule
    const tagKey = rule.dataSourceMode === 'driver' 
      ? (rule.driverTagId || (rule as any).driverTagName || (rule as any).tagName) 
      : (rule.topic || (rule as any).tagName);
    let rawVal: any = undefined;

    if (tagKey) {
      const cleanKey = String(tagKey).trim();
      if (latestValues[cleanKey] !== undefined) {
        rawVal = latestValues[cleanKey]?.val !== undefined ? latestValues[cleanKey].val : latestValues[cleanKey];
      } else {
        // Try finding by case-insensitive match or tag_panel_ prefix
        for (const [k, v] of Object.entries(latestValues)) {
          if (k.toLowerCase() === cleanKey.toLowerCase() || k === `tag_panel_${cleanKey}` || k.toLowerCase() === `tag_panel_${cleanKey.toLowerCase()}`) {
            rawVal = v?.val !== undefined ? v.val : v;
            break;
          }
        }
      }
    }

    // Fallback to panel's own primary tag or panelId if not resolved
    if (rawVal === undefined) {
      if (panel.driverTagId && latestValues[panel.driverTagId] !== undefined) {
        rawVal = latestValues[panel.driverTagId]?.val !== undefined ? latestValues[panel.driverTagId].val : latestValues[panel.driverTagId];
      } else if (panel.topic && latestValues[panel.topic] !== undefined) {
        rawVal = latestValues[panel.topic]?.val !== undefined ? latestValues[panel.topic].val : latestValues[panel.topic];
      } else if (latestValues[panel.panelId] !== undefined) {
        rawVal = latestValues[panel.panelId]?.val !== undefined ? latestValues[panel.panelId].val : latestValues[panel.panelId];
      }
    }

    // If MQTT mode and JSONPath query is specified, extract nested JSON value
    if (rule.dataSourceMode === 'mqtt' && rule.jsonPath && rule.jsonPath.trim() && rawVal !== undefined) {
      try {
        const parsed = typeof rawVal === 'string' && (rawVal.startsWith('{') || rawVal.startsWith('['))
          ? JSON.parse(rawVal)
          : rawVal;
        const extracted = getJsonValue(parsed, rule.jsonPath);
        if (extracted !== undefined) rawVal = extracted;
      } catch {
        // ignore parse error
      }
    }

    const num = typeof rawVal === 'number' ? rawVal : (rawVal !== undefined && rawVal !== null ? parseFloat(String(rawVal)) : NaN);
    const str = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';

    const isDigitalMode = (rule.tagDataType || (rule.type === 'level_fill' ? 'analog' : 'digital')) === 'digital';

    if (isDigitalMode) {
      // 2-State Digital Mode
      const state1Val = String(rule.state1Value !== undefined ? rule.state1Value : '0').trim();
      const state2Val = String(rule.state2Value !== undefined ? rule.state2Value : '1').trim();

      const isMatchState1 = str === state1Val || (!isNaN(num) && num === parseFloat(state1Val));
      const isMatchState2 = str === state2Val || (!isNaN(num) && num === parseFloat(state2Val));

      if (isMatchState1) {
        if (rule.type === 'visibility_blink') {
          const vis = rule.state1Visibility || 'hide';
          result.visibility = {
            isHidden: vis === 'hide',
            isBlinking: vis === 'blink',
            blinkSpeed: rule.blinkSpeed || 'medium'
          };
        } else if (rule.type === 'color_shift') {
          result.colorShift = {
            fill: rule.state1Fill,
            stroke: rule.state1Stroke
          };
        } else if (rule.type === 'opacity_fade') {
          if (rule.state1Opacity !== undefined) result.opacity = rule.state1Opacity;
        } else if (rule.type === 'rotation') {
          result.rotation = {
            isSpinning: !!rule.state1Rotate,
            spinDirection: rule.state1RotationDirection || 'cw',
            spinDuration: Number(rule.rotationSpeed) || 2,
            angle: 0
          };
        }
      } else if (isMatchState2) {
        if (rule.type === 'visibility_blink') {
          const vis = rule.state2Visibility || 'show';
          result.visibility = {
            isHidden: vis === 'hide',
            isBlinking: vis === 'blink',
            blinkSpeed: rule.blinkSpeed || 'medium'
          };
        } else if (rule.type === 'color_shift') {
          result.colorShift = {
            fill: rule.state2Fill,
            stroke: rule.state2Stroke
          };
        } else if (rule.type === 'opacity_fade') {
          if (rule.state2Opacity !== undefined) result.opacity = rule.state2Opacity;
        } else if (rule.type === 'rotation') {
          result.rotation = {
            isSpinning: !!rule.state2Rotate,
            spinDirection: rule.state2RotationDirection || 'cw',
            spinDuration: Number(rule.rotationSpeed) || 2,
            angle: 0
          };
        }
      }
    } else {
      // Analog Mode
      let isMatch = false;
      if (rule.conditionType === 'always' || rule.type === 'level_fill') {
        isMatch = true;
      } else if (rule.conditionType === 'threshold' && !isNaN(num)) {
        const targetVal = parseFloat(String(rule.conditionValue ?? '0'));
        const op = rule.operator || '>';
        if (op === '>') isMatch = num > targetVal;
        else if (op === '>=') isMatch = num >= targetVal;
        else if (op === '<') isMatch = num < targetVal;
        else if (op === '<=') isMatch = num <= targetVal;
        else if (op === '==') isMatch = num === targetVal;
        else if (op === '!=') isMatch = num !== targetVal;
      } else if (rule.conditionType === 'range' && !isNaN(num)) {
        const minVal = rule.minTagValue ?? 0;
        const maxVal = rule.maxTagValue ?? 100;
        isMatch = num >= minVal && num <= maxVal;
      }

      if (rule.type === 'level_fill') {
        const min = rule.fillMin !== undefined ? Number(rule.fillMin) : (rule.minTagValue !== undefined ? Number(rule.minTagValue) : 0);
        const max = rule.fillMax !== undefined ? Number(rule.fillMax) : (rule.maxTagValue !== undefined ? Number(rule.maxTagValue) : 100);
        const range = max - min || 1;
        let percentage = 0;
        if (!isNaN(num)) {
          percentage = Math.max(0, Math.min(100, ((num - min) / range) * 100));
        }
        result.levelFill = {
          isLevelFill: true,
          percentage,
          fillDirection: rule.fillDirection || 'bottom_to_top',
          fillColor: rule.fillColor || '#10b981',
          fillMin: min,
          fillMax: max,
          currentValue: !isNaN(num) ? num : min,
          showPercentage: rule.showPercentage !== false
        };
      } else if (isMatch) {
        if (rule.type === 'color_shift') {
          result.colorShift = {
            fill: rule.targetFill,
            stroke: rule.targetStroke
          };
        } else if (rule.type === 'visibility_blink') {
          const act = rule.actionOnMatch || (rule.isBlinking ? 'blink' : 'hide');
          result.visibility = {
            isHidden: act === 'hide',
            isBlinking: act === 'blink',
            blinkSpeed: rule.blinkSpeed || 'medium'
          };
        } else if (rule.type === 'opacity_fade') {
          if (rule.targetOpacity !== undefined) result.opacity = rule.targetOpacity;
        } else if (rule.type === 'rotation') {
          const rotMode = rule.rotationMode || 'continuous_spin';
          if (rotMode === 'continuous_spin') {
            result.rotation = {
              isSpinning: true,
              spinDirection: rule.rotationDirection || 'cw',
              spinDuration: Number(rule.rotationSpeed) || 2,
              angle: 0
            };
          } else {
            const min = rule.minTagValue ?? 0;
            const max = rule.maxTagValue ?? 100;
            const range = max - min || 1;
            const pct = !isNaN(num) ? Math.max(0, Math.min(1, (num - min) / range)) : 0;
            result.rotation = {
              isSpinning: false,
              spinDirection: 'cw',
              spinDuration: 0,
              angle: pct * 90
            };
          }
        }
      } else {
        if (rule.type === 'visibility_blink' && rule.actionOnElse === 'hide') {
          result.visibility = {
            isHidden: true,
            isBlinking: false,
            blinkSpeed: 'medium'
          };
        }
      }
    }
  }

  return result;
}

/**
 * Extracts the raw live value for Motion Dynamics from the latest values map.
 */
export function getMotionTagValue(panel: Panel, latestValues: Record<string, any>): any {
  if (!panel.enableMotionDynamics) return undefined;

  // Custom tag mode vs element's own primary tag
  if (panel.motionTagMode === 'custom') {
    if (panel.motionDataSourceMode === 'driver' && panel.motionDriverTagId) {
      return latestValues[panel.motionDriverTagId]?.val ?? latestValues[panel.motionDriverTagId];
    }
    if (panel.motionTopic) {
      return latestValues[panel.motionTopic]?.val ?? latestValues[panel.motionTopic];
    }
  }

  // Fallback to panel's own primary tag / topic
  if (panel.dataSourceMode === 'driver' && panel.driverTagId) {
    return latestValues[panel.driverTagId]?.val ?? latestValues[panel.driverTagId];
  }
  if (panel.topic) {
    return latestValues[panel.topic]?.val ?? latestValues[panel.topic];
  }
  return latestValues[panel.panelId]?.val ?? latestValues[panel.panelId];
}

/**
 * Extracts the raw live value for Rotation Dynamics from the latest values map.
 */
export function getRotationTagValue(panel: Panel, latestValues: Record<string, any>): any {
  if (!panel.enableRotationDynamics) return undefined;

  // Custom tag mode vs element's own primary tag
  if (panel.rotationTagMode === 'custom') {
    if (panel.rotationDataSourceMode === 'driver' && panel.rotationDriverTagId) {
      return latestValues[panel.rotationDriverTagId]?.val ?? latestValues[panel.rotationDriverTagId];
    }
    if (panel.rotationTopic) {
      return latestValues[panel.rotationTopic]?.val ?? latestValues[panel.rotationTopic];
    }
  }

  // Fallback to panel's own primary tag / topic
  if (panel.dataSourceMode === 'driver' && panel.driverTagId) {
    return latestValues[panel.driverTagId]?.val ?? latestValues[panel.driverTagId];
  }
  if (panel.topic) {
    return latestValues[panel.topic]?.val ?? latestValues[panel.topic];
  }
  return latestValues[panel.panelId]?.val ?? latestValues[panel.panelId];
}

/**
 * Returns the effective list of waypoints / bend nodes for a panel's motion path.
 * If motionPathPoints is not set, falls back to [startPt, endPt].
 */
export function getEffectiveMotionPathPoints(panel: Panel): { x: number; y: number }[] {
  if (panel.motionPathPoints && Array.isArray(panel.motionPathPoints) && panel.motionPathPoints.length >= 2) {
    return panel.motionPathPoints;
  }
  const startX = Number(panel.motionStartX ?? 0);
  const startY = Number(panel.motionStartY ?? 0);
  const endX = Number(panel.motionEndX ?? 150);
  const endY = Number(panel.motionEndY ?? 0);
  return [{ x: startX, y: startY }, { x: endX, y: endY }];
}

/**
 * Evaluates motion translation offset (dx, dy) and heading angle along multi-node path from 0% to 100%.
 */
export function evaluateMotionDynamics(
  panel: Panel,
  latestValues: Record<string, any>
): { dx: number; dy: number; progressPct: number; pathAngle: number; isEnabled: boolean } {
  if (!panel.enableMotionDynamics) {
    return { dx: 0, dy: 0, progressPct: 0, pathAngle: 0, isEnabled: false };
  }

  const rawVal = getMotionTagValue(panel, latestValues);
  const numVal = typeof rawVal === 'number' && !isNaN(rawVal) 
    ? rawVal 
    : (rawVal !== undefined && rawVal !== null ? parseFloat(String(rawVal)) : NaN);

  const tagMin = Number(panel.motionTagMin ?? 0);
  const tagMax = Number(panel.motionTagMax ?? 100);
  const tagRange = tagMax - tagMin || 1;

  // Clamp normalized progress between 0 and 1
  let progress = 0;
  if (!isNaN(numVal)) {
    progress = Math.max(0, Math.min(1, (numVal - tagMin) / tagRange));
  }

  const points = getEffectiveMotionPathPoints(panel);
  if (points.length < 2) {
    const pt = points[0] || { x: 0, y: 0 };
    return { dx: pt.x, dy: pt.y, progressPct: Math.round(progress * 100), pathAngle: 0, isEnabled: true };
  }

  // 1. Calculate length of each segment and total polyline path length
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    segmentLengths.push(dist);
    totalLength += dist;
  }

  if (totalLength === 0) {
    return {
      dx: points[0].x,
      dy: points[0].y,
      progressPct: Math.round(progress * 100),
      pathAngle: 0,
      isEnabled: true
    };
  }

  // 2. Interpolate along the multi-node segments based on target distance
  const targetDist = progress * totalLength;
  let accumulatedDist = 0;
  let curSegmentIdx = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulatedDist + segLen >= targetDist || i === segmentLengths.length - 1) {
      curSegmentIdx = i;
      break;
    }
    accumulatedDist += segLen;
  }

  const pStart = points[curSegmentIdx];
  const pEnd = points[curSegmentIdx + 1] || points[curSegmentIdx];
  const curSegLen = segmentLengths[curSegmentIdx] || 1;
  const segProgress = Math.max(0, Math.min(1, (targetDist - accumulatedDist) / curSegLen));

  const dx = pStart.x + segProgress * (pEnd.x - pStart.x);
  const dy = pStart.y + segProgress * (pEnd.y - pStart.y);

  // Tangent / Heading angle of the active path segment (degrees)
  const segmentAngleRad = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
  const pathAngle = (segmentAngleRad * 180) / Math.PI;

  return {
    dx: Math.round(dx * 10) / 10,
    dy: Math.round(dy * 10) / 10,
    progressPct: Math.round(progress * 100),
    pathAngle: Math.round(pathAngle * 10) / 10,
    isEnabled: true
  };
}

/**
 * Evaluates rotation dynamics: either continuous spinning or variable angle deflection.
 */
export function evaluateRotationDynamics(
  panel: Panel,
  latestValues: Record<string, any>
): {
  isEnabled: boolean;
  mode: 'continuous' | 'variable';
  isSpinning: boolean;
  spinDuration: number;
  spinDirection: 'cw' | 'ccw';
  variableAngle: number;
} {
  if (!panel.enableRotationDynamics) {
    return {
      isEnabled: false,
      mode: 'continuous',
      isSpinning: false,
      spinDuration: 2,
      spinDirection: 'cw',
      variableAngle: 0
    };
  }

  const mode = panel.rotationMode || 'continuous';
  const rawVal = getRotationTagValue(panel, latestValues);
  const rawStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
  const numVal = typeof rawVal === 'number' && !isNaN(rawVal)
    ? rawVal
    : (rawVal !== undefined && rawVal !== null ? parseFloat(rawStr) : NaN);

  // 1. Continuous Rotation Mode
  if (mode === 'continuous') {
    const direction = panel.rotationDirection || 'cw';
    let duration = 2; // Default medium (2s per cycle)
    if (panel.rotationSpeed === 'slow') duration = 5;
    else if (panel.rotationSpeed === 'fast') duration = 0.6;
    else if (panel.rotationSpeed === 'custom' && panel.rotationDurationSeconds) {
      duration = Math.max(0.1, Number(panel.rotationDurationSeconds));
    }

    let isSpinning = false;
    const triggerType = panel.rotationTriggerType || (isNaN(numVal) || rawStr === '0' || rawStr === '1' || rawStr === 'true' || rawStr === 'false' ? 'digital' : 'analog_compare');

    if (triggerType === 'digital') {
      // Digital Evaluation: Tag === 1 or '1' or true or 'RUN' or payloadOn
      const onVal = String(panel.payloadOn ?? '1').toLowerCase();
      const strLower = rawStr.toLowerCase();
      isSpinning = strLower === onVal || strLower === '1' || strLower === 'true' || strLower === 'run' || rawVal === 1 || rawVal === true;
    } else {
      // Analog Comparator Evaluation: =, !=, >, >=, <, <= against trigger value
      const targetStr = String(panel.rotationTriggerValue !== undefined ? panel.rotationTriggerValue : '0').trim();
      const targetNum = parseFloat(targetStr);
      const op = panel.rotationOperator || '>';

      if (!isNaN(numVal) && !isNaN(targetNum)) {
        switch (op) {
          case '=': isSpinning = numVal === targetNum; break;
          case '!=': isSpinning = numVal !== targetNum; break;
          case '>': isSpinning = numVal > targetNum; break;
          case '>=': isSpinning = numVal >= targetNum; break;
          case '<': isSpinning = numVal < targetNum; break;
          case '<=': isSpinning = numVal <= targetNum; break;
          default: isSpinning = numVal > targetNum; break;
        }
      } else {
        if (op === '!=') isSpinning = rawStr !== targetStr;
        else isSpinning = rawStr === targetStr;
      }
    }

    return {
      isEnabled: true,
      mode: 'continuous',
      isSpinning,
      spinDuration: duration,
      spinDirection: direction,
      variableAngle: 0
    };
  }

  // 2. Variable / Proportional Angle Rotation Mode (0-100 -> 0-360 deg)
  const tagMin = Number(panel.rotationTagMin ?? 0);
  const tagMax = Number(panel.rotationTagMax ?? 100);
  const tagRange = tagMax - tagMin || 1;

  let progress = 0;
  if (!isNaN(numVal)) {
    progress = Math.max(0, Math.min(1, (numVal - tagMin) / tagRange));
  }

  const angleMin = Number(panel.rotationAngleMin ?? 0);
  const angleMax = Number(panel.rotationAngleMax ?? 360);
  const variableAngle = angleMin + progress * (angleMax - angleMin);

  return {
    isEnabled: true,
    mode: 'variable',
    isSpinning: false,
    spinDuration: 2,
    spinDirection: 'cw',
    variableAngle: Math.round(variableAngle * 10) / 10
  };
}

/**
 * Builds the combined CSS transform and animation style for an element.
 */
export function getDynamicElementTransform(
  panel: Panel,
  latestValues: Record<string, any>,
  isDesignMode: boolean = false
): {
  transform: string;
  animation?: string;
  dx: number;
  dy: number;
  totalAngle: number;
  isSpinning: boolean;
  isMoving: boolean;
} {
  const baseRotation = Number(panel.rotation ?? 0);

  // In Design Mode, we don't apply runtime telemetry displacement to avoid shifting the edit box
  if (isDesignMode) {
    return {
      transform: baseRotation ? `rotate(${baseRotation}deg)` : '',
      dx: 0,
      dy: 0,
      totalAngle: baseRotation,
      isSpinning: false,
      isMoving: false
    };
  }

  const motion = evaluateMotionDynamics(panel, latestValues);
  const rotation = evaluateRotationDynamics(panel, latestValues);

  const transforms: string[] = [];
  if (motion.isEnabled && (motion.dx !== 0 || motion.dy !== 0)) {
    transforms.push(`translate3d(${motion.dx}px, ${motion.dy}px, 0px)`);
  }

  let totalAngle = baseRotation;
  if (motion.isEnabled && panel.motionOrientToPath) {
    totalAngle += motion.pathAngle;
  }
  if (rotation.isEnabled && rotation.mode === 'variable') {
    totalAngle += rotation.variableAngle;
  }

  if (totalAngle !== 0) {
    transforms.push(`rotate(${totalAngle}deg)`);
  }

  let animation: string | undefined = undefined;
  if (rotation.isEnabled && rotation.mode === 'continuous' && rotation.isSpinning) {
    const animName = rotation.spinDirection === 'ccw' ? 'hmi-spin-ccw' : 'hmi-spin-cw';
    animation = `${animName} ${rotation.spinDuration}s linear infinite`;
  }

  return {
    transform: transforms.join(' '),
    animation,
    dx: motion.dx,
    dy: motion.dy,
    totalAngle,
    isSpinning: rotation.isEnabled && rotation.mode === 'continuous' && rotation.isSpinning,
    isMoving: motion.isEnabled && (motion.dx !== 0 || motion.dy !== 0)
  };
}
