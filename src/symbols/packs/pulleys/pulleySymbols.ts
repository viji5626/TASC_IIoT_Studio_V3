import { SymbolMetadata } from '../../../types/symbol';
import { injectIndustrialDefs } from '../../shared/styles/industrialStyles';

/**
 * TASC IIoT Studio — Pulleys & Mechanical Drives Graphics Library
 * Complete 2D & 3D Vector SVG definitions for V-Belt Pulleys, Multi-Groove Sheaves, Timing Pulleys, Flat Belt Pulleys & Idlers.
 */

export const PULLEY_SYMBOLS: SymbolMetadata[] = [
  // =========================================================================
  // 1. V-BELT PULLEYS & MULTI-GROOVE SHEAVES
  // =========================================================================
  {
    id: 'pulleys.vbelt.single_groove.flat2d',
    name: 'Cast Iron Single Groove V-Pulley',
    sector: 'Power & Mechanical Drives',
    category: 'Pulleys & Sheaves',
    subcategory: 'V-Belt Pulleys',
    tags: ['pulley', 'sheave', 'v-belt', 'drive', 'transmission', 'motor', '2d'],
    styleVariant: 'flat2d',
    defaultW: 150,
    defaultH: 150,
    viewBox: '0 0 150 150',
    animationReady: true,
    animatableParts: ['pulley_wheel'],
    anchorPoints: [
      { id: 'center', name: 'Shaft Bore Center', x: 75, y: 75, type: 'mechanical', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
      <g data-part-id="pulley_wheel">
        <!-- Outer Rim with V-Groove Depth -->
        <circle cx="75" cy="75" r="65" fill="#334155" stroke="#0f172a" stroke-width="2.5"/>
        <circle cx="75" cy="75" r="56" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
        <!-- Spoke Cutouts (3-Spoke Classic Heavy Industrial Wheel) -->
        <path d="M 75 30 A 45 45 0 0 1 114 97 L 95 86 A 24 24 0 0 0 75 51 Z" fill="#0f172a"/>
        <path d="M 114 97 A 45 45 0 0 1 36 97 L 55 86 A 24 24 0 0 0 95 86 Z" fill="#0f172a"/>
        <path d="M 36 97 A 45 45 0 0 1 75 30 L 75 51 A 24 24 0 0 0 55 86 Z" fill="#0f172a"/>
        <!-- Center Heavy Hub & Taper-Lock Bushing -->
        <circle cx="75" cy="75" r="24" fill="#475569" stroke="#0f172a" stroke-width="2"/>
        <!-- Shaft Bore & Keyway -->
        <circle cx="75" cy="75" r="10" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
        <rect x="73" y="62" width="4" height="6" fill="#0f172a"/>
      </g>
    </svg>`)
  },
  {
    id: 'pulleys.vbelt.single_groove.3d',
    name: 'Cast Iron V-Pulley 3D Metallic',
    sector: 'Power & Mechanical Drives',
    category: 'Pulleys & Sheaves',
    subcategory: 'V-Belt Pulleys',
    tags: ['pulley', 'sheave', 'v-belt', '3d', 'metallic', 'cast iron', 'transmission'],
    styleVariant: '3d',
    defaultW: 160,
    defaultH: 160,
    viewBox: '0 0 160 160',
    anchorPoints: [
      { id: 'center', name: 'Shaft Center', x: 80, y: 80, type: 'mechanical', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="70" fill="url(#indCastIronGrad)" stroke="#0f172a" stroke-width="2" filter="url(#ind3dShadow)"/>
      <circle cx="80" cy="80" r="60" fill="url(#indSteelGradV)" stroke="#1e293b" stroke-width="1.5"/>
      <circle cx="80" cy="80" r="50" fill="url(#indCastIronGrad)"/>
      <!-- Spoke Relief 3D Grooves -->
      <circle cx="80" cy="80" r="28" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="2"/>
      <circle cx="80" cy="80" r="12" fill="url(#indBrassGrad)" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'pulleys.vbelt.multi_groove_sheave.flat2d',
    name: 'Multi-Groove V-Belt Sheave (4-Groove)',
    sector: 'Power & Mechanical Drives',
    category: 'Pulleys & Sheaves',
    subcategory: 'Multi-Groove Sheaves',
    tags: ['pulley', 'sheave', 'multi-groove', '4-groove', 'v-belt', 'heavy drive', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 130,
    viewBox: '0 0 180 130',
    anchorPoints: [
      { id: 'shaft', name: 'Shaft Bore', x: 90, y: 65, type: 'mechanical', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 130" xmlns="http://www.w3.org/2000/svg">
      <!-- Sectional Side View of 4-Groove Industrial Sheave -->
      <rect x="25" y="25" width="130" height="80" rx="3" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- 4 Precision Machined V-Grooves (Top & Bottom) -->
      <polygon points="35,25 45,45 55,25" fill="#0f172a"/>
      <polygon points="65,25 75,45 85,25" fill="#0f172a"/>
      <polygon points="95,25 105,45 115,25" fill="#0f172a"/>
      <polygon points="125,25 135,45 145,25" fill="#0f172a"/>
      <!-- Bottom Mirror Grooves -->
      <polygon points="35,105 45,85 55,105" fill="#0f172a"/>
      <polygon points="65,105 75,85 85,105" fill="#0f172a"/>
      <polygon points="95,105 105,85 115,105" fill="#0f172a"/>
      <polygon points="125,105 135,85 145,105" fill="#0f172a"/>
      <!-- Central Shaft Core -->
      <rect x="15" y="55" width="150" height="20" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },

  // =========================================================================
  // 2. TIMING BELT PULLEYS & SYNCHRONOUS DRIVES
  // =========================================================================
  {
    id: 'pulleys.timing.toothed_synchronous.flat2d',
    name: 'Toothed Timing Belt Pulley',
    sector: 'Power & Mechanical Drives',
    category: 'Pulleys & Sheaves',
    subcategory: 'Timing Pulleys',
    tags: ['pulley', 'timing', 'synchronous', 'toothed', 'htd', 'servo', 'stepper', '2d'],
    styleVariant: 'flat2d',
    defaultW: 150,
    defaultH: 150,
    viewBox: '0 0 150 150',
    animationReady: true,
    animatableParts: ['timing_teeth'],
    anchorPoints: [
      { id: 'center', name: 'Shaft Center', x: 75, y: 75, type: 'mechanical', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Side Retention Guide Flange -->
      <circle cx="75" cy="75" r="68" fill="#475569" stroke="#0f172a" stroke-width="2"/>
      <!-- Toothed Synchronous Pitch Circle -->
      <g data-part-id="timing_teeth">
        <circle cx="75" cy="75" r="60" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5" stroke-dasharray="6 4"/>
        <circle cx="75" cy="75" r="48" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
        <circle cx="75" cy="75" r="20" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
        <circle cx="75" cy="75" r="8" fill="#f8fafc"/>
      </g>
    </svg>`)
  },

  // =========================================================================
  // 3. FLAT BELT & CONVEYOR IDLER PULLEYS
  // =========================================================================
  {
    id: 'pulleys.flat.crowned_idler.flat2d',
    name: 'Crowned Flat Belt Idler Pulley',
    sector: 'Power & Mechanical Drives',
    category: 'Pulleys & Sheaves',
    subcategory: 'Idler Pulleys',
    tags: ['pulley', 'idler', 'flat belt', 'crowned', 'tensioner', 'conveyor', '2d'],
    styleVariant: 'flat2d',
    defaultW: 170,
    defaultH: 100,
    viewBox: '0 0 170 100',
    anchorPoints: [
      { id: 'left_bearing', name: 'Left Pillow Block', x: 15, y: 50, type: 'mechanical', direction: 'left' },
      { id: 'right_bearing', name: 'Right Pillow Block', x: 155, y: 50, type: 'mechanical', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 170 100" xmlns="http://www.w3.org/2000/svg">
      <!-- Crowned Barrel Cylinder (Tapered Profile for Self-Tracking) -->
      <path d="M 35 25 Q 85 18, 135 25 L 135 75 Q 85 82, 35 75 Z" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- Heavy Through Shaft -->
      <rect x="15" y="44" width="140" height="12" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.2"/>
      <!-- Sealed Ball Bearing Hubs (Left & Right) -->
      <rect x="25" y="32" width="10" height="36" rx="2" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
      <rect x="135" y="32" width="10" height="36" rx="2" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
    </svg>`)
  }
];
