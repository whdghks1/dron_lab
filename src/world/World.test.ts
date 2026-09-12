import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import snapshot from '../areas/hongjecheon/data/osm-snapshot.json';
import elevation from '../areas/hongjecheon/data/elevation.json';
import baseMap from '../areas/hongjecheon/data/generated/base-map.json';
import centerChunk from '../areas/hongjecheon/data/generated/chunks/0_0.json';
import detailChunk from '../areas/hongjecheon/data/generated/chunks/-1_-1.json';
import type { AreaChunkSource, AreaSnapshot } from '../areas/types';
import { HONGJECHEON_CONFIG as config } from '../areas/hongjecheon/config';
import { HONGJECHEON_DETAILS } from '../areas/hongjecheon/details';
import { CollisionSystem } from '../game/CollisionSystem';
import { DEFAULT_FLIGHT_CONFIG } from '../game/FlightPhysics';
import { World } from './World';

describe('Hongjecheon world', () => {
  const world = new World(config, snapshot, elevation, 'low');
  const collision = new CollisionSystem(world.colliders, DEFAULT_FLIGHT_CONFIG.collisionRadius);
  const bridgeSegmentCount = snapshot.bridges.reduce((sum, bridge) => sum + Math.max(0, bridge.points.length - 1), 0);

  it('builds the OSM building collision field', () => {
    assert.equal(world.colliders.length, snapshot.buildings.length + bridgeSegmentCount);
    assert.equal(world.colliders.filter((collider) => collider.footprint).length, snapshot.buildings.length);
    assert.ok(world.scene.children.length > 10);
  });

  it('builds quality-scaled road surfaces, sidewalks, and markings', () => {
    const objects: THREE.Object3D[] = [];
    world.scene.traverse((object) => objects.push(object));
    assert.ok(objects.some((object) => object.name === 'road-surface-major'));
    const details = objects.filter((object) => object.name.startsWith('quality-detail-road-'));
    assert.ok(details.some((object) => object.name === 'quality-detail-road-sidewalks'));
    assert.ok(details.some((object) => object.name === 'quality-detail-road-center-dashes'));
    assert.ok(details.every((object) => object.visible === false));
    world.setQuality('medium');
    assert.ok(details.every((object) => object.visible === true));
    world.setQuality('low');
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

  it('adds Hongjecheon-only bridges, bank profiles, props, vegetation, and the authored waterfall', () => {
    const detailedWorld = new World(config, snapshot, elevation, 'high', undefined, undefined, HONGJECHEON_DETAILS);
    const names = new Set<string>();
    detailedWorld.scene.traverse((object) => names.add(object.name));
    assert.equal(names.has('bridge-support-old-concrete'), true);
    assert.equal(names.has('riverbank-profile-stone-bank'), true);
    assert.equal(names.has('quality-prop-street-lamp:medium-high'), true);
    assert.equal(names.has('vegetation-crown-0'), true);
    assert.equal(names.has('landmark-hongjecheon-waterfall-authored'), true);
    assert.ok(detailedWorld.colliders.length > world.colliders.length);
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

  it('uses the current quality for detail chunks loaded after a quality change', async () => {
    const source: AreaChunkSource = {
      chunkSize: 240,
      keysAround: () => ['-1:-1'],
      load: async () => detailChunk,
    };
    const streamedWorld = new World(config, baseMap, elevation, 'high', source, undefined, HONGJECHEON_DETAILS);
    streamedWorld.setQuality('low');
    await streamedWorld.prepare(streamedWorld.startPosition);
    const objects: THREE.Object3D[] = [];
    [...streamedWorld.chunks.values()].forEach((chunk) => chunk.root.traverse((object) => objects.push(object)));
    const qualityProps = objects.filter((object) => object.name.startsWith('quality-prop-'));
    assert.ok(qualityProps.length > 0);
    qualityProps.forEach((object) => assert.equal(object.visible, (object.userData.qualityLevels as string[]).includes('low')));
    const vegetation = objects.find((object) => object.name === 'vegetation-trunks') as THREE.InstancedMesh;
    assert.equal(vegetation.count, vegetation.userData.qualityCounts.low);
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

  it('disposes detailed chunk geometry and removes its colliders after LRU eviction', async () => {
    const emptyChunk: AreaSnapshot = { ...baseMap, water: [] };
    const source: AreaChunkSource = {
      chunkSize: 240,
      keysAround: (x) => [`${Math.floor(x / 240)}:0`],
      load: async (key) => key === '0:0' ? centerChunk : emptyChunk,
    };
    const streamedWorld = new World(config, baseMap, elevation, 'low', source, undefined, HONGJECHEON_DETAILS);
    await streamedWorld.prepare({ x: 10, z: 10 });
    const streamedRoot = [...streamedWorld.chunks.values()]
      .flatMap((chunk) => chunk.root.children)
      .find((object) => object.name === 'streamed-content-0:0');
    assert.ok(streamedRoot);
    let disposed = 0;
    streamedRoot.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.addEventListener('dispose', () => { disposed += 1; });
    });
    const collidersWithCenter = streamedWorld.colliders.length;
    for (let index = 1; index <= 10; index += 1) await streamedWorld.prepare({ x: index * 240 + 10, z: 10 });
    assert.equal(streamedRoot.parent, null);
    assert.ok(disposed > 0);
    assert.ok(streamedWorld.colliders.length < collidersWithCenter);
  });
});
