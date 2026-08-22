import fs from 'fs';
import path from 'path';
import { symbolRegistry } from '../src/services/symbolRegistryService';
import { validateSymbolLibrary } from '../src/utils/symbolValidator';

const manifest = symbolRegistry.generateManifest();
const validation = validateSymbolLibrary();

console.log(`[Symbol Generator] Total Symbols Registered: ${manifest.totalSymbols}`);
console.log(`[Symbol Generator] 2D Variants: ${manifest.variants.flat2d}`);
console.log(`[Symbol Generator] 3D Variants: ${manifest.variants['3d']}`);
console.log(`[Symbol Generator] Sectors: ${manifest.sectors.length}`);
console.log(`[Symbol Generator] Categories: ${manifest.categories.length}`);
console.log(`[Symbol Validator] Validation Report: ${validation.errorCount} errors, ${validation.warningCount} warnings`);

if (validation.errorCount > 0) {
  console.error('[Symbol Validator] Critical Validation Errors:', validation.issues.filter(i => i.type === 'error'));
  process.exit(1);
}

const outDir = path.join(process.cwd(), 'public/symbols');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Write manifest.json
fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf-8'
);

// Write validation-report.json
fs.writeFileSync(
  path.join(outDir, 'validation-report.json'),
  JSON.stringify(validation, null, 2),
  'utf-8'
);

console.log('[Symbol Generator] Successfully generated manifest.json and validation-report.json in public/symbols/');
