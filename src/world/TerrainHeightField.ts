import * as THREE from 'three';
import type { ElevationGrid } from '../areas/types';
import type { Bounds } from '../game/types';
import type { GeoOrigin } from '../utils/geo';
import { localToGeo } from '../utils/geo';
import { clamp } from '../utils/math';

export class TerrainHeightField {
  constructor(readonly grid: ElevationGrid, private readonly origin: GeoOrigin) {}

  sampleHeight(x: number, z: number): number {
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

  createGeometry(bounds: Bounds): THREE.PlaneGeometry {
    const geometry = new THREE.PlaneGeometry(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, this.grid.columns - 1, this.grid.rows - 1);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
    const positions = geometry.getAttribute('position');
    const colors: number[] = [];
    const low = new THREE.Color(0x708a6c);
    const high = new THREE.Color(0x4e684f);
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
