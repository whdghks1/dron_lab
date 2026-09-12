import type { Vec3 } from '../game/types';

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));
export const distance3 = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function crossedCheckpoint(previous: Vec3, current: Vec3, checkpoint: Vec3, from: Vec3, radius: number): boolean {
  const dx = checkpoint.x - from.x;
  const dz = checkpoint.z - from.z;
  const length = Math.hypot(dx, dz) || 1;
  const nx = dx / length;
  const nz = dz / length;
  const before = (previous.x - checkpoint.x) * nx + (previous.z - checkpoint.z) * nz;
  const after = (current.x - checkpoint.x) * nx + (current.z - checkpoint.z) * nz;
  if (before > 0 || after <= 0) return false;
  const t = -before / (after - before);
  const intersection = {
    x: previous.x + (current.x - previous.x) * t,
    y: previous.y + (current.y - previous.y) * t,
    z: previous.z + (current.z - previous.z) * t,
  };
  return distance3(intersection, checkpoint) <= radius;
}
