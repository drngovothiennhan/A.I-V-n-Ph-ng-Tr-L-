import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../integrations/google-apps-script/DriveBrainBridge.gs', import.meta.url), 'utf8');

assert.match(source, /AI_OFFICE_REGISTRY_VERSION\s*=\s*'2\.4'/);
assert.match(source, /AI_OFFICE_PRODUCTION_SCOPES\s*=\s*\['02_APPROVED','01_KNOWLEDGE','03_TEMPLATES','04_SKILLS'\]/);
assert.match(source, /AI_OFFICE_GROUND_TRUTH_SCOPE\s*=\s*'02_APPROVED'/);
assert.match(source, /function\s+scopeForFile_\s*\(/, 'nested parent scope resolution must exist');
assert.match(source, /FILE_OUTSIDE_PRODUCTION_SCOPES/, 'direct read must reject non-production scopes');
assert.match(source, /requestedScopes_\(payload\)/, 'search/list must sanitize requested scopes');
assert.ok(!/AI_OFFICE_PRODUCTION_SCOPES[^;]*05_TRAINING/.test(source), 'training scope must not be production retrieval');
assert.ok(!/AI_OFFICE_PRODUCTION_SCOPES[^;]*06_OUTPUTS/.test(source), 'outputs scope must not be production retrieval');
assert.ok(!/AI_OFFICE_PRODUCTION_SCOPES[^;]*00_INBOX/.test(source), 'inbox scope must not be production retrieval');
assert.ok(!/AI_OFFICE_PRODUCTION_SCOPES[^;]*07_ARCHIVE/.test(source), 'archive scope must not be production retrieval');

console.log('drive-bridge-contract-v24: Apps Script production boundaries PASS');
