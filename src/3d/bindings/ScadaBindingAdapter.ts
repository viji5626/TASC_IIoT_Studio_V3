import * as THREE from 'three';
import { Scada3dBinding, Scada3dThresholdRule } from '../types/bindings';
import { Scada3dObject } from '../types/scene';
import { getJsonValue } from '../../utils/mqttHelper';

interface InitialTransform {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  origMaterials?: Map<THREE.Mesh, { color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number }>;
}

export class ScadaBindingAdapter {
  private latestValuesRef: { current: Record<string, { val: any; time?: string }> } = { current: {} };
  private initialTransformMap: Map<string, InitialTransform> = new Map();
  private rotationAccumulatorMap: Map<string, number> = new Map();
  private totalElapsedTime: number = 0;

  /**
   * Updates the mutable telemetry reference.
   */
  public setLatestValuesRef(ref: { current: Record<string, { val: any; time?: string }> }): void {
    this.latestValuesRef = ref;
  }

  /**
   * Resolves raw telemetry value for a given binding rule.
   */
  public resolveBindingValue(binding: Scada3dBinding): any {
    const values = this.latestValuesRef.current || {};

    if (binding.dataSourceMode === 'driver' && binding.driverTagId) {
      const entry = values[binding.driverTagId];
      return entry !== undefined ? entry.val : undefined;
    }

    if (binding.dataSourceMode === 'mqtt' && binding.topic) {
      const entry = values[binding.topic];
      if (!entry) return undefined;
      const raw = entry.val;

      if (binding.jsonPath && typeof raw === 'object' && raw !== null) {
        return getJsonValue(raw, binding.jsonPath);
      }
      return raw;
    }

    return undefined;
  }

  /**
   * Resolves secondary speed value for combined mode.
   */
  public resolveSecondarySpeedValue(binding: Scada3dBinding): any {
    const values = this.latestValuesRef.current || {};

    if (binding.speedDataSourceMode === 'driver' && binding.speedDriverTagId) {
      const entry = values[binding.speedDriverTagId];
      return entry !== undefined ? entry.val : undefined;
    }

    if (binding.speedTopic) {
      const entry = values[binding.speedTopic];
      if (!entry) return undefined;
      const raw = entry.val;

      if (binding.speedJsonPath && typeof raw === 'object' && raw !== null) {
        return getJsonValue(raw, binding.speedJsonPath);
      }
      return raw;
    }

    return undefined;
  }

  /**
   * Normalizes raw SCADA signal into a standardized digital boolean and analog number.
   */
  public static normalizeSignal(rawVal: any, activeVal?: any): { isTruthy: boolean; numVal: number; isNum: boolean } {
    if (rawVal === undefined || rawVal === null) {
      return { isTruthy: false, numVal: 0, isNum: false };
    }

    // Custom active value match
    if (activeVal !== undefined && activeVal !== '') {
      const isMatch = String(rawVal).trim().toLowerCase() === String(activeVal).trim().toLowerCase();
      const n = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
      return { isTruthy: isMatch, numVal: isNaN(n) ? 0 : n, isNum: !isNaN(n) };
    }

    // Standard truthy SCADA indicators
    const str = String(rawVal).trim().toLowerCase();
    const truthySet = new Set(['true', '1', 'on', 'run', 'running', 'start', 'started', 'active', 'auto', 'open', 'opened', 'enable', 'enabled']);
    const isTruthy = rawVal === true || rawVal === 1 || truthySet.has(str);

    const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
    const isNum = !isNaN(numVal);

    return { isTruthy, numVal: isNum ? numVal : 0, isNum };
  }

  /**
   * Clears cached transform baselines on scene reset.
   */
  public resetTransforms(): void {
    this.initialTransformMap.clear();
    this.rotationAccumulatorMap.clear();
    this.totalElapsedTime = 0;
  }

