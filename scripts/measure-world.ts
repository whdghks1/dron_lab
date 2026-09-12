import snapshot from '../src/areas/hongjecheon/data/osm-snapshot.json';
import elevation from '../src/areas/hongjecheon/data/elevation.json';
import { HONGJECHEON_CONFIG } from '../src/areas/hongjecheon/config';
import { HONGJECHEON_DETAILS } from '../src/areas/hongjecheon/details';
import { World, type Quality } from '../src/world/World';
import * as THREE from 'three';

interface SceneMeasurement {
  quality: Quality;
  meshes: number;
  instancedMeshes: number;
  drawEstimate: number;
  triangles: number;
  geometries: number;
  textures: number;
  colliders: number;
  activeChunks: number;
}

function measure(quality: Quality): SceneMeasurement {
  const world = new World(HONGJECHEON_CONFIG, snapshot, elevation, quality, undefined, undefined, HONGJECHEON_DETAILS);
  const geometries = new Set<string>();
  const textures = new Set<string>();
  let meshes = 0;
  let instancedMeshes = 0;
  let drawEstimate = 0;
  let triangles = 0;
  world.scene.updateMatrixWorld(true);
  world.scene.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshes += 1;
    drawEstimate += Array.isArray(object.material) ? object.geometry.groups.length || object.material.length : 1;
    geometries.add(object.geometry.uuid);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value.uuid);
      });
    });
    const triangleCount = (object.geometry.index?.count ?? object.geometry.attributes.position?.count ?? 0) / 3;
    triangles += triangleCount * (object instanceof THREE.InstancedMesh ? object.count : 1);
    if (object instanceof THREE.InstancedMesh) instancedMeshes += 1;
  });
  return {
    quality,
    meshes,
    instancedMeshes,
    drawEstimate,
    triangles: Math.round(triangles),
    geometries: geometries.size,
    textures: textures.size,
    colliders: world.colliders.length,
    activeChunks: world.chunks.activeCount,
  };
}

console.table((['low', 'medium', 'high'] as Quality[]).map(measure));
