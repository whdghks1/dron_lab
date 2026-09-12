import type { AreaConfig } from '../areas/types';

export type FlightMode = 'free' | 'explore';

export class MissionPanel {
  mode: FlightMode = 'free';
  private readonly free = document.getElementById('free') as HTMLButtonElement;
  private readonly explore = document.getElementById('explore') as HTMLButtonElement;
  private readonly objective = document.getElementById('objective')!;
  private readonly progress = document.getElementById('progress')!;
  private readonly best = document.getElementById('best-time')!;
  private readonly hint = document.getElementById('hint')!;
  private readonly segments = document.getElementById('segments')!;

  constructor(private readonly config: AreaConfig, onModeChange: (mode: FlightMode) => void, bestTime?: number) {
    this.free.addEventListener('click', () => { this.mode = 'free'; onModeChange(this.mode); });
    this.explore.addEventListener('click', () => { this.mode = 'explore'; onModeChange(this.mode); });
    this.render(0, false, bestTime);
  }

  render(index: number, completed: boolean, bestTime?: number) {
    this.free.classList.toggle('selected', this.mode === 'free');
    this.explore.classList.toggle('selected', this.mode === 'explore');
    this.best.textContent = bestTime === undefined ? 'BEST --:--' : `BEST ${this.formatTime(bestTime)}`;
    if (this.mode === 'free') {
      this.objective.textContent = `자유롭게 ${this.config.name}을 둘러보세요`;
      this.progress.textContent = 'FREE FLIGHT';
      this.hint.textContent = 'W로 이동 · ↑로 상승 · C로 시점 전환';
      this.segments.replaceChildren();
      return;
    }
    if (index >= this.config.checkpoints.length && !completed) {
      this.objective.textContent = '출발 패드에 착륙하세요';
      this.progress.textContent = 'RETURN TO BASE';
      this.hint.textContent = '패드 위에서 속도를 줄이고 ↓로 천천히 내려오세요.';
      this.segments.innerHTML = this.config.checkpoints.map(() => '<i class="done"></i>').join('');
      return;
    }
    this.objective.textContent = completed ? `${this.config.name} 탐험 완료!` : this.config.checkpoints[index]?.title ?? '코스 완료';
    this.progress.textContent = completed ? 'SAFE LANDING' : `${String(index).padStart(2, '0')} / ${String(this.config.checkpoints.length).padStart(2, '0')} PLACES`;
    this.hint.textContent = completed ? '출발점으로 돌아가거나 다시 도전해 보세요.' : this.config.checkpoints[index].description;
    this.segments.innerHTML = this.config.checkpoints.map((_, segment) => `<i class="${segment < index ? 'done' : segment === index ? 'active' : ''}"></i>`).join('');
  }

  private formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }
}
