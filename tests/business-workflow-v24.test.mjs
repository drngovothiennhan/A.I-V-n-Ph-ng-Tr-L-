import assert from 'node:assert/strict';
import { classifyInteractionV22 } from '../src/interaction-policy-v22.js';
import { classifySourcePolicy } from '../src/source-policy-v20.js';

function policyFor(text, context = {}) {
  const interaction = classifyInteractionV22(text, context);
  const baseKind = interaction.taskKind === 'presentation' || interaction.taskKind === 'image' || interaction.taskKind === 'tech'
    ? interaction.taskKind
    : interaction.taskKind || 'question';
  const policy = classifySourcePolicy(text, { kind: interaction.mode === 'question' ? 'question' : baseKind });
  return { interaction, policy };
}

{
  const { interaction, policy } = policyFor('Thời tiết hôm nay?');
  assert.equal(interaction.mode, 'question');
  assert.equal(policy.useDrive, false, 'current weather must not depend on Drive');
  assert.equal(policy.useWeb, true, 'current weather should use external/current source');
}

{
  const { interaction, policy } = policyFor('Tóm tắt tài liệu kế hoạch trong Drive');
  assert.equal(interaction.mode, 'question');
  assert.equal(policy.useDrive, true);
  assert.equal(policy.mode, 'internal_admin_question');
  assert.equal(policy.officialOnly, true);
}

{
  const { interaction, policy } = policyFor('Tạo kế hoạch kiểm tra an toàn thực phẩm');
  assert.equal(interaction.mode, 'task');
  assert.equal(interaction.taskKind, 'admin');
  assert.equal(policy.mode, 'admin_document');
  assert.equal(policy.useDrive, true);
  assert.equal(policy.useWeb, true);
  assert.equal(policy.officialOnly, true);
}

{
  const { interaction, policy } = policyFor('Tạo file Excel tổng hợp danh sách đã khám');
  assert.equal(interaction.mode, 'task');
  assert.equal(interaction.taskKind, 'data');
  assert.equal(policy.mode, 'data_task');
  assert.equal(policy.useDrive, false);
  assert.equal(policy.useWeb, false);
}

{
  const { interaction } = policyFor('Cho tôi biết tỷ lệ khám hiện tại và tạo file Excel tổng hợp');
  assert.equal(interaction.mode, 'hybrid');
  assert.equal(interaction.taskKind, 'data');
  assert.equal(interaction.answerFirst, true);
}

{
  const { interaction } = policyFor('Hủy tất cả');
  assert.equal(interaction.mode, 'control');
  assert.equal(interaction.control, 'cancel_all');
}

{
  const { interaction } = policyFor('Tiếp tục công việc lúc nãy', { hasActiveTask: true });
  assert.equal(interaction.mode, 'task');
}

{
  const { interaction } = policyFor('Tạo infographic PNG tuyên truyền khám sức khỏe');
  assert.equal(interaction.mode, 'task');
  assert.equal(interaction.taskKind, 'image');
}

{
  const { interaction, policy } = policyFor('Tại sao người bệnh bị tăng huyết áp?');
  assert.equal(interaction.mode, 'question');
  assert.equal(policy.mode, 'medical_question');
  assert.equal(policy.useWeb, true);
}

{
  const { interaction } = policyFor('Gửi email này và phát hành báo cáo');
  assert.equal(interaction.mode, 'task');
  assert.equal(interaction.risk, 'high');
  assert.equal(interaction.needsApproval, true);
}

console.log('business-workflow-v24: office intent/source/risk scenarios PASS');
