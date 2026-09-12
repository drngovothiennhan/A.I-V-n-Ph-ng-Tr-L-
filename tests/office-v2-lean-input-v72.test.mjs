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

test('canonical input gate is guaranteed before legacy bootstrap',()=>{
  const gate=app.indexOf("await import('/src/canonical-input-gate-v71.js?v=711')");
  const ui=app.indexOf("await import('/src/office-v2/ui-v2-shell.js?v=3002')");
  const leanUi=app.indexOf("await import('/src/office-v2/lean-dashboard-v72.js?v=3100')");
  const legacy=app.indexOf("await import('/src/bootstrap-v18.js?v=193')");
  const releaseSync=app.indexOf("await import('/src/release-v193.js?v=193')");
  assert.ok(gate>=0&&ui>gate&&leanUi>ui&&legacy>leanUi&&releaseSync>legacy);
  assert.match(app,/Mặc định: trả lời ngắn gọn\. Chỉ tạo nhiệm vụ hoặc file khi bạn yêu cầu rõ\./);
});

test('lean dashboard hides terminal and zero-value noise without deleting source data',()=>{
  assert.equal(LEAN_DASHBOARD_VERSION,'3.1.0-active-only');
  assert.match(lean,/DONE_RE/);
  assert.match(lean,/compactJobs/);
  assert.match(lean,/compactDepartments/);
  assert.match(lean,/compactApprovals/);
  assert.match(lean,/compactReports/);
  assert.match(lean,/compactLearning/);
  assert.match(lean,/hideRest\(jobs,3\)/);
  assert.doesNotMatch(lean,/localStorage\.(?:setItem|removeItem|clear)/);
  assert.doesNotMatch(lean,/fetch\s*\(/);
  assert.doesNotMatch(lean,/\.remove\s*\(/);
});

test('release re-applies lean visibility after dynamic modules render',()=>{
  assert.match(release,/const LEAN_UI = '3\.1\.0-active-only'/);
  const workspace=release.indexOf("task-workspace.js?v=2101");
  const ui=release.indexOf("ui-v2-shell.js?v=3002");
  const leanUi=release.indexOf("lean-dashboard-v72.js?v=3100");
  assert.ok(workspace>=0&&ui>workspace&&leanUi>ui);
  assert.match(release,/installLeanDashboard/);
});
