import { SymbolMetadata } from '../types/symbol';
import { symbolRegistry } from '../services/symbolRegistryService';

export interface ValidationIssue {
  symbolId: string;
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

export interface LibraryValidationReport {
  timestamp: string;
  totalSymbols: number;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
  duplicateIds: string[];
  missingVariants: { symbolId: string; missing: 'flat2d' | '3d' }[];
}

/**
 * Validates the entire symbol registry for industrial SCADA integrity, schema conformance, and SVG syntax.
 */
export function validateSymbolLibrary(customSymbols?: SymbolMetadata[]): LibraryValidationReport {
  const symbols = customSymbols || symbolRegistry.getAllSymbols();
  const issues: ValidationIssue[] = [];
  const idCounts = new Map<string, number>();
  const duplicateIds: string[] = [];
  const missingVariants: { symbolId: string; missing: 'flat2d' | '3d' }[] = [];

  for (const sym of symbols) {
    // 1. Check ID uniqueness
    const count = (idCounts.get(sym.id) || 0) + 1;
    idCounts.set(sym.id, count);
    if (count === 2) {
      duplicateIds.push(sym.id);
      issues.push({
        symbolId: sym.id,
        type: 'error',
        code: 'DUPLICATE_ID',
        message: `Symbol ID '${sym.id}' is declared more than once in the registry.`
      });
    }

    // 2. Check Name & Metadata
    if (!sym.name || sym.name.trim().length === 0) {
      issues.push({
        symbolId: sym.id,
        type: 'error',
        code: 'MISSING_NAME',
        message: `Symbol '${sym.id}' is missing a human-readable display name.`
      });
    }

    if (!sym.sector || sym.sector.trim().length === 0) {
      issues.push({
        symbolId: sym.id,
        type: 'error',
        code: 'MISSING_SECTOR',
        message: `Symbol '${sym.id}' is missing an assigned industrial sector.`
      });
    }

    if (!sym.category || sym.category.trim().length === 0) {
      issues.push({
        symbolId: sym.id,
        type: 'error',
        code: 'MISSING_CATEGORY',
        message: `Symbol '${sym.id}' is missing an assigned category.`
      });
    }

    if (!sym.tags || sym.tags.length === 0) {
      issues.push({
        symbolId: sym.id,
        type: 'warning',
        code: 'MISSING_TAGS',
        message: `Symbol '${sym.id}' has no search tags defined.`
      });
    }

    // 3. Dimension Validity
    if (!sym.defaultW || sym.defaultW <= 0 || !sym.defaultH || sym.defaultH <= 0) {
      issues.push({
        symbolId: sym.id,
        type: 'error',
        code: 'INVALID_DIMENSIONS',
        message: `Symbol '${sym.id}' has invalid default dimensions: ${sym.defaultW}x${sym.defaultH}.`
      });
    }

    // 4. SVG Markup Syntax & Source of Truth Verification
    if (!sym.svgContent || sym.svgContent.trim().length === 0) {
      issues.push({
        symbolId: sym.id,
        type: 'error',
        code: 'MISSING_SVG_CONTENT',
        message: `Symbol '${sym.id}' has empty or missing SVG vector markup.`
      });
    } else {
      if (!sym.svgContent.includes('<svg') || !sym.svgContent.includes('</svg>')) {
        issues.push({
          symbolId: sym.id,
          type: 'error',
          code: 'MALFORMED_SVG',
          message: `Symbol '${sym.id}' contains malformed SVG root tags.`
        });
      }
    }

    // 5. Anchor Points Boundary Check
    if (sym.anchorPoints) {
      for (const pt of sym.anchorPoints) {
        if (pt.x < 0 || pt.y < 0) {
          issues.push({
            symbolId: sym.id,
            type: 'warning',
            code: 'OUT_OF_BOUNDS_ANCHOR',
            message: `Anchor point '${pt.id}' in symbol '${sym.id}' has negative coordinates (${pt.x}, ${pt.y}).`
          });
        }
      }
    }

    // 6. Check 2D / 3D Variant Pair
    if (sym.id.endsWith('.flat2d')) {
      const counterpart = symbolRegistry.getCounterpartVariant(sym.id, '3d');
      if (!counterpart) {
        missingVariants.push({ symbolId: sym.id, missing: '3d' });
        issues.push({
          symbolId: sym.id,
          type: 'info',
          code: 'MISSING_3D_VARIANT',
          message: `Symbol '${sym.id}' has no matching .3d counterpart variant.`
        });
      }
    }
  }

  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;

  return {
    timestamp: new Date().toISOString(),
    totalSymbols: symbols.length,
    errorCount,
    warningCount,
    issues,
    duplicateIds,
    missingVariants
  };
}
