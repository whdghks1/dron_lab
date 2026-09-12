import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/import-dem.mjs <N37E126.hgt.gz>');

const south = 37.5762;
const west = 126.9320;
const north = 37.5850;
const east = 126.9430;
const rows = 33;
const columns = 41;
const tileSouth = 37;
const tileWest = 126;
const tileSamples = 3601;
const intervals = tileSamples - 1;
const bytes = gunzipSync(readFileSync(inputPath));
if (bytes.length !== tileSamples * tileSamples * 2) throw new Error(`Unexpected HGT size: ${bytes.length}`);

function rawSample(row, column) {
  const safeRow = Math.max(0, Math.min(intervals, row));
  const safeColumn = Math.max(0, Math.min(intervals, column));
  const value = bytes.readInt16BE((safeRow * tileSamples + safeColumn) * 2);
  return value === -32768 ? 0 : value;
}

function elevation(lat, lon) {
  const row = (tileSouth + 1 - lat) * intervals;
  const column = (lon - tileWest) * intervals;
  const row0 = Math.floor(row);
  const column0 = Math.floor(column);
  const rowMix = row - row0;
  const columnMix = column - column0;
  const northWest = rawSample(row0, column0);
  const northEast = rawSample(row0, column0 + 1);
  const southWest = rawSample(row0 + 1, column0);
  const southEast = rawSample(row0 + 1, column0 + 1);
  const top = northWest + (northEast - northWest) * columnMix;
  const bottom = southWest + (southEast - southWest) * columnMix;
  return top + (bottom - top) * rowMix;
}

const values = [];
for (let row = 0; row < rows; row += 1) {
  const lat = north - row / (rows - 1) * (north - south);
  for (let column = 0; column < columns; column += 1) {
    const lon = west + column / (columns - 1) * (east - west);
    values.push(Number(elevation(lat, lon).toFixed(2)));
  }
}
const origin = { lat: 37.5813046, lon: 126.9378073 };
function gridElevation(lat, lon) {
  const column = (lon - west) / (east - west) * (columns - 1);
  const row = (north - lat) / (north - south) * (rows - 1);
  const column0 = Math.floor(column);
  const row0 = Math.floor(row);
  const xMix = column - column0;
  const zMix = row - row0;
  const at = (sampleRow, sampleColumn) => values[sampleRow * columns + sampleColumn];
  const top = at(row0, column0) + (at(row0, column0 + 1) - at(row0, column0)) * xMix;
  const bottom = at(row0 + 1, column0) + (at(row0 + 1, column0 + 1) - at(row0 + 1, column0)) * xMix;
  return top + (bottom - top) * zMix;
}
const output = {
  source: 'Mapzen Terrain Tiles / NASA SRTM-derived Skadi N37E126.hgt',
  sourceUrl: 'https://s3.amazonaws.com/elevation-tiles-prod/skadi/N37/N37E126.hgt.gz',
  capturedAt: new Date().toISOString(),
  bounds: { south, west, north, east },
  rows,
  columns,
  originElevation: Number(gridElevation(origin.lat, origin.lon).toFixed(2)),
  rawOriginElevation: Number(elevation(origin.lat, origin.lon).toFixed(2)),
  minElevation: Math.min(...values),
  maxElevation: Math.max(...values),
  values,
};
const outputPath = resolve('src/areas/hongjecheon/data/elevation.json');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output)}\n`);
console.log(`Wrote ${outputPath}: ${columns}x${rows}, ${output.minElevation}-${output.maxElevation} m, origin ${output.originElevation} m`);
