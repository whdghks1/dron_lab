import * as THREE from 'three';
import type { DetailMaterialPreset } from '../areas/types';
import type { Quality } from './World';

function dataTexture(size: number, pixel: (x: number, y: number) => [number, number, number, number]): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const color = pixel(x, y);
      const offset = (y * size + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

const facadePalettes = [
  { wall: [174, 180, 172], frame: [122, 132, 128], window: [58, 84, 94], color: 0xd5dbd3 },
  { wall: [185, 171, 153], frame: [135, 116, 99], window: [62, 75, 81], color: 0xd8cbb9 },
  { wall: [150, 160, 166], frame: [94, 107, 114], window: [43, 69, 82], color: 0xbac4c7 },
] as const;

export function createFacadeMaterial(variant = 0): THREE.MeshStandardMaterial {
  const palette = facadePalettes[Math.abs(variant) % facadePalettes.length];
  const map = dataTexture(64, (x, y) => {
    const panel = x % 16;
    const floor = y % 12;
    const window = panel >= 3 && panel <= 12 && floor >= 3 && floor <= 8;
    const frame = panel === 2 || panel === 13 || floor === 2 || floor === 9;
    const variation = ((x * 17 + y * 31) % 9) - 4;
    if (window) return [...palette.window.map((value) => value + variation), 255] as [number, number, number, number];
    if (frame) return [...palette.frame.map((value) => value + variation), 255] as [number, number, number, number];
    return [...palette.wall.map((value) => value + variation), 255] as [number, number, number, number];
  });
  map.repeat.set(0.065, 0.085);
  return new THREE.MeshStandardMaterial({ color: palette.color, map, roughness: 0.72, metalness: 0.03 });
}

export function createWaterMaterial(): THREE.MeshPhysicalMaterial {
  const map = dataTexture(64, (x, y) => {
    const wave = Math.sin(x * 0.48 + y * 0.15) * 9 + Math.sin(x * 0.13 - y * 0.42) * 6;
    const sparkle = (x * 37 + y * 61) % 47 === 0 ? 22 : 0;
    return [54 + wave + sparkle, 126 + wave + sparkle, 147 + wave + sparkle, 255].map((value) => Math.max(0, Math.min(255, Math.round(value)))) as [number, number, number, number];
  });
  map.repeat.set(0.04, 0.08);
  return new THREE.MeshPhysicalMaterial({
    color: 0x70afbd,
    map,
    bumpMap: map,
    bumpScale: 0.16,
    roughness: 0.24,
    metalness: 0.08,
    clearcoat: 0.55,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
}

export interface RoadMaterialSet {
  major: THREE.MeshStandardMaterial;
  minor: THREE.MeshStandardMaterial;
  path: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  edge: THREE.MeshBasicMaterial;
  center: THREE.MeshBasicMaterial;
  cycleEdge: THREE.MeshBasicMaterial;
}

export function createRoadMaterials(): RoadMaterialSet {
  const asphalt = patternedTexture([83, 91, 94], (x, y) => ((x * 11 + y * 17) % 13) - 6);
  const localRoad = patternedTexture([111, 116, 114], (x, y) => ((x * 7 + y * 5) % 9) - 4);
  const walking = patternedTexture([174, 169, 146], (x, y) => (x % 8 === 0 || y % 8 === 0 ? -13 : 2));
  const sidewalk = patternedTexture([155, 151, 139], (x, y) => (x % 8 === 0 || y % 6 === 0 ? -12 : 3));
  [asphalt, localRoad, walking, sidewalk].forEach((texture) => texture.repeat.set(0.12, 0.12));
  return {
    major: new THREE.MeshStandardMaterial({ color: 0x7d8588, map: asphalt, roughness: 0.96 }),
    minor: new THREE.MeshStandardMaterial({ color: 0xa1a5a1, map: localRoad, roughness: 0.98 }),
    path: new THREE.MeshStandardMaterial({ color: 0xd0c9aa, map: walking, roughness: 1 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: 0xbeb9aa, map: sidewalk, roughness: 1 }),
    edge: new THREE.MeshBasicMaterial({ color: 0xe8e7dc }),
    center: new THREE.MeshBasicMaterial({ color: 0xe6c65a }),
    cycleEdge: new THREE.MeshBasicMaterial({ color: 0xd9eee7 }),
  };
}

function patternedTexture(
  base: [number, number, number],
  pattern: (x: number, y: number) => number,
): THREE.DataTexture {
  return dataTexture(32, (x, y) => {
    const value = pattern(x, y) + ((x * 19 + y * 23) % 7) - 3;
    return [base[0] + value, base[1] + value, base[2] + value, 255]
      .map((channel) => Math.max(0, Math.min(255, channel))) as [number, number, number, number];
  });
}

export type DetailMaterialSet = Record<DetailMaterialPreset, THREE.MeshStandardMaterial> & {
  shadow: THREE.MeshBasicMaterial;
  waterfall: THREE.MeshPhysicalMaterial;
};

type ExternalTextureKind = 'diffuse' | 'normal' | 'roughness';

interface ExternalSurfaceTextures {
  diffuse?: THREE.Texture;
  normal?: THREE.Texture;
  roughness?: THREE.Texture;
}

interface DetailMaterialState {
  quality: Quality;
  concrete: ExternalSurfaceTextures;
  stone: ExternalSurfaceTextures;
  concreteFallbacks: THREE.Texture[];
  stoneFallback: THREE.Texture;
}

const detailMaterialStates = new WeakMap<DetailMaterialSet, DetailMaterialState>();
const EXTERNAL_DETAIL_TEXTURES = {
  concrete: {
    diffuse: '/textures/materials/polyhaven/concrete-diff-1k.jpg',
    normal: '/textures/materials/polyhaven/concrete-normal-gl-512.jpg',
    roughness: '/textures/materials/polyhaven/concrete-rough-512.jpg',
  },
  stone: {
    diffuse: '/textures/materials/polyhaven/stone-wall-05-diff-1k.jpg',
    normal: '/textures/materials/polyhaven/stone-wall-05-normal-gl-512.jpg',
    roughness: '/textures/materials/polyhaven/stone-wall-05-rough-512.jpg',
  },
} as const;

export function externalDetailTextureKinds(quality: Quality): ExternalTextureKind[] {
  return quality === 'low' ? ['diffuse'] : ['diffuse', 'normal', 'roughness'];
}

function prepareExternalTexture(texture: THREE.Texture, color: boolean, repeat: number) {
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
}

function loadExternalTexture(
  url: string,
  color: boolean,
  repeat: number,
  ready: (texture: THREE.Texture) => void,
  failed: (texture: THREE.Texture) => void,
) {
  let texture: THREE.Texture;
  texture = new THREE.TextureLoader().load(url, () => ready(texture), undefined, () => failed(texture));
  prepareExternalTexture(texture, color, repeat);
  return texture;
}

function clearSurfaceDetail(textures: ExternalSurfaceTextures, materials: THREE.MeshStandardMaterial[]) {
  for (const kind of ['normal', 'roughness'] as const) {
    const texture = textures[kind];
    if (texture) texture.dispose();
    textures[kind] = undefined;
  }
  materials.forEach((material) => {
    material.normalMap = null;
    material.roughnessMap = null;
    material.needsUpdate = true;
  });
}

function ensureSurfaceTextures(
  state: DetailMaterialState,
  surface: 'concrete' | 'stone',
  materials: THREE.MeshStandardMaterial[],
  repeat: number,
) {
  const textures = state[surface];
  const urls = EXTERNAL_DETAIL_TEXTURES[surface];
  if (!textures.diffuse) {
    const texture = loadExternalTexture(urls.diffuse, true, repeat, (loaded) => {
      if (textures.diffuse !== loaded) return loaded.dispose();
      materials.forEach((material) => {
        material.map = loaded;
        material.color.setHex(surface === 'concrete' && material === materials[0] ? 0xd5d2c8 : 0xffffff);
        material.needsUpdate = true;
      });
      const fallbacks = surface === 'concrete' ? state.concreteFallbacks : [state.stoneFallback];
      fallbacks.forEach((fallback) => fallback.dispose());
    }, (failed) => {
      if (textures.diffuse === failed) textures.diffuse = undefined;
      failed.dispose();
      console.warn(`외부 디테일 텍스처를 불러오지 못해 절차형 재질을 유지합니다: ${urls.diffuse}`);
    });
    textures.diffuse = texture;
  }
  const enabledKinds = externalDetailTextureKinds(state.quality);
  if (!enabledKinds.includes('normal') || !enabledKinds.includes('roughness')) return;
  if (!textures.normal) {
    const texture = loadExternalTexture(urls.normal, false, repeat, (loaded) => {
      if (textures.normal !== loaded || state.quality === 'low') return loaded.dispose();
      materials.forEach((material) => {
        material.normalMap = loaded;
        material.normalScale.setScalar(surface === 'stone' ? 0.62 : 0.42);
        material.needsUpdate = true;
      });
    }, (failed) => {
      if (textures.normal === failed) textures.normal = undefined;
      failed.dispose();
      console.warn(`외부 normal 텍스처를 불러오지 못했습니다: ${urls.normal}`);
    });
    textures.normal = texture;
  }
  if (!textures.roughness) {
    const texture = loadExternalTexture(urls.roughness, false, repeat, (loaded) => {
      if (textures.roughness !== loaded || state.quality === 'low') return loaded.dispose();
      materials.forEach((material) => {
        material.roughnessMap = loaded;
        material.needsUpdate = true;
      });
    }, (failed) => {
      if (textures.roughness === failed) textures.roughness = undefined;
      failed.dispose();
      console.warn(`외부 roughness 텍스처를 불러오지 못했습니다: ${urls.roughness}`);
    });
    textures.roughness = texture;
  }
}

export function setDetailMaterialQuality(materials: DetailMaterialSet, quality: Quality) {
  const state = detailMaterialStates.get(materials);
  if (!state) return;
  state.quality = quality;
  const concreteMaterials = [materials['old-concrete'], materials['light-concrete']];
  const stoneMaterials = [materials['stone-bank']];
  if (quality === 'low') {
    clearSurfaceDetail(state.concrete, concreteMaterials);
    clearSurfaceDetail(state.stone, stoneMaterials);
  }
  ensureSurfaceTextures(state, 'concrete', concreteMaterials, 1.6);
  ensureSurfaceTextures(state, 'stone', stoneMaterials, 2.25);
}

/** Small code-generated textures keep the detail system self-contained and license-free. */
export function createDetailMaterials(quality: Quality = 'low'): DetailMaterialSet {
  const oldConcrete = patternedTexture([128, 130, 124], (x, y) => ((x * 7 + y * 11) % 17 === 0 ? -22 : 0));
  const lightConcrete = patternedTexture([184, 187, 178], (_x, y) => (y % 11 === 0 ? -10 : 0));
  const stone = patternedTexture([119, 116, 103], (x, y) => (x % 8 === 0 || y % 6 === 0 ? -19 : 5));
  const paving = patternedTexture([151, 143, 126], (x, y) => (x % 8 === 0 || y % 8 === 0 ? -14 : 3));
  const cycleway = patternedTexture([66, 102, 95], (x, y) => ((x + y * 3) % 19 === 0 ? 12 : 0));
  const wet = patternedTexture([74, 91, 88], (x, y) => (Math.sin(x * 0.7 + y * 0.3) * 8));
  const grass = patternedTexture([91, 112, 72], (x, y) => ((x * 5 + y * 13) % 9) - 4);
  const standard = (color: number, map: THREE.Texture, roughness = 0.92, metalness = 0.02) =>
    new THREE.MeshStandardMaterial({ color, map, roughness, metalness });
  const materials: DetailMaterialSet = {
    'old-concrete': standard(0xa2a49d, oldConcrete, 0.98),
    'light-concrete': standard(0xd1d2c9, lightConcrete, 0.94),
    'stone-bank': standard(0xa3a092, stone, 1),
    'paving-stone': standard(0xc0b8a6, paving, 0.96),
    cycleway: standard(0x527f75, cycleway, 0.9),
    'wet-edge': standard(0x667d79, wet, 0.48, 0.05),
    'metal-rail': standard(0xaebbb9, lightConcrete, 0.38, 0.62),
    'grass-soil': standard(0x71865d, grass, 1),
    shadow: new THREE.MeshBasicMaterial({ color: 0x1a2325, transparent: true, opacity: 0.3, depthWrite: false }),
    waterfall: new THREE.MeshPhysicalMaterial({ color: 0x8fd7e4, roughness: 0.16, transmission: 0.16, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  };
  if (typeof document !== 'undefined') {
    detailMaterialStates.set(materials, {
      quality,
      concrete: {},
      stone: {},
      concreteFallbacks: [oldConcrete, lightConcrete],
      stoneFallback: stone,
    });
    setDetailMaterialQuality(materials, quality);
  }
  return materials;
}
