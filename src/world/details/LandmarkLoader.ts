import * as THREE from 'three';
import type { LandmarkConfig } from '../../areas/types';
import type { BoxCollider } from '../../game/types';
import type { GeoOrigin } from '../../utils/geo';
import { geoToLocal } from '../../utils/geo';
import type { DetailMaterialSet } from '../materials';
import type { Quality } from '../World';
import { createInstancedMesh, type InstanceTransform } from './placement';

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
      this.addCollider(landmark, root.position);
    });
  }

  private buildWaterfall(landmark: LandmarkConfig, root: THREE.Group) {
    const placeholder = landmark.placeholder!;
    const rotation = placeholder.rotation ?? 0;
    root.rotation.y = rotation;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(placeholder.width, placeholder.height, placeholder.depth * 0.42),
      this.options.materials[placeholder.materialPreset ?? 'stone-bank'],
    );
    wall.position.set(0, placeholder.height / 2, placeholder.depth * 0.28);
    wall.castShadow = this.options.quality === 'high';
    wall.receiveShadow = true;
    root.add(wall);

    const terraces: InstanceTransform[] = [];
    for (let level = 0; level < 4; level += 1) {
      const ratio = level / 3;
      terraces.push({
        position: new THREE.Vector3(0, 0.35 + ratio * placeholder.height * 0.7, placeholder.depth * (0.15 - ratio * 0.2)),
        scale: new THREE.Vector3(placeholder.width * (1 - ratio * 0.14), 0.52, placeholder.depth * 0.72),
        rotationY: 0,
      });
    }
    const terraceMesh = createInstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.options.materials['stone-bank'], terraces, 'landmark-waterfall-terraces', this.options.quality === 'high');
    if (terraceMesh) root.add(terraceMesh);

    const curtains: InstanceTransform[] = [];
    const columns = this.options.quality === 'low' ? 4 : 7;
    for (let column = 0; column < columns; column += 1) {
      const x = (column / Math.max(1, columns - 1) - 0.5) * placeholder.width * 0.82;
      const columnHeight = placeholder.height * (0.68 + (column % 3) * 0.08);
      curtains.push({
        position: new THREE.Vector3(x, columnHeight / 2 + 0.45, -placeholder.depth * 0.13),
        scale: new THREE.Vector3(placeholder.width / columns * 0.72, columnHeight, 0.08),
        rotationY: 0,
      });
    }
    const curtainMesh = createInstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.options.materials.waterfall, curtains, 'landmark-waterfall-curtains', false);
    if (curtainMesh) root.add(curtainMesh);

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(placeholder.width * 0.46, placeholder.width * 0.5, 0.16, 24), this.options.materials['wet-edge']);
    basin.scale.z = placeholder.depth / placeholder.width;
    basin.position.set(0, 0.08, -placeholder.depth * 0.55);
    basin.receiveShadow = true;
    root.add(basin);

    const mist = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), new THREE.MeshBasicMaterial({ color: 0xd9f7fa, transparent: true, opacity: 0.18, depthWrite: false }));
    mist.name = 'quality-detail-landmark-mist';
    mist.userData.qualityLevels = ['medium', 'high'];
    mist.scale.set(placeholder.width * 0.38, 0.65, placeholder.depth * 0.42);
    mist.position.set(0, 0.55, -placeholder.depth * 0.25);
    mist.visible = this.options.quality !== 'low';
    root.add(mist);
  }

  private addCollider(landmark: LandmarkConfig, position: THREE.Vector3) {
    if (!landmark.collider) return;
    const [width, height, depth] = landmark.collider.size;
    const [offsetX, offsetY, offsetZ] = landmark.collider.offset ?? [0, 0, 0];
    const radius = Math.hypot(width, depth) / 2;
    this.options.colliders.push({
      minX: position.x + offsetX - radius,
      maxX: position.x + offsetX + radius,
      minY: position.y + offsetY - height / 2,
      maxY: position.y + offsetY + height / 2,
      minZ: position.z + offsetZ - radius,
      maxZ: position.z + offsetZ + radius,
      label: landmark.collider.label || landmark.name,
    });
  }
}
