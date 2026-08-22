import { ObjectTransformData, Vector3D } from './transform';
import { Scada3dBinding } from './bindings';

export type CameraProjection = 'perspective' | 'orthographic';

export type CameraPresetView = 'isometric' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'custom';

export interface Scada3dCameraConfig {
  projection: CameraProjection;
  position: Vector3D;
  target: Vector3D;
  fov: number; // For perspective (default: 45)
  zoom: number; // For orthographic (default: 1)
  near: number;
  far: number;
}

export interface Scada3dSavedView {
  id: string;
  name: string;
  camera: Scada3dCameraConfig;
}

export interface Scada3dLightConfig {
  id: string;
  type: 'ambient' | 'directional' | 'point' | 'spot';
  color: string;
  intensity: number;
  position?: Vector3D;
  target?: Vector3D;
  castShadow?: boolean;
}

export type Scada3dAssetType = 'parametric' | 'glb' | 'gltf' | 'billboard_svg';

export interface Scada3dObject {
  id: string; // Stable Application ID (e.g. "PUMP-101")
  name: string; // Human readable label
  assetId: string; // Asset Registry ID (e.g. "pumps.centrifugal.end_suction")
  assetType: Scada3dAssetType;
  assetUri?: string; // URL or relative path to .glb file
  symbolId?: string; // Linked Industrial Graphics Library Symbol ID
  
  // Hierarchy
  parentId?: string | null; // ID of parent group or assembly
  childrenIds?: string[]; // IDs of grouped children
  isGroup?: boolean;
  locked?: boolean;
  visible?: boolean;

  // Spatial Transforms (meters & degrees)
  transform: ObjectTransformData;

  // Visual Styling & Materials
  materialPreset?: string; // 'painted_steel_blue' | 'stainless_steel' | 'cast_iron' | 'brass' | 'hazard_yellow' | etc.
  customColor?: string;
  customRoughness?: number;
  customMetalness?: number;
  opacity?: number;

  // SCADA Bindings & Animations
  bindings?: Scada3dBinding[];

  // Linked 2D SCADA Dashboard / Jump Target
  linkedDashboardId?: string;
  equipmentDescription?: string;
  tagGroup?: string;
}

export interface Scada3dEnvironmentConfig {
  backgroundColor: string;
  gridVisible: boolean;
  gridSize: number;
  gridDivisions: number;
  axisHelperVisible: boolean;
  axisHelperSize: number;
  fogEnabled: boolean;
  fogColor: string;
  fogNear: number;
  fogFar: number;
}

export interface Scada3dScene {
  id: string;
  name: string;
  version: number; // Schema version (v1)
  createdAt: number;
  updatedAt: number;
  
  environment: Scada3dEnvironmentConfig;
  camera: Scada3dCameraConfig;
  savedViews?: Scada3dSavedView[];
  lights: Scada3dLightConfig[];
  
  objects: Scada3dObject[];
}
