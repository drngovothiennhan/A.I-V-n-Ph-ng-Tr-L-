import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isQuotedMetaQuestion, CANONICAL_INPUT_GATE_VERSION } from '../src/canonical-input-gate-v71.js';
import { LEAN_DASHBOARD_VERSION } from '../src/office-v2/lean-dashboard-v72.js';

const app=fs.readFileSync(new URL('../api/app.ts',import.meta.url),'utf8');
const entry=fs.readFileSync(new URL('../src/office-os/production-entry-v1.js',import.meta.url),'utf8');
const lean=fs.readFileSync(new URL('../src/office-v2/lean-dashboard-v72.js',import.meta.url),'utf8');
const release=fs.readFileSync(new URL('../src/release-v193.js',import.meta.url),'utf8');

test('quoted meta questions are analysis only, never direct task instructions',()=>{
  assert.equal(CANONICAL_INPUT_GATE_VERSION,'7.1.1-canonical-first');
  assert.equal(isQuotedMetaQuestion("Phân loại câu sau: 'Hãy so sánh hai bảng dữ liệu và xuất Excel'. Đây là câu hỏi hay nhiệm vụ?"),true);
  assert.equal(isQuotedMetaQuestion('Hãy so sánh hai bảng dữ liệu và xuất Excel'),false);
});

test('Office OS stays hidden until canonical input and stable runtime support are ready',()=>{
  assert.match(app,/office-os\/production-entry-v1\.js\?v=100/);
  assert.doesNotMatch(app,/office-shell-v1\.js|canonical-input-gate-v71\.js|bootstrap-v18\.js|release-v193\.js/);
  const bootstrap=entry.indexOf("../bootstrap-v18.js");
  const runtime=entry.indexOf("../interaction-runtime-v23.js?v=230");
  const gate=entry.indexOf("../canonical-input-gate-v71.js?v=712-p4");
  const ready=entry.indexOf('assertCanonicalRuntimeReady()');
  const office=entry.indexOf("./office-shell-v1.js?v=102");
  assert.ok(bootstrap>=0&&runtime>bootstrap&&gate>runtime&&ready>gate&&office>ready);
  assert.match(app,/Đang mở văn phòng của bạn/);
});

test('lean dashboard remains safe as rollback-only asset without mutating source data',()=>{
  assert.equal(LEAN_DASHBOARD_VERSION,'3.1.1-active-only');
  assert.match(lean,/DONE_RE/);
  assert.match(lean,/compactJobs/);
  assert.match(lean,/compactDepartments/);
  assert.match(lean,/compactApprovals/);
  assert.match(lean,/compactReports/);
  assert.match(lean,/compactLearning/);
  assert.match(lean,/hideRest\(jobs,3\)/);
  assert.match(lean,/getElementById\('cred22Launcher'\)/);
  assert.match(lean,/#cred22Launcher\{display:none!important\}/);
  assert.doesNotMatch(lean,/localStorage\.(?:setItem|removeItem|clear)/);
  assert.doesNotMatch(lean,/fetch\s*\(/);
  assert.doesNotMatch(lean,/\.remove\s*\(/);
});

test('rollback release retains task runtime support and never reapplies lean UI',()=>{
  assert.match(release,/const OFFICE_OS_SHELL = '1\.0\.0-p1'/);
  const officeOS=release.indexOf("office-os/office-shell-v1.js?v=101");
  const taskBridge=release.indexOf("task-runtime-bridge.js?v=2102");
  assert.ok(officeOS>=0&&taskBridge>officeOS);
  assert.match(release,/installAIOfficeOSShell/);
  assert.match(release,/installOfficeV2TaskRuntimeBridge/);
  assert.doesNotMatch(release,/installLeanDashboard/);
  assert.match(release,/cred22Launcher/);
  assert.match(release,/v19Dock/);
});