  /**
   * High-performance per-frame evaluation called directly inside the WebGL render loop.
   */
  public tick(
    objectsData: Scada3dObject[],
    getThreeObject: (id: string) => THREE.Object3D | undefined,
    delta: number
  ): void {
    if (!objectsData || objectsData.length === 0) return;
    this.totalElapsedTime += delta;

    for (let i = 0; i < objectsData.length; i++) {
      const objData = objectsData[i];
      if (!objData.bindings || objData.bindings.length === 0) continue;

      const threeObj = getThreeObject(objData.id);
      if (!threeObj) continue;

      for (let b = 0; b < objData.bindings.length; b++) {
        const binding = objData.bindings[b];
        const val = this.resolveBindingValue(binding);
        if (val === undefined) continue;

        this.applyBindingToThreeObject(objData.id, threeObj, binding, val, delta);
      }
    }
  }

  /**
   * Applies dynamic rules and motions to target Three.js objects or subparts.
   */
  public applyBindingToThreeObject(
    equipmentId: string,
    threeObj: THREE.Object3D,
    binding: Scada3dBinding,
    rawVal: any,
    delta: number
  ): void {
    // 1. Resolve Target Node(s)
    const targetMeshes: { mesh: THREE.Object3D; axisOverride?: 'x' | 'y' | 'z' }[] = [];
    const targetSubPart = binding.subPartId || (binding.property !== 'running' && binding.property !== 'speed' ? binding.property : undefined);

    if (binding.targetNodeName) {
      const found = threeObj.getObjectByName(binding.targetNodeName);
      if (found) targetMeshes.push({ mesh: found, axisOverride: found.userData?.defaultAxis });
    } else if (targetSubPart) {
      threeObj.traverse(child => {
        if (
          child.userData &&
          (child.userData.subPartId === targetSubPart ||
            (targetSubPart === 'fans' && (child.userData.subPartId === 'fan_1' || child.userData.subPartId === 'fan_2' || child.userData.isRotatingFan || child.userData.subPartId === 'impeller')) ||
            (targetSubPart === 'impeller' && child.userData.isRotatingSubpart))
        ) {
          targetMeshes.push({ mesh: child, axisOverride: child.userData?.defaultAxis });
        }
      });
    }

    // Fallback: If continuous_spin/running/speed or position on equipment root with no subpart chosen, auto-target internal moving subparts!
    if (targetMeshes.length === 0) {
      if (binding.property === 'continuous_spin' || binding.property === 'running' || binding.property === 'speed') {
        threeObj.traverse(child => {
          if (
            child.userData &&
            (child.userData.isRotatingSubpart ||
              child.userData.subPartId === 'cooling_fan' ||
              child.userData.subPartId === 'impeller' ||
              child.userData.subPartId === 'shaft' ||
              child.userData.subPartId === 'rotor' ||
              child.userData.subPartId === 'turbine_rotor' ||
              child.name === 'Motor_Fan' ||
              child.name === 'Impeller_Rotor' ||
              child.name === 'Shaft_Coupling' ||
              child.name === 'MultiStage_Rotor')
          ) {
            targetMeshes.push({ mesh: child, axisOverride: child.userData?.defaultAxis || 'x' });
          }
        });
      } else if (binding.property === 'position' || binding.property === 'angular_position' || binding.property === 'rotation_angle') {
        threeObj.traverse(child => {
          if (
            child.userData &&
            (child.userData.subPartId === 'valve_disc' ||
              child.userData.subPartId === 'valve_stem' ||
              child.userData.subPartId === 'damper_blade' ||
              child.name === 'Valve_Disc' ||
              child.name === 'Valve_Stem')
          ) {
            targetMeshes.push({ mesh: child, axisOverride: child.userData?.defaultAxis || 'y' });
          }
        });
      }
      if (targetMeshes.length === 0) {
        targetMeshes.push({ mesh: threeObj });
      }
    }

    const { isTruthy, numVal, isNum } = ScadaBindingAdapter.normalizeSignal(rawVal, binding.digitalActiveValue);
    const prop = binding.property;
    const directionSign = (binding.direction || binding.spinDirection) === 'ccw' ? -1 : 1;

    for (let t = 0; t < targetMeshes.length; t++) {
      const { mesh: targetMesh, axisOverride } = targetMeshes[t];

      // 2. Cache Initial Transform Baseline if not yet stored
      const transformKey = `${equipmentId}::${targetMesh.uuid}`;
      if (!this.initialTransformMap.has(transformKey)) {
        const origMats = new Map<THREE.Mesh, { color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number }>();
        targetMesh.traverse(child => {
          if (child instanceof THREE.Mesh && child.material && (child.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            const mat = child.material as THREE.MeshStandardMaterial;
            origMats.set(child, {
              color: mat.color.clone(),
              emissive: mat.emissive.clone(),
              emissiveIntensity: mat.emissiveIntensity || 0
            });
          }
        });

        this.initialTransformMap.set(transformKey, {
          position: targetMesh.position.clone(),
          rotation: targetMesh.rotation.clone(),
          scale: targetMesh.scale.clone(),
          origMaterials: origMats
        });
      }

      const baseline = this.initialTransformMap.get(transformKey)!;

      // 3. Resolve Axis & Direction
      const axis: 'x' | 'y' | 'z' = axisOverride || binding.axis || binding.spinAxis || binding.rotationAxis || binding.travelAxis || 'x';

      // 4. Apply Dynamics by Property Type
      switch (prop) {
        // -----------------------------------------------------------------------
        // 4A. CONTINUOUS 3D SPIN (Motors, Rotors, Impellers, Fans, Blowers)
        // -----------------------------------------------------------------------
        case 'continuous_spin':
        case 'running':
        case 'speed': {
          let rpm = 0;
          const signalMode = binding.signalMode || (prop === 'speed' ? 'analog' : 'digital');

          if (signalMode === 'digital') {
            // Digital 2-State
            if (isTruthy) {
              rpm = binding.activeSpeedRpm || binding.baseSpeedRpm || 1500;
            } else {
              rpm = binding.inactiveSpeedRpm || 0;
            }
          } else if (signalMode === 'analog') {
            // Analog Proportional
            const minRaw = binding.minRaw !== undefined ? binding.minRaw : 0;
            const maxRaw = binding.maxRaw !== undefined ? binding.maxRaw : 3000;
            const minTgt = binding.minTarget !== undefined ? binding.minTarget : 0;
            const maxTgt = binding.maxTarget !== undefined ? binding.maxTarget : 3000;

            const span = Math.max(maxRaw - minRaw, 0.0001);
            let ratio = (numVal - minRaw) / span;
            if (binding.clamp !== false) ratio = Math.max(0, Math.min(1, ratio));

            rpm = minTgt + ratio * (maxTgt - minTgt);
          } else if (signalMode === 'combined') {
            // Combined: Digital Permissive + Secondary Analog Speed
            if (isTruthy) {
              const secRaw = this.resolveSecondarySpeedValue(binding);
              const secNorm = ScadaBindingAdapter.normalizeSignal(secRaw);
              const minRaw = binding.minRaw !== undefined ? binding.minRaw : 0;
              const maxRaw = binding.maxRaw !== undefined ? binding.maxRaw : 3000;
              const minTgt = binding.minTarget !== undefined ? binding.minTarget : 0;
              const maxTgt = binding.maxTarget !== undefined ? binding.maxTarget : 3000;

              const span = Math.max(maxRaw - minRaw, 0.0001);
              let ratio = (secNorm.numVal - minRaw) / span;
              if (binding.clamp !== false) ratio = Math.max(0, Math.min(1, ratio));

              rpm = minTgt + ratio * (maxTgt - minTgt);
            } else {
              rpm = 0;
            }
          }

          if (rpm !== 0) {
            const radPerSec = (rpm * 2 * Math.PI) / 60;
            const angleDelta = radPerSec * delta * directionSign;

            // Accumulate rotation angle cleanly
            const curAcc = (this.rotationAccumulatorMap.get(transformKey) || 0) + angleDelta;
            this.rotationAccumulatorMap.set(transformKey, curAcc);

            if (axis === 'x') targetMesh.rotation.x = baseline.rotation.x + curAcc;
            else if (axis === 'y') targetMesh.rotation.y = baseline.rotation.y + curAcc;
            else targetMesh.rotation.z = baseline.rotation.z + curAcc;
          }
          break;
        }

      // -----------------------------------------------------------------------
      // 4B. 3D ANGULAR POSITION (Valves, Flaps, Dampers, Needles)
      // -----------------------------------------------------------------------
      case 'angular_position':
      case 'position':
      case 'rotation_angle': {
        const signalMode = binding.signalMode || (isNum ? 'analog' : 'digital');
        let angleDeg = 0;

        if (signalMode === 'digital') {
          angleDeg = isTruthy
            ? (binding.activeAngleDeg !== undefined ? binding.activeAngleDeg : 90)
            : (binding.inactiveAngleDeg !== undefined ? binding.inactiveAngleDeg : 0);
        } else {
          const minRaw = binding.minRaw !== undefined ? binding.minRaw : 0;
          const maxRaw = binding.maxRaw !== undefined ? binding.maxRaw : 100;
          const minDeg = binding.rotationMinDeg !== undefined ? binding.rotationMinDeg : (binding.minTarget !== undefined ? binding.minTarget : 0);
          const maxDeg = binding.rotationMaxDeg !== undefined ? binding.rotationMaxDeg : (binding.maxTarget !== undefined ? binding.maxTarget : 90);

          const span = Math.max(maxRaw - minRaw, 0.0001);
          let ratio = (numVal - minRaw) / span;
          if (binding.clamp !== false) ratio = Math.max(0, Math.min(1, ratio));

          angleDeg = minDeg + ratio * (maxDeg - minDeg);
        }

        const rad = THREE.MathUtils.degToRad(angleDeg * directionSign);

        if (axis === 'x') targetMesh.rotation.x = baseline.rotation.x + rad;
        else if (axis === 'y') targetMesh.rotation.y = baseline.rotation.y + rad;
        else targetMesh.rotation.z = baseline.rotation.z + rad;
        break;
      }

      // -----------------------------------------------------------------------
      // 4C. 3D LINEAR TRAVEL (Valve Stems, Cylinders, Pistons, Actuators, Hoists)
      // -----------------------------------------------------------------------
      case 'linear_travel': {
        const signalMode = binding.signalMode || (isNum ? 'analog' : 'digital');
        let offsetM = 0;

        if (signalMode === 'digital') {
          offsetM = isTruthy
            ? (binding.activeOffsetMeters !== undefined ? binding.activeOffsetMeters : 0.15)
            : (binding.inactiveOffsetMeters !== undefined ? binding.inactiveOffsetMeters : 0);
        } else {
          const minRaw = binding.minRaw !== undefined ? binding.minRaw : 0;
          const maxRaw = binding.maxRaw !== undefined ? binding.maxRaw : 100;
          const minM = binding.travelMinMeters !== undefined ? binding.travelMinMeters : (binding.minTarget !== undefined ? binding.minTarget : 0);
          const maxM = binding.travelMaxMeters !== undefined ? binding.travelMaxMeters : (binding.maxTarget !== undefined ? binding.maxTarget : 0.5);

          const span = Math.max(maxRaw - minRaw, 0.0001);
          let ratio = (numVal - minRaw) / span;
          if (binding.clamp !== false) ratio = Math.max(0, Math.min(1, ratio));

          offsetM = minM + ratio * (maxM - minM);
        }

        const signedOffset = offsetM * directionSign;

        if (axis === 'x') targetMesh.position.x = baseline.position.x + signedOffset;
        else if (axis === 'y') targetMesh.position.y = baseline.position.y + signedOffset;
        else targetMesh.position.z = baseline.position.z + signedOffset;
        break;
      }

      // -----------------------------------------------------------------------
      // 4D. 3D FLUID / LIQUID LEVEL FILL (Tanks, Vessels, Silos)
      // -----------------------------------------------------------------------
      case 'fluid_level':
      case 'level': {
        if (isNum) {
          const min = binding.minRaw !== undefined ? binding.minRaw : 0;
          const max = binding.maxRaw !== undefined ? binding.maxRaw : 100;
          const span = Math.max(max - min, 0.0001);
          const pct = Math.max(0.01, Math.min(1, (numVal - min) / span));

          const fluidMesh = targetMesh.name === 'Fluid_Level' ? targetMesh : threeObj.getObjectByName('Fluid_Level');
          if (fluidMesh) {
            fluidMesh.scale.y = pct;
            const initialHeight = fluidMesh.userData.initialHeight || 3.2;
            fluidMesh.position.y = (initialHeight * pct) / 2 + 0.4;
          }
        }
        break;
      }

      // -----------------------------------------------------------------------
      // 4E. 3D VISIBILITY (Show / Hide on Condition)
      // -----------------------------------------------------------------------
      case 'visibility': {
        targetMesh.visible = isTruthy;
        break;
      }

      // -----------------------------------------------------------------------
      // 4F. PBR COLOR SHIFT & EMISSIVE GLOW ALARMS
      // -----------------------------------------------------------------------
      case 'color':
      case 'color_shift':
      case 'emissive':
      case 'emissive_glow': {
        if (binding.thresholds && binding.thresholds.length > 0) {
          let activeRule: Scada3dThresholdRule | null = null;

          for (const rule of binding.thresholds) {
            const ruleVal = typeof rule.value === 'number' ? rule.value : parseFloat(String(rule.value));
            let match = false;

            if (isNum && !isNaN(ruleVal)) {
              if (rule.condition === '>') match = numVal > ruleVal;
              else if (rule.condition === '>=') match = numVal >= ruleVal;
              else if (rule.condition === '<') match = numVal < ruleVal;
              else if (rule.condition === '<=') match = numVal <= ruleVal;
              else if (rule.condition === '=') match = numVal === ruleVal;
              else if (rule.condition === '!=') match = numVal !== ruleVal;
            } else {
              match = String(rawVal).trim().toLowerCase() === String(rule.value).trim().toLowerCase();
            }

            if (match) {
              activeRule = rule;
              break;
            }
          }

          targetMesh.traverse(child => {
            if (child instanceof THREE.Mesh && child.material && (child.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              const mat = child.material as THREE.MeshStandardMaterial;

              // Ensure isolated material clone
              if (!child.userData.isDynamicMaterial) {
                child.material = mat.clone();
                child.userData.isDynamicMaterial = true;
              }

              const dynamicMat = child.material as THREE.MeshStandardMaterial;
              const orig = baseline.origMaterials?.get(child);

              if (activeRule) {
                if (activeRule.color) dynamicMat.color.set(activeRule.color);
                if (activeRule.emissive) dynamicMat.emissive.set(activeRule.emissive);

                let intensity = activeRule.emissiveIntensity !== undefined ? activeRule.emissiveIntensity : 0.8;
                if (activeRule.pulse) {
                  const pulseFactor = Math.sin(this.totalElapsedTime * 6) * 0.5 + 0.5;
                  intensity = intensity * pulseFactor;
                }
                dynamicMat.emissiveIntensity = intensity;
              } else if (orig) {
                // Reset to normal baseline color
                dynamicMat.color.copy(orig.color);
                dynamicMat.emissive.copy(orig.emissive);
                dynamicMat.emissiveIntensity = orig.emissiveIntensity;
              }
            }
          });
        }
        break;
      }
    }
  }
}
}
