import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');

assert.match(workflow, /- name: Link verified Vercel project/);
assert.match(workflow, /rm -rf \.vercel/);
assert.match(workflow, /vercel link --yes --project "\$VERCEL_PROJECT_ID" --scope hiu-yhct --token="\$VERCEL_TOKEN"/);
assert.match(workflow, /p\.projectId!==process\.env\.VERCEL_PROJECT_ID\|\|p\.orgId!==process\.env\.VERCEL_ORG_ID/);
assert.match(workflow, /vercel pull --yes --environment=production --scope hiu-yhct --token="\$VERCEL_TOKEN"/);
assert.ok(workflow.indexOf('Link verified Vercel project') < workflow.indexOf('Pull production configuration'), 'project link must precede pull');
assert.ok(workflow.indexOf('Pull production configuration') < workflow.indexOf('Build production bundle'), 'pull must precede build');

console.log('deployment-vercel-link-v52: explicit verified project linkage before pull PASS');
