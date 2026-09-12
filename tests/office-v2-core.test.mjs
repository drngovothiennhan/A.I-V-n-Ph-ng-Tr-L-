import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfficeRequest, TASK_STATES } from '../src/office-v2/contracts.js';
import { createOfficePlan } from '../src/office-v2/chief-of-staff.js';
import { createKnowledgePlan } from '../src/office-v2/knowledge-gateway.js';
import { TaskEngine, createTask, transitionTask, pauseTask, resumeTask, cancelTask, retryTask } from '../src/office-v2/task-engine.js';

function envelope(type,overrides={}){return {id:'legacy-1',intent:{type,risk:'none',needsApproval:false,source:{mode:'external-default',internalAuthorized:false,externalAllowed:true,reason:'test'},artifactFormats:[]},route:{sourceMode:'external-default',artifactFormats:[],approvalRequired:false},...overrides}}

test('question becomes direct answer through Gemini-first AUTO knowledge',()=>{const request=createOfficeRequest({text:'Hôm nay có công việc gì?',envelope:envelope('QUESTION')});const plan=createOfficePlan(request);assert.equal(plan.mode,'ANSWER');assert.deepEqual(plan.agents,['answer']);assert.equal(plan.knowledge.mode,'AUTO');assert.deepEqual(plan.knowledge.providers,['gemini']);assert.equal(plan.execution.taskRequired,false)});

test('document task becomes tracked task with document + QA agents',()=>{const e=envelope('DOCUMENT_TASK');e.route.artifactFormats=['docx'];const request=createOfficeRequest({text:'Soạn báo cáo tuần thành Word',envelope:e});const plan=createOfficePlan(request);assert.equal(plan.mode,'TASK');assert.deepEqual(plan.agents,['document','qa']);assert.deepEqual(plan.artifacts,['docx']);assert.equal(plan.execution.taskRequired,true)});

test('verified knowledge cross-checks internal and external only when authorized',()=>{const e=envelope('INTERNAL_KNOWLEDGE_TASK');e.intent.source={mode:'internal',internalAuthorized:true,externalAllowed:true,reason:'explicit-user-internal-request'};e.route.sourceMode='internal';const plan=createKnowledgePlan(e,{verified:true});assert.equal(plan.mode,'VERIFIED');assert.deepEqual(plan.providers,['drive','database','gemini','web']);assert.equal(plan.policy,'cross-check')});

test('high-risk action is approval-gated',()=>{const e=envelope('COMMUNICATION_TASK');e.intent.risk='high';e.intent.needsApproval=true;e.route.approvalRequired=true;const request=createOfficeRequest({text:'Gửi email này',envelope:e});const plan=createOfficePlan(request);assert.equal(plan.mode,'ACTION');assert.equal(plan.approval.required,true);assert.equal(plan.execution.sideEffectAllowed,false)});

test('task engine enforces transitions and supports pause/resume/cancel/retry',async()=>{let task=createTask({instruction:'Lập báo cáo'});task=transitionTask(task,TASK_STATES.PLANNING);task=transitionTask(task,TASK_STATES.RUNNING);task=pauseTask(task);assert.equal(task.status,TASK_STATES.PAUSED);task=resumeTask(task);task=cancelTask(task,'user_cancelled');assert.equal(task.status,TASK_STATES.CANCELLED);task=retryTask(task);assert.equal(task.status,TASK_STATES.PLANNING);assert.equal(task.attempt,2);assert.throws(()=>transitionTask(task,TASK_STATES.COMPLETED),/invalid_task_transition/);const engine=new TaskEngine();const saved=await engine.create({instruction:'Đối chiếu dữ liệu'});const planning=await engine.move(saved.id,TASK_STATES.PLANNING);assert.equal(planning.revision,2)});
