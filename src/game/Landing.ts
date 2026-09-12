import type { Vec3 } from './types';

export interface LandingCheck {
  position: Vec3;
  velocity: Vec3;
  pad: Pick<Vec3, 'x' | 'z'>;
  groundHeight: number;
  descending: boolean;
}

export function canLand({ position, velocity, pad, groundHeight, descending }: LandingCheck): boolean {
  const horizontalDistance = Math.hypot(position.x - pad.x, position.z - pad.z);
  const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
  const altitude = position.y - groundHeight;
  return descending && horizontalDistance <= 5.2 && altitude <= 1.3 && horizontalSpeed <= 2.5 && Math.abs(velocity.y) <= 1.5;
}
