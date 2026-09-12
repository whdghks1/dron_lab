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
  details?: AreaDetailConfig;
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
  /** Directional photos override sideUrls and leave unlisted facades procedural. */
  facades?: FacadePhotoSide[];
  attribution: string;
  license: string;
  sourceUrl?: string;
  licenseUrl?: string;
}

export type FacadeDirection = 'north' | 'east' | 'south' | 'west';

export interface FacadePhotoSide {
  direction: FacadeDirection;
  url: string;
  repeat?: [number, number];
  offset?: [number, number];
}

export interface AreaVisualConfig {
  buildingPhotoTextures?: BuildingPhotoTexture[];
}

export type DetailDataOrigin = 'osm' | 'estimated' | 'authored';
export type DetailMaterialPreset = 'old-concrete' | 'light-concrete' | 'stone-bank' | 'paving-stone' | 'cycleway' | 'wet-edge' | 'metal-rail' | 'grass-soil';

export interface BridgeVisualOverride {
  featureId: number;
  deckWidth?: number;
  deckThickness?: number;
  deckClearance?: number;
  pierCount?: number;
  pierWidth?: number;
  railType?: 'metal' | 'solid' | 'none';
  materialPreset?: DetailMaterialPreset;
  modelUrl?: string;
  dataOrigin?: DetailDataOrigin;
}

export type RiverbankProfile = 'concrete-slope' | 'vertical-wall' | 'stone-bank' | 'grass-slope' | 'walkway-edge';

export interface RiverbankAccessConfig {
  position: GeoPoint;
  width?: number;
  steps?: number;
  rotation?: number;
  dataOrigin: DetailDataOrigin;
}

export interface RiverbankSegmentConfig {
  featureId: number;
  profile: RiverbankProfile;
  side: 'left' | 'right' | 'both';
  startFraction?: number;
  endFraction?: number;
  bankWidth?: number;
  bankHeight?: number;
  railing?: boolean;
  materialPreset?: DetailMaterialPreset;
  dataOrigin: DetailDataOrigin;
}

export type PropAssetId = 'river-railing' | 'street-lamp' | 'bench' | 'trash-bin' | 'bike-rack' | 'information-sign' | 'bollard';

export interface PropPlacementRule {
  targetFeatureId?: number;
  targetKind?: string;
  assetId: PropAssetId;
  spacing: number;
  lateralOffset: number;
  side: 'left' | 'right' | 'both';
  rotationOffset?: number;
  startOffset?: number;
  endOffset?: number;
  quality: Array<'low' | 'medium' | 'high'>;
  dataOrigin: DetailDataOrigin;
}

export interface AssetAttribution {
  name?: string;
  creator: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
}

export interface ColliderConfig {
  size: [number, number, number];
  offset?: [number, number, number];
  label?: string;
}

export interface LandmarkPlaceholderConfig {
  kind: 'waterfall';
  width: number;
  height: number;
  depth: number;
  rotation?: number;
  materialPreset?: DetailMaterialPreset;
  dataOrigin: DetailDataOrigin;
}

export interface LandmarkConfig {
  id: string;
  name: string;
  position: GeoPoint;
  modelUrl?: string;
  placeholder?: LandmarkPlaceholderConfig;
  attribution?: AssetAttribution;
  collider?: ColliderConfig;
}

export interface VegetationConfig {
  enabled: boolean;
  highDensityPerChunk?: number;
  exclusionRadiusFromPaths?: number;
  exclusionRadiusFromWater?: number;
  dataOrigin: DetailDataOrigin;
}

export interface AreaDetailConfig {
  bridgeOverrides?: BridgeVisualOverride[];
  riverbankSegments?: RiverbankSegmentConfig[];
  riverbankAccesses?: RiverbankAccessConfig[];
  propRules?: PropPlacementRule[];
  landmarks?: LandmarkConfig[];
  vegetation?: VegetationConfig;
  attributions?: AssetAttribution[];
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
