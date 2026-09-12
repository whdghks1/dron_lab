import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_FLIGHT_CONFIG, initialFlightState, stepFlight } from './FlightPhysics';
import type { FlightInput } from './types';

const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
const idle: FlightInput = { forward: 0, side: 0, vertical: 0, turn: 0, boost: false, brake: false };

describe('assisted flight physics', () => {
  it('moves forward using delta time', () => {
    const result = stepFlight(initialFlightState({ x: 0, y: 5, z: 0 }), { ...idle, forward: 1 }, 0.016, DEFAULT_FLIGHT_CONFIG, bounds);
    assert.ok(result.state.position.z < 0);
    assert.ok(Math.abs(result.state.elapsed - 0.016) < 1e-8);
  });

  it('automatically slows down without directional input', () => {
    const state = initialFlightState({ x: 0, y: 5, z: 0 });
    state.velocity.z = -12;
    const result = stepFlight(state, idle, 0.05, DEFAULT_FLIGHT_CONFIG, bounds);
    assert.ok(Math.abs(result.state.velocity.z) < 12);
  });

  it('holds altitude when vertical input is released', () => {
    const state = initialFlightState({ x: 0, y: 12, z: 0 });
    const result = stepFlight(state, idle, 0.05, DEFAULT_FLIGHT_CONFIG, bounds);
    assert.equal(result.state.position.y, 12);
  });

  it('clamps altitude and flight bounds', () => {
    const state = initialFlightState({ x: 99.9, y: 99.9, z: 0 });
    state.velocity.x = 20;
    state.velocity.y = 20;
    const result = stepFlight(state, { ...idle, vertical: 1, side: 1 }, 0.05, DEFAULT_FLIGHT_CONFIG, bounds);
    assert.equal(result.hitBoundary, true);
    assert.equal(result.hitAltitudeLimit, true);
    assert.equal(result.state.position.x, 100);
    assert.equal(result.state.position.y, 100);
  });
});
