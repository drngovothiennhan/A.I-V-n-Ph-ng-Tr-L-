import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const workflow = fs.readFileSync('.github/workflows/quality-v20.yml', 'utf8');

assert.equal(
  (workflow.match(/tr -d '\\r'/g) || []).length,
  8,
  'all release header parsers must strip CR with tr instead of escaped awk string mutation'
);
assert.equal(
  workflow.includes('gsub(/\\r/'),
  false,
  'escaped awk gsub CR parser must not return'
);

const sample = 'HTTP/2 200\r\nx-ai-office-source-commit: abc123\r\n';
const cmd = `printf '%s' "$HDR" | awk 'BEGIN{IGNORECASE=1} /^x-ai-office-source-commit:/ {print $2}' | tail -1 | tr -d '\\r'`;
const run = spawnSync('bash', ['-lc', cmd], {
  encoding: 'utf8',
  env: { ...process.env, HDR: sample }
});
assert.equal(run.status, 0, run.stderr || run.stdout);
assert.equal(run.stdout.trim(), 'abc123');

console.log('deployment-header-parser-v51: CRLF-safe release header parsing PASS');
