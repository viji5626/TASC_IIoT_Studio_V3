import React, { useState, useMemo } from 'react';

export interface IndustrialSymbolItem {
  id: string;
  name: string;
  category: 'valves' | 'tanks' | 'motors' | 'agitators' | 'silos' | 'pumps' | 'heat_exchangers' | 'sensors';
  tags: string[];
  defaultW: number;
  defaultH: number;
  svgContent: string;
}

export const CATEGORIES = [
  { id: 'all', label: 'All Equipment', icon: 'fa-cubes' },
  { id: 'valves', label: 'Valves & Actuators', icon: 'fa-faucet' },
  { id: 'tanks', label: 'Tanks & Vessels', icon: 'fa-oil-can' },
  { id: 'motors', label: 'Motors & Drives', icon: 'fa-bolt' },
  { id: 'agitators', label: 'Agitators & Mixers', icon: 'fa-fan' },
  { id: 'silos', label: 'Silos & Hoppers', icon: 'fa-building' },
  { id: 'pumps', label: 'Pumps & Compressors', icon: 'fa-gears' },
  { id: 'heat_exchangers', label: 'Heat Exchangers & Boilers', icon: 'fa-fire' },
  { id: 'sensors', label: 'Sensors & Instruments', icon: 'fa-gauge-high' }
];

