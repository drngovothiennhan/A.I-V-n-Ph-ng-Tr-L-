import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow=await readFile(new URL('../.github/workflows/quality-v20.yml',import.meta.url),'utf8');

assert.match(workflow,/if \[ -z \"\$VERCEL_TOKEN\" \]; then[\s\S]{0,320}exit 1/,'missing VERCEL_TOKEN must fail the production deployment job');
assert.doesNotMatch(workflow,/available=false/,'deployment must not report a successful job while silently skipping production');
assert.doesNotMatch(workflow,/if:\s*steps\.credential\.outputs\.available == 'true'/,'deployment steps must not be conditionally hidden behind a false-success credential gate');
assert.match(workflow,/curl[^\n]*-D \/tmp\/health\.headers/,'production smoke must capture health response headers');
assert.match(workflow,/x-ai-office-source-commit/i,'production smoke must verify the live source commit header');
assert.match(workflow,/GITHUB_SHA/,'production smoke must compare live source with the exact validated commit');
assert.match(workflow,/SOURCE_COMMIT[^\n]*GITHUB_SHA|GITHUB_SHA[^\n]*SOURCE_COMMIT/,'production smoke must fail on source-commit mismatch');

console.log('deployment-truthfulness-v38: missing credential fails + exact source commit smoke PASS');
