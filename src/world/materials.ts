import * as THREE from 'three';

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
