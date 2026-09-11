import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canonicalTaskState } from '../src/operations-center-v36.js';

const cases={
  queued:'QUEUED',received:'PLANNING',analyzing:'PLANNING',planning:'PLANNING',
  waiting_permission:'WAITING_PERMISSION',awaiting_permission:'WAITING_PERMISSION',
  waiting_approval:'WAITING_APPROVAL',awaiting_approval:'WAITING_APPROVAL',
  awaiting_input:'WAITING_INPUT',running:'RUNNING',executing:'RUNNING',delegated:'RUNNING',processing:'RUNNING',
  verifying:'VERIFYING',creating_output:'CREATING_OUTPUT',packaging:'CREATING_OUTPUT',
  completed:'COMPLETED',failed:'FAILED',cancelled:'CANCELLED',rejected:'CANCELLED',approval_cancelled:'CANCELLED',input_cancelled:'CANCELLED',output_cancelled:'CANCELLED'
};
for(const [input,expected] of Object.entries(cases))assert.equal(canonicalTaskState(input),expected,`${input} must map to ${expected}`);

const source=await readFile(new URL('../src/operations-center-v36.js',import.meta.url),'utf8');
const release=await readFile(new URL('../src/release-v193.js',import.meta.url),'utf8');

assert.match(source,/3\.6\.0-unified-operations-center/);
assert.match(source,/const TASK_KEY='ai-office-tasks-v11'/,'Task Center must read the real task store');
assert.match(source,/task\?\.progressMode==='measured'/,'percent progress must require an explicit measured marker');
assert.doesNotMatch(source,/progressMode\s*!==\s*'measured'[\s\S]{0,80}%/,'unmeasured task progress must not be rendered as a fake percentage');
assert.match(source,/AIOfficeGlobalCancelV33\?\.cancel\?\.\('task'\)/,'Task Center cancel must reuse global cancellation');
assert.match(source,/AIOfficeV22\?\.handleMessage\?\./,'retry must re-enter the canonical interaction runtime');
assert.match(source,/const HEALTH_URL='\/api\/health'/,'AI Center must use the existing health endpoint');
assert.match(source,/x-ai-office-source-commit/,'deployment status must use the source-commit response header when present');
assert.doesNotMatch(source,/provider-check\?probe=all|probe=gemini-grounding|gemini-grounding/,'AI Center must not consume Gemini quota just to render the dashboard');
for(const label of ['AI Request Count','AI Latency','Provider Quota','Scheduler']){
  assert.ok(source.includes(label),`${label} row must exist`);
}
assert.match(source,/NO TELEMETRY/,'missing runtime telemetry must be disclosed instead of fabricated');
assert.match(source,/Health API RTT đo được/,'measured health RTT must be labeled separately from model latency');
assert.match(source,/durable semantic index\/delta sync chưa có telemetry/,'AI Center must not pretend Drive semantic indexing exists');
assert.match(source,/rows\.filter\(row=>row\.kind==='issue'\|\|row\.kind==='unknown'\)/,'default AI Center view must focus on issues/unknowns');
assert.match(source,/function startTaskRefresh\(\)\{[\s\S]{0,260}activeTab==='tasks'[\s\S]{0,80}renderTasks\(\)/,'task polling must only refresh the open Task Center');
assert.match(source,/clearInterval\(taskTimer\)/,'Task Center polling must be cleaned up');
assert.match(source,/data-ops36-nav='ai'|dataset\.ops36Nav='ai'/,'existing navigation must gain one AI Center entry instead of a second dashboard');
assert.match(source,/Nhiệm vụ/,'existing task navigation must be reused');
assert.match(release,/operations-center-v36\.js\?v=360/,'release must boot unified Operations Center');
assert.match(release,/operations\.installOperationsCenter\?\.\(\)/,'release must install Operations Center');
assert.match(release,/window\.AIOfficeOperationsVersion = OPERATIONS_CENTER/,'release must expose Operations Center version');

console.log('operations-center-v36: real task state + honest AI telemetry + bounded polling PASS');
