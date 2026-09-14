import type { AreaDetailConfig } from '../types';
import { HONGJECHEON_LANDMARKS } from './landmarks';
import { HONGJECHEON_PROP_RULES } from './prop-rules';

export const HONGJECHEON_DETAILS: AreaDetailConfig = {
  // The 30 m SRTM samples pull the nearby Ansan hillside into the narrow
  // channel. This reference-aligned authored centreline keeps the wet corridor
  // on a continuous downstream grade and blends back to SRTM at both banks.
  terrainCorridors: [
    {
      id: 'hongjecheon-waterfall-channel',
      halfWidth: 9.2,
      blendWidth: 8.2,
      dataOrigin: 'authored',
      points: [
        { lat: 37.58258, lon: 126.93725, height: -4.35 },
        { lat: 37.58214, lon: 126.93738, height: -4.55 },
        { lat: 37.58190, lon: 126.93752, height: -4.7 },
        { lat: 37.58157, lon: 126.93765, height: -4.88 },
        { lat: 37.58130, lon: 126.93764, height: -5.02 },
        { lat: 37.58093, lon: 126.93741, height: -5.18 },
        { lat: 37.58067, lon: 126.93719, height: -5.32 },
        { lat: 37.58030, lon: 126.93665, height: -5.48 },
        { lat: 37.58003, lon: 126.93622, height: -5.6 },
        { lat: 37.57976, lon: 126.93574, height: -5.72 },
        { lat: 37.57955, lon: 126.93512, height: -5.82 },
      ],
    },
  ],
  bridgeOverrides: [
    { featureId: 203924737, deckWidth: 13.5, deckThickness: 1.35, deckClearance: 13, pierCount: 5, pierWidth: 1.35, railType: 'solid', materialPreset: 'old-concrete', dataOrigin: 'estimated' },
    { featureId: 1442862648, deckWidth: 13.5, deckThickness: 1.35, deckClearance: 14.2, pierCount: 5, pierWidth: 1.35, railType: 'solid', materialPreset: 'old-concrete', dataOrigin: 'estimated' },
    { featureId: 663494434, deckWidth: 10, deckThickness: 0.85, deckClearance: 4.6, pierCount: 2, pierWidth: 0.9, railType: 'metal', materialPreset: 'light-concrete', dataOrigin: 'estimated' },
    { featureId: 1004279085, deckWidth: 9, deckThickness: 0.8, deckClearance: 4.2, pierCount: 2, pierWidth: 0.8, railType: 'metal', materialPreset: 'light-concrete', dataOrigin: 'estimated' },
    { featureId: 1512633790, deckWidth: 9, deckThickness: 0.8, deckClearance: 4.2, pierCount: 2, pierWidth: 0.8, railType: 'metal', materialPreset: 'light-concrete', dataOrigin: 'estimated' },
    { featureId: 334288422, deckWidth: 3.4, deckThickness: 0.38, deckClearance: 3.4, pierCount: 1, pierWidth: 0.45, railType: 'metal', materialPreset: 'cycleway', dataOrigin: 'estimated' },
    { featureId: 762794335, deckWidth: 2.8, deckThickness: 0.32, deckClearance: 3.2, pierCount: 1, pierWidth: 0.38, railType: 'metal', materialPreset: 'paving-stone', dataOrigin: 'estimated' },
  ],
  riverbankSegments: [
    { featureId: 1214479819, profile: 'grass-slope', side: 'both', startFraction: 0.68, endFraction: 1, bankWidth: 5.5, bankHeight: 1.15, railing: false, materialPreset: 'grass-soil', dataOrigin: 'authored' },
    { featureId: 331765550, profile: 'vertical-wall', side: 'both', startFraction: 0, endFraction: 0.24, bankWidth: 2.6, bankHeight: 1.55, waterHalfWidth: 9.2, railing: true, materialPreset: 'old-concrete', dataOrigin: 'authored' },
    { featureId: 331765550, profile: 'concrete-slope', side: 'both', startFraction: 0.2, endFraction: 0.5, bankWidth: 4.8, bankHeight: 1.3, waterHalfWidth: 8.8, railing: true, materialPreset: 'light-concrete', dataOrigin: 'authored' },
    { featureId: 331765550, profile: 'stone-bank', side: 'both', startFraction: 0.47, endFraction: 0.76, bankWidth: 4.4, bankHeight: 1.1, waterHalfWidth: 8.4, railing: false, materialPreset: 'stone-bank', dataOrigin: 'authored' },
    { featureId: 331765550, profile: 'walkway-edge', side: 'both', startFraction: 0.73, endFraction: 1, bankWidth: 2.4, bankHeight: 0.45, waterHalfWidth: 8.2, railing: true, materialPreset: 'wet-edge', dataOrigin: 'authored' },
  ],
  riverbankAccesses: [
    { position: { lat: 37.580391, lon: 126.936445 }, width: 3.2, steps: 7, rotation: 0.95, dataOrigin: 'authored' },
    { position: { lat: 37.579322, lon: 126.933825 }, width: 3.4, steps: 8, rotation: 1.1, dataOrigin: 'authored' },
  ],
  propRules: HONGJECHEON_PROP_RULES,
  landmarks: HONGJECHEON_LANDMARKS,
  vegetation: {
    enabled: true,
    highDensityPerChunk: 18,
    exclusionRadiusFromPaths: 3.2,
    exclusionRadiusFromWater: 8.5,
    dataOrigin: 'authored',
  },
  attributions: [
    {
      name: 'Concrete',
      creator: 'Rob Tuytel / Poly Haven',
      sourceUrl: 'https://polyhaven.com/a/concrete',
      license: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    },
    {
      name: 'Stone Wall 05',
      creator: 'Charlotte Baglioni / Poly Haven',
      sourceUrl: 'https://polyhaven.com/a/stone_wall_05',
      license: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    },
  ],
};
