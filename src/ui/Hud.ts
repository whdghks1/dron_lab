import type { FlightState } from '../game/types';

const required = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`UI element #${id} is missing`);
  return element as T;
};

export class Hud {
  private speed = required<HTMLElement>('speed');
  private altitude = required<HTMLElement>('altitude');
  private time = required<HTMLElement>('time');
  private distance = required<HTMLElement>('distance');
  private heading = required<HTMLElement>('heading');
  private state = required<HTMLElement>('state');
  private performance = required<HTMLElement>('performance');
  private toast = required<HTMLElement>('toast');
  private toastUntil = 0;

  update(flight: FlightState, label: string, groundHeight = 0) {
    this.speed.textContent = (Math.hypot(flight.velocity.x, flight.velocity.y, flight.velocity.z) * 3.6).toFixed(1);
    this.altitude.textContent = Math.max(0, flight.position.y - groundHeight).toFixed(1);
    const minutes = Math.floor(flight.elapsed / 60);
    const seconds = Math.floor(flight.elapsed % 60);
    this.time.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this.distance.textContent = String(Math.round(flight.distance));
    const degrees = (flight.yaw * 180 / Math.PI % 360 + 360) % 360;
    this.heading.textContent = `${String(Math.round(degrees) % 360).padStart(3, '0')}° ${['N', 'E', 'S', 'W'][Math.round(degrees / 90) % 4]}`;
    this.state.textContent = label;
  }

  notify(message: string, elapsed: number, duration = 4) {
    this.toast.textContent = message;
    this.toastUntil = elapsed + duration;
  }

  ambient(message: string, elapsed: number) {
    if (elapsed > this.toastUntil) this.toast.textContent = message;
  }

  updatePerformance(fps: number, chunks: { active: number; cached: number; cacheLimit: number; pending: number }, memory: { geometries: number; textures: number }) {
    this.performance.textContent = `${fps} FPS · CHUNK ${chunks.active}/${chunks.cached}/${chunks.cacheLimit} · GPU ${memory.geometries}G ${memory.textures}T${chunks.pending ? ` · LOAD ${chunks.pending}` : ''}`;
  }
}
