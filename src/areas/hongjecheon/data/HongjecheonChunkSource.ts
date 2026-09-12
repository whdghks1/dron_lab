import chunkIndex from './generated/chunk-index.json';
import type { AreaChunkManifest, AreaChunkSource, AreaSnapshot } from '../../types';

type JsonModule = { default: unknown };
const modules = import.meta.glob<JsonModule>('./generated/chunks/*.json');

function isSnapshot(value: unknown): value is AreaSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<AreaSnapshot>;
  return ['buildings', 'roads', 'paths', 'water', 'bridges', 'parks'].every((key) => Array.isArray(data[key as keyof AreaSnapshot]));
}

export class HongjecheonChunkSource implements AreaChunkSource {
  readonly chunkSize = chunkIndex.chunkSize;
  private readonly manifests = new Map<string, AreaChunkManifest>(chunkIndex.chunks.map((chunk) => [chunk.key, chunk]));
  private readonly cache = new Map<string, Promise<AreaSnapshot>>();

  keysAround(x: number, z: number, radius: number): string[] {
    const margin = this.chunkSize * Math.SQRT2 / 2;
    return [...this.manifests.values()]
      .filter((chunk) => Math.hypot(x - chunk.x, z - chunk.z) <= radius + margin)
      .map((chunk) => chunk.key);
  }

  load(key: string): Promise<AreaSnapshot> {
    const cached = this.cache.get(key);
    if (cached) return cached;
    const manifest = this.manifests.get(key);
    if (!manifest) return Promise.reject(new Error(`알 수 없는 홍제천 청크: ${key}`));
    const importer = modules[`./generated/chunks/${manifest.file}`];
    if (!importer) return Promise.reject(new Error(`홍제천 청크 파일을 찾을 수 없습니다: ${manifest.file}`));
    const request = importer()
      .then((module) => {
        if (!isSnapshot(module.default)) throw new Error(`홍제천 청크 형식이 올바르지 않습니다: ${manifest.file}`);
        return module.default;
      })
      .catch((error: unknown) => {
        this.cache.delete(key);
        throw error;
      });
    this.cache.set(key, request);
    return request;
  }
}
