import type { Bounds, Vec3 } from '../game/types';
import type { GeoOrigin, GeoPoint } from '../utils/geo';

export interface GeoFeature {
  id: number;
  name?: string;
  kind: string;
  points: GeoPoint[];
  height?: number;
  levels?: number;
  minHeight?: number;
  roofHeight?: number;
  roofShape?: string;
  buildingMaterial?: string;
  facadeColor?: string;
  roofColor?: string;
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

export interface ElevationGrid {
  source: string;
  sourceUrl: string;
  capturedAt: string;
  bounds: { south: number; west: number; north: number; east: number };
  rows: number;
  columns: number;
  originElevation: number;
  rawOriginElevation?: number;
  minElevation: number;
  maxElevation: number;
  values: number[];
}

export interface LoadedAreaData {
  config: AreaConfig;
  snapshot: AreaSnapshot;
  minimap: AreaSnapshot;
  elevation: ElevationGrid;
  chunkSource: AreaChunkSource;
  visuals?: AreaVisualConfig;
  airspace?: AreaAirspaceData;
}

export interface AreaChunkManifest {
  key: string;
  file: string;
  x: number;
  z: number;
}

export interface AreaChunkSource {
  readonly chunkSize: number;
  keysAround(x: number, z: number, radius: number): string[];
  load(key: string): Promise<AreaSnapshot>;
  release?(key: string): void;
}

export interface BuildingPhotoTexture {
  featureIds: number[];
  url: string;
  /** Optional clockwise facade photos. Falls back to url when omitted. */
  sideUrls?: string[];
  attribution: string;
  license: string;
  sourceUrl?: string;
  licenseUrl?: string;
}

export interface AreaVisualConfig {
  buildingPhotoTextures?: BuildingPhotoTexture[];
}

export type AirspaceZoneKind = 'information' | 'caution' | 'restricted';

export interface AirspaceZone {
  id: string;
  label: string;
  description: string;
  kind: AirspaceZoneKind;
  points: Array<Pick<Vec3, 'x' | 'z'>>;
  minimumAltitude: number;
  maximumAltitude: number;
}

export interface AreaAirspaceData {
  status: 'unavailable' | 'advisory';
  capturedAt?: string;
  sourceUrl?: string;
  zones: AirspaceZone[];
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
