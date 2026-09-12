import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell=fs.readFileSync(new URL('../src/office-v2/ui-v2-shell.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../src/bootstrap-v17.js',import.meta.url),'utf8');

test('UI V2 production shell is visually distinct and mobile responsive',()=>{
  assert.match(shell,/AI_OFFICE_UI_V2_VERSION='3\.0\.0-production-shell'/);
  assert.match(shell,/body\.aiOfficeUIV2 \.side/);
  assert.match(shell,/body\.aiOfficeUIV2 \.top/);
  assert.match(shell,/body\.aiOfficeUIV2 \.chief/);
  assert.match(shell,/#aiV2TaskWorkspace/);
  assert.match(shell,/@media\(max-width:700px\)/);
  assert.match(shell,/position:sticky;bottom:8px/);
});

test('UI V2 preserves canonical business controls and IDs',()=>{
  assert.doesNotMatch(shell,/remove\s*\(/);
  assert.doesNotMatch(shell,/replaceWith\s*\(/);
  assert.doesNotMatch(shell,/fetch\s*\(/);
  assert.doesNotMatch(shell,/localStorage\.setItem/);
  for(const id of ['top','tasks','aiV2TaskWorkspace'])assert.match(shell,new RegExp(`getElementById\\('${id}'\\)|querySelector\\('#${id}`));
});

test('bootstrap installs workspace before UI V2 and exposes production version',()=>{
  const workspace=bootstrap.indexOf("task-workspace.js?v=2100");
  const ui=bootstrap.indexOf("ui-v2-shell.js?v=3000");
  assert.ok(workspace>=0&&ui>workspace);
  assert.match(bootstrap,/AIOfficeUIV2Version='3\.0\.0-production-shell'/);
});
