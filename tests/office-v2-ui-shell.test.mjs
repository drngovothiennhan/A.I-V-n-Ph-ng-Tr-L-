import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell=fs.readFileSync(new URL('../src/office-v2/ui-v2-shell.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../src/bootstrap-v17.js',import.meta.url),'utf8');
const release=fs.readFileSync(new URL('../src/release-v193.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../api/app.ts',import.meta.url),'utf8');

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

test('legacy bootstrap remains compatible but UI V2 is ordered after workspace there',()=>{
  const workspace=bootstrap.indexOf("task-workspace.js?v=2100");
  const ui=bootstrap.indexOf("ui-v2-shell.js?v=3000");
  assert.ok(workspace>=0&&ui>workspace);
  assert.match(bootstrap,/AIOfficeUIV2Version='3\.0\.0-production-shell'/);
});

test('canonical production shell paints UI early and release reuses the same module cache key',()=>{
  assert.match(app,/bootstrap-v17\\\.js/);
  assert.match(app,/release-v193\\\.js/);
  assert.match(app,/ui-v2-shell\.js\?v=3002/);
  const tasks=release.indexOf("task-runtime-bridge.js?v=2101");
  const workspace=release.indexOf("task-workspace.js?v=2101");
  const ui=release.indexOf("ui-v2-shell.js?v=3002");
  assert.ok(tasks>=0&&workspace>tasks&&ui>workspace);
  assert.match(release,/installOfficeV2TaskRuntimeBridge/);
  assert.match(release,/installOfficeV2TaskWorkspace/);
  assert.match(release,/installAIOfficeUIV2/);
  assert.match(release,/AIOfficeUIV2Version = UI_V2/);
});
