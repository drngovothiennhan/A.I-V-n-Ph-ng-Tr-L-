import assert from 'node:assert/strict';
import {
  AI_CORE_VERSION,
  CANONICAL_INTENTS as I,
  classifyCanonicalIntent,
  createOrchestrationEnvelope
} from '../src/ai-orchestrator-core-v32.js';

const c=(text,context={})=>classifyCanonicalIntent(text,context);

assert.equal(c('Báo cáo hôm nay có gì?').type,I.QUESTION,'information question must stay QUESTION');
const report=c('Hãy lập báo cáo hôm nay thành file Word.');
assert.equal(report.type,I.DOCUMENT_TASK,'report + Word request must be DOCUMENT_TASK');
assert.deepEqual(report.artifactFormats,['docx']);
assert.equal(c('Lọc danh sách này trong Excel.').type,I.DATA_TASK);
assert.equal(c('Tìm thông tin mới nhất về quy định này.').type,I.SEARCH_TASK);
const internal=c('Theo tài liệu nội bộ của cơ quan, nội dung này là gì?');
assert.equal(internal.type,I.INTERNAL_KNOWLEDGE_TASK);
assert.equal(internal.source.mode,'internal');
assert.equal(internal.source.internalRequested,true);
const mail=c('Gửi email báo cáo cho phòng hành chính.');
assert.equal(mail.type,I.COMMUNICATION_TASK);
assert.equal(mail.needsApproval,true,'send email is a side-effect/high-risk interaction in current policy');
assert.equal(c('Hủy công việc này.').type,I.SYSTEM_COMMAND);
assert.equal(c('Mở AI Center.').type,I.APP_COMMAND);
assert.equal(c('Dừng nói.').type,I.VOICE_COMMAND);
const normal=c('Thời tiết hôm nay thế nào?');
assert.equal(normal.source.mode,'external-default');
assert.equal(normal.source.preferredProvider,'gemini');
assert.equal(normal.source.internalRequested,false);
const envelope=createOrchestrationEnvelope('Hãy lập báo cáo hôm nay thành file Word.',{conversationId:'test-conversation'});
assert.equal(envelope.intent.type,I.DOCUMENT_TASK);
assert.equal(envelope.context.conversationId,'test-conversation');
assert.equal(envelope.route.artifactFormats[0],'docx');
assert.match(AI_CORE_VERSION,/^3\.2\./);

console.log('ai-orchestrator-core-v32: canonical intent + source defaults PASS');
