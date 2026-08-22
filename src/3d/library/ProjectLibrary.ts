/**
 * ProjectLibrary.ts
 * Manages the TASC IIoT Studio 3D Assembly Project Library.
 * Storage: localStorage key 'tasc_project_library_v1'
 */

import { Scada3dObject, Scada3dEnvironmentConfig, Scada3dCameraConfig } from '../types/scene';

const STORAGE_KEY = 'tasc_project_library_v1';

export interface Scada3dAssembly {
  assemblyId: string;
  name: string;
  category?: string;
  isPreset?: boolean;
  description?: string;
  thumbnail?: string;
  tagCount: number;
  objectCount: number;
  sceneDescriptor: {
    objects: Scada3dObject[];
    environment: Pick<Scada3dEnvironmentConfig, 'backgroundColor'>;
    camera: Scada3dCameraConfig;
  };
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ASSEMBLIES: Scada3dAssembly[] = [
  // 1. Diesel Generator Backup Power Station
  {
    assemblyId: 'asm_diesel_generator_station',
    name: 'Industrial Diesel Generator Set (DG-01)',
    category: 'Power Generation',
    isPreset: true,
    description: 'Continuous heavy-duty diesel engine generator set with 3D rotating rotor shaft, radiator fan, and alarm glow status.',
    tagCount: 3,
    objectCount: 1,
    sceneDescriptor: {
      objects: [
        {
          id: 'dg_genset_01',
          name: 'Diesel Generator DG-01',
          assetId: 'generators.diesel_genset',
          assetType: 'parametric',
          transform: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          bindings: [
            {
              id: 'b_dg_rotor',
              name: 'Alternator Rotor Spin',
              property: 'continuous_spin',
              subPartId: 'rotor',
              axis: 'x',
              direction: 'cw',
              signalMode: 'digital',
              dataSourceMode: 'mqtt',
              topic: 'plant/generator/running',
              activeSpeedRpm: 1500
            },
            {
              id: 'b_dg_fan',
              name: 'Radiator Fan Rotation',
              property: 'continuous_spin',
              subPartId: 'cooling_fan',
              axis: 'x',
              direction: 'cw',
              signalMode: 'digital',
              dataSourceMode: 'mqtt',
              topic: 'plant/generator/running',
              activeSpeedRpm: 2200
            },
            {
              id: 'b_dg_alarm',
              name: 'Alarm Status Emissive Glow',
              property: 'emissive_glow',
              dataSourceMode: 'mqtt',
              topic: 'plant/generator/alarm_status',
              thresholds: [
                { id: 't_dg1', condition: '=', value: 'TRIP', emissive: '#ef4444', emissiveIntensity: 1.2, pulse: true, label: 'Generator Trip' },
                { id: 't_dg2', condition: '=', value: 'WARN', emissive: '#f59e0b', emissiveIntensity: 0.7, pulse: false, label: 'High Oil Temp' }
              ]
            }
          ]
        }
      ],
      environment: { backgroundColor: '#020617' },
      camera: {
        projection: 'perspective',
        position: { x: 5, y: 4, z: 5 },
        target: { x: 0, y: 0.8, z: 0 },
        fov: 45,
        zoom: 1,
        near: 0.1,
        far: 500
      }
    },
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z'
  },
  // 2. Dual Pump Duty/Standby Station
  {
    assemblyId: 'asm_pump_station_dual',
    name: 'Dual Pump Duty/Standby Pumping Station',
    category: 'Pumping Systems',
    isPreset: true,
    description: 'Lead/Lag redundant centrifugal pumping station with isolation butterfly valves and electric motor drives.',
    tagCount: 4,
    objectCount: 4,
    sceneDescriptor: {
      objects: [
        {
          id: 'pump_lead_01',
          name: 'Lead Pump & Motor Skid (P-101)',
          assetId: 'pumps.centrifugal.end_suction',
          assetType: 'parametric',
          transform: {
            position: { x: -1.8, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          bindings: [
            { id: 'b_p1_run', property: 'running', dataSourceMode: 'mqtt', topic: 'plant/pumps/p101/status', animationType: 'continuous_spin', baseSpeedRpm: 1500 }
          ]
        },
        {
          id: 'valve_p1_iso',
          name: 'Discharge Isolation Valve (XV-101)',
          assetId: 'valves.butterfly_wafer',
          assetType: 'parametric',
          transform: {
            position: { x: -2.3, y: 1.3, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.8, y: 0.8, z: 0.8 }
          },
          bindings: [
            { id: 'b_xv101', property: 'rotation_angle', dataSourceMode: 'mqtt', topic: 'plant/valves/xv101/pos', animationType: 'variable_rotation' }
          ]
        },
        {
          id: 'pump_standby_02',
          name: 'Standby Pump & Motor Skid (P-102)',
          assetId: 'pumps.centrifugal.end_suction',
          assetType: 'parametric',
          transform: {
            position: { x: 1.8, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          bindings: [
            { id: 'b_p2_run', property: 'running', dataSourceMode: 'mqtt', topic: 'plant/pumps/p102/status', animationType: 'continuous_spin', baseSpeedRpm: 1500 }
          ]
        },
        {
          id: 'valve_p2_iso',
          name: 'Discharge Isolation Valve (XV-102)',
          assetId: 'valves.butterfly_wafer',
          assetType: 'parametric',
          transform: {
            position: { x: 1.3, y: 1.3, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.8, y: 0.8, z: 0.8 }
          },
          bindings: [
            { id: 'b_xv102', property: 'rotation_angle', dataSourceMode: 'mqtt', topic: 'plant/valves/xv102/pos', animationType: 'variable_rotation' }
          ]
        }
      ],
      environment: { backgroundColor: '#0f172a' },
      camera: {
        projection: 'perspective',
        position: { x: 0, y: 3.5, z: 6.5 },
        target: { x: 0, y: 0.8, z: 0 },
        fov: 45,
        zoom: 1,
        near: 0.1,
        far: 1000
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // 2. Chemical Dosing & Reaction Skid
  {
    assemblyId: 'asm_chemical_reactor_skid',
    name: 'Chemical Agitator Reactor & Dosing Skid',
    category: 'Process & Reaction',
    isPreset: true,
    description: 'Jacketed chemical reactor with rotating turbine agitator, multi-stage dosing pump, and globe control valve.',
    tagCount: 3,
    objectCount: 3,
    sceneDescriptor: {
      objects: [
        {
          id: 'rx_vessel_101',
          name: 'Chemical Reactor (R-101)',
          assetId: 'tanks.agitator_reactor',
          assetType: 'parametric',
          transform: {
            position: { x: -1.6, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          bindings: [
            { id: 'b_rx_agit', property: 'running', dataSourceMode: 'mqtt', topic: 'plant/reactors/r101/agitator', animationType: 'continuous_spin', baseSpeedRpm: 120 }
          ]
        },
        {
          id: 'feed_ctrl_valve',
          name: 'Feed Control Valve (FCV-101)',
          assetId: 'valves.globe_control',
          assetType: 'parametric',
          transform: {
            position: { x: 0.4, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.9, y: 0.9, z: 0.9 }
          },
          bindings: [
            { id: 'b_fcv101', property: 'position', dataSourceMode: 'mqtt', topic: 'plant/valves/fcv101/position', animationType: 'linear_travel' }
          ]
        },
        {
          id: 'dosing_pump_101',
          name: 'Chemical Feed Pump (P-201)',
          assetId: 'pumps.multistage.horizontal',
          assetType: 'parametric',
          transform: {
            position: { x: 2.2, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.85, y: 0.85, z: 0.85 }
          },
          bindings: [
            { id: 'b_p201_run', property: 'running', dataSourceMode: 'mqtt', topic: 'plant/pumps/p201/status', animationType: 'continuous_spin', baseSpeedRpm: 2900 }
          ]
        }
      ],
      environment: { backgroundColor: '#0f172a' },
      camera: {
        projection: 'perspective',
        position: { x: 0, y: 4.0, z: 7.5 },
        target: { x: 0, y: 1.5, z: 0 },
        fov: 45,
        zoom: 1,
        near: 0.1,
        far: 1000
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // 3. Cooling Tower & Thermal Loop
  {
    assemblyId: 'asm_cooling_loop_skid',
    name: 'Cooling Tower & Heat Exchanger Loop',
    category: 'Thermal & HVAC',
    isPreset: true,
    description: 'Induced draft cooling tower cell with circulating water pump and shell & tube heat exchanger.',
    tagCount: 3,
    objectCount: 3,
    sceneDescriptor: {
      objects: [
        {
          id: 'ct_cell_01',
          name: 'Cooling Tower Cell (CT-101)',
          assetId: 'thermal.cooling_tower_cell',
          assetType: 'parametric',
          transform: {
            position: { x: -2.4, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          bindings: [
            { id: 'b_ct_fan', property: 'running', dataSourceMode: 'mqtt', topic: 'plant/cooling/ct101/fan_run', animationType: 'continuous_spin', baseSpeedRpm: 450 }
          ]
        },
        {
          id: 'ct_circ_pump',
          name: 'Circulation Pump Skid (P-301)',
          assetId: 'pumps.centrifugal.end_suction',
          assetType: 'parametric',
          transform: {
            position: { x: 0.5, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.9, y: 0.9, z: 0.9 }
          },
          bindings: [
            { id: 'b_p301', property: 'running', dataSourceMode: 'mqtt', topic: 'plant/cooling/p301/run', animationType: 'continuous_spin', baseSpeedRpm: 1500 }
          ]
        },
        {
          id: 'hx_condenser',
          name: 'Process Heat Exchanger (E-101)',
          assetId: 'thermal.shell_tube_exchanger',
          assetType: 'parametric',
          transform: {
            position: { x: 2.8, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.9, y: 0.9, z: 0.9 }
          },
          bindings: []
        }
      ],
      environment: { backgroundColor: '#0f172a' },
      camera: {
        projection: 'perspective',
        position: { x: 0, y: 4.2, z: 8.5 },
        target: { x: 0, y: 1.5, z: 0 },
        fov: 45,
        zoom: 1,
        near: 0.1,
        far: 1000
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // 4. Bulk Storage Silo & Discharge Conveyor
  {
    assemblyId: 'asm_silo_conveyor_system',
    name: 'Bulk Silo & Conveyor Handling System',
    category: 'Bulk & Material Handling',
    isPreset: true,
    description: 'Bulk material storage silo hopper with discharge conveyor bed and heavy-duty speed reducer gearbox.',
    tagCount: 2,
    objectCount: 3,
    sceneDescriptor: {
      objects: [
        {
          id: 'bulk_silo_01',
          name: 'Cement Silo Hopper (S-101)',
          assetId: 'tanks.conical_silo',
          assetType: 'parametric',
          transform: {
            position: { x: -2.0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.9, y: 0.9, z: 0.9 }
          },
          bindings: []
        },
        {
          id: 'discharge_conveyor',
          name: 'Discharge Belt Conveyor (CV-101)',
          assetId: 'conveyors.belt_section',
          assetType: 'parametric',
          transform: {
            position: { x: 1.2, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          bindings: [
            { id: 'b_cv101', property: 'running', dataSourceMode: 'mqtt', topic: 'plant/conveyors/cv101/run', animationType: 'continuous_spin', baseSpeedRpm: 60 }
          ]
        },
        {
          id: 'drive_gearbox',
          name: 'Conveyor Drive Gearbox (GB-101)',
          assetId: 'drives.gearbox_reducer',
          assetType: 'parametric',
          transform: {
            position: { x: 3.4, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.8, y: 0.8, z: 0.8 }
          },
          bindings: [
            { id: 'b_gb101', property: 'running', dataSourceMode: 'mqtt', topic: 'plant/conveyors/cv101/run', animationType: 'continuous_spin', baseSpeedRpm: 120 }
          ]
        }
      ],
      environment: { backgroundColor: '#0f172a' },
      camera: {
        projection: 'perspective',
        position: { x: 0, y: 4.5, z: 9.0 },
        target: { x: 0, y: 1.8, z: 0 },
        fov: 45,
        zoom: 1,
        near: 0.1,
        far: 1000
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export class ProjectLibrary {
  static getAll(): Scada3dAssembly[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Initialize with default assemblies if empty
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ASSEMBLIES));
        return DEFAULT_ASSEMBLIES;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge any missing default presets
        let modified = false;
        const merged = [...parsed];
        for (const def of DEFAULT_ASSEMBLIES) {
          if (!merged.some(a => a.assemblyId === def.assemblyId)) {
            merged.push(def);
            modified = true;
          }
        }
        if (modified) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
        return merged;
      }
      return DEFAULT_ASSEMBLIES;
    } catch {
      return DEFAULT_ASSEMBLIES;
    }
  }

  static save(assembly: Scada3dAssembly): void {
    const all = ProjectLibrary.getAll();
    const idx = all.findIndex(a => a.assemblyId === assembly.assemblyId);
    if (idx >= 0) {
      all[idx] = { ...assembly, updatedAt: new Date().toISOString() };
    } else {
      all.push(assembly);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      const stripped = all.map(a => ({ ...a, thumbnail: undefined }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
    }
  }

  static delete(assemblyId: string): void {
    const all = ProjectLibrary.getAll().filter(a => a.assemblyId !== assemblyId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  static getById(assemblyId: string): Scada3dAssembly | null {
    return ProjectLibrary.getAll().find(a => a.assemblyId === assemblyId) || null;
  }

  static count(): number {
    return ProjectLibrary.getAll().length;
  }

  static captureCanvasThumbnail(canvas: HTMLCanvasElement): string | undefined {
    try {
      const thumb = document.createElement('canvas');
      thumb.width = 80; thumb.height = 80;
      const ctx = thumb.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 80, 80);
      return thumb.toDataURL('image/png');
    } catch { return undefined; }
  }

  static countTags(objects: Scada3dObject[]): number {
    return objects.reduce((acc, o) => acc + (o.bindings?.length || 0), 0);
  }
}
