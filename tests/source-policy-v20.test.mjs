import assert from 'node:assert/strict';
import { smartIntent, classifySourcePolicy, stripMarkup } from '../src/source-policy-v20.js';

const baseClassifier = (text) => ({
  kind: /kế hoạch|báo cáo/i.test(text) ? 'admin' : 'question',
  confidence: 0.7,
  artifactFormats: /kế hoạch|báo cáo/i.test(text) ? ['docx'] : []
});

const cases = [
  ['hôm nay', 'question', 'direct_runtime'],
  ['Kế hoạch 356/KH-UBND là gì?', 'question', 'general_question'],
  ['Trong Drive có mẫu Kế hoạch khám sức khỏe nào?', 'question', 'internal_admin_question'],
  ['Soạn Kế hoạch triển khai khám sức khỏe', 'admin', 'admin_document'],
  ['Tin mới hôm nay về AI?', 'question', 'research_question']
];

for (const [text, expectedKind, expectedMode] of cases) {
  const intent = smartIntent(text, baseClassifier, {});
  const policy = classifySourcePolicy(text, intent);
  assert.equal(intent.kind, expectedKind, `intent mismatch for: ${text}`);
  assert.equal(policy.mode, expectedMode, `source policy mismatch for: ${text}`);
}

const cleaned = stripMarkup('<!doctype html><html><head><style>x{color:red}</style></head><body><h1>Xin chào</h1><script>alert(1)</script>Nội dung</body></html>');
assert.equal(/<!doctype|<html|<script|<style|alert\(1\)/i.test(cleaned), false, 'raw markup leaked');
assert.match(cleaned, /Xin chào/);

console.log('source-policy-v20: all regression cases passed');
