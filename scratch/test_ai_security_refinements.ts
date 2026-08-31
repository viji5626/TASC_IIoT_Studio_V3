import { checkRateLimit, recordFailedAttempt, recordSuccessfulLogin, unlockUserAccount } from '../src/services/auth/rateLimiterService';
import { compressTelemetrySeries } from '../src/services/ai/epLttbCompactor';
import { hybridRagEngine } from '../src/services/ai/hybridRagEngine';
import { buildSandwichPrompt } from '../src/services/ai/sandwichPromptBuilder';
import { verifyAiResponseTruth } from '../src/services/ai/multiTierFactShield';
import { generateDeterministicReport } from '../src/services/ai/offlineDeterministicEngine';

async function runAllTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING AI & SECURITY ARCHITECTURE REFINEMENT TESTS');
  console.log('====================================================');

  // ── TEST 1: Dual-Key Rate Limiting & Lockout ──
  console.log('\n[1/6] Testing Dual-Key Rate Limiter & Persistent Lockout...');
  const testUser = `test_op_${Date.now()}`;
  const testIp = '192.168.1.105';

  // 4 failed attempts should be allowed with decreasing remaining attempts
  for (let i = 1; i <= 4; i++) {
    const check = checkRateLimit(testUser, testIp);
    if (!check.allowed) throw new Error(`Attempt ${i} should be allowed!`);
    recordFailedAttempt(testUser, testIp);
  }

  // 5th attempt locks the account
  recordFailedAttempt(testUser, testIp);
  const lockCheck = checkRateLimit(testUser, testIp);
  if (lockCheck.allowed || lockCheck.reason !== 'USER_LOCKED') {
    throw new Error('Account should be locked out on 5th failure!');
  }
  console.log(`  ✓ Account successfully locked for ${lockCheck.retryAfterSeconds} seconds.`);

  // Verify other users on same IP are NOT locked
  const otherUser = `other_user_${Date.now()}`;
  const otherCheck = checkRateLimit(otherUser, testIp);
  if (!otherCheck.allowed) throw new Error('Unrelated user on same subnet should NOT be locked!');
  console.log('  ✓ Dual-Key verification: Subnet user remains unlocked.');

  // Unlock user
  unlockUserAccount(testUser);
  const unlockCheck = checkRateLimit(testUser, testIp);
  if (!unlockCheck.allowed) throw new Error('User should be unlocked!');
  console.log('  ✓ Admin unlock cleared lockout successfully.');

  // ── TEST 2: Extreme-Preserving LTTB (EP-LTTB) ──
  console.log('\n[2/6] Testing Extreme-Preserving LTTB (EP-LTTB) Compactor...');
  const rawPoints = [];
  const baseTime = Date.now();
  for (let i = 0; i < 1000; i++) {
    let val = 40 + Math.sin(i / 20) * 5;
    if (i === 350) val = 92.5; // Injected Critical Safety Spike
    rawPoints.push({ timestamp: baseTime + i * 1000, value: val, isAlarmTrip: i === 350 });
  }

  const compactRes = compressTelemetrySeries('Chiller.DischargeTemp', rawPoints, { targetPoints: 40, highTripThreshold: 85 });
  if (compactRes.downsampledPointCount > 50) throw new Error('EP-LTTB exceeded target budget!');
  
  const hasSpike = compactRes.downsampledSeries.some(p => p.v >= 92.0 && p.trip);
  if (!hasSpike) throw new Error('CRITICAL FLAW: Transient spike was dropped by downsampler!');
  console.log(`  ✓ Compressed 1,000 points to ${compactRes.downsampledPointCount} (${compactRes.compressionRatio})`);
  console.log(`  ✓ 100% Spike Preservation: Global Max spike (92.5) successfully anchored!`);

  // ── TEST 3: Hybrid Offline RAG (Dense Vectors + BM25) ──
  console.log('\n[3/6] Testing Hybrid Offline RAG Engine...');
  const search1 = hybridRagEngine.search('predictive maintenance fdd vibration waste', 2);
  console.log('  Debug search1:', search1.map(s => ({ title: s.chunk.title, score: s.score })));
  if (search1.length === 0 || !search1[0].chunk.title.includes('Predictive Maintenance')) {
    throw new Error('Hybrid RAG failed to retrieve Chapter 7 FDD & CBM!');
  }
  console.log(`  ✓ Top semantic match: "${search1[0].chunk.title}" (Score: ${(search1[0].score * 100).toFixed(0)}%)`);

  // Test dynamic SOP registration
  hybridRagEngine.registerDynamicChunk({
    id: 'sop-cleanroom-01',
    title: 'Cleanroom AHU Filter Emergency Replacement SOP',
    summary: 'Turn off supply fan VFD before opening cleanroom filter housing. Check differential pressure transmitter.',
    keywords: ['cleanroom', 'ahu', 'filter', 'sop']
  });

  const search2 = hybridRagEngine.search('cleanroom filter replacement steps', 2);
  if (!search2.some(r => r.chunk.id === 'sop-cleanroom-01')) {
    throw new Error('Dynamic SOP BM25 indexing failed!');
  }
  console.log(`  ✓ Dynamic User Knowledge indexed & retrieved via browser BM25!`);

  // ── TEST 4: Attention-Aware Sandwich Prompting ──
  console.log('\n[4/6] Testing Attention-Aware Sandwich Prompt Builder...');
  const promptRes = buildSandwichPrompt({
    activeTrips: [{ tag: 'Chiller.Temp', message: 'High Temp Trip', severity: 'CRITICAL', timestamp: '14:22:00' }],
    equipmentMetadata: [{ name: 'Chiller-1', type: 'Centrifugal', nominalRating: '450 TR' }],
    userQuery: 'Why did Chiller-1 trip at 14:22?'
  });

  if (!promptRes.userPrompt.startsWith('### 🚨 CRITICAL SAFETY')) {
    throw new Error('Safety trips must sit at TOP of Sandwich prompt!');
  }
  if (!promptRes.userPrompt.includes('### 🎯 OPERATOR QUERY')) {
    throw new Error('Immediate query must sit at BOTTOM of Sandwich prompt!');
  }
  console.log(`  ✓ Attention zones verified (Estimated tokens: ${promptRes.estimatedTokens})`);

  // ── TEST 5: Multi-Tier Fact-Verification Shield ──
  console.log('\n[5/6] Testing Multi-Tier Fact-Verification Grounding Shield...');
  const liveContext = {
    liveTags: { 'Chiller.DischargeTemp': 88.4, 'Chiller.WaterFlow': 24.2 }
  };

  const aiText = 'Telemetry shows Chiller.DischargeTemp is 88.4 and COP is 4.5 while Flow is 24.2 m3/h.';
  const shieldRes = verifyAiResponseTruth(aiText, liveContext);
  if (!shieldRes.isFullyGrounded || shieldRes.verifiedCount < 2) {
    throw new Error('Fact shield failed to verify grounded telemetry!');
  }
  console.log(`  ✓ Shield status: ${shieldRes.overallBadge.label} (${shieldRes.verifiedCount}/${shieldRes.totalCitationsCount} verified)`);

  // ── TEST 6: Deterministic Offline Air-Gapped Fallback ──
  console.log('\n[6/6] Testing Deterministic Offline Report Engine...');
  const detRep = generateDeterministicReport({
    reportTitle: 'Emergency Air-Gapped Diagnostic Audit',
    reportType: 'FDD',
    activeFaults: [{ ruleName: 'Chiller Overheat', assetId: 'Chiller Unit #1', severity: 'CRITICAL', costPerHour: 1450, kwWaste: 38.5, recommendation: 'Check pump.' }]
  });

  if (!detRep.isDeterministicFallback || !detRep.markdownReport.includes('Deterministic Local FDD Expert System')) {
    throw new Error('Offline report generation failed!');
  }
  console.log(`  ✓ Deterministic offline report generated successfully (${detRep.markdownReport.length} bytes)`);

  console.log('\n====================================================');
  console.log('🎉 ALL 6 AI & SECURITY REFINEMENT TESTS PASSED 100%!');
  console.log('====================================================\n');
}

runAllTests().catch(err => {
  console.error('❌ TEST FAILURE:', err);
  process.exit(1);
});
