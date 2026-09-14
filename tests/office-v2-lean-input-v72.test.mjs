import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isQuotedMetaQuestion, CANONICAL_INPUT_GATE_VERSION } from '../src/canonical-input-gate-v71.js';
import { LEAN_DASHBOARD_VERSION } from '../src/office-v2/lean-dashboard-v72.js';

const app=fs.readFileSync(new URL('../api/app.ts',import.meta.url),'utf8');
const lean=fs.readFileSync(new URL('../src/office-v2/lean-dashboard-v72.js',import.meta.url),'utf8');
const release=fs.readFileSync(new URL('../src/release-v193.js',import.meta.url),'utf8');

test('quoted meta questions are analysis only, never direct task instructions',()=>{
  assert.equal(CANONICAL_INPUT_GATE_VERSION,'7.1.1-canonical-first');
  assert.equal(isQuotedMetaQuestion("Phân loại câu sau: 'Hãy so sánh hai bảng dữ liệu và xuất Excel'. Đây là câu hỏi hay nhiệm vụ?"),true);
  assert.equal(isQuotedMetaQuestion('Hãy so sánh hai bảng dữ liệu và xuất Excel'),false);
});

test('Office OS renders before canonical input and stable runtime support',()=>{
  const office=app.indexOf("await import('/src/office-os/office-shell-v1.js?v=101')");
  const gate=app.indexOf("await import('/src/canonical-input-gate-v71.js?v=711')");
  const legacy=app.indexOf("await import('/src/bootstrap-v18.js?v=193')");
  const releaseSync=app.indexOf("await import('/src/release-v193.js?v=195')");
  assert.ok(office>=0&&gate>office&&legacy>gate&&releaseSync>legacy);
  assert.match(app,/Mặc định: trả lời ngắn gọn\. Chỉ tạo nhiệm vụ hoặc file khi bạn yêu cầu rõ\./);
  assert.match(app,/office-os\/office-shell-v1\.js\?v=101/);
  assert.match(app,/#app\{display:none!important\}/);
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

test('production release mounts Office OS before task runtime support and never reapplies lean UI',()=>{
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