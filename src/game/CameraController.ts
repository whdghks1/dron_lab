import * as THREE from 'three';
import type { FlightState } from './types';
import { damp } from '../utils/math';

export type CameraMode = 'chase' | 'fpv';

export class CameraController {
  mode: CameraMode = 'chase';
  private initialized = false;

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  toggle(): CameraMode {
    this.mode = this.mode === 'chase' ? 'fpv' : 'chase';
    this.initialized = false;
    return this.mode;
  }

  reset() { this.initialized = false; }

  update(state: FlightState, dt: number) {
    const forward = new THREE.Vector3(Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    const target = new THREE.Vector3(state.position.x, state.position.y, state.position.z);
    const desired = this.mode === 'fpv'
      ? target.clone().add(forward.clone().multiplyScalar(0.45)).add(new THREE.Vector3(0, 0.12, 0))
      : target.clone().add(forward.clone().multiplyScalar(-10)).add(new THREE.Vector3(0, 4.8, 0));
    if (!this.initialized) {
      this.camera.position.copy(desired);
      this.initialized = true;
    } else {
      this.camera.position.set(
        damp(this.camera.position.x, desired.x, 7, dt),
        damp(this.camera.position.y, desired.y, 7, dt),
        damp(this.camera.position.z, desired.z, 7, dt),
      );
    }
    const lookAt = this.mode === 'fpv'
      ? target.clone().add(forward.clone().multiplyScalar(30)).add(new THREE.Vector3(0, -0.8, 0))
      : target.clone().add(forward.clone().multiplyScalar(4));
    this.camera.lookAt(lookAt);
  }
}
