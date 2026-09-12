import type { BoxCollider, Vec3 } from './types';

export class CollisionSystem {
  constructor(private readonly colliders: BoxCollider[], private readonly radius: number) {}

  check(position: Vec3): BoxCollider | undefined {
    return this.colliders.find((box) =>
      position.x + this.radius > box.minX && position.x - this.radius < box.maxX &&
      position.z + this.radius > box.minZ && position.z - this.radius < box.maxZ &&
      position.y + this.radius > box.minY && position.y - this.radius < box.maxY,
    );
  }
}
