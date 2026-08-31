/**
 * TASC IIoT Studio — Multi-Source Smart Object & Faceplate Tag Resolver
 *
 * Resolves parameterized relative child tag bindings against 3 root source types:
 *  1. Driver Tags (Prefix Matching: "Motor_01_" + "Start" -> "Motor_01_Start")
 *  2. Asset Hierarchy (Path Concat: "Plant/Pumps/Pump_01" + "Start" -> "Plant/Pumps/Pump_01/Start")
 *  3. MQTT Topics (Topic Concat: "factory/line1/motor1" + "cmd/start" -> "factory/line1/motor1/cmd/start")
 */

import { Panel, DriverTag } from '../types';

export type SmartRootSourceType = 'asset' | 'driver_tag' | 'mqtt';

/**
 * Normalizes and resolves a relative child tag against a root path/prefix.
 */
export function resolveRelativeSmartTag(
  sourceType: SmartRootSourceType,
  rootPath: string,
  relativeTag: string
): string {
  const root = (rootPath || '').trim();
  const rel = (relativeTag || '').trim();

  if (!root) return rel;
  if (!rel) return root;

  if (sourceType === 'driver_tag') {
    // Both have underscore: "Motor_01_" + "_Start" -> "Motor_01_Start"
    if (root.endsWith('_') && rel.startsWith('_')) {
      return root + rel.substring(1);
    }
    // Neither has underscore: "Motor_01" + "Start" -> "Motor_01_Start"
    if (!root.endsWith('_') && !rel.startsWith('_')) {
      return `${root}_${rel}`;
    }
    // Exactly one has underscore: "Motor_01_" + "Start" -> "Motor_01_Start"
    return root + rel;
  }

  if (sourceType === 'mqtt') {
    const cleanRoot = root.replace(/\/+$/, '');
    const cleanRel = rel.replace(/^\/+/, '');
    return `${cleanRoot}/${cleanRel}`;
  }

  // Asset Hierarchy mode (defaults to standard '/' delimiter)
  const cleanRoot = root.replace(/\/+$/, '');
  const cleanRel = rel.replace(/^\/+/, '');
  return `${cleanRoot}/${cleanRel}`;
}

/**
 * Updates all child panels of a smart object with newly resolved tag bindings.
 */
export function applySmartObjectRootPath(
  panels: Panel[],
  smartObjectId: string,
  rootSourceType: SmartRootSourceType,
  newRootPath: string,
  availableDriverTags?: DriverTag[]
): Panel[] {
  return panels.map(p => {
    if (p.smartObjectId !== smartObjectId) return p;

    const relative = p.relativeTagBinding || '';
    const resolvedPath = resolveRelativeSmartTag(rootSourceType, newRootPath, relative);

    let updatedDriverTagId = p.driverTagId;
    let updatedDriverWriteTagId = p.driverWriteTagId;

    if (rootSourceType === 'driver_tag' && availableDriverTags && availableDriverTags.length > 0) {
      // Find driver tag matching resolved name or address
      const matched = availableDriverTags.find(
        dt => dt.tagName.toLowerCase() === resolvedPath.toLowerCase() || dt.tagId.toLowerCase() === resolvedPath.toLowerCase()
      );
      if (matched) {
        updatedDriverTagId = matched.tagId;
        if (matched.accessType === 'read-write') {
          updatedDriverWriteTagId = matched.tagId;
        }
      }
    }

    return {
      ...p,
      rootTagSource: rootSourceType,
      rootTagPath: newRootPath,
      topic: rootSourceType === 'mqtt' ? resolvedPath : p.topic,
      dataSourceMode: rootSourceType === 'driver_tag' ? 'driver' : 'mqtt',
      driverTagId: updatedDriverTagId,
      driverWriteTagId: updatedDriverWriteTagId
    };
  });
}
