import { Panel } from '../types';

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
