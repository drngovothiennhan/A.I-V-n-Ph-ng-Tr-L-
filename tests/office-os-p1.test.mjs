import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell=fs.readFileSync(new URL('../src/office-os/office-shell-v1.js',import.meta.url),'utf8');
const release=fs.readFileSync(new URL('../src/release-v193.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../api/app.ts',import.meta.url),'utf8');
const scope=fs.readFileSync(new URL('../docs/AI_OFFICE_OS_SCOPE_LOCK.md',import.meta.url),'utf8');

test('P1 exposes only the five approved user surfaces',()=>{
  assert.match(shell,/\['home','work','assistant','knowledge','account'\]/);
  for(const label of ['Trang chủ','Công việc','A.I','Tài liệu','Tài khoản'])assert.match(shell,new RegExp(label.replace('.','\\.')));
});

test('social connectors are explicitly disabled in runtime scope',()=>{
  assert.match(shell,/socialConnectors:false/);
  assert.match(shell,/facebook:false/);
  assert.match(shell,/zalo:false/);
  assert.match(scope,/Facebook integration\./);
  assert.match(scope,/Zalo integration\./);
  assert.match(scope,/Do not implement Facebook or Zalo at any phase\./);
});

test('release boot no longer installs legacy UI V2, lean or mobile shells',()=>{
  assert.doesNotMatch(release,/installAIOfficeUIV2/);
  assert.doesNotMatch(release,/installLeanDashboard/);
  assert.doesNotMatch(release,/installMobileShell/);
  assert.match(release,/office-os\/office-shell-v1\.js/);
  assert.match(release,/installAIOfficeOSShell/);
});

test('Vercel app boot chain is reduced to canonical input, runtime and release',()=>{
  assert.match(app,/canonical-input-gate-v71\.js\?v=711/);
  assert.match(app,/bootstrap-v18\.js\?v=193/);
  assert.match(app,/release-v193\.js\?v=194/);
  const boot=app.split('const bootChain = ')[1]||'';
  assert.doesNotMatch(boot,/ui-v2-shell/);
  assert.doesNotMatch(boot,/lean-dashboard-v72/);
  assert.doesNotMatch(boot,/mobile-shell-v73/);
});
