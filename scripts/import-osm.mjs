import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/import-osm.mjs <overpass.json>');
const raw = JSON.parse(readFileSync(inputPath, 'utf8'));
const outputPath = resolve('src/areas/hongjecheon/data/osm-snapshot.json');
const point = ({ lat, lon }) => ({ lat: Number(lat.toFixed(7)), lon: Number(lon.toFixed(7)) });
const numeric = (value) => Number.parseFloat(String(value ?? '').match(/-?\d+(?:\.\d+)?/)?.[0] ?? '');
const optionalNumber = (value) => {
  const result = numeric(value);
  return Number.isFinite(result) ? result : undefined;
};

function feature(id, geometry, tags = {}) {
  const levels = optionalNumber(tags['building:levels']);
  return {
    id,
    name: tags.name || undefined,
    kind: tags.highway || tags.waterway || tags.natural || tags.water || tags.building || tags.leisure || 'unknown',
    points: geometry.map(point),
    height: optionalNumber(tags.height) || (levels ? levels * 3.2 : undefined),
    levels,
    minHeight: optionalNumber(tags.min_height) || (optionalNumber(tags['building:min_level']) ? optionalNumber(tags['building:min_level']) * 3.2 : undefined),
    roofHeight: optionalNumber(tags['roof:height']),
    roofShape: tags['roof:shape'] || undefined,
    buildingMaterial: tags['building:material'] || undefined,
    facadeColor: tags['building:colour'] || undefined,
    roofColor: tags['roof:colour'] || undefined,
    tags,
  };
}

const featuresById = new Map();
raw.elements
  .filter((item) => item.type === 'way' && item.geometry?.length >= 2)
  .forEach((item) => featuresById.set(item.id, feature(item.id, item.geometry, item.tags)));

let relationBuildingParts = 0;
raw.elements
  .filter((item) => item.type === 'relation' && item.tags?.building)
  .flatMap((item) => (item.members ?? [])
    .filter((member) => member.type === 'way' && member.role === 'outer' && member.geometry?.length >= 4)
    .map((member) => feature(member.ref, member.geometry, item.tags)))
  .forEach((item) => {
    if (featuresById.has(item.id)) return;
    featuresById.set(item.id, item);
    relationBuildingParts += 1;
  });

const features = [...featuresById.values()];
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
console.log(`Wrote ${outputPath}: ${snapshot.buildings.length} buildings (${relationBuildingParts} relation parts), ${snapshot.roads.length} roads, ${snapshot.paths.length} paths`);
