import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../api/app.ts',import.meta.url),'utf8');
const proxy=fs.readFileSync(new URL('../api/proxy.ts',import.meta.url),'utf8');

test('production shell loads UI V2 before the heavy legacy bootstrap',()=>{
  assert.match(app,/ui-v2-shell\.js\?v=3002/);
  assert.match(app,/rel="modulepreload" href="\/src\/office-v2\/ui-v2-shell\.js\?v=3002"/);
  const ui=app.indexOf('ui-v2-shell.js?v=3002');
  const bootstrap=app.indexOf('bootstrap-v18.js?v=193');
  assert.ok(ui>=0&&bootstrap>ui);
});

test('Chief Gemini reasoning is no longer forced to low',()=>{
  assert.doesNotMatch(proxy,/thinkingLevel:\s*['"]low['"]/);
  assert.match(proxy,/DEFAULT_THINKING_LEVEL\s*=\s*['"]medium['"]/);
  assert.match(proxy,/thinkingLevel:\s*thinkingLevel/);
});
