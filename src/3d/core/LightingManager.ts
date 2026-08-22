import * as THREE from 'three';
import { Scada3dLightConfig } from '../types/scene';

export class LightingManager {
  private scene: THREE.Scene;
  private lightsGroup: THREE.Group;
  private ambientLight: THREE.AmbientLight | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lightsGroup = new THREE.Group();
    this.lightsGroup.name = '__SCADA_3D_LIGHTS__';
    this.scene.add(this.lightsGroup);
  }

  /**
   * Initializes high-visibility industrial facility lighting preset.
   */
  public setupDefaultIndustrialLighting(): void {
    this.clear();

    // 1. Balanced Ambient Light (avoids pitch black shadow voids)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.ambientLight.name = 'ambient_light';
    this.lightsGroup.add(this.ambientLight);

    // 2. High-Bay Overhead Key Light
    this.keyLight = new THREE.DirectionalLight(0xfff8ed, 1.2);
    this.keyLight.name = 'key_directional_light';
    this.keyLight.position.set(15, 25, 20);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 100;
    const shadowDist = 20;
    this.keyLight.shadow.camera.left = -shadowDist;
    this.keyLight.shadow.camera.right = shadowDist;
    this.keyLight.shadow.camera.top = shadowDist;
    this.keyLight.shadow.camera.bottom = -shadowDist;
    this.keyLight.shadow.bias = -0.0005;
    this.lightsGroup.add(this.keyLight);

    // 3. Counter Fill Light (illuminates machinery undersides and side ports)
    this.fillLight = new THREE.DirectionalLight(0xdbeafe, 0.5);
    this.fillLight.name = 'fill_directional_light';
    this.fillLight.position.set(-18, 12, -15);
    this.lightsGroup.add(this.fillLight);

    // 4. Hemisphere Light (Soft Sky tint + Warm Concrete ground reflection)
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.4);
    this.hemiLight.name = 'hemi_light';
    this.lightsGroup.add(this.hemiLight);
  }

  /**
   * Applies custom lighting configurations from a saved scene.
   */
  public applyConfig(configs: Scada3dLightConfig[]): void {
    if (!configs || configs.length === 0) {
      this.setupDefaultIndustrialLighting();
      return;
    }

    this.clear();

    configs.forEach(cfg => {
      let light: THREE.Light;
      const color = new THREE.Color(cfg.color);

      switch (cfg.type) {
        case 'ambient':
          light = new THREE.AmbientLight(color, cfg.intensity);
          break;
        case 'directional':
          light = new THREE.DirectionalLight(color, cfg.intensity);
          if (cfg.position) light.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
          if (cfg.castShadow) light.castShadow = true;
          break;
        case 'point':
          light = new THREE.PointLight(color, cfg.intensity, 20, 2);
          if (cfg.position) light.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
          break;
        case 'spot':
          light = new THREE.SpotLight(color, cfg.intensity, 30, Math.PI / 4, 0.3);
          if (cfg.position) light.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
          break;
        default:
          light = new THREE.AmbientLight(color, cfg.intensity);
      }

      light.name = cfg.id;
      this.lightsGroup.add(light);
    });
  }

  /**
   * Clears all lights from the group.
   */
  public clear(): void {
    while (this.lightsGroup.children.length > 0) {
      const child = this.lightsGroup.children[0];
      this.lightsGroup.remove(child);
      if ('dispose' in child && typeof (child as any).dispose === 'function') {
        (child as any).dispose();
      }
    }
  }

  /**
   * Disposes the lighting manager.
   */
  public dispose(): void {
    this.clear();
    this.scene.remove(this.lightsGroup);
  }
}
