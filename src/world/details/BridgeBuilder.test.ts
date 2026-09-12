import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GeoFeature } from '../../areas/types';
import { resolveBridgeVisual } from './BridgeBuilder';

describe('bridge visual overrides', () => {
  const bridge: GeoFeature = { id: 42, name: '테스트교', kind: 'footway', points: [{ lat: 0, lon: 0 }, { lat: 0, lon: 0.001 }] };

  it('merges an override without dropping inferred defaults', () => {
    const result = resolveBridgeVisual(bridge, [{ featureId: 42, deckWidth: 4.5, pierCount: 3 }]);
    assert.equal(result.deckWidth, 4.5);
    assert.equal(result.pierCount, 3);
    assert.equal(result.railType, 'metal');
    assert.equal(result.deckThickness, 0.32);
  });
});
