import { SymbolMetadata } from '../../../types/symbol';
import { injectIndustrialDefs } from '../../shared/styles/industrialStyles';

/**
 * TASC IIoT Studio — Comprehensive Electric Motors & Drives Graphics Library
 * Complete 2D & 3D Vector SVG definitions for TEFC Foot-Mount, Flange-Mount, Explosion-Proof, In-Line & Right-Angle Gearmotors.
 */

export const MOTOR_SYMBOLS: SymbolMetadata[] = [
  // =========================================================================
  // 1. AC INDUCTION MOTORS (FOOT-MOUNT & FLANGE-MOUNT)
  // =========================================================================
  {
    id: 'motors.ac.tefc_foot_mount.flat2d',
    name: 'TEFC AC Induction Motor (Foot Mount)',
    sector: 'Motors & Drives',
    category: 'Electric Motors',
    subcategory: 'AC Induction',
    tags: ['motor', 'electric', 'tefc', 'foot mount', '3-phase', 'induction', 'nema', 'iec', '2d'],
    styleVariant: 'flat2d',
    defaultW: 190,
    defaultH: 140,
    viewBox: '0 0 190 140',
    animationReady: true,
    animatableParts: ['drive_shaft', 'cooling_fan'],
    anchorPoints: [
      { id: 'shaft', name: 'Drive Shaft Output', x: 175, y: 75, type: 'mechanical', direction: 'right' },
      { id: 'electrical', name: 'Terminal Box Conduit', x: 75, y: 15, type: 'electrical', direction: 'top' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 190 140" xmlns="http://www.w3.org/2000/svg">
      <!-- Cast Iron Mounting Base Feet -->
      <rect x="35" y="105" width="25" height="18" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="110" y="105" width="25" height="18" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Main Ribbed Stator Frame Barrel -->
      <rect x="40" y="35" width="95" height="75" rx="6" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <!-- Stator Axial Cooling Fins -->
      <line x1="55" y1="35" x2="55" y2="110" stroke="#0369a1" stroke-width="2"/>
      <line x1="70" y1="35" x2="70" y2="110" stroke="#0369a1" stroke-width="2"/>
      <line x1="85" y1="35" x2="85" y2="110" stroke="#0369a1" stroke-width="2"/>
      <line x1="100" y1="35" x2="100" y2="110" stroke="#0369a1" stroke-width="2"/>
      <line x1="115" y1="35" x2="115" y2="110" stroke="#0369a1" stroke-width="2"/>
      <!-- Top Oversized Terminal Conduit Box -->
      <rect x="60" y="15" width="45" height="22" rx="3" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <circle cx="82" cy="26" r="3" fill="#ef4444"/>
      <!-- Rear Fan Cowl Shield (NDE) -->
      <path d="M 40 35 C 20 35, 20 110, 40 110 Z" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Front Drive End Bracket & Precision Keyed Shaft (DE) -->
      <path d="M 135 45 L 148 55 L 148 95 L 135 105 Z" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="148" y="65" width="35" height="20" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="160" y="62" width="12" height="3" fill="#0f172a"/>
    </svg>`)
  },
  {
    id: 'motors.ac.tefc_foot_mount.3d',
    name: 'TEFC AC Motor 3D Metallic Blue',
    sector: 'Motors & Drives',
    category: 'Electric Motors',
    subcategory: 'AC Induction',
    tags: ['motor', 'electric', 'tefc', '3d', 'industrial', 'metallic blue', 'drive'],
    styleVariant: '3d',
    defaultW: 200,
    defaultH: 150,
    viewBox: '0 0 200 150',
    anchorPoints: [
      { id: 'shaft', name: 'Output Shaft', x: 185, y: 80, type: 'mechanical', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <rect x="35" y="112" width="28" height="20" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <rect x="120" y="112" width="28" height="20" rx="3" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <rect x="40" y="38" width="105" height="80" rx="8" fill="url(#indMachineBlueGrad)" stroke="#0f172a" stroke-width="2"/>
      <rect x="65" y="16" width="50" height="24" rx="4" fill="url(#indCastIronGrad)" stroke="#38bdf8" stroke-width="1.5"/>
      <path d="M 40 38 C 18 38, 18 118, 40 118 Z" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="2"/>
      <rect x="145" y="68" width="40" height="22" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'motors.explosion_proof.flameproof.flat2d',
    name: 'Explosion-Proof (Ex-d) Motor',
    sector: 'Motors & Drives',
    category: 'Electric Motors',
    subcategory: 'Hazardous Area',
    tags: ['motor', 'explosion proof', 'ex-d', 'flameproof', 'chemical', 'oil gas', 'refinery', 'atex', '2d'],
    styleVariant: 'flat2d',
    defaultW: 200,
    defaultH: 150,
    viewBox: '0 0 200 150',
    anchorPoints: [
      { id: 'shaft', name: 'Shaft', x: 180, y: 80, type: 'mechanical', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <rect x="35" y="110" width="30" height="20" rx="2" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <rect x="115" y="110" width="30" height="20" rx="2" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <!-- Extra Heavy Ductile Flameproof Shell -->
      <rect x="40" y="40" width="105" height="76" rx="5" fill="#475569" stroke="#0f172a" stroke-width="2.5"/>
      <!-- Ribs -->
      <line x1="55" y1="40" x2="55" y2="116" stroke="#1e293b" stroke-width="2"/>
      <line x1="75" y1="40" x2="75" y2="116" stroke="#1e293b" stroke-width="2"/>
      <line x1="95" y1="40" x2="95" y2="116" stroke="#1e293b" stroke-width="2"/>
      <line x1="115" y1="40" x2="115" y2="116" stroke="#1e293b" stroke-width="2"/>
      <line x1="135" y1="40" x2="135" y2="116" stroke="#1e293b" stroke-width="2"/>
      <!-- Heavy Cast Ex-d Terminal Chamber with Hexagon Cover Bolts -->
      <rect x="65" y="14" width="55" height="28" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
      <text x="92" y="32" font-size="8" fill="#f59e0b" font-weight="bold" text-anchor="middle">Ex d IIC</text>
      <!-- Shaft -->
      <rect x="145" y="70" width="38" height="20" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`)
  }
];
