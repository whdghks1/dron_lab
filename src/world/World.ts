import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AreaChunkSource, AreaSnapshot, ElevationGrid, GeoFeature } from '../areas/types';
import type { BoxCollider, Vec3 } from '../game/types';
import { HONGJECHEON_CONFIG } from '../areas/hongjecheon/config';
import { geoToLocal } from '../utils/geo';
import { horizontalShape, ribbonGeometry } from './geometry';
import { TerrainHeightField } from './TerrainHeightField';
import { SpatialChunkManager, chunkSettingsForQuality, type SpatialChunk } from './SpatialChunkManager';
import { createFacadeMaterial, createWaterMaterial } from './materials';

export type Quality = 'low' | 'medium' | 'high';

const CONFIG = HONGJECHEON_CONFIG;
const seeded = (id: number) => ((id * 9301 + 49297) % 233280) / 233280;

export class World {
  readonly scene = new THREE.Scene();
  readonly drone = new THREE.Group();
  readonly colliders: BoxCollider[] = [];
  readonly checkpointObjects: THREE.Group[] = [];
  readonly heightField: TerrainHeightField;
  readonly startPosition: Vec3;
  readonly checkpointPositions: Vec3[];
  readonly chunks: SpatialChunkManager;
  private readonly rotors: THREE.Mesh[] = [];
  private readonly loadedChunkKeys = new Set<string>();
  private readonly chunkRequests = new Map<string, Promise<void>>();
  private readonly facadeMaterial = createFacadeMaterial();
  private readonly simpleBuildingMaterial = new THREE.MeshStandardMaterial({ color: 0x9da8a1, roughness: 1 });
  private readonly waterMaterial = createWaterMaterial();
  private sun?: THREE.DirectionalLight;
  private quality: Quality;

  constructor(private readonly data: AreaSnapshot, elevation: ElevationGrid, quality: Quality, private readonly chunkSource?: AreaChunkSource) {
    this.quality = quality;
    this.heightField = new TerrainHeightField(elevation, CONFIG.origin);
    this.chunks = new SpatialChunkManager(this.scene, chunkSettingsForQuality(quality));
    this.startPosition = { ...CONFIG.start, y: this.heightField.sampleHeight(CONFIG.start.x, CONFIG.start.z) + CONFIG.start.y };
    this.checkpointPositions = CONFIG.checkpoints.map((checkpoint) => ({
      ...checkpoint.position,
      y: this.heightField.sampleHeight(checkpoint.position.x, checkpoint.position.z) + checkpoint.position.y,
    }));
    this.scene.background = new THREE.Color(0x9dc4ce);
    this.scene.fog = new THREE.FogExp2(0xa8c8c9, 0.00125);
    this.addLights(quality);
    this.addTerrain();
    this.addWater();
    this.addRoads(this.data);
    this.addBuildings(this.data, quality);
    this.addBridges(this.data);
    this.addTrees(quality);
    this.addLandingPad();
    this.createDrone();
    this.createCheckpoints();
    this.chunks.update(this.startPosition);
  }

  private addLights(quality: Quality) {
    const hemisphere = new THREE.HemisphereLight(0xd8f1f4, 0x496351, 2.1);
    const sun = new THREE.DirectionalLight(0xfff1c9, 2.7);
    this.sun = sun;
    sun.position.set(180, 250, 120);
    sun.castShadow = quality === 'high';
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -420; sun.shadow.camera.right = 420;
    sun.shadow.camera.top = 420; sun.shadow.camera.bottom = -420;
    sun.shadow.camera.far = 700;
    this.scene.add(hemisphere, sun);
  }

  private addTerrain() {
    const ground = new THREE.Mesh(
      this.heightField.createGeometry(CONFIG.bounds),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    );
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.addParks(this.data);
  }

