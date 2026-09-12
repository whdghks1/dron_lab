import type { PropPlacementRule } from '../types';

export const HONGJECHEON_PROP_RULES: PropPlacementRule[] = [
  { targetFeatureId: 334288409, assetId: 'river-railing', spacing: 7.5, lateralOffset: 2.15, side: 'both', startOffset: 5, endOffset: 5, quality: ['low', 'medium', 'high'], dataOrigin: 'authored' },
  { targetFeatureId: 637854735, assetId: 'river-railing', spacing: 7.5, lateralOffset: 2.15, side: 'left', startOffset: 4, endOffset: 4, quality: ['low', 'medium', 'high'], dataOrigin: 'authored' },
  { targetFeatureId: 880989971, assetId: 'river-railing', spacing: 7.5, lateralOffset: 2.15, side: 'right', startOffset: 2, endOffset: 2, quality: ['low', 'medium', 'high'], dataOrigin: 'authored' },
  { targetKind: 'cycleway', assetId: 'street-lamp', spacing: 34, lateralOffset: 3.1, side: 'right', startOffset: 12, endOffset: 12, quality: ['medium', 'high'], dataOrigin: 'authored' },
  { targetFeatureId: 334288409, assetId: 'bench', spacing: 52, lateralOffset: 3.8, side: 'left', rotationOffset: Math.PI, startOffset: 18, endOffset: 18, quality: ['medium', 'high'], dataOrigin: 'authored' },
  { targetFeatureId: 880989971, assetId: 'trash-bin', spacing: 76, lateralOffset: 3.35, side: 'left', startOffset: 20, endOffset: 10, quality: ['high'], dataOrigin: 'authored' },
  { targetFeatureId: 880989971, assetId: 'bike-rack', spacing: 110, lateralOffset: 4.1, side: 'left', startOffset: 24, endOffset: 8, quality: ['high'], dataOrigin: 'authored' },
  { targetFeatureId: 669004546, assetId: 'information-sign', spacing: 65, lateralOffset: 2.6, side: 'right', startOffset: 4, endOffset: 4, quality: ['medium', 'high'], dataOrigin: 'authored' },
  { targetFeatureId: 669004547, assetId: 'bollard', spacing: 4.5, lateralOffset: 1.3, side: 'both', startOffset: 1, endOffset: 1, quality: ['low', 'medium', 'high'], dataOrigin: 'authored' },
];
