import snapshot from './osm-snapshot.json';
import type { AreaSnapshot } from '../../types';

function isSnapshot(value: unknown): value is AreaSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AreaSnapshot>;
  return ['buildings', 'roads', 'paths', 'water', 'bridges', 'parks'].every((key) => Array.isArray(data[key as keyof AreaSnapshot]));
}

export async function loadHongjecheonData(): Promise<AreaSnapshot> {
  await Promise.resolve();
  if (!isSnapshot(snapshot)) throw new Error('홍제천 지역 데이터 형식이 올바르지 않습니다.');
  return snapshot;
}
