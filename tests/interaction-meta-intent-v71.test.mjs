import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyInteractionV22 } from '../src/interaction-policy-v22.js';
import { classifyCanonicalIntent } from '../src/ai-orchestrator-core-v32.js';

test('meta-question about a quoted data command remains a question',()=>{
  const text="Phân loại câu sau: 'Hãy so sánh hai bảng dữ liệu và xuất Excel'. Đây là câu hỏi hay nhiệm vụ? Chỉ trả lời loại và lý do ngắn gọn.";
  const interaction=classifyInteractionV22(text,{});
  assert.equal(interaction.mode,'question');
  assert.equal(interaction.taskKind,'general');
  const canonical=classifyCanonicalIntent(text,{interaction});
  assert.equal(canonical.type,'QUESTION');
  assert.deepEqual(canonical.artifactFormats,[]);
});

test('direct data command is still a data task',()=>{
  const text='Hãy so sánh hai bảng dữ liệu và xuất Excel';
  const interaction=classifyInteractionV22(text,{});
  assert.equal(interaction.mode,'task');
  assert.equal(interaction.taskKind,'data');
  const canonical=classifyCanonicalIntent(text,{interaction});
  assert.equal(canonical.type,'DATA_TASK');
  assert.ok(canonical.artifactFormats.includes('xlsx'));
});

test('quoted document instruction asked for explanation does not create document task',()=>{
  const text='Giải thích vì sao câu "Soạn báo cáo Word và gửi đi" là một nhiệm vụ?';
  const interaction=classifyInteractionV22(text,{});
  assert.equal(interaction.mode,'question');
  const canonical=classifyCanonicalIntent(text,{interaction});
  assert.equal(canonical.type,'QUESTION');
  assert.deepEqual(canonical.artifactFormats,[]);
});
