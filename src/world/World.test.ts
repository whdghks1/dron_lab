import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import snapshot from '../areas/hongjecheon/data/osm-snapshot.json';
import elevation from '../areas/hongjecheon/data/elevation.json';
import baseMap from '../areas/hongjecheon/data/generated/base-map.json';
import centerChunk from '../areas/hongjecheon/data/generated/chunks/0_0.json';
import type { AreaChunkSource } from '../areas/types';
import { HONGJECHEON_CONFIG as config } from '../areas/hongjecheon/config';
import { CollisionSystem } from '../game/CollisionSystem';
import { DEFAULT_FLIGHT_CONFIG } from '../game/FlightPhysics';
import { World } from './World';

describe('Hongjecheon world', () => {
  const world = new World(snapshot, elevation, 'low');
  const collision = new CollisionSystem(world.colliders, DEFAULT_FLIGHT_CONFIG.collisionRadius);

  it('builds the OSM building collision field', () => {
    assert.equal(world.colliders.length, snapshot.buildings.length);
    assert.ok(world.scene.children.length > 10);
  });

  it('starts the drone outside building collision volumes', () => {
    assert.equal(collision.check(world.startPosition), undefined);
  });

  it('creates every exploration checkpoint', () => {
    assert.equal(world.checkpointObjects.length, config.checkpoints.length);
    assert.equal(world.checkpointPositions.filter((checkpoint) => collision.check(checkpoint)).length, 0);
  });

  it('partitions buildings and vegetation into streamed LOD chunks', () => {
    assert.ok(world.chunks.totalCount > 4);
    assert.ok(world.chunks.activeCount > 0);
    assert.ok(world.chunks.activeCount < world.chunks.totalCount);
    const lodCount = [...world.chunks.values()].flatMap((chunk) => chunk.root.children).filter((child) => child instanceof THREE.LOD).length;
    assert.ok(lodCount > 0);
  });

  it('loads nearby map data once before flight', async () => {
    let requests = 0;
    const source: AreaChunkSource = {
      chunkSize: 240,
      keysAround: () => ['0:0'],
      load: async () => {
        requests += 1;
        return centerChunk;
      },
    };
    const streamedWorld = new World(baseMap, elevation, 'low', source);
    assert.equal(streamedWorld.colliders.length, 0);
    await streamedWorld.prepare(streamedWorld.startPosition);
    await streamedWorld.prepare(streamedWorld.startPosition);
    assert.equal(requests, 1);
    assert.equal(streamedWorld.loadedChunkCount, 1);
    assert.equal(streamedWorld.colliders.length, centerChunk.buildings.length);
  });
});
