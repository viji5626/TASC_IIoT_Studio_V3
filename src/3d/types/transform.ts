export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';

export type CoordinateSpace = 'world' | 'local';

export interface TransformSnapConfig {
  enabled: boolean;
  translation: number; // e.g. 0.1, 0.5, 1.0 meters
  rotationDeg: number;  // e.g. 1, 5, 15, 45, 90 degrees
  scale: number;        // e.g. 0.1, 0.5
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Euler3D {
  x: number; // in radians
  y: number;
  z: number;
  order?: 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY';
}

export interface ObjectTransformData {
  position: Vector3D;
  rotation: Vector3D; // Stored in degrees for easy human inspection/editing
  scale: Vector3D;
}
