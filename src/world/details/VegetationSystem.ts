import * as THREE from 'three';
import type { Bounds } from '../../game/types';
import type { GeoFeature, VegetationConfig } from '../../areas/types';
import type { GeoOrigin } from '../../utils/geo';
import { geoToLocal } from '../../utils/geo';
import type { Quality } from '../World';
import { createInstancedMesh, type InstanceTransform } from './placement';

interface LocalPoint { x: number; z: number }

export function pointInPolygon(point: LocalPoint, polygon: LocalPoint[]): boolean {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const a = polygon[current];
    const b = polygon[previous];
    const intersects = ((a.z > point.z) !== (b.z > point.z)) && point.x < (b.x - a.x) * (point.z - a.z) / ((b.z - a.z) || 1e-9) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function distanceToPolyline(point: LocalPoint, line: LocalPoint[]): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 1; index < line.length; index += 1) {
    const from = line[index - 1];
    const to = line[index];
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const lengthSquared = dx * dx + dz * dz;
    const ratio = lengthSquared > 0 ? Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) / lengthSquared)) : 0;
    minimum = Math.min(minimum, Math.hypot(point.x - (from.x + dx * ratio), point.z - (from.z + dz * ratio)));
  }
  return minimum;
}

export function isVegetationPlacementAllowed(
  point: LocalPoint,
  buildings: LocalPoint[][],
  paths: LocalPoint[][],
  water: LocalPoint[][],
  pathRadius: number,
  waterRadius: number,
): boolean {
  if (buildings.some((polygon) => pointInPolygon(point, polygon))) return false;
  if (paths.some((line) => distanceToPolyline(point, line) < pathRadius)) return false;
  if (water.some((line) => pointInPolygon(point, line) || distanceToPolyline(point, line) < waterRadius)) return false;
  return true;
}

interface VegetationSystemOptions {
  origin: GeoOrigin;
  bounds: Bounds;
  heightAt: (x: number, z: number) => number;
  config?: VegetationConfig;
  quality: Quality;
  chunkSize: number;
  water: GeoFeature[];
}

interface TreePlacement extends InstanceTransform {
  type: number;
  tier: Quality;
}

const hash = (value: number) => {
  const sine = Math.sin(value * 12.9898) * 43758.5453;
  return sine - Math.floor(sine);
};

const QUALITY_COUNTS = (items: TreePlacement[]) => ({
  low: items.filter((item) => item.tier === 'low').length,
  medium: items.filter((item) => item.tier !== 'high').length,
  high: items.length,
});

export class VegetationSystem {
  private readonly localWater: LocalPoint[][];
  private readonly trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x625742, roughness: 1 });
  private readonly crownMaterials = [0x4f7f59, 0x3e704f, 0x6e8a55].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  private readonly farMaterial = new THREE.MeshStandardMaterial({ color: 0x58755a, roughness: 1 });

  constructor(private readonly options: VegetationSystemOptions) {
    this.localWater = options.water.map((feature) => feature.points.map((point) => geoToLocal(point, options.origin)));
  }

  setQuality(quality: Quality) { this.options.quality = quality; }

  buildChunk(
    chunk: { key: string; x: number; z: number },
    data: { buildings: GeoFeature[]; paths: GeoFeature[] },
    targetRoot: THREE.Object3D,
  ) {
    if (this.options.config?.enabled === false) return;
    const buildings = data.buildings.map((feature) => feature.points.map((point) => geoToLocal(point, this.options.origin)));
    const paths = data.paths.map((feature) => feature.points.map((point) => geoToLocal(point, this.options.origin)));
    const highCount = this.options.config?.highDensityPerChunk ?? 12;
    const placements: TreePlacement[] = [];
    const seed = chunk.key.split(':').reduce((sum, value, index) => sum + Number(value) * (index ? 917 : 613), 1701);
    const half = this.options.chunkSize / 2 - 7;
    for (let attempt = 0; attempt < highCount * 7 && placements.length < highCount; attempt += 1) {
      const x = chunk.x + (hash(seed + attempt * 5 + 1) * 2 - 1) * half;
      const z = chunk.z + (hash(seed + attempt * 7 + 2) * 2 - 1) * half;
      if (x < this.options.bounds.minX || x > this.options.bounds.maxX || z < this.options.bounds.minZ || z > this.options.bounds.maxZ) continue;
      if (!isVegetationPlacementAllowed(
        { x, z }, buildings, paths, this.localWater,
        this.options.config?.exclusionRadiusFromPaths ?? 3,
        this.options.config?.exclusionRadiusFromWater ?? 8,
      )) continue;
      const type = Math.floor(hash(seed + attempt * 13 + 4) * 3);
      const baseScale = 0.72 + hash(seed + attempt * 17 + 8) * 0.75;
      const originalIndex = placements.length;
      placements.push({
        position: new THREE.Vector3(x - chunk.x, this.options.heightAt(x, z), z - chunk.z),
        scale: new THREE.Vector3(baseScale * (0.88 + hash(seed + attempt * 19) * 0.24), baseScale, baseScale * (0.88 + hash(seed + attempt * 23) * 0.24)),
        rotationY: hash(seed + attempt * 29) * Math.PI * 2,
        type,
        tier: originalIndex % 4 === 0 ? 'low' : originalIndex % 2 === 0 ? 'medium' : 'high',
      });
    }

    const ordered = [...placements.filter((item) => item.tier === 'low'), ...placements.filter((item) => item.tier === 'medium'), ...placements.filter((item) => item.tier === 'high')];
    const counts = QUALITY_COUNTS(placements);
    const near = new THREE.Group();
    const trunkGeometry = new THREE.CylinderGeometry(0.28, 0.4, 3.1, 6);
    trunkGeometry.translate(0, 1.55, 0);
    this.addDensityMesh(near, trunkGeometry, this.trunkMaterial, ordered, counts, 'vegetation-trunks');
    const crownGeometries = [
      new THREE.SphereGeometry(1.65, 7, 5),
      new THREE.ConeGeometry(1.6, 4.8, 7),
      new THREE.DodecahedronGeometry(1.72, 0),
    ];
    crownGeometries[0].translate(0, 3.7, 0);
    crownGeometries[1].translate(0, 3.65, 0);
    crownGeometries[2].scale(1.2, 0.78, 1.05); crownGeometries[2].translate(0, 3.75, 0);
    crownGeometries.forEach((geometry, type) => {
      const typed = ordered.filter((item) => item.type === type);
      const typedCounts = QUALITY_COUNTS(typed);
      this.addDensityMesh(near, geometry, this.crownMaterials[type], typed, typedCounts, `vegetation-crown-${type}`);
    });
    const farGeometry = new THREE.ConeGeometry(1.55, 5.3, 4);
    farGeometry.translate(0, 2.65, 0);
    const far = new THREE.Group();
    this.addDensityMesh(far, farGeometry, this.farMaterial, ordered, counts, 'vegetation-far');
    const lod = new THREE.LOD();
    lod.name = `vegetation-lod-${chunk.key}`;
    lod.addLevel(near, 0);
    lod.addLevel(far, this.options.chunkSize * 0.78);
    targetRoot.add(lod);
  }

  private addDensityMesh(
    root: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    transforms: TreePlacement[],
    counts: Record<Quality, number>,
    name: string,
  ) {
    const mesh = createInstancedMesh(geometry, material, transforms, name, this.options.quality === 'high');
    if (!mesh) return;
    mesh.userData.qualityCounts = counts;
    mesh.count = counts[this.options.quality];
    root.add(mesh);
  }
}
