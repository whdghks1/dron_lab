import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Bounds } from '../../game/types';
import type { BoxCollider } from '../../game/types';
import type { DetailMaterialPreset, GeoFeature, RiverbankAccessConfig, RiverbankProfile, RiverbankSegmentConfig } from '../../areas/types';
import type { GeoOrigin } from '../../utils/geo';
import { geoToLocal } from '../../utils/geo';
import { offsetPolyline, ribbonGeometry } from '../geometry';
import type { DetailMaterialSet } from '../materials';
import type { Quality } from '../World';
import { createInstancedMesh, samplePolylineAtSpacing, segmentTransform, type InstanceTransform } from './placement';

export interface RiverbankStyle {
  materialPreset: DetailMaterialPreset;
  bankWidth: number;
  bankHeight: number;
  waterHalfWidth: number;
  railing: boolean;
}

const PROFILE_STYLES: Record<RiverbankProfile, RiverbankStyle> = {
  'concrete-slope': { materialPreset: 'light-concrete', bankWidth: 4.5, bankHeight: 1.3, waterHalfWidth: 7.2, railing: true },
  'vertical-wall': { materialPreset: 'old-concrete', bankWidth: 2.2, bankHeight: 1.7, waterHalfWidth: 7.2, railing: true },
  'stone-bank': { materialPreset: 'stone-bank', bankWidth: 4.2, bankHeight: 1.15, waterHalfWidth: 7.2, railing: false },
  'grass-slope': { materialPreset: 'grass-soil', bankWidth: 5.5, bankHeight: 1.1, waterHalfWidth: 7.2, railing: false },
  'walkway-edge': { materialPreset: 'wet-edge', bankWidth: 2, bankHeight: 0.42, waterHalfWidth: 7.2, railing: true },
};

export function resolveRiverbankStyle(segment: Pick<RiverbankSegmentConfig, 'profile' | 'materialPreset' | 'bankWidth' | 'bankHeight' | 'waterHalfWidth' | 'railing'>): RiverbankStyle {
  return {
    ...PROFILE_STYLES[segment.profile],
    ...(segment.materialPreset ? { materialPreset: segment.materialPreset } : {}),
    ...(segment.bankWidth !== undefined ? { bankWidth: segment.bankWidth } : {}),
    ...(segment.bankHeight !== undefined ? { bankHeight: segment.bankHeight } : {}),
    ...(segment.waterHalfWidth !== undefined ? { waterHalfWidth: segment.waterHalfWidth } : {}),
    ...(segment.railing !== undefined ? { railing: segment.railing } : {}),
  };
}

interface RiverbankBuilderOptions {
  origin: GeoOrigin;
  bounds: Bounds;
  heightAt: (x: number, z: number) => number;
  materials: DetailMaterialSet;
  segments?: RiverbankSegmentConfig[];
  accesses?: RiverbankAccessConfig[];
  colliders: BoxCollider[];
  quality: Quality;
}

export class RiverbankBuilder {
  constructor(private readonly options: RiverbankBuilderOptions) {}

  setQuality(quality: Quality) { this.options.quality = quality; }

