import { SymbolMetadata } from '../../../types/symbol';
import { injectIndustrialDefs } from '../../shared/styles/industrialStyles';

/**
 * TASC IIoT Studio — Mining & Mineral Processing Graphics Library
 * Complete 2D & 3D Vector SVG definitions for crushers, feeders, screens, conveyors, and silos.
 */

export const MINING_SYMBOLS: SymbolMetadata[] = [
  // =========================================================================
  // 1. CRUSHERS (JAW, CONE, IMPACT, ROLL)
  // =========================================================================
  {
    id: 'mining.crusher.jaw.flat2d',
    name: 'Primary Heavy Duty Jaw Crusher',
    sector: 'Mining',
    category: 'Crushers',
    subcategory: 'Jaw Crushers',
    tags: ['mining', 'crusher', 'jaw', 'primary', 'rock', 'quarry', 'ore', '2d'],
    styleVariant: 'flat2d',
    defaultW: 190,
    defaultH: 170,
    viewBox: '0 0 190 170',
    animationReady: true,
    animatableParts: ['movable_jaw', 'flywheel'],
    anchorPoints: [
      { id: 'feed', name: 'Top Feed Chute', x: 95, y: 10, type: 'inlet', direction: 'top' },
      { id: 'discharge', name: 'Bottom Product Discharge', x: 95, y: 165, type: 'outlet', direction: 'bottom' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 190 170" xmlns="http://www.w3.org/2000/svg">
      <!-- Main Structural Steel Bed & Frame -->
      <polygon points="25,40 165,40 145,150 45,150" fill="#334155" stroke="#0f172a" stroke-width="2.5"/>
      <!-- Heavy Flywheel Wheel -->
      <g data-part-id="flywheel">
        <circle cx="45" cy="55" r="28" fill="#1e293b" stroke="#f59e0b" stroke-width="2.5"/>
        <circle cx="45" cy="55" r="8" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="45" y1="27" x2="45" y2="83" stroke="#f59e0b" stroke-width="2"/>
        <line x1="17" y1="55" x2="73" y2="55" stroke="#f59e0b" stroke-width="2"/>
      </g>
      <!-- Fixed Jaw Die Plate (Left) -->
      <path d="M 65 50 L 60 135 L 72 135 L 75 50 Z" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Movable Pitman Jaw Die Plate (Right - Oscillating) -->
      <g data-part-id="movable_jaw">
        <path d="M 125 50 L 85 135 L 97 135 L 135 50 Z" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5"/>
      </g>
      <!-- Feed Hopper Throat Flange -->
      <polygon points="45,10 145,10 135,40 55,40" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'mining.crusher.jaw.3d',
    name: 'Jaw Crusher 3D Mineral Plant',
    sector: 'Mining',
    category: 'Crushers',
    subcategory: 'Jaw Crushers',
    tags: ['mining', 'crusher', 'jaw', '3d', 'heavy machinery', 'quarry'],
    styleVariant: '3d',
    defaultW: 210,
    defaultH: 180,
    viewBox: '0 0 210 180',
    anchorPoints: [
      { id: 'feed', name: 'Feed Chute', x: 105, y: 8, type: 'inlet', direction: 'top' },
      { id: 'discharge', name: 'Discharge', x: 105, y: 172, type: 'outlet', direction: 'bottom' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 210 180" xmlns="http://www.w3.org/2000/svg">
      <polygon points="30,45 180,45 155,160 55,160" fill="url(#indCastIronGrad)" stroke="#0f172a" stroke-width="2" filter="url(#ind3dShadow)"/>
      <circle cx="50" cy="60" r="32" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="2"/>
      <circle cx="50" cy="60" r="10" fill="url(#indBrassGrad)"/>
      <polygon points="50,10 160,10 150,45 60,45" fill="url(#indSafetyYellowGrad)" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'mining.crusher.cone.flat2d',
    name: 'Secondary Hydraulic Cone Crusher',
    sector: 'Mining',
    category: 'Crushers',
    subcategory: 'Cone Crushers',
    tags: ['mining', 'crusher', 'cone', 'hydraulic', 'secondary', 'tertiary', 'ore', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 200,
    viewBox: '0 0 180 200',
    animationReady: true,
    animatableParts: ['mantle_cone'],
    anchorPoints: [
      { id: 'feed', name: 'Feed Hopper', x: 90, y: 10, type: 'inlet', direction: 'top' },
      { id: 'discharge', name: 'Discharge Hopper', x: 90, y: 190, type: 'outlet', direction: 'bottom' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Main Frame Base & Drive Shaft -->
      <rect x="25" y="145" width="130" height="40" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <!-- Outer Concave Bowl Liner Housing -->
      <path d="M 35 60 L 145 60 L 130 145 L 50 145 Z" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- Inner Oscillating Mantle Cone Head -->
      <g data-part-id="mantle_cone">
        <polygon points="90,70 120,135 60,135" fill="#f59e0b" stroke="#78350f" stroke-width="2"/>
      </g>
      <!-- Hydraulic Clamping Cylinders (Left & Right) -->
      <rect x="15" y="75" width="14" height="45" rx="2" fill="#0284c7" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="151" y="75" width="14" height="45" rx="2" fill="#0284c7" stroke="#0f172a" stroke-width="1.2"/>
      <!-- Top Feed Cone Hopper -->
      <polygon points="50,15 130,15 115,60 65,60" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },

  // =========================================================================
  // 2. CONVEYORS (BELT, INCLINE, OVERLAND, SCREW)
  // =========================================================================
  {
    id: 'mining.conveyor.belt.flat2d',
    name: 'Overland Troughed Belt Conveyor',
    sector: 'Mining',
    category: 'Conveyors',
    subcategory: 'Belt Conveyors',
    tags: ['mining', 'conveyor', 'belt', 'troughed', 'idler', 'pulley', 'bulk', '2d'],
    styleVariant: 'flat2d',
    defaultW: 240,
    defaultH: 90,
    viewBox: '0 0 240 90',
    animationReady: true,
    animatableParts: ['belt_drive', 'pulleys'],
    anchorPoints: [
      { id: 'tail', name: 'Tail Loading End', x: 25, y: 45, type: 'mechanical', direction: 'left' },
      { id: 'head', name: 'Head Discharge End', x: 215, y: 45, type: 'mechanical', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg">
      <!-- Structural Truss Frame Bed -->
      <line x1="25" y1="45" x2="215" y2="45" stroke="#475569" stroke-width="4"/>
      <!-- Troughed Carrying Idler Rollers -->
      <g stroke="#94a3b8" stroke-width="2">
        <line x1="60" y1="36" x2="60" y2="45"/>
        <line x1="95" y1="36" x2="95" y2="45"/>
        <line x1="130" y1="36" x2="130" y2="45"/>
        <line x1="165" y1="36" x2="165" y2="45"/>
      </g>
      <!-- Head & Tail Pulleys -->
      <g data-part-id="pulleys">
        <circle cx="30" cy="45" r="16" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
        <circle cx="30" cy="45" r="5" fill="#f8fafc"/>
        <circle cx="210" cy="45" r="16" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
        <circle cx="210" cy="45" r="5" fill="#f8fafc"/>
      </g>
      <!-- Continuous Rubber Belt Loop (Carrying & Return) -->
      <g data-part-id="belt_drive">
        <path d="M 30 29 L 210 29 A 16 16 0 0 1 210 61 L 30 61 A 16 16 0 0 1 30 29 Z" fill="none" stroke="#0f172a" stroke-width="4"/>
        <path d="M 30 29 L 210 29" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="8 4"/>
      </g>
    </svg>`)
  },
  {
    id: 'mining.conveyor.belt.3d',
    name: 'Belt Conveyor 3D Heavy Structure',
    sector: 'Mining',
    category: 'Conveyors',
    subcategory: 'Belt Conveyors',
    tags: ['mining', 'conveyor', 'belt', '3d', 'quarry', 'bulk material'],
    styleVariant: '3d',
    defaultW: 260,
    defaultH: 100,
    viewBox: '0 0 260 100',
    anchorPoints: [
      { id: 'tail', name: 'Tail Pulley', x: 25, y: 50, type: 'mechanical', direction: 'left' },
      { id: 'head', name: 'Head Pulley', x: 235, y: 50, type: 'mechanical', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="44" width="210" height="12" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <circle cx="30" cy="50" r="18" fill="url(#indCastIronGrad)" stroke="#0f172a" stroke-width="2"/>
      <circle cx="230" cy="50" r="18" fill="url(#indCastIronGrad)" stroke="#0f172a" stroke-width="2"/>
      <path d="M 30 32 L 230 32 A 18 18 0 0 1 230 68 L 30 68 A 18 18 0 0 1 30 32 Z" fill="none" stroke="#0f172a" stroke-width="5"/>
    </svg>`)
  },

  // =========================================================================
  // 3. VIBRATING SCREENS, FEEDERS & HOPPERS
  // =========================================================================
  {
    id: 'mining.screen.vibrating.flat2d',
    name: 'Multi-Deck Vibrating Sizing Screen',
    sector: 'Mining',
    category: 'Screens',
    subcategory: 'Vibrating Screens',
    tags: ['mining', 'screen', 'vibrating', 'sizing', 'deck', 'mesh', 'aggregate', '2d'],
    styleVariant: 'flat2d',
    defaultW: 200,
    defaultH: 140,
    viewBox: '0 0 200 140',
    animationReady: true,
    animatableParts: ['exciter_drive'],
    anchorPoints: [
      { id: 'feed', name: 'Top Feed Chute', x: 30, y: 15, type: 'inlet', direction: 'top' },
      { id: 'oversize', name: 'Oversize Discharge', x: 190, y: 55, type: 'outlet', direction: 'right' },
      { id: 'undersize', name: 'Undersize Hopper', x: 120, y: 135, type: 'outlet', direction: 'bottom' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">
      <!-- Inclined Screen Box Side Plate (15° Incline) -->
      <polygon points="20,25 180,55 170,115 10,85" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- Top Deck Screen Wire Mesh -->
      <line x1="25" y1="45" x2="175" y2="75" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="4 2"/>
      <!-- Bottom Deck Screen Wire Mesh -->
      <line x1="20" y1="70" x2="170" y2="100" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 2"/>
      <!-- Heavy Coil Isolation Springs -->
      <path d="M 30 85 L 25 125 M 155 110 L 150 135" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
      <!-- Eccentric Vibrator Exciter Pod -->
      <g data-part-id="exciter_drive">
        <circle cx="100" cy="50" r="16" fill="#0284c7" stroke="#f8fafc" stroke-width="2"/>
        <circle cx="100" cy="50" r="5" fill="#0f172a"/>
      </g>
    </svg>`)
  },
  {
    id: 'mining.feeder.apron.flat2d',
    name: 'Heavy Duty Apron Feeder',
    sector: 'Mining',
    category: 'Feeders',
    subcategory: 'Apron Feeders',
    tags: ['mining', 'feeder', 'apron', 'heavy', 'pans', 'hopper', 'quarry', '2d'],
    styleVariant: 'flat2d',
    defaultW: 200,
    defaultH: 110,
    viewBox: '0 0 200 110',
    anchorPoints: [
      { id: 'inlet', name: 'Hopper Discharge', x: 40, y: 15, type: 'inlet', direction: 'top' },
      { id: 'outlet', name: 'Crusher Feed Out', x: 190, y: 70, type: 'outlet', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="35" width="160" height="45" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <!-- Overlapping Steel Flight Pans -->
      <line x1="30" y1="35" x2="30" y2="80" stroke="#f59e0b" stroke-width="2.5"/>
      <line x1="50" y1="35" x2="50" y2="80" stroke="#f59e0b" stroke-width="2.5"/>
      <line x1="70" y1="35" x2="70" y2="80" stroke="#f59e0b" stroke-width="2.5"/>
      <line x1="90" y1="35" x2="90" y2="80" stroke="#f59e0b" stroke-width="2.5"/>
      <line x1="110" y1="35" x2="110" y2="80" stroke="#f59e0b" stroke-width="2.5"/>
      <line x1="130" y1="35" x2="130" y2="80" stroke="#f59e0b" stroke-width="2.5"/>
      <line x1="150" y1="35" x2="150" y2="80" stroke="#f59e0b" stroke-width="2.5"/>
      <line x1="170" y1="35" x2="170" y2="80" stroke="#f59e0b" stroke-width="2.5"/>
      <!-- Sprocket Drives (Left & Right) -->
      <circle cx="28" cy="57" r="14" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="172" cy="57" r="14" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  }
];
