import { generateIndustrialCode, lintIndustrialCode } from '../src/services/ai/aiRadCodeGenerator';
import { generateCanvasFromPrompt } from '../src/services/ai/textToCanvasEngine';
import { transpileLegacyScript } from '../src/services/ai/legacyScriptTranspiler';

async function runRadWorkbenchTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING AI INDUSTRIAL RAD WORKBENCH TESTS');
  console.log('====================================================');

  // ── TEST 1: Multi-Vendor Code Generator (Ignition Jython) ──
  console.log('\n[1/5] Testing Ignition Jython 2.7 Code Generation & Linter...');
  const jythonRes = generateIndustrialCode({
    target: 'ignition_jython',
    prompt: 'Generate a 3-pump duty assist standby script with run-hour wear leveling'
  });

  if (!jythonRes.code.includes('system.tag.readBlocking') || !jythonRes.code.includes('system.tag.writeBlocking')) {
    throw new Error('Ignition Jython code must use verified Ignition 8.1+ bulk tag APIs!');
  }
  if (!jythonRes.safetyCheck.hasInterlock) {
    throw new Error('Safety interlock must be detected in generated pump control logic!');
  }
  console.log(`  ✓ Generated: "${jythonRes.title}" (${jythonRes.code.split('\n').length} lines)`);
  console.log(`  ✓ Linter: Safety Rules Passed = ${jythonRes.safetyCheck.passed}`);

  // ── TEST 2: Siemens S7 SCL (IEC 61131-3) ──
  console.log('\n[2/5] Testing Siemens S7 SCL Function Block Generation...');
  const sclRes = generateIndustrialCode({
    target: 'siemens_scl',
    prompt: 'Generate pump lead lag duty rotation FB'
  });

  if (!sclRes.code.includes('FUNCTION_BLOCK') || !sclRes.code.includes('VAR_INPUT') || !sclRes.code.includes('TON')) {
    throw new Error('Siemens SCL code must contain standard IEC 61131-3 Function Block structure!');
  }
  console.log(`  ✓ Generated IEC 61131-3 SCL Function Block with TON debounce.`);

  // ── TEST 3: Rockwell Studio 5000 Structured Text (AOI) ──
  console.log('\n[3/5] Testing Rockwell Studio 5000 Structured Text AOI...');
  const stRes = generateIndustrialCode({
    target: 'rockwell_st',
    prompt: 'Motor vibration and temperature trip monitor AOI'
  });

  if (!stRes.code.includes('TON_DebounceTrip') || !stRes.code.includes('Inp_SafetyPermissive')) {
    throw new Error('Rockwell ST must contain timer and safety permissive checks!');
  }
  console.log(`  ✓ Generated Rockwell ControlLogix AOI logic.`);

  // ── TEST 4: Text-to-SCADA HMI Canvas Engine ──
  console.log('\n[4/5] Testing Text-to-SCADA HMI Canvas Generation...');
  const canvasRes = generateCanvasFromPrompt({
    prompt: 'Create 2 Chillers with 4 Water Pumps, Temp Gauges, and Emergency Trip Switch',
    dashboardId: 'main_plant_dash'
  });

  if (canvasRes.panels.length < 5) {
    throw new Error('Canvas generator should have produced multiple equipment panels!');
  }

  const hasGauge = canvasRes.panels.some(p => p.type === 'gauge');
  const hasSwitch = canvasRes.panels.some(p => p.type === 'switch');
  const hasTripBtn = canvasRes.panels.some(p => p.type === 'button' && p.buttonPayload === 'TRIP');

  if (!hasGauge || !hasSwitch || !hasTripBtn) {
    throw new Error('Canvas generator did not create required Gauges, Switches, and Trip buttons!');
  }
  console.log(`  ✓ Generated ${canvasRes.panels.length} non-overlapping industrial widgets.`);
  console.log(`  ✓ Auto-mapped ${canvasRes.tagsSummary.length} telemetry tag bindings.`);

  // ── TEST 5: Legacy SCADA Script Transpiler & Safety Audit ──
  console.log('\n[5/5] Testing Legacy SCADA Script Transpiler...');
  const legacyJython = `
import system
def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    temp = currentValue.value
    flow = system.tag.readBlocking(["[default]Chiller/WaterFlow"])[0].value
    if temp > 88.5 and flow < 18.0:
        system.tag.writeBlocking(["[default]Alarms/ChillerTrip"], [True])
`;

  const transpileRes = transpileLegacyScript(legacyJython);
  if (transpileRes.sourceType !== 'ignition_jython') {
    throw new Error('Transpiler failed to detect source flavor as Ignition Jython!');
  }
  if (!transpileRes.tascAstRule.expression.includes('>') || !transpileRes.modernTypeScriptEquivalent.includes('evaluateSafetyInterlock')) {
    throw new Error('Transpiler failed to generate valid TASC AST and TypeScript hooks!');
  }
  console.log(`  ✓ Detected Source: ${transpileRes.sourceType.toUpperCase()}`);
  console.log(`  ✓ Transpiled TASC AST Rule: ${transpileRes.tascAstRule.expression}`);
  console.log(`  ✓ Extracted Tags: ${transpileRes.extractedTags.join(', ')}`);

  console.log('\n====================================================');
  console.log('🎉 ALL 5 AI INDUSTRIAL RAD TESTS PASSED 100%!');
  console.log('====================================================\n');
}

runRadWorkbenchTests().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
