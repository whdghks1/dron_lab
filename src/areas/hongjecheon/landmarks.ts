import type { LandmarkConfig } from '../types';

export const HONGJECHEON_LANDMARKS: LandmarkConfig[] = [
  {
    id: 'hongjecheon-waterfall-authored',
    name: '홍제천 인공폭포 제작 모델',
    position: { lat: 37.5813046, lon: 126.9378073 },
    placeholder: {
      kind: 'waterfall',
      width: 22,
      height: 6.4,
      depth: 5.2,
      rotation: 0.18,
      materialPreset: 'stone-bank',
      dataOrigin: 'authored',
    },
    collider: {
      size: [22, 6.4, 3.4],
      offset: [0, 3.2, 1.2],
      label: '홍제천 인공폭포 제작 모델',
    },
  },
];
