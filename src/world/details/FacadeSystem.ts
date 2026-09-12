import * as THREE from 'three';
import type { FacadeDirection, FacadePhotoSide } from '../../areas/types';

export function facadeDirectionForEdge(points: THREE.Vector3[], edgeIndex: number): FacadeDirection {
  const from = points[edgeIndex];
  const to = points[(edgeIndex + 1) % points.length];
  const unique = points.length > 2 && points[0].distanceToSquared(points.at(-1)!) < 1e-8 ? points.slice(0, -1) : points;
  const center = unique.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, unique.length));
  const middle = from.clone().lerp(to, 0.5);
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  let normalX = -dz;
  let normalZ = dx;
  if (normalX * (middle.x - center.x) + normalZ * (middle.z - center.z) < 0) {
    normalX *= -1;
    normalZ *= -1;
  }
  if (Math.abs(normalX) >= Math.abs(normalZ)) return normalX >= 0 ? 'east' : 'west';
  return normalZ >= 0 ? 'south' : 'north';
}

/** Returns side-material indexes where zero is the procedural fallback. */
export function directionalFacadeMaterialIndices(points: THREE.Vector3[], facades: FacadePhotoSide[]): number[] {
  const byDirection = new Map(facades.map((facade, index) => [facade.direction, index + 1]));
  return points.map((_, index) => byDirection.get(facadeDirectionForEdge(points, index)) ?? 0);
}

/** Reassigns ExtrudeGeometry side quads while preserving cap material zero. */
export function assignDirectionalFacadeGroups(geometry: THREE.BufferGeometry, sideMaterialIndices: number[]) {
  const capGroups = geometry.groups.filter((group) => group.materialIndex === 0);
  const sideGroups = geometry.groups.filter((group) => group.materialIndex !== 0);
  geometry.clearGroups();
  capGroups.forEach((group) => geometry.addGroup(group.start, group.count, 0));
  let side = 0;
  sideGroups.forEach((group) => {
    const end = group.start + group.count;
    for (let start = group.start; start < end; start += 6) {
      const materialIndex = sideMaterialIndices[side % Math.max(1, sideMaterialIndices.length)] ?? 0;
      geometry.addGroup(start, Math.min(6, end - start), 1 + materialIndex);
      side += 1;
    }
  });
}
