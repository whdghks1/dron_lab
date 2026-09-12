import * as THREE from 'three';
import type { BridgeVisualOverride, DetailMaterialPreset, GeoFeature } from '../../areas/types';
import type { BoxCollider } from '../../game/types';
import type { GeoOrigin } from '../../utils/geo';
import { geoToLocal } from '../../utils/geo';
import type { DetailMaterialSet } from '../materials';
import type { Quality } from '../World';
import { createInstancedMesh, offsetFrame, pointAtDistance, polylineLength, samplePolylineAtSpacing, segmentTransform, type InstanceTransform } from './placement';

export interface ResolvedBridgeVisual {
  featureId: number;
  deckWidth: number;
  deckThickness: number;
  deckClearance: number;
  pierCount: number;
  pierWidth: number;
  railType: 'metal' | 'solid' | 'none';
  materialPreset: DetailMaterialPreset;
  modelUrl?: string;
  dataOrigin: 'osm' | 'estimated' | 'authored';
}

function bridgeDefaults(feature: GeoFeature): ResolvedBridgeVisual {
  const vehicle = ['trunk', 'primary', 'secondary', 'tertiary', 'residential'].includes(feature.kind);
  return {
    featureId: feature.id,
    deckWidth: feature.kind === 'trunk' ? 13 : vehicle ? 8 : 3,
    deckThickness: feature.kind === 'trunk' ? 1.2 : vehicle ? 0.72 : 0.32,
    deckClearance: feature.kind === 'trunk' ? 13 : vehicle ? 4.1 : 3.25,
    pierCount: feature.kind === 'trunk' ? 4 : 1,
    pierWidth: feature.kind === 'trunk' ? 1.2 : vehicle ? 0.75 : 0.38,
    railType: vehicle ? 'solid' : 'metal',
    materialPreset: vehicle ? 'old-concrete' : feature.kind === 'cycleway' ? 'cycleway' : 'paving-stone',
    dataOrigin: 'estimated',
  };
}

export function resolveBridgeVisual(feature: GeoFeature, overrides: BridgeVisualOverride[] = []): ResolvedBridgeVisual {
  const base = bridgeDefaults(feature);
  const override = overrides.find((item) => item.featureId === feature.id);
  return override ? { ...base, ...override } : base;
}

export interface BridgeBuilderOptions {
  origin: GeoOrigin;
  heightAt: (x: number, z: number) => number;
  materials: DetailMaterialSet;
  overrides?: BridgeVisualOverride[];
  colliders: BoxCollider[];
  quality: Quality;
}

export class BridgeBuilder {
  constructor(private readonly options: BridgeBuilderOptions) {}

  setQuality(quality: Quality) { this.options.quality = quality; }

