import { SymbolMetadata } from '../../../types/symbol';
import { LEGACY_RAW_SYMBOLS } from './legacyDefinitions';

/**
 * Maps existing 39 Symbol Factory 3.0 elements into the scalable SymbolMetadata format.
 * Preserves 100% backward compatibility for all existing screens and panel IDs.
 */
export const LEGACY_SYMBOLS: SymbolMetadata[] = LEGACY_RAW_SYMBOLS.map(item => {
  let sector = 'Process Equipment';
  let subcategory: string = item.category;

  if (item.category === 'valves') {
    sector = 'Valves';
    subcategory = 'Control & Isolation';
  } else if (item.category === 'tanks' || item.category === 'silos') {
    sector = 'Tanks & Vessels';
    subcategory = item.category === 'silos' ? 'Silos & Hoppers' : 'Storage Vessels';
  } else if (item.category === 'motors' || item.category === 'agitators') {
    sector = 'Motors & Drives';
    subcategory = item.category === 'agitators' ? 'Mixers & Agitators' : 'Electric Motors';
  } else if (item.category === 'pumps') {
    sector = 'Pumps';
    subcategory = 'Centrifugal & Positive Displacement';
  } else if (item.category === 'heat_exchangers') {
    sector = 'Process Heating & Cooling';
    subcategory = 'Heat Exchangers';
  } else if (item.category === 'sensors') {
    sector = 'Sensors & Instruments';
    subcategory = 'Transmitters & Gauges';
  }

  return {
    id: item.id,
    legacyId: item.id,
    name: item.name,
    sector: sector,
    category: item.category.charAt(0).toUpperCase() + item.category.slice(1).replace('_', ' '),
    subcategory: subcategory,
    tags: [...item.tags, item.id, 'legacy', 'factory30'],
    styleVariant: 'flat2d' as const,
    defaultW: item.defaultW,
    defaultH: item.defaultH,
    svgContent: item.svgContent,
    animationReady: true,
    anchorPoints: [
      { id: 'inlet', type: 'inlet', x: 20, y: Math.round(item.defaultH / 2), direction: 'left' },
      { id: 'outlet', type: 'outlet', x: Math.round(item.defaultW - 20), y: Math.round(item.defaultH / 2), direction: 'right' }
    ]
  };
});
