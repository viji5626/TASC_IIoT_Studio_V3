import * as THREE from 'three';

export interface MaterialPresetDef {
  name: string;
  color: number | string;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: number | string;
  emissiveIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

export const INDUSTRIAL_MATERIAL_PRESETS: Record<string, MaterialPresetDef> = {
  painted_steel_blue: {
    name: 'Industrial Machine Blue',
    color: '#0284c7',
    roughness: 0.35,
    metalness: 0.2,
    clearcoat: 0.3,
    clearcoatRoughness: 0.1
  },
  safety_yellow: {
    name: 'OSHA Safety Yellow',
    color: '#eab308',
    roughness: 0.4,
    metalness: 0.1
  },
  hazard_orange: {
    name: 'Industrial Safety Orange',
    color: '#f97316',
    roughness: 0.4,
    metalness: 0.1
  },
  safety_red: {
    name: 'Emergency / Fire Red',
    color: '#ef4444',
    roughness: 0.35,
    metalness: 0.2
  },
  safety_green: {
    name: 'Normal Operation Green',
    color: '#10b981',
    roughness: 0.35,
    metalness: 0.2
  },
  stainless_steel: {
    name: 'Stainless Steel 316L',
    color: '#cbd5e1',
    roughness: 0.25,
    metalness: 0.85
  },
  carbon_steel: {
    name: 'Carbon Steel / Structural',
    color: '#475569',
    roughness: 0.55,
    metalness: 0.75
  },
  cast_iron: {
    name: 'Heavy Cast Iron',
    color: '#334155',
    roughness: 0.7,
    metalness: 0.5
  },
  brass_bronze: {
    name: 'Machined Brass / Bronze',
    color: '#d97706',
    roughness: 0.3,
    metalness: 0.8
  },
  copper_polished: {
    name: 'Polished Copper',
    color: '#b45309',
    roughness: 0.25,
    metalness: 0.9
  },
  galvanized_zinc: {
    name: 'Galvanized Sheet Metal (Ducting)',
    color: '#94a3b8',
    roughness: 0.45,
    metalness: 0.65
  },
  dark_slate_skid: {
    name: 'Skid Base / Frame Slate',
    color: '#1e293b',
    roughness: 0.6,
    metalness: 0.4
  },
  fluid_water_blue: {
    name: 'Process Water / Liquid',
    color: '#0284c7',
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.75
  },
  fluid_oil_amber: {
    name: 'Hydraulic Oil / Amber Fluid',
    color: '#b45309',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.8
  },
  glass_translucent: {
    name: 'Inspection Glass',
    color: '#f8fafc',
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.35
  }
};

export class MaterialManager {
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  /**
   * Returns a cached or newly created MeshStandardMaterial for the given preset name.
   */
  public getMaterial(presetKey: string = 'painted_steel_blue', customOverrides?: Partial<MaterialPresetDef>): THREE.MeshStandardMaterial {
    const key = `${presetKey}_${JSON.stringify(customOverrides || {})}`;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key)!;
    }

    const preset = INDUSTRIAL_MATERIAL_PRESETS[presetKey] || INDUSTRIAL_MATERIAL_PRESETS['painted_steel_blue'];
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(customOverrides?.color || preset.color),
      roughness: customOverrides?.roughness !== undefined ? customOverrides.roughness : preset.roughness,
      metalness: customOverrides?.metalness !== undefined ? customOverrides.metalness : preset.metalness,
      transparent: customOverrides?.transparent !== undefined ? customOverrides.transparent : (preset.transparent || false),
      opacity: customOverrides?.opacity !== undefined ? customOverrides.opacity : (preset.opacity !== undefined ? preset.opacity : 1.0),
      emissive: new THREE.Color(customOverrides?.emissive || preset.emissive || 0x000000),
      emissiveIntensity: customOverrides?.emissiveIntensity !== undefined ? customOverrides.emissiveIntensity : (preset.emissiveIntensity || 0.0)
    });

    this.materialCache.set(key, mat);
    return mat;
  }

  /**
   * Clones a material for an object instance if unique dynamic color manipulation is needed.
   */
  public createInstanceMaterial(presetKey: string = 'painted_steel_blue', customOverrides?: Partial<MaterialPresetDef>): THREE.MeshStandardMaterial {
    const base = this.getMaterial(presetKey, customOverrides);
    return base.clone();
  }

  /**
   * Applies dynamic runtime state (e.g. alarm emissive flash, running color shift) to a mesh.
   */
  public applyDynamicState(
    mesh: THREE.Mesh,
    opts: {
      color?: string;
      emissive?: string;
      emissiveIntensity?: number;
      opacity?: number;
      visible?: boolean;
    }
  ): void {
    if (opts.visible !== undefined) {
      mesh.visible = opts.visible;
    }

    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (!mat || !mat.isMeshStandardMaterial) return;

    if (opts.color) {
      mat.color.set(opts.color);
    }
    if (opts.emissive) {
      mat.emissive.set(opts.emissive);
      mat.emissiveIntensity = opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0.8;
    } else if (opts.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = opts.emissiveIntensity;
    }
    if (opts.opacity !== undefined) {
      mat.opacity = opts.opacity;
      mat.transparent = opts.opacity < 1.0;
    }
  }

  /**
   * Disposes all cached materials to free GPU memory.
   */
  public dispose(): void {
    this.materialCache.forEach(mat => mat.dispose());
    this.materialCache.clear();
  }
}
