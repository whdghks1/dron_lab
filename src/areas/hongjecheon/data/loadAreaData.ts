import snapshot from './generated/base-map.json';
import minimap from './generated/minimap.json';
import elevation from './elevation.json';
import type { AreaSnapshot, ElevationGrid, LoadedAreaData } from '../../types';
import { HONGJECHEON_CONFIG } from '../config';
import { HONGJECHEON_VISUALS } from '../visuals';
import { HongjecheonChunkSource } from './HongjecheonChunkSource';

function isSnapshot(value: unknown): value is AreaSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AreaSnapshot>;
  return ['buildings', 'roads', 'paths', 'water', 'bridges', 'parks'].every((key) => Array.isArray(data[key as keyof AreaSnapshot]));
}

function isElevationGrid(value: unknown): value is ElevationGrid {
  if (!value || typeof value !== 'object') return false;
  const grid = value as Partial<ElevationGrid>;
  return Boolean(grid.bounds && grid.rows && grid.columns && Array.isArray(grid.values) && grid.values.length === grid.rows * grid.columns);
}

export async function loadHongjecheonData(): Promise<LoadedAreaData> {
  await Promise.resolve();
  if (!isSnapshot(snapshot)) throw new Error('홍제천 지역 데이터 형식이 올바르지 않습니다.');
  if (!isSnapshot(minimap)) throw new Error('홍제천 미니맵 데이터 형식이 올바르지 않습니다.');
  if (!isElevationGrid(elevation)) throw new Error('홍제천 표고 데이터 형식이 올바르지 않습니다.');
  return {
    config: HONGJECHEON_CONFIG,
    snapshot,
    minimap,
    elevation,
    chunkSource: new HongjecheonChunkSource(),
    visuals: HONGJECHEON_VISUALS,
    airspace: {
      status: 'unavailable',
      zones: [],
    },
  };
}
