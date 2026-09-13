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
  assert.match(release,/office-os\/office-shell-v1\.js\?v=101/);
  assert.match(release,/installAIOfficeOSShell/);
  const shellIndex=release.indexOf("office-os/office-shell-v1.js?v=101");
  const aiCoreIndex=release.indexOf('ai-orchestrator-core-v32.js');
  const credentialsIndex=release.indexOf('credential-setup-v22.js');
  assert.ok(shellIndex>=0&&aiCoreIndex>shellIndex&&credentialsIndex>shellIndex,'Office OS must boot before legacy runtime modules');
});

test('Vercel renders Office OS first and never exposes legacy dashboard during boot',()=>{
  assert.match(app,/#app\{display:none!important\}/);
  assert.match(app,/id=\"aiOfficeOSBoot\"/);
  assert.match(app,/office-shell-v1\.js\?v=101/);
  assert.match(app,/canonical-input-gate-v71\.js\?v=711/);
  assert.match(app,/bootstrap-v18\.js\?v=193/);
  assert.match(app,/release-v193\.js\?v=195/);
  assert.match(app,/sessionStorage\.setItem\('ai-office-credentials-seen-v230','1'\)/);
  const boot=app.split('const bootChain = ')[1]||'';
  const shellIndex=boot.indexOf('office-shell-v1.js?v=101');
  const canonicalIndex=boot.indexOf('canonical-input-gate-v71.js?v=711');
  const runtimeIndex=boot.indexOf('bootstrap-v18.js?v=193');
  const releaseIndex=boot.indexOf('release-v193.js?v=195');
  assert.ok(shellIndex>=0&&canonicalIndex>shellIndex&&runtimeIndex>canonicalIndex&&releaseIndex>runtimeIndex,'Office OS must install before canonical/runtime/release chain');
  assert.doesNotMatch(boot,/ui-v2-shell/);
  assert.doesNotMatch(boot,/lean-dashboard-v72/);
  assert.doesNotMatch(boot,/mobile-shell-v73/);
});
