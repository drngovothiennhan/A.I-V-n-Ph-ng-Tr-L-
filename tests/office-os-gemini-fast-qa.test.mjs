import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler,{VERSION} from '../api/research-v32.js';

const fastClient=fs.readFileSync(new URL('../src/office-os/gemini-fast-qa-v1.js',import.meta.url),'utf8');
const productionEntry=fs.readFileSync(new URL('../src/office-os/production-entry-v1.js',import.meta.url),'utf8');
const researchEntry=fs.readFileSync(new URL('../api/research.ts',import.meta.url),'utf8');

function responseRecorder(){
  return {
    statusCode:200,headers:{},body:null,
    setHeader(name,value){this.headers[String(name).toLowerCase()]=String(value)},
    status(code){this.statusCode=code;return this},
    json(value){this.body=value;return this}
  };
}

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

test('Gemini fast API answers from Google Search grounding with current-query-only context',async()=>{
  assert.equal(VERSION,'3.2.0-gemini-fast-qa');
  const oldKey=process.env.GEMINI_API_KEY;
  const oldFetch=global.fetch;
  process.env.GEMINI_API_KEY='test-key';
  let sentBody=null;
  global.fetch=async(_url,options={})=>{
    sentBody=JSON.parse(options.body);
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'Hà Nội là thủ đô của Việt Nam.'}]},groundingMetadata:{groundingChunks:[{web:{title:'Cổng thông tin Chính phủ',uri:'https://chinhphu.vn/'}}]}}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  try{
    const req={method:'POST',body:{fastAnswer:true,query:'Thủ đô của Việt Nam là gì?',mode:'general_question',useInternal:false}};
    const res=responseRecorder();
    await handler(req,res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.provider,'gemini-google-search-fast');
    assert.equal(res.body.grounded,true);
    assert.equal(res.body.verificationStatus,'verified');
    assert.equal(res.body.contextPolicy,'current-query-only');
    assert.equal(res.body.sources.length,1);
    const prompt=sentBody?.contents?.[0]?.parts?.[0]?.text||'';
    assert.match(prompt,/Chỉ trả lời CÂU HỎI HIỆN TẠI/);
    assert.match(prompt,/Thủ đô của Việt Nam là gì\?/);
    assert.ok(Array.isArray(sentBody?.tools)&&sentBody.tools.some(tool=>tool.google_search),'Google Search grounding tool is mandatory');
  }finally{
    global.fetch=oldFetch;
    if(oldKey==null)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
  }
});

test('Gemini fast API visibly marks answers when grounding sources are unclear',async()=>{
  const oldKey=process.env.GEMINI_API_KEY;
  const oldFetch=global.fetch;
  process.env.GEMINI_API_KEY='test-key';
  global.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'Câu trả lời thử nghiệm.'}]},groundingMetadata:{groundingChunks:[]}}]}),{status:200,headers:{'content-type':'application/json'}});
  try{
    const req={method:'POST',body:{fastAnswer:true,query:'Một câu hỏi kiến thức thử nghiệm?',mode:'general_question'}};
    const res=responseRecorder();
    await handler(req,res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.grounded,false);
    assert.equal(res.body.verificationStatus,'needs_verification');
    assert.match(res.body.answer,/Cần kiểm chứng/);
  }finally{
    global.fetch=oldFetch;
    if(oldKey==null)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
  }
});
