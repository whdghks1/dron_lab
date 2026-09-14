import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import type { LandmarkConfig } from '../../areas/types';
import type { BoxCollider } from '../../game/types';
import { createDetailMaterials } from '../materials';
import { LandmarkLoader, landmarkLocalPosition } from './LandmarkLoader';

describe('landmark coordinate conversion', () => {
  it('converts geographic placement and adds authored ground height', () => {
    const landmark: LandmarkConfig = { id: 'test', name: 'test', position: { lat: 37.001, lon: 127.001 } };
    const position = landmarkLocalPosition(landmark, { lat: 37, lon: 127 }, () => 4.5);
    assert.ok(position.x > 80 && position.x < 100);
    assert.ok(position.z < -100 && position.z > -120);
    assert.equal(position.y, 4.5);
  });

  it('builds the irregular waterfall set and rotates its collider offset with the model', () => {
    const colliders: BoxCollider[] = [];
    const loader = new LandmarkLoader({
      origin: { lat: 37, lon: 127 },
      heightAt: () => 7,
      materials: createDetailMaterials('low'),
      colliders,
      quality: 'low',
    });
    const waterfall: LandmarkConfig = {
      id: 'waterfall-test',
      name: 'waterfall test',
      position: { lat: 37, lon: 127 },
      placeholder: {
        kind: 'waterfall', width: 10, height: 4, depth: 3, rotation: Math.PI / 2,
        baseOffset: -1, cascadeCount: 3, dataOrigin: 'authored',
      },
      collider: { size: [10, 4, 2], offset: [3, 2, 5] },
    };
    const root = new THREE.Group();
    loader.build([waterfall], root);

    const names = new Set<string>();
    root.traverse((object) => names.add(object.name));
    assert.equal(names.has('landmark-waterfall-cliff'), true);
    assert.equal(names.has('landmark-waterfall-rock-face'), true);
    assert.equal(names.has('landmark-waterfall-cascades'), true);
    assert.equal(names.has('landmark-waterfall-basin'), true);

    assert.equal(colliders.length, 2);
    const cliffCollider = colliders.find((collider) => collider.label === 'waterfall test')!;
    const centerX = cliffCollider.footprint!.reduce((sum, point) => sum + point.x, 0) / 4;
    const centerZ = cliffCollider.footprint!.reduce((sum, point) => sum + point.z, 0) / 4;
    assert.ok(Math.abs(centerX - 5) < 0.001);
    assert.ok(Math.abs(centerZ + 3) < 0.001);
    assert.equal(colliders.some((collider) => collider.label === '내부순환로 교각'), true);
  });
});
