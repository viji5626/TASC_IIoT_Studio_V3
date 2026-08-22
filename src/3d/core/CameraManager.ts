import * as THREE from 'three';
import { CameraPresetView, CameraProjection, Scada3dCameraConfig } from '../types/scene';

export class CameraManager {
  private container: HTMLElement;
  public perspectiveCamera: THREE.PerspectiveCamera;
  public orthographicCamera: THREE.OrthographicCamera;
  public activeCamera: THREE.Camera;
  public projection: CameraProjection = 'perspective';
  public target: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  constructor(container: HTMLElement) {
    this.container = container;
    const aspect = this.getAspect();

    // 1. Perspective Camera
    this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.perspectiveCamera.position.set(12, 10, 14);
    this.perspectiveCamera.lookAt(this.target);
    this.perspectiveCamera.updateMatrixWorld(true);

    // 2. Orthographic Camera
    const frustumSize = 15;
    this.orthographicCamera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
    this.orthographicCamera.position.set(12, 10, 14);
    this.orthographicCamera.lookAt(this.target);
    this.orthographicCamera.updateMatrixWorld(true);

    this.activeCamera = this.perspectiveCamera;
  }

  private getAspect(): number {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    const aspect = width / (height || 1);
    return Number.isFinite(aspect) && aspect > 0 ? aspect : 1.333;
  }

