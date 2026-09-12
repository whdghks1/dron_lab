import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { geoToLocal, localToGeo } from './geo';

describe('geographic coordinate conversion', () => {
  const origin = { lat: 37.5813046, lon: 126.9378073 };

  it('keeps the origin at local zero', () => {
    const local = geoToLocal(origin, origin);
    assert.equal(Math.abs(local.x), 0);
    assert.equal(Math.abs(local.y), 0);
    assert.equal(Math.abs(local.z), 0);
  });

  it('round-trips coordinates around Hongjecheon', () => {
    const source = { lat: 37.5796279, lon: 126.9350332 };
    const restored = localToGeo(geoToLocal(source, origin), origin);
    assert.ok(Math.abs(restored.lat - source.lat) < 1e-7);
    assert.ok(Math.abs(restored.lon - source.lon) < 1e-7);
  });

  it('uses meters and a north-negative scene axis', () => {
    const north = geoToLocal({ lat: origin.lat + 0.001, lon: origin.lon }, origin);
    assert.ok(Math.abs(north.z + 111.32) < 0.1);
  });
});
