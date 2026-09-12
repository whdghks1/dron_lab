import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveRiverbankStyle } from './RiverbankBuilder';

describe('riverbank profiles', () => {
  it('selects profile defaults and applies per-segment values', () => {
    assert.deepEqual(resolveRiverbankStyle({ profile: 'stone-bank' }), {
      materialPreset: 'stone-bank', bankWidth: 4.2, bankHeight: 1.15, waterHalfWidth: 7.2, railing: false,
    });
    assert.equal(resolveRiverbankStyle({ profile: 'vertical-wall', bankHeight: 2.4, railing: false }).bankHeight, 2.4);
    assert.equal(resolveRiverbankStyle({ profile: 'vertical-wall', waterHalfWidth: 9.2 }).waterHalfWidth, 9.2);
  });
});
