export interface Vec3 { x: number; y: number; z: number }

export interface FlightConfig {
  maxSpeed: number;
  verticalSpeed: number;
  acceleration: number;
  deceleration: number;
  brakeStrength: number;
  turnSpeed: number;
  boostMultiplier: number;
  maxAltitude: number;
  minAltitude: number;
  collisionRadius: number;
}

export interface FlightInput {
  forward: number;
  side: number;
  vertical: number;
  turn: number;
  boost: boolean;
  brake: boolean;
}

export interface FlightState {
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  elapsed: number;
  distance: number;
}

export interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number }
export interface ColliderPoint { x: number; z: number }
export interface BoxCollider extends Bounds {
  minY: number;
  maxY: number;
  label?: string;
  /** Optional exact horizontal footprint used after the broad-phase bounds check. */
  footprint?: ColliderPoint[];
}
