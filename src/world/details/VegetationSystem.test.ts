import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isVegetationPlacementAllowed } from './VegetationSystem';

describe('vegetation exclusions', () => {
  const building = [[{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 5 }, { x: 0, z: 5 }]];
  const path = [[{ x: 10, z: 0 }, { x: 10, z: 10 }]];
  const water = [[{ x: 20, z: 0 }, { x: 25, z: 0 }, { x: 25, z: 5 }, { x: 20, z: 5 }]];

  it('rejects buildings, paths, and water while keeping open ground', () => {
    assert.equal(isVegetationPlacementAllowed({ x: 2, z: 2 }, building, path, water, 2, 2), false);
    assert.equal(isVegetationPlacementAllowed({ x: 11, z: 4 }, building, path, water, 2, 2), false);
    assert.equal(isVegetationPlacementAllowed({ x: 22, z: 2 }, building, path, water, 2, 2), false);
    assert.equal(isVegetationPlacementAllowed({ x: 16, z: 8 }, building, path, water, 2, 2), true);
  });
});
