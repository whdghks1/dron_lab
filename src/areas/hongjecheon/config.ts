import type { AreaConfig } from '../types';
import { geoToLocal } from '../../utils/geo';

export const HONGJECHEON_ORIGIN = { lat: 37.5813046, lon: 126.9378073 } as const;

const point = (lat: number, lon: number, y: number) => ({ ...geoToLocal({ lat, lon }, HONGJECHEON_ORIGIN), y });

export const HONGJECHEON_CONFIG: AreaConfig = {
  id: 'hongjecheon-waterfall',
  name: '홍제천',
  subtitle: '서대문구 인공폭포 구간',
  origin: HONGJECHEON_ORIGIN,
  bounds: { minX: -490, maxX: 455, minZ: -405, maxZ: 550 },
  start: point(37.58083, 126.93778, 2.5),
  startYaw: 0.42,
  sourceUrl: 'https://www.openstreetmap.org/copyright',
  checkpoints: [
    { id: 'waterfall', title: '홍제천 인공폭포', description: '물길 옆 인공폭포에서 출발합니다.', position: point(37.5813046, 126.9378073, 9) },
    { id: 'curve', title: '물길 굽이', description: '홍제천이 서쪽으로 휘는 지점입니다.', position: point(37.58033, 126.93673, 11) },
    { id: 'cycleway', title: '홍제천 자전거길', description: '하천과 나란히 이어지는 이동 축입니다.', position: point(37.57962, 126.93502, 8) },
    { id: 'bridge-south', title: '하천 연결교', description: '양쪽 산책로를 잇는 작은 다리입니다.', position: point(37.57872, 126.93287, 7) },
    { id: 'turnaround', title: '남쪽 반환점', description: '홍제천 하류 방향의 MVP 경계입니다.', position: point(37.57792, 126.93095, 10) },
    { id: 'north-bank', title: '북쪽 산책로', description: '물길을 따라 폭포 방향으로 돌아갑니다.', position: point(37.58240, 126.93728, 12) },
    { id: 'hongje-viaduct', title: '홍제천고가교', description: '도시 기반시설과 하천이 만나는 지점입니다.', position: point(37.58338, 126.93669, 16) },
    { id: 'north-view', title: '상류 조망점', description: '홍제천 상류 굽이를 조망합니다.', position: point(37.58466, 126.93586, 20) },
  ],
};
