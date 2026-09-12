import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { SpatialChunkManager } from './SpatialChunkManager';

describe('spatial chunk manager', () => {
  it('activates only chunks around the drone', () => {
    const scene = new THREE.Scene();
    const manager = new SpatialChunkManager(scene, { size: 100, loadRadius: 110, lodDistance: 60 });
    const near = manager.getOrCreate(10, 10);
    const adjacent = manager.getOrCreate(120, 10);
    const far = manager.getOrCreate(450, 10);
    manager.update({ x: 10, z: 10 });
    assert.equal(near.root.visible, true);
    assert.equal(adjacent.root.visible, true);
    assert.equal(far.root.visible, false);
    assert.equal(manager.activeCount, 2);
    assert.equal(manager.totalCount, 3);
  });

  it('reuses the same chunk for positions in one cell', () => {
    const manager = new SpatialChunkManager(new THREE.Scene(), { size: 100, loadRadius: 100, lodDistance: 50 });
    assert.equal(manager.getOrCreate(2, 3), manager.getOrCreate(99, 99));
  });

  it('updates the active radius with graphics quality', () => {
    const manager = new SpatialChunkManager(new THREE.Scene(), { size: 100, loadRadius: 100, lodDistance: 50 });
    const far = manager.getOrCreate(350, 0);
    manager.update({ x: 0, z: 0 });
    assert.equal(far.root.visible, false);
    manager.configure({ size: 100, loadRadius: 400, lodDistance: 150 });
    manager.update({ x: 0, z: 0 });
    assert.equal(far.root.visible, true);
  });
});
