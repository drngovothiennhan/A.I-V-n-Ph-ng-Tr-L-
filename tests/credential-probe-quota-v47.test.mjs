import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('src/credential-setup-v22.js', 'utf8');

assert.match(source, /const VERSION='2\.3\.1-manual-provider-diagnostics'/,
  'credential runtime verifier must advertise manual provider diagnostics semantics');
assert.match(source, /async function refreshPopup\(\{deep=false\}=\{\}\)/,
  'runtime popup refresh must default to health-only diagnostics');
assert.match(source, /#cred22Check'\)\.onclick=\(\)=>refreshPopup\(\{deep:true\}\)/,
  'Grounding + Canary button must be the explicit deep diagnostics trigger');
assert.match(source, /export async function openPopup\(\)[\s\S]*return refreshPopup\(\{deep:false\}\)/,
  'opening the Runtime popup must not consume provider quota');
assert.match(source, /window\.AIOfficeCredentialsV22=\{[^}]*refresh:\(\)=>refreshPopup\(\{deep:false\}\),check:\(\)=>refreshPopup\(\{deep:true\}\)/,
  'public API must separate cheap refresh from explicit deep provider check');
assert.match(source, /let grounding=\{pass:false,reason:'MANUAL_CHECK_REQUIRED'\}/,
  'unprobed Grounding must be represented honestly as manual-check-required');
assert.match(source, /if\(deep\)\{[\s\S]*verifyGeminiGrounding\(\)[\s\S]*verifyDriveCanary\(\)[\s\S]*\}/,
  'expensive Grounding and Drive Canary probes must be guarded by deep diagnostics');
assert.match(source, /else if\(deep&&!groundingVerified\)/,
  'unprobed Grounding must not be reported as a blocker');
assert.match(source, /else if\(deep&&!driveVerified\)/,
  'unprobed Drive Canary must not be reported as a blocker');

const autoOpen = source.slice(source.indexOf("const params=new URLSearchParams"));
assert.match(autoOpen, /setTimeout\(\(\)=>openPopup\(\),450\)/,
  'first-session Runtime popup behavior may remain, but must route through health-only openPopup');
assert.doesNotMatch(autoOpen, /verifyGeminiGrounding|verifyDriveCanary/,
  'first-session auto-open path must never call provider probes directly');

assert.match(source, /\/api\/provider-check\?probe=gemini-grounding/,
  'manual Grounding diagnostic endpoint must remain available');

const providerCheck = fs.readFileSync('api/provider-check.ts', 'utf8');
const allStart = providerCheck.indexOf("if (probe === 'all')");
const allEnd = providerCheck.indexOf("return json(res, 400", allStart);
assert.ok(allStart >= 0 && allEnd > allStart,
  'provider-check must keep an explicit aggregate probe branch');
const aggregateProbe = providerCheck.slice(allStart, allEnd);
assert.match(aggregateProbe, /probeMode: 'passive-config-only'/,
  'aggregate provider diagnostics must be passive');
assert.match(aggregateProbe, /providerCalls: 0/,
  'aggregate provider diagnostics must declare zero provider calls');
assert.match(aggregateProbe, /reason: 'MANUAL_CHECK_REQUIRED'/,
  'aggregate provider diagnostics must represent unprobed state honestly');
assert.doesNotMatch(aggregateProbe, /probeGemini\(\)|probeGeminiGrounding\(\)|probeXiaozhi\(\)|Promise\.all/,
  'aggregate provider diagnostics must not call Gemini, Grounding, XiaoZhi, or any aggregate provider promise');

assert.match(providerCheck, /function sameOriginDiagnosticRequest\(req\)/,
  'paid provider diagnostics must have a same-origin request guard');
assert.match(providerCheck, /req\.headers\?\.\['x-forwarded-host'\]/,
  'same-origin diagnostic guard must bind to the serving host');
assert.match(providerCheck, /req\.headers\?\.referer/,
  'same-origin diagnostic guard must require an application referer');
assert.match(providerCheck, /sec-fetch-site/,
  'same-origin diagnostic guard must use browser Fetch Metadata when present');
assert.match(providerCheck, /site && site !== 'same-origin'/,
  'cross-site browser diagnostics must be rejected');
assert.match(providerCheck, /mode && !\['cors', 'same-origin'\]\.includes\(mode\)/,
  'top-level navigations/crawler-style requests must not be accepted as manual provider diagnostics');
assert.match(providerCheck, /dest && dest !== 'empty'/,
  'manual provider diagnostics must be fetch/XHR-like requests, not document/image navigation');
const paidStart = providerCheck.indexOf("if (probe === 'gemini' || probe === 'gemini-grounding')");
const xiaozhiStart = providerCheck.indexOf("if (probe === 'xiaozhi')", paidStart);
assert.ok(paidStart >= 0 && xiaozhiStart > paidStart,
  'paid Gemini diagnostics must have their own guarded branch');
const paidBranch = providerCheck.slice(paidStart, xiaozhiStart);
assert.match(paidBranch, /if \(!sameOriginDiagnosticRequest\(req\)\)/,
  'paid Gemini diagnostics must validate same-origin before provider invocation');
assert.match(paidBranch, /MANUAL_DIAGNOSTIC_SAME_ORIGIN_REQUIRED/,
  'rejected paid diagnostics must fail explicitly before provider use');
assert.match(paidBranch, /providerCallMade: false/,
  'rejected paid diagnostics must disclose that no provider call was made');
const guardPos = paidBranch.indexOf('sameOriginDiagnosticRequest(req)');
const geminiCallPos = paidBranch.indexOf('probeGemini()');
const groundingCallPos = paidBranch.indexOf('probeGeminiGrounding()');
assert.ok(guardPos >= 0 && geminiCallPos > guardPos && groundingCallPos > guardPos,
  'same-origin guard must execute before either paid Gemini provider call');

console.log('credential provider probe quota + same-origin diagnostic contract: PASS');
