import { SymbolMetadata } from '../../../types/symbol';
import { injectIndustrialDefs } from '../../shared/styles/industrialStyles';

/**
 * TASC IIoT Studio — Comprehensive Industrial Fans & Blowers Graphics Library
 * Complete 2D & 3D Vector SVG definitions for ID Fans, FD Fans, Centrifugal Blowers, Inline Duct Fans, Axial Fans, Roof Ventilators & Sirocco Blowers.
 * Standard ISA-5.1 / DIN / ISO Industrial SCADA Vector Graphics.
 */

export const FAN_SYMBOLS: SymbolMetadata[] = [
  // =========================================================================
  // 1. INDUCED DRAFT (ID) & FORCED DRAFT (FD) BOILER/FURNACE FANS
  // =========================================================================
  {
    id: 'fans.id_fan.centrifugal_heavy.flat2d',
    name: 'Induced Draft (ID) Heavy Fan',
    sector: 'Fans & Blowers',
    category: 'Draft Fans',
    subcategory: 'ID Fans',
    tags: ['fan', 'id fan', 'induced draft', 'boiler', 'flue gas', 'centrifugal', 'heavy duty', 'exhaust', '2d'],
    styleVariant: 'flat2d',
    defaultW: 200,
    defaultH: 170,
    viewBox: '0 0 200 170',
    animationReady: true,
    animatableParts: ['impeller_wheel'],
    anchorPoints: [
      { id: 'inlet', name: 'Suction Eye (Center)', x: 85, y: 85, type: 'duct', direction: 'front', flanged: true },
      { id: 'discharge', name: 'Horizontal Exhaust Flange', x: 180, y: 36, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Single 3D Tapered Blade pointing UP from hub to tip -->
        <g id="id-fan-blade-2d">
          <polygon points="85,47 80,74 85,74" fill="#e2e8f0"/>
          <polygon points="85,47 85,74 90,74" fill="#94a3b8"/>
          <line x1="85" y1="47" x2="85" y2="74" stroke="#ffffff" stroke-width="1"/>
        </g>
      </defs>

      <!-- Flanged Mounting Feet (Left & Right Flange Foot Brackets) -->
      <!-- Left Flange Foot -->
      <polygon points="50,130 30,160 70,160 68,130" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="22" y="158" width="52" height="7" rx="1.5" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="30" cy="161.5" r="1.5" fill="#0f172a"/>
      <circle cx="66" cy="161.5" r="1.5" fill="#0f172a"/>

      <!-- Right Flange Foot -->
      <polygon points="102,130 100,160 140,160 120,130" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="96" y="158" width="52" height="7" rx="1.5" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="104" cy="161.5" r="1.5" fill="#0f172a"/>
      <circle cx="140" cy="161.5" r="1.5" fill="#0f172a"/>

      <!-- Top-Right Horizontal Exhaust Duct Nozzle (Industrial Machine Green) -->
      <rect x="85" y="15" width="85" height="42" fill="#15803d" stroke="#166534" stroke-width="2"/>
      <!-- Inner Duct Highlight -->
      <rect x="85" y="17" width="80" height="4" fill="#4ade80" opacity="0.6"/>
      <rect x="85" y="51" width="80" height="4" fill="#14532d" opacity="0.8"/>
      
      <!-- Exhaust Discharge End Flange with Bolt Holes -->
      <rect x="168" y="10" width="12" height="52" rx="2" fill="#166534" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="174" cy="18" r="1.8" fill="#0f172a"/>
      <circle cx="174" cy="36" r="1.8" fill="#0f172a"/>
      <circle cx="174" cy="54" r="1.8" fill="#0f172a"/>

      <!-- Heavy Circular Volute Scroll Torus Casing (Grey Metallic Shaded) -->
      <circle cx="85" cy="85" r="70" fill="#94a3b8" stroke="#0f172a" stroke-width="2.5"/>
      <!-- Shading gradient / depth ring -->
      <circle cx="85" cy="85" r="68" fill="#cbd5e1"/>
      <circle cx="85" cy="85" r="60" fill="#94a3b8"/>
      <circle cx="85" cy="85" r="48" fill="#64748b" stroke="#0f172a" stroke-width="2"/>

      <!-- Center Rotating 6-Blade Tapered 3D Impeller Wheel -->
      <g data-part-id="impeller_wheel">
        <!-- Dark Center Cavity -->
        <circle cx="85" cy="85" r="41" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
        
        <!-- 6 Tapered 3D Blades (60 deg symmetrical spacing) -->
        <use href="#id-fan-blade-2d"/>
        <use href="#id-fan-blade-2d" transform="rotate(60 85 85)"/>
        <use href="#id-fan-blade-2d" transform="rotate(120 85 85)"/>
        <use href="#id-fan-blade-2d" transform="rotate(180 85 85)"/>
        <use href="#id-fan-blade-2d" transform="rotate(240 85 85)"/>
        <use href="#id-fan-blade-2d" transform="rotate(300 85 85)"/>

        <!-- Center Hub Spinner Cone & Axle Bolt -->
        <circle cx="85" cy="85" r="14" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
        <circle cx="85" cy="85" r="6" fill="#334155" stroke="#1e293b" stroke-width="1"/>
        <circle cx="85" cy="85" r="2.5" fill="#f1f5f9"/>
      </g>
    </svg>`)
  },
  {
    id: 'fans.id_fan.centrifugal_heavy.3d',
    name: 'Induced Draft (ID) Fan 3D Heavy Plant',
    sector: 'Fans & Blowers',
    category: 'Draft Fans',
    subcategory: 'ID Fans',
    tags: ['fan', 'id fan', 'induced draft', '3d', 'boiler', 'thermal power', 'heavy machinery'],
    styleVariant: '3d',
    defaultW: 220,
    defaultH: 180,
    viewBox: '0 0 220 180',
    anchorPoints: [
      { id: 'inlet', name: 'Suction Eye', x: 95, y: 90, type: 'duct', direction: 'front', flanged: true },
      { id: 'discharge', name: 'Horizontal Exhaust Flange', x: 198, y: 38, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 220 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <g id="id-fan-blade-3d">
          <polygon points="95,50 89,78 95,78" fill="#f1f5f9"/>
          <polygon points="95,50 95,78 101,78" fill="#94a3b8"/>
          <line x1="95" y1="50" x2="95" y2="78" stroke="#ffffff" stroke-width="1.2"/>
        </g>
      </defs>

      <!-- 3D Heavy Flanged Mounting Feet with Shadow -->
      <polygon points="56,138 32,170 76,170 74,138" fill="url(#indCastIronGrad)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <rect x="24" y="168" width="58" height="8" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="34" cy="172" r="2" fill="#0f172a"/>
      <circle cx="72" cy="172" r="2" fill="#0f172a"/>

      <polygon points="116,138 114,170 158,170 134,138" fill="url(#indCastIronGrad)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      <rect x="110" y="168" width="58" height="8" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="120" cy="172" r="2" fill="#0f172a"/>
      <circle cx="158" cy="172" r="2" fill="#0f172a"/>

      <!-- 3D Shaded Horizontal Exhaust Duct in Industrial Emerald Green -->
      <rect x="95" y="16" width="95" height="44" fill="#15803d" stroke="#166534" stroke-width="2" filter="url(#ind3dShadow)"/>
      <rect x="95" y="18" width="90" height="5" fill="#4ade80" opacity="0.7"/>
      <rect x="95" y="53" width="90" height="5" fill="#14532d" opacity="0.9"/>
      
      <!-- 3D Metallic Flange Collar -->
      <rect x="188" y="10" width="14" height="56" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="195" cy="19" r="2" fill="#0f172a"/>
      <circle cx="195" cy="38" r="2" fill="#0f172a"/>
      <circle cx="195" cy="57" r="2" fill="#0f172a"/>

      <!-- 3D Torus Volute Scroll Casing in Brushed Steel / Cast Iron -->
      <circle cx="95" cy="90" r="74" fill="url(#indSteelGradV)" stroke="#0f172a" stroke-width="2.5" filter="url(#ind3dShadow)"/>
      <circle cx="95" cy="90" r="64" fill="url(#indCastIronGrad)"/>
      <circle cx="95" cy="90" r="50" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="2"/>

      <!-- Center 3D Impeller Wheel Runner -->
      <g data-part-id="impeller_wheel">
        <!-- Deep Dark Recessed Eye Cavity -->
        <circle cx="95" cy="90" r="43" fill="#090d16" stroke="#1e293b" stroke-width="2"/>
        
        <!-- 6 3D Tapered Blades -->
        <use href="#id-fan-blade-3d"/>
        <use href="#id-fan-blade-3d" transform="rotate(60 95 90)"/>
        <use href="#id-fan-blade-3d" transform="rotate(120 95 90)"/>
        <use href="#id-fan-blade-3d" transform="rotate(180 95 90)"/>
        <use href="#id-fan-blade-3d" transform="rotate(240 95 90)"/>
        <use href="#id-fan-blade-3d" transform="rotate(300 95 90)"/>

        <!-- Machined Center Brass Hub Cap & Axle Bolt -->
        <circle cx="95" cy="90" r="15" fill="url(#indBrassGrad)" stroke="#0f172a" stroke-width="1.5"/>
        <circle cx="95" cy="90" r="7" fill="#334155" stroke="#0f172a" stroke-width="1"/>
        <circle cx="95" cy="90" r="3" fill="#f8fafc"/>
      </g>
    </svg>`)
  },
  {
    id: 'fans.fd_fan.centrifugal.flat2d',
    name: 'Forced Draft (FD) Supply Fan',
    sector: 'Fans & Blowers',
    category: 'Draft Fans',
    subcategory: 'FD Fans',
    tags: ['fan', 'fd fan', 'forced draft', 'combustion air', 'boiler', 'furnace', 'air supply', '2d'],
    styleVariant: 'flat2d',
    defaultW: 190,
    defaultH: 160,
    viewBox: '0 0 190 160',
    animationReady: true,
    animatableParts: ['impeller_wheel', 'inlet_vane_damper'],
    anchorPoints: [
      { id: 'inlet', name: 'Ambient Air Inlet (Center Eye)', x: 80, y: 80, type: 'duct', direction: 'front' },
      { id: 'discharge', name: 'Horizontal Burner Air Discharge', x: 170, y: 34, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 190 160" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <g id="fd-fan-blade-2d">
          <polygon points="80,44 75,70 80,70" fill="#38bdf8"/>
          <polygon points="80,44 80,70 85,70" fill="#0284c7"/>
          <line x1="80" y1="44" x2="80" y2="70" stroke="#ffffff" stroke-width="1"/>
        </g>
      </defs>

      <!-- Left Flanged Foot -->
      <polygon points="46,122 28,150 66,150 64,122" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="20" y="148" width="50" height="7" rx="1.5" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="28" cy="151.5" r="1.5" fill="#0f172a"/>
      <circle cx="62" cy="151.5" r="1.5" fill="#0f172a"/>

      <!-- Right Flanged Foot -->
      <polygon points="96,122 94,150 132,150 114,122" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="90" y="148" width="50" height="7" rx="1.5" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="98" cy="151.5" r="1.5" fill="#0f172a"/>
      <circle cx="132" cy="151.5" r="1.5" fill="#0f172a"/>

      <!-- Top-Right Horizontal Discharge Duct Nozzle (Machine Blue) -->
      <rect x="80" y="14" width="80" height="40" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
      <rect x="80" y="16" width="75" height="4" fill="#38bdf8" opacity="0.6"/>
      <rect x="80" y="48" width="75" height="4" fill="#0c4a6e" opacity="0.8"/>
      
      <!-- Flange Collar -->
      <rect x="158" y="9" width="12" height="50" rx="2" fill="#0369a1" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="164" cy="17" r="1.8" fill="#0f172a"/>
      <circle cx="164" cy="34" r="1.8" fill="#0f172a"/>
      <circle cx="164" cy="51" r="1.8" fill="#0f172a"/>

      <!-- Heavy Circular Volute Scroll Torus Casing (Grey Metallic Shaded) -->
      <circle cx="80" cy="80" r="66" fill="#94a3b8" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="80" cy="80" r="64" fill="#cbd5e1"/>
      <circle cx="80" cy="80" r="56" fill="#94a3b8"/>
      <circle cx="80" cy="80" r="45" fill="#64748b" stroke="#0f172a" stroke-width="2"/>

      <!-- Center Rotating 6-Blade Tapered Impeller Runner -->
      <g data-part-id="impeller_wheel">
        <circle cx="80" cy="80" r="38" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
        
        <use href="#fd-fan-blade-2d"/>
        <use href="#fd-fan-blade-2d" transform="rotate(60 80 80)"/>
        <use href="#fd-fan-blade-2d" transform="rotate(120 80 80)"/>
        <use href="#fd-fan-blade-2d" transform="rotate(180 80 80)"/>
        <use href="#fd-fan-blade-2d" transform="rotate(240 80 80)"/>
        <use href="#fd-fan-blade-2d" transform="rotate(300 80 80)"/>

        <!-- Central Hub Spinner Cone & Pin -->
        <circle cx="80" cy="80" r="13" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5"/>
        <circle cx="80" cy="80" r="5.5" fill="#0f172a"/>
        <circle cx="80" cy="80" r="2" fill="#ffffff"/>
      </g>
    </svg>`)
  },

  // =========================================================================
  // 2. INLINE DUCT FANS & VANE AXIAL FANS
  // =========================================================================
  {
    id: 'fans.duct.inline_tubular.flat2d',
    name: 'Tubular Inline Centrifugal Duct Fan',
    sector: 'Fans & Blowers',
    category: 'Duct Fans',
    subcategory: 'Inline Fans',
    tags: ['fan', 'duct fan', 'inline', 'tubular', 'hvac', 'exhaust', 'ventilation', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 100,
    viewBox: '0 0 180 100',
    animationReady: true,
    animatableParts: ['fan_rotor'],
    anchorPoints: [
      { id: 'inlet', name: 'Duct Inlet Flange', x: 8, y: 50, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Duct Discharge Flange', x: 172, y: 50, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 100" xmlns="http://www.w3.org/2000/svg">
      <!-- Cylindrical Heavy Duct Housing Tube -->
      <rect x="16" y="20" width="148" height="60" rx="2" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      
      <!-- Precision Flanged Inlet & Outlet Collars with Bolt Holes -->
      <rect x="8" y="14" width="10" height="72" rx="2" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="13" cy="22" r="1.5" fill="#0f172a"/>
      <circle cx="13" cy="50" r="1.5" fill="#0f172a"/>
      <circle cx="13" cy="78" r="1.5" fill="#0f172a"/>

      <rect x="162" y="14" width="10" height="72" rx="2" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="167" cy="22" r="1.5" fill="#0f172a"/>
      <circle cx="167" cy="50" r="1.5" fill="#0f172a"/>
      <circle cx="167" cy="78" r="1.5" fill="#0f172a"/>

      <!-- Aerodynamic Straightening Stator Vanes (Rear) -->
      <path d="M 115 36 L 140 28 M 115 50 L 145 50 M 115 64 L 140 72" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>

      <!-- Center Aerodynamic Motor Nacelle (Bullet) -->
      <path d="M 50 50 C 50 38, 70 38, 120 38 L 120 62 C 70 62, 50 62, 50 50 Z" fill="#1e293b" stroke="#0284c7" stroke-width="1.5"/>
      
      <!-- Mixed-Flow High-Pressure Rotor Blades -->
      <g data-part-id="fan_rotor">
        <path d="M 75 38 L 65 20 L 85 20 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 75 62 L 65 80 L 85 80 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <line x1="75" y1="20" x2="75" y2="80" stroke="#38bdf8" stroke-width="2.5"/>
        <circle cx="75" cy="50" r="10" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
      </g>

      <!-- External Weatherproof Electrical Terminal Box -->
      <rect x="72" y="8" width="36" height="14" rx="2" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/>
      <circle cx="80" cy="15" r="2" fill="#10b981"/>
      <line x1="90" y1="22" x2="90" y2="38" stroke="#38bdf8" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'fans.duct.inline_tubular.3d',
    name: 'Tubular Inline Duct Fan 3D',
    sector: 'Fans & Blowers',
    category: 'Duct Fans',
    subcategory: 'Inline Fans',
    tags: ['fan', 'duct fan', 'inline', 'tubular', '3d', 'hvac', 'metallic'],
    styleVariant: '3d',
    defaultW: 200,
    defaultH: 110,
    viewBox: '0 0 200 110',
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 8, y: 55, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Outlet Flange', x: 192, y: 55, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      <!-- 3D Galvanized Steel Cylindrical Duct Body -->
      <rect x="18" y="22" width="164" height="66" rx="2" fill="url(#indDuctZincGrad)" stroke="#0f172a" stroke-width="1.5" filter="url(#ind3dShadow)"/>
      
      <!-- Flanged Metallic Ends -->
      <rect x="8" y="14" width="12" height="82" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="14" cy="24" r="2" fill="#0f172a"/>
      <circle cx="14" cy="55" r="2" fill="#0f172a"/>
      <circle cx="14" cy="86" r="2" fill="#0f172a"/>

      <rect x="180" y="14" width="12" height="82" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="186" cy="24" r="2" fill="#0f172a"/>
      <circle cx="186" cy="55" r="2" fill="#0f172a"/>
      <circle cx="186" cy="86" r="2" fill="#0f172a"/>

      <!-- Center Aerodynamic Bullet Nacelle in 3D Cast Iron -->
      <path d="M 60 55 C 60 40, 85 40, 140 40 L 140 70 C 85 70, 60 70, 60 55 Z" fill="url(#indCastIronGrad)" stroke="#38bdf8" stroke-width="1.5"/>
      
      <!-- Mixed Flow 3D Impeller -->
      <g data-part-id="fan_rotor">
        <path d="M 85 40 L 72 22 L 96 22 Z" fill="url(#indMachineBlueGrad)" stroke="#0f172a" stroke-width="1"/>
        <path d="M 85 70 L 72 88 L 96 88 Z" fill="url(#indMachineBlueGrad)" stroke="#0f172a" stroke-width="1"/>
        <circle cx="85" cy="55" r="12" fill="url(#indBrassGrad)" stroke="#0f172a" stroke-width="1.5"/>
      </g>

      <!-- Terminal Junction Box -->
      <rect x="80" y="8" width="40" height="16" rx="2" fill="url(#indSteelGradH)" stroke="#0f172a" stroke-width="1.2"/>
      <circle cx="90" cy="16" r="2.5" fill="#10b981"/>
    </svg>`)
  },
  {
    id: 'fans.axial.vane_axial.flat2d',
    name: 'Heavy Duty Vane Axial Fan',
    sector: 'Fans & Blowers',
    category: 'Axial Fans',
    subcategory: 'Vane Axial',
    tags: ['fan', 'axial', 'vane axial', 'tunnel', 'mine ventilation', 'high pressure', '2d'],
    styleVariant: 'flat2d',
    defaultW: 190,
    defaultH: 120,
    viewBox: '0 0 190 120',
    animationReady: true,
    animatableParts: ['axial_blades'],
    anchorPoints: [
      { id: 'inlet', name: 'Inlet Flange', x: 8, y: 60, type: 'duct', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Guide Vane Discharge', x: 182, y: 60, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 190 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Heavy Barrel Duct Housing Tube -->
      <rect x="16" y="18" width="158" height="84" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      
      <!-- Inlet & Outlet Flanges with Bolt Pattern -->
      <rect x="7" y="10" width="10" height="100" rx="2" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="12" cy="20" r="1.5" fill="#0f172a"/>
      <circle cx="12" cy="60" r="1.5" fill="#0f172a"/>
      <circle cx="12" cy="100" r="1.5" fill="#0f172a"/>

      <rect x="173" y="10" width="10" height="100" rx="2" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="178" cy="20" r="1.5" fill="#0f172a"/>
      <circle cx="178" cy="60" r="1.5" fill="#0f172a"/>
      <circle cx="178" cy="100" r="1.5" fill="#0f172a"/>

      <!-- Downstream Aerodynamic Guide Vane Stator Blades -->
      <path d="M 115 28 C 130 36, 145 42, 155 46" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M 115 60 C 135 60, 145 60, 158 60" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M 115 92 C 130 84, 145 78, 155 74" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" fill="none"/>

      <!-- Central Motor Nacelle / Stator Tail Cone -->
      <rect x="95" y="42" width="60" height="36" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M 155 42 L 170 60 L 155 78 Z" fill="#475569" stroke="#0f172a" stroke-width="1"/>

      <!-- Controllable-Pitch Cast Aluminum Rotor Hub -->
      <g data-part-id="axial_blades">
        <!-- 8 Airfoil Blades Around Center (65, 60) -->
        <circle cx="65" cy="60" r="22" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
        <path d="M 65 38 L 57 18 L 73 18 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 65 82 L 57 102 L 73 102 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 43 60 L 23 52 L 23 68 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 87 60 L 107 52 L 107 68 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 49 44 L 35 30 L 47 20 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 81 76 L 95 90 L 83 100 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 49 76 L 35 90 L 47 100 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <path d="M 81 44 L 95 30 L 83 20 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>

        <!-- Streamlined Center Spinner Cap -->
        <circle cx="65" cy="60" r="9" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
      </g>
    </svg>`)
  },

  // =========================================================================
  // 3. ROOF VENTILATORS, EXHAUSTERS & SIROCCO BLOWERS
  // =========================================================================
  {
    id: 'fans.roof.upblast_exhauster.flat2d',
    name: 'Roof Upblast Power Exhauster',
    sector: 'Fans & Blowers',
    category: 'Roof Ventilators',
    subcategory: 'Power Exhausters',
    tags: ['fan', 'roof exhauster', 'upblast', 'restaurant', 'grease', 'hood', '2d'],
    styleVariant: 'flat2d',
    defaultW: 170,
    defaultH: 150,
    viewBox: '0 0 170 150',
    anchorPoints: [
      { id: 'curb', name: 'Roof Curb Inlet', x: 85, y: 145, type: 'duct', direction: 'bottom' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 170 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Roof Curb Mounting Flange Base -->
      <rect x="20" y="125" width="130" height="18" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
      <rect x="15" y="140" width="140" height="6" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Vertical Exhaust Airflow Windband Shroud -->
      <path d="M 32 65 L 26 125 L 144 125 L 138 65 Z" fill="#475569" stroke="#0f172a" stroke-width="2"/>

      <!-- Aerodynamic Spun-Aluminum Windband Dome & Hood -->
      <path d="M 18 65 C 18 25, 152 25, 152 65 L 140 68 C 140 38, 30 38, 30 68 Z" fill="#94a3b8" stroke="#0f172a" stroke-width="2"/>
      
      <!-- Top Direct-Drive Motor Cap Dome -->
      <ellipse cx="85" cy="36" rx="42" ry="16" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <ellipse cx="85" cy="33" rx="28" ry="10" fill="#64748b" stroke="#0f172a" stroke-width="1"/>
      <circle cx="85" cy="33" r="3.5" fill="#0f172a"/>

      <!-- Upblast Aerodynamic Discharge Direction Indicators -->
      <path d="M 38 60 L 26 38 M 32 38 L 26 38 L 26 44" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 132 60 L 144 38 M 138 38 L 144 38 L 144 44" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`)
  },
  {
    id: 'fans.blower.sirocco_double_inlet.flat2d',
    name: 'Double Inlet Sirocco Forward Curved Blower',
    sector: 'Fans & Blowers',
    category: 'Centrifugal Fans',
    subcategory: 'Sirocco Blowers',
    tags: ['fan', 'sirocco', 'forward curved', 'blower', 'double inlet', 'ahu', 'ventilation', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 150,
    viewBox: '0 0 180 150',
    animationReady: true,
    animatableParts: ['sirocco_wheel'],
    anchorPoints: [
      { id: 'suction', name: 'Suction Inlets', x: 75, y: 75, type: 'duct', direction: 'front' },
      { id: 'discharge', name: 'Horizontal Exhaust Flange', x: 160, y: 32, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Left Flanged Foot -->
      <polygon points="44,115 26,142 64,142 60,115" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="18" y="140" width="48" height="6" rx="1.5" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="26" cy="143" r="1.5" fill="#0f172a"/>
      <circle cx="60" cy="143" r="1.5" fill="#0f172a"/>

      <!-- Right Flanged Foot -->
      <polygon points="90,115 88,142 126,142 108,115" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="82" y="140" width="48" height="6" rx="1.5" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="90" cy="143" r="1.5" fill="#0f172a"/>
      <circle cx="124" cy="143" r="1.5" fill="#0f172a"/>

      <!-- Top-Right Horizontal Exhaust Duct -->
      <rect x="75" y="12" width="75" height="38" fill="#475569" stroke="#334155" stroke-width="2"/>
      <rect x="75" y="14" width="70" height="4" fill="#94a3b8" opacity="0.6"/>
      <rect x="75" y="44" width="70" height="4" fill="#1e293b" opacity="0.8"/>
      
      <!-- Flange Collar -->
      <rect x="148" y="8" width="12" height="46" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="154" cy="16" r="1.8" fill="#0f172a"/>
      <circle cx="154" cy="31" r="1.8" fill="#0f172a"/>
      <circle cx="154" cy="46" r="1.8" fill="#0f172a"/>

      <!-- Heavy Circular Volute Torus Casing (Grey Metallic Shaded) -->
      <circle cx="75" cy="75" r="62" fill="#94a3b8" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="75" cy="75" r="60" fill="#cbd5e1"/>
      <circle cx="75" cy="75" r="52" fill="#94a3b8"/>
      <circle cx="75" cy="75" r="42" fill="#64748b" stroke="#0f172a" stroke-width="2"/>

      <!-- Fine Forward-Curved Sirocco Multi-Blade Drum Wheel -->
      <g data-part-id="sirocco_wheel">
        <!-- Dark Center Cavity -->
        <circle cx="75" cy="75" r="38" fill="#0f172a" stroke="#1e293b" stroke-width="1.5"/>
        <circle cx="75" cy="75" r="28" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        
        <!-- 12 High-Density Forward Curved Sirocco Blades -->
        <path d="M 75 48 C 79 50, 82 54, 83 58" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 88 52 C 91 56, 93 61, 92 65" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 97 61 C 98 66, 98 71, 95 76" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 101 75 C 100 80, 98 85, 93 88" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 97 89 C 94 93, 90 96, 85 98" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 88 98 C 83 100, 78 101, 75 102" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 75 102 C 71 100, 68 96, 67 92" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 61 98 C 58 94, 56 89, 57 85" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 51 89 C 50 84, 50 79, 53 74" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 47 75 C 48 70, 50 65, 55 62" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 51 61 C 54 57, 58 54, 63 52" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <path d="M 61 52 C 66 50, 71 49, 75 48" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" fill="none"/>

        <!-- Center Hub & Axle Pin -->
        <circle cx="75" cy="75" r="11" fill="#38bdf8" stroke="#0f172a" stroke-width="1.5"/>
        <circle cx="75" cy="75" r="4" fill="#0f172a"/>
        <circle cx="75" cy="75" r="1.5" fill="#ffffff"/>
      </g>
    </svg>`)
  },

  // =========================================================================
  // 4. 2D SCADA & P&ID VENTILATION FAN GLYPHS (3, 4, 5, 6, 8, 12 BLADES)
  // =========================================================================
  {
    id: 'fans.axial.3_blade_aerofoil.flat2d',
    name: '3-Blade Axial Aerofoil Fan Glyph',
    sector: 'Fans & Blowers',
    category: 'Axial Fans',
    subcategory: 'Propeller Fans',
    tags: ['fan', '3 blade', 'axial', 'propeller', 'aerofoil', 'ventilation', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 140,
    viewBox: '0 0 140 140',
    animationReady: true,
    animatableParts: ['fan_rotor'],
    anchorPoints: [
      { id: 'intake', name: 'Center Hub', x: 70, y: 70, type: 'duct', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="70" r="62" fill="none" stroke="#0f172a" stroke-width="4"/>
      <g data-part-id="fan_rotor">
        <path d="M 70 70 C 65 40, 45 25, 70 12 C 95 25, 75 40, 70 70 Z" fill="#0f172a"/>
        <path d="M 70 70 C 65 40, 45 25, 70 12 C 95 25, 75 40, 70 70 Z" transform="rotate(120 70 70)" fill="#0f172a"/>
        <path d="M 70 70 C 65 40, 45 25, 70 12 C 95 25, 75 40, 70 70 Z" transform="rotate(240 70 70)" fill="#0f172a"/>
        <circle cx="70" cy="70" r="14" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
        <circle cx="70" cy="70" r="5" fill="#0f172a"/>
      </g>
    </svg>`)
  },
  {
    id: 'fans.axial.4_blade_aerofoil.flat2d',
    name: '4-Blade Aerofoil Ventilation Fan',
    sector: 'Fans & Blowers',
    category: 'Axial Fans',
    subcategory: 'Propeller Fans',
    tags: ['fan', '4 blade', 'axial', 'propeller', 'aerofoil', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 140,
    viewBox: '0 0 140 140',
    animationReady: true,
    animatableParts: ['fan_rotor'],
    anchorPoints: [
      { id: 'intake', name: 'Center Hub', x: 70, y: 70, type: 'duct', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="70" r="62" fill="none" stroke="#0f172a" stroke-width="4"/>
      <g data-part-id="fan_rotor">
        <path d="M 70 70 C 65 42, 48 28, 70 14 C 92 28, 75 42, 70 70 Z" fill="#0f172a"/>
        <path d="M 70 70 C 65 42, 48 28, 70 14 C 92 28, 75 42, 70 70 Z" transform="rotate(90 70 70)" fill="#0f172a"/>
        <path d="M 70 70 C 65 42, 48 28, 70 14 C 92 28, 75 42, 70 70 Z" transform="rotate(180 70 70)" fill="#0f172a"/>
        <path d="M 70 70 C 65 42, 48 28, 70 14 C 92 28, 75 42, 70 70 Z" transform="rotate(270 70 70)" fill="#0f172a"/>
        <circle cx="70" cy="70" r="14" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
        <circle cx="70" cy="70" r="5" fill="#0f172a"/>
      </g>
    </svg>`)
  },
  {
    id: 'fans.axial.5_blade_aerofoil.flat2d',
    name: '5-Blade Aerofoil Axial Fan',
    sector: 'Fans & Blowers',
    category: 'Axial Fans',
    subcategory: 'Propeller Fans',
    tags: ['fan', '5 blade', 'axial', 'propeller', 'exhaust', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 140,
    viewBox: '0 0 140 140',
    animationReady: true,
    animatableParts: ['fan_rotor'],
    anchorPoints: [
      { id: 'intake', name: 'Center Hub', x: 70, y: 70, type: 'duct', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="70" r="62" fill="none" stroke="#0f172a" stroke-width="4"/>
      <g data-part-id="fan_rotor">
        <path d="M 70 70 C 62 45, 45 30, 70 15 C 95 30, 78 45, 70 70 Z" fill="#0f172a"/>
        <path d="M 70 70 C 62 45, 45 30, 70 15 C 95 30, 78 45, 70 70 Z" transform="rotate(72 70 70)" fill="#0f172a"/>
        <path d="M 70 70 C 62 45, 45 30, 70 15 C 95 30, 78 45, 70 70 Z" transform="rotate(144 70 70)" fill="#0f172a"/>
        <path d="M 70 70 C 62 45, 45 30, 70 15 C 95 30, 78 45, 70 70 Z" transform="rotate(216 70 70)" fill="#0f172a"/>
        <path d="M 70 70 C 62 45, 45 30, 70 15 C 95 30, 78 45, 70 70 Z" transform="rotate(288 70 70)" fill="#0f172a"/>
        <circle cx="70" cy="70" r="14" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
        <circle cx="70" cy="70" r="5" fill="#0f172a"/>
      </g>
    </svg>`)
  },
  {
    id: 'fans.axial.8_blade_industrial.flat2d',
    name: '8-Blade Heavy Industrial Axial Fan',
    sector: 'Fans & Blowers',
    category: 'Axial Fans',
    subcategory: 'Mine & Tunnel Fans',
    tags: ['fan', '8 blade', 'industrial', 'axial', 'tunnel', 'heavy duty', '2d'],
    styleVariant: 'flat2d',
    defaultW: 140,
    defaultH: 140,
    viewBox: '0 0 140 140',
    animationReady: true,
    animatableParts: ['fan_rotor'],
    anchorPoints: [
      { id: 'intake', name: 'Center Hub', x: 70, y: 70, type: 'duct', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="70" r="62" fill="none" stroke="#0f172a" stroke-width="4"/>
      <g data-part-id="fan_rotor">
        <path d="M 66 70 L 62 20 L 78 20 L 74 70 Z" fill="#0f172a"/>
        <path d="M 66 70 L 62 20 L 78 20 L 74 70 Z" transform="rotate(45 70 70)" fill="#0f172a"/>
        <path d="M 66 70 L 62 20 L 78 20 L 74 70 Z" transform="rotate(90 70 70)" fill="#0f172a"/>
        <path d="M 66 70 L 62 20 L 78 20 L 74 70 Z" transform="rotate(135 70 70)" fill="#0f172a"/>
        <path d="M 66 70 L 62 20 L 78 20 L 74 70 Z" transform="rotate(180 70 70)" fill="#0f172a"/>
        <path d="M 66 70 L 62 20 L 78 20 L 74 70 Z" transform="rotate(225 70 70)" fill="#0f172a"/>
        <path d="M 66 70 L 62 20 L 78 20 L 74 70 Z" transform="rotate(270 70 70)" fill="#0f172a"/>
        <path d="M 66 70 L 62 20 L 78 20 L 74 70 Z" transform="rotate(315 70 70)" fill="#0f172a"/>
        <circle cx="70" cy="70" r="18" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
        <circle cx="70" cy="70" r="6" fill="#0f172a"/>
      </g>
    </svg>`)
  },
  {
    id: 'fans.cased.box_cooling_fan.flat2d',
    name: 'Cased Equipment Box Cooling Fan 2D',
    sector: 'Fans & Blowers',
    category: 'Axial Fans',
    subcategory: 'Box Fans',
    tags: ['fan', 'cooling fan', 'box fan', 'cabinet fan', 'cased', '2d'],
    styleVariant: 'flat2d',
    defaultW: 150,
    defaultH: 150,
    viewBox: '0 0 150 150',
    animationReady: true,
    animatableParts: ['fan_blades'],
    anchorPoints: [
      { id: 'mount', name: 'Mounting Center', x: 75, y: 75, type: 'mechanical', direction: 'front' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer Square Shroud with 4 Corner Mounting Holes -->
      <rect x="15" y="15" width="120" height="120" rx="16" fill="#0f172a"/>
      <circle cx="28" cy="28" r="4.5" fill="#ffffff"/>
      <circle cx="122" cy="28" r="4.5" fill="#ffffff"/>
      <circle cx="28" cy="122" r="4.5" fill="#ffffff"/>
      <circle cx="122" cy="122" r="4.5" fill="#ffffff"/>

      <!-- Center Venturi Eye Hole -->
      <circle cx="75" cy="75" r="50" fill="#ffffff"/>

      <!-- 7 Curved Sickle Blades -->
      <g data-part-id="fan_blades">
        <path d="M 75 48 C 88 44, 106 52, 110 65 C 102 70, 88 65, 75 62 Z" fill="#0f172a"/>
        <path d="M 75 48 C 88 44, 106 52, 110 65 C 102 70, 88 65, 75 62 Z" transform="rotate(51.4 75 75)" fill="#0f172a"/>
        <path d="M 75 48 C 88 44, 106 52, 110 65 C 102 70, 88 65, 75 62 Z" transform="rotate(102.8 75 75)" fill="#0f172a"/>
        <path d="M 75 48 C 88 44, 106 52, 110 65 C 102 70, 88 65, 75 62 Z" transform="rotate(154.2 75 75)" fill="#0f172a"/>
        <path d="M 75 48 C 88 44, 106 52, 110 65 C 102 70, 88 65, 75 62 Z" transform="rotate(205.7 75 75)" fill="#0f172a"/>
        <path d="M 75 48 C 88 44, 106 52, 110 65 C 102 70, 88 65, 75 62 Z" transform="rotate(257.1 75 75)" fill="#0f172a"/>
        <path d="M 75 48 C 88 44, 106 52, 110 65 C 102 70, 88 65, 75 62 Z" transform="rotate(308.5 75 75)" fill="#0f172a"/>
        <circle cx="75" cy="75" r="16" fill="#0f172a"/>
        <circle cx="75" cy="75" r="5" fill="#ffffff"/>
      </g>
    </svg>`)
  },
  {
    id: 'fans.inline.t_pipe_booster.flat2d',
    name: 'In-Line Duct Booster Fan on T-Pipe System',
    sector: 'Fans & Blowers',
    category: 'Inline Fans',
    subcategory: 'Duct Boosters',
    tags: ['fan', 'inline', 't pipe', 'booster', 'ventilation', 'piping', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 150,
    viewBox: '0 0 160 150',
    animationReady: true,
    animatableParts: ['fan_rotor'],
    anchorPoints: [
      { id: 'left_pipe', name: 'Left Header In', x: 10, y: 125, type: 'pipe', direction: 'left', flanged: true },
      { id: 'right_pipe', name: 'Right Header Out', x: 150, y: 125, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Horizontal T-Pipe System (Cyan / Blue) -->
      <line x1="10" y1="125" x2="150" y2="125" stroke="#0284c7" stroke-width="8"/>
      <line x1="80" y1="125" x2="80" y2="90" stroke="#0284c7" stroke-width="8"/>
      <rect x="18" y="115" width="6" height="20" rx="1" fill="#0369a1"/>
      <rect x="136" y="115" width="6" height="20" rx="1" fill="#0369a1"/>

      <!-- Circular Fan Housing Shroud -->
      <circle cx="80" cy="55" r="38" fill="#0369a1" stroke="#0f172a" stroke-width="3"/>
      <circle cx="80" cy="55" r="32" fill="#f8fafc"/>

      <!-- Rotating 6-Blade Aerofoil Impeller -->
      <g data-part-id="fan_rotor">
        <path d="M 80 55 C 75 36, 62 25, 80 18 C 98 25, 85 36, 80 55 Z" fill="#0f172a"/>
        <path d="M 80 55 C 75 36, 62 25, 80 18 C 98 25, 85 36, 80 55 Z" transform="rotate(60 80 55)" fill="#0f172a"/>
        <path d="M 80 55 C 75 36, 62 25, 80 18 C 98 25, 85 36, 80 55 Z" transform="rotate(120 80 55)" fill="#0f172a"/>
        <path d="M 80 55 C 75 36, 62 25, 80 18 C 98 25, 85 36, 80 55 Z" transform="rotate(180 80 55)" fill="#0f172a"/>
        <path d="M 80 55 C 75 36, 62 25, 80 18 C 98 25, 85 36, 80 55 Z" transform="rotate(240 80 55)" fill="#0f172a"/>
        <path d="M 80 55 C 75 36, 62 25, 80 18 C 98 25, 85 36, 80 55 Z" transform="rotate(300 80 55)" fill="#0f172a"/>
        <circle cx="80" cy="55" r="10" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>
      </g>
    </svg>`)
  },
  {
    id: 'fans.centrifugal.vortex_volute_glyph.flat2d',
    name: 'Centrifugal Vortex Volute Blower Glyph',
    sector: 'Fans & Blowers',
    category: 'Centrifugal Fans',
    subcategory: 'Vortex Blowers',
    tags: ['fan', 'blower', 'centrifugal', 'vortex', 'volute', 'glyph', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 150,
    viewBox: '0 0 160 150',
    animationReady: true,
    animatableParts: ['impeller_wheel'],
    anchorPoints: [
      { id: 'inlet', name: 'Suction Eye', x: 65, y: 75, type: 'duct', direction: 'front' },
      { id: 'discharge', name: 'Horizontal Discharge', x: 145, y: 35, type: 'duct', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Dual Base Support Legs -->
      <polygon points="40,110 32,138 52,138 55,110" fill="#0f172a"/>
      <polygon points="75,110 78,138 98,138 90,110" fill="#0f172a"/>

      <!-- Volute Scroll Body with Top-Right Horizontal Discharge Nozzle -->
      <path d="M 65 20 L 140 20 L 140 55 L 115 55 C 115 95, 95 120, 65 120 C 30 120, 15 95, 15 65 C 15 35, 35 20, 65 20 Z" fill="#0f172a"/>

      <!-- Center Vortex Eye Ring -->
      <circle cx="65" cy="70" r="36" fill="#ffffff"/>

      <!-- Rotating 6-Spoke Vortex Runner -->
      <g data-part-id="impeller_wheel">
        <path d="M 65 42 L 60 62 L 70 62 Z" fill="#0f172a"/>
        <path d="M 65 42 L 60 62 L 70 62 Z" transform="rotate(60 65 70)" fill="#0f172a"/>
        <path d="M 65 42 L 60 62 L 70 62 Z" transform="rotate(120 65 70)" fill="#0f172a"/>
        <path d="M 65 42 L 60 62 L 70 62 Z" transform="rotate(180 65 70)" fill="#0f172a"/>
        <path d="M 65 42 L 60 62 L 70 62 Z" transform="rotate(240 65 70)" fill="#0f172a"/>
        <path d="M 65 42 L 60 62 L 70 62 Z" transform="rotate(300 65 70)" fill="#0f172a"/>
        <circle cx="65" cy="70" r="10" fill="#0f172a"/>
        <circle cx="65" cy="70" r="4" fill="#ffffff"/>
      </g>
    </svg>`)
  }
];


