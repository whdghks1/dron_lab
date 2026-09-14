import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { LandmarkConfig } from '../../areas/types';
import type { BoxCollider } from '../../game/types';
import type { GeoOrigin } from '../../utils/geo';
import { geoToLocal } from '../../utils/geo';
import type { DetailMaterialSet } from '../materials';
import { ribbonGeometry } from '../geometry';
import type { Quality } from '../World';
import { createInstancedMesh, type InstanceTransform } from './placement';

function random01(seed: number) {
  const value = Math.sin(seed * 91.345 + 12.731) * 47453.5453;
  return value - Math.floor(value);
}

function cliffFrontZ(width: number, height: number, depth: number, x: number, y: number) {
  const u = x / Math.max(1, width) + 0.5;
  const v = y / Math.max(1, height);
  return -depth * (0.16 + Math.sin(u * Math.PI * 3.1 + v * 2.4) * 0.055 + Math.sin(v * Math.PI * 4.3 - u) * 0.035);
}

export function landmarkLocalPosition(landmark: LandmarkConfig, origin: GeoOrigin, heightAt: (x: number, z: number) => number) {
  const local = geoToLocal(landmark.position, origin);
  return new THREE.Vector3(local.x, heightAt(local.x, local.z), local.z);
}

interface LandmarkLoaderOptions {
  origin: GeoOrigin;
  heightAt: (x: number, z: number) => number;
  materials: DetailMaterialSet;
  colliders: BoxCollider[];
  quality: Quality;
}

export class LandmarkLoader {
  constructor(private readonly options: LandmarkLoaderOptions) {}

  setQuality(quality: Quality) { this.options.quality = quality; }

  build(landmarks: LandmarkConfig[], targetRoot: THREE.Object3D) {
    landmarks.forEach((landmark) => {
      const root = new THREE.Group();
      root.name = `landmark-${landmark.id}`;
      root.userData.landmark = {
        name: landmark.name,
        modelUrl: landmark.modelUrl,
        dataOrigin: landmark.placeholder?.dataOrigin,
      };
      root.position.copy(landmarkLocalPosition(landmark, this.options.origin, this.options.heightAt));
      if (landmark.placeholder?.kind === 'waterfall') this.buildWaterfall(landmark, root);
      targetRoot.add(root);
      this.addCollider(landmark, root);
    });
  }

