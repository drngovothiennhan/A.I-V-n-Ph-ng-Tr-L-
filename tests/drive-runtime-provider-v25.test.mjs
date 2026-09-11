import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const drive = await readFile(new URL('../api/drive-brain.ts', import.meta.url), 'utf8');
const health = await readFile(new URL('../api/health.ts', import.meta.url), 'utf8');

assert.match(drive, /https:\/\/www\.googleapis\.com\/auth\/drive\.readonly/, 'service account must use Drive readonly scope');
assert.match(drive, /GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON/, 'service-account env option must exist');
assert.match(drive, /google-drive-service-account/, 'service-account provider marker must exist');
assert.match(drive, /if \(bridgeConfigured\(\)\)[\s\S]*if \(serviceAccountConfigured\(\)\)/, 'Bridge must remain first provider, Service Account fallback second');
assert.match(drive, /FILE_OUTSIDE_PRODUCTION_SCOPES/, 'direct reads must remain restricted to production scopes');
assert.match(drive, /scopeForServiceFile/, 'service-account search results must be ancestry-scoped');
assert.match(drive, /parseOfficeBuffer/, 'service-account provider should parse supported Office files without extra packages');
assert.doesNotMatch(drive, /https:\/\/www\.googleapis\.com\/auth\/drive(?!\.readonly)/, 'write-capable Drive OAuth scope is forbidden');
assert.doesNotMatch(drive, /files\/[^\s'"`]+\/permissions/, 'provider must not mutate Drive permissions');

assert.match(health, /service-account-readonly/, 'health must advertise readonly service-account fallback');
assert.match(health, /providerPriority:\s*\['apps-script-bridge', 'service-account-readonly'\]/, 'health must expose deterministic provider priority');
assert.match(health, /localFallbackAllowed:\s*false/, 'Drive runtime must never silently fall back to local uploads');
assert.match(health, /Share A\.I Văn phòng root folder with the service-account client_email as Viewer/, 'manual least-privilege permission step must be explicit');

console.log('drive-runtime-provider-v25: bridge + readonly service-account fallback boundaries PASS');
