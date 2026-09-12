import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { samplePolylineAtSpacing } from './placement';

describe('detail path placement', () => {
  it('places instances at stable, even distances across segments', () => {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(6, 0, 0), new THREE.Vector3(6, 0, 8)];
    const placements = samplePolylineAtSpacing(points, 4, 1, 1);
    assert.deepEqual(placements.map((item) => Number(item.distance.toFixed(1))), [1, 5, 9, 13]);
    assert.deepEqual(placements.at(-1)?.position.toArray().map((value) => Number(value.toFixed(1))), [6, 0, 7]);
  });
});
