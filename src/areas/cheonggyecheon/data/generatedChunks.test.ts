import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import source from './osm-snapshot.json';
import index from './generated/chunk-index.json';
import type { AreaSnapshot } from '../../types';

const dataDirectory = dirname(fileURLToPath(import.meta.url));
const categories = ['buildings', 'roads', 'paths', 'bridges', 'parks'] as const;

describe('Cheonggyecheon generated area chunks', () => {
  it('contains every chunk file declared in the index', () => {
    assert.equal(index.chunks.length, 32);
    for (const chunk of index.chunks) {
      const parsed = JSON.parse(readFileSync(resolve(dataDirectory, 'generated/chunks', chunk.file), 'utf8')) as AreaSnapshot;
      assert.equal(parsed.water.length, 0);
      assert.ok(categories.some((category) => parsed[category].length > 0));
    }
  });

  it('preserves every source feature exactly once', () => {
    const totals = Object.fromEntries(categories.map((category) => [category, 0])) as Record<(typeof categories)[number], number>;
    for (const chunk of index.chunks) {
      const parsed = JSON.parse(readFileSync(resolve(dataDirectory, 'generated/chunks', chunk.file), 'utf8')) as AreaSnapshot;
      for (const category of categories) totals[category] += parsed[category].length;
    }
    for (const category of categories) assert.equal(totals[category], source[category].length, category);
    assert.equal(totals.buildings, 1029);
  });
});
