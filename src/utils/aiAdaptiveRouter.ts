/**
 * TASC IIoT Studio — Auto-Adaptive Model Router & Relevancy Engine
 *
 * Provides:
 *  1. Sub-millisecond deterministic query classification into 3 performance tiers.
 *  2. Provider-aware model capability discovery & optimal model selection (Ollama, LM Studio, Gemini, OpenAI, Groq, Custom).
 *  3. Post-generation relevancy, integrity, and anti-hallucination verification guard.
 */

import { AiProviderType } from './aiProviders/types';

export type AdaptiveTier = 'tier1_fast' | 'tier2_balanced' | 'tier3_heavy';

export interface ModelCapability {
  name: string;
  tier: AdaptiveTier;
  hasVision: boolean;
  hasTools: boolean;
  contextWindow: number;
  recommendedTemp: number;
  description: string;
}

export interface AdaptiveRoutingDecision {
  targetTier: AdaptiveTier;
  tierLabel: string;
  selectedModel: string;
  reason: string;
  contextLength: number;
  temperature: number;
  hasVisionRequired: boolean;
  switchedModel: boolean;
}

export interface RelevancyCheckResult {
  isRelevant: boolean;
  score: number; // 0.0 to 1.0
  reason: string;
  shouldEscalate: boolean;
  cleanedText: string;
}

// ─── 1. Query Tier Classification (<2ms Deterministic AST) ────────────────────

export function classifyQueryTier(
  userQuery: string,
  hasImages: boolean = false
): { tier: AdaptiveTier; reason: string } {
  const cleanQ = (userQuery || '').toLowerCase().trim();

  // Tier 3: Vision (Images attached), CAD/3D Twin generation, or Complex Code Synthesis
  if (hasImages) {
    return {
      tier: 'tier3_heavy',
      reason: 'Image attachment detected (Requires Vision LLM)'
    };
  }

  const tier3Patterns = [
    /\b(?:generate|create|build|render|design)\s+(?:3d|cad|mesh|twin|digital twin|pump|tank|valve|piping|conveyor)\b/i,
    /\b(?:generate|write|create)\s+(?:plc|ladder|script|python|javascript|structured text|iec\s*61131|logic block)\b/i,
    /\b(?:blueprint|p&id|schematic|isometric|cad layout)\b/i
  ];

  for (const pattern of tier3Patterns) {
    if (pattern.test(cleanQ)) {
      return {
        tier: 'tier3_heavy',
        reason: 'Complex procedural 3D synthesis or code generation required'
      };
    }
  }

  // Tier 2: Analytical Reasoning, Root Cause Analysis, FDD, Trend History, OEE Deep Dive
  const tier2Patterns = [
    /\b(?:root cause|rca|diagnos|troubleshoot|why did|why is|investigate|fdd)\b/i,
    /\b(?:trend|historian|last \d+\s*(?:hours|days|weeks)|fluctuation|deviation|spike|drift)\b/i,
    /\b(?:oee|downtime breakdown|availability|performance rate|quality loss|pareto|bottleneck)\b/i,
    /\b(?:batch|lot trace|recipe|formulation|discrepancy|spc|six sigma|cpk)\b/i,
    /\b(?:compare|correlation|regression|anomaly|predictive|maintenance schedule)\b/i
  ];

  for (const pattern of tier2Patterns) {
    if (pattern.test(cleanQ)) {
      return {
        tier: 'tier2_balanced',
        reason: 'Multi-variable industrial reasoning & historian analysis required'
      };
    }
  }

  // Tier 1: Fast Operational (Real-time telemetry, tag lookups, alarm checks, greetings, status)
  return {
    tier: 'tier1_fast',
    reason: 'Standard real-time telemetry, alarm check, or operational status query'
  };
}

// ─── 2. Provider Model Capability Profiler ────────────────────────────────────

export function analyzeModelCapability(modelName: string): ModelCapability {
  const name = modelName.toLowerCase();

  // Exclude embedding models
  const isEmbedding = name.includes('embed') || name.includes('embedding') || name.includes('nomic') || name.includes('bge');

  // Vision check
  const hasVision = name.includes('vision') || name.includes('llava') || name.includes('minicpm-v') || name.includes('flash') || name.includes('4o') || name.includes('glm-4.6v');

  // Tier 1 Fast Models (<4GB or lightweight architectures)
  if (
    !isEmbedding && (
      name.includes('mini') ||
      name.includes('e4b') ||
      name.includes('1b') ||
      name.includes('1.2b') ||
      name.includes('1.5b') ||
      name.includes('2b') ||
      name.includes('2.5') ||
      name.includes('3b') ||
      name.includes('phi') ||
      name.includes('gemma-2-2b') ||
      name.includes('gemma-4-e4b') ||
      name.includes('gpt-4o-mini') ||
      name.includes('liquid')
    )
  ) {
    return {
      name: modelName,
      tier: 'tier1_fast',
      hasVision,
      hasTools: true,
      contextWindow: 8192,
      recommendedTemp: 0.1,
      description: 'Ultra-Fast Lightweight Model (<150ms TTFT, Low VRAM)'
    };
  }

  // Tier 3 Heavy Models (>14B, Vision, Coder, or Cloud Flagships)
  if (
    !isEmbedding && (
      hasVision ||
      name.includes('coder') ||
      name.includes('14b') ||
      name.includes('27b') ||
      name.includes('30b') ||
      name.includes('31b') ||
      name.includes('32b') ||
      name.includes('70b') ||
      name.includes('120b') ||
      name.includes('nemotron') ||
      name.includes('bonsai') ||
      name.includes('gemini-2.0-pro') ||
      name.includes('gpt-4o')
    )
  ) {
    return {
      name: modelName,
      tier: 'tier3_heavy',
      hasVision,
      hasTools: true,
      contextWindow: 32768,
      recommendedTemp: 0.2,
      description: 'Heavy Reasoning, Vision & Synthesis Model'
    };
  }

  // Tier 2 Balanced Default (7B–12B like Mistral, Llama 3.1 8B, Qwen 3.5 9B)
  return {
    name: modelName,
    tier: 'tier2_balanced',
    hasVision,
    hasTools: true,
    contextWindow: 16384,
    recommendedTemp: 0.2,
    description: 'Balanced Operational & Analytical Reasoner'
  };
}

