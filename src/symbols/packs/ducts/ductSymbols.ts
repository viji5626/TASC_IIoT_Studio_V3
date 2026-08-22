import { SymbolMetadata } from '../../../types/symbol';
import { injectIndustrialDefs } from '../../shared/styles/industrialStyles';

/**
 * TASC IIoT Studio — Comprehensive HVAC Ductwork & Fittings Library
 * Full 3D Isometric & 2D Plan/Elevation Vector SVG definitions for all standard duct bends and transitions:
 * - Rectangular 90° Radius Elbows, Mitered Vane Bends, 45° Offsets, S-Bends, Concentric/Eccentric Reducers, Tees, Wyes
 * - Round Spiral 90° Gored Lobster-Back Elbows, 45° Bends, S-Curves, Conical Reducers, Saddle Tees
 */

export const DUCT_SYMBOLS: SymbolMetadata[] = [
  // =========================================================================
  // 1. RECTANGULAR DUCTWORK & BENDS (3D ISOMETRIC & 2D)
  // =========================================================================
  {
    id: 'ducts.rectangular.straight_spool.3d',
    name: 'Rectangular Duct 3D (Straight Spool with TDF Flanges)',
    sector: 'HVAC',
    category: 'Ductwork',
    subcategory: 'Straight Ducts',
    tags: ['hvac', 'duct', 'rectangular', 'straight', 'spool', 'galvanized', 'tdf flange', '3d', 'isometric'],
    styleVariant: '3d',
    defaultW: 200,
    defaultH: 120,
    viewBox: '0 0 200 120',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 20, y: 60, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet Flange', x: 180, y: 60, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Galvanized Sheet Metal Rectangular Duct Body -->
      <polygon points="30,30 170,30 185,50 45,50" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <polygon points="45,50 185,50 185,90 45,90" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <polygon points="30,30 45,50 45,90 30,70" fill="#64748b" stroke="#334155" stroke-width="1.5"/>

      <!-- Cross-Braking Stiffener Bead Creases -->
      <line x1="45" y1="50" x2="185" y2="90" stroke="#cbd5e1" stroke-width="1.2" opacity="0.6"/>
      <line x1="45" y1="90" x2="185" y2="50" stroke="#64748b" stroke-width="1.2" opacity="0.6"/>

      <!-- Inlet TDF Flange Frame -->
      <polygon points="26,26 34,26 49,46 49,94 41,94 26,74" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="25" y="45" width="20" height="45" fill="#0f172a" opacity="0.8"/>

      <!-- Outlet TDF Flange Frame -->
      <polygon points="166,26 174,26 189,46 189,94 181,94 166,74" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'ducts.rectangular.elbow_90_radius.3d',
    name: 'Rectangular Duct 3D (90° Smooth Radius Elbow)',
    sector: 'HVAC',
    category: 'Ductwork',
    subcategory: 'Elbows & Bends',
    tags: ['hvac', 'duct', 'bend', 'elbow', '90 degree', 'radius', 'rectangular', '3d', 'isometric'],
    styleVariant: '3d',
    defaultW: 180,
    defaultH: 180,
    viewBox: '0 0 180 180',
    anchorPoints: [
      { id: 'inlet', name: 'Vertical Bottom Inlet', x: 60, y: 165, type: 'duct', direction: 'bottom', flanged: true },
      { id: 'outlet', name: 'Horizontal Right Outlet', x: 165, y: 60, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Radius Outer Heel & Inner Throat Curved Duct -->
      <!-- Top Swept Curved Surface -->
      <path d="M 40 140 C 40 70, 70 40, 140 40 L 155 55 C 95 55, 65 85, 65 145 Z" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <!-- Front Outer Heel Facet -->
      <path d="M 40 140 C 40 70, 70 40, 140 40 L 140 75 C 75 75, 40 100, 40 165 Z" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <!-- Bottom/Inner Throat Depth Facet -->
      <path d="M 65 145 C 65 85, 95 55, 155 55 L 155 90 C 105 90, 65 115, 65 170 Z" fill="#64748b" stroke="#334155" stroke-width="1.5"/>

      <!-- Bottom Inlet Flanged Collar -->
      <rect x="35" y="160" width="35" height="12" rx="2" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="40" y="162" width="25" height="8" fill="#0f172a"/>

      <!-- Right Outlet Flanged Collar -->
      <rect x="150" y="35" width="12" height="45" rx="2" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="152" y="42" width="8" height="30" fill="#0f172a"/>
    </svg>`)
  },
  {
    id: 'ducts.rectangular.elbow_90_segmented_miter.3d',
    name: 'Rectangular Duct 3D (90° Segmented Mitered Elbow)',
    sector: 'HVAC',
    category: 'Ductwork',
    subcategory: 'Elbows & Bends',
    tags: ['hvac', 'duct', 'bend', 'segmented', 'mitered', 'turning vanes', '90 degree', '3d'],
    styleVariant: '3d',
    defaultW: 180,
    defaultH: 180,
    viewBox: '0 0 180 180',
    anchorPoints: [
      { id: 'inlet', name: 'Bottom Inlet', x: 60, y: 165, type: 'duct', direction: 'bottom', flanged: true },
      { id: 'outlet', name: 'Right Outlet', x: 165, y: 60, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <!-- 5-Segment Mitered Gored Elbow -->
      <!-- Segment 1 (Vertical) -->
      <polygon points="40,160 70,160 75,130 35,130" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <!-- Segment 2 (22.5°) -->
      <polygon points="35,130 75,130 90,95 45,90" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <!-- Segment 3 (45°) -->
      <polygon points="45,90 90,95 115,70 70,60" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <!-- Segment 4 (67.5°) -->
      <polygon points="70,60 115,70 140,55 105,40" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <!-- Segment 5 (Horizontal) -->
      <polygon points="105,40 140,55 160,55 160,35" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>

      <!-- Inlet Flange -->
      <rect x="32" y="160" width="45" height="10" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Outlet Flange -->
      <rect x="155" y="30" width="10" height="40" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'ducts.rectangular.offset_s_bend.3d',
    name: 'Rectangular Duct 3D (S-Bend / Offset Transition)',
    sector: 'HVAC',
    category: 'Ductwork',
    subcategory: 'Offsets & Transitions',
    tags: ['hvac', 'duct', 's bend', 'offset', 'jog', 'transition', '3d', 'isometric'],
    styleVariant: '3d',
    defaultW: 200,
    defaultH: 140,
    viewBox: '0 0 200 140',
    anchorPoints: [
      { id: 'inlet', name: 'Left Lower Inlet', x: 20, y: 95, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Right Upper Outlet', x: 180, y: 45, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Isometric S-Curve Offset Body -->
      <path d="M 25 80 C 70 80, 90 30, 140 30 L 175 30 L 175 60 L 140 60 C 90 60, 70 110, 25 110 Z" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <path d="M 25 65 C 70 65, 90 15, 140 15 L 175 15 L 175 30 L 140 30 C 90 30, 70 80, 25 80 Z" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>

      <!-- Lower Left Inlet Flange -->
      <rect x="15" y="65" width="12" height="48" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="17" y="70" width="8" height="38" fill="#0f172a"/>

      <!-- Upper Right Outlet Flange -->
      <rect x="172" y="15" width="12" height="48" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="174" y="20" width="8" height="38" fill="#0f172a"/>
    </svg>`)
  },
  {
    id: 'ducts.rectangular.reducer_concentric.3d',
    name: 'Rectangular Duct 3D (Concentric Reducer)',
    sector: 'HVAC',
    category: 'Ductwork',
    subcategory: 'Reducers & Transitions',
    tags: ['hvac', 'duct', 'reducer', 'concentric', 'transition', 'taper', '3d'],
    styleVariant: '3d',
    defaultW: 180,
    defaultH: 130,
    viewBox: '0 0 180 130',
    anchorPoints: [
      { id: 'large_end', name: 'Large Duct End', x: 20, y: 65, type: 'duct', direction: 'left', flanged: true },
      { id: 'small_end', name: 'Small Duct End', x: 160, y: 65, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 130" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Tapered Rectangular Reducer Body -->
      <polygon points="30,25 150,45 150,75 30,95" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <polygon points="30,15 150,35 150,45 30,25" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>

      <!-- Large Left Flange -->
      <rect x="18" y="15" width="14" height="85" rx="3" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="20" y="20" width="9" height="75" fill="#0f172a"/>

      <!-- Small Right Flange -->
      <rect x="148" y="35" width="12" height="50" rx="3" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="150" y="40" width="8" height="40" fill="#0f172a"/>
    </svg>`)
  },
  {
    id: 'ducts.rectangular.tee_radius_boot.3d',
    name: 'Rectangular Duct 3D (Radius Boot 90° Tee Branch)',
    sector: 'HVAC',
    category: 'Ductwork',
    subcategory: 'Tees & Branches',
    tags: ['hvac', 'duct', 'tee', 'branch', 'boot tee', 'radius heel', '3d'],
    styleVariant: '3d',
    defaultW: 200,
    defaultH: 180,
    viewBox: '0 0 200 180',
    anchorPoints: [
      { id: 'main_in', name: 'Main Run In', x: 20, y: 130, type: 'duct', direction: 'left', flanged: true },
      { id: 'main_out', name: 'Main Run Out', x: 180, y: 130, type: 'duct', direction: 'right', flanged: true },
      { id: 'branch', name: 'Top Branch Takeoff', x: 100, y: 20, type: 'duct', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
      <!-- Main Horizontal Trunk Body -->
      <polygon points="30,110 170,110 170,145 30,145" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <polygon points="30,95 170,95 170,110 30,110" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>

      <!-- Top Radius Boot Branch -->
      <path d="M 75 110 C 75 60, 80 40, 80 40 L 120 40 C 120 40, 125 60, 125 110 Z" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <polygon points="80,30 120,30 120,40 80,40" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>

      <!-- Flanges -->
      <rect x="18" y="95" width="12" height="55" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="170" y="95" width="12" height="55" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="75" y="20" width="50" height="12" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'ducts.rectangular.wye_pantleg.3d',
    name: 'Rectangular Duct 3D (Wye / Pantleg Splitter)',
    sector: 'HVAC',
    category: 'Ductwork',
    subcategory: 'Tees & Branches',
    tags: ['hvac', 'duct', 'wye', 'pantleg', 'splitter', 'bifurcated', '3d'],
    styleVariant: '3d',
    defaultW: 200,
    defaultH: 160,
    viewBox: '0 0 200 160',
    anchorPoints: [
      { id: 'inlet', name: 'Main Supply Trunk', x: 20, y: 80, type: 'duct', direction: 'left', flanged: true },
      { id: 'branch_upper', name: 'Upper Split Leg', x: 180, y: 40, type: 'duct', direction: 'right', flanged: true },
      { id: 'branch_lower', name: 'Lower Split Leg', x: 180, y: 120, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Pantleg Dual-Split Duct Body -->
      <polygon points="30,55 90,55 170,25 170,55 105,75 105,85 170,105 170,135 90,105 30,105" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <polygon points="30,40 90,40 170,10 170,25 90,55 30,55" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>

      <!-- Left Inlet Flange -->
      <rect x="18" y="40" width="12" height="68" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Upper Split Flange -->
      <rect x="170" y="10" width="12" height="48" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Lower Split Flange -->
      <rect x="170" y="95" width="12" height="48" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },

  // =========================================================================
  // 2. ROUND SPIRAL DUCTWORK & BENDS (3D ISOMETRIC & 2D)
  // =========================================================================
  {
    id: 'ducts.round.elbow_90_lobster_back.3d',
    name: 'Round Spiral Duct 3D (90° Gored Lobster-Back Elbow)',
    sector: 'HVAC',
    category: 'Ductwork',
    subcategory: 'Round Ducts',
    tags: ['hvac', 'duct', 'round duct', 'spiral', 'lobster back', 'gored elbow', '90 degree', '3d'],
    styleVariant: '3d',
    defaultW: 180,
    defaultH: 180,
    viewBox: '0 0 180 180',
    anchorPoints: [
      { id: 'inlet', name: 'Vertical Bottom Collar', x: 60, y: 165, type: 'duct', direction: 'bottom', flanged: true },
      { id: 'outlet', name: 'Horizontal Right Collar', x: 165, y: 60, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <!-- 5-Gore Segmented Round Lobster-Back Elbow with Metallic Shading -->
      <!-- Gore 1 -->
      <path d="M 40 160 L 80 160 L 85 130 L 40 130 Z" fill="url(#indSteelGradH)" stroke="#475569" stroke-width="1.5"/>
      <!-- Gore 2 -->
      <path d="M 40 130 L 85 130 L 105 95 L 55 90 Z" fill="url(#indSteelGradV)" stroke="#475569" stroke-width="1.5"/>
      <!-- Gore 3 -->
      <path d="M 55 90 L 105 95 L 130 70 L 80 55 Z" fill="url(#indSteelGradH)" stroke="#475569" stroke-width="1.5"/>
      <!-- Gore 4 -->
      <path d="M 80 55 L 130 70 L 150 50 L 115 35 Z" fill="url(#indSteelGradV)" stroke="#475569" stroke-width="1.5"/>
      <!-- Gore 5 -->
      <path d="M 115 35 L 150 50 L 160 50 L 160 40 Z" fill="url(#indSteelGradH)" stroke="#475569" stroke-width="1.5"/>

      <!-- Spiral Seam Helical Rings -->
      <path d="M 40 145 C 60 140, 70 140, 85 145" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.7"/>
      <path d="M 50 110 C 70 105, 85 105, 100 110" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.7"/>
      <path d="M 70 75 C 90 70, 105 70, 120 75" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.7"/>

      <!-- Bottom Mounting Wall Plate & Flange -->
      <rect x="30" y="160" width="60" height="12" rx="3" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="38" cy="166" r="2" fill="#f8fafc"/>
      <circle cx="82" cy="166" r="2" fill="#f8fafc"/>

      <!-- Top Right Wall Penetration Sleeve Plate -->
      <rect x="155" y="25" width="12" height="60" rx="3" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="161" cy="33" r="2" fill="#f8fafc"/>
      <circle cx="161" cy="77" r="2" fill="#f8fafc"/>
    </svg>`)
  },
  {
    id: 'ducts.round.elbow_45.3d',
    name: 'Round Spiral Duct 3D (45° Elbow)',
    sector: 'HVAC',
    category: 'Ductwork',
    subcategory: 'Round Ducts',
    tags: ['hvac', 'duct', 'round duct', '45 degree', 'elbow', 'spiral', '3d'],
    styleVariant: '3d',
    defaultW: 180,
    defaultH: 150,
    viewBox: '0 0 180 150',
    anchorPoints: [
      { id: 'inlet', name: 'Horizontal Inlet', x: 20, y: 100, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: '45° Angle Outlet', x: 155, y: 40, type: 'duct', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 150" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D 45° Angled Spiral Duct Pipe -->
      <path d="M 28 80 L 80 80 L 140 25 L 165 48 L 105 115 L 28 115 Z" fill="url(#indSteelGradV)" stroke="#475569" stroke-width="1.5"/>
      <ellipse cx="28" cy="97" rx="10" ry="18" fill="url(#indCastIronGrad)" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Spiral Seam Highlights -->
      <line x1="50" y1="80" x2="50" y2="115" stroke="#ffffff" stroke-width="1.2" opacity="0.6"/>
      <line x1="95" y1="65" x2="115" y2="95" stroke="#ffffff" stroke-width="1.2" opacity="0.6"/>

      <!-- Inlet Flange -->
      <rect x="18" y="75" width="10" height="45" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- 45° Angle Outlet Flange -->
      <polygon points="135,20 170,45 162,55 127,30" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'ducts.round.offset_s_curve.3d',
    name: 'Round Spiral Duct 3D (S-Curve Gooseneck Offset)',
    sector: 'HVAC',
    category: 'Ductwork',
    subcategory: 'Round Ducts',
    tags: ['hvac', 'duct', 'round duct', 's curve', 'gooseneck', 'offset', '3d'],
    styleVariant: '3d',
    defaultW: 200,
    defaultH: 150,
    viewBox: '0 0 200 150',
    anchorPoints: [
      { id: 'inlet', name: 'Lower Left Inlet', x: 20, y: 110, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Upper Right Outlet', x: 180, y: 40, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Continuous 3D S-Curve Gooseneck Pipe with Segment Lines -->
      <path d="M 25 95 C 75 95, 95 25, 145 25 L 175 25 L 175 55 L 145 55 C 95 55, 75 125, 25 125 Z" fill="url(#indSteelGradV)" stroke="#475569" stroke-width="1.5"/>
      
      <!-- Gored Joint Seams -->
      <path d="M 60 90 L 70 120" stroke="#ffffff" stroke-width="1.5" opacity="0.7"/>
      <path d="M 95 65 L 105 95" stroke="#ffffff" stroke-width="1.5" opacity="0.7"/>
      <path d="M 130 35 L 140 65" stroke="#ffffff" stroke-width="1.5" opacity="0.7"/>

      <!-- Left Inlet Collar -->
      <rect x="15" y="90" width="12" height="40" rx="3" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Right Outlet Collar -->
      <rect x="173" y="20" width="12" height="40" rx="3" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  }
];
