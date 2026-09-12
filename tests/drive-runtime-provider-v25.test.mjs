import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const drive = await readFile(new URL('../api/drive-brain.ts', import.meta.url), 'utf8');
const gateway = await readFile(new URL('../api/drive-brain-gateway.ts', import.meta.url), 'utf8');
const health = await readFile(new URL('../api/health.ts', import.meta.url), 'utf8');
const registry = await readFile(new URL('../api/_drive-registry.js', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

assert.match(drive, /https:\/\/www\.googleapis\.com\/auth\/drive\.readonly/, 'service account must use Drive readonly scope');
assert.match(drive, /GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON/, 'service-account env option must exist');
assert.match(drive, /google-drive-service-account/, 'service-account provider marker must exist');
assert.match(drive, /if \(bridgeConfigured\(\)\)[\s\S]*if \(serviceAccountConfigured\(\)\)/, 'Bridge must remain first provider, Service Account fallback second');
assert.match(drive, /FILE_OUTSIDE_PRODUCTION_SCOPES/, 'direct reads must remain restricted to production scopes');
assert.match(drive, /scopeForServiceFile/, 'service-account search results must be ancestry-scoped');
assert.match(drive, /parseOfficeBuffer/, 'service-account provider should parse supported Office files without extra packages');
assert.match(registry, /'02_APPROVED':\s*'[^']+'/, 'Drive scope registry stores direct folder-id strings');
assert.match(drive, /DRIVE_BRAIN_REGISTRY\.scopes\[scope\]\s*===\s*folderId/, 'folder ancestry resolver must compare direct registry folder-id strings');
assert.match(drive, /const folderId = DRIVE_BRAIN_REGISTRY\.scopes\[scope\];/, 'service-account list must use direct registry folder-id strings');
assert.doesNotMatch(drive, /DRIVE_BRAIN_REGISTRY\.scopes\[scope\]\?\.id/, 'scope registry values are strings and must never be dereferenced as objects');
assert.doesNotMatch(drive, /https:\/\/www\.googleapis\.com\/auth\/drive(?!\.readonly)/, 'write-capable Drive OAuth scope is forbidden');
assert.doesNotMatch(drive, /files\/[^\s'"`]+\/permissions/, 'provider must not mutate Drive permissions');

assert.match(gateway, /import driveBrain from '\.\/drive-brain'/, 'gateway must delegate to the canonical readonly Drive handler');
assert.doesNotMatch(gateway, /from ['"]\.\/drive-brain\.ts['"]/,'gateway import must remain TypeScript-build compatible');
assert.match(gateway, /req\.method !== 'POST'/, 'Drive gateway must reject non-POST access');
assert.match(gateway, /application\/json/, 'Drive gateway must require JSON requests');
assert.match(gateway, /function sameOriginDriveRequest\(req\)/, 'Drive gateway must enforce a same-origin request boundary');
for (const marker of ['x-forwarded-host','referer','sec-fetch-site','sec-fetch-mode','sec-fetch-dest']) {
  assert.ok(gateway.includes(marker), `Drive gateway must inspect ${marker}`);
}
assert.match(gateway, /site && site !== 'same-origin'/, 'cross-site browser requests must be rejected');
assert.match(gateway, /DRIVE_INTERNAL_SAME_ORIGIN_REQUIRED/, 'rejected Drive requests must disclose the boundary reason without provider access');
assert.match(gateway, /providerCallMade:\s*false/, 'rejected Drive requests must explicitly confirm no provider call was made');
const guardIndex = gateway.indexOf('sameOriginDriveRequest(req)');
const delegateIndex = gateway.lastIndexOf('driveBrain(req, res)');
assert.ok(guardIndex >= 0 && delegateIndex > guardIndex, 'same-origin guard must run before delegating to Drive provider code');
const driveRewrite = (vercel.rewrites || []).find(item => item.source === '/api/drive-brain');
assert.equal(driveRewrite?.destination, '/api/drive-brain-gateway', 'production /api/drive-brain must route through the secure gateway');

assert.match(health, /service-account-readonly/, 'health must advertise readonly service-account fallback');
assert.match(health, /providerPriority:\s*\['apps-script-bridge', 'service-account-readonly'\]/, 'health must expose deterministic provider priority');
assert.match(health, /localFallbackAllowed:\s*false/, 'Drive runtime must never silently fall back to local uploads');
assert.match(health, /Share A\.I Văn phòng root folder with the service-account client_email as Viewer/, 'manual least-privilege permission step must be explicit');

console.log('drive-runtime-provider-v25: readonly provider + same-origin gateway + scope mapping + fallback boundaries PASS');
