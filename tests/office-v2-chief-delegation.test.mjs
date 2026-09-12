import test from 'node:test';
import assert from 'node:assert/strict';
import { createChiefDelegationContract, OFFICE_V2_DELEGATION_VERSION } from '../src/office-v2/chief-delegation.js';

test('chief delegates document work to document plus QA and preserves approval gate',()=>{
  const task={id:'doc-1',createdAt:'2026-09-12T09:00:00Z',originalMessage:'Soạn báo cáo Word',intentV32:{type:'DOCUMENT_TASK',risk:'high',needsApproval:true,artifactFormats:['docx'],source:{mode:'task-context',preferredProvider:'orchestrator',externalAllowed:false}}};
  const d=createChiefDelegationContract(task);
  assert.equal(d.version,OFFICE_V2_DELEGATION_VERSION);
  assert.equal(d.mode,'TASK');
  assert.deepEqual(d.agents,['document','qa']);
  assert.deepEqual(d.artifacts,['docx']);
  assert.equal(d.approvalRequired,true);
  assert.equal(d.verify,true);
  assert.equal(d.sideEffectAllowed,false);
});

test('chief keeps general question answer-only and external-default knowledge automatic',()=>{
  const task={id:'q-1',originalMessage:'Giải thích quy định mới',intentV32:{type:'QUESTION',risk:'none',needsApproval:false,artifactFormats:[],source:{mode:'external-default',preferredProvider:'gemini',externalAllowed:true,internalAuthorized:false}}};
  const d=createChiefDelegationContract(task);
  assert.equal(d.mode,'ANSWER');
  assert.deepEqual(d.agents,['answer']);
  assert.equal(d.knowledge.mode,'AUTO');
  assert.deepEqual(d.knowledge.providers,['gemini']);
  assert.equal(d.approvalRequired,false);
  assert.equal(d.sideEffectAllowed,false);
});

test('chief action delegation never bypasses approval when risk requires it',()=>{
  const task={id:'a-1',originalMessage:'Gửi email này',intentV32:{type:'COMMUNICATION_TASK',risk:'high',needsApproval:true,artifactFormats:[],source:{mode:'task-context',preferredProvider:'orchestrator',externalAllowed:false}}};
  const d=createChiefDelegationContract(task);
  assert.equal(d.mode,'ACTION');
  assert.deepEqual(d.agents,['communication','qa']);
  assert.equal(d.approvalRequired,true);
  assert.equal(d.sideEffectAllowed,false);
});
