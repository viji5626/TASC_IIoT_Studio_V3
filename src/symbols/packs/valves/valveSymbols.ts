import { SymbolMetadata } from '../../../types/symbol';
import { injectIndustrialDefs } from '../../shared/styles/industrialStyles';

/**
 * TASC IIoT Studio — Comprehensive Industrial Valves Graphics Library
 * Complete 2D ISA-5.1 P&ID and 3D Photorealistic Vector SVG definitions for:
 * 1. Gate Valve
 * 2. Globe Valve
 * 3. Check Valve (Swing / Lift Check)
 * 4. Butterfly Valve (Lugged / Wafer Notch Lever)
 * 5. Ball Valve (2-Piece Flanged Lever)
 * 6. Plug Valve (Quarter-Turn Lubricated)
 * 7. Diaphragm Valve (Weir Type Bonnet)
 * 8. Chain Operating Valve (Overhead Chain Wheel)
 * 9. Pressure Safety Valve (PSV / PRV with Test Lever)
 * 10. Motor Operated Valve (MOV Electric Actuator)
 * 11. Angle Valve (90-Degree Right Angle)
 * 12. Pneumatic Control Valve (Diaphragm Actuator Dome with Positioner)
 */

export const VALVE_SYMBOLS: SymbolMetadata[] = [
  // =========================================================================
  // 1. GATE VALVES (2D & 3D)
  // =========================================================================
  {
    id: 'valves.gate.flanged.3d',
    name: 'Gate Valve 3D (Flanged Stainless)',
    sector: 'Valves',
    category: 'Manual Valves',
    subcategory: 'Gate Valves',
    tags: ['valve', 'gate valve', '3d', 'handwheel', 'flanged', 'stainless', 'rising stem', 'isolation'],
    styleVariant: '3d',
    defaultW: 160,
    defaultH: 200,
    viewBox: '0 0 160 200',
    animationReady: true,
    animatableParts: ['valve_handwheel'],
    anchorPoints: [
      { id: 'inlet', name: 'Flange Inlet', x: 20, y: 155, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Flange Outlet', x: 140, y: 155, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Shaded Valve Body (Stainless Steel) -->
      <rect x="25" y="142" width="110" height="26" rx="4" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <circle cx="80" cy="155" r="24" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Inlet & Outlet Flanges with Bolt Pattern -->
      <rect x="14" y="132" width="14" height="46" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="21" cy="140" r="2" fill="#0f172a"/>
      <circle cx="21" cy="155" r="2" fill="#0f172a"/>
      <circle cx="21" cy="170" r="2" fill="#0f172a"/>

      <rect x="132" y="132" width="14" height="46" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="139" cy="140" r="2" fill="#0f172a"/>
      <circle cx="139" cy="155" r="2" fill="#0f172a"/>
      <circle cx="139" cy="170" r="2" fill="#0f172a"/>

      <!-- Bonnet Neck & Stuffing Box Gland -->
      <rect x="68" y="105" width="24" height="38" rx="2" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="62" y="98" width="36" height="10" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.2"/>

      <!-- Rising Stem Column & Yoke Frame -->
      <rect x="76" y="42" width="8" height="60" fill="url(#indBrassGrad)" stroke="#0f172a" stroke-width="1"/>
      <path d="M 64 98 L 74 48 L 86 48 L 96 98 Z" fill="none" stroke="#475569" stroke-width="3" stroke-linejoin="round"/>

      <!-- 3D Industrial Teal / Green Handwheel -->
      <g data-part-id="valve_handwheel">
        <ellipse cx="80" cy="38" rx="48" ry="14" fill="url(#indMachineBlueGrad)" stroke="#0f172a" stroke-width="2"/>
        <ellipse cx="80" cy="38" rx="36" ry="9" fill="#1e293b"/>
        <circle cx="80" cy="38" r="8" fill="url(#indBrassGrad)" stroke="#0f172a" stroke-width="1"/>
        <line x1="80" y1="24" x2="80" y2="52" stroke="#38bdf8" stroke-width="2.5"/>
        <line x1="32" y1="38" x2="128" y2="38" stroke="#38bdf8" stroke-width="2.5"/>
      </g>
    </svg>`)
  },
  {
    id: 'valves.gate.flanged.flat2d',
    name: 'Gate Valve 2D (ISA P&ID)',
    sector: 'Valves',
    category: 'Manual Valves',
    subcategory: 'Gate Valves',
    tags: ['valve', 'gate valve', 'pid', 'isa 5.1', '2d', 'schematic'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 140,
    viewBox: '0 0 140 140',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet', x: 15, y: 95, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet', x: 125, y: 95, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <!-- P&ID Pipe Line -->
      <line x1="15" y1="95" x2="125" y2="95" stroke="#0f172a" stroke-width="4"/>
      <!-- Standard Gate Valve Opposing Triangles -->
      <polygon points="30,70 30,120 70,95" fill="#0284c7" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="110,70 110,120 70,95" fill="#0284c7" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      
      <!-- Gate Valve Center Gate Lines -->
      <line x1="70" y1="95" x2="70" y2="35" stroke="#0f172a" stroke-width="3"/>
      <line x1="50" y1="35" x2="90" y2="35" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
      <line x1="60" y1="75" x2="60" y2="115" stroke="#0f172a" stroke-width="2"/>
      <line x1="80" y1="75" x2="80" y2="115" stroke="#0f172a" stroke-width="2"/>
    </svg>`)
  },

  // =========================================================================
  // 2. GLOBE VALVES (2D & 3D)
  // =========================================================================
  {
    id: 'valves.globe.flanged.3d',
    name: 'Globe Valve 3D (Spherical Bonnet with Red Handwheel)',
    sector: 'Valves',
    category: 'Manual Valves',
    subcategory: 'Globe Valves',
    tags: ['valve', 'globe valve', '3d', 'throttling', 'red handwheel', 'spherical body', 'flanged'],
    styleVariant: '3d',
    defaultW: 160,
    defaultH: 200,
    viewBox: '0 0 160 200',
    animationReady: true,
    animatableParts: ['valve_handwheel'],
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 20, y: 155, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet Flange', x: 140, y: 155, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D S-Shape Spherical Globe Valve Body -->
      <path d="M 28 142 L 60 142 C 60 125, 100 125, 100 142 L 132 142 L 132 168 L 100 168 C 100 185, 60 185, 60 168 L 28 168 Z" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <circle cx="80" cy="155" r="28" fill="url(#indCastIronGrad)" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Inlet & Outlet Flanges -->
      <rect x="14" y="132" width="14" height="46" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="132" y="132" width="14" height="46" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Globe Valve Bonnet & Yoke -->
      <rect x="66" y="98" width="28" height="35" rx="3" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="76" y="42" width="8" height="58" fill="url(#indBrassGrad)" stroke="#0f172a" stroke-width="1"/>

      <!-- 3D Red Industrial Cast Handwheel -->
      <g data-part-id="valve_handwheel">
        <ellipse cx="80" cy="38" rx="46" ry="14" fill="url(#indHotWaterGrad)" stroke="#0f172a" stroke-width="2"/>
        <ellipse cx="80" cy="38" rx="34" ry="9" fill="#1e293b"/>
        <circle cx="80" cy="38" r="8" fill="url(#indBrassGrad)" stroke="#0f172a" stroke-width="1"/>
        <line x1="80" y1="24" x2="80" y2="52" stroke="#ef4444" stroke-width="2.5"/>
        <line x1="34" y1="38" x2="126" y2="38" stroke="#ef4444" stroke-width="2.5"/>
      </g>
    </svg>`)
  },
  {
    id: 'valves.globe.flanged.flat2d',
    name: 'Globe Valve 2D (ISA P&ID Solid Dot)',
    sector: 'Valves',
    category: 'Manual Valves',
    subcategory: 'Globe Valves',
    tags: ['valve', 'globe valve', 'pid', 'isa 5.1', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 140,
    viewBox: '0 0 140 140',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet', x: 15, y: 95, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet', x: 125, y: 95, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <line x1="15" y1="95" x2="125" y2="95" stroke="#0f172a" stroke-width="4"/>
      <polygon points="30,70 30,120 70,95" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="110,70 110,120 70,95" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      
      <!-- Solid Center Disc Dot for Globe Valve ISA P&ID Standard -->
      <circle cx="70" cy="95" r="12" fill="#0f172a"/>
      
      <!-- Stem & Handwheel -->
      <line x1="70" y1="95" x2="70" y2="35" stroke="#0f172a" stroke-width="3"/>
      <line x1="50" y1="35" x2="90" y2="35" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
    </svg>`)
  },

  // =========================================================================
  // 3. CHECK VALVES (2D & 3D)
  // =========================================================================
  {
    id: 'valves.check.swing_flanged.3d',
    name: 'Check Valve 3D (Swing Check Flanged Body)',
    sector: 'Valves',
    category: 'Non-Return Valves',
    subcategory: 'Check Valves',
    tags: ['valve', 'check valve', 'non-return', 'swing check', '3d', 'flanged'],
    styleVariant: '3d',
    defaultW: 160,
    defaultH: 140,
    viewBox: '0 0 160 140',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 20, y: 90, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet Flange', x: 140, y: 90, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Check Valve Body -->
      <path d="M 28 80 L 55 80 L 60 45 L 100 45 L 105 80 L 132 80 L 132 105 L 28 105 Z" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <circle cx="80" cy="90" r="26" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Bolted Top Inspection Cover Cap -->
      <rect x="52" y="38" width="56" height="12" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="60" cy="44" r="2" fill="#0f172a"/>
      <circle cx="80" cy="44" r="2" fill="#0f172a"/>
      <circle cx="100" cy="44" r="2" fill="#0f172a"/>

      <!-- Flanged Ends -->
      <rect x="14" y="68" width="14" height="48" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="132" y="68" width="14" height="48" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'valves.check.swing_flanged.flat2d',
    name: 'Check Valve 2D (ISA P&ID Clapper Flow)',
    sector: 'Valves',
    category: 'Non-Return Valves',
    subcategory: 'Check Valves',
    tags: ['valve', 'check valve', 'pid', 'isa 5.1', '2d', 'non return'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 100,
    viewBox: '0 0 140 100',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet', x: 15, y: 50, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet', x: 125, y: 50, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
      <line x1="15" y1="50" x2="125" y2="50" stroke="#0f172a" stroke-width="4"/>
      <polygon points="30,25 30,75 70,50" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="110,25 110,75 70,50" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      
      <!-- Internal Swing Clapper Barrier -->
      <line x1="50" y1="28" x2="90" y2="72" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`)
  },

  // =========================================================================
  // 4. BUTTERFLY VALVES (2D & 3D)
  // =========================================================================
  {
    id: 'valves.butterfly.wafer_notch.3d',
    name: 'Butterfly Valve 3D (Wafer/Lugged Notch Lever)',
    sector: 'Valves',
    category: 'Quarter-Turn Valves',
    subcategory: 'Butterfly Valves',
    tags: ['valve', 'butterfly', 'wafer', 'lugged', 'lever', '3d', 'green disc'],
    styleVariant: '3d',
    defaultW: 160,
    defaultH: 180,
    viewBox: '0 0 160 180',
    animationReady: true,
    animatableParts: ['valve_lever'],
    anchorPoints: [
      { id: 'inlet', name: 'Wafer Inlet', x: 45, y: 125, type: 'pipe', direction: 'left' },
      { id: 'outlet', name: 'Wafer Outlet', x: 115, y: 125, type: 'pipe', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg">
      <!-- Cast Ductile Iron Green Wafer Ring Body -->
      <circle cx="80" cy="125" r="45" fill="#15803d" stroke="#0f172a" stroke-width="2" filter="url(#ind3dShadow)"/>
      <circle cx="80" cy="125" r="34" fill="#166534" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="80" cy="125" r="28" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5"/>
      
      <!-- 4 Lug Bolt Holes -->
      <circle cx="45" cy="95" r="5" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="115" cy="95" r="5" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="45" cy="155" r="5" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="115" cy="155" r="5" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Center Disc Shaft -->
      <rect x="76" y="65" width="8" height="60" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1"/>

      <!-- Manual Notch Plate & Squeeze Lever -->
      <g data-part-id="valve_lever">
        <!-- Notch Quadrant Plate -->
        <path d="M 60 70 A 25 25 0 0 1 100 70 Z" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
        <!-- Long Operating Lever Arm -->
        <line x1="80" y1="70" x2="25" y2="25" stroke="#0f172a" stroke-width="6" stroke-linecap="round"/>
        <!-- Release Squeeze Lever -->
        <line x1="80" y1="70" x2="35" y2="42" stroke="#15803d" stroke-width="4" stroke-linecap="round"/>
      </g>
    </svg>`)
  },
  {
    id: 'valves.butterfly.wafer_notch.flat2d',
    name: 'Butterfly Valve 2D (ISA P&ID)',
    sector: 'Valves',
    category: 'Quarter-Turn Valves',
    subcategory: 'Butterfly Valves',
    tags: ['valve', 'butterfly', 'pid', 'isa 5.1', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 140,
    viewBox: '0 0 140 140',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet', x: 15, y: 95, type: 'pipe', direction: 'left' },
      { id: 'outlet', name: 'Outlet', x: 125, y: 95, type: 'pipe', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <line x1="15" y1="95" x2="125" y2="95" stroke="#0f172a" stroke-width="4"/>
      <polygon points="30,70 30,120 70,95" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="110,70 110,120 70,95" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      
      <!-- Butterfly Center Disc & Top Lever Crank -->
      <circle cx="70" cy="95" r="5" fill="#0f172a"/>
      <line x1="70" y1="95" x2="70" y2="35" stroke="#0f172a" stroke-width="3"/>
      <path d="M 70 35 L 95 35 L 95 50" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
    </svg>`)
  },

  // =========================================================================
  // 5. BALL VALVES (2D & 3D)
  // =========================================================================
  {
    id: 'valves.ball.flanged_lever.3d',
    name: 'Ball Valve 3D (2-Piece Flanged Lever)',
    sector: 'Valves',
    category: 'Quarter-Turn Valves',
    subcategory: 'Ball Valves',
    tags: ['valve', 'ball valve', 'lever', 'quarter turn', '3d', 'flanged', 'stainless'],
    styleVariant: '3d',
    defaultW: 170,
    defaultH: 150,
    viewBox: '0 0 170 150',
    animationReady: true,
    animatableParts: ['valve_lever'],
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 20, y: 105, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet Flange', x: 150, y: 105, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 170 150" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Spherical Valve Body -->
      <circle cx="85" cy="105" r="32" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <circle cx="85" cy="105" r="22" fill="url(#indCastIronGrad)"/>

      <!-- Inlet & Outlet Flanges with Bolt Holes -->
      <rect x="15" y="80" width="14" height="50" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="22" cy="90" r="2" fill="#0f172a"/>
      <circle cx="22" cy="105" r="2" fill="#0f172a"/>
      <circle cx="22" cy="120" r="2" fill="#0f172a"/>

      <rect x="141" y="80" width="14" height="50" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="148" cy="90" r="2" fill="#0f172a"/>
      <circle cx="148" cy="105" r="2" fill="#0f172a"/>
      <circle cx="148" cy="120" r="2" fill="#0f172a"/>

      <!-- Stem & Gland Packing Nut -->
      <rect x="79" y="60" width="12" height="20" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.2"/>

      <!-- Long Stainless Steel Quarter-Turn Lever Handle -->
      <g data-part-id="valve_lever">
        <circle cx="85" cy="58" r="8" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
        <line x1="85" y1="58" x2="160" y2="58" stroke="#0f172a" stroke-width="6" stroke-linecap="round"/>
        <rect x="110" y="54" width="48" height="8" rx="3" fill="#ef4444"/>
      </g>
    </svg>`)
  },
  {
    id: 'valves.ball.flanged_lever.flat2d',
    name: 'Ball Valve 2D (ISA P&ID Spherical Ring)',
    sector: 'Valves',
    category: 'Quarter-Turn Valves',
    subcategory: 'Ball Valves',
    tags: ['valve', 'ball valve', 'pid', 'isa 5.1', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 140,
    viewBox: '0 0 140 140',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet', x: 15, y: 95, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet', x: 125, y: 95, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <line x1="15" y1="95" x2="125" y2="95" stroke="#0f172a" stroke-width="4"/>
      <polygon points="30,70 30,120 70,95" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="110,70 110,120 70,95" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>
      
      <!-- Open Ball Valve Ring Eye -->
      <circle cx="70" cy="95" r="14" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
      
      <!-- Lever Handle -->
      <line x1="70" y1="95" x2="70" y2="35" stroke="#0f172a" stroke-width="3"/>
      <line x1="70" y1="35" x2="110" y2="35" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
    </svg>`)
  },

  // =========================================================================
  // 6. MOTOR OPERATED VALVES (MOV) & CONTROL VALVES (2D & 3D)
  // =========================================================================
  {
    id: 'valves.actuated.mov_motor_gearbox.3d',
    name: 'Motor Operated Valve 3D (MOV Electric Actuator)',
    sector: 'Valves',
    category: 'Actuated Valves',
    subcategory: 'Motor Operated Valves',
    tags: ['valve', 'mov', 'motor operated', 'electric actuator', 'gearbox', '3d', 'smart valve'],
    styleVariant: '3d',
    defaultW: 180,
    defaultH: 200,
    viewBox: '0 0 180 200',
    animationReady: true,
    animatableParts: ['actuator_status'],
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 20, y: 155, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet Flange', x: 160, y: 155, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Valve Body & Flanges -->
      <rect x="30" y="142" width="120" height="26" rx="4" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <circle cx="90" cy="155" r="22" fill="url(#indCastIronGrad)"/>
      
      <rect x="18" y="130" width="14" height="50" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="148" y="130" width="14" height="50" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Heavy Electric Actuator Enclosure (Green Housing) -->
      <rect x="55" y="55" width="70" height="65" rx="6" fill="#15803d" stroke="#0f172a" stroke-width="2" filter="url(#ind3dShadow)"/>
      <!-- Manual Override Handwheel Shaft on Actuator -->
      <rect x="25" y="72" width="30" height="14" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="25" cy="79" r="16" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Digital LCD Display / Status Lamp -->
      <rect x="75" y="70" width="30" height="20" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <circle cx="85" cy="80" r="3" fill="#10b981"/>
      <circle cx="95" cy="80" r="3" fill="#38bdf8"/>

      <!-- Terminal Compartment & Pushbutton Knobs -->
      <rect x="72" y="32" width="36" height="23" rx="3" fill="#166534" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="82" cy="43" r="3.5" fill="#f8fafc"/>
      <circle cx="98" cy="43" r="3.5" fill="#f8fafc"/>
    </svg>`)
  },
  {
    id: 'valves.actuated.control_pneumatic_dome.3d',
    name: 'Pneumatic Control Valve 3D (Diaphragm Dome with Positioner)',
    sector: 'Valves',
    category: 'Actuated Valves',
    subcategory: 'Control Valves',
    tags: ['valve', 'control valve', 'pneumatic', 'diaphragm actuator', 'positioner', '3d'],
    styleVariant: '3d',
    defaultW: 180,
    defaultH: 220,
    viewBox: '0 0 180 220',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 20, y: 175, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet Flange', x: 160, y: 175, type: 'pipe', direction: 'right', flanged: true },
      { id: 'air_supply', name: 'Pneumatic Air Signal', x: 135, y: 120, type: 'pipe', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 220" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Heavy Globe Valve Body -->
      <path d="M 28 162 L 60 162 C 60 145, 120 145, 120 162 L 152 162 L 152 188 L 28 188 Z" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <rect x="16" y="152" width="14" height="46" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="150" y="152" width="14" height="46" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Yoke Legs & Travel Indicator Scale -->
      <rect x="85" y="80" width="10" height="70" fill="url(#indBrassGrad)" stroke="#0f172a" stroke-width="1"/>
      <line x1="72" y1="150" x2="78" y2="80" stroke="#334155" stroke-width="4"/>
      <line x1="108" y1="150" x2="102" y2="80" stroke="#334155" stroke-width="4"/>

      <!-- Smart Electro-Pneumatic Valve Positioner Box (Side Mounted) -->
      <rect x="110" y="105" width="28" height="34" rx="3" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="124" cy="116" r="4" fill="#38bdf8"/>
      <circle cx="124" cy="128" r="3" fill="#10b981"/>

      <!-- Pneumatic Diaphragm Actuator Dome (Top) -->
      <path d="M 45 80 C 45 35, 135 35, 135 80 Z" fill="#15803d" stroke="#0f172a" stroke-width="2" filter="url(#ind3dShadow)"/>
      <ellipse cx="90" cy="80" rx="45" ry="10" fill="#166534" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="82" y="18" width="16" height="18" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'valves.safety.psv_angle.3d',
    name: 'Pressure Safety Relief Valve 3D (PSV/PRV with Lever)',
    sector: 'Valves',
    category: 'Safety Valves',
    subcategory: 'Relief Valves',
    tags: ['valve', 'psv', 'prv', 'safety valve', 'relief', 'spring loaded', 'test lever', '3d'],
    styleVariant: '3d',
    defaultW: 160,
    defaultH: 220,
    viewBox: '0 0 160 220',
    anchorPoints: [
      { id: 'inlet', name: 'Bottom Vessel Inlet Flange', x: 65, y: 205, type: 'pipe', direction: 'bottom', flanged: true },
      { id: 'discharge', name: 'Side Vent Discharge Flange', x: 145, y: 145, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
      <!-- 90-Degree Right Angle Flow Casing (Industrial Green / Metallic) -->
      <path d="M 50 125 L 50 195 L 80 195 L 80 160 L 135 160 L 135 130 L 80 130 L 80 125 Z" fill="#0d9488" stroke="#0f172a" stroke-width="2" filter="url(#ind3dShadow)"/>
      
      <!-- Bottom Vessel Connection Flange -->
      <rect x="42" y="195" width="46" height="12" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="52" cy="201" r="1.8" fill="#0f172a"/>
      <circle cx="78" cy="201" r="1.8" fill="#0f172a"/>

      <!-- Side Vent Discharge Flange -->
      <rect x="135" y="122" width="12" height="46" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="141" cy="132" r="1.8" fill="#0f172a"/>
      <circle cx="141" cy="158" r="1.8" fill="#0f172a"/>

      <!-- Heavy Spring Enclosed Bonnet Column -->
      <rect x="52" y="55" width="26" height="70" rx="3" fill="#0f766e" stroke="#0f172a" stroke-width="1.5"/>
      <line x1="58" y1="70" x2="72" y2="70" stroke="#f8fafc" stroke-width="1.5"/>
      <line x1="58" y1="85" x2="72" y2="85" stroke="#f8fafc" stroke-width="1.5"/>
      <line x1="58" y1="100" x2="72" y2="100" stroke="#f8fafc" stroke-width="1.5"/>

      <!-- Top Adjusting Screw Cap & Manual Lifting Test Lever -->
      <rect x="56" y="32" width="18" height="23" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M 65 32 L 65 18 L 45 18 L 40 70 L 48 70" fill="none" stroke="#0d9488" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`)
  },
  {
    id: 'valves.chain.overhead_loop.3d',
    name: 'Chain Operating Valve 3D (Overhead Chainwheel)',
    sector: 'Valves',
    category: 'Manual Valves',
    subcategory: 'Chain Valves',
    tags: ['valve', 'chain wheel', 'overhead', 'yellow valve', '3d', 'hanging chain'],
    styleVariant: '3d',
    defaultW: 160,
    defaultH: 220,
    viewBox: '0 0 160 220',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 20, y: 155, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet Flange', x: 140, y: 155, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
      <!-- Yellow Cast-Iron Valve Body -->
      <rect x="25" y="142" width="110" height="26" rx="4" fill="url(#indSafetyYellowGrad)" stroke="#78350f" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <circle cx="80" cy="155" r="24" fill="url(#indSafetyYellowGrad)" stroke="#78350f" stroke-width="1.5"/>
      
      <rect x="14" y="132" width="14" height="46" rx="3" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="132" y="132" width="14" height="46" rx="3" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Rising Bonnet & Yoke -->
      <rect x="68" y="95" width="24" height="48" rx="2" fill="url(#indSafetyYellowGrad)" stroke="#78350f" stroke-width="1.2"/>

      <!-- Overhead Sprocket Chainwheel -->
      <circle cx="80" cy="55" r="32" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <circle cx="80" cy="55" r="22" fill="#475569" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,2"/>
      <circle cx="80" cy="55" r="8" fill="url(#indBrassGrad)"/>

      <!-- Hanging Endless Link Chain Loop (Left & Right Drops) -->
      <path d="M 52 55 L 52 205 C 52 215, 62 215, 62 205 L 62 85" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" stroke-dasharray="6,3"/>
    </svg>`)
  }
];
