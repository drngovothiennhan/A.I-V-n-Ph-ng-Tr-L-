import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const release=fs.readFileSync(new URL('../src/release-v193.js',import.meta.url),'utf8');
const hotfix=fs.readFileSync(new URL('../src/office-os/runtime-ready-hotfix-v1.js',import.meta.url),'utf8');

test('Office OS boot explicitly initializes stable core before knowledge router',()=>{
  const core=release.indexOf("await import('./bootstrap-v18.js')");
  const router=release.indexOf("knowledge-router-v20.js?v=271");
  assert.ok(core>=0&&router>core,'V19 core must be initialized before V20 waits for it');
  assert.match(release,/canonical-input-gate-v71\.js\?v=711/);
  assert.match(release,/runtime-ready-hotfix-v1\.js\?v=100/);
});

test('Office OS hotfix waits for V22 and never stringifies task objects',()=>{
  assert.match(hotfix,/AIOfficeV22\?\.handleMessage/);
  assert.match(hotfix,/typeof result==='object'/);
  assert.match(hotfix,/outputDraft/);
  assert.doesNotMatch(hotfix,/String\(result\)/,'task objects must not be rendered as [object Object]');
});

test('Office OS hotfix removes stale broken runtime turns',()=>{
  assert.match(hotfix,/\[object Object\]/);
  assert.match(hotfix,/Bộ não điều phối chưa sẵn sàng\./);
  assert.match(hotfix,/cleanBrokenHistory\(\)/);
});
