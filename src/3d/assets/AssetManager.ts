import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetManager {
  private loader: GLTFLoader = new GLTFLoader();
  private modelCache: Map<string, THREE.Group> = new Map();
  private loadingPromises: Map<string, Promise<THREE.Group>> = new Map();

  /**
   * Loads and normalizes a GLTF/GLB model from a URL, with caching and bounding-box normalization.
   */
  public async loadModel(url: string): Promise<THREE.Group> {
    if (this.modelCache.has(url)) {
      return this.modelCache.get(url)!.clone(true);
    }

    if (this.loadingPromises.has(url)) {
      const group = await this.loadingPromises.get(url)!;
      return group.clone(true);
    }

    const promise = new Promise<THREE.Group>((resolve, reject) => {
      this.loader.load(
        url,
        gltf => {
          const root = gltf.scene;

          // 1. Compute Bounding Box & Normalize Dimensions to 1 Unit = 1 Meter
          const box = new THREE.Box3().setFromObject(root);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          const maxDim = Math.max(size.x, size.y, size.z);

          // If CAD model is in millimeters (e.g. 1500 units for a 1.5m pump), scale down to meters
          if (maxDim > 100) {
            const scaleFactor = 1.0 / 1000.0;
            root.scale.multiplyScalar(scaleFactor);
          }

          // Center pivot at bottom base (y = 0)
          const adjustedBox = new THREE.Box3().setFromObject(root);
          const adjustedCenter = new THREE.Vector3();
          adjustedBox.getCenter(adjustedCenter);
          root.position.x -= adjustedCenter.x;
          root.position.z -= adjustedCenter.z;
          root.position.y -= adjustedBox.min.y;

          // Enable shadows
          root.traverse(child => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          this.modelCache.set(url, root);
          this.loadingPromises.delete(url);
          resolve(root.clone(true));
        },
        undefined,
        err => {
          console.error(`[AssetManager] Failed to load 3D GLB model from "${url}":`, err);
          this.loadingPromises.delete(url);
          reject(err);
        }
      );
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  /**
   * Generates a double-sided billboard 3D plane from a 2D/3D SVG string or URL.
   */
  public createSvgBillboard(svgContent: string, width = 2.0, height = 2.0): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SVG_Billboard';

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const img = new Image();
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.clearRect(0, 0, 512, 512);
        ctx.drawImage(img, 0, 0, 512, 512);
        URL.revokeObjectURL(url);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;

        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          roughness: 0.4,
          metalness: 0.1
        });

        const geo = new THREE.PlaneGeometry(width, height);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, height / 2, 0);
        mesh.castShadow = true;
        group.add(mesh);
      };
      img.src = url;
    }

    return group;
  }

  public clearCache(): void {
    this.modelCache.forEach(model => {
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        }
      });
    });
    this.modelCache.clear();
    this.loadingPromises.clear();
  }
}
