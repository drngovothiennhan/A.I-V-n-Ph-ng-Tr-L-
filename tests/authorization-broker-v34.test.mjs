import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const auth=await readFile(new URL('../src/authorization-broker-v34.js',import.meta.url),'utf8');
const release=await readFile(new URL('../src/release-v193.js',import.meta.url),'utf8');
const credentials=await readFile(new URL('../src/credential-setup-v22.js',import.meta.url),'utf8');
const interaction=await readFile(new URL('../src/interaction-control-v21.js',import.meta.url),'utf8');

assert.match(auth,/3\.4\.0-authorization-broker/);
for(const service of ['gemini','drive','gmail','calendar','workspace'])assert.match(auth,new RegExp(`${service}:\\{`),`missing service ${service}`);
assert.match(auth,/drive\.readonly/,'Drive authorization must remain readonly');
assert.match(auth,/Least privilege/,'Workspace broker must state least privilege');
assert.match(auth,/reason:\s*'CONNECTION_SETUP_REQUIRED'/,'connect button must not falsely report authorization success');
assert.match(auth,/allowed:false,setupOpened:true/,'opening setup must remain not-authorized until health verifies it');
assert.match(auth,/AIOfficeCredentialsV22\?\.open/,'broker must reuse existing credential setup instead of duplicating secrets UI');
assert.match(auth,/ai-office-drive-runtime-state/,'internal Drive opt-in must surface missing Drive authorization');
assert.match(auth,/!detail\.internalOptIn\|\|detail\?\.drive\?\.configured/,'Drive popup must only trigger when internal source is enabled and runtime is missing');
assert.doesNotMatch(auth,/API_KEY\s*=/,'broker must not hard-code provider secrets');
assert.doesNotMatch(auth,/localStorage\.setItem\([^,]+,\s*.*token/i,'broker must not persist service tokens');

assert.match(credentials,/groundingVerified=Boolean\(deep&&s\.gemini&&grounding\?\.pass\)/,'Gemini grounding must require an explicit deep probe in addition to configured state and probe success');
assert.match(credentials,/refreshPopup\(\{deep:false\}\)/,'opening or cheap refresh must remain health-only and quota-safe');
assert.match(credentials,/refreshPopup\(\{deep:true\}\)/,'manual deep provider verification must remain available');
assert.match(credentials,/Gemini cơ bản có thể hoạt động nhưng Google Search Grounding chưa PASS/,'UI must expose degraded grounding state after an explicit failed probe');
assert.match(interaction,/permissionPopup/,'browser/device permission popup must remain intact');
assert.match(release,/authorization-broker-v34\.js\?v=340/,'release must boot authorization broker');
assert.match(release,/window\.AIOfficeAuthorizationVersion = AUTHORIZATION/,'release must expose authorization version');

console.log('authorization-broker-v34: least privilege + honest readiness + explicit provider verification PASS');
