import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOfficeV2Shadow, shadowSummary, OFFICE_V2_SHADOW_KEY } from '../src/office-v2/shadow-runtime.js';

class FakeStorage{
  constructor(){this.map=new Map()}
  getItem(key){return this.map.has(key)?this.map.get(key):null}
  setItem(key,value){this.map.set(key,String(value))}
}

test('shadow telemetry preserves parity without storing raw user instruction',()=>{
  const storage=new FakeStorage();
  const secret='NỘI DUNG KHÔNG ĐƯỢC GHI VÀO TELEMETRY';
  const {metric,result}=evaluateOfficeV2Shadow(`Soạn báo cáo Word ${secret}`,{channel:'text'},{storage});
  assert.equal(result.plan.mode,'TASK');
  assert.equal(metric.parity,true);
  assert.equal(metric.legacyIntent,'DOCUMENT_TASK');
  const raw=storage.getItem(OFFICE_V2_SHADOW_KEY);
  assert.equal(raw.includes(secret),false);
  assert.equal(raw.includes('instruction'),false);
});

test('ordinary question stays ANSWER and never creates a shadow task',()=>{
  const storage=new FakeStorage();
  const {metric,result}=evaluateOfficeV2Shadow('Vitamin C tan trong nước hay dầu?',{channel:'text'},{storage});
  assert.equal(metric.expectedMode,'ANSWER');
  assert.equal(metric.v2Mode,'ANSWER');
  assert.equal(result.task,null);
});

test('shadow summary reports structural parity only',()=>{
  const storage=new FakeStorage();
  evaluateOfficeV2Shadow('Soạn báo cáo tuần',{channel:'text'},{storage});
  evaluateOfficeV2Shadow('Mở trang nhiệm vụ',{channel:'text'},{storage});
  const summary=shadowSummary(storage);
  assert.equal(summary.total,2);
  assert.equal(summary.mismatched,0);
  assert.equal(summary.parityRate,1);
});
