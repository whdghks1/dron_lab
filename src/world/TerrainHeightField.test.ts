import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import elevation from '../areas/hongjecheon/data/elevation.json';
import { HONGJECHEON_CONFIG as config } from '../areas/hongjecheon/config';
import { HONGJECHEON_DETAILS as details } from '../areas/hongjecheon/details';
import { geoToLocal } from '../utils/geo';
import { TerrainHeightField } from './TerrainHeightField';

describe('Hongjecheon DEM height field', () => {
  const terrain = new TerrainHeightField(elevation, config.origin);

  it('normalizes the waterfall origin close to zero meters', () => {
    assert.ok(Math.abs(terrain.sampleHeight(0, 0)) < 0.05);
  });

  it('interpolates finite elevations throughout the flight bounds', () => {
    const samples = [
      terrain.sampleHeight(config.bounds.minX, config.bounds.minZ),
      terrain.sampleHeight(config.bounds.maxX, config.bounds.maxZ),
      terrain.sampleHeight(config.start.x, config.start.z),
    ];
    assert.equal(samples.every(Number.isFinite), true);
    assert.ok(Math.max(...samples) - Math.min(...samples) > 1);
  });

  it('creates a vertex-colored terrain mesh', () => {
    const geometry = terrain.createGeometry(config.bounds);
    assert.equal(geometry.getAttribute('position').count, elevation.rows * elevation.columns);
    assert.equal(geometry.getAttribute('color').count, elevation.rows * elevation.columns);
  });

  it('keeps the authored stream corridor continuous while preserving distant DEM samples', () => {
    const corridor = details.terrainCorridors![0];
    const corrected = new TerrainHeightField(elevation, config.origin, [corridor]);
    for (const point of corridor.points) {
      const local = geoToLocal(point, config.origin);
      assert.ok(Math.abs(corrected.sampleHeight(local.x, local.z) - point.height) < 0.001);
    }

    const middle = geoToLocal(corridor.points[Math.floor(corridor.points.length / 2)], config.origin);
    assert.equal(corrected.sampleHeight(middle.x + 30, middle.z), corrected.sampleBaseHeight(middle.x + 30, middle.z));
  });
});
