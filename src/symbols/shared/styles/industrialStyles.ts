/**
 * Reusable Industrial SVG Gradients, Filters, Patterns, and Defs
 * Provides consistent metallic surfaces, depth cues, cylindrical pipe/duct shading, and fluid styling.
 */

export const INDUSTRIAL_SVG_DEFS = `
<defs>
  <!-- Brushed Steel Cylindrical Gradient (Horizontal) -->
  <linearGradient id="indSteelGradH" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#475569"/>
    <stop offset="25%" stop-color="#94a3b8"/>
    <stop offset="50%" stop-color="#f1f5f9"/>
    <stop offset="75%" stop-color="#64748b"/>
    <stop offset="100%" stop-color="#1e293b"/>
  </linearGradient>

  <!-- Brushed Steel Cylindrical Gradient (Vertical) -->
  <linearGradient id="indSteelGradV" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#475569"/>
    <stop offset="25%" stop-color="#94a3b8"/>
    <stop offset="50%" stop-color="#f1f5f9"/>
    <stop offset="75%" stop-color="#64748b"/>
    <stop offset="100%" stop-color="#1e293b"/>
  </linearGradient>

  <!-- Galvanized Duct Zinc Gradient (3D Shading) -->
  <linearGradient id="indDuctZincGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#334155"/>
    <stop offset="20%" stop-color="#64748b"/>
    <stop offset="45%" stop-color="#cbd5e1"/>
    <stop offset="55%" stop-color="#e2e8f0"/>
    <stop offset="80%" stop-color="#475569"/>
    <stop offset="100%" stop-color="#0f172a"/>
  </linearGradient>

  <!-- Industrial Copper / Brass Metallic Gradient -->
  <linearGradient id="indBrassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#b45309"/>
    <stop offset="30%" stop-color="#fbbf24"/>
    <stop offset="60%" stop-color="#fef3c7"/>
    <stop offset="85%" stop-color="#d97706"/>
    <stop offset="100%" stop-color="#78350f"/>
  </linearGradient>

  <!-- Cast Iron Dark Equipment Gradient -->
  <linearGradient id="indCastIronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#1e293b"/>
    <stop offset="50%" stop-color="#334155"/>
    <stop offset="100%" stop-color="#0f172a"/>
  </linearGradient>

  <!-- Heavy Machine Industrial Blue Gradient -->
  <linearGradient id="indMachineBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#0369a1"/>
    <stop offset="35%" stop-color="#0284c7"/>
    <stop offset="65%" stop-color="#38bdf8"/>
    <stop offset="100%" stop-color="#0c4a6e"/>
  </linearGradient>

  <!-- Safety Industrial Yellow / Amber Warning Gradient -->
  <linearGradient id="indSafetyYellowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#b45309"/>
    <stop offset="35%" stop-color="#f59e0b"/>
    <stop offset="65%" stop-color="#fde047"/>
    <stop offset="100%" stop-color="#78350f"/>
  </linearGradient>

  <!-- Chilled Water Cyan Fluid Gradient -->
  <linearGradient id="indChilledWaterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#0369a1"/>
    <stop offset="50%" stop-color="#06b6d4"/>
    <stop offset="100%" stop-color="#083344"/>
  </linearGradient>

  <!-- Hot Water / Steam Red Fluid Gradient -->
  <linearGradient id="indHotWaterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#991b1b"/>
    <stop offset="50%" stop-color="#ef4444"/>
    <stop offset="100%" stop-color="#450a0a"/>
  </linearGradient>

  <!-- Glass / Translucent Overlay Gloss -->
  <linearGradient id="indGlassGloss" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
    <stop offset="40%" stop-color="#ffffff" stop-opacity="0.1"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
  </linearGradient>

  <!-- Subtle 3D Equipment Drop Shadow Filter -->
  <filter id="ind3dShadow" x="-10%" y="-10%" width="130%" height="130%">
    <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.45" />
  </filter>

  <!-- High-Precision Flange Bolt Pattern Definition -->
  <pattern id="indFlangeBolts" width="10" height="10" patternUnits="userSpaceOnUse">
    <circle cx="5" cy="5" r="1.2" fill="#0f172a" stroke="#64748b" stroke-width="0.6"/>
  </pattern>
</defs>
`;

/**
 * Utility to inject standard industrial defs into any SVG string if not already present
 */
export function injectIndustrialDefs(svg: string): string {
  if (svg.includes('id="indSteelGradH"') || svg.includes('id="indDuctZincGrad"')) {
    return svg;
  }
  const svgTagIndex = svg.indexOf('<svg');
  if (svgTagIndex === -1) return svg;
  const closeTagIndex = svg.indexOf('>', svgTagIndex);
  if (closeTagIndex === -1) return svg;
  
  return svg.slice(0, closeTagIndex + 1) + INDUSTRIAL_SVG_DEFS + svg.slice(closeTagIndex + 1);
}
