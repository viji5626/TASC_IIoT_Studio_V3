import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { MaterialManager } from '../core/MaterialManager';

export interface CadImportResult {
  group: THREE.Group;
  fileName: string;
  format: 'stl' | 'obj' | 'gltf' | 'glb' | 'dae' | 'json';
  triangleCount: number;
  vertexCount: number;
  originalBounds: {
    width: number;
    height: number;
    depth: number;
    maxDim: number;
  };
  suggestedScale: number;
}

export class CadImporter {
  private materialManager: MaterialManager;

  constructor(materialManager: MaterialManager) {
    this.materialManager = materialManager;
  }

  /**
   * Identifies file extension and format.
   */
  public static detectFormat(fileName: string): 'stl' | 'obj' | 'gltf' | 'glb' | 'dae' | 'json' | null {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'stl') return 'stl';
    if (ext === 'obj') return 'obj';
    if (ext === 'gltf') return 'gltf';
    if (ext === 'glb') return 'glb';
    if (ext === 'dae') return 'dae';
    if (ext === 'json') return 'json';
    return null;
  }

  /**
   * Parses and loads a CAD file from File / ArrayBuffer / Text into a clean Three.js Group.
   */
  public async loadCadFile(file: File): Promise<CadImportResult> {
    const format = CadImporter.detectFormat(file.name);
    if (!format) {
      throw new Error(`Unsupported CAD format: .${file.name.split('.').pop()}. Supported: .stl, .obj, .gltf, .glb, .dae, .json`);
    }

    let loadedObject: THREE.Object3D;

    switch (format) {
      case 'stl': {
        const buffer = await file.arrayBuffer();
        const loader = new STLLoader();
        const geometry = loader.parse(buffer);
        geometry.computeVertexNormals();

        const defaultMat = this.materialManager.getMaterial('painted_steel_blue');
        const mesh = new THREE.Mesh(geometry, defaultMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const grp = new THREE.Group();
        grp.add(mesh);
        loadedObject = grp;
        break;
      }

      case 'obj': {
        const text = await file.text();
        const loader = new OBJLoader();
        const obj = loader.parse(text);
        const defaultMat = this.materialManager.getMaterial('painted_steel_blue');

        obj.traverse(child => {
          if (child instanceof THREE.Mesh) {
            if (!child.material || (Array.isArray(child.material) && child.material.length === 0)) {
              child.material = defaultMat;
            }
            if (child.geometry) child.geometry.computeVertexNormals();
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        loadedObject = obj;
        break;
      }

      case 'glb':
      case 'gltf': {
        const buffer = await file.arrayBuffer();
        const loader = new GLTFLoader();
        const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
          loader.parse(buffer, '', resolve, reject);
        });
        loadedObject = gltf.scene;
        break;
      }

      case 'dae': {
        const text = await file.text();
        const loader = new ColladaLoader();
        const collada = loader.parse(text, '');
        loadedObject = collada.scene;
        break;
      }

      case 'json': {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const loader = new THREE.ObjectLoader();
        loadedObject = loader.parse(parsed) as THREE.Object3D;
        break;
      }
    }

    // Wrap in top-level Group
    const rootGroup = new THREE.Group();
    rootGroup.name = file.name.replace(/\.[^/.]+$/, '');
    rootGroup.add(loadedObject);

    // Compute bounding statistics
    const box = new THREE.Box3().setFromObject(rootGroup);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);

    // Auto-calculate suggested scale factor (normalizing millimeters/inches to standard 2-3 meter industrial equipment)
    let suggestedScale = 1.0;
    if (maxDim > 50) {
      // Model is in millimeters (e.g. 2500mm = 2.5m)
      suggestedScale = 0.001;
    } else if (maxDim < 0.1) {
      // Model is tiny (e.g. in meters but small part)
      suggestedScale = 10.0;
    } else if (maxDim > 10) {
      suggestedScale = 2.5 / maxDim;
    }

    // Auto-center geometry to bottom plant base (Y = 0)
    loadedObject.position.set(-center.x, -box.min.y, -center.z);

    // Count triangles and vertices
    let triangleCount = 0;
    let vertexCount = 0;

    rootGroup.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geo = child.geometry;
        if (geo.index) {
          triangleCount += geo.index.count / 3;
        } else if (geo.attributes.position) {
          triangleCount += geo.attributes.position.count / 3;
        }
        if (geo.attributes.position) {
          vertexCount += geo.attributes.position.count;
        }
      }
    });

    return {
      group: rootGroup,
      fileName: file.name,
      format,
      triangleCount: Math.round(triangleCount),
      vertexCount,
      originalBounds: {
        width: Number(size.x.toFixed(2)),
        height: Number(size.y.toFixed(2)),
        depth: Number(size.z.toFixed(2)),
        maxDim: Number(maxDim.toFixed(2))
      },
      suggestedScale
    };
  }

  /**
   * Applies an industrial PBR material to all meshes in the imported CAD group.
   */
  public applyMaterialPreset(group: THREE.Group, presetKey: string): void {
    if (presetKey === 'original') return;
    const mat = this.materialManager.getMaterial(presetKey);
    group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = mat;
      }
    });
  }
}