  build(features: GeoFeature[], targetRoot: THREE.Object3D, targetOffset = { x: 0, z: 0 }) {
    const deckByMaterial = new Map<DetailMaterialPreset, InstanceTransform[]>();
    const surfacesByMaterial = new Map<DetailMaterialPreset, InstanceTransform[]>();
    const piersByMaterial = new Map<DetailMaterialPreset, InstanceTransform[]>();
    const railBeams: InstanceTransform[] = [];
    const railPosts: InstanceTransform[] = [];
    const shadows: InstanceTransform[] = [];
    const metadata: Array<{ featureId: number; modelUrl?: string; dataOrigin: string }> = [];

    const add = (map: Map<DetailMaterialPreset, InstanceTransform[]>, preset: DetailMaterialPreset, transform: InstanceTransform) => {
      const entries = map.get(preset) ?? [];
      entries.push(this.shift(transform, targetOffset));
      map.set(preset, entries);
    };

    for (const feature of features) {
      if (feature.points.length < 2) continue;
      const visual = resolveBridgeVisual(feature, this.options.overrides);
      metadata.push({ featureId: feature.id, modelUrl: visual.modelUrl, dataOrigin: visual.dataOrigin });
      const points = feature.points.map((point) => {
        const local = geoToLocal(point, this.options.origin);
        return new THREE.Vector3(local.x, this.options.heightAt(local.x, local.z) + visual.deckClearance, local.z);
      });
      for (let index = 1; index < points.length; index += 1) {
        const from = points[index - 1];
        const to = points[index];
        const structural = segmentTransform(from, to, visual.deckWidth, visual.deckThickness);
        structural.position.y -= visual.deckThickness / 2;
        add(deckByMaterial, visual.materialPreset, structural);
        const surfacePreset = feature.kind === 'cycleway' ? 'cycleway' : ['footway', 'path'].includes(feature.kind) ? 'paving-stone' : visual.materialPreset;
        const surface = segmentTransform(from, to, visual.deckWidth * 0.96, 0.08);
        surface.position.y += 0.04;
        add(surfacesByMaterial, surfacePreset, surface);
        const ground = Math.min(this.options.heightAt(from.x, from.z), this.options.heightAt(to.x, to.z)) + 0.06;
        const shadow = segmentTransform(from.clone().setY(ground), to.clone().setY(ground), visual.deckWidth * 1.08, 0.025);
        shadows.push(this.shift(shadow, targetOffset));
        const padding = visual.deckWidth / 2;
        this.options.colliders.push({
          minX: Math.min(from.x, to.x) - padding,
          maxX: Math.max(from.x, to.x) + padding,
          minY: Math.min(from.y, to.y) - visual.deckThickness,
          maxY: Math.max(from.y, to.y) + 0.18,
          minZ: Math.min(from.z, to.z) - padding,
          maxZ: Math.max(from.z, to.z) + padding,
          label: feature.name || '교량 상판',
        });
      }

      const tangentStart = points[1].clone().sub(points[0]).setY(0).normalize();
      const tangentEnd = points.at(-1)!.clone().sub(points.at(-2)!).setY(0).normalize();
      [
        { point: points[0], tangent: tangentStart },
        { point: points.at(-1)!, tangent: tangentEnd },
      ].forEach(({ point, tangent }) => {
        const height = Math.min(2.8, Math.max(1.2, visual.deckClearance * 0.22));
        add(piersByMaterial, visual.materialPreset, {
          position: point.clone().setY(point.y - visual.deckThickness - height / 2),
          scale: new THREE.Vector3(visual.deckWidth, height, 1.15),
          rotationY: -Math.atan2(tangent.z, tangent.x) + Math.PI / 2,
        });
      });

      const total = polylineLength(points);
      for (let pier = 1; pier <= visual.pierCount; pier += 1) {
        const frame = pointAtDistance(points, total * pier / (visual.pierCount + 1));
        if (!frame) continue;
        const ground = this.options.heightAt(frame.position.x, frame.position.z);
        const top = frame.position.y - visual.deckThickness;
        const height = Math.max(0.4, top - ground);
        add(piersByMaterial, visual.materialPreset, {
          position: new THREE.Vector3(frame.position.x, ground + height / 2, frame.position.z),
          scale: new THREE.Vector3(visual.pierWidth, height, visual.deckWidth * 0.72),
          rotationY: -Math.atan2(frame.tangent.z, frame.tangent.x),
        });
        if (this.options.overrides?.some((override) => override.featureId === feature.id)) {
          this.options.colliders.push({
            minX: frame.position.x - visual.pierWidth / 2,
            maxX: frame.position.x + visual.pierWidth / 2,
            minY: ground,
            maxY: top,
            minZ: frame.position.z - visual.deckWidth * 0.36,
            maxZ: frame.position.z + visual.deckWidth * 0.36,
            label: feature.name ? `${feature.name} 교각` : '교량 교각',
          });
        }
      }

      if (visual.railType !== 'none') {
        for (const side of [-1, 1]) {
          const railPoints = points.map((point, index) => {
            const previous = points[Math.max(0, index - 1)];
            const next = points[Math.min(points.length - 1, index + 1)];
            const tangent = next.clone().sub(previous).setY(0).normalize();
            return offsetFrame({ position: point, tangent, distance: 0 }, side * (visual.deckWidth / 2 - 0.18)).position;
          });
          for (let index = 1; index < railPoints.length; index += 1) {
            const beam = segmentTransform(railPoints[index - 1], railPoints[index], visual.railType === 'solid' ? 0.3 : 0.1, visual.railType === 'solid' ? 0.82 : 0.1);
            beam.position.y += visual.railType === 'solid' ? 0.41 : 1.02;
            railBeams.push(this.shift(beam, targetOffset));
          }
          if (visual.railType === 'metal') {
            samplePolylineAtSpacing(railPoints, 2.8).forEach((frame) => railPosts.push(this.shift({
              position: frame.position.clone().setY(frame.position.y + 0.52),
              scale: new THREE.Vector3(0.09, 1.04, 0.09),
              rotationY: 0,
            }, targetOffset)));
          }
        }
      }
    }

    deckByMaterial.forEach((transforms, preset) => this.addMesh(targetRoot, new THREE.BoxGeometry(1, 1, 1), this.options.materials[preset], transforms, `bridge-deck-${preset}`, true));
    surfacesByMaterial.forEach((transforms, preset) => this.addMesh(targetRoot, new THREE.BoxGeometry(1, 1, 1), this.options.materials[preset], transforms, `bridge-surface-${preset}`, false));
    piersByMaterial.forEach((transforms, preset) => this.addMesh(targetRoot, new THREE.BoxGeometry(1, 1, 1), this.options.materials[preset], transforms, `bridge-support-${preset}`, true));
    this.addMesh(targetRoot, new THREE.BoxGeometry(1, 1, 1), this.options.materials['metal-rail'], railBeams, 'quality-detail-bridge-rails', true, ['medium', 'high']);
    this.addMesh(targetRoot, new THREE.CylinderGeometry(1, 1, 1, 6), this.options.materials['metal-rail'], railPosts, 'quality-detail-bridge-posts', true, ['medium', 'high']);
    this.addMesh(targetRoot, new THREE.BoxGeometry(1, 1, 1), this.options.materials.shadow, shadows, 'bridge-under-shadow', false);
    targetRoot.userData.bridgeDetails = metadata;
  }

  private shift(transform: InstanceTransform, targetOffset: { x: number; z: number }): InstanceTransform {
    return { ...transform, position: transform.position.clone().sub(new THREE.Vector3(targetOffset.x, 0, targetOffset.z)) };
  }

  private addMesh(
    root: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    transforms: InstanceTransform[],
    name: string,
    castShadow: boolean,
    qualityLevels?: Quality[],
  ) {
    const mesh = createInstancedMesh(geometry, material, transforms, name, castShadow && this.options.quality === 'high');
    if (!mesh) return;
    if (qualityLevels) {
      mesh.userData.qualityLevels = qualityLevels;
      mesh.visible = qualityLevels.includes(this.options.quality);
    }
    root.add(mesh);
  }
}
