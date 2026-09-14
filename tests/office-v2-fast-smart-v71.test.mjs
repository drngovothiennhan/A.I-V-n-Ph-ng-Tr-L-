import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyInteractionV22 } from '../src/interaction-policy-v22.js';
import { classifyCanonicalIntent } from '../src/ai-orchestrator-core-v32.js';

const app=fs.readFileSync(new URL('../api/app.ts',import.meta.url),'utf8');
const entry=fs.readFileSync(new URL('../src/office-os/production-entry-v1.js',import.meta.url),'utf8');
const proxy=fs.readFileSync(new URL('../api/proxy.ts',import.meta.url),'utf8');
const release=fs.readFileSync(new URL('../src/release-v193.js',import.meta.url),'utf8');
const mobile=fs.readFileSync(new URL('../src/office-v2/mobile-shell-v73.js',import.meta.url),'utf8');

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

test('Office OS production root uses one entry and mounts only after canonical runtime readiness',()=>{
  assert.match(app,/rel="modulepreload" href="\/src\/office-os\/production-entry-v1\.js\?v=100"/);
  assert.match(app,/script type="module" src="\/src\/office-os\/production-entry-v1\.js\?v=100"/);
  assert.doesNotMatch(app,/office-shell-v1\.js|canonical-input-gate-v71\.js|bootstrap-v18\.js|release-v193\.js/);
  const bootstrap=entry.indexOf("../bootstrap-v18.js");
  const gate=entry.indexOf("../canonical-input-gate-v71.js?v=712-p4");
  const ready=entry.indexOf('assertCanonicalRuntimeReady()');
  const office=entry.indexOf("./office-shell-v1.js?v=102");
  assert.ok(bootstrap>=0&&gate>bootstrap&&ready>gate&&office>ready,'runtime and canonical gate must be ready before Office OS mounts');
  assert.doesNotMatch(entry,/runtime-ready-hotfix|release-v193\.js|ui-v2-shell|lean-dashboard-v72|mobile-shell-v73/);
  assert.match(release,/office-os\/office-shell-v1\.js\?v=101/);
  assert.match(release,/installAIOfficeOSShell/);
  assert.doesNotMatch(release,/installAIOfficeUIV2|installLeanDashboard|installMobileShell/);
});

test('V73 mobile shell remains isolated as rollback-only legacy asset',()=>{
  assert.match(mobile,/MOBILE_SHELL_VERSION='3\.2\.0-focus-navigation'/);
  assert.match(mobile,/nav\.id='aiMobileBottomNav'/);
  assert.match(mobile,/env\(safe-area-inset-bottom\)/);
  assert.match(mobile,/min-height:44px/);
  assert.match(mobile,/data-ai-mobile-view/);
  assert.match(mobile,/aiMobileMoreOpen/);
  assert.doesNotMatch(mobile,/localStorage\.(?:setItem|removeItem|clear)/);
  assert.doesNotMatch(mobile,/fetch\s*\(/);
  assert.doesNotMatch(mobile,/\.removeChild\s*\(/);
  assert.doesNotMatch(mobile,/\.replaceChildren\s*\(/);
});

test('Chief reasoning is medium by default, not low',()=>{
  assert.match(proxy,/DEFAULT_THINKING_LEVEL = 'medium'/);
  assert.doesNotMatch(proxy,/thinkingLevel:\s*\{?\s*thinkingLevel:\s*'low'/);
  assert.match(proxy,/thinkingConfig:\s*\{ thinkingLevel \}/);
});