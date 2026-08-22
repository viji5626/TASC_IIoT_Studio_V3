import { SymbolMetadata } from '../../../types/symbol';
import { injectIndustrialDefs } from '../../shared/styles/industrialStyles';

/**
 * TASC IIoT Studio — Comprehensive Industrial Pumps & Compressors Graphics Library
 * Complete 2D & 3D Vector SVG definitions for:
 * - End-Suction & Skid Centrifugal Pumps
 * - Vertical In-Line Multistage Booster Pumps
 * - Rotary Tri-Lobe, Screw & Star-Gear Positive Displacement Pumps
 * - Submersible Drainage, Sump & Deep-Well Pumps
 * - Air Compressors on Pressure Receiver Tanks
 * - Duplex Pump Skids & Booster Stations
 * - Traditional Cast-Iron Well Pitcher Pumps
 */

export const PUMP_SYMBOLS: SymbolMetadata[] = [
  // =========================================================================
  // 1. CENTRIFUGAL & PROCESS PUMPS
  // =========================================================================
  {
    id: 'pumps.centrifugal.end_suction.flat2d',
    name: 'End-Suction Centrifugal Process Pump',
    sector: 'Pumps & Compressors',
    category: 'Centrifugal Pumps',
    subcategory: 'End-Suction Pumps',
    tags: ['pump', 'centrifugal', 'end suction', 'volute', 'water', 'process', 'ansi', 'iso', '2d'],
    styleVariant: 'flat2d',
    defaultW: 200,
    defaultH: 150,
    viewBox: '0 0 200 150',
    animationReady: true,
    animatableParts: ['volute_impeller'],
    anchorPoints: [
      { id: 'suction', name: 'Suction Inlet Flange', x: 20, y: 80, type: 'pipe', direction: 'left', flanged: true },
      { id: 'discharge', name: 'Discharge Outlet Flange', x: 75, y: 15, type: 'pipe', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Heavy Cast Iron Baseplate Frame -->
      <rect x="15" y="125" width="170" height="15" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="25" y="130" width="10" height="5" rx="1" fill="#0f172a"/>
      <rect x="160" y="130" width="10" height="5" rx="1" fill="#0f172a"/>

      <!-- Volute Spiral Pump Casing in Industrial Sky Blue -->
      <circle cx="75" cy="80" r="44" fill="#0284c7" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="75" cy="80" r="34" fill="#0369a1"/>
      <circle cx="75" cy="80" r="22" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      
      <!-- Suction Inlet Flange Nozzle (Left) -->
      <rect x="15" y="70" width="22" height="20" fill="#0369a1" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="10" y="65" width="8" height="30" rx="1.5" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.2"/>
      <circle cx="14" cy="72" r="1.5" fill="#0f172a"/>
      <circle cx="14" cy="88" r="1.5" fill="#0f172a"/>

      <!-- Top Discharge Outlet Nozzle -->
      <rect x="65" y="18" width="20" height="25" fill="#0369a1" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="60" y="12" width="30" height="8" rx="1.5" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.2"/>
      <circle cx="67" cy="16" r="1.5" fill="#0f172a"/>
      <circle cx="83" cy="16" r="1.5" fill="#0f172a"/>

      <!-- Rotating Impeller Blades -->
      <g data-part-id="volute_impeller">
        <circle cx="75" cy="80" r="8" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <line x1="75" y1="62" x2="75" y2="72" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="75" y1="88" x2="75" y2="98" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="57" y1="80" x2="67" y2="80" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="83" y1="80" x2="93" y2="80" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
      </g>

      <!-- Bearing Frame & Flexible Coupling Guard -->
      <rect x="110" y="65" width="20" height="35" rx="2" fill="#f59e0b" stroke="#0f172a" stroke-width="1.2"/>
      
      <!-- Electric Motor Drive (TEFC Finned Housing) -->
      <rect x="130" y="55" width="50" height="55" rx="4" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <line x1="142" y1="55" x2="142" y2="110" stroke="#0284c7" stroke-width="1.5"/>
      <line x1="156" y1="55" x2="156" y2="110" stroke="#0284c7" stroke-width="1.5"/>
      <line x1="170" y1="55" x2="170" y2="110" stroke="#0284c7" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'pumps.centrifugal.horizontal_tefc_process.flat2d',
    name: 'Horizontal Process Pump with TEFC Motor Set',
    sector: 'Pumps & Compressors',
    category: 'Centrifugal Pumps',
    subcategory: 'End-Suction Pumps',
    tags: ['pump', 'process pump', 'tefc motor', 'end suction', 'flanged', '2d'],
    styleVariant: 'flat2d',
    defaultW: 200,
    defaultH: 150,
    viewBox: '0 0 200 150',
    animationReady: true,
    animatableParts: ['volute_impeller'],
    anchorPoints: [
      { id: 'suction', name: 'Vertical Bottom Suction Flange', x: 45, y: 140, type: 'pipe', direction: 'bottom', flanged: true },
      { id: 'discharge', name: 'Vertical Top Discharge Flange', x: 45, y: 10, type: 'pipe', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Vertical Connecting Header Pipes (Cyan / Blue) -->
      <rect x="40" y="10" width="10" height="35" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
      <rect x="34" y="28" width="22" height="6" rx="1.5" fill="#0284c7" stroke="#0369a1" stroke-width="1.2"/>

      <rect x="40" y="105" width="10" height="35" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
      <rect x="34" y="115" width="22" height="6" rx="1.5" fill="#0284c7" stroke="#0369a1" stroke-width="1.2"/>

      <!-- Center Stainless/Steel Pump Volute Casing -->
      <rect x="22" y="45" width="46" height="60" rx="6" fill="#e2e8f0" stroke="#0f172a" stroke-width="2"/>
      <rect x="18" y="52" width="8" height="46" rx="2" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>
      
      <!-- Intermediate Drive Coupling Sleeve -->
      <rect x="68" y="68" width="22" height="14" rx="2" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Motor Mounting Foot -->
      <polygon points="105,105 95,130 145,130 135,105" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="90" y="128" width="60" height="6" rx="1.5" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Blue Industrial TEFC Electric Motor -->
      <rect x="90" y="45" width="65" height="60" rx="4" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <!-- Motor Ribs & Terminal Box -->
      <rect x="110" y="38" width="25" height="10" rx="2" fill="#0369a1" stroke="#0f172a" stroke-width="1.2"/>
      <circle cx="122" cy="43" r="1.5" fill="#f8fafc"/>
      <line x1="98" y1="45" x2="98" y2="105" stroke="#0369a1" stroke-width="2"/>
      <line x1="112" y1="45" x2="112" y2="105" stroke="#0369a1" stroke-width="2"/>
      <line x1="126" y1="45" x2="126" y2="105" stroke="#0369a1" stroke-width="2"/>
      <line x1="140" y1="45" x2="140" y2="105" stroke="#0369a1" stroke-width="2"/>
    </svg>`)
  },
  {
    id: 'pumps.centrifugal.skid_mounted_slurry.flat2d',
    name: 'Skid-Mounted Horizontal End-Suction Process Pump',
    sector: 'Pumps & Compressors',
    category: 'Centrifugal Pumps',
    subcategory: 'End-Suction Pumps',
    tags: ['pump', 'skid mounted', 'process', 'slurry', 'end suction', '2d'],
    styleVariant: 'flat2d',
    defaultW: 210,
    defaultH: 150,
    viewBox: '0 0 210 150',
    animationReady: true,
    animatableParts: ['volute_impeller'],
    anchorPoints: [
      { id: 'suction', name: 'Axial Front Suction Flange', x: 20, y: 80, type: 'pipe', direction: 'left', flanged: true },
      { id: 'discharge', name: 'Top Discharge Flange', x: 80, y: 15, type: 'pipe', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 210 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Structural Steel Channel Machine Skid -->
      <rect x="15" y="125" width="180" height="15" rx="2" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      
      <!-- Suction Pipe Spool (Left) -->
      <rect x="18" y="74" width="22" height="12" fill="#0284c7" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="12" y="68" width="6" height="24" rx="1" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.2"/>

      <!-- White/Stainless Steel Volute Chamber -->
      <path d="M 40 80 C 40 50, 75 45, 80 45 L 80 20 L 95 20 L 95 65 C 105 75, 105 95, 95 105 C 85 115, 55 115, 45 105 C 40 100, 40 90, 40 80 Z" fill="#f1f5f9" stroke="#0f172a" stroke-width="2"/>
      
      <!-- Top Discharge Flange -->
      <rect x="75" y="14" width="25" height="6" rx="1" fill="#0284c7" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="72" y="20" width="31" height="6" rx="1" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.2"/>

      <!-- Drive Shaft & Coupling Housing -->
      <rect x="95" y="72" width="25" height="16" fill="#64748b" stroke="#0f172a" stroke-width="1.2"/>

      <!-- Blue Direct-Coupled TEFC Motor -->
      <rect x="120" y="48" width="65" height="64" rx="5" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <rect x="140" y="40" width="25" height="10" rx="2" fill="#0369a1" stroke="#0f172a" stroke-width="1.2"/>
      <circle cx="152" cy="45" r="1.5" fill="#f8fafc"/>
      <line x1="130" y1="48" x2="130" y2="112" stroke="#0369a1" stroke-width="2"/>
      <line x1="145" y1="48" x2="145" y2="112" stroke="#0369a1" stroke-width="2"/>
      <line x1="160" y1="48" x2="160" y2="112" stroke="#0369a1" stroke-width="2"/>
      <line x1="175" y1="48" x2="175" y2="112" stroke="#0369a1" stroke-width="2"/>

      <!-- Motor Base Pedestal -->
      <rect x="135" y="112" width="35" height="13" fill="#1e293b" stroke="#0f172a" stroke-width="1.2"/>
    </svg>`)
  },
  {
    id: 'pumps.centrifugal.volute_radial_vane.flat2d',
    name: 'Centrifugal Volute Pump (Radial Multi-Vane)',
    sector: 'Pumps & Compressors',
    category: 'Centrifugal Pumps',
    subcategory: 'Volute Pumps',
    tags: ['pump', 'volute', 'radial vane', 'centrifugal', 'elevation', '2d'],
    styleVariant: 'flat2d',
    defaultW: 170,
    defaultH: 170,
    viewBox: '0 0 170 170',
    animationReady: true,
    animatableParts: ['volute_impeller'],
    anchorPoints: [
      { id: 'inlet', name: 'Center Suction Eye', x: 85, y: 90, type: 'pipe', direction: 'front' },
      { id: 'discharge', name: 'Vertical Top Discharge Flange', x: 45, y: 15, type: 'pipe', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg">
      <!-- Flanged Base Pedestal Foot -->
      <polygon points="55,130 40,158 130,158 115,130" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="32" y="156" width="106" height="8" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Vertical Top Discharge Nozzle (Left offset) -->
      <rect x="36" y="20" width="18" height="55" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
      <rect x="30" y="14" width="30" height="8" rx="1.5" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Circular Volute Pump Body in Vibrant Machine Cyan/Blue -->
      <circle cx="85" cy="90" r="56" fill="#0284c7" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="85" cy="90" r="46" fill="#0369a1"/>
      <circle cx="85" cy="90" r="38" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Radial Multi-Vane Impeller Hub -->
      <g data-part-id="volute_impeller">
        <!-- 8 Radial Spokes -->
        <circle cx="85" cy="90" r="28" fill="#0369a1" stroke="#38bdf8" stroke-width="1.5"/>
        <line x1="85" y1="64" x2="85" y2="76" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="85" y1="104" x2="85" y2="116" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="59" y1="90" x2="71" y2="90" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="99" y1="90" x2="111" y2="90" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="66" y1="71" x2="75" y2="80" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="95" y1="100" x2="104" y2="109" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="66" y1="109" x2="75" y2="100" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="95" y1="80" x2="104" y2="71" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Center Eye Hub -->
        <circle cx="85" cy="90" r="14" fill="#f8fafc" stroke="#0f172a" stroke-width="2"/>
        <circle cx="85" cy="90" r="6" fill="#0f172a"/>
      </g>
    </svg>`)
  },
  {
    id: 'pumps.centrifugal.volute_curved_vane.flat2d',
    name: 'Centrifugal Volute Pump (Curved Backward Vanes)',
    sector: 'Pumps & Compressors',
    category: 'Centrifugal Pumps',
    subcategory: 'Volute Pumps',
    tags: ['pump', 'volute', 'backward curved', 'centrifugal', 'elevation', '2d'],
    styleVariant: 'flat2d',
    defaultW: 170,
    defaultH: 170,
    viewBox: '0 0 170 170',
    animationReady: true,
    animatableParts: ['volute_impeller'],
    anchorPoints: [
      { id: 'inlet', name: 'Center Suction Eye', x: 85, y: 90, type: 'pipe', direction: 'front' },
      { id: 'discharge', name: 'Vertical Top Discharge Flange', x: 45, y: 15, type: 'pipe', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg">
      <!-- Flanged Base Pedestal Foot -->
      <polygon points="55,130 40,158 130,158 115,130" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="32" y="156" width="106" height="8" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Vertical Top Discharge Nozzle -->
      <rect x="36" y="20" width="18" height="55" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
      <rect x="30" y="14" width="30" height="8" rx="1.5" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Circular Volute Pump Body in Vibrant Machine Blue -->
      <circle cx="85" cy="90" r="56" fill="#0284c7" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="85" cy="90" r="44" fill="#0369a1"/>

      <!-- 6 Backward-Curved Streamlined Turbine Vanes -->
      <g data-part-id="volute_impeller">
        <circle cx="85" cy="90" r="38" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>
        <path d="M 85 70 C 95 68, 105 60, 111 51" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 102 80 C 110 87, 116 97, 118 107" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 102 100 C 95 108, 85 116, 73 120" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 85 110 C 75 112, 65 120, 59 129" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 68 100 C 60 93, 54 83, 52 73" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 68 80 C 75 72, 85 64, 97 60" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" fill="none"/>

        <!-- Center Eye Hub -->
        <circle cx="85" cy="90" r="14" fill="#f8fafc" stroke="#0f172a" stroke-width="2"/>
        <circle cx="85" cy="90" r="6" fill="#0f172a"/>
      </g>
    </svg>`)
  },
  {
    id: 'pumps.centrifugal.self_priming_monoblock.flat2d',
    name: 'Self-Priming Monoblock Water Pump',
    sector: 'Pumps & Compressors',
    category: 'Centrifugal Pumps',
    subcategory: 'Self-Priming',
    tags: ['pump', 'self priming', 'monoblock', 'water', 'engine pump', '2d'],
    styleVariant: 'flat2d',
    defaultW: 200,
    defaultH: 160,
    viewBox: '0 0 200 160',
    animationReady: true,
    animatableParts: ['volute_impeller'],
    anchorPoints: [
      { id: 'suction', name: 'Suction Inlet Flange', x: 20, y: 95, type: 'pipe', direction: 'left', flanged: true },
      { id: 'discharge', name: 'Top Discharge Flange', x: 75, y: 20, type: 'pipe', direction: 'top', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
      <!-- Cast Iron Base Stand -->
      <polygon points="45,135 25,155 185,155 165,135" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      
      <!-- Front Suction Spool -->
      <rect x="18" y="88" width="22" height="14" fill="#0284c7" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="12" y="82" width="6" height="26" rx="1" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.2"/>

      <!-- Self-Priming Chamber (White/Metallic) -->
      <path d="M 40 95 C 40 65, 65 60, 70 60 L 70 30 L 85 30 L 85 75 C 95 85, 95 105, 85 115 C 75 125, 50 125, 45 115 Z" fill="#e2e8f0" stroke="#0f172a" stroke-width="2"/>
      <rect x="68" y="24" width="19" height="6" rx="1" fill="#0284c7" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="65" y="18" width="25" height="6" rx="1" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.2"/>

      <!-- Drive Coupling Chamber -->
      <rect x="85" y="85" width="20" height="25" fill="#0f172a" stroke="#0f172a" stroke-width="1.2"/>

      <!-- Blue Engine / Motor Block with Top Aluminum Filler Cap -->
      <rect x="105" y="60" width="70" height="75" rx="5" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <!-- Top Aluminum Cap -->
      <rect x="125" y="48" width="30" height="12" rx="3" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="140" cy="42" r="3" fill="#f8fafc" stroke="#0f172a" stroke-width="1.2"/>
      
      <!-- Center Rotary Switch Knob -->
      <circle cx="140" cy="95" r="12" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
      <polygon points="140,86 144,95 140,104 136,95" fill="#0284c7"/>

      <!-- Motor Cooling Louver Slots -->
      <rect x="180" y="75" width="8" height="40" rx="2" fill="#0369a1" stroke="#0f172a" stroke-width="1"/>
      <line x1="184" y1="80" x2="184" y2="110" stroke="#f8fafc" stroke-width="1.5"/>
    </svg>`)
  },

  // =========================================================================
  // 2. VERTICAL & IN-LINE MULTISTAGE BOOSTER PUMPS
  // =========================================================================
  {
    id: 'pumps.vertical.inline_multistage_cr.flat2d',
    name: 'Vertical In-Line Multi-Stage Booster Pump',
    sector: 'Pumps & Compressors',
    category: 'Vertical Pumps',
    subcategory: 'Multi-Stage In-Line',
    tags: ['pump', 'vertical', 'multistage', 'cr pump', 'booster', 'inline', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 220,
    viewBox: '0 0 160 220',
    anchorPoints: [
      { id: 'inlet', name: 'Horizontal In-Line Suction', x: 10, y: 195, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Horizontal In-Line Discharge', x: 150, y: 195, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
      <!-- Horizontal Connecting In-Line Piping (Cyan) -->
      <rect x="5" y="190" width="30" height="12" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
      <rect x="25" y="184" width="6" height="24" rx="1" fill="#0284c7" stroke="#0369a1" stroke-width="1.2"/>

      <rect x="125" y="190" width="30" height="12" fill="#0284c7" stroke="#0369a1" stroke-width="1.5"/>
      <rect x="129" y="184" width="6" height="24" rx="1" fill="#0284c7" stroke="#0369a1" stroke-width="1.2"/>

      <!-- Cast Iron Bottom Pump Base with In-Line Ports -->
      <rect x="35" y="180" width="90" height="30" rx="4" fill="#e2e8f0" stroke="#0f172a" stroke-width="2"/>
      <rect x="28" y="206" width="104" height="6" rx="1.5" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Stainless Steel Multi-Stage Chamber Stack Sleeve -->
      <rect x="42" y="90" width="76" height="90" rx="3" fill="#f8fafc" stroke="#0f172a" stroke-width="2"/>
      <!-- Internal Stage Chamber Dividing Rings -->
      <line x1="42" y1="112" x2="118" y2="112" stroke="#cbd5e1" stroke-width="2"/>
      <line x1="42" y1="135" x2="118" y2="135" stroke="#cbd5e1" stroke-width="2"/>
      <line x1="42" y1="158" x2="118" y2="158" stroke="#cbd5e1" stroke-width="2"/>

      <!-- Motor Stool & Mechanical Seal Housing -->
      <rect x="50" y="68" width="60" height="22" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="62" y="72" width="36" height="14" rx="2" fill="#0f172a"/>

      <!-- Vertical Industrial Blue TEFC Motor -->
      <rect x="42" y="12" width="76" height="56" rx="5" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <rect x="118" y="28" width="12" height="24" rx="2" fill="#0369a1" stroke="#0f172a" stroke-width="1.2"/>
      <circle cx="124" cy="40" r="1.5" fill="#f8fafc"/>
      <line x1="56" y1="12" x2="56" y2="68" stroke="#0369a1" stroke-width="2"/>
      <line x1="72" y1="12" x2="72" y2="68" stroke="#0369a1" stroke-width="2"/>
      <line x1="88" y1="12" x2="88" y2="68" stroke="#0369a1" stroke-width="2"/>
      <line x1="104" y1="12" x2="104" y2="68" stroke="#0369a1" stroke-width="2"/>
    </svg>`)
  },
  {
    id: 'pumps.inline.vertical_can.flat2d',
    name: 'Vertical In-Line Canister Process Pump',
    sector: 'Pumps & Compressors',
    category: 'Vertical Pumps',
    subcategory: 'Canister Pumps',
    tags: ['pump', 'vertical can', 'inline', 'filter', 'process', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 180,
    viewBox: '0 0 160 180',
    anchorPoints: [
      { id: 'inlet', name: 'In-Line Suction', x: 10, y: 35, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'In-Line Discharge', x: 150, y: 35, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg">
      <!-- Horizontal Top Process Pipeline Header with Flanged Collars -->
      <rect x="10" y="28" width="140" height="14" fill="#0f172a" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="25" y="22" width="8" height="26" rx="1.5" fill="#0f172a"/>
      <rect x="127" y="22" width="8" height="26" rx="1.5" fill="#0f172a"/>

      <!-- Dome Cap & Motor Flange -->
      <path d="M 45 28 C 45 15, 115 15, 115 28 Z" fill="#0f172a"/>

      <!-- Vertical Finned Canister Housing -->
      <rect x="35" y="42" width="90" height="95" rx="4" fill="#0f172a"/>
      <!-- Side Discharge Port / Terminal Boss -->
      <rect x="125" y="55" width="22" height="36" rx="2" fill="#0f172a"/>

      <!-- Internal Vertical Cooling Ribs / Filter Elements -->
      <line x1="50" y1="55" x2="50" y2="105" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="62" y1="55" x2="62" y2="105" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="74" y1="55" x2="74" y2="105" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="86" y1="55" x2="86" y2="105" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="98" y1="55" x2="98" y2="105" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="110" y1="55" x2="110" y2="105" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>

      <!-- Bottom Sump Bowl -->
      <polygon points="35,137 50,165 110,165 125,137" fill="#0f172a"/>
      <rect x="48" y="160" width="64" height="4" fill="#ffffff"/>
    </svg>`)
  },
  {
    id: 'pumps.inline.booster_metering.flat2d',
    name: 'Pipeline Booster & Chemical Metering Pump',
    sector: 'Pumps & Compressors',
    category: 'Vertical Pumps',
    subcategory: 'Metering Pumps',
    tags: ['pump', 'metering', 'booster', 'pipeline', 'valve mount', '2d'],
    styleVariant: 'flat2d',
    defaultW: 160,
    defaultH: 180,
    viewBox: '0 0 160 180',
    anchorPoints: [
      { id: 'pipe_top', name: 'Vertical Pipe In', x: 45, y: 10, type: 'pipe', direction: 'top' },
      { id: 'pipe_bottom', name: 'Vertical Pipe Out', x: 45, y: 170, type: 'pipe', direction: 'bottom' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg">
      <!-- Vertical Flow Pipe Column with Isolation Flanges -->
      <rect x="40" y="10" width="10" height="160" fill="#0f172a"/>
      <rect x="34" y="30" width="22" height="6" rx="1" fill="#0f172a"/>
      <rect x="34" y="115" width="22" height="6" rx="1" fill="#0f172a"/>
      
      <!-- Manual Handwheel Lever on Pipe -->
      <line x1="45" y1="145" x2="70" y2="145" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>

      <!-- Pipeline Check / Flow Chamber Valve Eye -->
      <circle cx="45" cy="80" r="16" fill="#ffffff" stroke="#0f172a" stroke-width="4"/>
      <circle cx="45" cy="80" r="5" fill="#0f172a"/>

      <!-- Horizontal Drive Shaft & Metering Adapter -->
      <rect x="61" y="74" width="25" height="12" fill="#0f172a"/>

      <!-- Horizontal Finned Metering Motor -->
      <path d="M 86 62 L 100 48 L 150 48 L 150 112 L 100 112 L 86 98 Z" fill="#0f172a"/>
      <rect x="110" y="38" width="20" height="10" rx="2" fill="#0f172a"/>

      <!-- White Cooling Fins -->
      <line x1="106" y1="60" x2="140" y2="60" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="106" y1="73" x2="140" y2="73" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="106" y1="87" x2="140" y2="87" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="106" y1="100" x2="140" y2="100" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    </svg>`)
  },

  // =========================================================================
  // 3. POSITIVE DISPLACEMENT (LOBE, SCREW, STAR GEAR & TURBINE PUMPS)
  // =========================================================================
  {
    id: 'pumps.lobe.rotary_tri_lobe.flat2d',
    name: 'Rotary Tri-Lobe Roots Blower Pump',
    sector: 'Pumps & Compressors',
    category: 'Positive Displacement',
    subcategory: 'Lobe Pumps',
    tags: ['pump', 'tri lobe', 'roots blower', 'positive displacement', 'viscous', 'sanitary', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 180,
    viewBox: '0 0 180 180',
    animationReady: true,
    animatableParts: ['tri_lobe_rotors'],
    anchorPoints: [
      { id: 'inlet', name: 'Horizontal Inflow Port', x: 10, y: 90, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Horizontal Outflow Port', x: 170, y: 90, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Single 3-Lobe Rotor Geometry -->
        <g id="tri-lobe-unit">
          <circle cx="90" cy="62" r="8" fill="#ffffff"/>
          <path d="M 90 40 C 98 40, 102 52, 98 58 C 104 55, 115 62, 110 70 C 105 78, 95 72, 90 74 C 85 72, 75 78, 70 70 C 65 62, 76 55, 82 58 C 78 52, 82 40, 90 40 Z" fill="#ffffff"/>
          <circle cx="90" cy="62" r="5" fill="#0f172a"/>
        </g>
      </defs>

      <!-- Left & Right Flanged Ports -->
      <rect x="10" y="80" width="30" height="20" fill="#0f172a"/>
      <rect x="15" y="74" width="6" height="32" rx="1" fill="#0f172a"/>
      <rect x="27" y="74" width="6" height="32" rx="1" fill="#0f172a"/>

      <rect x="140" y="80" width="30" height="20" fill="#0f172a"/>
      <rect x="147" y="74" width="6" height="32" rx="1" fill="#0f172a"/>
      <rect x="159" y="74" width="6" height="32" rx="1" fill="#0f172a"/>

      <!-- Heavy Oval Figure-8 Rotor Housing -->
      <rect x="40" y="20" width="100" height="140" rx="48" fill="#0f172a"/>
      <rect x="48" y="28" width="84" height="124" rx="40" fill="#0f172a" stroke="#ffffff" stroke-width="4"/>

      <!-- Dual Counter-Rotating Tri-Lobe Rotors -->
      <g data-part-id="tri_lobe_rotors">
        <!-- Upper Tri-Lobe -->
        <use href="#tri-lobe-unit"/>
        <!-- Lower Tri-Lobe (Rotated & Offset) -->
        <g transform="translate(0, 56)">
          <use href="#tri-lobe-unit" transform="rotate(60 90 62)"/>
        </g>
      </g>
    </svg>`)
  },
  {
    id: 'pumps.lobe.twin_rotor_screw.flat2d',
    name: 'Twin-Rotor Screw Pump / Lobe Blower',
    sector: 'Pumps & Compressors',
    category: 'Positive Displacement',
    subcategory: 'Screw Pumps',
    tags: ['pump', 'screw pump', 'twin rotor', 'lobe blower', 'positive displacement', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 180,
    viewBox: '0 0 180 180',
    animationReady: true,
    animatableParts: ['twin_screws'],
    anchorPoints: [
      { id: 'suction', name: 'Vertical Top Suction Port', x: 90, y: 15, type: 'pipe', direction: 'top', flanged: true },
      { id: 'discharge', name: 'Vertical Bottom Discharge Port', x: 90, y: 165, type: 'pipe', direction: 'bottom', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <!-- Top & Bottom Vertical Flanged Ports -->
      <rect x="80" y="10" width="20" height="35" fill="#0f172a"/>
      <rect x="74" y="12" width="32" height="8" rx="1.5" fill="#0f172a"/>

      <rect x="80" y="135" width="20" height="35" fill="#0f172a"/>
      <rect x="74" y="160" width="32" height="8" rx="1.5" fill="#0f172a"/>

      <!-- Horizontal Oval Dual-Chamber Housing -->
      <rect x="25" y="45" width="130" height="90" rx="44" fill="#0f172a"/>
      <rect x="33" y="53" width="114" height="74" rx="36" fill="#0f172a" stroke="#ffffff" stroke-width="4"/>

      <!-- Dual Intermeshing Helical Screw Rotors -->
      <g data-part-id="twin_screws">
        <!-- Left Rotor -->
        <circle cx="68" cy="90" r="28" fill="#ffffff"/>
        <path d="M 68 62 C 84 62, 84 118, 68 118 Z" fill="#0f172a"/>
        <circle cx="68" cy="90" r="8" fill="#0f172a"/>
        <circle cx="68" cy="90" r="3.5" fill="#ffffff"/>

        <!-- Right Rotor -->
        <circle cx="112" cy="90" r="28" fill="#ffffff"/>
        <path d="M 112 62 C 96 62, 96 118, 112 118 Z" fill="#0f172a"/>
        <circle cx="112" cy="90" r="8" fill="#0f172a"/>
        <circle cx="112" cy="90" r="3.5" fill="#ffffff"/>
      </g>
    </svg>`)
  },
  {
    id: 'pumps.gear.external_star_gear.flat2d',
    name: 'External Star-Gear Precision Pump',
    sector: 'Pumps & Compressors',
    category: 'Positive Displacement',
    subcategory: 'Gear Pumps',
    tags: ['pump', 'gear pump', 'star gear', 'hydraulic', 'lube oil', 'high pressure', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 180,
    viewBox: '0 0 180 180',
    animationReady: true,
    animatableParts: ['intermeshing_gears'],
    anchorPoints: [
      { id: 'inlet', name: 'Horizontal Inflow Port', x: 10, y: 90, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Horizontal Outflow Port', x: 170, y: 90, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 8-Point Star Gear Shape -->
        <g id="star-gear-unit">
          <circle cx="90" cy="62" r="26" fill="#ffffff"/>
          <polygon points="90,38 95,50 107,45 104,57 114,62 104,67 107,79 95,74 90,86 85,74 73,79 76,67 66,62 76,57 73,45 85,50" fill="#0f172a"/>
          <circle cx="90" cy="62" r="8" fill="#ffffff"/>
          <circle cx="90" cy="62" r="3.5" fill="#0f172a"/>
        </g>
      </defs>

      <!-- Left & Right Flanged Ports -->
      <rect x="10" y="80" width="35" height="20" fill="#0f172a"/>
      <rect x="25" y="74" width="8" height="32" rx="1.5" fill="#0f172a"/>

      <rect x="135" y="80" width="35" height="20" fill="#0f172a"/>
      <rect x="147" y="74" width="8" height="32" rx="1.5" fill="#0f172a"/>

      <!-- Vertical Figure-8 Gear Pump Housing -->
      <rect x="40" y="20" width="100" height="140" rx="48" fill="#0f172a"/>
      <rect x="48" y="28" width="84" height="124" rx="40" fill="#0f172a" stroke="#ffffff" stroke-width="4"/>

      <!-- Dual Intermeshing Star Gears -->
      <g data-part-id="intermeshing_gears">
        <!-- Upper Star Gear -->
        <use href="#star-gear-unit"/>
        <!-- Lower Star Gear (Rotated & Offset) -->
        <g transform="translate(0, 56)">
          <use href="#star-gear-unit" transform="rotate(22.5 90 62)"/>
        </g>
      </g>
    </svg>`)
  },
  {
    id: 'pumps.turbine.inline_regenerative.flat2d',
    name: 'Horizontal In-Line Regenerative Turbine Pump',
    sector: 'Pumps & Compressors',
    category: 'Centrifugal Pumps',
    subcategory: 'Turbine Pumps',
    tags: ['pump', 'regenerative', 'turbine pump', 'high head', 'inline', '2d'],
    styleVariant: 'flat2d',
    defaultW: 200,
    defaultH: 160,
    viewBox: '0 0 200 160',
    animationReady: true,
    animatableParts: ['turbine_wheel'],
    anchorPoints: [
      { id: 'inlet', name: 'Left In-Line Flange', x: 15, y: 90, type: 'pipe', direction: 'left', flanged: true },
      { id: 'outlet', name: 'Right In-Line Flange', x: 185, y: 90, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
      <!-- Flanged Base Pedestal Foot -->
      <polygon points="70,120 50,150 150,150 130,120" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="42" y="148" width="116" height="8" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Horizontal In-Line Left & Right Pipe Spools with Metallic Flanges -->
      <rect x="20" y="82" width="40" height="16" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
      <rect x="14" y="74" width="8" height="32" rx="1.5" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="18" cy="80" r="1.5" fill="#0f172a"/>
      <circle cx="18" cy="100" r="1.5" fill="#0f172a"/>

      <rect x="140" y="82" width="40" height="16" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
      <rect x="178" y="74" width="8" height="32" rx="1.5" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="182" cy="80" r="1.5" fill="#0f172a"/>
      <circle cx="182" cy="100" r="1.5" fill="#0f172a"/>

      <!-- Center Blue Turbine Casing -->
      <circle cx="100" cy="80" r="54" fill="#0284c7" stroke="#0f172a" stroke-width="2.5"/>
      <circle cx="100" cy="80" r="44" fill="#0369a1"/>
      <circle cx="100" cy="80" r="36" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Regenerative Multi-Blade Peripheral Wheel -->
      <g data-part-id="turbine_wheel">
        <circle cx="100" cy="80" r="26" fill="#0369a1" stroke="#38bdf8" stroke-width="1.5"/>
        <line x1="100" y1="56" x2="100" y2="68" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="100" y1="92" x2="100" y2="104" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="76" y1="80" x2="88" y2="80" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="112" y1="80" x2="124" y2="80" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="83" y1="63" x2="91" y2="71" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="109" y1="89" x2="117" y2="97" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="83" y1="97" x2="91" y2="89" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="109" y1="71" x2="117" y2="63" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Center Hub -->
        <circle cx="100" cy="80" r="12" fill="#f8fafc" stroke="#0f172a" stroke-width="2"/>
        <circle cx="100" cy="80" r="5" fill="#0f172a"/>
      </g>
    </svg>`)
  },

  // =========================================================================
  // 4. SUBMERSIBLE, SUMP & WELL HAND PUMPS
  // =========================================================================
  {
    id: 'pumps.submersible.drainage_sump.flat2d',
    name: 'Industrial Submersible Drainage & Sump Pump',
    sector: 'Pumps & Compressors',
    category: 'Submersible & Sump',
    subcategory: 'Drainage Pumps',
    tags: ['pump', 'submersible', 'sump', 'drainage', 'wastewater', 'handle', '2d'],
    styleVariant: 'flat2d',
    defaultW: 170,
    defaultH: 200,
    viewBox: '0 0 170 200',
    animationReady: true,
    animatableParts: ['submersible_rotor'],
    anchorPoints: [
      { id: 'discharge', name: 'Right Hose/Pipe Discharge Fitting', x: 155, y: 145, type: 'pipe', direction: 'right' },
      { id: 'suction', name: 'Bottom Suction Strainer', x: 80, y: 185, type: 'pipe', direction: 'bottom' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 170 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Power Cable with Cable Gland (Left) -->
      <path d="M 45 45 L 20 45 L 20 165 L 10 165" stroke="#334155" stroke-width="4" stroke-linecap="round" fill="none"/>

      <!-- Top Ergonomic Carry Handle -->
      <path d="M 52 40 L 52 20 L 108 20 L 108 40" stroke="#0284c7" stroke-width="6" stroke-linecap="round" fill="none"/>
      
      <!-- Top Motor Head Shell in Vibrant Cyan -->
      <rect x="42" y="38" width="76" height="22" rx="4" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>

      <!-- Stainless Steel Cylindrical Motor Sleeve -->
      <rect x="50" y="60" width="60" height="75" fill="#e2e8f0" stroke="#0f172a" stroke-width="2"/>
      <line x1="68" y1="60" x2="68" y2="135" stroke="#94a3b8" stroke-width="2.5"/>
      <line x1="92" y1="60" x2="92" y2="135" stroke="#94a3b8" stroke-width="2.5"/>

      <!-- Bottom Pump Volute & Strainer Footing -->
      <rect x="42" y="135" width="76" height="38" rx="4" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <!-- Suction Slots -->
      <rect x="52" y="152" width="6" height="12" rx="1" fill="#0f172a"/>
      <rect x="68" y="152" width="6" height="12" rx="1" fill="#0f172a"/>
      <rect x="84" y="152" width="6" height="12" rx="1" fill="#0f172a"/>
      <rect x="100" y="152" width="6" height="12" rx="1" fill="#0f172a"/>
      <rect x="40" y="173" width="80" height="8" rx="2" fill="#0369a1" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Right Side Discharge Fitting Collar & Hose Adaptor -->
      <rect x="118" y="140" width="18" height="24" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="136" y="130" width="22" height="38" rx="3" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <!-- Hose Ribs -->
      <line x1="142" y1="130" x2="142" y2="145" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="148" y1="130" x2="148" y2="145" stroke="#cbd5e1" stroke-width="1.5"/>
      <line x1="154" y1="130" x2="154" y2="145" stroke="#cbd5e1" stroke-width="1.5"/>
    </svg>`)
  },
  {
    id: 'pumps.manual.hand_pitcher_well.flat2d',
    name: 'Traditional Cast Iron Hand Well Pitcher Pump',
    sector: 'Pumps & Compressors',
    category: 'Manual & Well Pumps',
    subcategory: 'Pitcher Pumps',
    tags: ['pump', 'manual', 'hand pump', 'well', 'pitcher', 'cast iron', 'water', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 210,
    viewBox: '0 0 180 210',
    anchorPoints: [
      { id: 'spout', name: 'Water Discharge Spout', x: 25, y: 145, type: 'pipe', direction: 'left' },
      { id: 'well_casing', name: 'Bottom Well Casing Flange', x: 120, y: 200, type: 'pipe', direction: 'bottom', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 210" xmlns="http://www.w3.org/2000/svg">
      <!-- Well Head Floor Flange & Column Pipe -->
      <rect x="110" y="150" width="20" height="50" fill="#cbd5e1" stroke="#0f172a" stroke-width="2"/>
      <rect x="95" y="196" width="50" height="8" rx="2" fill="#cbd5e1" stroke="#0f172a" stroke-width="2"/>

      <!-- Blue Cast-Iron Cylinder Body -->
      <rect x="100" y="100" width="40" height="60" rx="6" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <circle cx="120" cy="130" r="24" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>

      <!-- Downward Curved Water Discharge Spout (Left) -->
      <path d="M 100 135 C 70 135, 60 145, 50 145 L 40 145 L 40 152 L 55 152 C 68 152, 80 145, 100 145 Z" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>

      <!-- Pump Head Cap & Operating Pivot Linkage (Metallic Grey) -->
      <rect x="106" y="70" width="28" height="35" rx="3" fill="#cbd5e1" stroke="#0f172a" stroke-width="2"/>
      <circle cx="120" cy="80" r="4" fill="#0f172a"/>

      <!-- Long Operating Lever Handle (Right Angled) -->
      <path d="M 120 80 L 140 95 L 180 125" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round"/>
      <circle cx="140" cy="95" r="3" fill="#0f172a"/>
    </svg>`)
  },

  // =========================================================================
  // 5. AIR COMPRESSORS & PUMP SKID STATIONS
  // =========================================================================
  {
    id: 'compressors.reciprocating.tank_mounted.flat2d',
    name: 'Air Compressor on Horizontal Pressure Receiver Tank',
    sector: 'Pumps & Compressors',
    category: 'Air Compressors',
    subcategory: 'Tank-Mounted',
    tags: ['compressor', 'air receiver', 'tank', 'pneumatic', 'reciprocating', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 180,
    viewBox: '0 0 180 180',
    animationReady: true,
    animatableParts: ['compressor_motor'],
    anchorPoints: [
      { id: 'air_outlet', name: 'Compressed Air Outlet', x: 160, y: 80, type: 'pipe', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <!-- Horizontal Air Receiver Pressure Vessel Tank -->
      <rect x="25" y="90" width="130" height="65" rx="20" fill="#0f172a"/>
      <!-- Tank Support Feet -->
      <rect x="42" y="155" width="8" height="12" rx="2" fill="#0f172a"/>
      <rect x="130" y="155" width="8" height="12" rx="2" fill="#0f172a"/>

      <!-- Top Compressor Mounting Platform Bed -->
      <rect x="60" y="82" width="60" height="8" fill="#0f172a"/>

      <!-- Top-Mounted Reciprocating Compressor Head & Motor Unit -->
      <path d="M 35 48 L 50 28 L 130 28 L 150 55 L 130 82 L 50 82 Z" fill="#0f172a"/>
      
      <!-- Top Pressure Safety Relief Valve Cap -->
      <rect x="75" y="18" width="30" height="10" rx="3" fill="#0f172a"/>

      <!-- Finned Compressor Cylinders (White Ribs) -->
      <line x1="62" y1="42" x2="115" y2="42" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="62" y1="55" x2="115" y2="55" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="62" y1="68" x2="115" y2="68" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>

      <!-- Discharge Delivery Loop Pipe into Tank -->
      <path d="M 148 55 L 165 55 L 165 110 L 155 110" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`)
  },
  {
    id: 'pumps.skid.duplex_booster_station.flat2d',
    name: 'Duplex Dual-Pump Booster Station with Manifold',
    sector: 'Pumps & Compressors',
    category: 'Pump Systems & Skids',
    subcategory: 'Duplex Skids',
    tags: ['pump', 'duplex', 'skid', 'manifold', 'booster station', 'dual pump', '2d'],
    styleVariant: 'flat2d',
    defaultW: 200,
    defaultH: 160,
    viewBox: '0 0 200 160',
    anchorPoints: [
      { id: 'header_in', name: 'Suction Header', x: 20, y: 35, type: 'pipe', direction: 'left', flanged: true },
      { id: 'header_out', name: 'Discharge Header', x: 180, y: 35, type: 'pipe', direction: 'right', flanged: true }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
      <!-- Top Common Manifold Header Pipe with Isolation Valves -->
      <line x1="20" y1="35" x2="180" y2="35" stroke="#0f172a" stroke-width="6"/>
      <rect x="45" y="27" width="10" height="16" rx="2" fill="#0284c7" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="105" y="27" width="10" height="16" rx="2" fill="#0284c7" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="155" y="27" width="10" height="16" rx="2" fill="#0284c7" stroke="#0f172a" stroke-width="1.2"/>

      <!-- Branch 1 Drop Pipe & Pump 1 Volute -->
      <line x1="75" y1="35" x2="75" y2="90" stroke="#0f172a" stroke-width="5"/>
      <rect x="68" y="55" width="14" height="10" rx="1.5" fill="#0284c7"/>
      <circle cx="75" cy="110" r="24" fill="#0284c7" stroke="#0f172a" stroke-width="4"/>
      <circle cx="75" cy="110" r="14" fill="#ffffff"/>
      <circle cx="75" cy="110" r="6" fill="#0f172a"/>

      <!-- Branch 2 Drop Pipe & Pump 2 Volute -->
      <line x1="135" y1="35" x2="135" y2="90" stroke="#0f172a" stroke-width="5"/>
      <rect x="128" y="55" width="14" height="10" rx="1.5" fill="#0284c7"/>
      <circle cx="135" cy="110" r="24" fill="#0284c7" stroke="#0f172a" stroke-width="4"/>
      <circle cx="135" cy="110" r="14" fill="#ffffff"/>
      <circle cx="135" cy="110" r="6" fill="#0f172a"/>
    </svg>`)
  },
  {
    id: 'pumps.booster.tank_booster_station.flat2d',
    name: 'Pressure Booster Pump Station with Diaphragm Tank',
    sector: 'Pumps & Compressors',
    category: 'Pump Systems & Skids',
    subcategory: 'Booster Stations',
    tags: ['pump', 'booster', 'pressure tank', 'accumulator', 'diaphragm tank', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 180,
    viewBox: '0 0 180 180',
    anchorPoints: [
      { id: 'inlet', name: 'Suction Line', x: 20, y: 140, type: 'pipe', direction: 'left' },
      { id: 'outlet', name: 'Discharge Header', x: 160, y: 140, type: 'pipe', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <!-- Skid Platform -->
      <rect x="25" y="145" width="130" height="12" rx="2" fill="#0f172a"/>

      <!-- Left Pump Unit with Horizontal Finned Motor -->
      <rect x="35" y="65" width="45" height="70" rx="5" fill="#0f172a"/>
      <!-- White Motor Ribs -->
      <line x1="45" y1="80" x2="68" y2="80" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="45" y1="95" x2="68" y2="95" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="45" y1="110" x2="68" y2="110" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="45" y1="125" x2="68" y2="125" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>

      <!-- Interconnecting Pipe Loop to Accumulator Tank -->
      <rect x="80" y="130" width="30" height="10" fill="#0f172a"/>

      <!-- Right Vertical Diaphragm Pressure Tank (Accumulator) -->
      <rect x="110" y="75" width="30" height="60" rx="14" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <circle cx="125" cy="85" r="4" fill="#ffffff"/>
      <rect x="122" y="65" width="6" height="10" fill="#0f172a"/>
    </svg>`)
  },
  {
    id: 'fans.blower.industrial_exhaust_box.flat2d',
    name: 'Industrial Heavy Exhaust Blower with Silencer Box',
    sector: 'Fans & Blowers',
    category: 'Centrifugal Fans',
    subcategory: 'Exhaust Blowers',
    tags: ['fan', 'blower', 'exhaust', 'silencer box', 'heavy duty', '2d'],
    styleVariant: 'flat2d',
    defaultW: 180,
    defaultH: 150,
    viewBox: '0 0 180 150',
    animationReady: true,
    animatableParts: ['impeller_wheel'],
    anchorPoints: [
      { id: 'inlet', name: 'Suction Inlet Flange', x: 20, y: 70, type: 'duct', direction: 'left' },
      { id: 'discharge', name: 'Discharge Silencer Box Flange', x: 165, y: 70, type: 'duct', direction: 'right' }
    ],
    svgContent: injectIndustrialDefs(`<svg viewBox="0 0 180 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Left Duct Inlet Spool with Vertical Dampers -->
      <rect x="15" y="62" width="22" height="16" fill="#0f172a"/>
      <rect x="22" y="42" width="8" height="46" rx="1.5" fill="#0f172a"/>

      <!-- Flexible Vibration Eliminator Coupling -->
      <rect x="37" y="58" width="16" height="24" fill="#0f172a"/>
      <line x1="42" y1="58" x2="42" y2="82" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="48" y1="58" x2="48" y2="82" stroke="#ffffff" stroke-width="1.5"/>

      <!-- Heavy Industrial Finned Blower Scroll & Skid Frame -->
      <path d="M 53 48 L 95 48 L 130 48 L 130 95 L 95 118 L 53 118 Z" fill="#0f172a"/>
      <!-- Heavy Base Skid -->
      <rect x="53" y="118" width="77" height="12" fill="#0f172a"/>

      <!-- White Cooling / Volute Ribs -->
      <line x1="62" y1="58" x2="95" y2="58" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="62" y1="70" x2="95" y2="70" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="62" y1="82" x2="95" y2="82" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="62" y1="94" x2="95" y2="94" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="62" y1="106" x2="95" y2="106" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>

      <!-- Right Discharge Nozzle -->
      <path d="M 110 65 L 130 65 L 130 85 L 110 85 Z" fill="#ffffff"/>
    </svg>`)
  }
];
