import type { LandmarkConfig } from '../types';

export const HONGJECHEON_LANDMARKS: LandmarkConfig[] = [
  {
    id: 'hongjecheon-waterfall-authored',
    name: '홍제폭포 현장 보정 모델',
    position: { lat: 37.5813482, lon: 126.9378192 },
    placeholder: {
      kind: 'waterfall',
      // Official Seoul visitor information gives the landmark envelope as
      // approximately 60 m wide and 25 m high. Orientation follows the OSM
      // river/path relationship: the rock face looks west across the channel.
      width: 60,
      height: 25,
      depth: 16,
      basinWidth: 44,
      basinDepth: 22,
      cascadeCount: 9,
      // Align the pool with the authored stream corridor after the coarse DEM
      // is blended away from the east-bank landmark anchor.
      baseOffset: -4,
      rotation: 1.52,
      materialPreset: 'stone-bank',
      dataOrigin: 'authored',
    },
    collider: {
      size: [58, 24, 8],
      offset: [0, 8, 1.4],
      label: '홍제폭포 암벽',
    },
  },
];
