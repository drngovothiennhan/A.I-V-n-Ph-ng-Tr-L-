import fs from 'node:fs';
import assert from 'node:assert/strict';

const health = fs.readFileSync('api/health.ts', 'utf8');
const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');

assert.match(health, /process\.env\.AI_OFFICE_SOURCE_COMMIT\s*\|\|\s*process\.env\.VERCEL_GIT_COMMIT_SHA\s*\|\|\s*'unknown'/);
assert.match(health, /res\.setHeader\('x-ai-office-source-commit', sourceCommit\(\)\)/);
assert.match(workflow, /vercel deploy --prebuilt --prod --skip-domain --env "AI_OFFICE_SOURCE_COMMIT=\$GITHUB_SHA" --token="\$VERCEL_TOKEN"/,
  'production-environment candidate must retain explicit validated source SHA while withholding production domains');
assert.match(workflow, /SOURCE_COMMIT.*GITHUB_SHA/s);
assert.match(workflow, /vercel promote "\$URL" --yes/,
  'the exact stamped candidate must be promoted only after candidate verification');

console.log('runtime source commit contract: PASS');
