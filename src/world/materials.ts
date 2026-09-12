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

export function createFacadeMaterial(): THREE.MeshStandardMaterial {
  const map = dataTexture(64, (x, y) => {
    const panel = x % 16;
    const floor = y % 12;
    const window = panel >= 3 && panel <= 12 && floor >= 3 && floor <= 8;
    const frame = panel === 2 || panel === 13 || floor === 2 || floor === 9;
    const variation = ((x * 17 + y * 31) % 9) - 4;
    if (window) return [58 + variation, 84 + variation, 94 + variation, 255];
    if (frame) return [122 + variation, 132 + variation, 128 + variation, 255];
    return [174 + variation, 180 + variation, 172 + variation, 255];
  });
  map.repeat.set(0.065, 0.085);
  return new THREE.MeshStandardMaterial({ color: 0xd5dbd3, map, roughness: 0.72, metalness: 0.03 });
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
    roughness: 0.24,
    metalness: 0.08,
    clearcoat: 0.55,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
}