  build(features: GeoFeature[], targetRoot: THREE.Object3D) {
    const rules: RiverbankSegmentConfig[] = this.options.segments?.length
      ? this.options.segments
      : features.filter((feature) => ['river', 'stream'].includes(feature.kind)).map((feature) => ({
          featureId: feature.id,
          profile: 'walkway-edge' as const,
          side: 'both' as const,
          dataOrigin: 'estimated' as const,
        }));
    const geometries = new Map<DetailMaterialPreset, THREE.BufferGeometry[]>();
    const railPosts: InstanceTransform[] = [];
    const railBeams: InstanceTransform[] = [];

    for (const rule of rules) {
      const feature = features.find((item) => item.id === rule.featureId);
      if (!feature) continue;
      const clipped = this.clipToBounds(feature);
      const points = this.sliceByFraction(clipped, rule.startFraction ?? 0, rule.endFraction ?? 1);
      if (points.length < 2) continue;
      const style = resolveRiverbankStyle(rule);
      const sides = rule.side === 'both' ? [-1, 1] : [rule.side === 'left' ? 1 : -1];
      for (const side of sides) {
        const geometry = this.profileGeometry(points, side, rule.profile, style);
        const entries = geometries.get(style.materialPreset) ?? [];
        entries.push(geometry);
        geometries.set(style.materialPreset, entries);
        const railLine = offsetPolyline(points, side * (style.waterHalfWidth + style.bankWidth));
        railLine.forEach((point) => { point.y = this.options.heightAt(point.x, point.z) + style.bankHeight + 0.06; });
        if (style.railing) this.addRailings(railLine, railPosts, railBeams);
        if (this.options.segments?.length) this.addProfileColliders(railLine, style.bankHeight, feature.name || '하천 제방');
      }
    }

    geometries.forEach((items, preset) => {
      const merged = mergeGeometries(items);
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, this.options.materials[preset]);
      mesh.name = this.options.segments?.length ? `riverbank-profile-${preset}` : `quality-detail-riverbanks-${preset}`;
      mesh.receiveShadow = true;
      mesh.castShadow = this.options.quality === 'high';
      if (!this.options.segments?.length) {
        mesh.userData.qualityLevels = ['medium', 'high'];
        mesh.visible = this.options.quality !== 'low';
      }
      targetRoot.add(mesh);
    });
    this.addQualityMesh(targetRoot, new THREE.CylinderGeometry(1, 1, 1, 6), railPosts, 'quality-detail-riverbank-posts');
    this.addQualityMesh(targetRoot, new THREE.BoxGeometry(1, 1, 1), railBeams, 'quality-detail-riverbank-rails');
    this.addAccesses(targetRoot);
    targetRoot.userData.riverbankProfiles = rules.map((rule) => ({ featureId: rule.featureId, profile: rule.profile, dataOrigin: rule.dataOrigin }));
  }

  private clipToBounds(feature: GeoFeature): THREE.Vector3[] {
    const margin = 70;
    return feature.points.map((point) => geoToLocal(point, this.options.origin))
      .filter((point) => point.x >= this.options.bounds.minX - margin && point.x <= this.options.bounds.maxX + margin && point.z >= this.options.bounds.minZ - margin && point.z <= this.options.bounds.maxZ + margin)
      .map((point) => new THREE.Vector3(point.x, this.options.heightAt(point.x, point.z) + 0.1, point.z));
  }

  private sliceByFraction(points: THREE.Vector3[], start: number, end: number) {
    if (points.length < 2) return points;
    const first = Math.max(0, Math.min(points.length - 2, Math.floor(Math.max(0, Math.min(1, start)) * (points.length - 1))));
    const last = Math.max(first + 1, Math.min(points.length - 1, Math.ceil(Math.max(0, Math.min(1, end)) * (points.length - 1))));
    return points.slice(first, last + 1);
  }

  private profileGeometry(points: THREE.Vector3[], side: number, profile: RiverbankProfile, style: RiverbankStyle) {
    const inner = offsetPolyline(points, side * style.waterHalfWidth);
    const outer = offsetPolyline(points, side * (style.waterHalfWidth + style.bankWidth));
    if (profile === 'walkway-edge') {
      const line = offsetPolyline(points, side * (style.waterHalfWidth + style.bankWidth / 2));
      line.forEach((point) => { point.y = this.options.heightAt(point.x, point.z) + style.bankHeight; });
      return ribbonGeometry(line, style.bankWidth);
    }
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let index = 0; index < points.length; index += 1) {
      const innerY = this.options.heightAt(inner[index].x, inner[index].z) + 0.08;
      const outerY = this.options.heightAt(outer[index].x, outer[index].z) + style.bankHeight;
      if (profile === 'vertical-wall') {
        vertices.push(outer[index].x, innerY, outer[index].z, outer[index].x, outerY, outer[index].z);
      } else {
        vertices.push(inner[index].x, innerY, inner[index].z, outer[index].x, outerY, outer[index].z);
      }
      uvs.push(0, index / Math.max(1, points.length - 1), 1, index / Math.max(1, points.length - 1));
      if (index < points.length - 1) {
        const offset = index * 2;
        indices.push(offset, offset + 2, offset + 1, offset + 2, offset + 3, offset + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  private addRailings(points: THREE.Vector3[], posts: InstanceTransform[], beams: InstanceTransform[]) {
    samplePolylineAtSpacing(points, 4.8).forEach((frame) => posts.push({
      position: frame.position.clone().setY(frame.position.y + 0.58),
      scale: new THREE.Vector3(0.08, 1.16, 0.08),
      rotationY: 0,
    }));
    for (let index = 1; index < points.length; index += 1) {
      for (const height of [0.48, 1.02]) {
        const beam = segmentTransform(points[index - 1], points[index], 0.07, 0.07);
        beam.position.y += height;
        beams.push(beam);
      }
    }
  }

  private addProfileColliders(points: THREE.Vector3[], height: number, label: string) {
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      this.options.colliders.push({
        minX: Math.min(from.x, to.x) - 0.3,
        maxX: Math.max(from.x, to.x) + 0.3,
        minY: Math.min(from.y, to.y) - height,
        maxY: Math.max(from.y, to.y) + 1.2,
        minZ: Math.min(from.z, to.z) - 0.3,
        maxZ: Math.max(from.z, to.z) + 0.3,
        label,
      });
    }
  }

  private addQualityMesh(root: THREE.Object3D, geometry: THREE.BufferGeometry, transforms: InstanceTransform[], name: string) {
    const mesh = createInstancedMesh(geometry, this.options.materials['metal-rail'], transforms, name, this.options.quality === 'high');
    if (!mesh) return;
    mesh.userData.qualityLevels = ['medium', 'high'];
    mesh.visible = this.options.quality !== 'low';
    root.add(mesh);
  }

  private addAccesses(root: THREE.Object3D) {
    const transforms: InstanceTransform[] = [];
    for (const access of this.options.accesses ?? []) {
      const local = geoToLocal(access.position, this.options.origin);
      const steps = Math.max(3, access.steps ?? 6);
      const width = access.width ?? 3;
      const rotation = access.rotation ?? 0;
      for (let step = 0; step < steps; step += 1) {
        const rise = step * 0.24;
        const run = step * 0.42;
        transforms.push({
          position: new THREE.Vector3(local.x + Math.sin(rotation) * run, this.options.heightAt(local.x, local.z) + rise / 2, local.z + Math.cos(rotation) * run),
          scale: new THREE.Vector3(width, Math.max(0.12, rise + 0.12), 0.46),
          rotationY: rotation,
        });
      }
    }
    const mesh = createInstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.options.materials['paving-stone'], transforms, 'quality-detail-riverbank-accesses', this.options.quality === 'high');
    if (!mesh) return;
    mesh.userData.qualityLevels = ['medium', 'high'];
    mesh.visible = this.options.quality !== 'low';
    root.add(mesh);
  }
}
