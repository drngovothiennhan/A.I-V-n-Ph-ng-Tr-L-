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

const internalOff=classifySourcePolicy('Trong Drive có mẫu Kế hoạch nào?',{kind:'question'});
assert.equal(internalOff.internalRequested,true,'internal request should be detected');
assert.equal(internalOff.internalOptIn,false,'internal sources must default off');
assert.equal(internalOff.useDrive,false,'Drive must not be searched until explicit opt-in');
assert.equal(internalOff.useWeb,true,'Gemini/web remains available when internal is off');

const internalOn=classifySourcePolicy('Trong Drive có mẫu Kế hoạch nào?',{kind:'question',useInternal:true});
assert.equal(internalOn.internalOptIn,true,'explicit opt-in should be preserved');
assert.equal(internalOn.useDrive,true,'Drive may be searched only after opt-in');
assert.equal(internalOn.priority[0],'gemini_google_search','Gemini Search remains the primary reasoning source');

const adminOff=classifySourcePolicy('Soạn Kế hoạch triển khai khám sức khỏe',{kind:'admin'});
assert.equal(adminOff.useDrive,false,'administrative drafting must not silently read internal documents');
assert.equal(adminOff.useWeb,true,'administrative drafting keeps public verification available');

const cleaned = stripMarkup('<!doctype html><html><head><style>x{color:red}</style></head><body><h1>Xin chào</h1><script>alert(1)</script>Nội dung</body></html>');
assert.equal(/<!doctype|<html|<script|<style|alert\(1\)/i.test(cleaned), false, 'raw markup leaked');
assert.match(cleaned, /Xin chào/);

console.log('source-policy-v27: Gemini-first + explicit internal opt-in regression PASS');
