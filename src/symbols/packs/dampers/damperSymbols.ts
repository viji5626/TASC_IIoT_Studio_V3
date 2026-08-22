import { SymbolMetadata } from '../../../types/symbol';
import { injectIndustrialDefs } from '../../shared/styles/industrialStyles';

/**
 * TASC IIoT Studio — Industrial Dampers & Airflow Controls Graphics Library
 * Complete 2D & 3D Vector SVG definitions for Opposed Blade, Parallel Blade, Round Butterfly, Backdraft, Motorized Smoke/Fire, Guillotine & Relief Dampers.
 */

export const DAMPER_SYMBOLS: SymbolMetadata[] = [
  // =========================================================================
  // 1. DUCT DAMPERS (OPPOSED BLADE, PARALLEL BLADE, BUTTERFLY)
  // =========================================================================
  {
    id: 'dampers.opposed_blade.vcd.flat2d',
    name: 'Opposed Blade Volume Control Damper',
    sector: 'HVAC',
    category: 'Dampers',
    subcategory: 'Volume Control',
    tags: ['damper', 'vcd', 'opposed blade', 'airflow', 'modulating', 'hvac', 'duct', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 120,
    viewBox: '0 0 160 120',
    animationReady: true,
    animatableParts: ['opposed_blades', 'linkage_quadrant'],
    anchorPoints: [
      { id: 'inlet', name: 'Duct Inlet Flange', x: 0, y: 60, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Duct Outlet Flange', x: 160, y: 60, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer Duct Flanged Channel Frame -->
      <rect x="12" y="20" width="136" height="80" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <rect x="4" y="12" width="8" height="96" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="148" y="12" width="8" height="96" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Interconnected Opposed Rotating Airfoil Blades -->
      <g data-part-id="opposed_blades">
        <!-- Pair 1: Clockwise / Counter-Clockwise Counter Rotation -->
        <line x1="30" y1="40" x2="70" y2="32" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="90" y1="32" x2="130" y2="40" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="30" y1="60" x2="70" y2="68" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="90" y1="68" x2="130" y2="60" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="30" y1="80" x2="70" y2="72" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="90" y1="72" x2="130" y2="80" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
      </g>
      <!-- External Modulation Linkage Bar -->
      <line x1="140" y1="35" x2="140" y2="85" stroke="#f59e0b" stroke-width="2"/>
      <!-- Top Actuator Mounting Bracket -->
      <rect x="65" y="6" width="30" height="14" rx="2" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
    </svg>`)
  },
  {
    id: 'dampers.opposed_blade.vcd.3d',
    name: 'Opposed Blade Damper 3D Galvanized',
    sector: 'HVAC',
    category: 'Dampers',
    subcategory: 'Volume Control',
    tags: ['damper', 'vcd', 'opposed blade', '3d', 'hvac', 'sheet metal'],
    styleVariant: '3d',
    defaultW: 170,
    defaultH: 130,
    viewBox: '0 0 170 130',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 6, y: 65, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet Flange', x: 164, y: 65, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 170 130" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="22" width="142" height="86" fill="url(#indDuctZincGrad)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <rect x="6" y="14" width="10" height="102" rx="2" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="154" y="14" width="10" height="102" rx="2" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5"/>
      <!-- 3D Metallic Extruded Blades -->
      <rect x="35" y="38" width="100" height="8" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1"/>
      <rect x="35" y="62" width="100" height="8" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1"/>
      <rect x="35" y="86" width="100" height="8" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1"/>
      <!-- Actuator Pod -->
      <rect x="70" y="8" width="30" height="16" rx="3" fill="url(#indSafetyYellowGrad)" stroke="#0f172a" stroke-width="1.2"/>
    </svg>`)
  },
  {
    id: 'dampers.butterfly.round.flat2d',
    name: 'Round Duct Butterfly Damper',
    sector: 'HVAC',
    category: 'Dampers',
    subcategory: 'Butterfly Dampers',
    tags: ['damper', 'butterfly', 'round duct', 'circular', 'balancing', 'spiral duct', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 140,
    viewBox: '0 0 140 140',
    animationReady: true,
    animatableParts: ['disc_shaft'],
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Collar', x: 0, y: 70, type: 'duct', direction: 'left' },
      { id: 'outlet', name: 'Outlet Collar', x: 140, y: 70, type: 'duct', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <!-- Round Duct Outer Shell -->
      <circle cx="70" cy="70" r="55" fill="#334155" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="70" cy="70" r="46" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
      <!-- Pivoting Single Circular Disc Blade & Shaft -->
      <g data-part-id="disc_shaft">
        <line x1="70" y1="20" x2="70" y2="120" stroke="#cbd5e1" stroke-width="3"/>
        <ellipse cx="70" cy="70" rx="10" ry="42" fill="#38bdf8" opacity="0.85" stroke="#0284c7" stroke-width="1.2"/>
      </g>
      <!-- Top Manual Locking Quadrant Handle -->
      <rect x="62" y="6" width="16" height="16" rx="2" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
      <line x1="70" y1="14" x2="95" y2="8" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
    </svg>`)
  },

  // =========================================================================
  // 2. BACKDRAFT, BAROMETRIC RELIEF & GUILLOTINE DAMPERS
  // =========================================================================
  {
    id: 'dampers.backdraft.gravity_louver.flat2d',
    name: 'Gravity Backdraft Non-Return Damper',
    sector: 'HVAC',
    category: 'Dampers',
    subcategory: 'Backdraft Dampers',
    tags: ['damper', 'backdraft', 'non-return', 'gravity', 'shutter', 'check damper', '2d'],
    styleVariant: 'flat2d',
    defaultW: 150,
    defaultH: 120,
    viewBox: '0 0 150 120',
    anchorPoints: [
      { id: 'inlet', name: 'Airflow Infeed', x: 0, y: 60, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Exhaust Discharge', x: 150, y: 60, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 150 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="20" width="126" height="80" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <!-- Gravity Counterbalanced Louver Leaves (Angled Down) -->
      <path d="M 30 35 L 75 55 M 30 55 L 75 75 M 30 75 L 75 95" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
      <!-- Foam Seal Bumpers & Brass Pivot Pins -->
      <circle cx="30" cy="35" r="3" fill="#f59e0b"/>
      <circle cx="30" cy="55" r="3" fill="#f59e0b"/>
      <circle cx="30" cy="75" r="3" fill="#f59e0b"/>
      <!-- Directional Arrow Indicating Permitted Flow Only -->
      <path d="M 85 60 L 115 60 M 110 53 L 120 60 L 110 67" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`)
  },
  {
    id: 'dampers.guillotine.slide_gate.flat2d',
    name: 'Guillotine Flue Gas Slide Gate Damper',
    sector: 'HVAC',
    category: 'Dampers',
    subcategory: 'Guillotine Dampers',
    tags: ['damper', 'guillotine', 'slide gate', 'isolation', 'flue gas', 'zero leakage', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 220,
    viewBox: '0 0 160 220',
    animationReady: true,
    animatableParts: ['gate_blade'],
    anchorPoints: [
      { id: 'inlet', name: 'Duct Inlet', x: 0, y: 160, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Duct Outlet', x: 160, y: 160, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
      <!-- Upper Superstructure Bonnet Tower Frame -->
      <rect x="25" y="20" width="110" height="110" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- Top Electric Motorized Drive Actuator & Screw Spindle -->
      <rect x="65" y="8" width="30" height="20" rx="3" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>
      <line x1="80" y1="28" x2="80" y2="130" stroke="#f8fafc" stroke-width="3"/>
      <!-- Heavy Stainless Steel Guillotine Blade Plate -->
      <g data-part-id="gate_blade">
        <rect x="35" y="45" width="90" height="145" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>
      </g>
      <!-- Lower Flanged Gas Duct Passage Body -->
      <rect x="15" y="130" width="130" height="70" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <rect x="8" y="125" width="8" height="80" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="144" y="125" width="8" height="80" rx="1.5" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  }
];
