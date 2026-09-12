import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = process.argv[2] || 'src/areas/hongjecheon/data/osm-snapshot.json';
const snapshot = JSON.parse(readFileSync(sourcePath, 'utf8'));
const outputRoot = resolve('src/areas/hongjecheon/data/generated');
const chunkRoot = resolve(outputRoot, 'chunks');
const origin = { lat: 37.5813046, lon: 126.9378073 };
const chunkSize = 240;
const metersPerLatitudeDegree = 111_320;
const metersPerLongitudeDegree = metersPerLatitudeDegree * Math.cos(origin.lat * Math.PI / 180);
const emptySnapshot = () => ({ capturedAt: snapshot.capturedAt, source: snapshot.source, buildings: [], roads: [], paths: [], water: [], bridges: [], parks: [] });

function local(point) {
  return {
    x: (point.lon - origin.lon) * metersPerLongitudeDegree,
    z: -(point.lat - origin.lat) * metersPerLatitudeDegree,
  };
}

function center(feature) {
  const points = feature.points.map(local);
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    z: points.reduce((sum, point) => sum + point.z, 0) / points.length,
  };
}

function keyFor(feature) {
  const point = center(feature);
  return `${Math.floor(point.x / chunkSize)}:${Math.floor(point.z / chunkSize)}`;
}

function fileFor(key) {
  return `${key.replace(':', '_')}.json`;
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(chunkRoot, { recursive: true });
const chunks = new Map();
for (const category of ['buildings', 'roads', 'paths', 'bridges', 'parks']) {
  for (const feature of snapshot[category]) {
    const key = keyFor(feature);
    if (!chunks.has(key)) chunks.set(key, emptySnapshot());
    chunks.get(key)[category].push(feature);
  }
}

const manifests = [...chunks.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, data]) => {
  const [column, row] = key.split(':').map(Number);
  writeFileSync(resolve(chunkRoot, fileFor(key)), `${JSON.stringify(data)}\n`);
  return { key, file: fileFor(key), x: (column + 0.5) * chunkSize, z: (row + 0.5) * chunkSize };
});

const base = { ...emptySnapshot(), water: snapshot.water };
const minimap = {
  ...emptySnapshot(),
  water: snapshot.water,
  roads: snapshot.roads.filter((feature) => ['trunk', 'primary', 'secondary', 'tertiary'].includes(feature.kind)),
  paths: snapshot.paths.filter((feature) => feature.kind === 'cycleway'),
};
writeFileSync(resolve(outputRoot, 'base-map.json'), `${JSON.stringify(base)}\n`);
writeFileSync(resolve(outputRoot, 'minimap.json'), `${JSON.stringify(minimap)}\n`);
writeFileSync(resolve(outputRoot, 'chunk-index.json'), `${JSON.stringify({ chunkSize, chunks: manifests })}\n`);

const totalBytes = manifests.reduce((sum, item) => sum + readFileSync(resolve(chunkRoot, item.file)).byteLength, 0);
console.log(`Wrote ${manifests.length} chunks (${Math.round(totalBytes / 1024)} KiB) to ${chunkRoot}`);
