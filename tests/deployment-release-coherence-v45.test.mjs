import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');

assert.match(workflow, /x-ai-office-source-commit/i, 'health source commit must be smoke-checked');
assert.match(workflow, /x-ai-office-ui-source-ref/i, 'dashboard shell source ref must be smoke-checked');
assert.match(workflow, /x-ai-office-asset-source-ref/i, 'runtime asset source ref must be smoke-checked');
assert.match(workflow, /UI_SOURCE_REF[\s\S]*GITHUB_SHA/, 'UI shell ref must be compared with GITHUB_SHA');
assert.match(workflow, /ASSET_SOURCE_REF[\s\S]*GITHUB_SHA/, 'asset ref must be compared with GITHUB_SHA');
assert.match(workflow, /research-safety-guard-v263\.js/, 'known safety asset must remain part of the production smoke');

console.log('deployment release coherence smoke contract: PASS');
