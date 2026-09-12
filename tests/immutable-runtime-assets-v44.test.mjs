import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('api/app.ts', 'utf8');
const asset = fs.readFileSync('api/asset.ts', 'utf8');
const credentials = fs.readFileSync('src/credential-setup-v22.js', 'utf8');

for (const [name, source] of [['app', app], ['asset', asset]]) {
  assert.match(source, /process\.env\.AI_OFFICE_SOURCE_COMMIT\s*\|\|\s*process\.env\.VERCEL_GIT_COMMIT_SHA/,
    `${name} must derive its raw GitHub ref from the deployed source commit`);
  assert.match(source, /\^\[0-9a-f\]\{40\}\$/i,
    `${name} must only accept a full hexadecimal commit SHA before using it as a ref`);
  assert.doesNotMatch(source, /const\s+(?:BRANCH|SOURCE)\s*=\s*['"](?:main|https:\/\/raw\.githubusercontent\.com\/[^'"]+\/main\/)/,
    `${name} must not hardcode main as the production raw source`);
}

assert.match(app, /x-ai-office-ui-source-ref/);
assert.match(app, /raw\.githubusercontent\.com\/\$\{OWNER\}\/\$\{REPO\}\/\$\{ref\}\/index\.html/);
assert.match(asset, /x-ai-office-asset-source-ref/);
assert.match(asset, /raw\.githubusercontent\.com\/\$\{OWNER\}\/\$\{REPO\}\/\$\{ref\}\/\$\{path\}/);
assert.match(asset, /ALLOWED_EXACT\s*=\s*new Set\(\['integrations\/google-apps-script\/DriveBrainBridge\.gs'\]\)/,
  'asset gateway must allow exactly the reviewed Drive Brain Bridge outside src/public');
assert.match(asset, /path\.endsWith\('\.gs'\).*text\/plain/,
  'Drive Brain Bridge must be served as plain text');
assert.match(credentials, /BRIDGE_RAW_URL='\/api\/asset\?path=integrations%2Fgoogle-apps-script%2FDriveBrainBridge\.gs'/,
  'credential popup must copy the Bridge through the release-pinned asset gateway');
assert.doesNotMatch(credentials, /raw\.githubusercontent\.com\/drngovothiennhan\/A\.I-V-n-Ph-ng-Tr-L-\/main\/integrations\/google-apps-script\/DriveBrainBridge\.gs/,
  'credential popup must not drift to raw main Bridge code');

console.log('immutable runtime shell/assets + Drive Bridge contract: PASS');
