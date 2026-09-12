import type { FlightState, Vec3 } from './types';

const cloneState = (state: FlightState): FlightState => ({
  ...state,
  position: { ...state.position },
  velocity: { ...state.velocity },
});

const lerp = (from: number, to: number, alpha: number) => from + (to - from) * alpha;

function lerpYaw(from: number, to: number, alpha: number) {
  const delta = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return from + delta * alpha;
}

export class FlightRecorder {
  private samples: FlightState[] = [];

  constructor(
    private readonly interval = 0.25,
    private readonly movementThreshold = 3,
    private readonly maximumSamples = 2400,
  ) {}

  reset(initial?: FlightState) {
    this.samples = initial ? [cloneState(initial)] : [];
  }

  record(state: FlightState, force = false): boolean {
    const last = this.samples.at(-1);
    if (last && !force) {
      const elapsed = state.elapsed - last.elapsed;
      const moved = Math.hypot(
        state.position.x - last.position.x,
        state.position.y - last.position.y,
        state.position.z - last.position.z,
      );
      if (elapsed < this.interval && moved < this.movementThreshold) return false;
    }
    const copy = cloneState(state);
    if (last && Math.abs(copy.elapsed - last.elapsed) < 1e-6) this.samples[this.samples.length - 1] = copy;
    else this.samples.push(copy);
    if (this.samples.length > this.maximumSamples) this.samples.splice(0, this.samples.length - this.maximumSamples);
    return true;
  }

  get canReplay() { return this.samples.length > 1 && this.duration > 0; }
  get duration() { return Math.max(0, (this.samples.at(-1)?.elapsed ?? 0) - (this.samples[0]?.elapsed ?? 0)); }
  get positions(): Vec3[] { return this.samples.map((sample) => ({ ...sample.position })); }

  sample(playbackTime: number): FlightState | undefined {
    if (this.samples.length === 0) return undefined;
    const start = this.samples[0].elapsed;
    const target = start + Math.max(0, playbackTime);
    if (target <= start) return cloneState(this.samples[0]);
    const last = this.samples.at(-1)!;
    if (target >= last.elapsed) return cloneState(last);
    let rightIndex = 1;
    while (this.samples[rightIndex].elapsed < target) rightIndex += 1;
    const left = this.samples[rightIndex - 1];
    const right = this.samples[rightIndex];
    const alpha = (target - left.elapsed) / Math.max(1e-6, right.elapsed - left.elapsed);
    return {
      position: {
        x: lerp(left.position.x, right.position.x, alpha),
        y: lerp(left.position.y, right.position.y, alpha),
        z: lerp(left.position.z, right.position.z, alpha),
      },
      velocity: {
        x: lerp(left.velocity.x, right.velocity.x, alpha),
        y: lerp(left.velocity.y, right.velocity.y, alpha),
        z: lerp(left.velocity.z, right.velocity.z, alpha),
      },
      yaw: lerpYaw(left.yaw, right.yaw, alpha),
      elapsed: lerp(left.elapsed, right.elapsed, alpha),
      distance: lerp(left.distance, right.distance, alpha),
    };
  }
}
