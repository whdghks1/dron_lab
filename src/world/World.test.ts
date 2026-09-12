import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import snapshot from '../areas/hongjecheon/data/osm-snapshot.json';
import { HONGJECHEON_CONFIG as config } from '../areas/hongjecheon/config';
import { CollisionSystem } from '../game/CollisionSystem';
import { DEFAULT_FLIGHT_CONFIG } from '../game/FlightPhysics';
import { World } from './World';

describe('Hongjecheon world', () => {
  const world = new World(snapshot, 'low');
  const collision = new CollisionSystem(world.colliders, DEFAULT_FLIGHT_CONFIG.collisionRadius);

  it('builds the OSM building collision field', () => {
    assert.equal(world.colliders.length, snapshot.buildings.length);
    assert.ok(world.scene.children.length > 10);
  });

  it('starts the drone outside building collision volumes', () => {
    assert.equal(collision.check(config.start), undefined);
  });

  it('creates every exploration checkpoint', () => {
    assert.equal(world.checkpointObjects.length, config.checkpoints.length);
    assert.equal(config.checkpoints.filter((checkpoint) => collision.check(checkpoint.position)).length, 0);
  });
});
