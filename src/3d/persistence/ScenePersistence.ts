import { Scada3dScene } from '../types/scene';

const SCENES_STORAGE_KEY = 'tasc_3d_scenes_v1';
const ACTIVE_SCENE_ID_KEY = 'tasc_3d_active_scene_id';

export class ScenePersistence {
  /**
   * Loads all saved 3D scenes from storage.
   */
  public static loadAllScenes(): Scada3dScene[] {
    if (typeof localStorage === 'undefined') return [this.createDefaultDemoScene()];

    try {
      const raw = localStorage.getItem(SCENES_STORAGE_KEY);
      if (!raw) {
        const defaultScene = this.createDefaultDemoScene();
        this.saveScene(defaultScene);
        return [defaultScene];
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }

      const defaultScene = this.createDefaultDemoScene();
      this.saveScene(defaultScene);
      return [defaultScene];
    } catch (err) {
      console.error('[ScenePersistence] Failed to parse saved 3D scenes, creating default:', err);
      const defaultScene = this.createDefaultDemoScene();
      return [defaultScene];
    }
  }

  /**
   * Saves or updates a 3D scene in storage.
   */
  public static saveScene(scene: Scada3dScene): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const scenes = this.loadAllScenes();
      const idx = scenes.findIndex(s => s.id === scene.id);

      const updatedScene: Scada3dScene = {
        ...scene,
        version: 1,
        updatedAt: Date.now()
      };

      if (idx >= 0) {
        scenes[idx] = updatedScene;
      } else {
        scenes.push(updatedScene);
      }

      localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenes));
      localStorage.setItem(ACTIVE_SCENE_ID_KEY, updatedScene.id);
    } catch (err) {
      console.error('[ScenePersistence] Failed to save 3D scene:', err);
    }
  }

  /**
   * Deletes a scene by ID.
   */
  public static deleteScene(sceneId: string): Scada3dScene[] {
    if (typeof localStorage === 'undefined') return [];

    try {
      let scenes = this.loadAllScenes().filter(s => s.id !== sceneId);
      if (scenes.length === 0) {
        scenes = [this.createDefaultDemoScene()];
      }
      localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenes));
      return scenes;
    } catch (err) {
      console.error('[ScenePersistence] Failed to delete scene:', err);
      return [];
    }
  }

  /**
   * Returns the ID of the active scene.
   */
  public static getActiveSceneId(): string {
    if (typeof localStorage === 'undefined') return 'scene_plant_overview';
    return localStorage.getItem(ACTIVE_SCENE_ID_KEY) || 'scene_plant_overview';
  }

  /**
   * Creates the Initial High-Fidelity Industrial Demonstration Scene.
   */
  public static createDefaultDemoScene(): Scada3dScene {
    return {
      id: 'scene_plant_overview',
      name: 'Process Plant 3D Overview',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      environment: {
        backgroundColor: '#0f172a',
        gridVisible: true,
        gridSize: 30,
        gridDivisions: 30,
        axisHelperVisible: true,
        axisHelperSize: 3,
        fogEnabled: false,
        fogColor: '#0f172a',
        fogNear: 20,
        fogFar: 80
      },
      camera: {
        projection: 'perspective',
        position: { x: 12, y: 10, z: 14 },
        target: { x: 0, y: 1, z: 0 },
        fov: 45,
        zoom: 1,
        near: 0.1,
        far: 1000
      },
      savedViews: [
        {
          id: 'view_isometric',
          name: 'Plant Isometric',
          camera: {
            projection: 'perspective',
            position: { x: 12, y: 10, z: 14 },
            target: { x: 0, y: 1, z: 0 },
            fov: 45,
            zoom: 1,
            near: 0.1,
            far: 1000
          }
        },
        {
          id: 'view_pump_skid',
          name: 'Pump Skid Area',
          camera: {
            projection: 'perspective',
            position: { x: 4, y: 3, z: 5 },
            target: { x: 0, y: 0.8, z: 0 },
            fov: 45,
            zoom: 1,
            near: 0.1,
            far: 1000
          }
        }
      ],
      lights: [
        {
          id: 'ambient_light',
          type: 'ambient',
          color: '#ffffff',
          intensity: 0.6
        },
        {
          id: 'key_directional_light',
          type: 'directional',
          color: '#fff8ed',
          intensity: 1.2,
          position: { x: 15, y: 25, z: 20 },
          castShadow: true
        },
        {
          id: 'fill_directional_light',
          type: 'directional',
          color: '#dbeafe',
          intensity: 0.5,
          position: { x: -18, y: 12, z: -15 }
        }
      ],
      objects: [
        // 1. Centrifugal Process Pump Skid
        {
          id: 'PUMP-101',
          name: 'Centrifugal Feed Pump P-101',
          assetId: 'pumps.centrifugal.end_suction',
          assetType: 'parametric',
          symbolId: 'pumps.centrifugal.end_suction.3d',
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          materialPreset: 'painted_steel_blue',
          equipmentDescription: 'Primary chemical feed pump driven by TEFC induction motor.',
          bindings: [
            {
              id: 'b_pump_run',
              property: 'running',
              subPartId: 'impeller',
              dataSourceMode: 'mqtt',
              topic: 'plant/pumps/pump101',
              jsonPath: '$.running',
              animationType: 'continuous_spin',
              spinAxis: 'x',
              spinDirection: 'cw',
              baseSpeedRpm: 300
            },
            {
              id: 'b_pump_fan_sinewave',
              property: 'speed',
              subPartId: 'cooling_fan',
              dataSourceMode: 'mqtt',
              topic: 'simulator/sinewave',
              signalMode: 'analog',
              minRaw: 0,
              maxRaw: 3000,
              minTarget: 300,
              maxTarget: 2400,
              axis: 'x',
              direction: 'cw'
            }
          ]
        },

        // 2. Storage Tank with Dynamic Fluid Level
        {
          id: 'TANK-101',
          name: 'Bulk Process Tank T-101',
          assetId: 'tanks.vertical_storage',
          assetType: 'parametric',
          symbolId: 'tank_vertical',
          transform: {
            position: { x: -5.5, y: 0, z: -2.5 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          materialPreset: 'stainless_steel',
          equipmentDescription: 'Vertical stainless steel process fluid reservoir.',
          bindings: [
            {
              id: 'b_tank_level',
              property: 'level',
              targetNodeName: 'Fluid_Level',
              dataSourceMode: 'mqtt',
              topic: 'plant/tanks/tank101',
              jsonPath: '$.level',
              animationType: 'fluid_level',
              minRaw: 0,
              maxRaw: 100
            }
          ]
        },

        // 3. Wafer Butterfly Valve
        {
          id: 'VALVE-101',
          name: 'Discharge Butterfly Valve V-101',
          assetId: 'valves.butterfly_wafer',
          assetType: 'parametric',
          symbolId: 'valve_control',
          transform: {
            position: { x: 4.2, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          materialPreset: 'cast_iron',
          equipmentDescription: 'Pneumatic actuated wafer disc throttle valve.',
          bindings: [
            {
              id: 'b_valve_pos',
              property: 'position',
              targetNodeName: 'Valve_Disc',
              subPartId: 'valve_disc',
              dataSourceMode: 'mqtt',
              topic: 'plant/valves/valve101',
              jsonPath: '$.position',
              animationType: 'variable_rotation',
              rotationAxis: 'y',
              axis: 'y',
              rotationMinDeg: 0,
              rotationMaxDeg: 90
            }
          ]
        },

        // 4. Industrial Vane Axial Duct Fan
        {
          id: 'FAN-101',
          name: 'Exhaust Ventilation Fan F-101',
          assetId: 'fans.vane_axial.heavy_duty',
          assetType: 'parametric',
          symbolId: 'fans.vane_axial.heavy_duty.flat2d',
          transform: {
            position: { x: 0, y: 0, z: 4.8 },
            rotation: { x: 0, y: 90, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          materialPreset: 'galvanized_zinc',
          equipmentDescription: 'Heavy-duty tubular vane axial ventilation blower.',
          bindings: [
            {
              id: 'b_fan_run',
              property: 'running',
              targetNodeName: 'Fan_Blades',
              dataSourceMode: 'mqtt',
              topic: 'plant/fans/fan101',
              jsonPath: '$.running',
              animationType: 'continuous_spin',
              spinAxis: 'x',
              spinDirection: 'ccw',
              baseSpeedRpm: 240
            }
          ]
        },

        // 5. Industrial Box Wall Exhaust Fan with Sinewave Speed & Damper Dynamics
        {
          id: 'WALL-435',
          name: 'Box Wall Exhaust Fan EF-435',
          assetId: 'fans.box_wall_exhaust',
          assetType: 'parametric',
          symbolId: 'fans.box_wall_exhaust.flat2d',
          transform: {
            position: { x: -2.5, y: 0, z: 3.5 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          materialPreset: 'painted_steel_blue',
          equipmentDescription: 'Heavy square-frame wall exhaust fan with 6-blade aerodynamic impeller and gravity louvers.',
          bindings: [
            {
              id: 'b_boxfan_spin',
              name: 'Impeller Sinewave 0-100% Speed',
              property: 'speed',
              subPartId: 'impeller',
              dataSourceMode: 'mqtt',
              topic: 'plant/fans/speed',
              signalMode: 'analog',
              minRaw: 0,
              maxRaw: 100,
              minTarget: 0,
              maxTarget: 1800,
              axis: 'z',
              direction: 'cw'
            },
            {
              id: 'b_boxfan_dampers',
              name: 'Dampers 0-70° Travel',
              property: 'angular_position',
              subPartId: 'louvers',
              dataSourceMode: 'mqtt',
              topic: 'plant/fans/speed',
              signalMode: 'analog',
              minRaw: 0,
              maxRaw: 100,
              rotationMinDeg: 0,
              rotationMaxDeg: 70,
              axis: 'x',
              direction: 'cw'
            }
          ]
        },

        // 6. Dual-Fan Crossflow Induced-Draft Cooling Tower
        {
          id: 'CT-802',
          name: 'Dual-Fan Cooling Tower CT-802',
          assetId: 'thermal.dual_fan_cooling_tower',
          assetType: 'parametric',
          symbolId: 'thermal.dual_fan_cooling_tower',
          transform: {
            position: { x: 5.5, y: 0, z: -3.5 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          materialPreset: 'galvanized_zinc',
          equipmentDescription: 'Heavy dual-fan industrial crossflow cooling tower with top aerodynamic fan stacks, wire dome grilles, and intake louvers.',
          bindings: [
            {
              id: 'b_cooling_tower_fans_speed',
              name: 'Dual Fans 0-100% Sinewave Speed',
              property: 'speed',
              subPartId: 'fans',
              dataSourceMode: 'mqtt',
              topic: 'plant/fans/speed',
              signalMode: 'analog',
              minRaw: 0,
              maxRaw: 100,
              minTarget: 0,
              maxTarget: 1600,
              axis: 'y',
              direction: 'cw'
            }
          ]
        }
      ]
    };
  }
}
