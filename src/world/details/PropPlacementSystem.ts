import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GeoFeature, PropAssetId, PropPlacementRule } from '../../areas/types';
import type { BoxCollider } from '../../game/types';
import type { GeoOrigin } from '../../utils/geo';
import { geoToLocal } from '../../utils/geo';
import type { DetailMaterialSet } from '../materials';
import type { Quality } from '../World';
import { createInstancedMesh, offsetFrame, samplePolylineAtSpacing, type InstanceTransform } from './placement';

const QUALITY_ORDER: Quality[] = ['low', 'medium', 'high'];

export function densityTierForIndex(index: number): Quality {
  if (index % 4 === 0) return 'low';
  if (index % 2 === 0) return 'medium';
  return 'high';
}

export function levelsForDensityTier(tier: Quality, allowed: Quality[]): Quality[] {
  const minimum = QUALITY_ORDER.indexOf(tier);
  return allowed.filter((quality) => QUALITY_ORDER.indexOf(quality) >= minimum);
}

interface PropPlacementOptions {
  origin: GeoOrigin;
  heightAt: (x: number, z: number) => number;
  materials: DetailMaterialSet;
  rules?: PropPlacementRule[];
  colliders: BoxCollider[];
  quality: Quality;
}

interface AssetDefinition {
  geometry: () => THREE.BufferGeometry;
  material: keyof Pick<DetailMaterialSet, 'metal-rail' | 'old-concrete' | 'paving-stone' | 'cycleway'>;
  scale: THREE.Vector3;
  y: number;
  collision?: [number, number, number];
  label: string;
}

function transformed<T extends THREE.BufferGeometry>(geometry: T, position: [number, number, number], scale: [number, number, number]) {
  geometry.scale(...scale);
  geometry.translate(...position);
  return geometry;
}

function merged(parts: THREE.BufferGeometry[]) {
  const result = mergeGeometries(parts);
  if (!result) throw new Error('소품 geometry를 병합하지 못했습니다.');
  return result;
}

const ASSETS: Record<PropAssetId, AssetDefinition> = {
  'river-railing': {
    geometry: () => merged([
      transformed(new THREE.CylinderGeometry(1, 1, 1, 6), [0, 0.58, 0], [0.06, 1.16, 0.06]),
      transformed(new THREE.BoxGeometry(1, 1, 1), [0, 0.52, 0], [1, 0.06, 0.06]),
      transformed(new THREE.BoxGeometry(1, 1, 1), [0, 1.04, 0], [1, 0.07, 0.07]),
    ]),
    material: 'metal-rail', scale: new THREE.Vector3(7.5, 1, 1), y: 0, collision: [7.5, 1.15, 0.18], label: '하천 난간',
  },
  'street-lamp': {
    geometry: () => merged([
      transformed(new THREE.CylinderGeometry(1, 1.1, 1, 8), [0, 2.5, 0], [0.08, 5, 0.08]),
      transformed(new THREE.BoxGeometry(1, 1, 1), [0.45, 4.95, 0], [0.9, 0.09, 0.09]),
      transformed(new THREE.SphereGeometry(1, 8, 5), [0.88, 4.82, 0], [0.22, 0.18, 0.22]),
    ]),
    material: 'metal-rail', scale: new THREE.Vector3(1, 1, 1), y: 0, label: '가로등',
  },
  bench: {
    geometry: () => merged([
      transformed(new THREE.BoxGeometry(1, 1, 1), [0, 0.58, 0], [2.1, 0.16, 0.58]),
      transformed(new THREE.BoxGeometry(1, 1, 1), [0, 1.05, 0.25], [2.1, 0.7, 0.13]),
      transformed(new THREE.BoxGeometry(1, 1, 1), [-0.78, 0.27, 0], [0.11, 0.54, 0.5]),
      transformed(new THREE.BoxGeometry(1, 1, 1), [0.78, 0.27, 0], [0.11, 0.54, 0.5]),
    ]),
    material: 'old-concrete', scale: new THREE.Vector3(1, 1, 1), y: 0, label: '벤치',
  },
  'trash-bin': {
    geometry: () => transformed(new THREE.CylinderGeometry(1, 0.88, 1, 10), [0, 0.55, 0], [0.34, 1.1, 0.34]),
    material: 'old-concrete', scale: new THREE.Vector3(1, 1, 1), y: 0, label: '쓰레기통',
  },
  'bike-rack': {
    geometry: () => merged([-0.7, 0, 0.7].map((x) => {
      const ring = new THREE.TorusGeometry(0.45, 0.055, 5, 10, Math.PI);
      ring.rotateX(Math.PI / 2);
      ring.translate(x, 0.45, 0);
      return ring;
    })),
    material: 'metal-rail', scale: new THREE.Vector3(1, 1, 1), y: 0, label: '자전거 거치대',
  },
  'information-sign': {
    geometry: () => merged([
      transformed(new THREE.CylinderGeometry(1, 1, 1, 6), [0, 1.1, 0], [0.07, 2.2, 0.07]),
      transformed(new THREE.BoxGeometry(1, 1, 1), [0, 2.05, 0], [1.3, 0.68, 0.09]),
    ]),
    material: 'cycleway', scale: new THREE.Vector3(1, 1, 1), y: 0, label: '안내 표지판',
  },
  bollard: {
    geometry: () => transformed(new THREE.CylinderGeometry(1, 1, 1, 8), [0, 0.48, 0], [0.12, 0.96, 0.12]),
    material: 'metal-rail', scale: new THREE.Vector3(1, 1, 1), y: 0, collision: [0.3, 1, 0.3], label: '볼라드',
  },
};