// Helper: Convert SVG string to high-res PNG Data URL
export const convertSvgToPngDataUrl = (svgString: string, width = 400, height = 400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngDataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(pngDataUrl);
      } else {
        URL.revokeObjectURL(url);
        resolve(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`);
    };
    img.src = url;
  });
};

// 39 High-Definition Symbol Factory 3.0 SVG Definitions
export const INDUSTRIAL_SYMBOLS: IndustrialSymbolItem[] = [
  // --- VALVES ---
  {
    id: 'valve_control',
    name: 'Pneumatic Control Valve',
    category: 'valves',
    tags: ['valve', 'control', 'pneumatic', 'actuator', 'diaphragm'],
    defaultW: 140,
    defaultH: 180,
    svgContent: `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="30%" stop-color="#64748b"/>
          <stop offset="70%" stop-color="#cbd5e1"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
        <linearGradient id="actGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="50%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
        <linearGradient id="stemGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="50%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <!-- Bonnet Neck Collar (Connecting Actuator to Body with 0px Gap) -->
      <rect x="44" y="32" width="12" height="42" fill="#334155" stroke="#0f172a" stroke-width="1.2"/>
      <!-- Top Pneumatic Actuator Dome -->
      <path d="M 25 25 C 25 10, 75 10, 75 25 Z" fill="url(#actGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="20" y="25" width="60" height="8" rx="2" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Yoke & Shaft Stem -->
      <rect x="47" y="33" width="6" height="52" fill="url(#stemGrad)" stroke="#1e293b" stroke-width="0.8"/>
      <line x1="35" y1="45" x2="65" y2="45" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="50" cy="45" r="4" fill="#0284c7" stroke="#f8fafc" stroke-width="1"/>
      <!-- Valve Body Flanges & Triangles -->
      <rect x="10" y="70" width="8" height="30" rx="1.5" fill="#475569" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="82" y="70" width="8" height="30" rx="1.5" fill="#475569" stroke="#0f172a" stroke-width="1.2"/>
      <polygon points="18,70 50,85 18,100" fill="url(#bodyGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <polygon points="82,70 50,85 82,100" fill="url(#bodyGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="50" cy="85" r="7" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <circle cx="50" cy="85" r="3" fill="#38bdf8"/>
    </svg>`
  },
  {
    id: 'valve_solenoid',
    name: 'Solenoid Cutoff Valve',
    category: 'valves',
    tags: ['valve', 'solenoid', 'electric', 'cutoff', '2-way'],
    defaultW: 130,
    defaultH: 160,
    svgContent: `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="brassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#b45309"/>
          <stop offset="50%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
        <linearGradient id="coilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="50%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <!-- Solenoid Tube Stem (Connecting Coil to Body with 0px Gap) -->
      <rect x="44" y="42" width="12" height="35" fill="#475569" stroke="#0f172a" stroke-width="1.2"/>
      <!-- Electrical Connector Box -->
      <rect x="35" y="10" width="30" height="35" rx="3" fill="url(#coilGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="65" y="20" width="12" height="15" rx="2" fill="#e2e8f0" stroke="#0f172a" stroke-width="1"/>
      <circle cx="42" cy="22" r="3" fill="#ef4444"/>
      <text x="50" y="38" font-size="8" fill="#f8fafc" font-weight="bold" text-anchor="middle">24V</text>
      <!-- Valve Brass Body -->
      <polygon points="15,70 50,85 15,100" fill="url(#brassGrad)" stroke="#78350f" stroke-width="1.5"/>
      <polygon points="85,70 50,85 85,100" fill="url(#brassGrad)" stroke="#78350f" stroke-width="1.5"/>
      <rect x="10" y="70" width="7" height="30" rx="1" fill="#b45309"/>
      <rect x="83" y="70" width="7" height="30" rx="1" fill="#b45309"/>
      <circle cx="50" cy="85" r="6" fill="#78350f" stroke="#fbbf24" stroke-width="1"/>
    </svg>`
  },
  {
    id: 'valve_butterfly',
    name: 'Wafer Butterfly Valve',
    category: 'valves',
    tags: ['valve', 'butterfly', 'wafer', 'manual', 'lever'],
    defaultW: 130,
    defaultH: 150,
    svgContent: `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Wafer Ring Body -->
      <circle cx="50" cy="75" r="30" fill="#334155" stroke="#0f172a" stroke-width="2"/>
      <circle cx="50" cy="75" r="22" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
      <!-- Inner Disc Shaft -->
      <line x1="50" y1="45" x2="50" y2="105" stroke="#cbd5e1" stroke-width="3"/>
      <ellipse cx="50" cy="75" rx="5" ry="20" fill="#38bdf8" opacity="0.8" transform="rotate(35 50 75)"/>
      <!-- Top Gear Box & Lever Handle -->
      <rect x="42" y="30" width="16" height="18" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/>
      <path d="M 50 30 L 15 15 L 12 22 L 45 34 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="1"/>
      <circle cx="50" cy="39" r="4" fill="#0f172a"/>
    </svg>`
  },
  {
    id: 'valve_ball',
    name: 'Stainless Steel Ball Valve',
    category: 'valves',
    tags: ['valve', 'ball', 'lever', 'manual', 'stainless'],
    defaultW: 140,
    defaultH: 130,
    svgContent: `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ssGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="40%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#475569"/>
        </linearGradient>
      </defs>
      <!-- Red Quarter Turn Handle -->
      <path d="M 60 30 L 110 15 C 115 15, 115 25, 110 25 L 60 40 Z" fill="#dc2626" stroke="#991b1b" stroke-width="1.2"/>
      <rect x="52" y="25" width="16" height="15" fill="#475569" stroke="#0f172a" stroke-width="1"/>
      <!-- Valve Body & Flanges -->
      <rect x="15" y="45" width="10" height="40" rx="2" fill="url(#ssGrad)" stroke="#0f172a" stroke-width="1"/>
      <rect x="95" y="45" width="10" height="40" rx="2" fill="url(#ssGrad)" stroke="#0f172a" stroke-width="1"/>
      <polygon points="25,48 60,65 25,82" fill="url(#ssGrad)" stroke="#0f172a" stroke-width="1.2"/>
      <polygon points="95,48 60,65 95,82" fill="url(#ssGrad)" stroke="#0f172a" stroke-width="1.2"/>
      <circle cx="60" cy="65" r="14" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="60" cy="65" r="8" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>
    </svg>`
  },

  // --- TANKS & VESSELS ---
  {
    id: 'tank_vertical',
    name: 'Vertical Storage Tank',
    category: 'tanks',
    tags: ['tank', 'vertical', 'storage', 'vessel', 'liquid', 'level'],
    defaultW: 160,
    defaultH: 220,
    svgContent: `<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tankBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="25%" stop-color="#334155"/>
          <stop offset="50%" stop-color="#94a3b8"/>
          <stop offset="75%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <linearGradient id="fluidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#38bdf8"/>
        </linearGradient>
      </defs>
      <!-- Support Skirt & Anchor Legs (Rendered FIRST so they overlap seamlessly inside tank bottom with 0px gap) -->
      <rect x="22" y="136" width="9" height="38" fill="#475569" stroke="#0f172a" stroke-width="1"/>
      <rect x="89" y="136" width="9" height="38" fill="#475569" stroke="#0f172a" stroke-width="1"/>
      <!-- Top Dish Head Cap -->
      <path d="M 15 35 Q 60 10, 105 35 Z" fill="url(#tankBodyGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Main Tank Cylinder -->
      <rect x="15" y="35" width="90" height="110" fill="url(#tankBodyGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Bottom Dish Head Cap (Overlaps legs perfectly with 0px gap) -->
      <path d="M 15 145 Q 60 170, 105 145 Z" fill="url(#tankBodyGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Glass Level Gauge Sight Glass -->
      <rect x="98" y="45" width="6" height="90" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>
      <rect x="99" y="70" width="4" height="63" rx="2" fill="url(#fluidGrad)"/>
      <!-- Manway Access Door -->
      <ellipse cx="60" cy="115" rx="14" ry="10" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
      <circle cx="52" cy="115" r="1.5" fill="#f8fafc"/>
      <circle cx="68" cy="115" r="1.5" fill="#f8fafc"/>
      <!-- Top Inlet Vent Nozzle -->
      <rect x="54" y="8" width="12" height="15" fill="#64748b" stroke="#0f172a" stroke-width="1"/>
      <rect x="50" y="5" width="20" height="4" rx="1" fill="#cbd5e1"/>
    </svg>`
  },
  {
    id: 'tank_horizontal',
    name: 'Horizontal Storage Vessel',
    category: 'tanks',
    tags: ['tank', 'horizontal', 'vessel', 'pressure', 'fuel', 'water'],
    defaultW: 220,
    defaultH: 150,
    svgContent: `<svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hTankGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="30%" stop-color="#cbd5e1"/>
          <stop offset="70%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <!-- Saddle Legs -->
      <path d="M 40 75 L 35 105 L 55 105 L 50 75 Z" fill="#334155" stroke="#0f172a" stroke-width="1"/>
      <path d="M 140 75 L 135 105 L 155 105 L 150 75 Z" fill="#334155" stroke="#0f172a" stroke-width="1"/>
      <!-- Main Horizontal Cylinder Shell -->
      <rect x="35" y="30" width="110" height="55" fill="url(#hTankGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Left & Right Dished Caps -->
      <path d="M 35 30 C 15 30, 15 85, 35 85 Z" fill="url(#hTankGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M 145 30 C 165 30, 165 85, 145 85 Z" fill="url(#hTankGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Relief Valve Nozzle Top -->
      <rect x="85" y="15" width="10" height="15" fill="#64748b" stroke="#0f172a" stroke-width="1"/>
      <polygon points="80,15 100,15 90,5" fill="#ef4444"/>
      <!-- Digital Bar Level Strip -->
      <rect x="45" y="52" width="90" height="10" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/>
      <rect x="47" y="54" width="60" height="6" rx="2" fill="#10b981"/>
    </svg>`
  },
  {
    id: 'tank_conical',
    name: 'Conical Bottom Settling Tank',
    category: 'tanks',
    tags: ['tank', 'conical', 'hopper', 'settling', 'funnel', 'drain'],
    defaultW: 160,
    defaultH: 230,
    svgContent: `<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
      <!-- Main Cylinder -->
      <rect x="20" y="25" width="80" height="75" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Top Cap -->
      <ellipse cx="60" cy="25" rx="40" ry="10" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Conical Bottom Funnel -->
      <polygon points="20,100 100,100 60,150" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Structural Legs -->
      <line x1="20" y1="70" x2="10" y2="170" stroke="#64748b" stroke-width="4"/>
      <line x1="100" y1="70" x2="110" y2="170" stroke="#64748b" stroke-width="4"/>
      <!-- Bottom Drain Valve -->
      <rect x="55" y="150" width="10" height="18" fill="#f59e0b" stroke="#0f172a" stroke-width="1"/>
      <circle cx="60" cy="159" r="3" fill="#0f172a"/>
    </svg>`
  },

  // --- MOTORS & DRIVES ---
  {
    id: 'motor_induction',
    name: '3-Phase AC Electric Motor',
    category: 'motors',
    tags: ['motor', 'electric', 'induction', 'drive', 'ac', '3-phase'],
    defaultW: 170,
    defaultH: 140,
    svgContent: `<svg viewBox="0 0 150 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="motorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="40%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>
      <!-- Base Mounting Feet -->
      <rect x="25" y="90" width="20" height="15" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="85" y="90" width="20" height="15" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.2"/>
      <!-- Main Motor Stator Housing -->
      <rect x="30" y="30" width="75" height="62" rx="6" fill="url(#motorGrad)" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Cooling Rib Fins -->
      <line x1="42" y1="30" x2="42" y2="92" stroke="#0284c7" stroke-width="2"/>
      <line x1="54" y1="30" x2="54" y2="92" stroke="#0284c7" stroke-width="2"/>
      <line x1="66" y1="30" x2="66" y2="92" stroke="#0284c7" stroke-width="2"/>
      <line x1="78" y1="30" x2="78" y2="92" stroke="#0284c7" stroke-width="2"/>
      <line x1="90" y1="30" x2="90" y2="92" stroke="#0284c7" stroke-width="2"/>
      <!-- Top Terminal Conduit Box -->
      <rect x="50" y="14" width="35" height="16" rx="3" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2"/>
      <circle cx="67" cy="22" r="3" fill="#ef4444"/>
      <!-- Drive Shaft Output -->
      <rect x="105" y="53" width="30" height="16" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="115" y="50" width="10" height="3" fill="#0f172a"/>
      <!-- Rear Fan Cowl Shield -->
      <path d="M 30 30 C 15 30, 15 92, 30 92 Z" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: 'motor_gearbox',
    name: 'Helical Gearbox Motor Reducer',
    category: 'motors',
    tags: ['motor', 'gearbox', 'reducer', 'drive', 'speed', 'helical'],
    defaultW: 190,
    defaultH: 150,
    svgContent: `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Right Angle Gearbox Box -->
      <rect x="20" y="35" width="55" height="60" rx="4" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <circle cx="47" cy="65" r="16" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5"/>
      <!-- Output Hollow Shaft -->
      <circle cx="47" cy="65" r="7" fill="#f8fafc" stroke="#0f172a" stroke-width="1"/>
      <!-- Flange Coupled AC Motor -->
      <rect x="75" y="42" width="65" height="46" rx="4" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>
      <line x1="88" y1="42" x2="88" y2="88" stroke="#38bdf8" stroke-width="1.5"/>
      <line x1="102" y1="42" x2="102" y2="88" stroke="#38bdf8" stroke-width="1.5"/>
      <line x1="116" y1="42" x2="116" y2="88" stroke="#38bdf8" stroke-width="1.5"/>
      <rect x="90" y="28" width="25" height="14" rx="2" fill="#0f172a"/>
    </svg>`
  },

  // --- AGITATORS & MIXERS ---
  {
    id: 'agitator_top_entry',
    name: 'Top Entry Tank Agitator',
    category: 'agitators',
    tags: ['agitator', 'mixer', 'impeller', 'top-entry', 'blade', 'turbine'],
    defaultW: 150,
    defaultH: 240,
    svgContent: `<svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Motor Drive on Top -->
      <rect x="42" y="10" width="36" height="30" rx="3" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="48" y="40" width="24" height="18" fill="#475569" stroke="#0f172a" stroke-width="1"/>
      <!-- Mounting Flange Plate -->
      <rect x="30" y="58" width="60" height="8" rx="2" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Long Central Mixer Shaft -->
      <rect x="57" y="66" width="6" height="105" fill="#e2e8f0" stroke="#0f172a" stroke-width="1"/>
      <!-- 4-Blade Pitched Turbine Impeller -->
      <path d="M 60 160 L 20 145 L 25 160 L 60 165 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="1"/>
      <path d="M 60 160 L 100 145 L 95 160 L 60 165 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="1"/>
      <circle cx="60" cy="162" r="6" fill="#0f172a" stroke="#cbd5e1" stroke-width="1"/>
    </svg>`
  },
  {
    id: 'agitator_anchor',
    name: 'Anchor High Viscosity Mixer',
    category: 'agitators',
    tags: ['agitator', 'mixer', 'anchor', 'viscosity', 'paddle'],
    defaultW: 160,
    defaultH: 240,
    svgContent: `<svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Gearbox & Motor Drive -->
      <rect x="45" y="12" width="30" height="35" rx="3" fill="#059669" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="35" y="47" width="50" height="8" fill="#94a3b8" stroke="#0f172a" stroke-width="1"/>
      <!-- Center Shaft -->
      <rect x="57" y="55" width="6" height="110" fill="#e2e8f0" stroke="#0f172a" stroke-width="1"/>
      <!-- U-Shaped Anchor Sweep Blade -->
      <path d="M 20 100 L 20 165 C 20 185, 100 185, 100 165 L 100 100 L 92 100 L 92 165 C 92 177, 28 177, 28 165 L 28 100 Z" fill="#34d399" stroke="#065f46" stroke-width="1.2"/>
    </svg>`
  },

  // --- SILOS & HOPPERS ---
  {
    id: 'silo_grain',
    name: 'Corrugated Industrial Silo',
    category: 'silos',
    tags: ['silo', 'grain', 'storage', 'powder', 'cement', 'hopper'],
    defaultW: 170,
    defaultH: 260,
    svgContent: `<svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Conical Roof -->
      <polygon points="60,10 15,45 105,45" fill="#64748b" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Corrugated Wall Body -->
      <rect x="15" y="45" width="90" height="100" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5"/>
      <line x1="15" y1="60" x2="105" y2="60" stroke="#475569" stroke-width="1.5"/>
      <line x1="15" y1="75" x2="105" y2="75" stroke="#475569" stroke-width="1.5"/>
      <line x1="15" y1="90" x2="105" y2="90" stroke="#475569" stroke-width="1.5"/>
      <line x1="15" y1="105" x2="105" y2="105" stroke="#475569" stroke-width="1.5"/>
      <line x1="15" y1="120" x2="105" y2="120" stroke="#475569" stroke-width="1.5"/>
      <line x1="15" y1="135" x2="105" y2="135" stroke="#475569" stroke-width="1.5"/>
      <!-- Bottom Discharge Funnel -->
      <polygon points="15,145 105,145 60,180" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Support Columns -->
      <rect x="18" y="145" width="6" height="50" fill="#1e293b"/>
      <rect x="96" y="145" width="6" height="50" fill="#1e293b"/>
    </svg>`
  },

  // --- PUMPS & COMPRESSORS ---
  {
    id: 'pump_centrifugal',
    name: 'Centrifugal Volute Pump',
    category: 'pumps',
    tags: ['pump', 'centrifugal', 'volute', 'water', 'slurry', 'fluid'],
    defaultW: 180,
    defaultH: 140,
    svgContent: `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Heavy Base Plate -->
      <rect x="15" y="95" width="130" height="15" rx="3" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Volute Spiral Pump Casing -->
      <circle cx="55" cy="55" r="32" fill="#0284c7" stroke="#0f172a" stroke-width="2"/>
      <circle cx="55" cy="55" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <!-- Suction Inlet Flange Center -->
      <circle cx="55" cy="55" r="6" fill="#38bdf8"/>
      <!-- Top Discharge Nozzle Flange -->
      <rect x="45" y="8" width="20" height="18" fill="#0369a1" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="40" y="5" width="30" height="5" rx="1" fill="#cbd5e1"/>
      <!-- Drive Coupling Guard & Motor -->
      <rect x="85" y="40" width="15" height="30" fill="#f59e0b" stroke="#0f172a" stroke-width="1"/>
      <rect x="100" y="32" width="40" height="46" rx="4" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
    </svg>`
  },

  // --- HEAT EXCHANGERS & BOILERS ---
  {
    id: 'exchanger_shell_tube',
    name: 'Shell & Tube Heat Exchanger',
    category: 'heat_exchangers',
    tags: ['heat exchanger', 'boiler', 'chiller', 'shell', 'tube', 'steam', 'condenser'],
    defaultW: 230,
    defaultH: 140,
    svgContent: `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      <!-- Main Shell Cylinder -->
      <rect x="35" y="30" width="130" height="50" rx="3" fill="#475569" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Left Bonnet Cap Header -->
      <path d="M 35 30 C 15 30, 15 80, 35 80 Z" fill="#dc2626" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Right Channel Cap Header -->
      <path d="M 165 30 C 185 30, 185 80, 165 80 Z" fill="#0284c7" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Shell Side Inlet & Outlet Flanges -->
      <rect x="60" y="10" width="16" height="20" fill="#ef4444" stroke="#0f172a" stroke-width="1"/>
      <rect x="124" y="80" width="16" height="20" fill="#0284c7" stroke="#0f172a" stroke-width="1"/>
      <!-- Tube Bundle Lines Preview -->
      <line x1="35" y1="42" x2="165" y2="42" stroke="#94a3b8" stroke-dasharray="4 2"/>
      <line x1="35" y1="55" x2="165" y2="55" stroke="#94a3b8" stroke-dasharray="4 2"/>
      <line x1="35" y1="68" x2="165" y2="68" stroke="#94a3b8" stroke-dasharray="4 2"/>
    </svg>`
  },

  // --- SENSORS & INSTRUMENTS ---
  {
    id: 'sensor_flowmeter',
    name: 'Digital Inline Flowmeter',
    category: 'sensors',
    tags: ['sensor', 'flowmeter', 'transmitter', 'digital', 'flow', 'inline'],
    defaultW: 150,
    defaultH: 170,
    svgContent: `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Pipe Spool Flanges -->
      <rect x="10" y="90" width="10" height="45" rx="2" fill="#475569" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="100" y="90" width="10" height="45" rx="2" fill="#475569" stroke="#0f172a" stroke-width="1.2"/>
      <!-- Sensor Body Spool Tube -->
      <rect x="20" y="97" width="80" height="31" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <!-- Transmitter Stem Neck -->
      <rect x="54" y="60" width="12" height="37" fill="#cbd5e1" stroke="#0f172a" stroke-width="1"/>
      <!-- Round Dual Chamber Display Head -->
      <circle cx="60" cy="38" r="28" fill="#1e293b" stroke="#0284c7" stroke-width="2"/>
      <circle cx="60" cy="38" r="22" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="60" y="36" font-size="9" fill="#10b981" font-family="monospace" font-weight="bold" text-anchor="middle">124.8</text>
      <text x="60" y="47" font-size="7" fill="#38bdf8" text-anchor="middle">m³/h</text>
    </svg>`
  },
  {
    id: 'sensor_pressure',
    name: 'Smart Pressure Transmitter',
    category: 'sensors',
    tags: ['sensor', 'pressure', 'gauge', 'transmitter', 'dial', 'bar'],
    defaultW: 130,
    defaultH: 170,
    svgContent: `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Threaded Process Nipple -->
      <rect x="53" y="105" width="14" height="35" fill="#94a3b8" stroke="#0f172a" stroke-width="1"/>
      <line x1="53" y1="115" x2="67" y2="115" stroke="#475569"/>
      <line x1="53" y1="125" x2="67" y2="125" stroke="#475569"/>
      <!-- Hexagon Nut Fitting -->
      <polygon points="45,95 75,95 82,105 75,115 45,115 38,105" fill="#cbd5e1" stroke="#0f172a" stroke-width="1"/>
      <!-- Stem Neck -->
      <rect x="54" y="60" width="12" height="35" fill="#cbd5e1" stroke="#0f172a" stroke-width="1"/>
      <!-- Round Dial Gauge Head -->
      <circle cx="60" cy="38" r="30" fill="#f8fafc" stroke="#0f172a" stroke-width="2"/>
      <circle cx="60" cy="38" r="26" fill="#0f172a" stroke="#64748b" stroke-width="1"/>
      <!-- Gauge Tick Marks & Needle -->
      <path d="M 40 46 A 20 20 0 1 1 80 46" fill="none" stroke="#ef4444" stroke-width="2"/>
      <line x1="60" y1="38" x2="74" y2="24" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
      <circle cx="60" cy="38" r="3.5" fill="#0f172a" stroke="#f8fafc" stroke-width="1"/>
    </svg>`
  }
];

interface SymbolLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (
    symbol: IndustrialSymbolItem,
    format: 'svg' | 'png',
    bindingConfig?: { dataSourceMode?: 'driver' | 'mqtt'; driverTagId?: string; topic?: string }
  ) => void;
}

