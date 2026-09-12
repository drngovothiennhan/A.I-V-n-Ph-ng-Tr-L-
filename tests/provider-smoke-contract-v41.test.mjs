import fs from 'node:fs';
import assert from 'node:assert/strict';
import retiredHealth from '../api/health-legacy-retired.ts';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');
const health = fs.readFileSync('api/health.ts', 'utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

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

const legacyHealthRewrite=(vercel.rewrites||[]).find(row=>row?.source==='/api/health-v17');
assert.equal(legacyHealthRewrite?.destination,'/api/health-legacy-retired','legacy health-v17 must not remain a competing telemetry endpoint');
const response={statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[String(name).toLowerCase()]=String(value)},status(code){this.statusCode=code;return this},json(body){this.body=body;return body}};
await retiredHealth({method:'GET'},response);
assert.equal(response.statusCode,410);
assert.equal(response.body?.error,'LEGACY_HEALTH_ROUTE_RETIRED');
assert.equal(response.body?.canonicalEndpoint,'/api/health');
assert.equal(response.body?.telemetryCurrent,false);

console.log('provider smoke + honest passive health + retired legacy health contract: PASS');
