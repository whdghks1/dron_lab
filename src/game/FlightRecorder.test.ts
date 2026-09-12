import assert from 'node:assert/strict';
import test from 'node:test';
import { FlightRecorder } from './FlightRecorder';
import type { FlightState } from './types';

const state = (elapsed: number, x: number, yaw = 0): FlightState => ({
  position: { x, y: 4, z: 0 },
  velocity: { x: 2, y: 0, z: 0 },
  yaw,
  elapsed,
  distance: x,
});

test('FlightRecorder throttles dense stationary samples', () => {
  const recorder = new FlightRecorder(0.25, 3);
  recorder.reset(state(0, 0));
  assert.equal(recorder.record(state(0.1, 0.1)), false);
  assert.equal(recorder.record(state(0.26, 0.2)), true);
  assert.equal(recorder.positions.length, 2);
});

test('FlightRecorder interpolates motion and takes the shortest yaw path', () => {
  const recorder = new FlightRecorder();
  recorder.reset(state(0, 0, Math.PI * 0.9));
  recorder.record(state(1, 10, -Math.PI * 0.9), true);
  const middle = recorder.sample(0.5)!;
  assert.equal(middle.position.x, 5);
  assert.ok(Math.abs(Math.abs(middle.yaw) - Math.PI) < 1e-6);
  assert.equal(recorder.duration, 1);
  assert.equal(recorder.canReplay, true);
});
