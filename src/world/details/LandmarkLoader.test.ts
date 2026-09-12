import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LandmarkConfig } from '../../areas/types';
import { landmarkLocalPosition } from './LandmarkLoader';

describe('landmark coordinate conversion', () => {
  it('converts geographic placement and adds authored ground height', () => {
    const landmark: LandmarkConfig = { id: 'test', name: 'test', position: { lat: 37.001, lon: 127.001 } };
    const position = landmarkLocalPosition(landmark, { lat: 37, lon: 127 }, () => 4.5);
    assert.ok(position.x > 80 && position.x < 100);
    assert.ok(position.z < -100 && position.z > -120);
    assert.equal(position.y, 4.5);
  });
});
