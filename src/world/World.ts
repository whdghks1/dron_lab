import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AreaChunkSource, AreaConfig, AreaDetailConfig, AreaSnapshot, AreaVisualConfig, ElevationGrid, FacadePhotoSide, GeoFeature } from '../areas/types';
import type { BoxCollider, Vec3 } from '../game/types';
import { colliderIntersectsSphere } from '../game/CollisionSystem';
import { geoToLocal } from '../utils/geo';
import { assignExtrudeSideMaterialGroups, horizontalShape, ribbonGeometry } from './geometry';
import { TerrainHeightField } from './TerrainHeightField';
import { SpatialChunkManager, chunkSettingsForQuality, type SpatialChunk } from './SpatialChunkManager';
import { createDetailMaterials, createFacadeMaterial, createRoadMaterials, createWaterMaterial, setDetailMaterialQuality } from './materials';
import { BridgeBuilder } from './details/BridgeBuilder';
import { RiverbankBuilder } from './details/RiverbankBuilder';
import { PropPlacementSystem } from './details/PropPlacementSystem';
import { VegetationSystem } from './details/VegetationSystem';
import { LandmarkLoader } from './details/LandmarkLoader';
import { assignDirectionalFacadeGroups, directionalFacadeMaterialIndices } from './details/FacadeSystem';
import { RoadBuilder } from './details/RoadBuilder';

export type Quality = 'low' | 'medium' | 'high';

const seeded = (id: number) => ((id * 9301 + 49297) % 233280) / 233280;

function gableRoofGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1, -0.5, -1, 1, -0.5, -1, 0, 0.5, -1,
    -1, -0.5, 1, 1, -0.5, 1, 0, 0.5, 1,
  ], 3));
  geometry.setIndex([0, 1, 2, 5, 4, 3, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0]);
  geometry.computeVertexNormals();
  return geometry;
}

interface StreamedChunkContent {
  root: THREE.Group;
  colliders: BoxCollider[];
  lastUsed: number;
}

interface BuildingDetailInstance {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotationY: number;
}

interface PhotoFacadeMaterialSet {
  materials: THREE.MeshStandardMaterial[];
  facades?: FacadePhotoSide[];
}