export class PropPlacementSystem {
  constructor(private readonly options: PropPlacementOptions) {}

  setQuality(quality: Quality) { this.options.quality = quality; }

  build(data: { paths: GeoFeature[]; roads: GeoFeature[] }, targetRoot: THREE.Object3D, targetOffset = { x: 0, z: 0 }) {
    const batches = new Map<string, { assetId: PropAssetId; levels: Quality[]; transforms: InstanceTransform[] }>();
    const candidates = [...data.paths, ...data.roads];
    for (const rule of this.options.rules ?? []) {
      const features = candidates.filter((feature) => rule.targetFeatureId !== undefined ? feature.id === rule.targetFeatureId : feature.kind === rule.targetKind);
      for (const feature of features) {
        const points = feature.points.map((point) => {
          const local = geoToLocal(point, this.options.origin);
          return new THREE.Vector3(local.x, this.options.heightAt(local.x, local.z) + 0.15, local.z);
        });
        const frames = samplePolylineAtSpacing(points, rule.spacing, rule.startOffset, rule.endOffset);
        const sides = rule.side === 'both' ? [-1, 1] : [rule.side === 'left' ? 1 : -1];
        sides.forEach((side) => {
          if (rule.assetId === 'river-railing' && rule.quality.includes('low')) this.addRailingColliders(points, side * rule.lateralOffset);
          frames.forEach((original, index) => {
          const frame = offsetFrame(original, side * rule.lateralOffset);
          frame.position.y = this.options.heightAt(frame.position.x, frame.position.z) + 0.1;
          const tier = rule.assetId === 'river-railing' ? 'low' : densityTierForIndex(index);
          const levels = levelsForDensityTier(tier, rule.quality);
          if (levels.length === 0) return;
          const key = `${rule.assetId}:${levels.join('-')}`;
          const batch = batches.get(key) ?? { assetId: rule.assetId, levels, transforms: [] };
          const definition = ASSETS[rule.assetId];
          batch.transforms.push({
            position: frame.position.clone().sub(new THREE.Vector3(targetOffset.x, 0, targetOffset.z)).setY(frame.position.y + definition.y),
            scale: definition.scale,
            rotationY: -Math.atan2(frame.tangent.z, frame.tangent.x) + (rule.rotationOffset ?? 0),
          });
          batches.set(key, batch);
          if (definition.collision && rule.assetId !== 'river-railing' && rule.quality.includes('low') && tier === 'low') {
            const [width, height, depth] = definition.collision;
            const radius = Math.hypot(width, depth) / 2;
            this.options.colliders.push({
              minX: frame.position.x - radius, maxX: frame.position.x + radius,
              minY: frame.position.y, maxY: frame.position.y + height,
              minZ: frame.position.z - radius, maxZ: frame.position.z + radius,
              label: definition.label,
            });
          }
          });
        });
      }
    }
    batches.forEach(({ assetId, levels, transforms }, key) => {
      const definition = ASSETS[assetId];
      const mesh = createInstancedMesh(definition.geometry(), this.options.materials[definition.material], transforms, `quality-prop-${key}`, this.options.quality === 'high');
      if (!mesh) return;
      mesh.userData.qualityLevels = levels;
      mesh.userData.assetId = assetId;
      mesh.visible = levels.includes(this.options.quality);
      targetRoot.add(mesh);
    });
  }

  private addRailingColliders(points: THREE.Vector3[], lateralOffset: number) {
    const offsetPoints = points.map((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const tangent = next.clone().sub(previous).setY(0).normalize();
      const shifted = offsetFrame({ position: point, tangent, distance: 0 }, lateralOffset).position;
      shifted.y = this.options.heightAt(shifted.x, shifted.z);
      return shifted;
    });
    for (let index = 1; index < offsetPoints.length; index += 1) {
      const from = offsetPoints[index - 1];
      const to = offsetPoints[index];
      this.options.colliders.push({
        minX: Math.min(from.x, to.x) - 0.18, maxX: Math.max(from.x, to.x) + 0.18,
        minY: Math.min(from.y, to.y), maxY: Math.max(from.y, to.y) + 1.18,
        minZ: Math.min(from.z, to.z) - 0.18, maxZ: Math.max(from.z, to.z) + 0.18,
        label: '하천 난간',
      });
    }
  }
}