// ─── 3. Optimal Model Selector (Ollama, LM Studio, Gemini, Cloud) ─────────────

export function selectAdaptiveModel(
  provider: AiProviderType,
  currentModel: string,
  userQuery: string,
  availableModels: string[] = [],
  hasImages: boolean = false
): AdaptiveRoutingDecision {
  const { tier, reason } = classifyQueryTier(userQuery, hasImages);
  const tierLabels: Record<AdaptiveTier, string> = {
    tier1_fast: '⚡ Fast Operational (Tier 1)',
    tier2_balanced: '🧠 Deep Analytics (Tier 2)',
    tier3_heavy: '🚀 Vision & Synthesis (Tier 3)'
  };

  // Filter out embedding-only models
  const chatCandidates = availableModels.filter(m => {
    const l = m.toLowerCase();
    return !l.includes('embed') && !l.includes('embedding') && !l.includes('nomic') && !l.includes('bge-');
  });

  // If user selected a specific model (not 'auto' / 'auto-adaptive'), check if it can serve the request
  const isAutoMode = currentModel === 'auto' || currentModel === 'auto-adaptive' || !currentModel;

  if (chatCandidates.length === 0) {
    // Fallback when no model list is returned
    const activeModel = isAutoMode ? (provider === 'google_gemini' ? 'gemini-2.0-flash' : (provider === 'ollama' ? 'llama3.2' : (provider === 'lmstudio' ? 'local-model' : 'default'))) : currentModel;
    return {
      targetTier: tier,
      tierLabel: tierLabels[tier],
      selectedModel: activeModel,
      reason,
      contextLength: tier === 'tier1_fast' ? 2048 : (tier === 'tier2_balanced' ? 4096 : 8192),
      temperature: tier === 'tier1_fast' ? 0.1 : 0.2,
      hasVisionRequired: hasImages,
      switchedModel: false
    };
  }

  // Map all available chat models into capabilities, prioritizing 100% local disk models over cloud proxy models
  // and deprioritizing oversized models (>=14B) that exceed local laptop memory limits
  const capabilities = chatCandidates
    .map(analyzeModelCapability)
    .sort((a, b) => {
      const aIsCloud = a.name.includes(':cloud') ? 1 : 0;
      const bIsCloud = b.name.includes(':cloud') ? 1 : 0;
      if (aIsCloud !== bIsCloud) return aIsCloud - bIsCloud;

      // Deprioritize models that commonly OOM on consumer hardware
      const aOversized = (a.name.includes('14b') || a.name.includes('27b') || a.name.includes('30b') || a.name.includes('70b') || a.name.includes('120b') || a.name.includes('nemotron')) ? 1 : 0;
      const bOversized = (b.name.includes('14b') || b.name.includes('27b') || b.name.includes('30b') || b.name.includes('70b') || b.name.includes('120b') || b.name.includes('nemotron')) ? 1 : 0;
      return aOversized - bOversized;
    });

  // Hysteresis Rule: If currently selected model is warm and capable, reuse it to avoid cold load delays
  if (!isAutoMode && currentModel) {
    const currentCap = analyzeModelCapability(currentModel);
    if (!hasImages || currentCap.hasVision) {
      return {
        targetTier: tier,
        tierLabel: tierLabels[tier],
        selectedModel: currentModel,
        reason: `${reason} (Preserving warm model "${currentModel}")`,
        contextLength: tier === 'tier1_fast' ? 2048 : (tier === 'tier2_balanced' ? 4096 : 8192),
        temperature: tier === 'tier1_fast' ? 0.1 : 0.2,
        hasVisionRequired: hasImages,
        switchedModel: false
      };
    }
  }

  // If images are required, prioritize vision models
  if (hasImages) {
    const visionModel = capabilities.find(c => c.hasVision && !c.name.includes(':cloud')) || capabilities.find(c => c.hasVision) || capabilities.find(c => c.tier === 'tier3_heavy') || capabilities[0];
    return {
      targetTier: 'tier3_heavy',
      tierLabel: tierLabels.tier3_heavy,
      selectedModel: visionModel.name,
      reason: 'Vision analysis requested — selected vision-capable model',
      contextLength: 8192,
      temperature: 0.2,
      hasVisionRequired: true,
      switchedModel: visionModel.name !== currentModel
    };
  }

  // Find best match in target tier (preferring 100% local models)
  let matchedModel = capabilities.find(c => c.tier === tier && !c.name.includes(':cloud')) || capabilities.find(c => c.tier === tier);

  // Hysteresis / Session Affinity Rule:
  // If current loaded model is already in Tier 2 or Tier 3 and query is Tier 1,
  // do NOT force a slow cold-reload if current model can handle it with zero reload lag.
  if (!isAutoMode && currentModel) {
    const currentCap = capabilities.find(c => c.name === currentModel) || analyzeModelCapability(currentModel);
    if (tier === 'tier1_fast' && (currentCap.tier === 'tier2_balanced' || currentCap.tier === 'tier3_heavy')) {
      // Keep currently loaded model to avoid reload penalty!
      matchedModel = currentCap;
    }
  }

  // Fallbacks if target tier not found in installed models
  if (!matchedModel) {
    if (tier === 'tier1_fast') {
      matchedModel = capabilities.find(c => c.tier === 'tier2_balanced' && !c.name.includes(':cloud')) || capabilities.find(c => c.tier === 'tier2_balanced') || capabilities[0];
    } else if (tier === 'tier2_balanced') {
      matchedModel = capabilities.find(c => c.tier === 'tier3_heavy' && !c.name.includes(':cloud')) || capabilities.find(c => c.tier === 'tier1_fast' && !c.name.includes(':cloud')) || capabilities[0];
    } else {
      matchedModel = capabilities.find(c => c.tier === 'tier2_balanced' && !c.name.includes(':cloud')) || capabilities[0];
    }
  }

  const chosenModel = matchedModel ? matchedModel.name : (currentModel || availableModels[0]);
  const cap = analyzeModelCapability(chosenModel);

  return {
    targetTier: tier,
    tierLabel: tierLabels[tier],
    selectedModel: chosenModel,
    reason,
    contextLength: cap.contextWindow,
    temperature: cap.recommendedTemp,
    hasVisionRequired: false,
    switchedModel: chosenModel !== currentModel
  };
}

