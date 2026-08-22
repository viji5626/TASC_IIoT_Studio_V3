import { SymbolMetadata } from '../../../types/symbol';
import { injectIndustrialDefs } from '../../shared/styles/industrialStyles';

/**
 * TASC IIoT Studio — Material Handling & FMCG Packaging Graphics Library
 * Complete 2D & 3D Vector SVG definitions for roller conveyors, packaging lines, cappers, fillers, and sorters.
 */

export const MATERIAL_HANDLING_SYMBOLS: SymbolMetadata[] = [
  // =========================================================================
  // 1. ROLLER CONVEYORS & SORTATION LINES
  // =========================================================================
  {
    id: 'mathand.conveyor.roller_live.flat2d',
    name: 'Motorized Roller Conveyor Bed',
    sector: 'Material Handling',
    category: 'Conveyors',
    subcategory: 'Roller Conveyors',
    tags: ['material handling', 'conveyor', 'roller', 'motorized', 'fmcg', 'logistics', 'warehouse', '2d'],
    styleVariant: 'flat2d',
    defaultW: 220,
    defaultH: 80,
    viewBox: '0 0 220 80',
    animationReady: true,
    animatableParts: ['rollers_group'],
    anchorPoints: [
      { id: 'inlet', name: 'Infeed', x: 0, y: 40, type: 'mechanical', direction: 'left' },
      { id: 'outlet', name: 'Outfeed', x: 220, y: 40, type: 'mechanical', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 220 80" xmlns="http://www.w3.org/2000/svg">
      <!-- Side Channel Guide Rails (Top & Bottom) -->
      <rect x="5" y="15" width="210" height="8" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="5" y="57" width="210" height="8" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Zinc Galvanized Rollers Array -->
      <g data-part-id="rollers_group" stroke="#0f172a" stroke-width="1.2">
        <rect x="20" y="12" width="10" height="56" rx="3" fill="#cbd5e1"/>
        <rect x="42" y="12" width="10" height="56" rx="3" fill="#cbd5e1"/>
        <rect x="64" y="12" width="10" height="56" rx="3" fill="#cbd5e1"/>
        <rect x="86" y="12" width="10" height="56" rx="3" fill="#cbd5e1"/>
        <rect x="108" y="12" width="10" height="56" rx="3" fill="#cbd5e1"/>
        <rect x="130" y="12" width="10" height="56" rx="3" fill="#cbd5e1"/>
        <rect x="152" y="12" width="10" height="56" rx="3" fill="#cbd5e1"/>
        <rect x="174" y="12" width="10" height="56" rx="3" fill="#cbd5e1"/>
        <rect x="196" y="12" width="10" height="56" rx="3" fill="#cbd5e1"/>
      </g>
    </svg>`)
  },
  {
    id: 'mathand.conveyor.roller_live.3d',
    name: 'Motorized Roller Conveyor 3D',
    sector: 'Material Handling',
    category: 'Conveyors',
    subcategory: 'Roller Conveyors',
    tags: ['material handling', 'conveyor', 'roller', '3d', 'distribution center', 'packaging'],
    styleVariant: '3d',
    defaultW: 240,
    defaultH: 90,
    viewBox: '0 0 240 90',
    anchorPoints: [
      { id: 'inlet', name: 'Infeed', x: 5, y: 45, type: 'mechanical', direction: 'left' },
      { id: 'outlet', name: 'Outfeed', x: 235, y: 45, type: 'mechanical', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="16" width="224" height="10" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <rect x="8" y="64" width="224" height="10" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <!-- Metallic Shaded Rollers -->
      <g stroke="#0f172a" stroke-width="1">
        <rect x="25" y="14" width="12" height="62" rx="3" fill="url(#indSteelGradV)"/>
        <rect x="50" y="14" width="12" height="62" rx="3" fill="url(#indSteelGradV)"/>
        <rect x="75" y="14" width="12" height="62" rx="3" fill="url(#indSteelGradV)"/>
        <rect x="100" y="14" width="12" height="62" rx="3" fill="url(#indSteelGradV)"/>
        <rect x="125" y="14" width="12" height="62" rx="3" fill="url(#indSteelGradV)"/>
        <rect x="150" y="14" width="12" height="62" rx="3" fill="url(#indSteelGradV)"/>
        <rect x="175" y="14" width="12" height="62" rx="3" fill="url(#indSteelGradV)"/>
        <rect x="200" y="14" width="12" height="62" rx="3" fill="url(#indSteelGradV)"/>
      </g>
    </svg>`)
  },

  // =========================================================================
  // 2. PACKAGING, CARTON HANDLERS & FILLING
  // =========================================================================
  {
    id: 'mathand.packaging.case_sealer.flat2d',
    name: 'Automatic Top & Bottom Case Sealer',
    sector: 'Material Handling',
    category: 'Packaging',
    subcategory: 'Case Sealers',
    tags: ['material handling', 'packaging', 'case sealer', 'taping', 'carton', 'fmcg', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 150,
    viewBox: '0 0 180 150',
    animationReady: true,
    animatableParts: ['tape_head'],
    anchorPoints: [
      { id: 'inlet', name: 'Carton Infeed', x: 0, y: 100, type: 'mechanical', direction: 'left' },
      { id: 'outlet', name: 'Carton Outfeed', x: 180, y: 100, type: 'mechanical', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Main Upright Mast Columns -->
      <rect x="20" y="20" width="14" height="110" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="146" y="20" width="14" height="110" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Top Bridge Crossbar -->
      <rect x="20" y="20" width="140" height="16" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Top Floating Tape Cartridge Head -->
      <g data-part-id="tape_head">
        <rect x="65" y="36" width="50" height="35" rx="3" fill="#eab308" stroke="#78350f" stroke-width="1.5"/>
        <circle cx="80" cy="53" r="8" fill="#f8fafc" stroke="#0f172a" stroke-width="1"/>
      </g>
      <!-- Side Drive Belts (Left & Right) -->
      <rect x="40" y="85" width="100" height="24" rx="2" fill="#0284c7" stroke="#0f172a" stroke-width="1.2"/>
      <!-- Bed Frame Stand -->
      <rect x="10" y="125" width="160" height="15" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'mathand.diverter.pneumatic_pusher.flat2d',
    name: 'Pneumatic Sortation Push Diverter',
    sector: 'Material Handling',
    category: 'Sortation',
    subcategory: 'Diverters & Pushers',
    tags: ['material handling', 'diverter', 'pusher', 'sortation', 'pneumatic', 'cylinder', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 100,
    viewBox: '0 0 160 100',
    animationReady: true,
    animatableParts: ['pusher_rod_face'],
    anchorPoints: [
      { id: 'air', name: 'Air Supply', x: 20, y: 50, type: 'pipe', direction: 'left' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
      <!-- Main Pneumatic Air Cylinder Barrel -->
      <rect x="15" y="35" width="75" height="30" rx="3" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <rect x="10" y="30" width="8" height="40" rx="1.5" fill="#475569"/>
      <rect x="85" y="30" width="8" height="40" rx="1.5" fill="#475569"/>
      <!-- Extending Chrome Rod & High-Density Polyurethane Pusher Paddle -->
      <g data-part-id="pusher_rod_face">
        <rect x="90" y="45" width="45" height="10" fill="#cbd5e1" stroke="#0f172a" stroke-width="1"/>
        <rect x="135" y="20" width="15" height="60" rx="3" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/>
      </g>
    </svg>`)
  },
  {
    id: 'mathand.filling.rotary_capper.flat2d',
    name: 'Monoblock Rotary Capper Station',
    sector: 'Material Handling',
    category: 'Filling & Capping',
    subcategory: 'Capping Machines',
    tags: ['material handling', 'bottling', 'beverage', 'capper', 'rotary', 'filler', 'monoblock', '2d'],
    styleVariant: 'flat2d',
    defaultW: 190,
    defaultH: 180,
    viewBox: '0 0 190 180',
    animationReady: true,
    animatableParts: ['starwheel', 'capping_heads'],
    anchorPoints: [
      { id: 'bottle_in', name: 'Bottle Infeed Starwheel', x: 20, y: 130, type: 'mechanical', direction: 'left' },
      { id: 'bottle_out', name: 'Bottle Outfeed Starwheel', x: 170, y: 130, type: 'mechanical', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 190 180" xmlns="http://www.w3.org/2000/svg">
      <!-- Stainless Steel Enclosure Base -->
      <rect x="20" y="130" width="150" height="40" rx="4" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- Central Rotating Carousel Turret -->
      <circle cx="95" cy="85" r="45" fill="#1e293b" stroke="#0284c7" stroke-width="2"/>
      <!-- Rotary Capping Spindle Heads Array -->
      <g data-part-id="capping_heads">
        <rect x="91" y="25" width="8" height="24" fill="#e2e8f0" stroke="#0f172a" stroke-width="1"/>
        <circle cx="95" cy="22" r="6" fill="#f59e0b"/>
        <rect x="135" y="60" width="24" height="8" fill="#e2e8f0" stroke="#0f172a" stroke-width="1"/>
        <circle cx="162" cy="64" r="6" fill="#f59e0b"/>
        <rect x="31" y="60" width="24" height="8" fill="#e2e8f0" stroke="#0f172a" stroke-width="1"/>
        <circle cx="28" cy="64" r="6" fill="#f59e0b"/>
      </g>
      <!-- Cap Feeder Chute Track -->
      <path d="M 140 15 L 110 35" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
    </svg>`)
  }
];
