import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { offsetPolyline } from './geometry';

describe('world geometry helpers', () => {
  it('offsets a straight path to both sides', () => {
    const points = [new THREE.Vector3(0, 2, 0), new THREE.Vector3(10, 2, 0)];
    assert.deepEqual(offsetPolyline(points, 3).map((point) => point.toArray()), [[0, 2, 3], [10, 2, 3]]);
    assert.deepEqual(offsetPolyline(points, -3).map((point) => point.toArray()), [[0, 2, -3], [10, 2, -3]]);
  });
});
