import * as THREE from 'three';
import type { Vec3 } from '../game/types';

export interface ChunkSettings {
  size: number;
  loadRadius: number;
  lodDistance: number;
}

export interface SpatialChunk {
  key: string;
  x: number;
  z: number;
  root: THREE.Group;
}

export class SpatialChunkManager {
  private readonly chunks = new Map<string, SpatialChunk>();
  private active = 0;

  constructor(private readonly scene: THREE.Scene, public settings: ChunkSettings) {}

  getOrCreate(x: number, z: number): SpatialChunk {
    const column = Math.floor(x / this.settings.size);
    const row = Math.floor(z / this.settings.size);
    const key = `${column}:${row}`;
    const existing = this.chunks.get(key);
    if (existing) return existing;
    const chunk = {
      key,
      x: (column + 0.5) * this.settings.size,
      z: (row + 0.5) * this.settings.size,
      root: new THREE.Group(),
    };
    chunk.root.name = `chunk-${key}`;
    chunk.root.position.set(chunk.x, 0, chunk.z);
    chunk.root.visible = false;
    this.chunks.set(key, chunk);
    this.scene.add(chunk.root);
    return chunk;
  }

  update(position: Pick<Vec3, 'x' | 'z'>) {
    const margin = this.settings.size * Math.SQRT2 / 2;
    let active = 0;
    this.chunks.forEach((chunk) => {
      const visible = Math.hypot(position.x - chunk.x, position.z - chunk.z) <= this.settings.loadRadius + margin;
      chunk.root.visible = visible;
      if (visible) active += 1;
    });
    this.active = active;
  }

  configure(settings: ChunkSettings) {
    this.settings = settings;
  }

  get activeCount() { return this.active; }
  get totalCount() { return this.chunks.size; }
  values() { return this.chunks.values(); }
}

export function chunkSettingsForQuality(quality: 'low' | 'medium' | 'high'): ChunkSettings {
  if (quality === 'low') return { size: 240, loadRadius: 340, lodDistance: 145 };
  if (quality === 'medium') return { size: 240, loadRadius: 470, lodDistance: 210 };
  return { size: 240, loadRadius: 620, lodDistance: 280 };
}
