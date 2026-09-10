const AI_OFFICE_REGISTRY_VERSION = '2.4';
const AI_OFFICE_ROOT = '1q8fnN4-WYFlbGXUkRAWj8uqudNBW4qG0';
const AI_OFFICE_SCOPES = {
  '00_INBOX':'1Hgxi-fDcJqDAIQgJp2uHKtWd0toyNYMd',
  '01_KNOWLEDGE':'1ccp9ieYigI46M38_be9oRWKoG7wycjO3',
  '02_APPROVED':'10Sfb2I0xwYMWr_uOupf-8ciWH3C3RoI1',
  '03_TEMPLATES':'1Uj27l43MhVOTx--AkxP0Vs2V3OTOWi5j',
  '04_SKILLS':'1V9XAIHC7N246XB2OCNKazeKpFqNafgaO',
  '05_TRAINING':'1UUndKlNOLoQ6Cww7xKLP1eErxkTUpiTS',
  '06_OUTPUTS':'17bXsKroYm0Jns0s8Qs6R49N4tfTw6BEh',
  '07_ARCHIVE':'1pxXBB-9jL0-JjbShdD84OnI5HaJvyg5N'
};
const AI_OFFICE_PRODUCTION_SCOPES = ['02_APPROVED','01_KNOWLEDGE','03_TEMPLATES','04_SKILLS'];
const AI_OFFICE_GROUND_TRUTH_SCOPE = '02_APPROVED';
const MAX_SEARCH_CANDIDATES = 120;
const MAX_FILES_PER_SCOPE = 40;
const MAX_FILE_TEXT = 50000;

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(value, max) {
  return String(value == null ? '' : value).replace(/\u0000/g,'').trim().slice(0,max || 12000);
}
function normalize_(value) {
  return clean_(value,12000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
}
function auth_(payload) {
  const expected = PropertiesService.getScriptProperties().getProperty('DRIVE_BRAIN_TOKEN') || '';
  return expected && payload && String(payload.token || '') === expected;
}
function productionScope_(scope) {
  return AI_OFFICE_PRODUCTION_SCOPES.indexOf(String(scope || '')) >= 0;
}
function approvedState_(scope, title) {
  if (scope === '02_APPROVED') return 'approved';
  if (scope === '03_TEMPLATES') return /\bAPPROVED\b/i.test(title) ? 'approved' : 'reference';
  if (scope === '04_SKILLS') return /\bAPPROVED\b/i.test(title) ? 'approved' : 'draft';
  if (scope === '01_KNOWLEDGE') return /\bAPPROVED\b/i.test(title) ? 'approved' : 'reference';
  return 'blocked';
}
function fileUrl_(file) {
  try { return file.getUrl(); } catch (_) { return 'https://drive.google.com/open?id=' + file.getId(); }
}
function stripXml_(xml) {
  return String(xml || '')
    .replace(/<w:tab\s*\/>/g,'\t')
    .replace(/<w:br[^>]*\/>/g,'\n')
    .replace(/<\/w:p>/g,'\n')
    .replace(/<\/w:tr>/g,'\n')
    .replace(/<\/a:p>/g,'\n')
    .replace(/<a:br\s*\/>/g,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/[ \t]+\n/g,'\n').replace(/\s+/g,' ').trim();
}
function textFromZip_(blob, type) {
  try {
    const files = Utilities.unzip(blob);
    const parts = [];
    files.slice(0,500).forEach(function(entry) {
      const name = entry.getName();
      if (type === 'docx' && name === 'word/document.xml') parts.push(stripXml_(entry.getDataAsString('UTF-8')));
      if (type === 'pptx' && /^ppt\/slides\/slide\d+\.xml$/.test(name)) parts.push(stripXml_(entry.getDataAsString('UTF-8')));
      if (type === 'xlsx' && (name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(name))) parts.push(stripXml_(entry.getDataAsString('UTF-8')));
    });
    return parts.join('\n').slice(0,MAX_FILE_TEXT);
  } catch (_) { return ''; }
}
function extractText_(file) {
  const mime = file.getMimeType();
  const id = file.getId();
  try {
    if (mime === MimeType.GOOGLE_DOCS) return DocumentApp.openById(id).getBody().getText().slice(0,MAX_FILE_TEXT);
    if (mime === MimeType.GOOGLE_SHEETS) {
      const ss = SpreadsheetApp.openById(id), out = [];
      ss.getSheets().slice(0,10).forEach(function(sh) {
        out.push('[Sheet: ' + sh.getName() + ']');
        const rows = sh.getDataRange().getDisplayValues().slice(0,500);
        rows.forEach(function(row){ out.push(row.slice(0,40).join('\t')); });
      });
      return out.join('\n').slice(0,MAX_FILE_TEXT);
    }
    if (mime === MimeType.GOOGLE_SLIDES) {
      const deck = SlidesApp.openById(id), out = [];
      deck.getSlides().slice(0,60).forEach(function(slide, i) {
        const texts = [];
        slide.getPageElements().forEach(function(el) {
          try {
            if (el.getPageElementType() === SlidesApp.PageElementType.SHAPE) texts.push(el.asShape().getText().asString());
            if (el.getPageElementType() === SlidesApp.PageElementType.TABLE) {
              const table = el.asTable();
              for (let r=0;r<table.getNumRows();r++) for (let c=0;c<table.getNumColumns();c++) texts.push(table.getCell(r,c).getText().asString());
            }
          } catch (_) {}
        });
        out.push('[Slide ' + (i+1) + '] ' + texts.join(' '));
      });
      return out.join('\n').slice(0,MAX_FILE_TEXT);
    }
    const name = file.getName().toLowerCase();
    if (/\.docx$/.test(name)) return textFromZip_(file.getBlob(),'docx');
    if (/\.pptx$/.test(name)) return textFromZip_(file.getBlob(),'pptx');
    if (/\.xlsx$/.test(name)) return textFromZip_(file.getBlob(),'xlsx');
    if (/text\//.test(mime) || /json|xml|csv|html/.test(mime)) return file.getBlob().getDataAsString('UTF-8').slice(0,MAX_FILE_TEXT);
  } catch (_) {}
  return '';
}
function scopeForFile_(file) {
  let frontier = [];
  try {
    const parents = file.getParents();
    while (parents.hasNext()) frontier.push(parents.next());
  } catch (_) { return ''; }
  const seen = {};
  for (let depth=0; depth<8 && frontier.length; depth++) {
    const next = [];
    for (let i=0; i<frontier.length; i++) {
      const folder = frontier[i], id = folder.getId();
      if (seen[id]) continue;
      seen[id] = true;
      for (let j=0; j<AI_OFFICE_PRODUCTION_SCOPES.length; j++) {
        const scope = AI_OFFICE_PRODUCTION_SCOPES[j];
        if (AI_OFFICE_SCOPES[scope] === id) return scope;
      }
      if (id === AI_OFFICE_ROOT) continue;
      try {
        const parents = folder.getParents();
        while (parents.hasNext()) next.push(parents.next());
      } catch (_) {}
    }
    frontier = next;
  }
  return '';
}
function collectFiles_(folder, scope, depth, out, max) {
  if (out.length >= max || depth > 4) return;
  const files = folder.getFiles();
  while (files.hasNext() && out.length < max) out.push({file:files.next(),scope:scope});
  const folders = folder.getFolders();
  while (folders.hasNext() && out.length < max) collectFiles_(folders.next(),scope,depth+1,out,max);
}
function sourceFromFile_(file, scope, includeText) {
  if (!productionScope_(scope)) throw new Error('SCOPE_NOT_ALLOWED');
  const title = file.getName();
  return {
    kind: scope === '03_TEMPLATES' ? 'drive-template' : scope === '04_SKILLS' ? 'drive-skill' : 'drive-document',
    scope: scope,
    source: 'Drive · ' + scope,
    fileId: file.getId(),
    title: title,
    url: fileUrl_(file),
    mimeType: file.getMimeType(),
    modifiedTime: file.getLastUpdated().toISOString(),
    approvalState: approvedState_(scope,title),
    text: includeText ? extractText_(file) : ''
  };
}
function requestedScopes_(payload) {
  const scopeMap = payload.scopes || {};
  return Object.keys(scopeMap).filter(function(scope) {
    return productionScope_(scope) && String(scopeMap[scope]) === AI_OFFICE_SCOPES[scope];
  }).slice(0,AI_OFFICE_PRODUCTION_SCOPES.length);
}
function search_(payload) {
  const query = normalize_(payload.query || '');
  const terms = query.split(/[^a-z0-9]+/).filter(function(x){return x.length>2;});
  const limit = Math.min(20,Math.max(1,Number(payload.limit)||8));
  const candidates = [];
  requestedScopes_(payload).forEach(function(scope) {
    const scoped = [];
    try { collectFiles_(DriveApp.getFolderById(AI_OFFICE_SCOPES[scope]),scope,0,scoped,MAX_FILES_PER_SCOPE); } catch (_) {}
    scoped.forEach(function(item){ if (candidates.length < MAX_SEARCH_CANDIDATES) candidates.push(item); });
  });
  const scored = [];
  candidates.forEach(function(item) {
    const file = item.file, title = file.getName(), titleNorm = normalize_(title);
    let score = terms.reduce(function(n,w){return n+(titleNorm.indexOf(w)>=0?4:0)},0);
    let text = '';
    if (!terms.length || score>0 || scored.length<20) text = extractText_(file);
    const hay = normalize_(text);
    score += terms.reduce(function(n,w){return n+(hay.indexOf(w)>=0?1:0)},0);
    if (item.scope === AI_OFFICE_GROUND_TRUTH_SCOPE) score += 6;
    else if (item.scope === '03_TEMPLATES') score += 2;
    else if (item.scope === '04_SKILLS') score += 1;
    if (!query || score>0) {
      const src = sourceFromFile_(file,item.scope,false);
      src.text = text.slice(0,30000);
      src.score = score;
      scored.push(src);
    }
  });
  scored.sort(function(a,b){return b.score-a.score || String(b.modifiedTime).localeCompare(String(a.modifiedTime));});
  return scored.slice(0,limit);
}
function list_(payload) {
  const out = [], limit = Math.min(20,Math.max(1,Number(payload.limit)||8));
  requestedScopes_(payload).forEach(function(scope) {
    const items = [];
    try { collectFiles_(DriveApp.getFolderById(AI_OFFICE_SCOPES[scope]),scope,0,items,Math.min(limit,MAX_FILES_PER_SCOPE)); } catch (_) {}
    items.forEach(function(item){ if(out.length<limit) out.push(sourceFromFile_(item.file,item.scope,false)); });
  });
  return out;
}
function read_(payload) {
  const id = clean_(payload.fileId,180);
  if (!id) throw new Error('FILE_ID_REQUIRED');
  const file = DriveApp.getFileById(id);
  const scope = scopeForFile_(file);
  if (!productionScope_(scope)) throw new Error('FILE_OUTSIDE_PRODUCTION_SCOPES');
  return sourceFromFile_(file,scope,true);
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!auth_(payload)) return json_({ok:false,error:'UNAUTHORIZED'});
    const action = clean_(payload.action,40).toLowerCase() || 'health';
    if (action === 'health') {
      return json_({
        ok:true,
        health:'ok',
        registryVersion:AI_OFFICE_REGISTRY_VERSION,
        rootId:AI_OFFICE_ROOT,
        productionScopes:AI_OFFICE_PRODUCTION_SCOPES,
        groundTruthScope:AI_OFFICE_GROUND_TRUTH_SCOPE
      });
    }
    if (action === 'search') return json_({ok:true,sources:search_(payload)});
    if (action === 'list') return json_({ok:true,sources:list_(payload)});
    if (action === 'read') return json_({ok:true,source:read_(payload)});
    return json_({ok:false,error:'INVALID_ACTION'});
  } catch (error) {
    return json_({ok:false,error:String(error && error.message || error).slice(0,180)});
  }
}
