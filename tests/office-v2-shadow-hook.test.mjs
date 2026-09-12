import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const interceptor=fs.readFileSync(new URL('../src/office-v2/shadow-interceptor.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../src/bootstrap-v17.js',import.meta.url),'utf8');

test('shadow interceptor is strictly observe-only',()=>{
  assert.match(interceptor,/evaluateOfficeV2Shadow/);
  assert.match(interceptor,/addEventListener\('click'/);
  assert.match(interceptor,/addEventListener\('keydown'/);
  assert.doesNotMatch(interceptor,/preventDefault\s*\(/);
  assert.doesNotMatch(interceptor,/stopImmediatePropagation\s*\(/);
  assert.doesNotMatch(interceptor,/stopPropagation\s*\(/);
  assert.doesNotMatch(interceptor,/fetch\s*\(/);
});

test('canonical bootstrap installs shadow observer after legacy bootstrap and before policy layers',()=>{
  const legacy=bootstrap.indexOf("import('./bootstrap-v18.js')");
  const shadow=bootstrap.indexOf("import('./office-v2/shadow-interceptor.js?v=220')");
  const source=bootstrap.indexOf("import('./internal-source-control-v27.js?v=270')");
  assert.ok(legacy>=0&&shadow>legacy&&source>shadow);
  assert.match(bootstrap,/installOfficeV2ShadowInterceptor/);
  assert.match(bootstrap,/ai-office-v2-repatch-voice/);
});
