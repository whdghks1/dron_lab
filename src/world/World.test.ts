import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import snapshot from '../areas/hongjecheon/data/osm-snapshot.json';
import elevation from '../areas/hongjecheon/data/elevation.json';
import baseMap from '../areas/hongjecheon/data/generated/base-map.json';
import centerChunk from '../areas/hongjecheon/data/generated/chunks/0_0.json';
import type { AreaChunkSource, AreaSnapshot } from '../areas/types';
import { HONGJECHEON_CONFIG as config } from '../areas/hongjecheon/config';
import { CollisionSystem } from '../game/CollisionSystem';
import { DEFAULT_FLIGHT_CONFIG } from '../game/FlightPhysics';
import { World } from './World';

describe('Hongjecheon world', () => {
  const world = new World(config, snapshot, elevation, 'low');
  const collision = new CollisionSystem(world.colliders, DEFAULT_FLIGHT_CONFIG.collisionRadius);
  const bridgeSegmentCount = snapshot.bridges.reduce((sum, bridge) => sum + Math.max(0, bridge.points.length - 1), 0);

  it('builds the OSM building collision field', () => {
    assert.equal(world.colliders.length, snapshot.buildings.length + bridgeSegmentCount);
    assert.ok(world.scene.children.length > 10);
  });

  it('includes multipolygon relation building parts that were previously omitted', () => {
    const relationPartIds = [1255196438, 1111519319, 1111519320, 1111519321, 1111519318, 1111519317, 1111519312, 1111519313, 1111519311];
    const ids = new Set(snapshot.buildings.map((building) => building.id));
    assert.equal(snapshot.buildings.length, 338);
    relationPartIds.forEach((id) => assert.equal(ids.has(id), true));
    assert.equal(snapshot.buildings.find((building) => building.id === 1111519319)?.height, 53);
  });

  it('builds quality-scaled rooftop and facade detail meshes', () => {
    const details: THREE.Object3D[] = [];
    [...world.chunks.values()].forEach((chunk) => chunk.root.traverse((object) => {
      if (object.name.startsWith('quality-detail-building-')) details.push(object);
    }));
    assert.ok(details.some((object) => object.name === 'quality-detail-building-rooftops'));
    assert.ok(details.some((object) => object.name === 'quality-detail-building-facades'));
    assert.ok(details.every((object) => object.visible === false));
    world.setQuality('medium');
    assert.ok(details.every((object) => object.visible === true));
    world.setQuality('low');
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
    const streamedWorld = new World(config, baseMap, elevation, 'low', source);
    assert.equal(streamedWorld.colliders.length, 0);
    await streamedWorld.prepare(streamedWorld.startPosition);
    await streamedWorld.prepare(streamedWorld.startPosition);
    assert.equal(requests, 1);
    assert.equal(streamedWorld.loadedChunkCount, 1);
    const centerBridgeSegments = centerChunk.bridges.reduce((sum, bridge) => sum + Math.max(0, bridge.points.length - 1), 0);
    assert.equal(streamedWorld.colliders.length, centerChunk.buildings.length + centerBridgeSegments);
  });

  it('evicts least-recently-used streamed content above the quality budget', async () => {
    let requests = 0;
    let releases = 0;
    const emptyChunk: AreaSnapshot = { ...baseMap, water: [] };
    const source: AreaChunkSource = {
      chunkSize: 240,
      keysAround: (x) => [`${Math.floor(x / 240)}:0`],
      load: async () => {
        requests += 1;
        return emptyChunk;
      },
      release: () => { releases += 1; },
    };
    const streamedWorld = new World(config, baseMap, elevation, 'low', source);
    for (let index = 0; index < 12; index += 1) await streamedWorld.prepare({ x: index * 240 + 10, z: 10 });
    assert.equal(requests, 12);
    assert.equal(releases, 2);
    assert.equal(streamedWorld.streamingStats.cached, 10);
    assert.equal(streamedWorld.streamingStats.cacheLimit, 10);
    assert.equal(streamedWorld.streamingStats.pending, 0);
    assert.ok(streamedWorld.streamingStats.active <= 2);
  });
});
