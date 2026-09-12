import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AreaSnapshot, GeoFeature } from '../../areas/types';
import type { GeoOrigin } from '../../utils/geo';
import { geoToLocal } from '../../utils/geo';
import { offsetPolyline, ribbonGeometry } from '../geometry';
import type { RoadMaterialSet } from '../materials';
import type { Quality } from '../World';
import { createInstancedMesh, pointAtDistance, polylineLength, segmentTransform, type InstanceTransform } from './placement';

const MAJOR_ROADS = new Set(['trunk', 'primary', 'secondary', 'tertiary']);
const SIDEWALK_ROADS = new Set([...MAJOR_ROADS, 'residential']);

export function roadWidthForKind(kind: string) {
  if (kind === 'trunk') return 12;
  if (MAJOR_ROADS.has(kind)) return 8;
  if (kind === 'service') return 3.2;
  return 5;
}

export function roadWidthForFeature(feature: Pick<GeoFeature, 'kind' | 'width'>) {
  return feature.width && feature.width > 0 ? feature.width : roadWidthForKind(feature.kind);
}

export function roadDetailForKind(kind: string) {
  return {
    centerMarking: MAJOR_ROADS.has(kind),
    edgeMarking: MAJOR_ROADS.has(kind),
    sidewalk: SIDEWALK_ROADS.has(kind),
  };
}

export function roadDetailForFeature(feature: Pick<GeoFeature, 'kind' | 'lanes' | 'sidewalk'>) {
  const defaults = roadDetailForKind(feature.kind);
  return {
    ...defaults,
    centerMarking: feature.lanes !== undefined ? feature.lanes >= 2 : defaults.centerMarking,
    sidewalk: feature.sidewalk === 'no' ? false : feature.sidewalk !== undefined || defaults.sidewalk,
  };
}

interface RoadBuilderOptions {
  origin: GeoOrigin;
  heightAt: (x: number, z: number) => number;
  materials: RoadMaterialSet;
  quality: Quality;
}

export class RoadBuilder {
  constructor(private readonly options: RoadBuilderOptions) {}

  setQuality(quality: Quality) { this.options.quality = quality; }

  build(data: Pick<AreaSnapshot, 'roads' | 'paths' | 'bridges'>, targetRoot: THREE.Object3D, targetOffset = { x: 0, z: 0 }) {
    const major: THREE.BufferGeometry[] = [];
    const minor: THREE.BufferGeometry[] = [];
    const paths: THREE.BufferGeometry[] = [];
    const sidewalks: THREE.BufferGeometry[] = [];
    const roadEdges: THREE.BufferGeometry[] = [];
    const cycleEdges: THREE.BufferGeometry[] = [];
    const centerDashes: InstanceTransform[] = [];
    const bridgeIds = new Set(data.bridges.map((feature) => feature.id));

    data.roads.filter((feature) => !bridgeIds.has(feature.id)).forEach((feature) => {
      const width = roadWidthForFeature(feature);
      const points = this.localPoints(feature, 0.11);
      if (points.length < 2) return;
      (MAJOR_ROADS.has(feature.kind) ? major : minor).push(ribbonGeometry(points, width));
      const detail = roadDetailForFeature(feature);
      if (detail.sidewalk) {
        for (const side of [-1, 1]) {
          const line = offsetPolyline(points, side * (width / 2 + 0.62));
          line.forEach((point) => { point.y += 0.035; });
          sidewalks.push(ribbonGeometry(line, 1.15));
        }
      }
      if (detail.edgeMarking) {
        for (const side of [-1, 1]) {
          const line = offsetPolyline(points, side * (width / 2 - 0.24));
          line.forEach((point) => { point.y += 0.055; });
          roadEdges.push(ribbonGeometry(line, 0.11));
        }
      }
      if (detail.centerMarking) centerDashes.push(...this.dashedLine(points, targetOffset));
    });

    data.paths.filter((feature) => !bridgeIds.has(feature.id)).forEach((feature) => {
      const width = feature.kind === 'cycleway' ? 3.2 : 2;
      const points = this.localPoints(feature, 0.14);
      if (points.length < 2) return;
      paths.push(ribbonGeometry(points, width));
      if (feature.kind === 'cycleway') {
        for (const side of [-1, 1]) {
          const line = offsetPolyline(points, side * (width / 2 - 0.11));
          line.forEach((point) => { point.y += 0.045; });
          cycleEdges.push(ribbonGeometry(line, 0.08));
        }
      }
    });

    this.addMerged(targetRoot, major, this.options.materials.major, 'road-surface-major', targetOffset);
    this.addMerged(targetRoot, minor, this.options.materials.minor, 'road-surface-minor', targetOffset);
    this.addMerged(targetRoot, paths, this.options.materials.path, 'road-surface-path', targetOffset);
    this.addMerged(targetRoot, sidewalks, this.options.materials.sidewalk, 'quality-detail-road-sidewalks', targetOffset, ['medium', 'high']);
    this.addMerged(targetRoot, roadEdges, this.options.materials.edge, 'quality-detail-road-edges', targetOffset, ['medium', 'high']);
    this.addMerged(targetRoot, cycleEdges, this.options.materials.cycleEdge, 'road-cycleway-edges', targetOffset);
    const dashes = createInstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.options.materials.center, centerDashes, 'quality-detail-road-center-dashes', false);
    if (dashes) {
      dashes.userData.qualityLevels = ['medium', 'high'];
      dashes.visible = this.options.quality !== 'low';
      targetRoot.add(dashes);
    }
  }

  private localPoints(feature: GeoFeature, offset: number) {
    return feature.points.map((point) => {
      const local = geoToLocal(point, this.options.origin);
      return new THREE.Vector3(local.x, this.options.heightAt(local.x, local.z) + offset, local.z);
    });
  }

  private dashedLine(points: THREE.Vector3[], targetOffset: { x: number; z: number }) {
    const transforms: InstanceTransform[] = [];
    const length = polylineLength(points);
    for (let distance = 1.5; distance < length - 0.8; distance += 6) {
      const from = pointAtDistance(points, distance);
      const to = pointAtDistance(points, Math.min(distance + 2.8, length));
      if (!from || !to) continue;
      const transform = segmentTransform(from.position, to.position, 0.13, 0.025);
      transform.position.x -= targetOffset.x;
      transform.position.z -= targetOffset.z;
      transform.position.y += 0.065;
      transforms.push(transform);
    }
    return transforms;
  }

  private addMerged(
    root: THREE.Object3D,
    geometries: THREE.BufferGeometry[],
    material: THREE.Material,
    name: string,
    targetOffset: { x: number; z: number },
    qualityLevels?: Quality[],
  ) {
    if (geometries.length === 0) return;
    const merged = mergeGeometries(geometries);
    if (!merged) return;
    merged.translate(-targetOffset.x, 0, -targetOffset.z);
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = name;
    mesh.receiveShadow = true;
    if (qualityLevels) {
      mesh.userData.qualityLevels = qualityLevels;
      mesh.visible = qualityLevels.includes(this.options.quality);
    }
    root.add(mesh);
  }
}