  /**
   * Resizes camera projection matrices when the viewport container size changes.
   */
  public handleResize(width: number, height: number): void {
    if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) return;
    const aspect = width / height;

    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    const frustumSize = 15;
    this.orthographicCamera.left = (-frustumSize * aspect) / 2;
    this.orthographicCamera.right = (frustumSize * aspect) / 2;
    this.orthographicCamera.top = frustumSize / 2;
    this.orthographicCamera.bottom = -frustumSize / 2;
    this.orthographicCamera.updateProjectionMatrix();
  }

  /**
   * Switches between Perspective and Orthographic projection while preserving view orientation.
   */
  public setProjection(projection: CameraProjection): THREE.Camera {
    this.projection = projection;
    const oldCam = this.activeCamera;
    const newCam = projection === 'perspective' ? this.perspectiveCamera : this.orthographicCamera;

    newCam.position.copy(oldCam.position);
    newCam.quaternion.copy(oldCam.quaternion);
    newCam.updateMatrixWorld(true);

    if (newCam instanceof THREE.PerspectiveCamera) {
      newCam.aspect = this.getAspect();
      newCam.updateProjectionMatrix();
    } else if (newCam instanceof THREE.OrthographicCamera) {
      const aspect = this.getAspect();
      const frustumSize = 15;
      newCam.left = (-frustumSize * aspect) / 2;
      newCam.right = (frustumSize * aspect) / 2;
      newCam.top = frustumSize / 2;
      newCam.bottom = -frustumSize / 2;
      newCam.updateProjectionMatrix();
    }

    this.activeCamera = newCam;
    return this.activeCamera;
  }

  /**
   * Sets the camera to a standard industrial view preset (Isometric, Top, Front, Side, etc.).
   */
  public setPresetView(preset: CameraPresetView, distance: number = 18): void {
    const tx = Number.isFinite(this.target.x) ? this.target.x : 0;
    const ty = Number.isFinite(this.target.y) ? this.target.y : 1;
    const tz = Number.isFinite(this.target.z) ? this.target.z : 0;
    this.target.set(tx, ty, tz);

    const safeDist = Number.isFinite(distance) && distance > 0 ? distance : 18;
    const newPos = new THREE.Vector3();

    switch (preset) {
      case 'isometric':
        newPos.set(tx + safeDist * 0.7, ty + safeDist * 0.6, tz + safeDist * 0.7);
        break;
      case 'top':
        newPos.set(tx, ty + safeDist, tz + 0.001); // Slight epsilon to prevent gimbal lock
        break;
      case 'bottom':
        newPos.set(tx, ty - safeDist, tz + 0.001);
        break;
      case 'front':
        newPos.set(tx, ty + 2, tz + safeDist);
        break;
      case 'back':
        newPos.set(tx, ty + 2, tz - safeDist);
        break;
      case 'left':
        newPos.set(tx - safeDist, ty + 2, tz);
        break;
      case 'right':
        newPos.set(tx + safeDist, ty + 2, tz);
        break;
      default:
        newPos.set(tx + safeDist * 0.7, ty + safeDist * 0.6, tz + safeDist * 0.7);
    }

    // Apply to both cameras so orientation stays synchronized
    this.perspectiveCamera.position.copy(newPos);
    this.perspectiveCamera.lookAt(this.target);
    this.perspectiveCamera.updateMatrixWorld(true);

    this.orthographicCamera.position.copy(newPos);
    this.orthographicCamera.lookAt(this.target);
    this.orthographicCamera.updateMatrixWorld(true);
  }

  /**
   * Frames the camera smoothly onto a target 3D object.
   */
  public frameObject(object: THREE.Object3D): void {
    if (!object) return;
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    const sphere = new THREE.Sphere();
    box.getCenter(center);
    box.getBoundingSphere(sphere);

    if (!Number.isFinite(center.x) || !Number.isFinite(sphere.radius)) return;

    this.target.copy(center);

    const radius = Math.max(Number.isFinite(sphere.radius) ? sphere.radius : 1.0, 1.0);
    const dist = radius * 3.2;

    const offset = new THREE.Vector3(1, 0.8, 1).normalize().multiplyScalar(dist);
    const newPos = center.clone().add(offset);

    this.perspectiveCamera.position.copy(newPos);
    this.perspectiveCamera.lookAt(center);
    this.perspectiveCamera.updateMatrixWorld(true);

    this.orthographicCamera.position.copy(newPos);
    this.orthographicCamera.lookAt(center);
    this.orthographicCamera.updateMatrixWorld(true);
  }

  /**
   * Frames the entire scene.
   */
  public frameAll(scene: THREE.Scene): void {
    if (!scene) return;
    scene.updateMatrixWorld(true);

    const box = new THREE.Box3();
    scene.traverse(child => {
      if (child instanceof THREE.Mesh && !child.name.startsWith('__SCADA_')) {
        box.expandByObject(child);
      }
    });

    if (box.isEmpty()) {
      this.target.set(0, 1, 0);
      this.setPresetView('isometric', 18);
      return;
    }

    const center = new THREE.Vector3();
    const sphere = new THREE.Sphere();
    box.getCenter(center);
    box.getBoundingSphere(sphere);

    if (!Number.isFinite(center.x) || !Number.isFinite(sphere.radius)) {
      this.target.set(0, 1, 0);
      this.setPresetView('isometric', 18);
      return;
    }

    this.target.copy(center);
    const dist = Math.max(sphere.radius * 2.8, 12);
    const offset = new THREE.Vector3(1, 0.8, 1).normalize().multiplyScalar(dist);
    const newPos = center.clone().add(offset);

    this.perspectiveCamera.position.copy(newPos);
    this.perspectiveCamera.lookAt(center);
    this.perspectiveCamera.updateMatrixWorld(true);

    this.orthographicCamera.position.copy(newPos);
    this.orthographicCamera.lookAt(center);
    this.orthographicCamera.updateMatrixWorld(true);
  }

  /**
   * Exports current camera state to a serializable config object.
   */
  public getConfig(): Scada3dCameraConfig {
    return {
      projection: this.projection,
      position: {
        x: Number(this.activeCamera.position.x.toFixed(3)),
        y: Number(this.activeCamera.position.y.toFixed(3)),
        z: Number(this.activeCamera.position.z.toFixed(3))
      },
      target: {
        x: Number(this.target.x.toFixed(3)),
        y: Number(this.target.y.toFixed(3)),
        z: Number(this.target.z.toFixed(3))
      },
      fov: this.perspectiveCamera.fov,
      zoom: this.orthographicCamera.zoom,
      near: this.perspectiveCamera.near,
      far: this.perspectiveCamera.far
    };
  }

  /**
   * Restores camera state from a saved configuration.
   */
  public applyConfig(cfg: Scada3dCameraConfig): void {
    if (!cfg) return;
    this.setProjection(cfg.projection || 'perspective');
    if (cfg.position && Number.isFinite(cfg.position.x)) {
      this.activeCamera.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
    }
    if (cfg.target && Number.isFinite(cfg.target.x)) {
      this.target.set(cfg.target.x, cfg.target.y, cfg.target.z);
      this.activeCamera.lookAt(this.target);
    }
    if (cfg.fov) this.perspectiveCamera.fov = cfg.fov;
    if (cfg.zoom) this.orthographicCamera.zoom = cfg.zoom;
    this.perspectiveCamera.updateProjectionMatrix();
    this.orthographicCamera.updateProjectionMatrix();
  }
}
