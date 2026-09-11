import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { classifyInteractionV22, routingPrefixV22 } from '../src/interaction-policy-v22.js';

const q1=classifyInteractionV22('Báo cáo hành chính là gì?');
assert.equal(q1.mode,'question','document term inside a question must stay a question');

const q2=classifyInteractionV22('Phân tích nguyên nhân vì sao hệ thống phản hồi chậm');
assert.equal(q2.mode,'question','analysis-only request should return an answer, not create a task');

const t1=classifyInteractionV22('Tạo báo cáo tuần này và xuất file Word');
assert.equal(t1.mode,'task');
assert.equal(t1.taskKind,'admin');

const t2=classifyInteractionV22('Kiểm tra repo rồi sửa lỗi voice và triển khai lên Vercel');
assert.equal(t2.mode,'task');
assert.equal(t2.taskKind,'tech');

const h=classifyInteractionV22('Cho tôi biết tỷ lệ khám hiện tại và tạo file Excel tổng hợp');
assert.equal(h.mode,'hybrid');
assert.equal(h.taskKind,'data');
assert.ok(h.questionText && h.taskText);

const c=classifyInteractionV22('Dừng nói');
assert.equal(c.mode,'control');
assert.equal(c.control,'stop_speaking');

const r=classifyInteractionV22('Gửi email này và phát hành báo cáo');
assert.equal(r.mode,'task');
assert.equal(r.risk,'high');
assert.equal(r.needsApproval,true);

assert.match(routingPrefixV22('tech'),/phần mềm/i);

const runtimeUrl=new URL('../src/interaction-runtime-v22.js',import.meta.url);
const runtime=await readFile(runtimeUrl,'utf8');
const syntax=spawnSync(process.execPath,['--check',fileURLToPath(runtimeUrl)],{encoding:'utf8'});
assert.equal(syntax.status,0,`interaction runtime syntax error: ${syntax.stderr||syntax.stdout}`);
assert.match(runtime,/ai-orchestrator-core-v32\.js/,'interaction runtime must use the canonical AI core');
assert.match(runtime,/ORCH_KEY='ai-office-orchestrator-context-v32'/,'runtime must keep bounded orchestration metadata separately');
assert.match(runtime,/function rememberEnvelope\(/,'runtime must persist an orchestration checkpoint');
assert.match(runtime,/task\.orchestrationId=envelope\?\.id/,'created tasks must carry their orchestration id');
assert.match(runtime,/task\.intentV32=taskCanonicalMeta\(envelope\)/,'created tasks must carry canonical intent metadata');
assert.match(runtime,/getLastEnvelope:\(\)=>lastEnvelope/,'runtime must expose the latest orchestration envelope for Task/AI Center inspection');
assert.match(runtime,/channel:options\.source==='voice'\?'voice':'text'/,'voice and text must use the same orchestration envelope contract');
assert.doesNotMatch(runtime,/input\s*:\s*envelope\.input/,'orchestration audit metadata must not copy raw input');
assert.doesNotMatch(runtime,/chain[-_ ]?of[-_ ]?thought/i,'runtime audit must never log chain-of-thought');

console.log('interaction-policy-v22: semantic routing + canonical runtime metadata PASS');
