import * as THREE from 'three';
import { ObjectTransformData } from '../types/transform';
import { Scada3dObject } from '../types/scene';
import { PrimitiveFactory } from './PrimitiveFactory';
import { MaterialManager } from '../core/MaterialManager';

export class Object3DManager {
  private scene: THREE.Scene;
  private materialManager: MaterialManager;
  private primitiveFactory: PrimitiveFactory;

  private objectsMap: Map<string, { data: Scada3dObject; threeObject: THREE.Object3D }> = new Map();
  private sceneEquipmentGroup: THREE.Group;

  constructor(scene: THREE.Scene, materialManager: MaterialManager) {
    this.scene = scene;
    this.materialManager = materialManager;
    this.primitiveFactory = new PrimitiveFactory(this.materialManager);

    this.sceneEquipmentGroup = new THREE.Group();
    this.sceneEquipmentGroup.name = '__SCADA_3D_EQUIPMENT_ROOT__';
    this.scene.add(this.sceneEquipmentGroup);
  }

  private static customMeshRegistry: Map<string, THREE.Object3D> = new Map();

  public static registerCustomModel(assetId: string, model: THREE.Object3D): void {
    this.customMeshRegistry.set(assetId, model);
  }

  /**
   * Spawns a new 3D equipment object in the scene.
   */
  public addObject(data: Partial<Scada3dObject>, customThreeObject?: THREE.Object3D): THREE.Object3D {
    const id = data.id || `EQUIP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const name = data.name || id;
    const assetId = data.assetId || 'pumps.centrifugal.end_suction';
    const assetType = data.assetType || 'parametric';

    // 1. Create Three.js 3D Mesh Representation
    let threeObj: THREE.Object3D;
    if (customThreeObject) {
      threeObj = customThreeObject;
      Object3DManager.registerCustomModel(assetId, customThreeObject.clone(true));
    } else if (Object3DManager.customMeshRegistry.has(assetId)) {
      threeObj = Object3DManager.customMeshRegistry.get(assetId)!.clone(true);
    } else if (assetType === 'parametric') {
      threeObj = this.primitiveFactory.createPrimitive(assetId);
    } else {
      threeObj = this.primitiveFactory.createPrimitive(assetId);
    }

    threeObj.name = id;
    threeObj.userData = {
      ...threeObj.userData,
      scadaObjectId: id,
      isEquipmentRoot: true,
      assetId
    };

    // 2. Set default or provided transform
    const pos = data.transform?.position || { x: 0, y: 0, z: 0 };
    const rot = data.transform?.rotation || { x: 0, y: 0, z: 0 };
    const scl = data.transform?.scale || { x: 1, y: 1, z: 1 };

    threeObj.position.set(pos.x, pos.y, pos.z);
    threeObj.rotation.set(
      THREE.MathUtils.degToRad(rot.x),
      THREE.MathUtils.degToRad(rot.y),
      THREE.MathUtils.degToRad(rot.z)
    );
    threeObj.scale.set(scl.x, scl.y, scl.z);

    // 3. Assemble full metadata
    const fullData: Scada3dObject = {
      id,
      name,
      assetId,
      assetType,
      assetUri: data.assetUri,
      symbolId: data.symbolId,
      parentId: data.parentId || null,
      childrenIds: data.childrenIds || [],
      isGroup: data.isGroup || false,
      locked: data.locked || false,
      visible: data.visible !== false,
      transform: {
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: rot.x, y: rot.y, z: rot.z },
        scale: { x: scl.x, y: scl.y, z: scl.z }
      },
      materialPreset: data.materialPreset || 'painted_steel_blue',
      customColor: data.customColor,
      bindings: data.bindings || [],
      linkedDashboardId: data.linkedDashboardId,
      equipmentDescription: data.equipmentDescription
    };

    this.sceneEquipmentGroup.add(threeObj);
    threeObj.updateMatrixWorld(true);
    this.objectsMap.set(id, { data: fullData, threeObject: threeObj });

    return threeObj;
  }

  /**
   * Removes an object from the scene by ID.
   */
  public removeObject(id: string): void {
    const entry = this.objectsMap.get(id);
    if (!entry) return;

    this.sceneEquipmentGroup.remove(entry.threeObject);

    // Dispose geometries (mesh-specific), do NOT dispose shared cached materials
    entry.threeObject.traverse(child => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
      }
    });

    this.objectsMap.delete(id);
  }

  /**
   * Updates an object's spatial transformation from gizmo or numeric properties.
   */
  public updateTransform(id: string, transform: ObjectTransformData): void {
    const entry = this.objectsMap.get(id);
    if (!entry) return;

    entry.data.transform = transform;
    entry.threeObject.position.set(transform.position.x, transform.position.y, transform.position.z);
    entry.threeObject.rotation.set(
      THREE.MathUtils.degToRad(transform.rotation.x),
      THREE.MathUtils.degToRad(transform.rotation.y),
      THREE.MathUtils.degToRad(transform.rotation.z)
    );
    entry.threeObject.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
  }

  /**
   * Updates object metadata (name, bindings, color, linked screen).
   */
  public updateObjectData(id: string, updates: Partial<Scada3dObject>): void {
    const entry = this.objectsMap.get(id);
    if (!entry) return;

    entry.data = { ...entry.data, ...updates };

    if (updates.visible !== undefined) {
      entry.threeObject.visible = updates.visible;
    }

    if (updates.transform) {
      this.updateTransform(id, updates.transform);
    }
  }

  public getObject(id: string): THREE.Object3D | undefined {
    return this.objectsMap.get(id)?.threeObject;
  }

  public getObjectData(id: string): Scada3dObject | undefined {
    return this.objectsMap.get(id)?.data;
  }

  public getAllObjectsData(): Scada3dObject[] {
    return Array.from(this.objectsMap.values()).map(v => v.data);
  }

  public getThreeObjectByScadaId(id: string): THREE.Object3D | undefined {
    return this.objectsMap.get(id)?.threeObject;
  }

  public getScadaIdFromThreeObject(threeObj: THREE.Object3D): string | null {
    let curr: THREE.Object3D | null = threeObj;
    while (curr) {
      if (curr.userData && curr.userData.scadaObjectId) {
        return curr.userData.scadaObjectId;
      }
      if (curr === this.sceneEquipmentGroup || curr === this.scene) break;
      curr = curr.parent;
    }
    return null;
  }

  /**
   * Clears all objects.
   */
  public clear(): void {
    const ids = Array.from(this.objectsMap.keys());
    ids.forEach(id => this.removeObject(id));
  }

  /**
   * Restores complete scene from serialized data array.
   */
  public syncFromSceneData(objects: Scada3dObject[]): void {
    this.clear();
    if (!objects || !Array.isArray(objects)) return;
    objects.forEach(obj => this.addObject(obj));
  }

  public dispose(): void {
    this.clear();
    this.scene.remove(this.sceneEquipmentGroup);
  }
}
