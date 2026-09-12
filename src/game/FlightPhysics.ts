import type { Bounds, FlightConfig, FlightInput, FlightState, Vec3 } from './types';
import { clamp, damp } from '../utils/math';

export const DEFAULT_FLIGHT_CONFIG: FlightConfig = {
  maxSpeed: 15,
  verticalSpeed: 7,
  acceleration: 2.8,
  deceleration: 2.2,
  brakeStrength: 9,
  turnSpeed: 1.45,
  boostMultiplier: 1.75,
  maxAltitude: 100,
  minAltitude: 1.1,
  collisionRadius: 0.8,
};

export interface StepResult { state: FlightState; hitBoundary: boolean; hitAltitudeLimit: boolean }

export function initialFlightState(position: Vec3, yaw = 0): FlightState {
  return { position: { ...position }, velocity: { x: 0, y: 0, z: 0 }, yaw, elapsed: 0, distance: 0 };
}

export function stepFlight(
  state: FlightState,
  input: FlightInput,
  dt: number,
  config: FlightConfig,
  bounds: Bounds,
  windLevel = 0,
  groundHeightAt: (x: number, z: number) => number = () => 0,
): StepResult {
  const safeDt = Math.min(Math.max(dt, 0), 0.05);
  const boost = input.boost ? config.boostMultiplier : 1;
  const speed = config.maxSpeed * boost;
  const yaw = state.yaw + input.turn * config.turnSpeed * safeDt;
  const desiredX = (Math.sin(yaw) * input.forward + Math.cos(yaw) * input.side) * speed;
  const desiredZ = (-Math.cos(yaw) * input.forward + Math.sin(yaw) * input.side) * speed;
  const desiredY = input.vertical * config.verticalSpeed;
  const horizontalInput = input.forward !== 0 || input.side !== 0;
  const response = input.brake ? config.brakeStrength : horizontalInput ? config.acceleration : config.deceleration;
  const windX = Math.sin(state.elapsed * 0.7) * windLevel * 0.65;
  const windZ = Math.cos(state.elapsed * 0.47) * windLevel * 0.45;
  const velocity = {
    x: damp(state.velocity.x, input.brake ? 0 : desiredX + windX, response, safeDt),
    y: damp(state.velocity.y, input.brake ? 0 : desiredY, input.brake ? config.brakeStrength : config.acceleration, safeDt),
    z: damp(state.velocity.z, input.brake ? 0 : desiredZ + windZ, response, safeDt),
  };
  const previous = state.position;
  const position = {
    x: previous.x + velocity.x * safeDt,
    y: previous.y + velocity.y * safeDt,
    z: previous.z + velocity.z * safeDt,
  };
  let hitBoundary = false;
  if (position.x < bounds.minX || position.x > bounds.maxX || position.z < bounds.minZ || position.z > bounds.maxZ) {
    position.x = clamp(position.x, bounds.minX, bounds.maxX);
    position.z = clamp(position.z, bounds.minZ, bounds.maxZ);
    velocity.x = 0;
    velocity.z = 0;
    hitBoundary = true;
  }
  const unclampedY = position.y;
  const groundHeight = groundHeightAt(position.x, position.z);
  position.y = clamp(position.y, groundHeight + config.minAltitude, groundHeight + config.maxAltitude);
  if (position.y !== unclampedY) velocity.y = 0;
  const traveled = Math.hypot(position.x - previous.x, position.y - previous.y, position.z - previous.z);
  return {
    state: { position, velocity, yaw, elapsed: state.elapsed + safeDt, distance: state.distance + traveled },
    hitBoundary,
    hitAltitudeLimit: position.y !== unclampedY,
  };
}
