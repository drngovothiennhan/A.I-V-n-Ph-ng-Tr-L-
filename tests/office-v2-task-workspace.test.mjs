import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TASK_STATES } from '../src/office-v2/contracts.js';
import { buildTaskWorkspaceModel, OFFICE_V2_TASK_WORKSPACE_VERSION } from '../src/office-v2/task-workspace.js';

const bootstrap=fs.readFileSync(new URL('../src/bootstrap-v17.js',import.meta.url),'utf8');
const workspace=fs.readFileSync(new URL('../src/office-v2/task-workspace.js',import.meta.url),'utf8');

test('workspace model prioritizes recent tasks and exposes delegation with safe controls',()=>{
  const tasks=[
    {id:'old-run',title:'Việc cũ',status:TASK_STATES.RUNNING,updatedAt:'2026-09-12T08:01:00Z',metadata:{progress:30}},
    {id:'new-run',title:'Việc mới',status:TASK_STATES.RUNNING,updatedAt:'2026-09-12T08:03:00Z',metadata:{progress:60,artifactFormats:['docx'],delegation:{agents:['document','qa'],knowledgeMode:'NONE'}}},
    {id:'approval',title:'Chờ duyệt',status:TASK_STATES.WAITING_APPROVAL,updatedAt:'2026-09-12T08:02:00Z',metadata:{progress:96,qaScore:95,needsApproval:true,artifactFormats:['xlsx'],delegation:{agents:['data','qa'],knowledgeMode:'VERIFIED'}}},
    {id:'done',title:'Đã xong',status:TASK_STATES.COMPLETED,updatedAt:'2026-09-12T08:00:00Z',metadata:{progress:100}}
  ];
  const model=buildTaskWorkspaceModel(tasks);
  assert.equal(OFFICE_V2_TASK_WORKSPACE_VERSION,'2.10.0-chief-delegation-cards');
  assert.equal(model.total,4);assert.equal(model.active,2);assert.equal(model.waitingApproval,1);assert.equal(model.completed,1);assert.equal(model.delegated,2);
  assert.deepEqual(model.visible.map(x=>x.id),['new-run','approval','old-run','done']);
  assert.deepEqual(model.visible.find(x=>x.id==='new-run').agents,['Văn bản','QA']);
  assert.equal(model.visible.find(x=>x.id==='new-run').canStop,true);
  assert.equal(model.visible.find(x=>x.id==='old-run').canStop,false);
  assert.equal(model.visible.find(x=>x.id==='approval').knowledgeMode,'VERIFIED');
  assert.equal(model.visible.find(x=>x.id==='approval').canCancelApproval,true);
  assert.equal(model.visible.find(x=>x.id==='approval').canOpenProduct,true);
});

test('workspace does not introduce its own destructive task mutation path',()=>{
  assert.match(workspace,/window\.AIOfficeV21\?\.cancelRunningTask/);
  assert.match(workspace,/window\.AIOfficeV21\?\.cancelLatestApproval/);
  assert.doesNotMatch(workspace,/localStorage\.setItem\(['"]ai-office-tasks-v11/);
  assert.doesNotMatch(workspace,/fetch\s*\(/);
});

test('canonical bootstrap installs delegated task bridge before workspace',()=>{
  const bridge=bootstrap.indexOf("task-runtime-bridge.js?v=2100");
  const ui=bootstrap.indexOf("task-workspace.js?v=2100");
  assert.ok(bridge>=0&&ui>bridge);
  assert.match(bootstrap,/AIOfficeOfficeV2ChiefDelegationVersion='2\.10\.0-chief-delegation'/);
  assert.match(bootstrap,/AIOfficeOfficeV2TaskWorkspaceVersion='2\.10\.0-chief-delegation-cards'/);
});
