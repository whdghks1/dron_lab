import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canLand } from './Landing';

const safe = {
  position: { x: 1, y: 1.1, z: 1 },
  velocity: { x: 0.5, y: 0, z: 0.5 },
  pad: { x: 0, z: 0 },
  groundHeight: 0,
  descending: true,
};

describe('landing check', () => {
  it('accepts a slow descent over the landing pad', () => {
    assert.equal(canLand(safe), true);
  });

  it('rejects fast, high, distant, or uncommanded approaches', () => {
    assert.equal(canLand({ ...safe, velocity: { x: 3, y: 0, z: 0 } }), false);
    assert.equal(canLand({ ...safe, position: { x: 1, y: 2, z: 1 } }), false);
    assert.equal(canLand({ ...safe, position: { x: 8, y: 1.1, z: 0 } }), false);
    assert.equal(canLand({ ...safe, descending: false }), false);
  });
});