  private addParks(data: AreaSnapshot, targetChunk?: SpatialChunk) {
    for (const park of data.parks) {
      const points = this.localPoints(park);
      if (points.length <= 2) continue;
      const geometry = this.drape(horizontalShape(points), 0.05);
      if (targetChunk) geometry.translate(-targetChunk.x, 0, -targetChunk.z);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x678967, roughness: 1 }));
      mesh.userData.areaChunk = targetChunk?.key;
      (targetChunk?.root ?? this.scene).add(mesh);
    }
  }

  private addWater() {
    const polygonWater = this.data.water.filter((feature) => feature.points.length > 3 && feature.points[0].lat === feature.points.at(-1)?.lat && feature.points[0].lon === feature.points.at(-1)?.lon);
    const geometries: THREE.BufferGeometry[] = polygonWater.map((feature) => this.drape(horizontalShape(this.localPoints(feature)), 0.08));
    this.data.water.filter((feature) => !polygonWater.includes(feature) && feature.kind === 'river').forEach((feature) => geometries.push(ribbonGeometry(this.localPoints(feature, 0.07), 13)));
    const merged = mergeGeometries(geometries);
    if (merged) this.scene.add(new THREE.Mesh(merged, this.waterMaterial));
  }

  private addRoads(data: AreaSnapshot, targetChunk?: SpatialChunk) {
    const roadMaterials = {
      major: new THREE.MeshStandardMaterial({ color: 0x677277, roughness: 0.95 }),
      minor: new THREE.MeshStandardMaterial({ color: 0x8c918c, roughness: 0.95 }),
      path: new THREE.MeshStandardMaterial({ color: 0xc3bfa6, roughness: 1 }),
    };
    const majorGeometries: THREE.BufferGeometry[] = [];
    const minorGeometries: THREE.BufferGeometry[] = [];
    data.roads.forEach((feature) => {
      const major = ['trunk', 'primary', 'secondary', 'tertiary'].includes(feature.kind);
      const width = major ? (feature.kind === 'trunk' ? 12 : 8) : feature.kind === 'service' ? 3.2 : 5;
      (major ? majorGeometries : minorGeometries).push(ribbonGeometry(this.localPoints(feature, 0.11), width));
    });
    const pathGeometries: THREE.BufferGeometry[] = [];
    data.paths.forEach((feature) => {
      const width = feature.kind === 'cycleway' ? 3.2 : 2;
      pathGeometries.push(ribbonGeometry(this.localPoints(feature, 0.14), width));
    });
    ([[majorGeometries, roadMaterials.major], [minorGeometries, roadMaterials.minor], [pathGeometries, roadMaterials.path]] as const).forEach(([geometries, material]) => {
      const merged = mergeGeometries(geometries);
      if (!merged) return;
      if (targetChunk) merged.translate(-targetChunk.x, 0, -targetChunk.z);
      const mesh = new THREE.Mesh(merged, material);
      mesh.receiveShadow = true;
      mesh.userData.areaChunk = targetChunk?.key;
      (targetChunk?.root ?? this.scene).add(mesh);
    });
  }

  private addBuildings(data: AreaSnapshot, quality: Quality) {
    const builders = new Map<string, { chunk: SpatialChunk; detailed: THREE.BufferGeometry[]; simple: THREE.BufferGeometry[] }>();
    data.buildings.forEach((feature) => {
      const points = this.localPoints(feature);
      if (points.length < 3) return;
      const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
      const centerZ = points.reduce((sum, point) => sum + point.z, 0) / points.length;
      const chunk = this.chunks.getOrCreate(centerX, centerZ);
      let builder = builders.get(chunk.key);
      if (!builder) {
        builder = { chunk, detailed: [], simple: [] };
        builders.set(chunk.key, builder);
      }
      const shape = new THREE.Shape();
      points.forEach((point, index) => index === 0 ? shape.moveTo(point.x, -point.z) : shape.lineTo(point.x, -point.z));
      shape.closePath();
      const height = Math.min(65, Math.max(5, feature.height ?? 7 + seeded(feature.id) * 24));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      const baseHeight = this.heightField.sampleHeight(centerX, centerZ);
      geometry.translate(0, baseHeight, 0);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      this.colliders.push({ minX: box.min.x, maxX: box.max.x, minY: baseHeight, maxY: baseHeight + height, minZ: box.min.z, maxZ: box.max.z, label: feature.name || '주변 건물' });
      geometry.translate(-chunk.x, 0, -chunk.z);
      builder.detailed.push(geometry);

      const width = Math.max(1, box.max.x - box.min.x);
      const depth = Math.max(1, box.max.z - box.min.z);
      const simplified = new THREE.BoxGeometry(width, height, depth);
      simplified.translate(centerX - chunk.x, baseHeight + height / 2, centerZ - chunk.z);
      builder.simple.push(simplified);
    });
    builders.forEach(({ chunk, detailed, simple }) => {
      const detailedGeometry = mergeGeometries(detailed);
      const simpleGeometry = mergeGeometries(simple);
      if (!detailedGeometry || !simpleGeometry) return;
      const detailedMesh = new THREE.Mesh(detailedGeometry, this.facadeMaterial);
      detailedMesh.castShadow = quality === 'high';
      detailedMesh.receiveShadow = true;
      const simpleMesh = new THREE.Mesh(simpleGeometry, this.simpleBuildingMaterial);
      simpleMesh.receiveShadow = true;
      const lod = new THREE.LOD();
      lod.name = `building-lod-${chunk.key}`;
      lod.addLevel(detailedMesh, 0);
      lod.addLevel(simpleMesh, this.chunks.settings.lodDistance);
      chunk.root.add(lod);
    });
  }

  private addBridges(data: AreaSnapshot, targetChunk?: SpatialChunk) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4f5c60, roughness: 0.8 });
    const geometries: THREE.BufferGeometry[] = [];
    data.bridges.forEach((feature) => {
      const y = feature.kind === 'trunk' ? 13 : 3.8;
      const width = feature.kind === 'trunk' ? 13 : ['secondary', 'residential'].includes(feature.kind) ? 8 : 3;
      geometries.push(ribbonGeometry(this.localPoints(feature, y), width));
    });
    const merged = mergeGeometries(geometries);
    if (!merged) return;
    if (targetChunk) merged.translate(-targetChunk.x, 0, -targetChunk.z);
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.userData.areaChunk = targetChunk?.key;
    (targetChunk?.root ?? this.scene).add(mesh);
  }

  private addTrees(quality: Quality) {
    const count = quality === 'low' ? 70 : quality === 'medium' ? 140 : 220;
    const placements = new Map<string, { chunk: SpatialChunk; trees: Array<{ x: number; y: number; z: number; scale: number }> }>();
    for (let index = 0; index < count; index += 1) {
      const angle = seeded(index + 19) * Math.PI * 2;
      const radius = 55 + seeded(index + 83) * 410;
      const x = Math.cos(angle) * radius + Math.sin(index) * 35;
      const z = Math.sin(angle) * radius;
      const scale = 0.75 + seeded(index + 191) * 0.65;
      const chunk = this.chunks.getOrCreate(x, z);
      let placement = placements.get(chunk.key);
      if (!placement) {
        placement = { chunk, trees: [] };
        placements.set(chunk.key, placement);
      }
      placement.trees.push({ x: x - chunk.x, y: this.heightField.sampleHeight(x, z), z: z - chunk.z, scale });
    }

    const trunk = new THREE.CylinderGeometry(0.28, 0.38, 3.2, 6);
    trunk.translate(0, 1.6, 0);
    const crown = new THREE.ConeGeometry(1.6, 4.5, 7);
    crown.translate(0, 3.25, 0);
    const farCrown = new THREE.ConeGeometry(1.45, 5.2, 4);
    farCrown.translate(0, 2.6, 0);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x635d49, roughness: 1 });
    const crownMaterial = new THREE.MeshStandardMaterial({ color: 0x3f7655, roughness: 1 });
    const farMaterial = new THREE.MeshStandardMaterial({ color: 0x53755b, roughness: 1 });
    placements.forEach(({ chunk, trees }) => {
      const nearGroup = new THREE.Group();
      const trunks = new THREE.InstancedMesh(trunk, trunkMaterial, trees.length);
      const crowns = new THREE.InstancedMesh(crown, crownMaterial, trees.length);
      const farCrowns = new THREE.InstancedMesh(farCrown, farMaterial, trees.length);
      const matrix = new THREE.Matrix4();
      trees.forEach((tree, index) => {
        matrix.compose(new THREE.Vector3(tree.x, tree.y, tree.z), new THREE.Quaternion(), new THREE.Vector3(tree.scale, tree.scale, tree.scale));
        trunks.setMatrixAt(index, matrix);
        crowns.setMatrixAt(index, matrix);
        farCrowns.setMatrixAt(index, matrix);
      });
      trunks.castShadow = quality === 'high';
      crowns.castShadow = quality === 'high';
      nearGroup.add(trunks, crowns);
      const lod = new THREE.LOD();
      lod.name = `vegetation-lod-${chunk.key}`;
      lod.addLevel(nearGroup, 0);
      lod.addLevel(farCrowns, this.chunks.settings.lodDistance * 0.72);
      chunk.root.add(lod);
    });
  }

  private addLandingPad() {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.18, 40), new THREE.MeshStandardMaterial({ color: 0x263e42, roughness: 0.8 }));
    const groundHeight = this.heightField.sampleHeight(CONFIG.start.x, CONFIG.start.z);
    pad.position.set(CONFIG.start.x, groundHeight + 0.09, CONFIG.start.z);
    pad.receiveShadow = true;
    this.scene.add(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.13, 8, 48), new THREE.MeshBasicMaterial({ color: 0xcafa79 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(pad.position).setY(groundHeight + 0.2);
    this.scene.add(ring);
  }

  private createDrone() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 1.35), new THREE.MeshStandardMaterial({ color: 0xe6ebe3, roughness: 0.45 }));
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d3036, roughness: 0.5 });
    this.drone.add(body);
    [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].forEach(([x, z]) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 1.2), dark);
      arm.position.set(x / 2, 0, z / 2);
      arm.rotation.y = Math.sign(x * z) * Math.PI / 4;
      this.drone.add(arm);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.035, 20), new THREE.MeshBasicMaterial({ color: 0x26383d, transparent: true, opacity: 0.55 }));
      rotor.position.set(x, 0.18, z);
      this.drone.add(rotor);
      this.rotors.push(rotor);
    });
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xcafa79 }));
    light.position.set(0, 0.12, -0.7);
    this.drone.add(light);
    this.drone.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = true; });
    this.scene.add(this.drone);
  }

  private createCheckpoints() {
    CONFIG.checkpoints.forEach((_, index) => {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.28, 10, 42), new THREE.MeshStandardMaterial({ color: 0x889c96, emissive: 0x18211f, emissiveIntensity: 0.5 }));
      const actualPosition = this.checkpointPositions[index];
      const previous = index === 0 ? this.startPosition : this.checkpointPositions[index - 1];
      ring.rotation.y = Math.atan2(actualPosition.x - previous.x, actualPosition.z - previous.z);
      group.add(ring);
      group.position.set(actualPosition.x, actualPosition.y, actualPosition.z);
      group.visible = false;
      this.checkpointObjects.push(group);
      this.scene.add(group);
    });
  }

  groundHeightAt = (x: number, z: number) => this.heightField.sampleHeight(x, z);

  private localPoints(feature: GeoFeature, offset = 0): THREE.Vector3[] {
    return feature.points.map((point) => {
      const local = geoToLocal(point, CONFIG.origin);
      return new THREE.Vector3(local.x, this.heightField.sampleHeight(local.x, local.z) + offset, local.z);
    });
  }

  private drape<T extends THREE.BufferGeometry>(geometry: T, offset: number): T {
    const positions = geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index += 1) {
      positions.setY(index, this.heightField.sampleHeight(positions.getX(index), positions.getZ(index)) + offset);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }

  updateDrone(position: { x: number; y: number; z: number }, yaw: number, velocity: { x: number; z: number }, elapsed: number) {
    this.drone.position.set(position.x, position.y, position.z);
    this.drone.rotation.set(Math.max(-0.22, Math.min(0.22, velocity.z * 0.012)), yaw, Math.max(-0.25, Math.min(0.25, -velocity.x * 0.012)));
    this.rotors.forEach((rotor, index) => { rotor.rotation.y = elapsed * (index % 2 ? -20 : 20); });
    if (this.waterMaterial.map) {
      this.waterMaterial.map.offset.x = elapsed * 0.004;
      this.waterMaterial.map.offset.y = Math.sin(elapsed * 0.12) * 0.025;
    }
  }

  async prepare(position: Pick<Vec3, 'x' | 'z'>) {
    await this.ensureChunks(position);
    this.chunks.update(position);
  }

  updateStreaming(position: Pick<Vec3, 'x' | 'z'>) {
    this.chunks.update(position);
    void this.ensureChunks(position).catch((error: unknown) => console.error('지역 청크 로딩 실패', error));
  }

  setQuality(quality: Quality) {
    this.quality = quality;
    const settings = chunkSettingsForQuality(quality);
    if (this.sun) this.sun.castShadow = quality === 'high';
    this.chunks.configure(settings);
    for (const chunk of this.chunks.values()) {
      chunk.root.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) object.castShadow = quality === 'high';
        if (!(object instanceof THREE.LOD) || object.levels.length < 2) return;
        object.levels[1].distance = object.name.startsWith('vegetation') ? settings.lodDistance * 0.72 : settings.lodDistance;
      });
    }
    this.chunks.update(this.drone.position);
  }

  get loadedChunkCount() { return this.loadedChunkKeys.size; }

  private async ensureChunks(position: Pick<Vec3, 'x' | 'z'>) {
    if (!this.chunkSource) return;
    const keys = this.chunkSource.keysAround(position.x, position.z, this.chunks.settings.loadRadius);
    await Promise.all(keys.map((key) => this.loadChunk(key)));
  }

  private loadChunk(key: string): Promise<void> {
    if (!this.chunkSource || this.loadedChunkKeys.has(key)) return Promise.resolve();
    const existing = this.chunkRequests.get(key);
    if (existing) return existing;
    const request = this.chunkSource.load(key)
      .then((data) => {
        const chunk = this.chunks.getOrCreateKey(key);
        this.addParks(data, chunk);
        this.addRoads(data, chunk);
        this.addBuildings(data, this.quality);
        this.addBridges(data, chunk);
        this.loadedChunkKeys.add(key);
      })
      .finally(() => this.chunkRequests.delete(key));
    this.chunkRequests.set(key, request);
    return request;
  }

  setCheckpointState(active: number, visible: boolean) {
    this.checkpointObjects.forEach((group, index) => {
      group.visible = visible;
      const mesh = group.children[0] as THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
      mesh.material.color.set(index < active ? 0xcafa79 : index === active ? 0xffa75e : 0x718680);
      mesh.material.emissive.set(index === active ? 0x6b3210 : 0x18211f);
    });
  }
}
