const STOPWORDS = new Set([
  'ai','gi','nao','la','co','khong','toi','ban','cho','biet','ve','cua','va','voi','mot','nhung','cac','nay','do','o','tai','tu','den','the','nhu','duoc','hay','hien','gio','hom','ngay','can','muon','xin','vui','long','giup','thong','tin'
]);

export function normalizeV21(text='') {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
}

export function semanticTokens(text='') {
  return normalizeV21(text).split(/[^a-z0-9]+/).filter(t => t.length > 2 && !STOPWORDS.has(t));
}

export function isWeatherQuery(text='') {
  const n = normalizeV21(text);
  const conceptual = /\b(khai niem|giai thich|dinh nghia|la gi|nghia la gi)\b/.test(n);
  const temporal = /\b(hom nay|ngay mai|bay gio|chieu nay|toi nay|sang nay|tuan nay|du bao)\b/.test(n);
  if (conceptual && !temporal) return false;
  const weatherTerm = /\b(thoi tiet|mua|mua rao|mua dong|mua lon|nang|nhiet do|du bao|bao|gio manh|do am|uv|nong|lanh)\b/.test(n);
  const forecastContext = temporal || /\b(thoi tiet|mua khong|co mua|co nang|nhiet do bao nhieu|troi co)\b/.test(n);
  return weatherTerm && forecastContext;
}

export function explicitPlaceFromWeather(text='') {
  const raw = String(text || '').trim();
  const m = raw.match(/(?:^|\s)(?:ở|tại|khu vực)\s+([^?.,;]+)(?:[?.,;]|$)/i);
  if (!m) return '';
  return m[1]
    .replace(/(?:^|\s)(?:hôm nay|ngày mai|bây giờ|chiều nay|tối nay|sáng nay|có mưa không|mưa không|thời tiết)(?=\s|$)/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
}

export function cancellationIntent(text='') {
  const n = normalizeV21(text);
  if (/\b(hoan tac duyet|huy ket qua da duyet|huy duyet da xong|bo duyet da xong)\b/.test(n)) return 'undo_approval';
  if (/\b(huy xet duyet|huy duyet ket qua|huy cho duyet|bo ket qua cho duyet|tu choi ket qua)\b/.test(n)) return 'approval';
  if (/\b(huy du lieu dau vao|xoa du lieu dau vao|bo du lieu dau vao|huy file dau vao|bo file dau vao)\b/.test(n)) return 'input';
  if (/\b(huy cong viec|dung cong viec|huy task|dung task|huy viec dang lam|dung viec dang lam)\b/.test(n)) return 'task';
  if (/^(huy lenh|dung lenh|huy yeu cau|dung lai|stop|cancel)\b/.test(n)) return 'command';
  return '';
}

export function casualAnswer(text='') {
  const n = normalizeV21(text);
  if (/^(xin chao|chao|hello|hi|alo)(\b|$)/.test(n)) return 'Chào bạn. Tôi đang sẵn sàng trả lời câu hỏi hoặc thực hiện công việc. Tôi sẽ tự chọn nguồn phù hợp theo từng yêu cầu.';
  if (/^(cam on|thank you|thanks)(\b|$)/.test(n)) return 'Rất sẵn lòng. Bạn có thể tiếp tục hỏi hoặc giao việc ngay.';
  if (/^(ban la ai|ai la ban|ban lam duoc gi|ban co the lam gi)\??$/.test(n)) return 'Tôi là Trưởng phòng A.I của ứng dụng A.I Văn phòng: nhận biết câu hỏi và nhiệm vụ, chọn nguồn phù hợp, điều phối xử lý, kiểm định kết quả và chỉ tạo file khi bạn yêu cầu.';
  return '';
}

export function sourceRelevanceScore(query='', source={}) {
  const tokens = semanticTokens(query);
  const title = normalizeV21(`${source?.title || ''} ${source?.source || ''}`);
  const text = normalizeV21(source?.text || source?.snippet || '');
  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 3;
    if (text.includes(token)) score += 1;
  }
  const kind = normalizeV21(source?.kind || '');
  const approval = normalizeV21(source?.approvalState || '');
  if (approval.includes('approved')) score += 1.5;
  if (/official|scholarly|drive/.test(kind)) score += 0.5;
  return score;
}

export function filterRelevantSources(query='', sources=[], policy={}) {
  const tokens = semanticTokens(query);
  const min = tokens.length >= 4 ? 2 : 1;
  return (Array.isArray(sources) ? sources : [])
    .map(s => ({...s,_v21Score:sourceRelevanceScore(query,s)}))
    .filter(s => {
      if (policy?.mode === 'admin_document' && /template|drive|official/.test(normalizeV21(s.kind || ''))) return s._v21Score >= 0.5;
      return s._v21Score >= min;
    })
    .sort((a,b) => b._v21Score - a._v21Score);
}
