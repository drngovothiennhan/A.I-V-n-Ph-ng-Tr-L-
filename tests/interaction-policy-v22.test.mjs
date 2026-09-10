import assert from 'node:assert/strict';
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
console.log('interaction-policy-v22: ok');
