import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyAnswerPolicy, ANSWER_MODES } from '../src/office-os/answer-policy-v1.js';
import { normalizeConnectorState, validateExtensionConnector, connectorDefinitions } from '../src/office-os/connector-registry-v1.js';

const release=fs.readFileSync(new URL('../src/release-v193.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../src/office-os/chief-answer-router-v1.js',import.meta.url),'utf8');

test('stable general and reasoning questions bypass forced retrieval',()=>{
  for(const question of ['2+2 bằng bao nhiêu?','Giải thích ngắn gọn phép nhân là gì','Vì sao bầu trời thường có màu xanh?']){
    const policy=classifyAnswerPolicy(question,{canonicalType:'QUESTION'});
    assert.equal(policy.mode,ANSWER_MODES.DIRECT);
    assert.equal(policy.requiresSources,false);
    assert.equal(policy.allowDirect,true);
  }
});

test('fresh, internal, medical and legal questions stay grounded',()=>{
  assert.equal(classifyAnswerPolicy('Tin mới nhất hôm nay là gì?',{canonicalType:'QUESTION'}).mode,ANSWER_MODES.CURRENT);
  assert.equal(classifyAnswerPolicy('Tìm tài liệu này trong Google Drive của tôi',{canonicalType:'QUESTION'}).mode,ANSWER_MODES.INTERNAL);
  assert.equal(classifyAnswerPolicy('Thuốc này có tác dụng phụ gì?',{canonicalType:'QUESTION'}).mode,ANSWER_MODES.GROUNDED);
  assert.equal(classifyAnswerPolicy('Quy định pháp luật hiện hành về an toàn thực phẩm?',{canonicalType:'QUESTION'}).mode,ANSWER_MODES.CURRENT);
});

test('connector registry contains approved office services only',()=>{
  const defs=connectorDefinitions();
  const ids=defs.map(x=>x.id);
  assert.deepEqual(ids,['google_workspace','google_drive','gmail','google_calendar','work_school_email','ai_gateway']);
  assert.equal(ids.some(id=>/facebook|zalo|social/.test(id)),false);
  assert.throws(()=>validateExtensionConnector({id:'facebook',label:'Facebook'}),/CONNECTOR_OUT_OF_SCOPE/);
  assert.throws(()=>validateExtensionConnector({id:'zalo',label:'Zalo'}),/CONNECTOR_OUT_OF_SCOPE/);
});

test('connector health is normalized without exposing credentials',()=>{
  const items=normalizeConnectorState({providers:{googleWorkspace:{configured:true},googleDriveRuntime:{configured:true},gemini:{configured:true}}});
  assert.equal(items.find(x=>x.id==='google_workspace')?.connected,true);
  assert.equal(items.find(x=>x.id==='google_drive')?.connected,true);
  assert.equal(items.find(x=>x.id==='gmail')?.connected,true);
  assert.equal(items.find(x=>x.id==='google_calendar')?.connected,true);
  assert.equal(items.find(x=>x.id==='ai_gateway')?.connected,true);
  assert.equal(JSON.stringify(items).includes('token'),false);
  assert.equal(JSON.stringify(items).includes('secret'),false);
});

test('Chief router uses bounded managed context for direct answers and delegates grounded queries',()=>{
  assert.match(router,/policy\.mode===ANSWER_MODES\.DIRECT/);
  assert.match(router,/managedDirectContext/);
  assert.match(router,/AIOfficeOrchestrator\?\.createEnvelope/);
  assert.match(router,/không tự suy diễn nội dung tệp/i);
  assert.match(router,/NEED_GROUNDED_RESEARCH/);
  assert.match(router,/return originalHandle\(value,options\)/);
  assert.match(router,/\/api\/proxy\?op=chief/);
});

test('release renders Office OS shell before loading P2 connector and hardened P3 answer support',()=>{
  const shell=release.indexOf("office-os/office-shell-v1.js?v=101");
  const connectors=release.indexOf("office-os/connector-registry-v1.js?v=100");
  const answers=release.indexOf("office-os/chief-answer-router-v1.js?v=101");
  assert.ok(shell>=0&&connectors>shell&&answers>connectors);
  assert.match(release,/ai-orchestrator-core-v32\.js\?v=325/);
  assert.match(release,/product-completion-v24\.js\?v=241/);
  assert.match(release,/task-runtime-bridge\.js\?v=2102/);
  assert.match(release,/installAIOfficeOSShell/);
  assert.match(release,/installConnectorRegistry/);
  assert.match(release,/installChiefAnswerRouter/);
});
