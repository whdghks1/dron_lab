import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BoxCollider } from './types';
import { CollisionSystem, colliderIntersectsSphere } from './CollisionSystem';

describe('collision system', () => {
  const concaveBuilding: BoxCollider = {
    minX: 0, maxX: 10, minY: 0, maxY: 12, minZ: 0, maxZ: 10,
    footprint: [
      { x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 4 },
      { x: 4, z: 4 }, { x: 4, z: 10 }, { x: 0, z: 10 },
    ],
    label: 'ㄱ자 건물',
  };

  it('does not collide inside an empty corner of a concave building AABB', () => {
    assert.equal(colliderIntersectsSphere(concaveBuilding, { x: 8, y: 4, z: 8 }, 0.8), false);
  });

  it('collides inside the footprint and within the drone radius of a wall', () => {
    const collision = new CollisionSystem([concaveBuilding], 0.8);
    assert.equal(collision.check({ x: 2, y: 4, z: 8 })?.label, 'ㄱ자 건물');
    assert.equal(collision.check({ x: 4.5, y: 4, z: 7 })?.label, 'ㄱ자 건물');
  });

  it('keeps legacy box collision and vertical clearance behavior', () => {
    const box: BoxCollider = { minX: -1, maxX: 1, minY: 0, maxY: 2, minZ: -1, maxZ: 1 };
    assert.equal(colliderIntersectsSphere(box, { x: 0, y: 1, z: 0 }, 0.5), true);
    assert.equal(colliderIntersectsSphere(box, { x: 0, y: 3, z: 0 }, 0.5), false);
  });
});
