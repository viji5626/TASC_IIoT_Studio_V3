/**
 * TASC IIoT Studio — Tag Schema Drift Validator & Disambiguation Engine
 *
 * Protects AI memory against schema drift (PLC tag renaming, deletion, or modification):
 *  1. Validates whether learned aliases point to currently active PLC/Historian tags.
 *  2. Identifies orphaned aliases and suggests closest active candidate tags.
 *  3. Handles multi-tag disambiguation when ambiguous terms are queried.
 */

import { AppState, LearnedTagAlias, DriverTag, HistorianTag } from '../types';

export interface AliasValidationResult {
  alias: LearnedTagAlias;
  isValid: boolean;
  status: 'active' | 'orphaned' | 'ambiguous';
  matchedTag?: {
    id: string;
    name: string;
    source: 'driver' | 'historian' | 'custom';
  };
  suggestedCandidates?: Array<{
    id: string;
    name: string;
    similarity: number;
  }>;
}

/**
 * Validates a single LearnedTagAlias against the current runtime AppState.
 */
export function validateTagAlias(alias: LearnedTagAlias, appState: AppState): AliasValidationResult {
  const driverTags: DriverTag[] = appState.driverTags || [];
  const historianTags: HistorianTag[] = appState.historianTags || [];

  // 1. Check Driver Tags by ID or Name
  const matchedDriver = driverTags.find(t => t.tagId === alias.tagId || t.tagName.toLowerCase() === alias.tagName.toLowerCase());
  if (matchedDriver) {
    return {
      alias,
      isValid: true,
      status: 'active',
      matchedTag: { id: matchedDriver.tagId, name: matchedDriver.tagName, source: 'driver' }
    };
  }

  // 2. Check Historian Tags by ID or Name
  const matchedHistorian = historianTags.find(t => t.id === alias.tagId || t.name.toLowerCase() === alias.tagName.toLowerCase());
  if (matchedHistorian) {
    return {
      alias,
      isValid: true,
      status: 'active',
      matchedTag: { id: matchedHistorian.id, name: matchedHistorian.name, source: 'historian' }
    };
  }

  // 3. Tag is orphaned / renamed. Find closest candidate tags based on similarity.
  const allActiveTags = [
    ...driverTags.map(t => ({ id: t.tagId, name: t.tagName })),
    ...historianTags.map(t => ({ id: t.id, name: t.name }))
  ];

  const suggested = allActiveTags
    .map(t => ({
      ...t,
      similarity: computeStringSimilarity(alias.alias, t.name)
    }))
    .filter(t => t.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  return {
    alias,
    isValid: false,
    status: 'orphaned',
    suggestedCandidates: suggested
  };
}

/**
 * Validates all learned aliases in bulk and returns partitioned active and orphaned lists.
 */
export function validateAllAliases(aliases: LearnedTagAlias[], appState: AppState): {
  validCount: number;
  orphanedCount: number;
  results: AliasValidationResult[];
} {
  const results = aliases.map(a => validateTagAlias(a, appState));
  const validCount = results.filter(r => r.isValid).length;
  const orphanedCount = results.length - validCount;

  return {
    validCount,
    orphanedCount,
    results
  };
}

/**
 * Resolves a natural language string to a verified active physical tag ID.
 */
export function resolveValidatedAlias(
  queryTerm: string,
  aliases: LearnedTagAlias[],
  appState: AppState
): { resolvedTagId?: string; resolvedTagName?: string; isOrphaned?: boolean; clarificationNeeded?: boolean; candidates?: string[] } {
  const cleanTerm = queryTerm.toLowerCase().trim();
  const matchedAlias = aliases.find(a => cleanTerm.includes(a.alias.toLowerCase()) || a.alias.toLowerCase().includes(cleanTerm));

  if (!matchedAlias) {
    return {};
  }

  const validation = validateTagAlias(matchedAlias, appState);
  if (validation.isValid && validation.matchedTag) {
    return {
      resolvedTagId: validation.matchedTag.id,
      resolvedTagName: validation.matchedTag.name
    };
  }

  if (validation.status === 'orphaned' && validation.suggestedCandidates && validation.suggestedCandidates.length > 0) {
    return {
      isOrphaned: true,
      clarificationNeeded: true,
      candidates: validation.suggestedCandidates.map(c => `${c.name} (${c.id})`)
    };
  }

  return {};
}

/**
 * Computes Dice Coefficient similarity between two strings (0.0 to 1.0).
 */
function computeStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  let intersection = 0;

  bg1.forEach(b => {
    if (bg2.has(b)) intersection++;
  });

  return (2.0 * intersection) / (bg1.size + bg2.size);
}
