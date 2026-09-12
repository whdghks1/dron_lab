import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { directionalFacadeMaterialIndices, facadeDirectionForEdge } from './FacadeSystem';

describe('directional facade photos', () => {
  const square = [
    new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 0, -1),
    new THREE.Vector3(1, 0, 1), new THREE.Vector3(-1, 0, 1),
  ];

  it('classifies facade normals in scene cardinal directions', () => {
    assert.equal(facadeDirectionForEdge(square, 0), 'north');
    assert.equal(facadeDirectionForEdge(square, 1), 'east');
    assert.equal(facadeDirectionForEdge(square, 2), 'south');
    assert.equal(facadeDirectionForEdge(square, 3), 'west');
  });

  it('keeps facades without a photo on material zero', () => {
    assert.deepEqual(directionalFacadeMaterialIndices(square, [{ direction: 'west', url: '/west.jpg' }]), [0, 0, 0, 1]);
  });
});
