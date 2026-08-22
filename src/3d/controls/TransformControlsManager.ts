import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { CoordinateSpace, ObjectTransformData, TransformMode, TransformSnapConfig } from '../types/transform';

export class TransformControlsManager {
  public controls: TransformControls;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private scene: THREE.Scene;
  private attachedObject: THREE.Object3D | null = null;
  private onDraggingChangeCallbacks: Set<(isDragging: boolean) => void> = new Set();
  private onTransformChangeCallbacks: Set<(transform: ObjectTransformData) => void> = new Set();

  private mode: TransformMode = 'translate';
  private space: CoordinateSpace = 'world';
  private snapConfig: TransformSnapConfig = {
    enabled: false,
    translation: 0.5,
    rotationDeg: 15,
    scale: 0.1
  };

  constructor(camera: THREE.Camera, domElement: HTMLElement, scene: THREE.Scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    this.controls = new TransformControls(this.camera, this.domElement);
    this.controls.size = 0.85;

    // Must add the transform controls gizmo object to scene
    const gizmo = this.controls.getHelper();
    gizmo.name = '__SCADA_3D_TRANSFORM_GIZMO__';
    this.scene.add(gizmo);

    // Event listeners
    this.controls.addEventListener('dragging-changed', (event: any) => {
      const isDragging = !!event.value;
      this.onDraggingChangeCallbacks.forEach(cb => cb(isDragging));
    });

    this.controls.addEventListener('change', () => {
      if (this.attachedObject) {
        const transform = this.getCurrentTransform();
        this.onTransformChangeCallbacks.forEach(cb => cb(transform));
      }
    });

    this.setMode(this.mode);
    this.setSpace(this.space);
    this.applySnapping();
  }

  public updateCamera(camera: THREE.Camera): void {
    this.camera = camera;
    this.controls.camera = camera;
  }

  /**
   * Attaches gizmo to a target 3D Object.
   */
  public attach(object: THREE.Object3D): void {
    this.attachedObject = object;
    this.controls.attach(object);
    this.controls.getHelper().visible = true;
    this.controls.enabled = true;
  }

  /**
   * Detaches gizmo from current object.
   */
  public detach(): void {
    this.attachedObject = null;
    this.controls.detach();
    this.controls.getHelper().visible = false;
    this.controls.enabled = false;
  }

  public getAttachedObject(): THREE.Object3D | null {
    return this.attachedObject;
  }

  public isDragging(): boolean {
    return this.controls.dragging;
  }

  /**
   * Sets transform manipulation mode ('translate' | 'rotate' | 'scale' | 'select').
   */
  public setMode(mode: TransformMode): void {
    this.mode = mode;
    if (mode === 'select') {
      this.controls.getHelper().visible = false;
      this.controls.enabled = false;
    } else {
      this.controls.setMode(mode);
      if (this.attachedObject) {
        this.controls.getHelper().visible = true;
        this.controls.enabled = true;
      }
    }
  }

  public getMode(): TransformMode {
    return this.mode;
  }

  /**
   * Sets coordinate space ('world' vs 'local').
   */
  public setSpace(space: CoordinateSpace): void {
    this.space = space;
    this.controls.setSpace(space);
  }

  public getSpace(): CoordinateSpace {
    return this.space;
  }

  /**
   * Configures grid/angle transform snapping.
   */
  public setSnapConfig(config: Partial<TransformSnapConfig>): void {
    this.snapConfig = { ...this.snapConfig, ...config };
    this.applySnapping();
  }

  public getSnapConfig(): TransformSnapConfig {
    return this.snapConfig;
  }

  private applySnapping(): void {
    if (this.snapConfig.enabled) {
      this.controls.setTranslationSnap(this.snapConfig.translation);
      this.controls.setRotationSnap(THREE.MathUtils.degToRad(this.snapConfig.rotationDeg));
      this.controls.setScaleSnap(this.snapConfig.scale);
    } else {
      this.controls.setTranslationSnap(null);
      this.controls.setRotationSnap(null);
      this.controls.setScaleSnap(null);
    }
  }

  /**
   * Extracts clean numeric transform data in degrees.
   */
  public getCurrentTransform(): ObjectTransformData {
    if (!this.attachedObject) {
      return {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      };
    }

    const pos = this.attachedObject.position;
    const rot = this.attachedObject.rotation;
    const scl = this.attachedObject.scale;

    return {
      position: {
        x: Number(pos.x.toFixed(3)),
        y: Number(pos.y.toFixed(3)),
        z: Number(pos.z.toFixed(3))
      },
      rotation: {
        x: Number(THREE.MathUtils.radToDeg(rot.x).toFixed(2)),
        y: Number(THREE.MathUtils.radToDeg(rot.y).toFixed(2)),
        z: Number(THREE.MathUtils.radToDeg(rot.z).toFixed(2))
      },
      scale: {
        x: Number(scl.x.toFixed(3)),
        y: Number(scl.y.toFixed(3)),
        z: Number(scl.z.toFixed(3))
      }
    };
  }

  public onDraggingChange(callback: (isDragging: boolean) => void): () => void {
    this.onDraggingChangeCallbacks.add(callback);
    return () => this.onDraggingChangeCallbacks.delete(callback);
  }

  public onTransformChange(callback: (transform: ObjectTransformData) => void): () => void {
    this.onTransformChangeCallbacks.add(callback);
    return () => this.onTransformChangeCallbacks.delete(callback);
  }

  public dispose(): void {
    this.detach();
    const gizmo = this.controls.getHelper();
    this.scene.remove(gizmo);
    this.controls.dispose();
  }
}
