import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOfficeV2Shadow } from '../src/office-v2/legacy-bridge.js';

test('legacy bridge preserves current classifier while producing Office V2 plan',()=>{const result=buildOfficeV2Shadow('Soạn báo cáo tuần bằng file Word',{channel:'text'});assert.equal(result.mode,'shadow');assert.equal(result.request.legacyEnvelope.intent.type,'DOCUMENT_TASK');assert.equal(result.plan.mode,'TASK');assert.equal(result.plan.agents.includes('document'),true);assert.equal(result.plan.artifacts.includes('docx'),true);assert.equal(result.task.status,'RECEIVED')});

test('legacy bridge keeps ordinary question as answer, not background task',()=>{const result=buildOfficeV2Shadow('Vitamin C tan trong nước hay dầu?',{channel:'text'});assert.equal(result.plan.mode,'ANSWER');assert.equal(result.task,null);assert.equal(result.plan.knowledge.providers.includes('gemini'),true)});
