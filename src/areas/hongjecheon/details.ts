import type { AreaDetailConfig } from '../types';
import { HONGJECHEON_LANDMARKS } from './landmarks';
import { HONGJECHEON_PROP_RULES } from './prop-rules';

export const HONGJECHEON_DETAILS: AreaDetailConfig = {
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
    { featureId: 331765550, profile: 'vertical-wall', side: 'both', startFraction: 0, endFraction: 0.24, bankWidth: 2.2, bankHeight: 1.7, railing: true, materialPreset: 'old-concrete', dataOrigin: 'authored' },
    { featureId: 331765550, profile: 'concrete-slope', side: 'both', startFraction: 0.2, endFraction: 0.5, bankWidth: 4.6, bankHeight: 1.35, railing: true, materialPreset: 'light-concrete', dataOrigin: 'authored' },
    { featureId: 331765550, profile: 'stone-bank', side: 'both', startFraction: 0.47, endFraction: 0.76, bankWidth: 4.2, bankHeight: 1.15, railing: false, materialPreset: 'stone-bank', dataOrigin: 'authored' },
    { featureId: 331765550, profile: 'walkway-edge', side: 'both', startFraction: 0.73, endFraction: 1, bankWidth: 2.1, bankHeight: 0.45, railing: true, materialPreset: 'wet-edge', dataOrigin: 'authored' },
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
};
