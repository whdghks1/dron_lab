import type { BoxCollider, Vec3 } from './types';

function pointInPolygon(point: Pick<Vec3, 'x' | 'z'>, polygon: Array<{ x: number; z: number }>) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const a = polygon[current];
    const b = polygon[previous];
    const crosses = (a.z > point.z) !== (b.z > point.z)
      && point.x < (b.x - a.x) * (point.z - a.z) / ((b.z - a.z) || Number.EPSILON) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function distanceSquaredToSegment(point: Pick<Vec3, 'x' | 'z'>, from: { x: number; z: number }, to: { x: number; z: number }) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) / lengthSquared));
  const nearestX = from.x + dx * ratio;
  const nearestZ = from.z + dz * ratio;
  return (point.x - nearestX) ** 2 + (point.z - nearestZ) ** 2;
}

export function colliderIntersectsSphere(collider: BoxCollider, position: Vec3, radius: number) {
  const overlapsBounds =
    position.x + radius > collider.minX && position.x - radius < collider.maxX &&
    position.z + radius > collider.minZ && position.z - radius < collider.maxZ &&
    position.y + radius > collider.minY && position.y - radius < collider.maxY;
  if (!overlapsBounds) return false;
  const footprint = collider.footprint;
  if (!footprint || footprint.length < 3) return true;
  if (pointInPolygon(position, footprint)) return true;
  const radiusSquared = radius * radius;
  return footprint.some((from, index) => distanceSquaredToSegment(position, from, footprint[(index + 1) % footprint.length]) <= radiusSquared);
}

export class CollisionSystem {
  constructor(private readonly colliders: BoxCollider[], private readonly radius: number) {}

  check(position: Vec3): BoxCollider | undefined {
    return this.colliders.find((collider) => colliderIntersectsSphere(collider, position, this.radius));
  }
}
