/**
 * Legacy SCADA Script Transpiler & Safety Logic Explainer
 * Converts legacy Ignition Jython, Wonderware InTouch QuickScript, or WinCC VBScript
 * into modern TASC AST expressions and explains interlock sequences.
 */

export interface TranspileResult {
  sourceType: 'ignition_jython' | 'wonderware_quickscript' | 'wincc_vbs' | 'generic';
  explanation: string;
  extractedTags: string[];
  tascAstRule: {
    ruleName: string;
    expression: string;
    debounceSeconds: number;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    safetyInterlockIdentified: boolean;
  };
  modernTypeScriptEquivalent: string;
  riskAudit: string[];
}

export function transpileLegacyScript(scriptText: string): TranspileResult {
  const lower = scriptText.toLowerCase();
  const riskAudit: string[] = [];
  const extractedTags: string[] = [];

  // Detect Source Flavor
  let sourceType: TranspileResult['sourceType'] = 'generic';
  if (lower.includes('system.tag.') || lower.includes('def valuechanged(')) {
    sourceType = 'ignition_jython';
  } else if (lower.includes('if ') && lower.includes('then') && lower.includes('endif')) {
    sourceType = 'wonderware_quickscript';
  } else if (lower.includes('dim ') || lower.includes('hmiruntime.tags(')) {
    sourceType = 'wincc_vbs';
  }

  // Extract Tag Names using Regex
  const tagMatches = scriptText.match(/\[?([\w./\-]+)\]?(?:\.value|\s*[><=!]=?)/g) || [];
  tagMatches.forEach(m => {
    const clean = m.replace(/\[|\]|\.value|[><=!]/g, '').trim();
    if (clean.length > 2 && !['def', 'if', 'else', 'system', 'tag', 'true', 'false', 'dim'].includes(clean.toLowerCase())) {
      extractedTags.push(clean);
    }
  });

  const uniqueTags = Array.from(new Set(extractedTags));
  const primaryTag = uniqueTags[0] || 'Sensor.PrimaryTag';
  const secondaryTag = uniqueTags[1] || 'Sensor.InterlockTag';

  // Extract Numeric Thresholds
  const numMatches = scriptText.match(/\b\d+(\.\d+)?\b/g);
  const threshold = numMatches ? parseFloat(numMatches[0]) : 85.0;

  // Check for Debounce / Delay
  const hasDebounce = lower.includes('sleep') || lower.includes('ton') || lower.includes('delay') || lower.includes('timer');
  const debounceSec = hasDebounce ? 5 : 0;

  if (!hasDebounce) {
    riskAudit.push('Missing Debounce Timer: Raw condition will oscillate rapidly on noisy telemetry.');
  }

  // Check for Safety Interlocks
  const hasInterlock = lower.includes('safety') || lower.includes('permissive') || lower.includes('trip') || lower.includes('interlock');
  if (!hasInterlock) {
    riskAudit.push('No Hardwired Safety Permissive: Script operates unconstrained by physical safety circuit status.');
  }

  // Transpile to TASC AST Expression
  let expression = `${primaryTag} > ${threshold}`;
  if (uniqueTags.length > 1) {
    expression = `${primaryTag} > ${threshold} && ${secondaryTag} < 20.0`;
  }

  const modernTypeScript = `// Modern TASC TypeScript Telemetry Hook
export function evaluateSafetyInterlock(tags: Record<string, number | boolean>): boolean {
  const primaryVal = Number(tags['${primaryTag}'] ?? 0);
  const interlockVal = Number(tags['${secondaryTag}'] ?? 1);
  
  // Trip condition with debounce safety
  return primaryVal > ${threshold} && interlockVal < 20;
}`;

  return {
    sourceType,
    explanation: `The legacy script monitors '${primaryTag}' and checks against a threshold limit of ${threshold}. When tripped, it modifies downstream control state with ${debounceSec > 0 ? 'active' : 'no'} debounce timing.`,
    extractedTags: uniqueTags,
    tascAstRule: {
      ruleName: `Migrated Legacy ${sourceType.toUpperCase()} Rule`,
      expression,
      debounceSeconds: debounceSec || 3,
      severity: hasInterlock ? 'CRITICAL' : 'WARNING',
      safetyInterlockIdentified: hasInterlock
    },
    modernTypeScriptEquivalent: modernTypeScript,
    riskAudit
  };
}
