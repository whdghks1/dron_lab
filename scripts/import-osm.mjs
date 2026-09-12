import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/import-osm.mjs <overpass.json>');
const raw = JSON.parse(readFileSync(inputPath, 'utf8'));
const outputPath = resolve('src/areas/hongjecheon/data/osm-snapshot.json');
const point = ({ lat, lon }) => ({ lat: Number(lat.toFixed(7)), lon: Number(lon.toFixed(7)) });
const numeric = (value) => Number.parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));

const features = raw.elements
  .filter((item) => item.type === 'way' && item.geometry?.length >= 2)
  .map((item) => ({
    id: item.id,
    name: item.tags?.name || undefined,
    kind: item.tags?.highway || item.tags?.waterway || item.tags?.natural || item.tags?.water || item.tags?.building || item.tags?.leisure || 'unknown',
    points: item.geometry.map(point),
    height: numeric(item.tags?.height) || (numeric(item.tags?.['building:levels']) ? numeric(item.tags['building:levels']) * 3.2 : undefined),
    tags: item.tags || {},
  }));
const clean = (feature) => Object.fromEntries(Object.entries(feature).filter(([key, value]) => key !== 'tags' && value !== undefined));
const isWater = (feature) => feature.tags.waterway || feature.tags.natural === 'water' || feature.tags.water;
const isPath = (feature) => ['footway', 'cycleway', 'path', 'pedestrian'].includes(feature.tags.highway);
const isRoad = (feature) => feature.tags.highway && !isPath(feature);

const snapshot = {
  capturedAt: raw.osm3s?.timestamp_osm_base || new Date().toISOString(),
  source: 'OpenStreetMap contributors (ODbL 1.0), queried through Overpass API',
  buildings: features.filter((feature) => feature.tags.building).map(clean),
  roads: features.filter(isRoad).map(clean),
  paths: features.filter(isPath).map(clean),
  water: features.filter(isWater).map(clean),
  bridges: features.filter((feature) => feature.tags.bridge).map(clean),
  parks: features.filter((feature) => feature.tags.leisure === 'park').map(clean),
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(snapshot)}\n`);
console.log(`Wrote ${outputPath}: ${snapshot.buildings.length} buildings, ${snapshot.roads.length} roads, ${snapshot.paths.length} paths`);
