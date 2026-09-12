import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listAreas, resolveAreaId } from './registry';

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
});
