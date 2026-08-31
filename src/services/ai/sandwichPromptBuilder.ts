/**
 * TASC IIoT Studio — Attention-Aware "Sandwich" Prompt Builder
 *
 * Solves the LLM "Lost in the Middle" cognitive degradation problem by partitioning
 * industrial context into three distinct attention zones:
 *
 * 1. Top Anchor (Primary Attention Zone):
 *    - System Identity & Strict Industrial Constraints
 *    - Safety Interlocks & High-High (HH) / Low-Low (LL) Active Trips
 *
 * 2. Middle Zone (Low Attention / Background Reference):
 *    - Baseline Equipment Metadata & Nameplates
 *    - Static Engineering SOP excerpts & Normal Operating Ranges
 *
 * 3. Bottom Anchor (Recency Attention Zone):
 *    - Anomalous Real-Time Live Telemetry & EP-LTTB Trend Dynamics
 *    - Operator's Exact Immediate Query
 *    - Strict Output JSON / Markdown Formatting Directive
 */

import { CompactedTelemetryResult } from './epLttbCompactor';

export interface SandwichPromptOptions {
  systemRole?: string;
  activeTrips?: Array<{ tag: string; message: string; severity: string; timestamp: string }>;
  equipmentMetadata?: Array<{ name: string; type: string; nominalRating: string }>;
  ragContext?: string;
  telemetrySummaries?: CompactedTelemetryResult[];
  userQuery: string;
  outputFormatInstructions?: string;
}

export function buildSandwichPrompt(options: SandwichPromptOptions): {
  systemPrompt: string;
  userPrompt: string;
  estimatedTokens: number;
} {
  const systemRole = options.systemRole || 
    'You are the TASC IIoT Studio Senior Industrial Diagnostics & SCADA AI Copilot. You analyze industrial telemetry, diagnose equipment trips, calculate energy/financial waste, and provide actionable maintenance steps.';

  // ─── 1. TOP ANCHOR: High-Priority Safety & Trips ───
  let topZone = `### 🚨 CRITICAL SAFETY & ACTIVE TRIP NOTIFICATIONS (HIGHEST PRIORITY)\n`;
  if (options.activeTrips && options.activeTrips.length > 0) {
    topZone += options.activeTrips.map(t => 
      `- **[${t.severity}] ${t.tag}**: ${t.message} (Triggered: ${t.timestamp})`
    ).join('\n');
  } else {
    topZone += `*No active safety trip interlocks currently latched.*\n`;
  }

  // ─── 2. MIDDLE ZONE: Background Specs & Static SOPs ───
  let middleZone = `\n### 📋 EQUIPMENT NAMEPLATE & BASELINE SPECIFICATIONS\n`;
  if (options.equipmentMetadata && options.equipmentMetadata.length > 0) {
    middleZone += options.equipmentMetadata.map(e =>
      `- **${e.name}** (${e.type}): Nominal: ${e.nominalRating}`
    ).join('\n') + '\n';
  }

  if (options.ragContext) {
    middleZone += `\n### 📖 RELEVANT ENGINEERING HANDBOOK / SOP EXCERPTS (RAG GROUNDING)\n${options.ragContext}\n`;
  }

  // ─── 3. BOTTOM ANCHOR: Live Telemetry Dynamics & Recency User Query ───
  let bottomZone = `\n### 📈 LIVE SENSOR TELEMETRY & EP-LTTB DOWNSAMPLED DYNAMICS\n`;
  if (options.telemetrySummaries && options.telemetrySummaries.length > 0) {
    bottomZone += options.telemetrySummaries.map(t => t.compactMarkdownSummary).join('\n\n') + '\n';
  } else {
    bottomZone += `*No dynamic time-series sensors attached to this query.*\n`;
  }

  bottomZone += `\n### 🎯 OPERATOR QUERY (IMMEDIATE OBJECTIVE)\n${options.userQuery}\n`;

  if (options.outputFormatInstructions) {
    bottomZone += `\n### 📝 STRICT OUTPUT FORMAT REQUIREMENTS\n${options.outputFormatInstructions}`;
  } else {
    bottomZone += `\n### 📝 STRICT OUTPUT FORMAT REQUIREMENTS\nProvide a structured industrial diagnosis with:\n1. **Root Cause Analysis**\n2. **Financial & Energy Waste Assessment**\n3. **Immediate Corrective SOP Actions (Step-by-Step)**`;
  }

  // Combine user prompt maintaining the Sandwich Architecture
  const fullUserPrompt = `${topZone}\n---\n${middleZone}\n---\n${bottomZone}`;

  const estimatedTokens = Math.ceil((systemRole.length + fullUserPrompt.length) / 4);

  return {
    systemPrompt: systemRole,
    userPrompt: fullUserPrompt,
    estimatedTokens
  };
}
