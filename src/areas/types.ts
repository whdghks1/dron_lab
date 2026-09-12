import type { Bounds, Vec3 } from '../game/types';
import type { GeoOrigin, GeoPoint } from '../utils/geo';

export interface GeoFeature {
  id: number;
  name?: string;
  kind: string;
  points: GeoPoint[];
  height?: number;
}

export interface AreaSnapshot {
  capturedAt: string;
  source: string;
  buildings: GeoFeature[];
  roads: GeoFeature[];
  paths: GeoFeature[];
  water: GeoFeature[];
  bridges: GeoFeature[];
  parks: GeoFeature[];
}

export interface CheckpointConfig {
  id: string;
  title: string;
  description: string;
  position: Vec3;
}

export interface AreaConfig {
  id: string;
  name: string;
  subtitle: string;
  origin: GeoOrigin;
  bounds: Bounds;
  start: Vec3;
  startYaw: number;
  checkpoints: CheckpointConfig[];
  sourceUrl: string;
}
