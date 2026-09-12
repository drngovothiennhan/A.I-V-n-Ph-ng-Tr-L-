import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');

assert.match(workflow, /npm install --global vercel@59\.11\.7/,'Vercel CLI must be pinned to the validated CI version');
assert.doesNotMatch(workflow, /vercel@latest/,'Vercel CLI must not drift through @latest');
assert.match(workflow, /vercel build --prod/);
assert.match(workflow, /vercel deploy --prebuilt --prod --skip-domain/);
assert.match(workflow, /vercel promote/);

console.log('deployment Vercel CLI pin: PASS');
