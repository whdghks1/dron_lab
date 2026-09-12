import { HONGJECHEON_CONFIG as config } from '../areas/hongjecheon/config';

export type FlightMode = 'free' | 'explore';

export class MissionPanel {
  mode: FlightMode = 'free';
  private readonly free = document.getElementById('free') as HTMLButtonElement;
  private readonly explore = document.getElementById('explore') as HTMLButtonElement;
  private readonly objective = document.getElementById('objective')!;
  private readonly progress = document.getElementById('progress')!;
  private readonly hint = document.getElementById('hint')!;
  private readonly segments = document.getElementById('segments')!;

  constructor(onModeChange: (mode: FlightMode) => void) {
    this.free.addEventListener('click', () => { this.mode = 'free'; onModeChange(this.mode); });
    this.explore.addEventListener('click', () => { this.mode = 'explore'; onModeChange(this.mode); });
    this.render(0, false);
  }

  render(index: number, completed: boolean) {
    this.free.classList.toggle('selected', this.mode === 'free');
    this.explore.classList.toggle('selected', this.mode === 'explore');
    if (this.mode === 'free') {
      this.objective.textContent = '자유롭게 홍제천을 둘러보세요';
      this.progress.textContent = 'FREE FLIGHT';
      this.hint.textContent = 'W로 이동 · ↑로 상승 · C로 시점 전환';
      this.segments.replaceChildren();
      return;
    }
    this.objective.textContent = completed ? '홍제천 탐험 완료!' : config.checkpoints[index]?.title ?? '코스 완료';
    this.progress.textContent = `${String(index).padStart(2, '0')} / ${String(config.checkpoints.length).padStart(2, '0')} PLACES`;
    this.hint.textContent = completed ? '출발점으로 돌아가거나 다시 도전해 보세요.' : config.checkpoints[index].description;
    this.segments.innerHTML = config.checkpoints.map((_, segment) => `<i class="${segment < index ? 'done' : segment === index ? 'active' : ''}"></i>`).join('');
  }
}
