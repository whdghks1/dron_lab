import type { FlightInput } from './types';

export class InputManager {
  private readonly keys = new Set<string>();
  private readonly cleanups: Array<() => void> = [];

  constructor() {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return;
      const key = event.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
      this.keys.add(key);
    };
    const up = (event: KeyboardEvent) => this.keys.delete(event.key.toLowerCase());
    const clear = () => this.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    this.cleanups.push(() => window.removeEventListener('keydown', down), () => window.removeEventListener('keyup', up), () => window.removeEventListener('blur', clear), () => document.removeEventListener('visibilitychange', clear));
    document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => {
      const key = button.dataset.key!;
      const press = (event: PointerEvent) => { event.preventDefault(); button.setPointerCapture(event.pointerId); this.keys.add(key); };
      const release = () => this.keys.delete(key);
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      this.cleanups.push(() => button.removeEventListener('pointerdown', press), () => button.removeEventListener('pointerup', release), () => button.removeEventListener('pointercancel', release));
    });
  }

  snapshot(): FlightInput {
    return {
      forward: Number(this.keys.has('w')) - Number(this.keys.has('s')),
      side: Number(this.keys.has('d')) - Number(this.keys.has('a')),
      vertical: Number(this.keys.has('arrowup')) - Number(this.keys.has('arrowdown')),
      turn: Number(this.keys.has('e') || this.keys.has('arrowright')) - Number(this.keys.has('q') || this.keys.has('arrowleft')),
      boost: this.keys.has('shift'),
      brake: this.keys.has(' '),
    };
  }

  clear = () => this.keys.clear();
  dispose() { this.cleanups.forEach((cleanup) => cleanup()); }
}
