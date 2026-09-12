import type { AreaAirspaceData } from '../areas/types';

function required<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`UI element #${id} is missing.`);
  return element as T;
}

export class SafetyPanel {
  private readonly panel = required<HTMLElement>('safety-panel');
  private readonly body = required<HTMLElement>('safety-body');

  constructor(private readonly airspace?: AreaAirspaceData) {
    required<HTMLButtonElement>('safety').addEventListener('click', () => this.open());
    required<HTMLButtonElement>('safety-close').addEventListener('click', () => this.close());
    this.panel.addEventListener('click', (event) => {
      if (event.target === this.panel) this.close();
    });
    this.render();
  }

  private render() {
    if (!this.airspace || this.airspace.status === 'unavailable') {
      this.body.innerHTML = `
        <strong>공식 공역 데이터 미연결</strong>
        <p>현재 화면의 100 m 제한과 비행 경계는 시뮬레이션 규칙이며 실제 비행 가능 여부를 뜻하지 않습니다.</p>
        <p>실제 비행 전에는 최신 비행금지·제한구역, 임시 제한, 관할 기관 승인과 현장 안전 조건을 별도로 확인하세요.</p>`;
      return;
    }

    const source = this.airspace.sourceUrl
      ? `<a href="${this.airspace.sourceUrl}" target="_blank" rel="noreferrer">데이터 출처 열기</a>`
      : '출처 URL 없음';
    const zones = this.airspace.zones.map((zone) => `
      <li><b>${zone.label}</b><span>${zone.minimumAltitude}–${zone.maximumAltitude} m · ${zone.description}</span></li>`).join('');
    this.body.innerHTML = `
      <strong>참고용 공역 레이어</strong>
      <p>수집 시각 ${this.airspace.capturedAt ?? '미기록'} · ${source}</p>
      <ul>${zones || '<li>표시할 구역이 없습니다.</li>'}</ul>
      <p>이 정보는 참고용이며 실제 비행 허가를 대신하지 않습니다.</p>`;
  }

  private open() {
    this.panel.hidden = false;
    required<HTMLButtonElement>('safety-close').focus();
  }

  private close() {
    this.panel.hidden = true;
    required<HTMLButtonElement>('safety').focus();
  }
}
