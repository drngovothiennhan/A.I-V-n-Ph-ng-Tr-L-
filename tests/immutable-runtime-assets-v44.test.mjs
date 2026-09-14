import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('api/app.ts', 'utf8');
const asset = fs.readFileSync('api/asset.ts', 'utf8');
const credentials = fs.readFileSync('src/credential-setup-v22.js', 'utf8');

for (const [name, source] of [['app', app], ['asset', asset]]) {
  assert.match(source, /process\.env\.AI_OFFICE_SOURCE_COMMIT\s*\|\|\s*process\.env\.VERCEL_GIT_COMMIT_SHA/,
    `${name} must derive its serving source ref from the deployed source commit`);
  assert.match(source, /\^\[0-9a-f\]\{40\}\$/i,
    `${name} must only accept a full hexadecimal commit SHA before using it as a source ref`);
}

assert.match(app, /x-ai-office-ui-source-ref/,'Office OS shell must expose exact serving source ref');
assert.match(app, /x-ai-office-production-entry['"],['"]office-os-p4/,'root response must identify the Office OS production entry');
assert.match(app, /function officeShellHtml\(\)/,'root app must render the controlled Office OS shell directly');
assert.match(app, /src="\/src\/office-os\/production-entry-v1\.js\?v=100"/,'inline shell must boot the canonical Office OS production entry');
assert.doesNotMatch(app, /raw\.githubusercontent\.com/,'root UI must not fetch a mutable remote index.html at request time');
assert.doesNotMatch(app, /fetch\(/,'root UI shell must be self-contained and must not depend on upstream HTML fetches');

assert.match(asset, /x-ai-office-asset-source-ref/);
assert.match(asset, /raw\.githubusercontent\.com\/\$\{OWNER\}\/\$\{REPO\}\/\$\{ref\}\/\$\{path\}/,
  'asset gateway must remain pinned to the deployed source ref');
assert.doesNotMatch(asset, /const\s+(?:BRANCH|SOURCE)\s*=\s*['"](?:main|https:\/\/raw\.githubusercontent\.com\/[^'"]+\/main\/)/,
  'asset gateway must not hardcode main as the production raw source');
assert.match(asset, /ALLOWED_EXACT\s*=\s*new Set\(\['integrations\/google-apps-script\/DriveBrainBridge\.gs'\]\)/,
  'asset gateway must allow exactly the reviewed Drive Brain Bridge outside src/public');
assert.match(asset, /path\.endsWith\('\.gs'\).*text\/plain/,
  'Drive Brain Bridge must be served as plain text');
assert.match(credentials, /BRIDGE_RAW_URL='\/api\/asset\?path=integrations%2Fgoogle-apps-script%2FDriveBrainBridge\.gs'/,
  'credential popup must copy the Bridge through the release-pinned asset gateway');
assert.doesNotMatch(credentials, /raw\.githubusercontent\.com\/drngovothiennhan\/A\.I-V-n-Ph-ng-Tr-L-\/main\/integrations\/google-apps-script\/DriveBrainBridge\.gs/,
  'credential popup must not drift to raw main Bridge code');

console.log('immutable inline Office OS shell + release-pinned assets + Drive Bridge contract: PASS');
