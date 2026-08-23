import * as THREE from 'three';
import { Object3DManager } from '../3d/objects/Object3DManager';

export interface Ai3dMaterialSpec {
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  wireframe?: boolean;
  opacity?: number;
  transparent?: boolean;
}

export type Ai3dPrimitiveType = 
  | 'box' 
  | 'cylinder' 
  | 'sphere' 
  | 'cone' 
  | 'flanged_nozzle' 
  | 'agitator_blade' 
  | 'cooling_fin_array' 
  | 'hopper' 
  | 'motor_housing' 
  | 'gauge_dial' 
  | 'pipe_run' 
  | 'skid_base';

export interface Ai3dComponentPrimitive {
  id: string;
  name: string;
  type: Ai3dPrimitiveType;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number }; // degrees
  scale?: { x: number; y: number; z: number };
  dimensions: {
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
    radiusTop?: number;
    radiusBottom?: number;
    radialSegments?: number;
  };
  material: Ai3dMaterialSpec;
  animationHook?: 'spin_shaft' | 'level_indicator' | 'thermal_glow' | 'status_beacon' | 'vibration';
}

export interface Ai3dTelemetryHook {
  slotName: string;
  displayName: string;
  channelType: 'speed_rpm' | 'level_pct' | 'temperature_c' | 'pressure_bar' | 'status_alarm' | 'count_total';
  defaultTag?: string;
  description: string;
}

export interface Ai3dAssetDefinition {
  id: string;
  name: string;
  sector: string;
  category: string;
  description: string;
  version: string;
  createdAt: number;
  dimensions: { width: number; height: number; depth: number };
  components: Ai3dComponentPrimitive[];
  telemetryHooks: Ai3dTelemetryHook[];
  icon: string;
  tags: string[];
  author: 'AI Copilot' | 'Custom Engineer';
}

const STORAGE_KEY_AI_ASSETS = 'tasc_ai_3d_assets_v1';

