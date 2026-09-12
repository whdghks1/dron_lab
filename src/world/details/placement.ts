import * as THREE from 'three';

export interface PlacementFrame {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  distance: number;
}

export interface InstanceTransform {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotationY: number;
}

export function polylineLength(points: THREE.Vector3[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += points[index - 1].distanceTo(points[index]);
  return total;
}

export function pointAtDistance(points: THREE.Vector3[], target: number): PlacementFrame | undefined {
  if (points.length < 2) return undefined;
  let walked = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const length = from.distanceTo(to);
    if (walked + length >= target || index === points.length - 1) {
      const ratio = length > 0 ? Math.max(0, Math.min(1, (target - walked) / length)) : 0;
      return {
        position: from.clone().lerp(to, ratio),
        tangent: to.clone().sub(from).setY(0).normalize(),
        distance: target,
      };
    }
    walked += length;
  }
  return undefined;
}

export function samplePolylineAtSpacing(points: THREE.Vector3[], spacing: number, startOffset = 0, endOffset = 0): PlacementFrame[] {
  if (spacing <= 0 || points.length < 2) return [];
  const length = polylineLength(points);
  const start = Math.max(0, startOffset);
  const end = Math.max(start, length - Math.max(0, endOffset));
  const result: PlacementFrame[] = [];
  for (let distance = start; distance <= end + 1e-6; distance += spacing) {
    const frame = pointAtDistance(points, distance);
    if (frame) result.push(frame);
  }
  return result;
}

export function offsetFrame(frame: PlacementFrame, lateralOffset: number): PlacementFrame {
  const normal = new THREE.Vector3(-frame.tangent.z, 0, frame.tangent.x);
  return { ...frame, position: frame.position.clone().addScaledVector(normal, lateralOffset) };
}

export function segmentTransform(from: THREE.Vector3, to: THREE.Vector3, width: number, height: number): InstanceTransform {
  const center = from.clone().lerp(to, 0.5);
  return {
    position: center,
    scale: new THREE.Vector3(Math.max(0.01, from.distanceTo(to)), height, width),
    rotationY: -Math.atan2(to.z - from.z, to.x - from.x),
  };
}

export function createInstancedMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  transforms: InstanceTransform[],
  name: string,
  castShadow: boolean,
): THREE.InstancedMesh | undefined {
  if (transforms.length === 0) {
    geometry.dispose();
    return undefined;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  transforms.forEach((transform, index) => {
    quaternion.setFromAxisAngle(up, transform.rotationY);
    matrix.compose(transform.position, quaternion, transform.scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}