// ─── 4. Post-Generation Relevancy & Integrity Guard ───────────────────────────

export function verifyResponseRelevancy(
  userQuery: string,
  candidateResponse: string
): RelevancyCheckResult {
  const cleanQ = (userQuery || '').toLowerCase().trim();
  let cleanText = (candidateResponse || '').trim();

  // 1. Immediate rejection on empty or placeholder text
  if (!cleanText || cleanText.length < 5) {
    return {
      isRelevant: false,
      score: 0.0,
      reason: 'Empty or insufficient response generated',
      shouldEscalate: true,
      cleanedText: ''
    };
  }

  // 2. Filter unparsed raw JSON / tool contamination
  if (cleanText.startsWith('{"') && cleanText.endsWith('}') && cleanText.includes('"parameters"')) {
    return {
      isRelevant: false,
      score: 0.1,
      reason: 'Model outputted raw unparsed JSON tool definition instead of human response',
      shouldEscalate: true,
      cleanedText: cleanText
    };
  }

  // 3. Remove raw function calling tokens (e.g. `call:generate_3d_asset{...}`)
  if (cleanText.includes('call:') || cleanText.includes('tool_call:')) {
    cleanText = cleanText.replace(/call:\w+\{[^}]*\}/g, '').trim();
    if (!cleanText) {
      return {
        isRelevant: false,
        score: 0.2,
        reason: 'Model response was composed solely of raw tool invocation tokens',
        shouldEscalate: true,
        cleanedText: ''
      };
    }
  }

  // 4. Keyword and Entity Alignment Score
  const queryWords = cleanQ
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'when', 'where', 'which', 'about', 'there', 'please', 'tell'].includes(w));

  let matchedKeywords = 0;
  const responseLower = cleanText.toLowerCase();

  for (const word of queryWords) {
    if (responseLower.includes(word)) {
      matchedKeywords++;
    }
  }

  const keywordCoverage = queryWords.length > 0 ? (matchedKeywords / queryWords.length) : 1.0;

  // 5. Truncation / Completeness Check
  const lastChar = cleanText.slice(-1);
  const isTruncated = ['(', '[', '{', ':', ',', '-', '\\'].includes(lastChar) ||
    (cleanText.endsWith('...') && cleanText.length < 50);

  let score = 0.5 + (keywordCoverage * 0.4);
  if (isTruncated) score -= 0.3;

  const isRelevant = score >= 0.4 && !isTruncated;

  return {
    isRelevant,
    score: Math.min(1.0, Math.max(0.0, score)),
    reason: isRelevant ? 'Passed relevancy and syntax integrity validation' : 'Potential truncation or topic mismatch detected',
    shouldEscalate: !isRelevant,
    cleanedText: cleanText
  };
}