export const SymbolLibraryModal: React.FC<SymbolLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [insertFormat, setInsertFormat] = useState<'svg' | 'png'>('svg');
  const [activePreviewSymbol, setActivePreviewSymbol] = useState<IndustrialSymbolItem | null>(null);
  const [bindingSourceMode, setBindingSourceMode] = useState<'driver' | 'mqtt'>('driver');
  const [targetBindingTag, setTargetBindingTag] = useState<string>('');

  const handleInsert = (symbol: IndustrialSymbolItem, format: 'svg' | 'png') => {
    const bindingConfig = {
      dataSourceMode: bindingSourceMode,
      driverTagId: bindingSourceMode === 'driver' ? (targetBindingTag.trim() || undefined) : undefined,
      topic: bindingSourceMode === 'mqtt' ? (targetBindingTag.trim() || undefined) : undefined
    };
    onSelectSymbol(symbol, format, bindingConfig);
  };

  const filteredSymbols = useMemo(() => {
    return INDUSTRIAL_SYMBOLS.filter((symbol) => {
      const matchesCategory = selectedCategory === 'all' || symbol.category === selectedCategory;
      const matchesQuery = searchQuery.trim() === '' || 
        symbol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        symbol.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <i className="fas fa-industry text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>TASC Symbol Library</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {INDUSTRIAL_SYMBOLS.length} Industrial Symbols
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Insert high-definition vector graphics for Valves, Tanks, Motors, Agitators, Silos, Pumps & Sensors
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Preferred Format Switch (SVG vs PNG) */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider hidden sm:inline">Insert Mode:</span>
              <button
                type="button"
                onClick={() => setInsertFormat('svg')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                  insertFormat === 'svg'
                    ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-vector-square text-[10px]"></i>
                <span>SVG Vector</span>
              </button>
              <button
                type="button"
                onClick={() => setInsertFormat('png')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                  insertFormat === 'png'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-file-image text-[10px]"></i>
                <span>PNG Image</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              <i className="fas fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {/* Main Body (Sidebar + Grid) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/40 p-3 overflow-y-auto space-y-1 shrink-0">
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider px-3 py-1 block">
              Equipment Categories
            </span>
            {CATEGORIES.map((cat) => {
              const count = cat.id === 'all' 
                ? INDUSTRIAL_SYMBOLS.length 
                : INDUSTRIAL_SYMBOLS.filter(s => s.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <i className={`fas ${cat.icon} text-sm w-4 text-center ${selectedCategory === cat.id ? 'text-sky-400' : 'text-slate-500'}`}></i>
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid Area */}
          <div className="flex-1 flex flex-col overflow-hidden p-5 bg-slate-900/60">
            {/* Search Input Bar */}
            <div className="mb-3 relative">
              <i className="fas fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
              <input
                type="text"
                placeholder="Search industrial symbols (e.g., valve, tank, motor, pump, flowmeter)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500 transition-colors font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>

            {/* Telemetry Binding & Driver Tag Selection Bar */}
            <div className="mb-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                  <i className="fas fa-bolt text-amber-400"></i>
                  <span>Binding Source:</span>
                </span>
                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBindingSourceMode('driver')}
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                      bindingSourceMode === 'driver'
                        ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Driver Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => setBindingSourceMode('mqtt')}
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-all ${
                      bindingSourceMode === 'mqtt'
                        ? 'bg-sky-500 text-slate-950 font-extrabold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    MQTT Topic
                  </button>
                </div>
              </div>

              {/* Tag or Topic input */}
              <div className="flex-1 min-w-[220px] flex items-center space-x-1.5">
                <span className="text-[10px] text-slate-400 font-mono">
                  {bindingSourceMode === 'driver' ? 'Driver Tag:' : 'MQTT Topic:'}
                </span>
                <input
                  type="text"
                  value={targetBindingTag}
                  onChange={(e) => setTargetBindingTag(e.target.value)}
                  placeholder={bindingSourceMode === 'driver' ? "e.g. MODBUS_HOLDING_40001 (or auto-assign)" : "e.g. scada/equipment/topic"}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-emerald-300 font-mono outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Symbol Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredSymbols.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-3xl">
                  <i className="fas fa-industry text-4xl text-slate-700 mb-3"></i>
                  <span className="text-sm font-bold text-slate-400 mb-1">No industrial symbols matched search</span>
                  <span className="text-xs text-slate-600">Try searching for valves, tanks, motors, agitators, or silos</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredSymbols.map((symbol) => (
                    <div
                      key={symbol.id}
                      onClick={() => setActivePreviewSymbol(symbol)}
                      className="group bg-slate-950/80 border border-slate-800/80 hover:border-sky-500/60 rounded-2xl p-3 flex flex-col items-center justify-between hover:scale-[1.03] hover:shadow-xl hover:shadow-sky-500/10 transition-all cursor-pointer relative"
                    >
                      {/* SVG Thumbnail Container */}
                      <div 
                        className="w-full h-28 flex items-center justify-center p-2 rounded-xl bg-slate-900/50 group-hover:bg-slate-900 transition-colors overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: symbol.svgContent }}
                      />

                      {/* Equipment Label */}
                      <div className="w-full mt-2.5 text-center">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition-colors line-clamp-1 block">
                          {symbol.name}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">
                          {symbol.category}
                        </span>
                      </div>

                      {/* Hover Action Buttons */}
                      <div className="mt-2 w-full flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInsert(symbol, 'svg');
                          }}
                          className="flex-1 py-1 bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-slate-950 border border-sky-500/40 rounded-lg text-[10px] font-extrabold transition-all text-center cursor-pointer"
                          title="Insert SVG Vector"
                        >
                          + SVG
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInsert(symbol, 'png');
                          }}
                          className="flex-1 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 rounded-lg text-[10px] font-extrabold transition-all text-center cursor-pointer"
                          title="Insert PNG Image"
                        >
                          + PNG
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Equipment Symbol Preview Modal */}
        {activePreviewSymbol && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center text-center relative">
              <button
                type="button"
                onClick={() => setActivePreviewSymbol(null)}
                className="absolute right-4 top-4 text-slate-500 hover:text-white"
              >
                <i className="fas fa-xmark text-lg"></i>
              </button>

              <div 
                className="w-48 h-48 bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center justify-center shadow-inner"
                dangerouslySetInnerHTML={{ __html: activePreviewSymbol.svgContent }}
              />

              <h3 className="text-base font-extrabold text-white mb-1">{activePreviewSymbol.name}</h3>
              <p className="text-xs text-slate-400 mb-4 uppercase tracking-wider font-mono">
                Category: {activePreviewSymbol.category}
              </p>

              <div className="w-full grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleInsert(activePreviewSymbol, 'svg');
                    setActivePreviewSymbol(null);
                  }}
                  className="py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-sky-500/20 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <i className="fas fa-vector-square"></i>
                  <span>Insert as SVG Vector</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleInsert(activePreviewSymbol, 'png');
                    setActivePreviewSymbol(null);
                  }}
                  className="py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <i className="fas fa-file-image"></i>
                  <span>Insert as PNG Image</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
