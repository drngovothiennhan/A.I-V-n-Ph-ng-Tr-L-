function norm(v=''){return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();}
function getDocs(){try{if(typeof window.docs==='function')return window.docs();return JSON.parse(localStorage.getItem('ai-office-drive-docs-v16')||'[]');}catch{return[];}}
function parseFirstTable(text=''){
  const lines=String(text).split(/\r?\n/).filter(x=>x.trim());
  const marker=lines.findIndex(x=>/^\[Sheet:/.test(x));
  const start=marker>=0?marker+1:0;
  const data=[];
  for(let i=start;i<lines.length;i++){
    if(/^\[Sheet:/.test(lines[i])&&data.length)break;
    const cells=lines[i].split('\t').map(x=>x.trim());
    if(cells.some(Boolean))data.push(cells);
  }
  if(data.length<2)return null;
  const width=Math.max(...data.map(r=>r.length));
  const rows=data.map(r=>Array.from({length:width},(_,i)=>r[i]??''));
  return {headers:rows[0],rows:rows.slice(1)};
}
const GROUPS=[
  ['ma dinh danh','cccd','cmnd','ma hoc sinh','ma hs','mssv','ma sinh vien'],
  ['ho va ten','ho ten','ten hoc sinh','ten tre','ten'],
  ['lop','lop hoc'],
  ['ngay sinh','nam sinh','date of birth','dob'],
  ['dia chi','noi o','thuong tru','tam tru'],
  ['so dien thoai','dien thoai','sdt']
];
function findColumn(headers,group){const h=headers.map(norm);for(const candidate of group){const c=norm(candidate);const exact=h.findIndex(x=>x===c);if(exact>=0)return exact;}for(const candidate of group){const c=norm(candidate);const idx=h.findIndex(x=>x.includes(c)||c.includes(x));if(idx>=0)return idx;}return -1;}
function chooseKeys(a,b){const pairs=[];for(const group of GROUPS){const ai=findColumn(a.headers,group),bi=findColumn(b.headers,group);if(ai>=0&&bi>=0)pairs.push({ai,bi,label:group[0]});}
  if(!pairs.length){const max=Math.min(2,a.headers.length,b.headers.length);for(let i=0;i<max;i++)pairs.push({ai:i,bi:i,label:a.headers[i]||`cot ${i+1}`});}
  const id=pairs.find(x=>x.label==='ma dinh danh');if(id)return[id];
  const name=pairs.find(x=>x.label==='ho va ten'),cls=pairs.find(x=>x.label==='lop'),dob=pairs.find(x=>x.label==='ngay sinh'),addr=pairs.find(x=>x.label==='dia chi');
  if(name&&cls)return[name,cls];if(name&&dob)return[name,dob];if(name&&addr)return[name,addr];if(name)return[name];return pairs.slice(0,2);
}
function keyOf(row,pairs,side){return pairs.map(p=>norm(row[side==='a'?p.ai:p.bi]||'')).join('|');}
function rowLabel(row,headers){const nameIdx=findColumn(headers,GROUPS[1]),clsIdx=findColumn(headers,GROUPS[2]),dobIdx=findColumn(headers,GROUPS[3]);return [nameIdx>=0?row[nameIdx]:'',clsIdx>=0?row[clsIdx]:'',dobIdx>=0?row[dobIdx]:''].filter(Boolean).join(' · ')||row.slice(0,3).filter(Boolean).join(' · ');}
export function runLocalDataOperation(query=''){
  const q=norm(query),docs=getDocs().filter(d=>d&&d.status==='approved'&&/\.(xlsx|csv|tsv)$/i.test(d.name||'')&&d.text);
  if(!/doi chieu|so sanh|trung|khop/.test(q))return null;
  if(docs.length<2)return {text:'Nhiệm vụ đối chiếu đã được nhận diện nhưng hiện chưa có đủ 2 bảng dữ liệu đã duyệt trong Knowledge Brain. Hãy nạp và duyệt hai tệp cần đối chiếu; hệ thống không tự tạo kết quả.',rows:null,meta:{reason:'need_two_approved_tables'}};
  const da=docs[0],db=docs[1],a=parseFirstTable(da.text),b=parseFirstTable(db.text);
  if(!a||!b)return {text:'Đã tìm thấy tệp nhưng không đọc được cấu trúc bảng đủ để đối chiếu tự động. Không có kết quả giả được tạo.',rows:null,meta:{reason:'parse_failed'}};
  const pairs=chooseKeys(a,b),mapB=new Map();for(const row of b.rows){const k=keyOf(row,pairs,'b');if(!k.replace(/\|/g,''))continue;if(!mapB.has(k))mapB.set(k,[]);mapB.get(k).push(row);}
  const matched=[],onlyA=[];const used=new Set();for(const row of a.rows){const k=keyOf(row,pairs,'a'),hits=mapB.get(k)||[];if(k.replace(/\|/g,'')&&hits.length){matched.push([row,hits[0]]);used.add(k);}else onlyA.push(row);}
  const onlyB=b.rows.filter(row=>{const k=keyOf(row,pairs,'b');return !used.has(k);});
  const rows=[['Trạng thái','Nguồn','Thông tin nhận diện'],...matched.map(([r])=>['TRÙNG',da.name,rowLabel(r,a.headers)]),...onlyA.map(r=>['CHỈ TỆP A',da.name,rowLabel(r,a.headers)]),...onlyB.map(r=>['CHỈ TỆP B',db.name,rowLabel(r,b.headers)])];
  const text=`KẾT QUẢ ĐỐI CHIẾU DỮ LIỆU\n\nTệp A: ${da.name}\nTệp B: ${db.name}\nKhóa đối chiếu: ${pairs.map(p=>p.label).join(' + ')}\n\n- Số dòng tệp A: ${a.rows.length}\n- Số dòng tệp B: ${b.rows.length}\n- Khớp/trùng: ${matched.length}\n- Chỉ có ở tệp A: ${onlyA.length}\n- Chỉ có ở tệp B: ${onlyB.length}\n\nNguyên tắc: chỉ đối chiếu trên dữ liệu đã duyệt; không tự điền trường thiếu. Các trường hợp gần giống nhưng không khớp khóa chính xác không bị tự động coi là trùng.`;
  return {text,rows,meta:{fileA:da.name,fileB:db.name,keys:pairs.map(p=>p.label),matched:matched.length,onlyA:onlyA.length,onlyB:onlyB.length}};
}

// This module is already part of the production bootstrap import graph. Use a microtask
// to synchronize the visible release label after the bootstrap finishes its synchronous setup.
queueMicrotask(()=>{
  try{
    const footer=document.querySelector('.footer');
    if(footer)footer.textContent='A.I VĂN PHÒNG · 1.9.3 AUTONOMOUS OFFICE ORCHESTRATOR · Dashboard v1.5 approved';
    const status=document.getElementById('v19Status');
    if(status&&/^v1\.9\.2\b/.test(status.textContent||''))status.textContent=(status.textContent||'').replace(/^v1\.9\.2/,'v1.9.3');
    const bubble=document.getElementById('bubble');
    if(bubble&&/^v1\.9\.2\b/.test(bubble.textContent||''))bubble.textContent=(bubble.textContent||'').replace(/^v1\.9\.2/,'v1.9.3');
    document.documentElement.dataset.aiOfficeRelease='1.9.3';
    if(window.AIOfficeV19)window.AIOfficeV19.release='1.9.3';
  }catch{}
});