export interface StreamingStats {
  active: number;
  cached: number;
  cacheLimit: number;
  pending: number;
}

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
  private readonly streamedChunks = new Map<string, StreamedChunkContent>();
  private readonly chunkRequests = new Map<string, Promise<void>>();
  private readonly facadeMaterials = [createFacadeMaterial(0), createFacadeMaterial(1), createFacadeMaterial(2)];
  private readonly customFacadeMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly roofMaterial = new THREE.MeshStandardMaterial({ color: 0x777d78, roughness: 0.94 });
  private readonly rooftopMaterial = new THREE.MeshStandardMaterial({ color: 0x9da5a1, roughness: 0.78, metalness: 0.18 });
  private readonly buildingTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x536166, roughness: 0.68, metalness: 0.12 });
  private readonly simpleBuildingMaterial = new THREE.MeshStandardMaterial({ color: 0x9da8a1, roughness: 1 });
  private readonly waterMaterial = createWaterMaterial();
  private readonly parkMaterial = new THREE.MeshStandardMaterial({ color: 0x678967, roughness: 1 });
  private readonly roadMaterials = createRoadMaterials();
  private readonly photoFacadeMaterials = new Map<number, PhotoFacadeMaterialSet>();
  private readonly detailMaterials: ReturnType<typeof createDetailMaterials>;
  private readonly bridgeBuilder: BridgeBuilder;
  private readonly riverbankBuilder: RiverbankBuilder;
  private readonly propPlacement: PropPlacementSystem;
  private readonly vegetation: VegetationSystem;
  private readonly landmarkLoader: LandmarkLoader;
  private readonly roadBuilder: RoadBuilder;
  private readonly flightTrail = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xcafa79, transparent: true, opacity: 0.62 }),
  );
  private sun?: THREE.DirectionalLight;
  private quality: Quality;
  private streamClock = 0;
  private lastStreamPosition?: Pick<Vec3, 'x' | 'z'>;

  constructor(
    readonly config: AreaConfig,
    private readonly data: AreaSnapshot,
    elevation: ElevationGrid,
    quality: Quality,
    private readonly chunkSource?: AreaChunkSource,
    visuals?: AreaVisualConfig,
    details?: AreaDetailConfig,
  ) {
    this.quality = quality;
    this.detailMaterials = createDetailMaterials(quality);
    this.createPhotoFacadeMaterials(visuals);
    this.heightField = new TerrainHeightField(elevation, config.origin);
    this.chunks = new SpatialChunkManager(this.scene, chunkSettingsForQuality(quality));
    const detailContext = { origin: config.origin, heightAt: this.groundHeightAt, materials: this.detailMaterials, colliders: this.colliders, quality };
    this.bridgeBuilder = new BridgeBuilder({ ...detailContext, overrides: details?.bridgeOverrides });
    this.riverbankBuilder = new RiverbankBuilder({ ...detailContext, bounds: config.bounds, segments: details?.riverbankSegments, accesses: details?.riverbankAccesses });
    this.propPlacement = new PropPlacementSystem({ ...detailContext, rules: details?.propRules });
    this.vegetation = new VegetationSystem({ origin: config.origin, bounds: config.bounds, heightAt: this.groundHeightAt, config: details?.vegetation, quality, chunkSize: this.chunks.settings.size, water: data.water });
    this.landmarkLoader = new LandmarkLoader(detailContext);
    this.roadBuilder = new RoadBuilder({ origin: config.origin, heightAt: this.groundHeightAt, materials: this.roadMaterials, quality });
    this.startPosition = { ...config.start, y: this.heightField.sampleHeight(config.start.x, config.start.z) + config.start.y };
    this.checkpointPositions = config.checkpoints.map((checkpoint) => ({
      ...checkpoint.position,
      y: this.heightField.sampleHeight(checkpoint.position.x, checkpoint.position.z) + checkpoint.position.y,
    }));
    this.scene.background = new THREE.Color(0x9dc4ce);
    this.scene.fog = new THREE.FogExp2(0xa8c8c9, 0.00125);
    this.addLights(quality);
    this.addTerrain();
    this.addWater();
    this.riverbankBuilder.build(this.data.water, this.scene);
    this.roadBuilder.build(this.data, this.scene);
    this.addBuildings(this.data, quality);
    this.bridgeBuilder.build(this.data.bridges, this.scene);
    this.propPlacement.build(this.data, this.scene);
    if (!this.chunkSource) {
      for (const chunk of this.chunks.values()) this.vegetation.buildChunk(chunk, this.data, chunk.root);
    }
    this.landmarkLoader.build(details?.landmarks ?? [], this.scene);
    this.ensureCheckpointClearance();
    this.addLandingPad();
    this.createDrone();
    this.flightTrail.name = 'flight-trail';
    this.flightTrail.frustumCulled = false;
    this.scene.add(this.flightTrail);
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
      this.heightField.createGeometry(this.config.bounds),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    );
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.addParks(this.data);
  }

  private addParks(data: AreaSnapshot, targetChunk?: SpatialChunk, targetRoot: THREE.Object3D = targetChunk?.root ?? this.scene) {
    for (const park of data.parks) {
      const points = this.localPoints(park);
      if (points.length <= 2) continue;
      const geometry = this.drape(horizontalShape(points), 0.05);
      if (targetChunk) geometry.translate(-targetChunk.x, 0, -targetChunk.z);
      const mesh = new THREE.Mesh(geometry, this.parkMaterial);
      mesh.userData.areaChunk = targetChunk?.key;
      targetRoot.add(mesh);
    }
  }

  private addWater() {
    const polygonWater = this.data.water.filter((feature) => feature.points.length > 3 && feature.points[0].lat === feature.points.at(-1)?.lat && feature.points[0].lon === feature.points.at(-1)?.lon);
    const geometries: THREE.BufferGeometry[] = polygonWater.map((feature) => this.drape(horizontalShape(this.localPoints(feature)), 0.08));
    this.data.water.filter((feature) => !polygonWater.includes(feature) && feature.kind === 'river').forEach((feature) => geometries.push(ribbonGeometry(this.localPoints(feature, 0.07), 13)));
    if (geometries.length === 0) return;
    const merged = mergeGeometries(geometries);
    if (merged) this.scene.add(new THREE.Mesh(merged, this.waterMaterial));
  }

  private createPhotoFacadeMaterials(visuals?: AreaVisualConfig) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    for (const photo of visuals?.buildingPhotoTextures ?? []) {
      const directional = photo.facades?.length ? photo.facades : undefined;
      const sources: Array<{ url: string; repeat?: [number, number]; offset?: [number, number] }> = directional
        ?? (photo.sideUrls?.length ? photo.sideUrls.map((url) => ({ url })) : [{ url: photo.url }]);
      const photoMaterials = sources.map((source) => {
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0.02 });
        material.map = loader.load(
          source.url,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            const repeat: [number, number] = source.repeat ?? [0.06, 0.08];
            const offset: [number, number] = source.offset ?? [0, 0];
            texture.repeat.set(...repeat);
            texture.offset.set(...offset);
            material.needsUpdate = true;
          },
          undefined,
          () => {
            const fallback = this.facadeMaterials[0];
            material.map = fallback.map;
            material.color.copy(fallback.color);
            material.needsUpdate = true;
            console.warn(`건물 사진 텍스처를 불러오지 못해 절차형 외벽을 사용합니다: ${source.url}`);
          },
        );
        return material;
      });
      for (const featureId of photo.featureIds) {
        const fallback = this.facadeMaterials[Math.floor(seeded(featureId + 71) * this.facadeMaterials.length)];
        this.photoFacadeMaterials.set(featureId, directional
          ? { materials: [fallback, ...photoMaterials], facades: directional }
          : { materials: photoMaterials });
      }
    }
  }

  private facadeMaterialFor(feature: GeoFeature) {
    const colorTag = feature.facadeColor && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(feature.facadeColor) ? feature.facadeColor : undefined;
    const materialTag = feature.buildingMaterial?.toLowerCase();
    if (!colorTag && !materialTag) return this.facadeMaterials[Math.floor(seeded(feature.id + 71) * this.facadeMaterials.length)];
    const key = `${materialTag ?? 'default'}:${colorTag ?? 'default'}`;
    const cached = this.customFacadeMaterials.get(key);
    if (cached) return cached;
    const glass = materialTag === 'glass';
    const color = colorTag ?? (glass ? '#9abac4' : materialTag === 'wood' ? '#9b7655' : '#c5cbc5');
    const material = new THREE.MeshStandardMaterial({
      color,
      map: glass ? null : this.facadeMaterials[0].map,
      roughness: glass ? 0.24 : 0.72,
      metalness: glass ? 0.16 : 0.03,
    });
    this.customFacadeMaterials.set(key, material);
    return material;
  }

  private buildingMesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], quality: Quality) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = quality === 'high';
    mesh.receiveShadow = true;
    return mesh;
  }

  private addBuildings(data: AreaSnapshot, quality: Quality, targetRoots = new Map<string, THREE.Object3D>()) {
    type Builder = {
      chunk: SpatialChunk;
      root: THREE.Object3D;
      detailed: Map<THREE.Material, THREE.BufferGeometry[]>;
      photos: Array<{ geometry: THREE.BufferGeometry; materials: THREE.Material[] }>;
      rooftopBoxes: BuildingDetailInstance[];
      facadeBoxes: BuildingDetailInstance[];
      tanks: BuildingDetailInstance[];
      pyramidRoofs: BuildingDetailInstance[];
      gableRoofs: BuildingDetailInstance[];
      roundRoofs: BuildingDetailInstance[];
      simple: THREE.BufferGeometry[];
    };
    const builders = new Map<string, Builder>();
    data.buildings.forEach((feature) => {
      const points = this.localPoints(feature);
      if (points.length < 3) return;
      const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
      const centerZ = points.reduce((sum, point) => sum + point.z, 0) / points.length;
      const chunk = this.chunks.getOrCreate(centerX, centerZ);
      let builder = builders.get(chunk.key);
      if (!builder) {
        builder = {
          chunk,
          root: targetRoots.get(chunk.key) ?? chunk.root,
          detailed: new Map(),
          photos: [],
          rooftopBoxes: [],
          facadeBoxes: [],
          tanks: [],
          pyramidRoofs: [],
          gableRoofs: [],
          roundRoofs: [],
          simple: [],
        };
        builders.set(chunk.key, builder);
      }
      const shape = new THREE.Shape();
      points.forEach((point, index) => index === 0 ? shape.moveTo(point.x, -point.z) : shape.lineTo(point.x, -point.z));
      shape.closePath();
      const height = Math.min(65, Math.max(5, feature.height ?? (feature.levels ? feature.levels * 3.2 : 7 + seeded(feature.id) * 24)));
      const minHeight = Math.min(height - 3, Math.max(0, feature.minHeight ?? 0));
      const roofShape = feature.roofShape ?? (feature.kind === 'house' ? 'gabled' : 'flat');
      const inferredRoofHeight = roofShape === 'flat' ? 0 : Math.min(3.6, height * 0.22);
      const roofHeight = Math.min(height * 0.25, Math.max(0, feature.roofHeight ?? inferredRoofHeight));
      const wallHeight = Math.max(3, height - minHeight - roofHeight);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: wallHeight, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      const baseHeight = this.heightField.sampleHeight(centerX, centerZ);
      geometry.translate(0, baseHeight + minHeight, 0);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const footprint = points.length > 3 && points[0].distanceToSquared(points.at(-1)!) < 1e-8 ? points.slice(0, -1) : points;
      this.colliders.push({
        minX: box.min.x, maxX: box.max.x,
        minY: baseHeight + minHeight, maxY: baseHeight + height,
        minZ: box.min.z, maxZ: box.max.z,
        footprint: footprint.map((point) => ({ x: point.x, z: point.z })),
        label: feature.name || '주변 건물',
      });
      geometry.translate(-chunk.x, 0, -chunk.z);
      const photoSet = this.photoFacadeMaterials.get(feature.id);
      if (photoSet) {
        if (photoSet.facades) assignDirectionalFacadeGroups(geometry, directionalFacadeMaterialIndices(points, photoSet.facades));
        else assignExtrudeSideMaterialGroups(geometry, photoSet.materials.length);
        builder.photos.push({ geometry, materials: photoSet.materials });
      } else {
        const facade = this.facadeMaterialFor(feature);
        const geometries = builder.detailed.get(facade) ?? [];
        geometries.push(geometry);
        builder.detailed.set(facade, geometries);
      }

      const width = Math.max(1, box.max.x - box.min.x);
      const depth = Math.max(1, box.max.z - box.min.z);
      this.addBuildingDetails(feature, points, builder.rooftopBoxes, builder.facadeBoxes, builder.tanks, builder.pyramidRoofs, builder.gableRoofs, builder.roundRoofs, {
        centerX, centerZ, width, depth, baseHeight, height, roofHeight, roofShape, wallTop: baseHeight + minHeight + wallHeight, chunkX: chunk.x, chunkZ: chunk.z,
      });
      const simplified = new THREE.ExtrudeGeometry(shape, { depth: wallHeight + roofHeight, bevelEnabled: false });
      simplified.rotateX(-Math.PI / 2);
      simplified.translate(-chunk.x, baseHeight + minHeight, -chunk.z);
      builder.simple.push(simplified);
    });
    builders.forEach(({ chunk, root, detailed, photos, rooftopBoxes, facadeBoxes, tanks, pyramidRoofs, gableRoofs, roundRoofs, simple }) => {
      const simpleGeometry = mergeGeometries(simple);
      if (!simpleGeometry) return;
      const near = new THREE.Group();
      detailed.forEach((geometries, material) => {
        const detailedGeometry = mergeGeometries(geometries);
        if (detailedGeometry) near.add(this.buildingMesh(detailedGeometry, material, quality));
      });
      photos.forEach(({ geometry, materials }) => {
        near.add(this.buildingMesh(geometry, [this.roofMaterial, ...materials], quality));
      });
      this.addBuildingDetailInstances(near, rooftopBoxes, new THREE.BoxGeometry(1, 1, 1), this.rooftopMaterial, 'quality-detail-building-rooftops', quality);
      this.addBuildingDetailInstances(near, facadeBoxes, new THREE.BoxGeometry(1, 1, 1), this.buildingTrimMaterial, 'quality-detail-building-facades', quality);
      this.addBuildingDetailInstances(near, tanks, new THREE.CylinderGeometry(1, 1.04, 1, 12), this.rooftopMaterial, 'quality-detail-building-tanks', quality);
      this.addBuildingDetailInstances(near, pyramidRoofs, new THREE.ConeGeometry(1, 1, 4), this.rooftopMaterial, 'quality-detail-building-pyramid-roofs', quality);
      this.addBuildingDetailInstances(near, gableRoofs, gableRoofGeometry(), this.rooftopMaterial, 'quality-detail-building-gable-roofs', quality);
      const roundRoofGeometry = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      roundRoofGeometry.translate(0, -0.5, 0);
      this.addBuildingDetailInstances(near, roundRoofs, roundRoofGeometry, this.rooftopMaterial, 'quality-detail-building-round-roofs', quality);
      const simpleMesh = new THREE.Mesh(simpleGeometry, this.simpleBuildingMaterial);
      simpleMesh.receiveShadow = true;
      const lod = new THREE.LOD();
      lod.name = `building-lod-${chunk.key}`;
      lod.addLevel(near, 0);
      lod.addLevel(simpleMesh, this.chunks.settings.lodDistance);
      root.add(lod);
    });
  }

  private addBuildingDetails(
    feature: GeoFeature,
    points: THREE.Vector3[],
    rooftopBoxes: BuildingDetailInstance[],
    facadeBoxes: BuildingDetailInstance[],
    tanks: BuildingDetailInstance[],
    pyramidRoofs: BuildingDetailInstance[],
    gableRoofs: BuildingDetailInstance[],
    roundRoofs: BuildingDetailInstance[],
    size: { centerX: number; centerZ: number; width: number; depth: number; baseHeight: number; height: number; roofHeight: number; roofShape: string; wallTop: number; chunkX: number; chunkZ: number },
  ) {
    if (size.width < 3 || size.depth < 3) return;
    const edges = points.map((from, index) => {
      const to = points[(index + 1) % points.length];
      return { from, to, length: Math.hypot(to.x - from.x, to.z - from.z) };
    }).filter((edge) => edge.length > 0.8).sort((left, right) => right.length - left.length);

    if (size.width > 5 && size.depth > 5) {
      edges.forEach((edge) => {
        rooftopBoxes.push(this.segmentBox(edge.from, edge.to, size.wallTop + 0.28, 0.56, 0.2, size.chunkX, size.chunkZ));
      });
    }

    if (size.width > 6 && size.depth > 6 && seeded(feature.id + 311) > 0.34) {
      const equipmentWidth = Math.min(5.5, size.width * 0.32);
      const equipmentDepth = Math.min(4.2, size.depth * 0.28);
      const equipmentHeight = 0.65 + seeded(feature.id + 503) * 1.2;
      rooftopBoxes.push({
        position: new THREE.Vector3(
          size.centerX - size.chunkX + (seeded(feature.id + 719) - 0.5) * size.width * 0.28,
          size.wallTop + equipmentHeight / 2,
          size.centerZ - size.chunkZ + (seeded(feature.id + 877) - 0.5) * size.depth * 0.28,
        ),
        scale: new THREE.Vector3(equipmentWidth, equipmentHeight, equipmentDepth),
        rotationY: 0,
      });
    }

    if (size.height > 16 && Math.min(size.width, size.depth) > 7 && seeded(feature.id + 991) > 0.38) {
      const radius = Math.min(1.45, Math.min(size.width, size.depth) * 0.11);
      const tankHeight = 1.3 + seeded(feature.id + 1103) * 1.1;
      tanks.push({
        position: new THREE.Vector3(size.centerX - size.chunkX - size.width * 0.18, size.wallTop + tankHeight / 2, size.centerZ - size.chunkZ + size.depth * 0.16),
        scale: new THREE.Vector3(radius, tankHeight, radius),
        rotationY: 0,
      });
    }

    const apartmentLike = ['apartments', 'hospital', 'commercial', 'retail'].includes(feature.kind);
    if ((apartmentLike || (size.height > 20 && seeded(feature.id + 1217) > 0.7)) && edges.length > 0) {
      const ledgeEdges = edges.filter((edge) => edge.length > 7).slice(0, 2);
      const floorCount = Math.min(12, Math.max(1, Math.floor((size.wallTop - size.baseHeight - 4) / 3.2)));
      ledgeEdges.forEach((edge) => {
        for (let floor = 1; floor <= floorCount; floor += 1) {
          facadeBoxes.push(this.segmentBox(edge.from, edge.to, size.baseHeight + 2.9 + floor * 3.2, 0.13, 0.62, size.chunkX, size.chunkZ, 0.22, Number.POSITIVE_INFINITY, size.centerX, size.centerZ));
        }
      });
    }

    const entrance = edges[0];
    if (entrance && entrance.length > 5 && seeded(feature.id + 1301) > 0.42) {
      facadeBoxes.push(this.segmentBox(entrance.from, entrance.to, size.baseHeight + 2.65, 0.2, 1.5, size.chunkX, size.chunkZ, 0.64, Math.min(4, entrance.length * 0.45), size.centerX, size.centerZ));
    }

    if (size.roofHeight > 0 && size.width > 4 && size.depth > 4) {
      const base = {
        position: new THREE.Vector3(size.centerX - size.chunkX, size.wallTop + size.roofHeight / 2, size.centerZ - size.chunkZ),
      };
      if (['round', 'dome'].includes(size.roofShape)) {
        roundRoofs.push({ ...base, scale: new THREE.Vector3(size.width / 2, size.roofHeight, size.depth / 2), rotationY: 0 });
      } else if (['gabled', 'skillion'].includes(size.roofShape)) {
        const rotate = size.width > size.depth;
        gableRoofs.push({
          ...base,
          scale: new THREE.Vector3((rotate ? size.depth : size.width) / 2, size.roofHeight, (rotate ? size.width : size.depth) / 2),
          rotationY: rotate ? Math.PI / 2 : 0,
        });
      } else {
        pyramidRoofs.push({
          ...base,
          scale: new THREE.Vector3(size.width / Math.SQRT2, size.roofHeight, size.depth / Math.SQRT2),
          rotationY: Math.PI / 4,
        });
      }
    }
  }

  private segmentBox(
    from: THREE.Vector3,
    to: THREE.Vector3,
    y: number,
    height: number,
    depth: number,
    chunkX: number,
    chunkZ: number,
    outwardOffset = 0,
    maximumLength = Number.POSITIVE_INFINITY,
    buildingCenterX = 0,
    buildingCenterZ = 0,
  ) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const fullLength = Math.hypot(dx, dz) || 1;
    const length = Math.min(fullLength, maximumLength);
    const middleX = (from.x + to.x) / 2;
    const middleZ = (from.z + to.z) / 2;
    let normalX = -dz / fullLength;
    let normalZ = dx / fullLength;
    const angle = Math.atan2(dz, dx);
    if (outwardOffset !== 0) {
      if (normalX * (middleX - buildingCenterX) + normalZ * (middleZ - buildingCenterZ) < 0) {
        normalX *= -1;
        normalZ *= -1;
      }
    }
    return {
      position: new THREE.Vector3(middleX - chunkX + normalX * outwardOffset, y, middleZ - chunkZ + normalZ * outwardOffset),
      scale: new THREE.Vector3(length, height, depth),
      rotationY: -angle,
    };
  }

  private addBuildingDetailInstances(
    parent: THREE.Object3D,
    instances: BuildingDetailInstance[],
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    name: string,
    quality: Quality,
  ) {
    if (instances.length === 0) {
      geometry.dispose();
      return;
    }
    const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    instances.forEach((instance, index) => {
      quaternion.setFromAxisAngle(up, instance.rotationY);
      matrix.compose(instance.position, quaternion, instance.scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = name;
    mesh.castShadow = quality === 'high';
    mesh.receiveShadow = true;
    mesh.visible = quality !== 'low';
    parent.add(mesh);
  }

  private addLandingPad() {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.18, 40), new THREE.MeshStandardMaterial({ color: 0x263e42, roughness: 0.8 }));
    const groundHeight = this.heightField.sampleHeight(this.config.start.x, this.config.start.z);
    pad.position.set(this.config.start.x, groundHeight + 0.09, this.config.start.z);
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
    this.config.checkpoints.forEach((_, index) => {
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

  private ensureCheckpointClearance() {
    this.checkpointPositions.forEach((checkpoint, checkpointIndex) => {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const collider = this.colliders.find((box) => colliderIntersectsSphere(box, checkpoint, 0.8));
        if (!collider) break;
        checkpoint.y = collider.maxY + 1.8;
      }
      this.checkpointObjects[checkpointIndex]?.position.setY(checkpoint.y);
    });
  }

  groundHeightAt = (x: number, z: number) => this.heightField.sampleHeight(x, z);

  private localPoints(feature: GeoFeature, offset = 0): THREE.Vector3[] {
    return feature.points.map((point) => {
      const local = geoToLocal(point, this.config.origin);
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

  setFlightTrail(points: Vec3[]) {
    const previous = this.flightTrail.geometry;
    this.flightTrail.geometry = new THREE.BufferGeometry().setFromPoints(
      points.map((point) => new THREE.Vector3(point.x, point.y + 0.08, point.z)),
    );
    previous.dispose();
  }

  async prepare(position: Pick<Vec3, 'x' | 'z'>) {
    await this.ensureChunks(position);
    this.chunks.update(position);
  }

  updateStreaming(position: Pick<Vec3, 'x' | 'z'>) {
    this.chunks.update(position);
    if (this.lastStreamPosition && Math.hypot(position.x - this.lastStreamPosition.x, position.z - this.lastStreamPosition.z) < this.chunks.settings.size / 4) return;
    void this.ensureChunks(position).catch((error: unknown) => console.error('지역 청크 로딩 실패', error));
  }

  setQuality(quality: Quality) {
    this.quality = quality;
    this.bridgeBuilder.setQuality(quality);
    this.riverbankBuilder.setQuality(quality);
    this.propPlacement.setQuality(quality);
    this.vegetation.setQuality(quality);
    this.landmarkLoader.setQuality(quality);
    this.roadBuilder.setQuality(quality);
    setDetailMaterialQuality(this.detailMaterials, quality);
    const settings = chunkSettingsForQuality(quality);
    if (this.sun) this.sun.castShadow = quality === 'high';
    this.chunks.configure(settings);
    for (const chunk of this.chunks.values()) {
      chunk.root.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) object.castShadow = quality === 'high';
        if (object.name.startsWith('quality-detail-')) object.visible = quality !== 'low';
        const qualityLevels = object.userData.qualityLevels as Quality[] | undefined;
        if (qualityLevels) object.visible = qualityLevels.includes(quality);
        const qualityCounts = object.userData.qualityCounts as Record<Quality, number> | undefined;
        if (qualityCounts && object instanceof THREE.InstancedMesh) object.count = qualityCounts[quality];
        if (!(object instanceof THREE.LOD) || object.levels.length < 2) return;
        object.levels[1].distance = object.name.startsWith('vegetation') ? settings.lodDistance * 0.72 : settings.lodDistance;
      });
    }
    this.scene.traverse((object) => {
      if (object.name.startsWith('quality-detail-')) object.visible = quality !== 'low';
      const qualityLevels = object.userData.qualityLevels as Quality[] | undefined;
      if (qualityLevels) object.visible = qualityLevels.includes(quality);
      const qualityCounts = object.userData.qualityCounts as Record<Quality, number> | undefined;
      if (qualityCounts && object instanceof THREE.InstancedMesh) object.count = qualityCounts[quality];
    });
    this.chunks.update(this.drone.position);
    this.lastStreamPosition = undefined;
    void this.ensureChunks(this.drone.position).catch((error: unknown) => console.error('지역 청크 로딩 실패', error));
  }

  get loadedChunkCount() { return this.streamedChunks.size; }
  get streamingStats(): StreamingStats {
    return {
      active: this.chunks.activeCount,
      cached: this.streamedChunks.size,
      cacheLimit: this.cacheLimit,
      pending: this.chunkRequests.size,
    };
  }

  private async ensureChunks(position: Pick<Vec3, 'x' | 'z'>) {
    if (!this.chunkSource) return;
    this.lastStreamPosition = { x: position.x, z: position.z };
    const keys = this.chunkSource.keysAround(position.x, position.z, this.chunks.settings.loadRadius);
    const keep = new Set(keys);
    for (const key of keys) {
      const content = this.streamedChunks.get(key);
      if (content) content.lastUsed = ++this.streamClock;
    }
    await Promise.all(keys.map((key) => this.loadChunk(key)));
    this.evictChunks(keep);
  }

  private loadChunk(key: string): Promise<void> {
    if (!this.chunkSource || this.streamedChunks.has(key)) return Promise.resolve();
    const existing = this.chunkRequests.get(key);
    if (existing) return existing;
    const request = this.chunkSource.load(key)
      .then((data) => {
        const chunk = this.chunks.getOrCreateKey(key);
        const root = new THREE.Group();
        root.name = `streamed-content-${key}`;
        root.userData.areaChunk = key;
        chunk.root.add(root);
        const colliderStart = this.colliders.length;
        this.addParks(data, chunk, root);
        this.roadBuilder.build(data, root, { x: chunk.x, z: chunk.z });
        this.addBuildings(data, this.quality, new Map([[key, root]]));
        this.bridgeBuilder.build(data.bridges, root, { x: chunk.x, z: chunk.z });
        this.propPlacement.build(data, root, { x: chunk.x, z: chunk.z });
        this.vegetation.buildChunk(chunk, data, root);
        this.ensureCheckpointClearance();
        this.streamedChunks.set(key, { root, colliders: this.colliders.slice(colliderStart), lastUsed: ++this.streamClock });
      })
      .finally(() => this.chunkRequests.delete(key));
    this.chunkRequests.set(key, request);
    return request;
  }

  private get cacheLimit() {
    if (this.quality === 'low') return 10;
    if (this.quality === 'medium') return 18;
    return 24;
  }

  private evictChunks(keep: Set<string>) {
    if (this.streamedChunks.size <= this.cacheLimit) return;
    const candidates = [...this.streamedChunks.entries()]
      .filter(([key]) => !keep.has(key))
      .sort(([, left], [, right]) => left.lastUsed - right.lastUsed);
    for (const [key, content] of candidates) {
      if (this.streamedChunks.size <= this.cacheLimit) break;
      content.root.removeFromParent();
      content.root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      const removed = new Set(content.colliders);
      for (let index = this.colliders.length - 1; index >= 0; index -= 1) {
        if (removed.has(this.colliders[index])) this.colliders.splice(index, 1);
      }
      this.streamedChunks.delete(key);
      this.chunkSource?.release?.(key);
    }
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
