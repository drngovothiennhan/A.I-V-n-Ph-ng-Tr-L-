import assert from 'node:assert/strict';
import {
  isWeatherQuery,
  explicitPlaceFromWeather,
  cancellationIntent,
  casualAnswer,
  filterRelevantSources
} from '../src/interaction-policy-v21.js';

assert.equal(isWeatherQuery('hôm nay có mưa không'), true);
assert.equal(isWeatherQuery('ngày mai ở Thủ Đức có mưa không?'), true);
assert.equal(isWeatherQuery('giải thích khái niệm lượng mưa'), false);
assert.equal(isWeatherQuery('báo cáo hôm nay'), false);
assert.equal(isWeatherQuery('bão số 3 hôm nay thế nào?'), true);
assert.equal(explicitPlaceFromWeather('Hôm nay ở Thủ Đức có mưa không?'), 'Thủ Đức');
assert.equal(cancellationIntent('hủy lệnh'), 'command');
assert.equal(cancellationIntent('hủy công việc đang làm'), 'task');
assert.equal(cancellationIntent('hủy xét duyệt kết quả'), 'approval');
assert.equal(cancellationIntent('hoàn tác duyệt'), 'undo_approval');
assert.equal(cancellationIntent('hủy dữ liệu đầu vào'), 'input');
assert.ok(casualAnswer('xin chào').includes('sẵn sàng'));

const sources = [
  {title:'Nghị định 30 và thể thức văn bản',source:'VBPL',text:'Quy định về công tác văn thư và thể thức văn bản hành chính.',kind:'official'},
  {title:'Âm nhạc Việt Nam',source:'Bách khoa',text:'Thông tin về ca sĩ và các ca khúc nổi tiếng.',kind:'web'}
];
const filtered = filterRelevantSources('thể thức văn bản theo Nghị định 30', sources, {mode:'admin_document'});
assert.equal(filtered[0].title, 'Nghị định 30 và thể thức văn bản');
assert.equal(filtered.some(s=>s.title==='Âm nhạc Việt Nam'), false);

console.log('interaction-policy-v21: PASS');
