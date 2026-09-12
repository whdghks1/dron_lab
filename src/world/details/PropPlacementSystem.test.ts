import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { densityTierForIndex, levelsForDensityTier } from './PropPlacementSystem';

describe('prop quality density', () => {
  it('keeps one quarter on low, half on medium, and all on high', () => {
    const tiers = Array.from({ length: 8 }, (_, index) => densityTierForIndex(index));
    assert.deepEqual(tiers, ['low', 'high', 'medium', 'high', 'low', 'high', 'medium', 'high']);
    assert.deepEqual(levelsForDensityTier('low', ['low', 'medium', 'high']), ['low', 'medium', 'high']);
    assert.deepEqual(levelsForDensityTier('medium', ['low', 'medium', 'high']), ['medium', 'high']);
    assert.deepEqual(levelsForDensityTier('high', ['low', 'medium']), []);
  });
});
