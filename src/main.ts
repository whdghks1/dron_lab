import './style.css';
import { DroneLabApp } from './app/DroneLabApp';
import { listAreas, loadArea, resolveAreaId } from './areas/registry';

const loading = document.getElementById('loading')!;
const error = document.getElementById('error')!;
const errorMessage = document.getElementById('error-message')!;

async function bootstrap() {
  try {
    if (!window.WebGLRenderingContext) throw new Error('이 브라우저 또는 기기에서 WebGL을 사용할 수 없습니다. WebGL을 활성화하거나 최신 브라우저를 사용해 주세요.');
    const canvas = document.getElementById('world') as HTMLCanvasElement | null;
    if (!canvas) throw new Error('3D Canvas를 찾을 수 없습니다.');
    const selectedArea = resolveAreaId(new URLSearchParams(window.location.search).get('area'));
    const areaSelect = document.getElementById('area-select') as HTMLSelectElement;
    areaSelect.replaceChildren(...listAreas().map((area) => new Option(`${area.name} · ${area.subtitle}`, area.id)));
    areaSelect.value = selectedArea;
    areaSelect.disabled = listAreas().length < 2;
    areaSelect.addEventListener('change', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('area', areaSelect.value);
      window.location.assign(url);
    });
    const data = await loadArea(selectedArea);
    canvas.setAttribute('aria-label', `${data.config.name} 3D 드론 비행장`);
    const app = new DroneLabApp(canvas, data);
    await app.prepare();
    app.start();
    requestAnimationFrame(() => loading.classList.add('hidden'));
  } catch (reason) {
    console.error(reason);
    loading.classList.add('hidden');
    errorMessage.textContent = reason instanceof Error ? reason.message : '알 수 없는 초기화 오류가 발생했습니다.';
    error.hidden = false;
  }
}

void bootstrap();
