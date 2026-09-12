import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { externalDetailTextureKinds } from './materials';

describe('detail PBR quality policy', () => {
  it('loads only diffuse on low and enables surface maps on higher qualities', () => {
    assert.deepEqual(externalDetailTextureKinds('low'), ['diffuse']);
    assert.deepEqual(externalDetailTextureKinds('medium'), ['diffuse', 'normal', 'roughness']);
    assert.deepEqual(externalDetailTextureKinds('high'), ['diffuse', 'normal', 'roughness']);
  });
});
