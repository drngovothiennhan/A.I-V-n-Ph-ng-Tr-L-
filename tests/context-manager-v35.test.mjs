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
  {id:'active',title:'Đang lập báo cáo',status:'executing',category:'admin',progress:40,outputDraft:long},
  {id:'done1',title:'Báo cáo 1',status:'completed',category:'admin',outputDraft:long,artifactFormats:['docx']},
  {id:'done2',title:'Báo cáo 2',status:'completed',category:'admin'},
  {id:'done3',title:'Báo cáo 3',status:'completed',category:'admin'},
  {id:'done4',title:'Báo cáo 4',status:'completed',category:'admin'}
];
localStorage.setItem('ai-office-tasks-v11',JSON.stringify(tasks));
localStorage.setItem('ai-office-cancel-audit-v33',JSON.stringify([{kind:'processing',status:'cancelled',taskId:'old',at:'2026-09-11T00:20:00Z'}]));
localStorage.setItem('ai-office-use-internal-v27','1');

const context=await import('../src/context-manager-v35.js');
const snap=context.createContextSnapshot({userInstruction:'Tiếp tục báo cáo',kind:'admin',channel:'voice'});
assert.equal(snap.version,'3.5.0-bounded-context-manager');
assert.equal(snap.conversation.recent.length,6,'only six recent turns may be retained');
assert.equal(snap.conversation.compressedOlder.turnCount,8,'older turns must be metadata-compressed');
assert.ok(snap.conversation.recent.every(x=>x.text.length<=1200),'turn text cap must be enforced');
assert.equal(snap.currentTask.id,'active');
assert.equal(snap.currentTask.outputSummary.length,700,'task output summary must be capped');
assert.equal(snap.recentTaskResult.id,'done1');
assert.ok(snap.taskMemory.length<=3,'relevant task memory must be bounded');
assert.equal(snap.selectedFiles.length,1);
assert.equal(snap.selectedKnowledgeSource.internalOptIn,true);
assert.equal(snap.selectedKnowledgeSource.driveConfigured,true);
assert.equal(snap.cancelState.kind,'processing');
assert.equal(snap.limits.recentConversationTurns,6);

const core=await import('../src/ai-orchestrator-core-v32.js');
const envelope=core.createOrchestrationEnvelope('Hãy lập báo cáo Word',{channel:'voice'});
assert.equal(envelope.context.contextVersion,'3.5.0-bounded-context-manager');
assert.equal(envelope.context.conversation.recent.length,6);
assert.ok(envelope.context.taskMemory.length<=3);
assert.equal(envelope.context.selectedKnowledgeSource.internalOptIn,true);
assert.equal(envelope.context.selectedFiles[0].name,'Bao cao.docx');
assert.equal(envelope.context.contextLimits.turnTextChars,1200);

console.log('context-manager-v35: bounded conversation + task/source/approval/cancel envelope PASS');
