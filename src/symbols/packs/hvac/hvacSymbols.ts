import { SymbolMetadata } from '../../../types/symbol';
import { injectIndustrialDefs } from '../../shared/styles/industrialStyles';

/**
 * TASC IIoT Studio — HVAC / ASHRAE Production Graphics Library
 * Complete 2D & 3D Vector SVG definitions for industrial ventilation, ducting, AHUs, fans, dampers, and chillers.
 */

export const HVAC_SYMBOLS: SymbolMetadata[] = [
  // =========================================================================
  // 1. DUCTS — STRAIGHT, ROUND, RECTANGULAR & SEGMENTED
  // =========================================================================
  {
    id: 'hvac.duct.straight_h.flat2d',
    name: 'Straight Rectangular Duct (H)',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Straight Sections',
    tags: ['hvac', 'duct', 'straight', 'horizontal', 'rectangular', 'airflow', 'ventilation', 'ashrae', '2d'],
    styleVariant: 'flat2d',
    defaultW: 200,
    defaultH: 80,
    viewBox: '0 0 200 80',
    animationReady: true,
    animatableParts: ['airflow_arrows'],
    anchorPoints: [
      { id: 'inlet', name: 'Left Duct Connection', x: 0, y: 40, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Right Duct Connection', x: 200, y: 40, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
      <!-- Main Duct Body -->
      <rect x="10" y="15" width="180" height="50" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- Cross Reinforcement Stiffener Creases -->
      <line x1="10" y1="15" x2="190" y2="65" stroke="#475569" stroke-width="1.2" stroke-dasharray="6 4"/>
      <line x1="10" y1="65" x2="190" y2="15" stroke="#475569" stroke-width="1.2" stroke-dasharray="6 4"/>
      <!-- Left & Right Flanges -->
      <rect x="4" y="10" width="8" height="60" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="188" y="10" width="8" height="60" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Airflow Indicator Arrow -->
      <g data-part-id="airflow_arrows" opacity="0.85">
        <path d="M 80 40 L 110 40 M 105 32 L 115 40 L 105 48" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>`)
  },
  {
    id: 'hvac.duct.straight_h.3d',
    name: 'Straight Galvanized Duct 3D (H)',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Straight Sections',
    tags: ['hvac', 'duct', 'straight', 'horizontal', 'galvanized', '3d', 'sheet metal'],
    styleVariant: '3d',
    defaultW: 220,
    defaultH: 90,
    viewBox: '0 0 220 90',
    animationReady: true,
    animatableParts: ['airflow_stream'],
    anchorPoints: [
      { id: 'inlet', name: 'Left 3D Flange', x: 8, y: 45, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Right 3D Flange', x: 212, y: 45, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 220 90" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Shaded Galvanized Sheet Metal Body -->
      <rect x="12" y="18" width="196" height="54" rx="2" fill="url(#indDuctZincGrad)" stroke="#1e293b" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <!-- Top Metallic Highlight Rim -->
      <line x1="14" y1="20" x2="206" y2="20" stroke="#f8fafc" stroke-width="1.5" stroke-opacity="0.7"/>
      <!-- Sheet Metal Transverse Duct Seams / Cleats -->
      <line x1="65" y1="18" x2="65" y2="72" stroke="#0f172a" stroke-width="2"/>
      <line x1="67" y1="18" x2="67" y2="72" stroke="#f1f5f9" stroke-width="1" stroke-opacity="0.6"/>
      <line x1="125" y1="18" x2="125" y2="72" stroke="#0f172a" stroke-width="2"/>
      <line x1="127" y1="18" x2="127" y2="72" stroke="#f1f5f9" stroke-width="1" stroke-opacity="0.6"/>
      <line x1="180" y1="18" x2="180" y2="72" stroke="#0f172a" stroke-width="2"/>
      <line x1="182" y1="18" x2="182" y2="72" stroke="#f1f5f9" stroke-width="1" stroke-opacity="0.6"/>
      <!-- Left Heavy Angle Flange -->
      <rect x="6" y="12" width="10" height="66" rx="2" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="11" cy="22" r="2" fill="#0f172a"/>
      <circle cx="11" cy="45" r="2" fill="#0f172a"/>
      <circle cx="11" cy="68" r="2" fill="#0f172a"/>
      <!-- Right Heavy Angle Flange -->
      <rect x="204" y="12" width="10" height="66" rx="2" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="209" cy="22" r="2" fill="#0f172a"/>
      <circle cx="209" cy="45" r="2" fill="#0f172a"/>
      <circle cx="209" cy="68" r="2" fill="#0f172a"/>
    </svg>`)
  },
  {
    id: 'hvac.duct.straight_v.flat2d',
    name: 'Straight Vertical Duct (V)',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Straight Sections',
    tags: ['hvac', 'duct', 'vertical', 'straight', 'riser', '2d'],
    styleVariant: 'flat2d',
    defaultW: 80,
    defaultH: 200,
    viewBox: '0 0 80 200',
    anchorPoints: [
      { id: 'top', name: 'Top Connection', x: 40, y: 0, type: 'duct', direction: 'top', flanged: true },
      { id: 'bottom', name: 'Bottom Connection', x: 40, y: 200, type: 'duct', direction: 'bottom', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 80 200" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="10" width="50" height="180" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <line x1="15" y1="10" x2="65" y2="190" stroke="#475569" stroke-width="1" stroke-dasharray="6 4"/>
      <line x1="65" y1="10" x2="15" y2="190" stroke="#475569" stroke-width="1" stroke-dasharray="6 4"/>
      <rect x="10" y="4" width="60" height="8" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="10" y="188" width="60" height="8" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'hvac.duct.straight_v.3d',
    name: 'Straight Galvanized Duct 3D (V)',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Straight Sections',
    tags: ['hvac', 'duct', 'vertical', 'galvanized', '3d', 'riser'],
    styleVariant: '3d',
    defaultW: 90,
    defaultH: 220,
    viewBox: '0 0 90 220',
    anchorPoints: [
      { id: 'top', name: 'Top Flange', x: 45, y: 6, type: 'duct', direction: 'top', flanged: true },
      { id: 'bottom', name: 'Bottom Flange', x: 45, y: 214, type: 'duct', direction: 'bottom', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 90 220" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="12" width="54" height="196" fill="url(#indSteelGradV)" stroke="#1e293b" stroke-width="1.5"/>
      <line x1="18" y1="65" x2="72" y2="65" stroke="#0f172a" stroke-width="2"/>
      <line x1="18" y1="125" x2="72" y2="125" stroke="#0f172a" stroke-width="2"/>
      <line x1="18" y1="180" x2="72" y2="180" stroke="#0f172a" stroke-width="2"/>
      <rect x="12" y="6" width="66" height="10" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="12" y="204" width="66" height="10" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },

  // =========================================================================
  // 2. DUCT ELBOWS & BENDS (90°, 45°, RADIUS, SQUARE)
  // =========================================================================
  {
    id: 'hvac.duct.elbow90.flat2d',
    name: '90° Radius Duct Elbow',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Elbows & Bends',
    tags: ['hvac', 'duct', 'elbow', '90', 'radius', 'bend', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 140,
    viewBox: '0 0 140 140',
    anchorPoints: [
      { id: 'inlet', name: 'Left Connection', x: 0, y: 110, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Top Connection', x: 110, y: 0, type: 'duct', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer & Inner Bend Profile -->
      <path d="M 10 85 C 10 30, 30 10, 85 10 L 135 10 C 60 10, 10 60, 10 135 Z" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- Turning Vanes (Standard ASHRAE guide vanes) -->
      <path d="M 10 105 C 10 50, 50 10, 105 10" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 3"/>
      <path d="M 10 120 C 10 70, 70 10, 120 10" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 3"/>
      <!-- Connection Flanges -->
      <rect x="4" y="85" width="8" height="50" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="85" y="4" width="50" height="8" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'hvac.duct.elbow90.3d',
    name: '90° Duct Elbow 3D Metallic',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Elbows & Bends',
    tags: ['hvac', 'duct', 'elbow', '90', 'radius', '3d', 'metallic', 'galvanized'],
    styleVariant: '3d',
    defaultW: 150,
    defaultH: 150,
    viewBox: '0 0 150 150',
    anchorPoints: [
      { id: 'inlet', name: 'Bottom-Left Flange', x: 6, y: 118, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Top-Right Flange', x: 118, y: 6, type: 'duct', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Shaded Elbow Body -->
      <path d="M 12 90 C 12 35, 35 12, 90 12 L 144 12 C 65 12, 12 65, 12 144 Z" fill="url(#indDuctZincGrad)" stroke="#1e293b" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <!-- Curved Metallic Highlight Arc -->
      <path d="M 16 90 C 16 40, 40 16, 90 16" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.5"/>
      <!-- Turning Vane Stitches -->
      <path d="M 12 110 C 12 55, 55 12, 110 12" fill="none" stroke="#475569" stroke-width="1.5"/>
      <path d="M 12 128 C 12 70, 70 12, 128 12" fill="none" stroke="#475569" stroke-width="1.5"/>
      <!-- Heavy Flanges -->
      <rect x="6" y="90" width="10" height="54" rx="2" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="90" y="6" width="54" height="10" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },

  // =========================================================================
  // 3. DUCT TRANSITIONS, TEES & CROSSES
  // =========================================================================
  {
    id: 'hvac.duct.tee.flat2d',
    name: 'Duct Tee Branch (Equal)',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Branches & Junctions',
    tags: ['hvac', 'duct', 'tee', 'branch', 'junction', '3-way', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 140,
    viewBox: '0 0 160 140',
    anchorPoints: [
      { id: 'left', name: 'Left Main Connection', x: 0, y: 110, type: 'duct', direction: 'left', flanged: true },
      { id: 'right', name: 'Right Main Connection', x: 160, y: 110, type: 'duct', direction: 'right', flanged: true },
      { id: 'branch', name: 'Top Branch Connection', x: 80, y: 0, type: 'duct', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg">
      <path d="M 10 85 L 55 85 L 55 10 L 105 10 L 105 85 L 150 85 L 150 135 L 10 135 Z" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <rect x="4" y="85" width="8" height="50" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="148" y="85" width="8" height="50" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="55" y="4" width="50" height="8" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'hvac.duct.reducer.flat2d',
    name: 'Concentric Duct Reducer',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Transitions',
    tags: ['hvac', 'duct', 'reducer', 'transition', 'expander', 'concentric', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 100,
    viewBox: '0 0 140 100',
    anchorPoints: [
      { id: 'large', name: 'Large Side Inlet', x: 0, y: 50, type: 'duct', direction: 'left', flanged: true },
      { id: 'small', name: 'Small Side Outlet', x: 140, y: 50, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,15 130,30 130,70 10,85" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <rect x="4" y="10" width="8" height="80" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="128" y="25" width="8" height="50" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },

  // =========================================================================
  // 4. HVAC FANS & BLOWERS (AXIAL, CENTRIFUGAL, INLINE)
  // =========================================================================
  {
    id: 'hvac.fan.centrifugal_blower.flat2d',
    name: 'Centrifugal HVAC Supply Blower',
    sector: 'HVAC',
    category: 'Fans & Blowers',
    subcategory: 'Centrifugal Fans',
    tags: ['hvac', 'fan', 'blower', 'centrifugal', 'supply', 'exhaust', 'motor', '2d'],
    styleVariant: 'flat2d',
    defaultW: 170,
    defaultH: 150,
    viewBox: '0 0 170 150',
    animationReady: true,
    animatableParts: ['impeller_wheel'],
    anchorPoints: [
      { id: 'suction', name: 'Center Suction Eye', x: 72, y: 75, type: 'duct', direction: 'front' },
      { id: 'discharge', name: 'Horizontal Discharge Flange', x: 152, y: 32, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 170 150" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <g id="hvac-blower-blade-2d">
          <polygon points="72,42 67,65 72,65" fill="#38bdf8"/>
          <polygon points="72,42 72,65 77,65" fill="#0284c7"/>
          <line x1="72" y1="42" x2="72" y2="65" stroke="#ffffff" stroke-width="1"/>
        </g>
      </defs>

      <!-- Left Flanged Foot -->
      <polygon points="42,112 25,140 60,140 57,112" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="18" y="138" width="46" height="6" rx="1.5" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="25" cy="141" r="1.5" fill="#0f172a"/>
      <circle cx="57" cy="141" r="1.5" fill="#0f172a"/>

      <!-- Right Flanged Foot -->
      <polygon points="86,112 84,140 120,140 102,112" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="78" y="138" width="46" height="6" rx="1.5" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="85" cy="141" r="1.5" fill="#0f172a"/>
      <circle cx="117" cy="141" r="1.5" fill="#0f172a"/>

      <!-- Top-Right Horizontal Discharge Duct Nozzle (Industrial Green) -->
      <rect x="72" y="12" width="70" height="38" fill="#15803d" stroke="#166534" stroke-width="2"/>
      <rect x="72" y="14" width="65" height="4" fill="#4ade80" opacity="0.6"/>
      <rect x="72" y="44" width="65" height="4" fill="#14532d" opacity="0.8"/>
      
      <!-- Flange Collar -->
      <rect x="142" y="8" width="10" height="46" rx="2" fill="#166534" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="147" cy="16" r="1.5" fill="#0f172a"/>
      <circle cx="147" cy="31" r="1.5" fill="#0f172a"/>
      <circle cx="147" cy="46" r="1.5" fill="#0f172a"/>

      <!-- Heavy Circular Volute Torus Casing (Grey Metallic Shaded) -->
      <circle cx="72" cy="75" r="60" fill="#94a3b8" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="72" cy="75" r="58" fill="#cbd5e1"/>
      <circle cx="72" cy="75" r="50" fill="#94a3b8"/>
      <circle cx="72" cy="75" r="40" fill="#64748b" stroke="#0f172a" stroke-width="2"/>

      <!-- Rotating Squirrel Cage / 6-Blade 3D Tapered Impeller Wheel -->
      <g data-part-id="impeller_wheel">
        <circle cx="72" cy="75" r="35" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
        
        <use href="#hvac-blower-blade-2d"/>
        <use href="#hvac-blower-blade-2d" transform="rotate(60 72 75)"/>
        <use href="#hvac-blower-blade-2d" transform="rotate(120 72 75)"/>
        <use href="#hvac-blower-blade-2d" transform="rotate(180 72 75)"/>
        <use href="#hvac-blower-blade-2d" transform="rotate(240 72 75)"/>
        <use href="#hvac-blower-blade-2d" transform="rotate(300 72 75)"/>

        <!-- Center Hub & Pin -->
        <circle cx="72" cy="75" r="12" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5"/>
        <circle cx="72" cy="75" r="5" fill="#0f172a"/>
        <circle cx="72" cy="75" r="2" fill="#ffffff"/>
      </g>
    </svg>`)
  },
  {
    id: 'hvac.fan.centrifugal_blower.3d',
    name: 'Centrifugal HVAC Blower 3D',
    sector: 'HVAC',
    category: 'Fans & Blowers',
    subcategory: 'Centrifugal Fans',
    tags: ['hvac', 'fan', 'blower', 'centrifugal', '3d', 'industrial', 'metallic'],
    styleVariant: '3d',
    defaultW: 180,
    defaultH: 160,
    viewBox: '0 0 180 160',
    animationReady: true,
    animatableParts: ['impeller_wheel'],
    anchorPoints: [
      { id: 'suction', name: 'Suction Eye', x: 78, y: 80, type: 'duct', direction: 'front' },
      { id: 'discharge', name: 'Horizontal Exhaust Flange', x: 162, y: 34, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 160" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <g id="hvac-blower-blade-3d">
          <polygon points="78,44 73,69 78,69" fill="#f1f5f9"/>
          <polygon points="78,44 78,69 83,69" fill="#94a3b8"/>
          <line x1="78" y1="44" x2="78" y2="69" stroke="#ffffff" stroke-width="1"/>
        </g>
      </defs>

      <!-- 3D Flanged Mounting Feet with Shadow -->
      <polygon points="46,122 28,150 66,150 63,122" fill="url(#indCastIronGrad)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <rect x="20" y="148" width="50" height="7" rx="1.5" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="28" cy="151.5" r="1.5" fill="#0f172a"/>
      <circle cx="62" cy="151.5" r="1.5" fill="#0f172a"/>

      <polygon points="94,122 92,150 130,150 110,122" fill="url(#indCastIronGrad)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <rect x="86" y="148" width="50" height="7" rx="1.5" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="94" cy="151.5" r="1.5" fill="#0f172a"/>
      <circle cx="128" cy="151.5" r="1.5" fill="#0f172a"/>

      <!-- 3D Horizontal Exhaust in Green -->
      <rect x="78" y="14" width="75" height="40" fill="#15803d" stroke="#166534" stroke-width="2" filter="url(#ind3dShadow)"/>
      <rect x="78" y="16" width="70" height="4" fill="#4ade80" opacity="0.7"/>
      <rect x="78" y="48" width="70" height="4" fill="#14532d" opacity="0.9"/>
      
      <!-- Metallic Flange Collar -->
      <rect x="153" y="9" width="12" height="50" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="159" cy="17" r="1.8" fill="#0f172a"/>
      <circle cx="159" cy="34" r="1.8" fill="#0f172a"/>
      <circle cx="159" cy="51" r="1.8" fill="#0f172a"/>

      <!-- 3D Shaded Metallic Torus Volute Scroll -->
      <circle cx="78" cy="80" r="64" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="2.5" filter="url(#ind3dShadow)"/>
      <circle cx="78" cy="80" r="54" fill="url(#indCastIronGrad)"/>
      <circle cx="78" cy="80" r="44" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="2"/>

      <!-- Impeller 3D Rotating Runner -->
      <g data-part-id="impeller_wheel">
        <circle cx="78" cy="80" r="38" fill="#090d16" stroke="#1e293b" stroke-width="1.5"/>
        
        <use href="#hvac-blower-blade-3d"/>
        <use href="#hvac-blower-blade-3d" transform="rotate(60 78 80)"/>
        <use href="#hvac-blower-blade-3d" transform="rotate(120 78 80)"/>
        <use href="#hvac-blower-blade-3d" transform="rotate(180 78 80)"/>
        <use href="#hvac-blower-blade-3d" transform="rotate(240 78 80)"/>
        <use href="#hvac-blower-blade-3d" transform="rotate(300 78 80)"/>

        <!-- Central Brass Hub -->
        <circle cx="78" cy="80" r="13" fill="url(#indBrassGrad)" stroke="#0f172a" stroke-width="1.5"/>
        <circle cx="78" cy="80" r="6" fill="#334155" stroke="#0f172a" stroke-width="1"/>
        <circle cx="78" cy="80" r="2.5" fill="#f8fafc"/>
      </g>
    </svg>`)
  },
  {
    id: 'hvac.fan.axial_inline.flat2d',
    name: 'Inline Axial Duct Fan',
    sector: 'HVAC',
    category: 'Fans & Blowers',
    subcategory: 'Axial Fans',
    tags: ['hvac', 'fan', 'axial', 'inline', 'duct', 'exhaust', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 100,
    viewBox: '0 0 160 100',
    animationReady: true,
    animatableParts: ['fan_blades'],
    anchorPoints: [
      { id: 'inlet', name: 'Duct Inlet', x: 6, y: 50, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Duct Outlet', x: 154, y: 50, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
      <!-- Cylindrical Housing Tube -->
      <rect x="14" y="20" width="132" height="60" rx="2" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <rect x="6" y="14" width="8" height="72" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="10" cy="22" r="1.5" fill="#0f172a"/>
      <circle cx="10" cy="50" r="1.5" fill="#0f172a"/>
      <circle cx="10" cy="78" r="1.5" fill="#0f172a"/>

      <rect x="146" y="14" width="8" height="72" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="150" cy="22" r="1.5" fill="#0f172a"/>
      <circle cx="150" cy="50" r="1.5" fill="#0f172a"/>
      <circle cx="150" cy="78" r="1.5" fill="#0f172a"/>

      <!-- Center Motor Nacelle Pod -->
      <path d="M 45 50 C 45 38, 65 38, 110 38 L 110 62 C 65 62, 45 62, 45 50 Z" fill="#1e293b" stroke="#0284c7" stroke-width="1.5"/>
      
      <!-- Rotating Axial Blades -->
      <g data-part-id="fan_blades">
        <path d="M 70 38 L 60 20 L 80 20 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 70 62 L 60 80 L 80 80 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <line x1="70" y1="20" x2="70" y2="80" stroke="#38bdf8" stroke-width="2.5"/>
        <circle cx="70" cy="50" r="10" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
      </g>
    </svg>`)
  },

  // =========================================================================
  // 5. HVAC DAMPERS (VCD, FIRE, MOTORIZED)
  // =========================================================================
  {
    id: 'hvac.damper.vcd.flat2d',
    name: 'Volume Control Damper (VCD)',
    sector: 'HVAC',
    category: 'Dampers',
    subcategory: 'Volume Control',
    tags: ['hvac', 'damper', 'vcd', 'volume', 'blades', 'airflow', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 100,
    viewBox: '0 0 140 100',
    animationReady: true,
    animatableParts: ['damper_blades', 'actuator_lever'],
    anchorPoints: [
      { id: 'inlet', name: 'Duct Inlet', x: 0, y: 50, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Duct Outlet', x: 140, y: 50, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="120" height="60" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <rect x="4" y="15" width="8" height="70" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="128" y="15" width="8" height="70" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Multi-Leaf Louver Blades (Pivoting) -->
      <g data-part-id="damper_blades">
        <line x1="35" y1="35" x2="65" y2="35" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <line x1="75" y1="35" x2="105" y2="35" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <line x1="35" y1="65" x2="65" y2="65" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <line x1="75" y1="65" x2="105" y2="65" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
      </g>
      <!-- Top Manual / Motor Quadrant Lever -->
      <g data-part-id="actuator_lever">
        <rect x="60" y="6" width="20" height="14" rx="2" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
      </g>
    </svg>`)
  },
  {
    id: 'hvac.damper.motorized_fire.flat2d',
    name: 'Motorized Fire & Smoke Damper',
    sector: 'HVAC',
    category: 'Dampers',
    subcategory: 'Fire & Smoke',
    tags: ['hvac', 'damper', 'fire', 'smoke', 'motorized', 'actuator', 'safety', '2d'],
    styleVariant: 'flat2d',
    defaultW: 150,
    defaultH: 110,
    viewBox: '0 0 150 110',
    animationReady: true,
    animatableParts: ['fire_blades', 'spring_actuator'],
    anchorPoints: [
      { id: 'inlet', name: 'Inlet', x: 0, y: 60, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet', x: 150, y: 60, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 150 110" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="30" width="120" height="60" fill="#1e293b" stroke="#dc2626" stroke-width="2.5"/>
      <rect x="8" y="25" width="9" height="70" rx="1.5" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5"/>
      <rect x="133" y="25" width="9" height="70" rx="1.5" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.5"/>
      <!-- Heavy Fire Insulated Blades -->
      <g data-part-id="fire_blades">
        <line x1="40" y1="48" x2="110" y2="48" stroke="#f87171" stroke-width="4" stroke-linecap="round"/>
        <line x1="40" y1="72" x2="110" y2="72" stroke="#f87171" stroke-width="4" stroke-linecap="round"/>
      </g>
      <!-- Belimo 24V Spring Return Actuator Enclosure -->
      <g data-part-id="spring_actuator">
        <rect x="55" y="6" width="40" height="24" rx="3" fill="#ea580c" stroke="#0f172a" stroke-width="1.5"/>
        <text x="75" y="22" font-size="8" fill="#ffffff" font-weight="bold" text-anchor="middle">FIRE</text>
      </g>
    </svg>`)
  },

  // =========================================================================
  // 6. AIR HANDLING UNITS (AHU) & SECTIONAL MODULES
  // =========================================================================
  {
    id: 'hvac.ahu.complete_system.flat2d',
    name: 'Modular Air Handling Unit (AHU)',
    sector: 'HVAC',
    category: 'Air Handling Units',
    subcategory: 'Complete AHU',
    tags: ['hvac', 'ahu', 'air handling unit', 'filter', 'cooling coil', 'heating coil', 'fan', 'mixing', '2d'],
    styleVariant: 'flat2d',
    defaultW: 280,
    defaultH: 140,
    viewBox: '0 0 280 140',
    animationReady: true,
    animatableParts: ['supply_fan', 'cooling_coil', 'filters'],
    anchorPoints: [
      { id: 'fresh_air', name: 'Fresh Air Intake', x: 0, y: 70, type: 'duct', direction: 'left', flanged: true },
      { id: 'supply_air', name: 'Supply Air Discharge', x: 280, y: 70, type: 'duct', direction: 'right', flanged: true },
      { id: 'chw_supply', name: 'Chilled Water Supply', x: 120, y: 140, type: 'pipe', direction: 'bottom' },
      { id: 'chw_return', name: 'Chilled Water Return', x: 140, y: 140, type: 'pipe', direction: 'bottom' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 280 140" xmlns="http://www.w3.org/2000/svg">
      <!-- Main AHU Outer Double-Wall Insulated Casing -->
      <rect x="10" y="15" width="260" height="110" rx="4" fill="#1e293b" stroke="#0f172a" stroke-width="2.5"/>
      <!-- Section 1: Pre-Filter & Bag Filter Section -->
      <rect x="20" y="25" width="40" height="90" fill="#334155" stroke="#64748b" stroke-width="1.2"/>
      <line x1="30" y1="25" x2="30" y2="115" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="4 2"/>
      <line x1="45" y1="25" x2="45" y2="115" stroke="#94a3b8" stroke-width="3" stroke-dasharray="8 4"/>
      <!-- Section 2: Cooling Coil (Chilled Water DX) -->
      <rect x="75" y="25" width="50" height="90" fill="#0c4a6e" stroke="#0284c7" stroke-width="1.5"/>
      <path d="M 85 25 L 85 115 M 95 25 L 95 115 M 105 25 L 105 115 M 115 25 L 115 115" stroke="#38bdf8" stroke-width="2"/>
      <!-- Section 3: Heating Coil / Reheat -->
      <rect x="135" y="25" width="40" height="90" fill="#450a0a" stroke="#ef4444" stroke-width="1.5"/>
      <path d="M 145 25 L 145 115 M 155 25 L 155 115 M 165 25 L 165 115" stroke="#f87171" stroke-width="2"/>
      <!-- Section 4: Centrifugal Supply Fan & Motor -->
      <rect x="185" y="25" width="75" height="90" fill="#0f172a" stroke="#64748b" stroke-width="1.2"/>
      <g data-part-id="supply_fan">
        <circle cx="225" cy="70" r="28" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
        <circle cx="225" cy="70" r="8" fill="#f8fafc"/>
      </g>
    </svg>`)
  },
  {
    id: 'hvac.ahu.complete_system.3d',
    name: 'Modular AHU 3D Plant Model',
    sector: 'HVAC',
    category: 'Air Handling Units',
    subcategory: 'Complete AHU',
    tags: ['hvac', 'ahu', 'air handling unit', '3d', 'plant overview', 'filtration'],
    styleVariant: '3d',
    defaultW: 300,
    defaultH: 150,
    viewBox: '0 0 300 150',
    animationReady: true,
    animatableParts: ['supply_fan', 'filters'],
    anchorPoints: [
      { id: 'fresh_air', name: 'Intake', x: 8, y: 75, type: 'duct', direction: 'left', flanged: true },
      { id: 'supply_air', name: 'Discharge', x: 292, y: 75, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Insulated Double Wall Enclosure -->
      <rect x="12" y="15" width="276" height="120" rx="5" fill="url(#indDuctZincGrad)" stroke="#0f172a" stroke-width="2" filter="url(#ind3dShadow)"/>
      <!-- Access Inspection Doors with Chrome Handles -->
      <rect x="25" y="28" width="55" height="95" rx="3" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
      <circle cx="70" cy="75" r="3" fill="#cbd5e1"/>
      <rect x="90" y="28" width="85" height="95" rx="3" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
      <circle cx="165" cy="75" r="3" fill="#cbd5e1"/>
      <rect x="185" y="28" width="90" height="95" rx="3" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
      <circle cx="265" cy="75" r="3" fill="#cbd5e1"/>
      <!-- Fan Sight Glass Port -->
      <circle cx="230" cy="75" r="22" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="230" cy="75" r="16" fill="url(#indMachineBlueGrad)"/>
    </svg>`)
  },

  // =========================================================================
  // 7. AIR DISTRIBUTION, DIFFUSERS, LOUVERS & TERMINALS (VAV, FCU)
  // =========================================================================
  {
    id: 'hvac.terminal.diffuser_4way.flat2d',
    name: '4-Way Ceiling Supply Diffuser',
    sector: 'HVAC',
    category: 'Air Distribution',
    subcategory: 'Diffusers & Grilles',
    tags: ['hvac', 'diffuser', 'supply', 'ceiling', '4-way', 'grille', '2d'],
    styleVariant: 'flat2d',
    defaultW: 120,
    defaultH: 120,
    viewBox: '0 0 120 120',
    anchorPoints: [
      { id: 'neck', name: 'Top Duct Neck', x: 60, y: 60, type: 'duct', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="100" height="100" fill="#f8fafc" stroke="#0f172a" stroke-width="2"/>
      <!-- Concentric Diffuser Cones -->
      <rect x="22" y="22" width="76" height="76" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>
      <rect x="36" y="36" width="48" height="48" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <rect x="50" y="50" width="20" height="20" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'hvac.terminal.vav_box.flat2d',
    name: 'VAV Terminal Box with Reheat',
    sector: 'HVAC',
    category: 'Air Distribution',
    subcategory: 'Terminal Units',
    tags: ['hvac', 'vav', 'vav box', 'variable air volume', 'terminal', 'reheat', 'damper', 'controller', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 110,
    viewBox: '0 0 180 110',
    animationReady: true,
    animatableParts: ['modulating_damper'],
    anchorPoints: [
      { id: 'inlet', name: 'Primary Air Inlet', x: 0, y: 55, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Discharge to Room', x: 180, y: 55, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 110" xmlns="http://www.w3.org/2000/svg">
      <!-- VAV Casing -->
      <rect x="15" y="20" width="150" height="70" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <rect x="8" y="15" width="8" height="80" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="164" y="15" width="8" height="80" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <!-- DDC / BACnet Controller Box -->
      <rect x="40" y="6" width="45" height="18" rx="2" fill="#0f172a" stroke="#10b981" stroke-width="1.2"/>
      <circle cx="50" cy="15" r="2.5" fill="#10b981"/>
      <text x="65" y="18" font-size="7" fill="#f8fafc" font-family="monospace">BACnet</text>
      <!-- Electric / Water Reheat Coil -->
      <path d="M 120 25 L 120 85 M 130 25 L 130 85 M 140 25 L 140 85" stroke="#ef4444" stroke-width="2"/>
    </svg>`)
  },
  {
    id: 'hvac.terminal.fcu.flat2d',
    name: 'Ceiling Concealed Fan Coil Unit (FCU)',
    sector: 'HVAC',
    category: 'Air Distribution',
    subcategory: 'Terminal Units',
    tags: ['hvac', 'fcu', 'fan coil unit', 'chilled water', 'blower', 'ceiling', '2d'],
    styleVariant: 'flat2d',
    defaultW: 190,
    defaultH: 110,
    viewBox: '0 0 190 110',
    anchorPoints: [
      { id: 'return', name: 'Return Air Inlet', x: 0, y: 55, type: 'duct', direction: 'left' },
      { id: 'supply', name: 'Supply Air Outlet', x: 190, y: 55, type: 'duct', direction: 'right' },
      { id: 'drain', name: 'Condensate Drain', x: 150, y: 110, type: 'drain', direction: 'bottom' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 190 110" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="20" width="160" height="70" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <rect x="25" y="28" width="45" height="54" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>
      <rect x="80" y="28" width="35" height="54" fill="#0c4a6e" stroke="#0284c7" stroke-width="1.2"/>
      <rect x="125" y="28" width="40" height="54" fill="#334155" stroke="#64748b" stroke-width="1"/>
    </svg>`)
  },

  // =========================================================================
  // 8. HVAC CHILLERS & PROCESS INTERFACES
  // =========================================================================
  {
    id: 'hvac.chiller.centrifugal_water_cooled.flat2d',
    name: 'Water-Cooled Centrifugal Chiller',
    sector: 'HVAC',
    category: 'Process Cooling',
    subcategory: 'Chillers',
    tags: ['hvac', 'chiller', 'centrifugal', 'evaporator', 'condenser', 'compressor', 'cooling', '2d'],
    styleVariant: 'flat2d',
    defaultW: 240,
    defaultH: 160,
    viewBox: '0 0 240 160',
    animationReady: true,
    animatableParts: ['compressor_status'],
    anchorPoints: [
      { id: 'chws', name: 'Chilled Water Supply', x: 20, y: 120, type: 'pipe', direction: 'left', flanged: true },
      { id: 'chwr', name: 'Chilled Water Return', x: 220, y: 120, type: 'pipe', direction: 'right', flanged: true },
      { id: 'cws', name: 'Condenser Water Supply', x: 20, y: 40, type: 'pipe', direction: 'left', flanged: true },
      { id: 'cwr', name: 'Condenser Water Return', x: 220, y: 40, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg">
      <!-- Base Frame Skid -->
      <rect x="15" y="140" width="210" height="15" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Lower Shell: Evaporator (Chilled Water) -->
      <rect x="30" y="95" width="180" height="45" rx="10" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <text x="120" y="122" font-size="10" fill="#ffffff" font-weight="bold" text-anchor="middle">EVAPORATOR</text>
      <!-- Upper Shell: Condenser (Tower Water) -->
      <rect x="30" y="25" width="180" height="45" rx="10" fill="#059669" stroke="#0f172a" stroke-width="2"/>
      <text x="120" y="52" font-size="10" fill="#ffffff" font-weight="bold" text-anchor="middle">CONDENSER</text>
      <!-- Top Center Compressor Head -->
      <g data-part-id="compressor_status">
        <circle cx="120" cy="50" r="26" fill="#334155" stroke="#f8fafc" stroke-width="2"/>
        <rect x="105" y="10" width="30" height="20" rx="3" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
      </g>
    </svg>`)
  },
  {
    id: 'hvac.chiller.centrifugal_water_cooled.3d',
    name: 'Centrifugal Chiller 3D Plant Model',
    sector: 'HVAC',
    category: 'Process Cooling',
    subcategory: 'Chillers',
    tags: ['hvac', 'chiller', 'centrifugal', '3d', 'plant overview', 'cooling plant'],
    styleVariant: '3d',
    defaultW: 260,
    defaultH: 170,
    viewBox: '0 0 260 170',
    anchorPoints: [
      { id: 'chws', name: 'CHWS', x: 20, y: 125, type: 'pipe', direction: 'left', flanged: true },
      { id: 'chwr', name: 'CHWR', x: 240, y: 125, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 260 170" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="145" width="230" height="18" rx="4" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <rect x="25" y="98" width="210" height="48" rx="12" fill="url(#indMachineBlueGrad)" stroke="#0f172a" stroke-width="2"/>
      <rect x="25" y="28" width="210" height="48" rx="12" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="2"/>
      <circle cx="130" cy="55" r="28" fill="url(#indCastIronGrad)" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="130" cy="55" r="10" fill="url(#indBrassGrad)"/>
    </svg>`)
  },

  // =========================================================================
  // 9. DUCTING ACCESSORIES, SILENCERS & EXHAUST STACKS
  // =========================================================================
  {
    id: 'hvac.duct.silencer_attenuator.flat2d',
    name: 'Rectangular Duct Sound Attenuator / Silencer',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Duct Accessories',
    tags: ['hvac', 'duct', 'silencer', 'attenuator', 'acoustic', 'baffles', 'sound', 'noise', '2d'],
    styleVariant: 'flat2d',
    defaultW: 220,
    defaultH: 90,
    viewBox: '0 0 220 90',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 0, y: 45, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet Flange', x: 220, y: 45, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 220 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="15" width="200" height="60" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- Acoustic Splitter Pod Baffles -->
      <rect x="35" y="22" width="150" height="12" rx="4" fill="#64748b" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="35" y="40" width="150" height="12" rx="4" fill="#64748b" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="35" y="58" width="150" height="12" rx="4" fill="#64748b" stroke="#0f172a" stroke-width="1.2"/>
      <!-- Flanges -->
      <rect x="4" y="10" width="8" height="70" rx="1.5" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="208" y="10" width="8" height="70" rx="1.5" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'hvac.duct.bellmouth_intake.flat2d',
    name: 'Bellmouth Air Intake Hood',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Duct Accessories',
    tags: ['hvac', 'duct', 'bellmouth', 'intake', 'hood', 'flare', 'fan inlet', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 120,
    viewBox: '0 0 160 120',
    anchorPoints: [
      { id: 'outlet', name: 'Duct Discharge Spigot', x: 160, y: 60, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Aerodynamic Bellmouth Flared Radius Lip -->
      <path d="M 20 15 C 60 15, 90 40, 110 40 L 150 40 L 150 80 L 110 80 C 90 80, 60 105, 20 105 Z" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- Bird Screen Wire Guard Mesh -->
      <line x1="20" y1="20" x2="20" y2="100" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2"/>
      <rect x="148" y="35" width="8" height="50" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'hvac.duct.exhaust_stack_rain_cap.flat2d',
    name: 'Rooftop Exhaust Stack with Rain Cone',
    sector: 'HVAC',
    category: 'Ducts',
    subcategory: 'Duct Accessories',
    tags: ['hvac', 'duct', 'exhaust stack', 'rain cap', 'cowl', 'roof vent', 'discharge', '2d'],
    styleVariant: 'flat2d',
    defaultW: 150,
    defaultH: 200,
    viewBox: '0 0 150 200',
    anchorPoints: [
      { id: 'inlet', name: 'Bottom Duct Riser Flange', x: 75, y: 190, type: 'duct', direction: 'bottom', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 150 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Vertical Stack Riser Pipe -->
      <rect x="55" y="70" width="40" height="120" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <rect x="50" y="185" width="50" height="8" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Inverted Conical Rain Cap Hood -->
      <polygon points="75,20 15,60 135,60" fill="#64748b" stroke="#0f172a" stroke-width="2"/>
      <!-- Stiffener Struts Supporting Rain Cap -->
      <line x1="30" y1="60" x2="55" y2="85" stroke="#0f172a" stroke-width="2.5"/>
      <line x1="120" y1="60" x2="95" y2="85" stroke="#0f172a" stroke-width="2.5"/>
    </svg>`)
  },

  // =========================================================================
  // 10. 3D ISOMETRIC HVAC AIR HANDLING & CONDENSING UNITS
  // =========================================================================
  {
    id: 'hvac.ahu.modular_central_station_elbow.3d',
    name: 'Modular Central Station AHU 3D (with 90° Duct Elbow)',
    sector: 'HVAC',
    category: 'Air Handling Units',
    subcategory: 'Central AHU',
    tags: ['hvac', 'ahu', 'air handling unit', 'central station', 'chilled water', 'dx coil', 'blower', '3d', 'isometric'],
    styleVariant: '3d',
    defaultW: 240,
    defaultH: 260,
    viewBox: '0 0 240 260',
    anchorPoints: [
      { id: 'intake', name: 'Return Air Bottom Intake', x: 45, y: 240, type: 'duct', direction: 'bottom' },
      { id: 'discharge', name: 'Supply Air Top Elbow Discharge', x: 215, y: 55, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 240 260" xmlns="http://www.w3.org/2000/svg">
      <!-- Modular Double-Skin Insulated AHU Cabinet in Metallic Grey -->
      <polygon points="100,105 180,65 210,85 130,125" fill="#f1f5f9" stroke="#475569" stroke-width="1.5"/>
      <polygon points="100,105 130,125 130,240 100,220" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <polygon points="130,125 210,85 210,200 130,240" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>

      <!-- Cabinet Access Doors with Inspection Louvers -->
      <rect x="140" y="135" width="55" height="40" rx="3" fill="#64748b" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="140" y="185" width="55" height="40" rx="3" fill="#64748b" stroke="#0f172a" stroke-width="1.2"/>
      <line x1="145" y1="145" x2="190" y2="145" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="145" y1="155" x2="190" y2="155" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="145" y1="195" x2="190" y2="195" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="145" y1="205" x2="190" y2="205" stroke="#cbd5e1" stroke-width="1.5"/>

      <!-- Bottom Return Air Duct & Drop Trunk -->
      <polygon points="30,210 65,190 75,200 40,220" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <rect x="30" y="190" width="35" height="50" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>

      <!-- Top Vertical Duct Riser with 90° Mitered Elbow Discharge -->
      <polygon points="150,75 175,62 175,25 150,38" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <polygon points="175,25 210,42 210,65 175,48" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <rect x="205" y="42" width="10" height="30" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>

      <!-- External Condenser Unit in Background (Direct Expansion Heat Pump) -->
      <polygon points="20,70 70,45 90,60 40,85" fill="#f8fafc" stroke="#475569" stroke-width="1.2"/>
      <polygon points="20,70 40,85 40,140 20,125" fill="#94a3b8" stroke="#475569" stroke-width="1.2"/>
      <polygon points="40,85 90,60 90,115 40,140" fill="#cbd5e1" stroke="#475569" stroke-width="1.2"/>
      <!-- Top Axial Fan Guard Ring -->
      <ellipse cx="55" cy="65" rx="18" ry="8" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Refrigeration Interconnecting Copper Line Pipes -->
      <path d="M 40 115 C 60 115, 80 145, 100 145" stroke="#f59e0b" stroke-width="3" fill="none"/>
      <path d="M 40 125 C 60 125, 80 155, 100 155" stroke="#334155" stroke-width="4" fill="none"/>
    </svg>`)
  },
  {
    id: 'hvac.condenser.rooftop_unit_concrete_pad.3d',
    name: 'Outdoor Condensing Unit 3D (Rooftop / Concrete Pad)',
    sector: 'HVAC',
    category: 'Condensers',
    subcategory: 'Outdoor Condensers',
    tags: ['hvac', 'condenser', 'heat pump', 'outdoor unit', 'rooftop', 'concrete pad', '3d'],
    styleVariant: '3d',
    defaultW: 200,
    defaultH: 220,
    viewBox: '0 0 200 220',
    anchorPoints: [
      { id: 'liquid_line', name: 'Liquid Refrigerant Line', x: 155, y: 180, type: 'pipe', direction: 'right' },
      { id: 'suction_line', name: 'Suction Vapor Line', x: 155, y: 195, type: 'pipe', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">
      <!-- Concrete Vibration Isolator Mounting Pad -->
      <polygon points="35,165 145,135 185,160 75,190" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
      <polygon points="75,190 185,160 185,178 75,208" fill="#64748b" stroke="#334155" stroke-width="2"/>
      <polygon points="35,165 75,190 75,208 35,183" fill="#475569" stroke="#334155" stroke-width="2"/>

      <!-- Condenser Cabinet Housing -->
      <polygon points="50,60 130,35 160,55 80,80" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/>
      <polygon points="50,60 80,80 80,165 50,145" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <polygon points="80,80 160,55 160,140 80,165" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>

      <!-- Top Protective Wire Fan Grille & Aerofoil Blades -->
      <ellipse cx="105" cy="55" rx="34" ry="14" fill="#0f172a" stroke="#475569" stroke-width="2"/>
      <circle cx="105" cy="55" r="7" fill="#cbd5e1"/>
      <line x1="80" y1="55" x2="130" y2="55" stroke="#f8fafc" stroke-width="2"/>
      <line x1="105" y1="44" x2="105" y2="66" stroke="#f8fafc" stroke-width="2"/>

      <!-- Finned Condenser Coil Louvers -->
      <line x1="88" y1="90" x2="152" y2="70" stroke="#64748b" stroke-width="1.5"/>
      <line x1="88" y1="105" x2="152" y2="85" stroke="#64748b" stroke-width="1.5"/>
      <line x1="88" y1="120" x2="152" y2="100" stroke="#64748b" stroke-width="1.5"/>
      <line x1="88" y1="135" x2="152" y2="115" stroke="#64748b" stroke-width="1.5"/>
      <line x1="88" y1="150" x2="152" y2="130" stroke="#64748b" stroke-width="1.5"/>

      <!-- Insulated Refrigeration Pipe Stubs & Filter Drier -->
      <rect x="140" y="165" width="22" height="8" rx="2" fill="#1e293b"/>
      <path d="M 130 160 C 145 160, 160 175, 185 175" stroke="#cbd5e1" stroke-width="5" fill="none"/>
      <path d="M 130 170 C 145 170, 160 185, 185 185" stroke="#f59e0b" stroke-width="3" fill="none"/>
    </svg>`)
  },
  {
    id: 'hvac.condenser.quad_fan_commercial_vrf.3d',
    name: 'Commercial VRF Multi-Fan Condenser 3D (4-Fan Heat Recovery)',
    sector: 'HVAC',
    category: 'Condensers',
    subcategory: 'VRF Systems',
    tags: ['hvac', 'vrf', 'condenser', 'heat recovery', '4 fan', 'commercial', '3d'],
    styleVariant: '3d',
    defaultW: 220,
    defaultH: 220,
    viewBox: '0 0 220 220',
    anchorPoints: [
      { id: 'piping', name: 'VRF Header Joint', x: 200, y: 180, type: 'pipe', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Large Commercial VRF Modular Tower Cabinet -->
      <polygon points="40,50 140,20 180,40 80,70" fill="#f8fafc" stroke="#475569" stroke-width="1.5"/>
      <polygon points="40,50 80,70 80,180 40,160" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <polygon points="80,70 180,40 180,150 80,180" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>

      <!-- 4 Axial Fan Cowls on Front Elevation -->
      <!-- Fan 1 (Top Left) -->
      <circle cx="105" cy="85" r="18" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <circle cx="105" cy="85" r="4" fill="#cbd5e1"/>
      <!-- Fan 2 (Top Right) -->
      <circle cx="150" cy="72" r="18" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <circle cx="150" cy="72" r="4" fill="#cbd5e1"/>
      <!-- Fan 3 (Bottom Left) -->
      <circle cx="105" cy="135" r="18" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <circle cx="105" cy="135" r="4" fill="#cbd5e1"/>
      <!-- Fan 4 (Bottom Right) -->
      <circle cx="150" cy="122" r="18" fill="#1e293b" stroke="#475569" stroke-width="2"/>
      <circle cx="150" cy="122" r="4" fill="#cbd5e1"/>

      <!-- Side Service Inspection Louvers -->
      <line x1="48" y1="80" x2="72" y2="92" stroke="#64748b" stroke-width="2"/>
      <line x1="48" y1="100" x2="72" y2="112" stroke="#64748b" stroke-width="2"/>
      <line x1="48" y1="120" x2="72" y2="132" stroke="#64748b" stroke-width="2"/>
      <line x1="48" y1="140" x2="72" y2="152" stroke="#64748b" stroke-width="2"/>
    </svg>`)
  },
  {
    id: 'hvac.indoor.wall_split_evaporator.3d',
    name: 'Wall-Mounted High-Wall Split Indoor Unit 3D',
    sector: 'HVAC',
    category: 'Indoor Units',
    subcategory: 'Split Units',
    tags: ['hvac', 'split ac', 'indoor unit', 'evaporator', 'wall mounted', '3d', 'isometric'],
    styleVariant: '3d',
    defaultW: 200,
    defaultH: 120,
    viewBox: '0 0 200 120',
    anchorPoints: [
      { id: 'refrigerant', name: 'Refrigerant Line Connection', x: 20, y: 70, type: 'pipe', direction: 'left' },
      { id: 'drain', name: 'Condensate Drain Tube', x: 20, y: 90, type: 'pipe', direction: 'bottom' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Sleek Gloss White Indoor High-Wall AC Chassis -->
      <polygon points="30,30 150,15 180,30 60,45" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
      <polygon points="30,30 60,45 60,85 30,70" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.5"/>
      <polygon points="60,45 180,30 180,70 60,85" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>

      <!-- Top Intake Air Grille Louvers -->
      <line x1="45" y1="32" x2="160" y2="18" stroke="#94a3b8" stroke-width="1.5"/>
      <line x1="50" y1="38" x2="165" y2="24" stroke="#94a3b8" stroke-width="1.5"/>

      <!-- Bottom Motorized Swing Louver Deflector Blade -->
      <polygon points="65,75 175,61 175,68 65,82" fill="#0284c7" stroke="#0369a1" stroke-width="1"/>
      
      <!-- Digital LED Temperature Display & Indicator LED -->
      <circle cx="155" cy="50" r="3" fill="#10b981"/>
      <rect x="135" y="44" width="14" height="8" rx="2" fill="#0284c7" opacity="0.8"/>
    </svg>`)
  },
  {
    id: 'hvac.fan.square_cased_wall_exhaust.3d',
    name: 'Square Cased Industrial Wall Exhaust Fan 3D',
    sector: 'HVAC',
    category: 'Fans & Blowers',
    subcategory: 'Wall Exhaust Fans',
    tags: ['hvac', 'fan', 'exhaust fan', 'wall fan', 'cooling fan', 'box fan', 'wire guard', '3d'],
    styleVariant: '3d',
    defaultW: 160,
    defaultH: 160,
    viewBox: '0 0 160 160',
    animationReady: true,
    animatableParts: ['fan_blades'],
    anchorPoints: [
      { id: 'intake', name: 'Suction Face', x: 80, y: 80, type: 'duct', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <!-- Heavy Cast / Molded Square Mounting Shroud in Charcoal -->
      <rect x="15" y="15" width="130" height="130" rx="16" fill="#1e293b" stroke="#0f172a" stroke-width="2" filter="url(#ind3dShadow)"/>
      
      <!-- 4 Corner Mounting Holes -->
      <circle cx="28" cy="28" r="4.5" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="132" cy="28" r="4.5" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="28" cy="132" r="4.5" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="132" cy="132" r="4.5" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Circular Venturi Orifice -->
      <circle cx="80" cy="80" r="54" fill="#0f172a" stroke="#475569" stroke-width="2"/>
      <circle cx="80" cy="80" r="48" fill="#090d16"/>

      <!-- Rotating 7-Blade High-Efficiency Sickle Aerofoil Runner -->
      <g data-part-id="fan_blades">
        <path d="M 80 50 C 95 45, 115 55, 120 70 C 110 75, 95 70, 80 65 Z" fill="#94a3b8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 80 50 C 95 45, 115 55, 120 70 C 110 75, 95 70, 80 65 Z" transform="rotate(51.4 80 80)" fill="#cbd5e1" stroke="#0f172a" stroke-width="1"/>
        <path d="M 80 50 C 95 45, 115 55, 120 70 C 110 75, 95 70, 80 65 Z" transform="rotate(102.8 80 80)" fill="#94a3b8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 80 50 C 95 45, 115 55, 120 70 C 110 75, 95 70, 80 65 Z" transform="rotate(154.2 80 80)" fill="#cbd5e1" stroke="#0f172a" stroke-width="1"/>
        <path d="M 80 50 C 95 45, 115 55, 120 70 C 110 75, 95 70, 80 65 Z" transform="rotate(205.7 80 80)" fill="#94a3b8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 80 50 C 95 45, 115 55, 120 70 C 110 75, 95 70, 80 65 Z" transform="rotate(257.1 80 80)" fill="#cbd5e1" stroke="#0f172a" stroke-width="1"/>
        <path d="M 80 50 C 95 45, 115 55, 120 70 C 110 75, 95 70, 80 65 Z" transform="rotate(308.5 80 80)" fill="#cbd5e1" stroke="#0f172a" stroke-width="1"/>

        <!-- Machined Center Hub & Spinner Cap -->
        <circle cx="80" cy="80" r="18" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
        <circle cx="80" cy="80" r="8" fill="#334155" stroke="#0f172a" stroke-width="1"/>
        <circle cx="80" cy="80" r="3" fill="#f8fafc"/>
      </g>
    </svg>`)
  }
];

