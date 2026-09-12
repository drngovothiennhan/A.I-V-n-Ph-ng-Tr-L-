import test from 'node:test';
import assert from 'node:assert/strict';
import { TASK_STATES } from '../src/office-v2/contracts.js';
import { BrowserTaskRepository } from '../src/office-v2/task-engine.js';
import { normalizeLegacyTask, syncLegacyTaskCollection, OFFICE_V2_TASK_BRIDGE_VERSION } from '../src/office-v2/task-runtime-bridge.js';

function fakeStorage(){const rows=new Map();return {getItem:key=>rows.has(key)?rows.get(key):null,setItem:(key,value)=>rows.set(key,String(value)),removeItem:key=>rows.delete(key)}}

test('legacy task normalization maps lifecycle without copying output payloads',()=>{
  const legacy={id:'task-1',status:'awaiting_approval',createdAt:'2026-09-12T08:00:00.000Z',updatedAt:'2026-09-12T08:01:00.000Z',title:'Báo cáo tháng',originalMessage:'Soạn báo cáo tháng',progress:80,outputDraft:'NỘI DUNG DÀI KHÔNG ĐƯỢC MIRROR',intentV32:{type:'DOCUMENT_TASK',risk:'high',needsApproval:true,artifactFormats:['docx']},qa:{score:96},orchestrationId:'orch-1'};
  const task=normalizeLegacyTask(legacy);
  assert.equal(task.status,TASK_STATES.WAITING_APPROVAL);
  assert.equal(task.instruction,'Soạn báo cáo tháng');
  assert.equal(task.metadata.intent,'DOCUMENT_TASK');
  assert.equal(task.metadata.needsApproval,true);
  assert.deepEqual(task.metadata.artifactFormats,['docx']);
  assert.equal(task.metadata.qaScore,96);
  assert.equal('outputDraft' in task,false);
  assert.equal(task.metadata.bridge,'legacy-v11');
});

test('legacy collection sync is idempotent and advances revision on lifecycle change',async()=>{
  const repository=new BrowserTaskRepository({storage:fakeStorage(),key:'phase68-sync'});
  const legacy={id:'task-2',status:'executing',createdAt:'2026-09-12T08:00:00.000Z',updatedAt:'2026-09-12T08:01:00.000Z',title:'Đối chiếu dữ liệu',originalMessage:'Đối chiếu danh sách',progress:40};
  const first=await syncLegacyTaskCollection([legacy],repository);
  assert.equal(first.version,OFFICE_V2_TASK_BRIDGE_VERSION);
  assert.equal(first.changed,1);assert.equal(first.active,1);
  const running=await repository.get('task-2');assert.equal(running.status,TASK_STATES.RUNNING);assert.equal(running.revision,1);

  const second=await syncLegacyTaskCollection([legacy],repository);
  assert.equal(second.changed,0);
  assert.equal((await repository.get('task-2')).revision,1);

  legacy.status='completed';legacy.progress=100;legacy.updatedAt='2026-09-12T08:02:00.000Z';
  const third=await syncLegacyTaskCollection([legacy],repository);
  assert.equal(third.changed,1);assert.equal(third.active,0);
  const completed=await repository.get('task-2');assert.equal(completed.status,TASK_STATES.COMPLETED);assert.equal(completed.revision,2);
  assert.equal(completed.history.at(-1).event,'legacy-sync');
});

test('unknown legacy state fails safe into planning instead of claiming completion',()=>{
  const task=normalizeLegacyTask({id:'task-3',status:'mystery',title:'Việc chưa rõ'});
  assert.equal(task.status,TASK_STATES.PLANNING);
});
