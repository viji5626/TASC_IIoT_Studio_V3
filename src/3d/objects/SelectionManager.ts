import * as THREE from 'three';
import { TransformControlsManager } from '../controls/TransformControlsManager';

export class SelectionManager {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private domElement: HTMLElement;
  private transformControlsManager: TransformControlsManager;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();

  private selectedObject: THREE.Object3D | null = null;
  private selectionBoxHelper: THREE.BoxHelper | null = null;
  private onSelectCallbacks: Set<(object: THREE.Object3D | null) => void> = new Set();

  private isPointerDownOnGizmo: boolean = false;
  private isPointerDragging: boolean = false;
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 };

  constructor(
    camera: THREE.Camera,
    scene: THREE.Scene,
    domElement: HTMLElement,
    transformControlsManager: TransformControlsManager
  ) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;
    this.transformControlsManager = transformControlsManager;

    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
  }

  public updateCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.isPointerDragging = false;
    this.pointerDownPos = { x: event.clientX, y: event.clientY };

    // Check if clicking directly on transform gizmo
    if (this.transformControlsManager.isDragging()) {
      this.isPointerDownOnGizmo = true;
      return;
    }
    this.isPointerDownOnGizmo = false;
  };

  private onPointerMove = (event: PointerEvent): void => {
    const dist = Math.hypot(event.clientX - this.pointerDownPos.x, event.clientY - this.pointerDownPos.y);
    if (dist > 4) {
      this.isPointerDragging = true;
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    // If it was a drag (e.g. orbit/pan or gizmo drag), ignore click selection
    if (this.isPointerDragging || this.isPointerDownOnGizmo || this.transformControlsManager.isDragging()) {
      return;
    }

    // Convert mouse coordinates to normalized device coordinates (-1 to +1)
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Find all meshes in the scene (excluding helpers/gizmos/environment)
    const selectableObjects: THREE.Object3D[] = [];
    this.scene.traverse(child => {
      if (
        child instanceof THREE.Mesh &&
        child.visible &&
        !child.name.startsWith('__SCADA_') &&
        !(child as any).isGizmo &&
        !(child as any).isTransformGizmo
      ) {
        selectableObjects.push(child);
      }
    });

    const intersects = this.raycaster.intersectObjects(selectableObjects, true);

    if (intersects.length > 0) {
      // Traverse up to find the top-level equipment root object
      let target: THREE.Object3D | null = intersects[0].object;
      while (target && target.parent && target.parent !== this.scene && !(target.userData && target.userData.isEquipmentRoot)) {
        target = target.parent;
      }
      this.select(target);
    } else {
      // Clicked on empty ground -> deselect
      this.select(null);
    }
  };

  /**
   * Selects a 3D object programmatically or via click.
   */
  public select(object: THREE.Object3D | null): void {
    if (this.selectedObject === object) return;

    this.selectedObject = object;

    // Update selection highlight box
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }

    if (object) {
      this.selectionBoxHelper = new THREE.BoxHelper(object, 0x38bdf8); // Sky blue outline
      this.selectionBoxHelper.name = '__SCADA_3D_SELECTION_BOX__';
      this.scene.add(this.selectionBoxHelper);

      // Attach transform gizmo
      this.transformControlsManager.attach(object);
    } else {
      this.transformControlsManager.detach();
    }

    // Notify listeners
    this.onSelectCallbacks.forEach(cb => cb(object));
  }

  public getSelectedObject(): THREE.Object3D | null {
    return this.selectedObject;
  }

  /**
   * Updates selection box geometry after transform changes.
   */
  public updateSelectionBox(): void {
    if (this.selectionBoxHelper && this.selectedObject) {
      this.selectionBoxHelper.update();
    }
  }

  public onSelect(callback: (object: THREE.Object3D | null) => void): () => void {
    this.onSelectCallbacks.add(callback);
    return () => this.onSelectCallbacks.delete(callback);
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);

    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }
  }
}
