import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { crossedCheckpoint } from './math';

describe('checkpoint crossing', () => {
  const from = { x: 0, y: 5, z: 10 };
  const checkpoint = { x: 0, y: 5, z: 0 };

  it('accepts a forward crossing inside the ring', () => {
    assert.equal(crossedCheckpoint({ x: 0, y: 5, z: 2 }, { x: 0, y: 5, z: -2 }, checkpoint, from, 4), true);
  });

  it('rejects a crossing outside the ring', () => {
    assert.equal(crossedCheckpoint({ x: 8, y: 5, z: 2 }, { x: 8, y: 5, z: -2 }, checkpoint, from, 4), false);
  });

  it('rejects movement in the reverse direction', () => {
    assert.equal(crossedCheckpoint({ x: 0, y: 5, z: -2 }, { x: 0, y: 5, z: 2 }, checkpoint, from, 4), false);
  });
});
