import assert from 'node:assert/strict';

const store=new Map();
globalThis.localStorage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)};
globalThis.window={
  AIOfficeSourcePreferences:{useInternal:true},
  AIOfficeMultiSourceV26:{state:{drive:{configured:true}}},
  AIOfficeSelectedFiles:[{id:'f1',name:'Bao cao.docx',type:'application/docx',source:'user'}]
};
const long='x'.repeat(2400);
const chat=Array.from({length:14},(_,i)=>({role:i%2?'assistant':'user',text:`turn-${i} ${long}`,at:`2026-09-11T00:${String(i).padStart(2,'0')}:00Z`}));
localStorage.setItem('ai-office-conversation-v19',JSON.stringify(chat));
const tasks=[
  {id:'stale-active',title:'Việc cũ',status:'planning',category:'admin',updatedAt:'2026-09-10T08:00:00.000Z'},
  {id:'done-old',title:'Kết quả cũ',status:'completed',category:'admin',updatedAt:'2026-09-10T09:00:00.000Z'},
  {id:'active',title:'Đang lập báo cáo',status:'executing',category:'admin',progress:40,outputDraft:long,updatedAt:'2026-09-12T08:05:00.000Z'},
  {id:'canonical-doc',title:'Báo cáo canonical',status:'completed',intentV32:{type:'DOCUMENT_TASK'},outputDraft:'Kết quả canonical',updatedAt:'2026-09-12T08:04:00.000Z'},
  {id:'done1',title:'Báo cáo 1',status:'completed',category:'admin',outputDraft:long,artifactFormats:['docx'],updatedAt:'2026-09-12T08:03:00.000Z'},
  {id:'done2',title:'Báo cáo 2',status:'completed',category:'admin',updatedAt:'2026-09-12T08:02:00.000Z'},
  {id:'done3',title:'Báo cáo 3',status:'completed',category:'admin',updatedAt:'2026-09-12T08:01:00.000Z'},
  {id:'done4',title:'Báo cáo 4',status:'completed',category:'admin',updatedAt:'2026-09-12T08:00:00.000Z'}
];
localStorage.setItem('ai-office-tasks-v11',JSON.stringify(tasks));
localStorage.setItem('ai-office-cancel-audit-v33',JSON.stringify([{kind:'processing',status:'cancelled',taskId:'old',at:'2026-09-11T00:20:00Z'}]));
localStorage.setItem('ai-office-use-internal-v27','1');

const context=await import('../src/context-manager-v35.js');
const snap=context.createContextSnapshot({userInstruction:'Tiếp tục báo cáo',kind:'admin',channel:'voice'});
assert.equal(snap.version,'3.5.1-context-continuity');
assert.equal(snap.conversation.recent.length,6,'only six recent turns may be retained');
assert.equal(snap.conversation.compressedOlder.turnCount,8,'older turns must be metadata-compressed');
assert.ok(snap.conversation.recent.every(x=>x.text.length<=1200),'turn text cap must be enforced');
assert.equal(snap.currentTask.id,'active','newest active task must win even when storage order is stale');
assert.equal(snap.currentTask.outputSummary.length,700,'task output summary must be capped');
assert.equal(snap.recentTaskResult.id,'canonical-doc','newest terminal result must win even across canonical task types');
assert.ok(snap.taskMemory.length<=3,'relevant task memory must be bounded');
assert.ok(snap.taskMemory.some(x=>x.id==='canonical-doc'),'legacy admin context must match canonical DOCUMENT_TASK memory');
assert.equal(snap.selectedFiles.length,1);
assert.equal(snap.selectedKnowledgeSource.internalOptIn,true);
assert.equal(snap.selectedKnowledgeSource.driveConfigured,true);
assert.equal(snap.cancelState.kind,'processing');
assert.equal(snap.limits.recentConversationTurns,6);

const core=await import('../src/ai-orchestrator-core-v32.js');
const envelope=core.createOrchestrationEnvelope('Hãy lập báo cáo Word',{channel:'voice'});
assert.equal(envelope.context.contextVersion,'3.5.1-context-continuity');
assert.equal(envelope.context.conversation.recent.length,6);
assert.ok(envelope.context.taskMemory.length<=3);
assert.ok(envelope.context.taskMemory.some(x=>x.id==='canonical-doc'));
assert.equal(envelope.context.selectedKnowledgeSource.internalOptIn,true);
assert.equal(envelope.context.selectedFiles[0].name,'Bao cao.docx');
assert.equal(envelope.context.contextLimits.turnTextChars,1200);

console.log('context-manager-v35: bounded + newest + cross-version task continuity PASS');
