import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyInteractionV22 } from '../src/interaction-policy-v22.js';
import { classifyCanonicalIntent } from '../src/ai-orchestrator-core-v32.js';

const app=fs.readFileSync(new URL('../api/app.ts',import.meta.url),'utf8');
const proxy=fs.readFileSync(new URL('../api/proxy.ts',import.meta.url),'utf8');
const release=fs.readFileSync(new URL('../src/release-v193.js',import.meta.url),'utf8');

test('meta-question cannot become data/document task or artifact request',()=>{
  const samples=[
    "Phân loại câu sau: 'Hãy so sánh hai bảng dữ liệu và xuất Excel'. Đây là câu hỏi hay nhiệm vụ? Chỉ trả lời loại và lý do ngắn gọn.",
    'Giải thích vì sao câu "Soạn báo cáo Word và gửi đi" là một nhiệm vụ?'
  ];
  for(const text of samples){
    const interaction=classifyInteractionV22(text,{});
    assert.equal(interaction.mode,'question');
    const canonical=classifyCanonicalIntent(text,{interaction});
    assert.equal(canonical.type,'QUESTION');
    assert.deepEqual(canonical.artifactFormats,[]);
  }
});

test('direct command still executes as data task',()=>{
  const text='Hãy so sánh hai bảng dữ liệu và xuất Excel';
  const interaction=classifyInteractionV22(text,{});
  assert.equal(interaction.mode,'task');
  assert.equal(interaction.taskKind,'data');
  const canonical=classifyCanonicalIntent(text,{interaction});
  assert.equal(canonical.type,'DATA_TASK');
  assert.ok(canonical.artifactFormats.includes('xlsx'));
});

test('UI V2 is preloaded and canonical gate executes before legacy bootstrap',()=>{
  assert.match(app,/rel="modulepreload" href="\/src\/office-v2\/ui-v2-shell\.js\?v=3002"/);
  const gate=app.indexOf("await import('/src/canonical-input-gate-v71.js?v=711')");
  const ui=app.indexOf("await import('/src/office-v2/ui-v2-shell.js?v=3002')");
  const lean=app.indexOf("await import('/src/office-v2/lean-dashboard-v72.js?v=3100')");
  const bootstrap=app.indexOf("await import('/src/bootstrap-v18.js?v=193')");
  const sync=app.indexOf("await import('/src/release-v193.js?v=193')");
  assert.ok(gate>=0&&ui>gate&&lean>ui&&bootstrap>lean&&sync>bootstrap,'canonical gate and UI must execute before legacy bootstrap/release');
  assert.match(release,/ui-v2-shell\.js\?v=3002/);
  assert.doesNotMatch(release,/ui-v2-shell\.js\?v=3001/);
});

test('Chief reasoning is medium by default, not low',()=>{
  assert.match(proxy,/DEFAULT_THINKING_LEVEL = 'medium'/);
  assert.doesNotMatch(proxy,/thinkingLevel:\s*\{?\s*thinkingLevel:\s*'low'/);
  assert.match(proxy,/thinkingConfig:\s*\{ thinkingLevel \}/);
});
