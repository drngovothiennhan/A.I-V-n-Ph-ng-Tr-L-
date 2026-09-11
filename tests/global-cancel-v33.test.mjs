import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cancellationIntent } from '../src/interaction-policy-v21.js';

assert.equal(cancellationIntent('Hủy tải lên'), 'upload');
assert.equal(cancellationIntent('Dừng xử lý'), 'processing');
assert.equal(cancellationIntent('Hủy AI đang tạo'), 'ai_generation');
assert.equal(cancellationIntent('Bỏ kết quả này'), 'output');
assert.equal(cancellationIntent('Hủy hành động đang chờ'), 'pending_action');
assert.equal(cancellationIntent('Không dùng dữ liệu vừa gửi'), 'input');
assert.equal(cancellationIntent('Hủy'), 'command');
assert.equal(cancellationIntent('Dừng'), 'command');

const globalCancel = await readFile(new URL('../src/global-cancel-v33.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../src/interaction-runtime-v23.js', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../src/interaction-runtime-v22.js', import.meta.url), 'utf8');
const release = await readFile(new URL('../src/release-v193.js', import.meta.url), 'utf8');

assert.match(globalCancel, /3\.3\.0-global-cancel/);
for (const kind of ['upload','processing','ai_generation','output','pending_action']) {
  assert.match(globalCancel, new RegExp(`case '${kind}'`), `global cancel must implement ${kind}`);
  assert.ok(bridge.includes(`'${kind}'`), `interaction bridge must recognize ${kind}`);
}
assert.match(globalCancel, /activeAbort|cancelCurrentCommand/, 'processing cancellation must reach abort-capable runtime');
assert.match(globalCancel, /ai-office-cancel-upload/, 'upload cancellation must publish cleanup event');
assert.match(globalCancel, /outputValidity='cancelled'/, 'output cancellation must invalidate output without silently deleting audit history');
assert.match(globalCancel, /AUDIT_KEY='ai-office-cancel-audit-v33'/, 'cancellation metadata must be auditable');
assert.doesNotMatch(globalCancel, /localStorage\.clear\(/, 'global cancel must never wipe application storage');

const pre = bridge.indexOf('installTextPreInterceptor();');
const oldRuntime = bridge.indexOf("await import('./interaction-runtime-v22.js?v=221')");
assert.ok(pre >= 0 && oldRuntime > pre, 'new cancel interceptor must install before v2.2 send interceptor');
assert.match(bridge, /attachGlobalCancelVoice/, 'voice cancellation bridge must exist');
assert.match(release, /interaction-runtime-v23\.js\?v=230/, 'release must boot global cancel interaction bridge');
const oldVoiceAttach = release.indexOf('window.AIOfficeV22?.attachAfterV21?.()');
const cancelVoiceAttach = release.indexOf('interactionV23.attachGlobalCancelVoice?.()');
assert.ok(oldVoiceAttach >= 0 && cancelVoiceAttach > oldVoiceAttach, 'global cancel voice bridge must wrap the final v2.2 voice dispatcher');

assert.match(runtime, /createOrchestrationEnvelope/, 'v2.2 runtime must retain canonical orchestration envelope');
assert.match(runtime, /orchestrationId/, 'task runtime must retain orchestration ID');
assert.match(runtime, /intentV32/, 'tasks must retain canonical intent metadata');
assert.match(runtime, /ai-office-orchestrator-context-v32/, 'orchestration metadata must be persisted separately from raw chain-of-thought');

console.log('global-cancel-v33 + canonical runtime bridge: PASS');
