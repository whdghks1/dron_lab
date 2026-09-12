import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listAreas, resolveAreaId } from './registry';
import { HONGJECHEON_DETAILS } from './hongjecheon/details';
import { CHEONGGYECHEON_VISUALS } from './cheonggyecheon/visuals';

describe('area registry', () => {
  it('uses Hongjecheon when an unknown area is requested', () => {
    assert.equal(resolveAreaId('unknown'), 'hongjecheon-waterfall');
    assert.equal(resolveAreaId(null), 'hongjecheon-waterfall');
  });

  it('exposes serializable area metadata', () => {
    assert.deepEqual(listAreas(), [
      { id: 'hongjecheon-waterfall', name: '홍제천', subtitle: '서대문구 인공폭포 구간' },
      { id: 'cheonggyecheon-downtown', name: '청계천', subtitle: '청계광장–수표교 도심 구간' },
    ]);
    assert.equal(resolveAreaId('cheonggyecheon-downtown'), 'cheonggyecheon-downtown');
  });

  it('keeps the new detail rules in the Hongjecheon module', () => {
    assert.ok(HONGJECHEON_DETAILS.bridgeOverrides?.length);
    assert.ok(HONGJECHEON_DETAILS.propRules?.length);
    assert.equal(HONGJECHEON_DETAILS.attributions?.length, 2);
    assert.deepEqual(CHEONGGYECHEON_VISUALS.buildingPhotoTextures, []);
  });
});
