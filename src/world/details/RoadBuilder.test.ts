import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { roadDetailForFeature, roadDetailForKind, roadWidthForFeature, roadWidthForKind } from './RoadBuilder';

describe('road visual styles', () => {
  it('keeps major roads wider and gives them markings and sidewalks', () => {
    assert.equal(roadWidthForKind('trunk'), 12);
    assert.equal(roadWidthForKind('secondary'), 8);
    assert.deepEqual(roadDetailForKind('secondary'), { centerMarking: true, edgeMarking: true, sidewalk: true });
  });

  it('does not invent lane markings for small service roads', () => {
    assert.equal(roadWidthForKind('service'), 3.2);
    assert.deepEqual(roadDetailForKind('service'), { centerMarking: false, edgeMarking: false, sidewalk: false });
  });

  it('prefers explicit OSM width, lane, and sidewalk tags', () => {
    const feature = { kind: 'residential', width: 6.4, lanes: 1, sidewalk: 'no' };
    assert.equal(roadWidthForFeature(feature), 6.4);
    assert.deepEqual(roadDetailForFeature(feature), { centerMarking: false, edgeMarking: false, sidewalk: false });
  });
});
