import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { assignExtrudeSideMaterialGroups, offsetPolyline } from './geometry';

describe('world geometry helpers', () => {
  it('offsets a straight path to both sides', () => {
    const points = [new THREE.Vector3(0, 2, 0), new THREE.Vector3(10, 2, 0)];
    assert.deepEqual(offsetPolyline(points, 3).map((point) => point.toArray()), [[0, 2, 3], [10, 2, 3]]);
    assert.deepEqual(offsetPolyline(points, -3).map((point) => point.toArray()), [[0, 2, -3], [10, 2, -3]]);
  });

  it('cycles facade photos across extruded side faces', () => {
    const shape = new THREE.Shape().moveTo(0, 0).lineTo(10, 0).lineTo(10, 8).lineTo(0, 8).closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: false });
    assignExtrudeSideMaterialGroups(geometry, 2);
    const sides = geometry.groups.filter((group) => group.materialIndex !== 0);
    assert.ok(sides.length >= 4);
    assert.deepEqual(sides.slice(0, 4).map((group) => group.materialIndex), [1, 2, 1, 2]);
  });
});
