import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listAreas, resolveAreaId } from './registry';

describe('area registry', () => {
  it('uses Hongjecheon when an unknown area is requested', () => {
    assert.equal(resolveAreaId('unknown'), 'hongjecheon-waterfall');
    assert.equal(resolveAreaId(null), 'hongjecheon-waterfall');
  });

  it('exposes serializable area metadata', () => {
    assert.deepEqual(listAreas()[0], {
      id: 'hongjecheon-waterfall',
      name: '홍제천',
      subtitle: '서대문구 인공폭포 구간',
    });
  });
});
