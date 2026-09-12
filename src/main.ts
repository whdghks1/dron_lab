import './style.css';
import { DroneLabApp } from './app/DroneLabApp';
import { loadHongjecheonData } from './areas/hongjecheon/data/loadAreaData';

const loading = document.getElementById('loading')!;
const error = document.getElementById('error')!;
const errorMessage = document.getElementById('error-message')!;

async function bootstrap() {
  try {
    if (!window.WebGLRenderingContext) throw new Error('이 브라우저 또는 기기에서 WebGL을 사용할 수 없습니다. WebGL을 활성화하거나 최신 브라우저를 사용해 주세요.');
    const canvas = document.getElementById('world') as HTMLCanvasElement | null;
    if (!canvas) throw new Error('3D Canvas를 찾을 수 없습니다.');
    const data = await loadHongjecheonData();
    const app = new DroneLabApp(canvas, data);
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