export const SEED_AI_ASSETS: Ai3dAssetDefinition[] = [
  {
    id: 'ai_asset_extruder_dual_screw',
    name: 'Dual-Screw High-Torque Extruder & Drive Skid',
    sector: 'AI Generated Assets',
    category: 'Polymer Processing',
    description: 'Co-rotating dual screw plasticizing extruder with 4 barrel heating jackets, Siemens drive motor gearbox, and flanged melt discharge die.',
    version: '1.0.0',
    createdAt: Date.now() - 3600000,
    dimensions: { width: 4.8, height: 1.8, depth: 1.2 },
    icon: 'fa-gears',
    tags: ['extruder', 'plastics', 'polymer', 'screw', 'motor', 'heater', 'ai'],
    author: 'AI Copilot',
    telemetryHooks: [
      { slotName: 'motor_speed', displayName: 'Extruder Drive Speed', channelType: 'speed_rpm', defaultTag: 'PLC_Extruder_RPM', description: 'Controls rotational speed of co-rotating drive shafts.' },
      { slotName: 'zone1_temp', displayName: 'Barrel Zone 1 Temp', channelType: 'temperature_c', defaultTag: 'PLC_Extruder_Zone1_Temp', description: 'Thermal monitoring for feed throat zone.' },
      { slotName: 'die_pressure', displayName: 'Melt Die Pressure', channelType: 'pressure_bar', defaultTag: 'PLC_Melt_Pressure_Bar', description: 'High pressure safety transducer at extruder head.' },
      { slotName: 'drive_status', displayName: 'Motor Trip / Run Status', channelType: 'status_alarm', defaultTag: 'PLC_Extruder_Run_Bit', description: 'Green when running, Red on VFD overload trip.' }
    ],
    components: [
      // Skid Base
      {
        id: 'c_skid',
        name: 'Structural Skid Base',
        type: 'skid_base',
        position: { x: 0, y: 0.1, z: 0 },
        dimensions: { width: 4.6, height: 0.2, depth: 1.1 },
        material: { color: '#334155', metalness: 0.8, roughness: 0.3 }
      },
      // Drive Motor
      {
        id: 'c_motor',
        name: 'ABB 75kW Electric Motor',
        type: 'motor_housing',
        position: { x: -1.5, y: 0.6, z: 0 },
        dimensions: { radius: 0.35, height: 0.9 },
        material: { color: '#0284c7', metalness: 0.5, roughness: 0.4 },
        animationHook: 'spin_shaft'
      },
      // Gearbox
      {
        id: 'c_gearbox',
        name: 'Heavy Duty Gearbox',
        type: 'box',
        position: { x: -0.8, y: 0.55, z: 0 },
        dimensions: { width: 0.6, height: 0.7, depth: 0.6 },
        material: { color: '#475569', metalness: 0.7, roughness: 0.3 }
      },
      // Extruder Barrel
      {
        id: 'c_barrel',
        name: 'Nitrided Bimetallic Barrel',
        type: 'cylinder',
        position: { x: 0.7, y: 0.55, z: 0 },
        rotation: { x: 0, y: 0, z: 90 },
        dimensions: { radius: 0.22, height: 2.4 },
        material: { color: '#94a3b8', metalness: 0.9, roughness: 0.2 },
        animationHook: 'thermal_glow'
      },
      // Feed Hopper
      {
        id: 'c_hopper',
        name: 'Stainless Steel Gravity Feed Hopper',
        type: 'hopper',
        position: { x: -0.2, y: 1.2, z: 0 },
        dimensions: { radiusTop: 0.4, radiusBottom: 0.15, height: 0.7 },
        material: { color: '#e2e8f0', metalness: 0.95, roughness: 0.1 }
      },
      // 4 Barrel Heating Jackets
      {
        id: 'c_heat_1',
        name: 'Heater Band Zone 1',
        type: 'cylinder',
        position: { x: 0.1, y: 0.55, z: 0 },
        rotation: { x: 0, y: 0, z: 90 },
        dimensions: { radius: 0.25, height: 0.3 },
        material: { color: '#f59e0b', metalness: 0.6, roughness: 0.4 }
      },
      {
        id: 'c_heat_2',
        name: 'Heater Band Zone 2',
        type: 'cylinder',
        position: { x: 0.6, y: 0.55, z: 0 },
        rotation: { x: 0, y: 0, z: 90 },
        dimensions: { radius: 0.25, height: 0.3 },
        material: { color: '#f59e0b', metalness: 0.6, roughness: 0.4 }
      },
      {
        id: 'c_heat_3',
        name: 'Heater Band Zone 3',
        type: 'cylinder',
        position: { x: 1.1, y: 0.55, z: 0 },
        rotation: { x: 0, y: 0, z: 90 },
        dimensions: { radius: 0.25, height: 0.3 },
        material: { color: '#f59e0b', metalness: 0.6, roughness: 0.4 }
      },
      {
        id: 'c_heat_4',
        name: 'Heater Band Zone 4',
        type: 'cylinder',
        position: { x: 1.6, y: 0.55, z: 0 },
        rotation: { x: 0, y: 0, z: 90 },
        dimensions: { radius: 0.25, height: 0.3 },
        material: { color: '#f59e0b', metalness: 0.6, roughness: 0.4 }
      },
      // Melt Die Head & Flange
      {
        id: 'c_die',
        name: 'Extrusion Profile Die',
        type: 'flanged_nozzle',
        position: { x: 1.95, y: 0.55, z: 0 },
        rotation: { x: 0, y: 0, z: 90 },
        dimensions: { radius: 0.28, height: 0.15 },
        material: { color: '#38bdf8', metalness: 0.9, roughness: 0.2 }
      },
      // Status Indicator Beacon
      {
        id: 'c_beacon',
        name: 'Andon Tower Beacon',
        type: 'cylinder',
        position: { x: -1.7, y: 1.3, z: 0.3 },
        dimensions: { radius: 0.05, height: 0.4 },
        material: { color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 0.8 },
        animationHook: 'status_beacon'
      }
    ]
  },
  {
    id: 'ai_asset_bioreactor_aseptic',
    name: 'Aseptic Stainless Bioreactor & Magnetic Agitator',
    sector: 'AI Generated Assets',
    category: 'Biotech & Pharma',
    description: '316L mirror-finish fermenter vessel with dimple cooling jacket, top-mounted magnetic drive agitator, CIP spray ball, and sterile sampling ports.',
    version: '1.0.0',
    createdAt: Date.now() - 7200000,
    dimensions: { width: 2.2, height: 3.4, depth: 2.2 },
    icon: 'fa-flask-vial',
    tags: ['bioreactor', 'fermenter', 'pharma', 'vessel', 'agitator', 'sterile', 'ai'],
    author: 'AI Copilot',
    telemetryHooks: [
      { slotName: 'vessel_level', displayName: 'Liquid Batch Level', channelType: 'level_pct', defaultTag: 'PLC_Reactor_Level_Pct', description: 'Liquid fill volume in reactor vessel.' },
      { slotName: 'agitator_rpm', displayName: 'Agitator Impeller RPM', channelType: 'speed_rpm', defaultTag: 'PLC_Agitator_Speed', description: 'Magnetic drive impeller rotation speed.' },
      { slotName: 'jacket_temp', displayName: 'Jacket Core Temp', channelType: 'temperature_c', defaultTag: 'PLC_Jacket_Temp_C', description: 'Sterilization and incubation temperature control.' },
      { slotName: 'ph_value', displayName: 'Batch pH Sensor', channelType: 'pressure_bar', defaultTag: 'PLC_Batch_pH_Val', description: 'In-line optical pH electrode.' }
    ],
    components: [
      // 4 Leg Support Skid
      {
        id: 'c_legs',
        name: 'Sanitary Tubular Leg Supports',
        type: 'cylinder',
        position: { x: 0, y: 0.4, z: 0 },
        dimensions: { radius: 0.8, height: 0.8 },
        material: { color: '#64748b', metalness: 0.8, roughness: 0.2 }
      },
      // Main Vessel Cylinder
      {
        id: 'c_vessel_body',
        name: '316L Mirror Finish Vessel Shell',
        type: 'cylinder',
        position: { x: 0, y: 1.6, z: 0 },
        dimensions: { radius: 0.75, height: 1.6 },
        material: { color: '#e2e8f0', metalness: 0.95, roughness: 0.1 },
        animationHook: 'level_indicator'
      },
      // Top Dished Head
      {
        id: 'c_top_head',
        name: 'ASME Flanged Dished Head',
        type: 'sphere',
        position: { x: 0, y: 2.4, z: 0 },
        scale: { x: 0.75, y: 0.35, z: 0.75 },
        dimensions: { radius: 1.0 },
        material: { color: '#cbd5e1', metalness: 0.9, roughness: 0.15 }
      },
      // Dimple Jacket Section
      {
        id: 'c_jacket',
        name: 'Thermal Heat-Exchange Dimple Jacket',
        type: 'cylinder',
        position: { x: 0, y: 1.5, z: 0 },
        dimensions: { radius: 0.82, height: 1.1 },
        material: { color: '#38bdf8', opacity: 0.4, transparent: true, metalness: 0.6, roughness: 0.2 },
        animationHook: 'thermal_glow'
      },
      // Agitator Motor Top
      {
        id: 'c_agitator_motor',
        name: 'Sanitary Magnetic Drive Motor',
        type: 'motor_housing',
        position: { x: 0, y: 2.9, z: 0 },
        dimensions: { radius: 0.22, height: 0.6 },
        material: { color: '#0ea5e9', metalness: 0.7, roughness: 0.3 },
        animationHook: 'spin_shaft'
      },
      // Top Flanged Inlet Ports
      {
        id: 'c_nozzle_top1',
        name: 'CIP Spray Ball Inlet',
        type: 'flanged_nozzle',
        position: { x: 0.4, y: 2.65, z: 0.2 },
        dimensions: { radius: 0.08, height: 0.25 },
        material: { color: '#94a3b8', metalness: 0.9, roughness: 0.2 }
      },
      {
        id: 'c_nozzle_top2',
        name: 'Nutrient Feed Port',
        type: 'flanged_nozzle',
        position: { x: -0.4, y: 2.65, z: -0.2 },
        dimensions: { radius: 0.08, height: 0.25 },
        material: { color: '#94a3b8', metalness: 0.9, roughness: 0.2 }
      },
      // Sight Glass Window
      {
        id: 'c_sight_glass',
        name: 'Borosilicate Sight Glass Port',
        type: 'cylinder',
        position: { x: 0.72, y: 1.6, z: 0.2 },
        rotation: { x: 0, y: 0, z: 90 },
        dimensions: { radius: 0.12, height: 0.1 },
        material: { color: '#67e8f9', opacity: 0.7, transparent: true }
      }
    ]
  }
];

