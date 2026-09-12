import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  answerLooksLikeFailure,
  cleanTaskRecord,
  metaQuestionAnswer,
  requestsInternalKnowledge,
  requiresLiveEvidence,
  shouldSmartIntercept
} from '../src/v72-smart-core.js';

const app=fs.readFileSync(new URL('../api/app.ts',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../src/v72-smart-runtime.js',import.meta.url),'utf8');

test('stable common knowledge is not treated as live-only evidence',()=>{
  assert.equal(requiresLiveEvidence('Vitamin C tan trong nước hay trong dầu?'),false);
  assert.equal(requiresLiveEvidence('Giá vàng hôm nay bao nhiêu?'),true);
});

test('meta question classifies quoted action without creating a task',()=>{
  const answer=metaQuestionAnswer("Phân loại câu sau: 'Hãy xuất danh sách ra Excel'. Đây là câu hỏi hay nhiệm vụ?",()=>({mode:'task'}));
  assert.match(answer,/^Nhiệm vụ\./);
});

test('smart fast path only takes external normal questions',()=>{
  assert.equal(shouldSmartIntercept('Vitamin C tan trong nước hay trong dầu?',{mode:'question'},{internalOptIn:false}),true);
  assert.equal(shouldSmartIntercept('Tìm trong Drive báo cáo quý 3',{mode:'question'},{internalOptIn:false}),false);
  assert.equal(requestsInternalKnowledge('Tìm trong Drive báo cáo quý 3'),true);
  assert.equal(shouldSmartIntercept('Tạo một kế hoạch 3 mục',{mode:'task'},{internalOptIn:false}),false);
});

test('known refusal wording is eligible for model-knowledge recovery',()=>{
  assert.equal(answerLooksLikeFailure('Tôi chưa tìm được nguồn đủ phù hợp để trả lời chắc chắn.'),true);
});

test('job card title is restored to exact user instruction after routed prefix',()=>{
  const result=cleanTaskRecord({title:'văn bản hành chính. Tạo một kế hoạch công việc 3 mục cho ngày mai',originalMessage:'Tạo một kế hoạch công việc 3 mục cho ngày mai'});
  assert.equal(result.changed,true);
  assert.equal(result.task.title,'Tạo một kế hoạch công việc 3 mục cho ngày mai');
});

test('production shell loads V72 before legacy bootstrap',()=>{
  assert.match(app,/v72-smart-runtime\.js\?v=720/);
  const smart=app.indexOf('v72-smart-runtime.js?v=720');
  const bootstrap=app.indexOf('bootstrap-v18.js?v=193');
  assert.ok(smart>=0&&bootstrap>smart);
});

test('V72 runtime keeps irreversible task path untouched and collapses technical controls',()=>{
  assert.match(runtime,/if\(intent\?\.mode==='task'\|\|intent\?\.mode==='hybrid'\)\{scheduleTaskCleanup\(\);return\}/);
  assert.match(runtime,/Tùy chọn nâng cao/);
  assert.match(runtime,/Cấu hình hệ thống/);
});
