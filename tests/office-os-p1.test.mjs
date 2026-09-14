import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const shell=fs.readFileSync(new URL('../src/office-os/office-shell-v1.js',import.meta.url),'utf8');
const release=fs.readFileSync(new URL('../src/release-v193.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../api/app.ts',import.meta.url),'utf8');
const entryUrl=new URL('../src/office-os/production-entry-v1.js',import.meta.url);
const entry=fs.readFileSync(entryUrl,'utf8');
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

test('rollback release no longer installs legacy UI V2, lean or mobile shells',()=>{
  assert.doesNotMatch(release,/installAIOfficeUIV2/);
  assert.doesNotMatch(release,/installLeanDashboard/);
  assert.doesNotMatch(release,/installMobileShell/);
  assert.match(release,/office-os\/office-shell-v1\.js\?v=101/);
  assert.match(release,/installAIOfficeOSShell/);
});

test('P4 production root is a clean Office OS shell with one entrypoint',()=>{
  assert.match(app,/id="aiOfficeOSBoot"/);
  assert.match(app,/office-os\/production-entry-v1\.js\?v=100/);
  assert.match(app,/x-ai-office-production-entry/);
  assert.doesNotMatch(app,/raw\.githubusercontent\.com/);
  assert.doesNotMatch(app,/index\.html/);
  assert.doesNotMatch(app,/release-v193\.js/);
  assert.doesNotMatch(app,/canonical-input-gate-v71\.js/);
  assert.doesNotMatch(app,/bootstrap-v18\.js/);
  assert.doesNotMatch(app,/ui-v2-shell|lean-dashboard-v72|mobile-shell-v73/);
});

test('P4 production entry boots canonical runtime before mounting Office OS',()=>{
  const bootstrap=entry.indexOf("../bootstrap-v18.js");
  const knowledge=entry.indexOf("../knowledge-router-v20.js?v=271");
  const interaction=entry.indexOf("../interaction-runtime-v23.js?v=230");
  const canonical=entry.indexOf("../canonical-input-gate-v71.js?v=712-p4");
  const ready=entry.indexOf('assertCanonicalRuntimeReady()');
  const shellMount=entry.indexOf("./office-shell-v1.js?v=102");
  assert.ok(bootstrap>=0&&knowledge>bootstrap&&interaction>knowledge&&canonical>interaction&&ready>canonical&&shellMount>ready,'runtime must be ready before the user shell is mounted');
  assert.match(entry,/installCanonicalResultContract\(\)/);
  assert.match(entry,/normalizeCanonicalResult/);
  assert.match(entry,/AIOfficeProductionRuntime/);
  assert.match(entry,/ai-office-production-ready/);
  assert.doesNotMatch(entry,/runtime-ready-hotfix/);
  assert.doesNotMatch(entry,/release-v193\.js/);
  assert.doesNotMatch(entry,/ui-v2-shell|lean-dashboard-v72|mobile-shell-v73/);
});

test('P4 production entry is valid JavaScript',()=>{
  const checked=spawnSync(process.execPath,['--check',fileURLToPath(entryUrl)],{encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr||checked.stdout);
});
