import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const proxy=fs.readFileSync(new URL('../api/proxy.ts',import.meta.url),'utf8');

test('Gemini Chief keeps reasoning quality while defaulting question answers to brief',()=>{
  assert.match(proxy,/const DEFAULT_THINKING_LEVEL = 'medium'/);
  assert.match(proxy,/function chiefResponseMode\(body, message\)/);
  assert.match(proxy,/return 'brief'/);
  assert.match(proxy,/Trả lời trực tiếp, ưu tiên 1-5 dòng/);
  assert.match(proxy,/maxOutputTokens: responseMode === 'brief' \? 900 : 4096/);
  assert.match(proxy,/thinkingConfig: \{ thinkingLevel \}/);
});
