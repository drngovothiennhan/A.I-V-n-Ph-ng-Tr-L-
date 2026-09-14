import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VERSION } from '../api/research-v32.js';

const fastClient=fs.readFileSync(new URL('../src/office-os/gemini-fast-qa-v1.js',import.meta.url),'utf8');
const productionEntry=fs.readFileSync(new URL('../src/office-os/production-entry-v1.js',import.meta.url),'utf8');
const researchEntry=fs.readFileSync(new URL('../api/research.ts',import.meta.url),'utf8');
const researchSource=fs.readFileSync(new URL('../api/research-v32.js',import.meta.url),'utf8');
const vercelConfig=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const packageJson=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));

test('Office OS knowledge questions use one Gemini Google Search fast path',()=>{
  assert.match(fastClient,/fastAnswer:true/);
  assert.match(fastClient,/\/api\/research/);
  assert.match(fastClient,/isWeatherQuery\(value\)/);
  assert.match(fastClient,/policy\?\.internalRequested/);
  assert.match(fastClient,/workspaceSummaryIntent/);
  assert.match(fastClient,/vagueKnowledgeIntent/);
  assert.match(fastClient,/Cần kiểm chứng/);
  assert.match(fastClient,/overflow-wrap:anywhere/);
  assert.doesNotMatch(fastClient,/\/api\/proxy\?op=chief/,'fast knowledge path must not add a second LLM call');
  const gate=productionEntry.indexOf("canonical-input-gate-v71.js?v=712-p4");
  const fast=productionEntry.indexOf("./gemini-fast-qa-v1.js?v=100");
  const contract=productionEntry.indexOf('installCanonicalResultContract();');
  assert.ok(gate>=0&&fast>gate&&contract>fast,'fast QA must wrap canonical dispatch before result normalization');
  assert.match(productionEntry,/fastQA:Boolean\(window\.AIOfficeGeminiFastQA\?\.ready\)/);
  assert.match(researchEntry,/research-v32\.js/);
});

test('Grounded fast QA uses Gemini 3.5 Flash-Lite through Vercel AI Gateway only',()=>{
  assert.equal(VERSION,'3.2.3-gemini-gateway-grounded');
  assert.equal(vercelConfig.env.AI_OFFICE_GEMINI_GROUNDED_MODEL,'google/gemini-3.5-flash-lite');
  assert.equal(vercelConfig.env.AI_OFFICE_GEMINI_MODEL,'gemini-3.8-flash','non-grounded task model must remain unchanged');
  assert.equal(packageJson.dependencies.ai,'7.0.99');
  assert.equal(packageJson.dependencies['@ai-sdk/google'],'4.0.69');
  assert.match(researchSource,/model:usedModel/);
  assert.match(researchSource,/google\.tools\.googleSearch\(\{\}\)/);
  assert.match(researchSource,/only:\['google'\]/,'gateway must be restricted to Google provider');
  assert.match(researchSource,/transport:'vercel-ai-gateway'/);
  assert.doesNotMatch(researchSource,/generativelanguage\.googleapis\.com/,'fast grounded route must not call the quota-limited direct API');
  assert.doesNotMatch(researchSource,/GEMINI_API_KEY/,'gateway route must use Vercel deployment authentication instead of direct Gemini API key');
  assert.equal((researchSource.match(/generateText\(/g)||[]).length,1,'fast path must make one model generation call');
});

test('Grounded gateway contract remains current-query-only and verification-aware',()=>{
  assert.match(researchSource,/Chỉ trả lời CÂU HỎI HIỆN TẠI/);
  assert.match(researchSource,/Bắt buộc dùng Google Search/);
  assert.match(researchSource,/result\?\.sources/);
  assert.match(researchSource,/Google Search chưa trả về nguồn trích dẫn rõ ràng/);
  assert.match(researchSource,/verificationStatus:verified\?'verified':'needs_verification'/);
  assert.match(researchSource,/contextPolicy:'current-query-only'/);
  assert.match(researchSource,/internalOptIn:false/);
  assert.match(researchSource,/fallbackUsed:false/);
  assert.match(researchSource,/attemptCount:1/);
});