export class Ai3dAssetService {
  /**
   * Loads all saved AI-generated assets from localStorage, initializing seeds if empty.
   */
  public static loadAssets(): Ai3dAssetDefinition[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AI_ASSETS);
      if (!raw) {
        this.saveAllAssets(SEED_AI_ASSETS);
        return [...SEED_AI_ASSETS];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...SEED_AI_ASSETS];
    } catch {
      return [...SEED_AI_ASSETS];
    }
  }

  /**
   * Saves all AI assets array into localStorage.
   */
  public static saveAllAssets(assets: Ai3dAssetDefinition[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_AI_ASSETS, JSON.stringify(assets));
    } catch (e) {
      console.error('[Ai3dAssetService] Failed to save AI assets to storage:', e);
    }
  }

  /**
   * Adds or updates a single AI asset.
   */
  public static saveAsset(asset: Ai3dAssetDefinition): void {
    const assets = this.loadAssets();
    const idx = assets.findIndex(a => a.id === asset.id);
    if (idx >= 0) {
      assets[idx] = asset;
    } else {
      assets.unshift(asset);
    }
    this.saveAllAssets(assets);

    // Immediately compile and register with 3D Object Manager
    const mesh = this.compileThreeMesh(asset);
    Object3DManager.registerCustomModel(asset.id, mesh);

    // Notify UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tasc_ai_3d_assets_updated', { detail: { assetId: asset.id } }));
    }
  }

  /**
   * Deletes an AI-generated asset.
   */
  public static deleteAsset(id: string): void {
    const assets = this.loadAssets().filter(a => a.id !== id);
    this.saveAllAssets(assets);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tasc_ai_3d_assets_updated', { detail: { deletedId: id } }));
    }
  }

  /**
   * Initializes and pre-compiles all AI 3D meshes into Three.js Object3DManager.
   */
  public static initializeRegistry(): void {
    const assets = this.loadAssets();
    assets.forEach(asset => {
      try {
        const mesh = this.compileThreeMesh(asset);
        Object3DManager.registerCustomModel(asset.id, mesh);
      } catch (err) {
        console.warn(`[Ai3dAssetService] Failed to pre-compile mesh for ${asset.id}:`, err);
      }
    });
  }

  /**
   * Compiles an Ai3dAssetDefinition into a high-performance procedural Three.js Group.
   */
  public static compileThreeMesh(asset: Ai3dAssetDefinition): THREE.Group {
    const rootGroup = new THREE.Group();
    rootGroup.name = `AI_ASSET_${asset.id}`;

    // Compute ground alignment offset (ensure lowest point sits on Y=0)
    let minY = Infinity;

    asset.components.forEach(comp => {
      const cy = comp.position?.y || 0;
      let h = comp.dimensions.height || comp.dimensions.radius || 0.5;
      let bottom = cy - h / 2;
      if (bottom < minY) minY = bottom;
    });

    const groundOffset = minY < 0 || minY > 0.05 ? -minY : 0;

    asset.components.forEach(comp => {
      const mesh = this.createPrimitiveMesh(comp);
      if (mesh) {
        mesh.position.y += groundOffset;
        rootGroup.add(mesh);
      }
    });

    rootGroup.userData = {
      isAiAsset: true,
      assetId: asset.id,
      assetName: asset.name,
      telemetryHooks: asset.telemetryHooks
    };

    return rootGroup;
  }

  private static createPrimitiveMesh(comp: Ai3dComponentPrimitive): THREE.Object3D | null {
    let geom: THREE.BufferGeometry;
    const dim = comp.dimensions;
    const matSpec = comp.material || { color: '#64748b' };

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(matSpec.color || '#64748b'),
      metalness: matSpec.metalness !== undefined ? matSpec.metalness : 0.7,
      roughness: matSpec.roughness !== undefined ? matSpec.roughness : 0.3,
      emissive: new THREE.Color(matSpec.emissive || '#000000'),
      emissiveIntensity: matSpec.emissiveIntensity || 0,
      wireframe: !!matSpec.wireframe,
      transparent: !!matSpec.transparent,
      opacity: matSpec.opacity !== undefined ? matSpec.opacity : 1.0,
      roughnessMap: null
    });

    switch (comp.type) {
      case 'box':
      case 'skid_base': {
        const w = dim.width || 1;
        const h = dim.height || 1;
        const d = dim.depth || 1;
        geom = new THREE.BoxGeometry(w, h, d);
        break;
      }

      case 'cylinder':
      case 'pipe_run': {
        const rTop = dim.radiusTop || dim.radius || 0.5;
        const rBot = dim.radiusBottom || dim.radius || 0.5;
        const h = dim.height || 1;
        const segs = dim.radialSegments || 32;
        geom = new THREE.CylinderGeometry(rTop, rBot, h, segs);
        break;
      }

      case 'motor_housing': {
        const group = new THREE.Group();
        const r = dim.radius || 0.3;
        const h = dim.height || 0.7;
        const bodyGeom = new THREE.CylinderGeometry(r, r, h, 24);
        const bodyMesh = new THREE.Mesh(bodyGeom, material);
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        // Terminal box on motor top
        const tBoxGeom = new THREE.BoxGeometry(r * 0.8, r * 0.4, r * 0.8);
        const tBoxMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.8, roughness: 0.3 });
        const tBox = new THREE.Mesh(tBoxGeom, tBoxMat);
        tBox.position.set(0, h * 0.3, r * 0.9);
        group.add(tBox);

        // Cooling fins
        const finCount = 6;
        for (let i = 0; i < finCount; i++) {
          const finGeom = new THREE.BoxGeometry(r * 2.2, h * 0.7, 0.02);
          const fin = new THREE.Mesh(finGeom, tBoxMat);
          fin.rotation.y = (i * Math.PI) / finCount;
          group.add(fin);
        }

        this.applyTransform(group, comp);
        return group;
      }

      case 'hopper': {
        const rTop = dim.radiusTop || 0.5;
        const rBot = dim.radiusBottom || 0.15;
        const h = dim.height || 0.8;
        geom = new THREE.CylinderGeometry(rTop, rBot, h, 24, 1, true);
        break;
      }

      case 'flanged_nozzle': {
        const group = new THREE.Group();
        const r = dim.radius || 0.15;
        const h = dim.height || 0.3;

        // Pipe neck
        const pipeGeom = new THREE.CylinderGeometry(r * 0.7, r * 0.7, h, 16);
        const pipeMesh = new THREE.Mesh(pipeGeom, material);
        group.add(pipeMesh);

        // Raised face flange disc
        const flangeGeom = new THREE.CylinderGeometry(r * 1.4, r * 1.4, h * 0.2, 20);
        const flangeMat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.9, roughness: 0.2 });
        const flangeMesh = new THREE.Mesh(flangeGeom, flangeMat);
        flangeMesh.position.y = h * 0.4;
        group.add(flangeMesh);

        // 8 Bolt Circles
        const boltCount = 8;
        const boltRadius = r * 1.1;
        for (let i = 0; i < boltCount; i++) {
          const angle = (i * 2 * Math.PI) / boltCount;
          const boltGeom = new THREE.CylinderGeometry(0.015, 0.015, h * 0.25, 8);
          const boltMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.95, roughness: 0.1 });
          const boltMesh = new THREE.Mesh(boltGeom, boltMat);
          boltMesh.position.set(Math.cos(angle) * boltRadius, h * 0.4, Math.sin(angle) * boltRadius);
          group.add(boltMesh);
        }

        this.applyTransform(group, comp);
        return group;
      }

      case 'sphere': {
        const r = dim.radius || 0.5;
        geom = new THREE.SphereGeometry(r, 24, 16);
        break;
      }

      case 'cone': {
        const r = dim.radius || 0.5;
        const h = dim.height || 1;
        geom = new THREE.ConeGeometry(r, h, 24);
        break;
      }

      default: {
        geom = new THREE.BoxGeometry(dim.width || 1, dim.height || 1, dim.depth || 1);
        break;
      }
    }

    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = comp.name || comp.id;

    if (comp.animationHook) {
      mesh.userData.animationHook = comp.animationHook;
    }

    this.applyTransform(mesh, comp);
    return mesh;
  }

  private static applyTransform(obj: THREE.Object3D, comp: Ai3dComponentPrimitive): void {
    if (comp.position) {
      obj.position.set(comp.position.x || 0, comp.position.y || 0, comp.position.z || 0);
    }
    if (comp.rotation) {
      obj.rotation.set(
        THREE.MathUtils.degToRad(comp.rotation.x || 0),
        THREE.MathUtils.degToRad(comp.rotation.y || 0),
        THREE.MathUtils.degToRad(comp.rotation.z || 0)
      );
    }
    if (comp.scale) {
      obj.scale.set(comp.scale.x || 1, comp.scale.y || 1, comp.scale.z || 1);
    }
  }
}