  private buildWaterfall(landmark: LandmarkConfig, root: THREE.Group) {
    const placeholder = landmark.placeholder!;
    const rotation = placeholder.rotation ?? 0;
    const base = placeholder.baseOffset ?? 0;
    root.rotation.y = rotation;
    const cliff = new THREE.Mesh(
      this.createCliffGeometry(placeholder.width, placeholder.height, placeholder.depth),
      this.options.materials[placeholder.materialPreset ?? 'stone-bank'],
    );
    cliff.name = 'landmark-waterfall-cliff';
    cliff.position.y = base;
    cliff.castShadow = this.options.quality === 'high';
    cliff.receiveShadow = true;
    root.add(cliff);

    this.addRockFace(root, placeholder.width, placeholder.height, placeholder.depth, base);
    this.addCascades(root, placeholder.width, placeholder.height, placeholder.depth, base, placeholder.cascadeCount ?? 8);

    const basinWidth = placeholder.basinWidth ?? placeholder.width * 0.76;
    const basinDepth = placeholder.basinDepth ?? placeholder.depth * 1.25;
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.04, 0.16, 40), this.options.materials.waterfall);
    basin.name = 'landmark-waterfall-basin';
    basin.scale.set(basinWidth / 2, 1, basinDepth / 2);
    basin.position.set(0, base + 0.08, -placeholder.depth * 0.7);
    basin.receiveShadow = true;
    root.add(basin);

    const mist = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshBasicMaterial({ color: 0xd9f7fa, transparent: true, opacity: 0.18, depthWrite: false }));
    mist.name = 'quality-detail-landmark-mist';
    mist.userData.qualityLevels = ['medium', 'high'];
    mist.scale.set(placeholder.width * 0.36, 1.1, placeholder.depth * 0.38);
    mist.position.set(0, base + 0.72, -placeholder.depth * 0.42);
    mist.visible = this.options.quality !== 'low';
    root.add(mist);

    this.addWaterfallPlaza(root, placeholder.width, placeholder.depth, basinDepth, base);
  }

  private createCliffGeometry(width: number, height: number, depth: number) {
    const columns = this.options.quality === 'low' ? 12 : this.options.quality === 'medium' ? 20 : 28;
    const rows = this.options.quality === 'low' ? 8 : this.options.quality === 'medium' ? 13 : 17;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      for (let column = 0; column <= columns; column += 1) {
        const u = column / columns;
        const taper = 0.9 + Math.sin(v * Math.PI) * 0.1;
        const x = (u - 0.5) * width * taper;
        const edgeDrop = Math.abs(u - 0.5) ** 2 * height * 0.08;
        const irregularY = row === 0 ? 0 : (random01(row * 101 + column * 17) - 0.5) * 0.55;
        const y = Math.max(0, v * height - edgeDrop + irregularY);
        const z = cliffFrontZ(width, height, depth, x, y) + (random01(row * 71 + column * 29) - 0.5) * depth * 0.075;
        vertices.push(x, y, z);
        uvs.push(u * 3.4, v * 2.2);
      }
    }
    const rowWidth = columns + 1;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const a = row * rowWidth + column;
        const b = a + 1;
        const c = a + rowWidth;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private addRockFace(root: THREE.Group, width: number, height: number, depth: number, base: number) {
    const count = this.options.quality === 'low' ? 34 : this.options.quality === 'medium' ? 64 : 92;
    const rocks: InstanceTransform[] = [];
    for (let index = 0; index < count; index += 1) {
      const xRatio = random01(index * 13 + 5) - 0.5;
      const yRatio = random01(index * 17 + 9);
      const x = xRatio * width * (0.82 + Math.sin(yRatio * Math.PI) * 0.12);
      const y = base + 0.7 + yRatio * height * 0.92;
      rocks.push({
        position: new THREE.Vector3(x, y, cliffFrontZ(width, height, depth, x, y - base) - 0.28 - random01(index * 31) * 0.8),
        scale: new THREE.Vector3(1.2 + random01(index * 37) * 2.8, 0.8 + random01(index * 43) * 2.1, 0.7 + random01(index * 47) * 1.7),
        rotationY: random01(index * 53) * Math.PI,
      });
    }
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    geometry.rotateZ(0.18);
    const mesh = createInstancedMesh(geometry, this.options.materials['stone-bank'], rocks, 'landmark-waterfall-rock-face', this.options.quality === 'high');
    if (mesh) root.add(mesh);
  }

  private addCascades(root: THREE.Group, width: number, height: number, depth: number, base: number, requestedCount: number) {
    const count = this.options.quality === 'low' ? Math.min(5, requestedCount) : requestedCount;
    const geometries: THREE.BufferGeometry[] = [];
    const foam: InstanceTransform[] = [];
    for (let cascade = 0; cascade < count; cascade += 1) {
      const seed = cascade + 1;
      const topRatio = 0.58 + random01(seed * 19) * 0.4;
      const startX = (cascade / Math.max(1, count - 1) - 0.5) * width * 0.72 + (random01(seed * 23) - 0.5) * width * 0.08;
      const drift = (random01(seed * 29) - 0.5) * width * 0.16;
      const nodes = this.options.quality === 'low' ? 6 : 10;
      const points: THREE.Vector3[] = [];
      for (let node = 0; node < nodes; node += 1) {
        const t = node / (nodes - 1);
        const y = height * topRatio * (1 - t) + 0.34;
        const x = startX + drift * t + Math.sin(t * Math.PI * (2 + seed % 3) + seed) * width * 0.018;
        const z = cliffFrontZ(width, height, depth, x, y) - 0.72 - Math.sin(t * Math.PI) * 0.42;
        points.push(new THREE.Vector3(x, base + y, z));
      }
      const ribbon = ribbonGeometry(points, 0.8 + random01(seed * 41) * 2.2);
      geometries.push(ribbon);
      foam.push({
        position: points.at(-1)!.clone().add(new THREE.Vector3(0, 0.12, -0.45)),
        scale: new THREE.Vector3(1.1 + random01(seed * 59) * 1.8, 0.22, 0.6 + random01(seed * 61)),
        rotationY: random01(seed * 67) * Math.PI,
      });
    }
    const merged = mergeGeometries(geometries);
    if (merged) {
      const mesh = new THREE.Mesh(merged, this.options.materials.waterfall);
      mesh.name = 'landmark-waterfall-cascades';
      mesh.renderOrder = 2;
      root.add(mesh);
    }
    const foamMesh = createInstancedMesh(new THREE.SphereGeometry(1, 10, 5), this.options.materials.waterfall, foam, 'landmark-waterfall-foam', false);
    if (foamMesh) root.add(foamMesh);
  }

  private addWaterfallPlaza(root: THREE.Group, width: number, depth: number, basinDepth: number, base: number) {
    const deckWidth = Math.min(38, width * 0.68);
    const deckDepth = 8.5;
    const deckZ = -depth * 0.7 - basinDepth * 0.78;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(deckWidth, 0.28, deckDepth), this.options.materials['paving-stone']);
    deck.name = 'landmark-waterfall-viewing-deck';
    deck.position.set(0, base + 0.54, deckZ);
    deck.receiveShadow = true;
    root.add(deck);

    const pavilionTransforms: InstanceTransform[] = [-1, 1].map((side) => ({
      position: new THREE.Vector3(side * deckWidth * 0.36, base + 2.1, deckZ - 2.8),
      scale: new THREE.Vector3(deckWidth * 0.24, 3.4, 4.8),
      rotationY: 0,
    }));
    const pavilions = createInstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.options.materials['old-concrete'], pavilionTransforms, 'landmark-waterfall-cafe-pavilions', this.options.quality === 'high');
    if (pavilions) root.add(pavilions);

    const boardwalkPoints = [
      new THREE.Vector3(-width * 0.45, base + 0.62, -depth * 0.22),
      new THREE.Vector3(-width * 0.39, base + 0.66, -depth * 0.78),
      new THREE.Vector3(-width * 0.27, base + 0.7, -depth * 1.28),
      new THREE.Vector3(-width * 0.08, base + 0.72, deckZ + deckDepth * 0.35),
    ];
    const boardwalk = new THREE.Mesh(ribbonGeometry(boardwalkPoints, 2.8), this.options.materials['paving-stone']);
    boardwalk.name = 'landmark-waterfall-curved-boardwalk';
    boardwalk.receiveShadow = true;
    root.add(boardwalk);

    const crossingTransforms: InstanceTransform[] = [];
    for (let index = 0; index < 8; index += 1) {
      crossingTransforms.push({
        position: new THREE.Vector3(-width * 0.42 + (index % 2) * 0.7, base + 0.42, -depth * 0.1 - index * 3.25),
        scale: new THREE.Vector3(2.6 + random01(index * 71), 0.45, 1.45 + random01(index * 73) * 0.5),
        rotationY: (random01(index * 79) - 0.5) * 0.24,
      });
    }
    const steppingStones = createInstancedMesh(new THREE.DodecahedronGeometry(1, 0), this.options.materials['stone-bank'], crossingTransforms, 'quality-detail-waterfall-stepping-stones', this.options.quality === 'high');
    if (steppingStones) {
      steppingStones.userData.qualityLevels = ['medium', 'high'];
      steppingStones.visible = this.options.quality !== 'low';
      root.add(steppingStones);
    }

    const pierHeight = 13;
    const viaductPier = new THREE.Mesh(new THREE.BoxGeometry(5.8, pierHeight, 4.6), this.options.materials['old-concrete']);
    viaductPier.name = 'landmark-waterfall-viaduct-pier';
    viaductPier.position.set(-width * 0.3, base + pierHeight / 2, deckZ - 8.5);
    viaductPier.castShadow = this.options.quality === 'high';
    viaductPier.receiveShadow = true;
    root.add(viaductPier);
    this.addLocalBoxCollider(root, viaductPier.position, [5.8, pierHeight, 4.6], '내부순환로 교각');
  }

  private addCollider(landmark: LandmarkConfig, root: THREE.Group) {
    if (!landmark.collider) return;
    const [offsetX, offsetY, offsetZ] = landmark.collider.offset ?? [0, 0, 0];
    this.addLocalBoxCollider(
      root,
      new THREE.Vector3(offsetX, offsetY, offsetZ),
      landmark.collider.size,
      landmark.collider.label || landmark.name,
    );
  }

  private addLocalBoxCollider(
    root: THREE.Group,
    center: THREE.Vector3,
    size: [number, number, number],
    label: string,
  ) {
    const [width, height, depth] = size;
    const rotation = root.rotation.y;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const rotate = (x: number, z: number) => ({
      x: root.position.x + (x + center.x) * Math.cos(rotation) + (z + center.z) * Math.sin(rotation),
      z: root.position.z - (x + center.x) * Math.sin(rotation) + (z + center.z) * Math.cos(rotation),
    });
    const footprint = [
      rotate(-halfWidth, -halfDepth),
      rotate(halfWidth, -halfDepth),
      rotate(halfWidth, halfDepth),
      rotate(-halfWidth, halfDepth),
    ];
    this.options.colliders.push({
      minX: Math.min(...footprint.map((point) => point.x)),
      maxX: Math.max(...footprint.map((point) => point.x)),
      minY: root.position.y + center.y - height / 2,
      maxY: root.position.y + center.y + height / 2,
      minZ: Math.min(...footprint.map((point) => point.z)),
      maxZ: Math.max(...footprint.map((point) => point.z)),
      footprint,
      label,
    });
  }
}
