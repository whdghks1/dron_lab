import * as THREE from 'three';
import type { ElevationGrid, TerrainCorridorConfig } from '../areas/types';
import type { Bounds } from '../game/types';
import type { GeoOrigin } from '../utils/geo';
import { geoToLocal, localToGeo } from '../utils/geo';
import { clamp } from '../utils/math';

interface LocalCorridorPoint {
  x: number;
  z: number;
  height: number;
}

interface LocalCorridor {
  id: string;
  points: LocalCorridorPoint[];
  halfWidth: number;
  blendWidth: number;
}

function smoothstep(value: number) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function nearestCorridorSample(x: number, z: number, points: LocalCorridorPoint[]) {
  let nearest = { distance: Number.POSITIVE_INFINITY, height: 0 };
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const lengthSquared = dx * dx + dz * dz;
    const ratio = lengthSquared === 0 ? 0 : clamp(((x - from.x) * dx + (z - from.z) * dz) / lengthSquared, 0, 1);
    const nearestX = from.x + dx * ratio;
    const nearestZ = from.z + dz * ratio;
    const distance = Math.hypot(x - nearestX, z - nearestZ);
    if (distance < nearest.distance) nearest = { distance, height: from.height + (to.height - from.height) * ratio };
  }
  return nearest;
}

export class TerrainHeightField {
  private readonly corridors: LocalCorridor[];

  constructor(readonly grid: ElevationGrid, private readonly origin: GeoOrigin, corridors: TerrainCorridorConfig[] = []) {
    this.corridors = corridors
      .filter((corridor) => corridor.points.length >= 2)
      .map((corridor) => ({
        id: corridor.id,
        points: corridor.points.map((point) => ({ ...geoToLocal(point, origin), height: point.height })),
        halfWidth: Math.max(0, corridor.halfWidth),
        blendWidth: Math.max(0.01, corridor.blendWidth),
      }));
  }

  sampleBaseHeight(x: number, z: number): number {
    const geo = localToGeo({ x, y: 0, z }, this.origin);
    const column = clamp((geo.lon - this.grid.bounds.west) / (this.grid.bounds.east - this.grid.bounds.west) * (this.grid.columns - 1), 0, this.grid.columns - 1);
    const row = clamp((this.grid.bounds.north - geo.lat) / (this.grid.bounds.north - this.grid.bounds.south) * (this.grid.rows - 1), 0, this.grid.rows - 1);
    const column0 = Math.floor(column);
    const row0 = Math.floor(row);
    const column1 = Math.min(this.grid.columns - 1, column0 + 1);
    const row1 = Math.min(this.grid.rows - 1, row0 + 1);
    const xMix = column - column0;
    const zMix = row - row0;
    const at = (sampleRow: number, sampleColumn: number) => this.grid.values[sampleRow * this.grid.columns + sampleColumn];
    const north = at(row0, column0) + (at(row0, column1) - at(row0, column0)) * xMix;
    const south = at(row1, column0) + (at(row1, column1) - at(row1, column0)) * xMix;
    return north + (south - north) * zMix - this.grid.originElevation;
  }

  sampleHeight(x: number, z: number): number {
    let height = this.sampleBaseHeight(x, z);
    for (const corridor of this.corridors) {
      const sample = nearestCorridorSample(x, z, corridor.points);
      const outerWidth = corridor.halfWidth + corridor.blendWidth;
      if (sample.distance >= outerWidth) continue;
      const weight = sample.distance <= corridor.halfWidth
        ? 1
        : 1 - smoothstep((sample.distance - corridor.halfWidth) / corridor.blendWidth);
      height += (sample.height - height) * weight;
    }
    return height;
  }

  createGeometry(bounds: Bounds, segmentsX = this.grid.columns - 1, segmentsZ = this.grid.rows - 1): THREE.PlaneGeometry {
    const geometry = new THREE.PlaneGeometry(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, segmentsX, segmentsZ);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
    const positions = geometry.getAttribute('position');
    const colors: number[] = [];
    const low = new THREE.Color(0x788b70);
    const high = new THREE.Color(0x536b54);
    const color = new THREE.Color();
    for (let index = 0; index < positions.count; index += 1) {
      const height = this.sampleHeight(positions.getX(index), positions.getZ(index));
      positions.setY(index, height);
      const normalized = clamp((height - (this.grid.minElevation - this.grid.originElevation)) / Math.max(1, this.grid.maxElevation - this.grid.minElevation), 0, 1);
      color.lerpColors(low, high, normalized);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
}
