import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');
const health = fs.readFileSync('api/health.ts', 'utf8');

assert.match(workflow, /h\.providers\?\.gemini\?\.model!==['"]gemini-3\.8-flash['"]/);
assert.match(workflow, /h\.providers\?\.gemini\?\.economyModel!==['"]gemini-3\.5-flash-lite['"]/);
assert.match(workflow, /Production source mismatch/);
assert.match(workflow, /SOURCE_COMMIT.*GITHUB_SHA/s);

assert.doesNotMatch(health, /googleSearchGrounding:\s*geminiConfigured/,'Grounding must not be reported healthy merely because a key exists');
assert.match(health, /googleSearchGrounding:\s*null/,'legacy Grounding health must stay unknown until an explicit probe verifies it');
assert.match(health, /googleSearchGroundingConfigured:\s*geminiConfigured/);
assert.match(health, /googleSearchGroundingVerified:\s*null/);
assert.match(health, /configured-unverified/);
assert.match(health, /groundingVerificationMode:\s*'explicit-manual-probe'/);
assert.doesNotMatch(health, /generateContent|google_search/,'cheap health endpoint must not spend Gemini quota');

assert.match(health, /const voiceProbeRequested = String\(req\.query\?\.probe \|\| ''\)\.toLowerCase\(\) === 'voice'/,
  'XiaoZhi live health must require an explicit voice probe query');
assert.match(health, /const voiceRender = voiceProbeRequested \? await probeVoiceRender\(\) : null/,
  'passive health must not contact XiaoZhi Render');
assert.doesNotMatch(health, /const voiceRender = await probeVoiceRender\(\)/,
  'unconditional XiaoZhi probing must not return');
assert.match(health, /healthMode: voiceProbeRequested \? 'voice-live-probe' : 'passive-config'/,
  'health response must disclose passive versus live voice mode');
assert.match(health, /runtimeStatus: xiaozhiRuntimeStatus/,
  'XiaoZhi runtime status must preserve not-probed as a first-class state');
assert.match(health, /reason: 'EXPLICIT_VOICE_PROBE_REQUIRED'/,
  'passive voice telemetry must explain why live reachability is unknown');

console.log('provider smoke + honest passive health contract: PASS');
