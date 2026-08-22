import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class OrbitControlsManager {
  public controls: OrbitControls;
  private camera: THREE.Camera;
  private domElement: HTMLElement;

  constructor(camera: THREE.Camera, domElement: HTMLElement, target?: THREE.Vector3) {
    this.camera = camera;
    this.domElement = domElement;

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.02; // Prevent camera from flipping completely under the floor
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 500;

    if (target && Number.isFinite(target.x)) {
      this.controls.target.copy(target);
    }
  }

  /**
   * Updates active camera when switched between perspective and orthographic.
   */
  public updateCamera(camera: THREE.Camera): void {
    if (!camera) return;
    const prevTarget = this.controls.target.clone();
    this.controls.dispose();

    this.camera = camera;
    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.02;
    if (Number.isFinite(prevTarget.x)) {
      this.controls.target.copy(prevTarget);
    }
    this.controls.update();
  }

  /**
   * Updates target point and recalibrates orbit orientation.
   */
  public setTarget(target: THREE.Vector3): void {
    if (!target || !Number.isFinite(target.x)) return;
    this.controls.target.copy(target);
    this.controls.update();
  }

  /**
   * Synchronizes OrbitControls after an external camera position/target change.
   */
  public sync(camera: THREE.Camera, target: THREE.Vector3): void {
    if (this.camera !== camera) {
      this.updateCamera(camera);
    }
    if (target && Number.isFinite(target.x)) {
      this.controls.target.copy(target);
    }
    this.controls.update();
  }

  public setEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  public update(): void {
    if (this.controls.enabled) {
      this.controls.update();
    }
  }

  public dispose(): void {
    this.controls.dispose();
  }
}
