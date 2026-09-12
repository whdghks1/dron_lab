import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import source from '../areas/cheonggyecheon/data/osm-snapshot.json';
import elevation from '../areas/cheonggyecheon/data/elevation.json';
import { CHEONGGYECHEON_CONFIG } from '../areas/cheonggyecheon/config';
import type { AreaSnapshot } from '../areas/types';
import { World } from './World';

describe('Cheonggyecheon tagged building models', () => {
  const taggedIds = new Set([198561926, 521439142, 708772637, 1126008672]);
  const snapshot: AreaSnapshot = {
    ...source,
    buildings: source.buildings.filter((building) => taggedIds.has(building.id)),
    roads: [], paths: [], water: [], bridges: [], parks: [],
  };
  const world = new World(CHEONGGYECHEON_CONFIG, snapshot, elevation, 'medium');
  const names = new Set<string>();
  [...world.chunks.values()].forEach((chunk) => chunk.root.traverse((object) => names.add(object.name)));

  it('uses every tagged footprint as a collision volume', () => {
    assert.equal(world.colliders.length, 4);
  });

  it('creates round, gabled, and pyramidal roof volumes from OSM tags', () => {
    assert.equal(names.has('quality-detail-building-round-roofs'), true);
    assert.equal(names.has('quality-detail-building-gable-roofs'), true);
    assert.equal(names.has('quality-detail-building-pyramid-roofs'), true);
  });
});
