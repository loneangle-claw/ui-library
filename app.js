const L = {home:'首頁',search:'搜尋',explore:'探索',folder:'專案',bookmark:'收藏',user:'我的',bell:'通知',chat:'訊息',chart:'分析',plus:'新增',grid:'資料庫'};
const I = {home:'home',search:'search',explore:'search',folder:'folder',bookmark:'bookmark',user:'user',bell:'bell',chat:'chat',chart:'chart',plus:'plus',grid:'grid'};
/* 預覽繪製設定（程式的一部分，條目內容本身存在資料庫） */
const PREVIEWS = {
  'bn-01':['home','explore','folder','bookmark','user'],
  'bn-02':['home','explore','folder','bookmark','user'],
  'bn-03':['home','search','*plus','bell','user'],
  'bn-04':['home','search','chart','chat','user'],
  'bn-05':['home','explore','folder','bookmark','user'],
  'bn-06':['home','explore','*plus','bell','user'],
  'bn-07':['home','search','folder','bell','user'],
  'bn-08':['home','explore','folder','chat','user'],
  'bn-09':['home','search','folder','bell','user'],
  'bn-10':['home','explore','folder','bookmark','user'],
  'bn-11':['home','folder','grid','search','user']
};
const ACCENTS = [
  {name:'靛藍',a:'#4f46e5',b:'#c026d3'},
  {name:'孔雀綠',a:'#0b7f86',b:'#2aa876'},
  {name:'珊瑚',a:'#e2553d',b:'#f0a13a'},
  {name:'石墨',a:'#2f3a4f',b:'#5b6b8c'}
];
const STATUSES = ['收藏','想用','已用'];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = k => `<svg aria-hidden="true"><use href="#i-${I[k]}"/></svg>`;

let entries = [], loaded = false, editing = null;
let animateNext = true;
const view = {q:'', cat:'全部', status:'全部', star:false};

function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('on'),2200); }
function setMsg(t){ $('msg').textContent = t; }

function previewHTML(key, name){
  const items = PREVIEWS[key];
  if (!items) return `<div class="noprev">這筆只有文字規格，還沒有預覽</div>`;
  const n = key.split('-')[1];
  const btns = items.map((raw,i) => {
    const mid = raw[0]==='*', k = mid ? raw.slice(1) : raw;
    if (mid) return `<button type="button" class="mid" aria-label="${L[k]}"><span class="dot">${icon(k)}</span>${n==='03'?L[k]:''}</button>`;
    return `<button type="button" class="tab"${i===0?' aria-current="true"':''}>${icon(k)}<span>${L[k]}</span></button>`;
  }).join('');
  return `<div class="stage s-${n}"><nav class="bn bn-${n}" aria-label="${esc(name)}示範"><span class="ind"></span>${btns}</nav></div>`;
}

function place(nav){
  const cur = nav.querySelector('[aria-current="true"]');
  if (!cur) return;
  nav.style.setProperty('--x', cur.offsetLeft + 'px');
  nav.style.setProperty('--w', cur.offsetWidth + 'px');
}
const placeAll = () => document.querySelectorAll('.bn').forEach(place);

function chips(rowId, list, cur, key){
  const row = $(rowId), label = row.querySelector('span').outerHTML;
  row.innerHTML = label + list.map(v => `<button type="button" class="chip" data-k="${key}" data-v="${esc(v)}" aria-pressed="${v===cur}">${esc(v)}</button>`).join('')
    + (key==='status' ? `<button type="button" class="chip" data-k="star" aria-pressed="${view.star}">★ 只看星號</button>` : '');
}

function render(){
  const cats = [...new Set(entries.map(e => e.category).filter(Boolean))].sort();
  if (view.cat !== '全部' && !cats.includes(view.cat)) view.cat = '全部';
  chips('cats', ['全部', ...cats], view.cat, 'cat');
  chips('stat', ['全部', ...STATUSES], view.status, 'status');
  $('cat-list').innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
  $('stats').innerHTML = loaded ? `共 <b>${entries.length}</b> 筆，<b>${cats.length}</b> 個類別，<b>${entries.filter(e=>e.star).length}</b> 筆星號` : '';

  const q = view.q.trim().toLowerCase();
  const list = entries.filter(e =>
    (view.cat==='全部' || e.category===view.cat) &&
    (view.status==='全部' || (e.status||'收藏')===view.status) &&
    (!view.star || e.star) &&
    (!q || [e.code,e.name,e.en,e.desc,e.category,(e.tags||[]).join(' ')].join(' ').toLowerCase().includes(q))
  ).sort((a,b) => String(a.code||'').localeCompare(String(b.code||'')));

  if (loaded && !entries.length) setMsg('還沒有任何條目。按「新增條目」自己建一筆，或把截圖傳給 Claude 說「加入靈感庫」。');
  else if (loaded && !list.length) setMsg('沒有符合篩選條件的條目。');
  else if (loaded) setMsg('');

  const g = $('grid'); g.classList.toggle('enter', animateNext && list.length > 0); if (list.length) animateNext = false;
  g.innerHTML = list.map((e,i) => `<article class="card" style="--i:${Math.min(i,12)}" data-id="${esc(e.id)}">
    <div class="card-top">
      <div><h2><span class="code">${esc(e.code)}</span>${esc(e.name)}<span class="en">${esc(e.en)}</span></h2><div class="cat">${esc(e.category)}</div></div>
      <button type="button" class="star" data-act="star" aria-pressed="${!!e.star}" aria-label="星號">★</button>
    </div>
    ${previewHTML(e.preview, e.name)}
    ${e.desc ? `<p>${esc(e.desc)}</p>` : ''}
    ${e.spec ? `<details><summary>規格</summary><p class="spec">${esc(e.spec)}</p></details>` : ''}
    ${(e.tags||[]).length ? `<div class="tags">${e.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    ${e.note ? `<p class="note">${esc(e.note)}</p>` : ''}
    <div class="actions">
      <select id="status-${esc(e.id)}" data-act="status" aria-label="狀態">${STATUSES.map(s=>`<option${s===(e.status||'收藏')?' selected':''}>${s}</option>`).join('')}</select>
      <button type="button" class="btn small" data-act="copy">複製指令</button>
      <button type="button" class="btn small" data-act="edit">編輯</button>
    </div>
  </article>`).join('');
  placeAll();
}

/* 儲存：localStorage 為本機快取，GitHub Contents API 為跨裝置同步（token 只存本機） */
const LS_DATA = 'uilib.data', LS_GH = 'uilib.gh', LS_DIRTY = 'uilib.dirty';
const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (_) { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
let gh = Object.assign({ owner: 'loneangle-claw', repo: 'ui-library-data', branch: 'main', path: 'entries.json', token: '' }, jget(LS_GH, {}));
let ghSha = null, pushTimer = null, pushing = false, dirty = !!jget(LS_DIRTY, false), rev = 0;
const ghReady = () => gh.owner && gh.repo && gh.path && gh.token;
const ghUrl = () => `https://api.github.com/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}/contents/${gh.path.split('/').map(encodeURIComponent).join('/')}`;
const ghHeaders = () => ({ Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
const b64enc = s => { const b = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < b.length; i += 0x8000) o += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(o); };
const b64dec = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
function setSync(t){ $('sync').textContent = t; }
async function ghFetchRemote(){
  const r = await fetch(ghUrl() + '?ref=' + encodeURIComponent(gh.branch), { headers: ghHeaders(), cache: 'no-store' });
  if (r.status === 404) return { data: null, sha: null };
  if (!r.ok) throw new Error(r.status === 401 ? 'token 無效或過期' : 'GitHub ' + r.status);
  const j = await r.json();
  return { data: JSON.parse(b64dec(j.content)), sha: j.sha };
}
async function ghPut(){
  const body = { message: '更新靈感庫條目', content: b64enc(JSON.stringify({ entries }, null, 2) + '\n'), branch: gh.branch };
  if (ghSha) body.sha = ghSha;
  const r = await fetch(ghUrl(), { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) { const e = new Error('sha'); e.conflict = true; throw e; }
  if (!r.ok) throw new Error(r.status === 401 ? 'token 無效或過期' : r.status === 404 ? '找不到 repo，或 token 沒有權限' : 'GitHub ' + r.status);
  ghSha = (await r.json()).content.sha;
}
async function push(){
  if (!ghReady() || pushing) return;
  pushing = true; const at = rev; setSync('同步中');
  try {
    try { await ghPut(); }
    catch (e) { if (!e.conflict) throw e; ghSha = (await ghFetchRemote()).sha; await ghPut(); }   // sha 過期：以本機版本覆寫
    if (at === rev) { dirty = false; jset(LS_DIRTY, false); setSync('已同步到 GitHub'); }
  } catch (e) { setSync('同步失敗：' + e.message); }
  finally { pushing = false; if (at !== rev) schedulePush(); }
}
function schedulePush(){ clearTimeout(pushTimer); pushTimer = setTimeout(push, 1200); }
function commit(){
  rev++; dirty = true; jset(LS_DATA, { entries }); jset(LS_DIRTY, true); render();
  if (ghReady()) schedulePush(); else setSync('只存在這台裝置，尚未設定同步');
}
function patch(id, fields){ const e = entries.find(x => x.id === id); if (!e) return; Object.assign(e, fields); commit(); }
async function pull(){
  if (!ghReady()) return;
  setSync('讀取 GitHub 中');
  try {
    const rem = await ghFetchRemote(); ghSha = rem.sha;
    if (rem.data && Array.isArray(rem.data.entries) && !dirty) { entries = rem.data.entries; jset(LS_DATA, { entries }); loaded = true; animateNext = true; render(); setSync('已同步到 GitHub'); }
    else if (entries.length) await push();
    else setSync('已連線，資料檔還是空的');
  } catch (e) { setSync('同步失敗：' + e.message); }
}

/* 事件 */
$('grid').addEventListener('click', e => {
  const tab = e.target.closest('button.tab');
  if (tab) {
    const nav = tab.closest('.bn');
    nav.querySelectorAll('.tab').forEach(t => { t.removeAttribute('aria-current'); t.classList.remove('pop'); });
    tab.setAttribute('aria-current','true'); void tab.offsetWidth; tab.classList.add('pop'); place(nav);
    const r = tab.getBoundingClientRect(), rip = document.createElement('span');
    rip.className = 'rip'; rip.style.setProperty('--rx', (e.clientX - r.left) + 'px'); rip.style.setProperty('--ry', (e.clientY - r.top) + 'px');
    tab.appendChild(rip); rip.addEventListener('animationend', () => rip.remove());
    return;
  }
  const mid = e.target.closest('button.mid');
  if (mid) { mid.classList.remove('spin'); void mid.offsetWidth; mid.classList.add('spin'); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = b.closest('.card').dataset.id, ent = entries.find(x => x.id===id); if (!ent) return;
  if (b.dataset.act==='star') patch(id, {star: !ent.star});
  if (b.dataset.act==='edit') openDlg(ent);
  if (b.dataset.act==='copy') {
    const text = `用 UI 靈感庫的 ${ent.code} ${ent.name} 樣式來做`;
    navigator.clipboard.writeText(text).then(()=>toast('已複製：'+text), ()=>toast(text));
  }
});
$('grid').addEventListener('change', e => {
  const s = e.target.closest('select[data-act="status"]'); if (!s) return;
  patch(s.closest('.card').dataset.id, {status: s.value});
});
document.querySelector('.toolbar').addEventListener('click', e => {
  const c = e.target.closest('.chip'); if (!c) return;
  if (c.dataset.k==='star') view.star = !view.star; else view[c.dataset.k] = c.dataset.v;
  animateNext = true; render();
});
let qt; $('q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(()=>{ view.q = e.target.value; render(); }, 150); });

const F = ['code','category','name','en','desc','spec','tags','status','source','note'];
function openDlg(ent){
  editing = ent || null;
  $('dlg-title').textContent = ent ? '編輯條目' : '新增條目';
  F.forEach(k => { $('f-'+k).value = ent ? (k==='tags' ? (ent.tags||[]).join(', ') : (ent[k] ?? '')) : (k==='status' ? '收藏' : ''); });
  const del = $('del'); del.hidden = !ent; del.textContent = '刪除'; del.dataset.sure = '';
  $('dlg').showModal();
}
$('add').addEventListener('click', () => openDlg(null));
$('cancel').addEventListener('click', () => $('dlg').close());
$('del').addEventListener('click', e => {
  const b = e.currentTarget;
  if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = '再按一次確認刪除'; return; }
  entries = entries.filter(x => x.id !== editing.id); commit(); $('dlg').close(); toast('已刪除');
});
$('form').addEventListener('submit', e => {
  e.preventDefault();
  const v = k => $('f-'+k).value.trim();
  const data = {
    code: v('code').toUpperCase(), category: v('category'), name: v('name'), en: v('en'), desc: v('desc'), spec: v('spec'),
    tags: v('tags').split(/[,，、]/).map(s=>s.trim()).filter(Boolean),
    status: v('status') || '收藏', source: v('source'), note: v('note'),
    star: editing ? !!editing.star : false,
    preview: editing ? (editing.preview || '') : '',
    addedAt: editing ? (editing.addedAt || '') : new Date().toISOString().slice(0,10)
  };
  if (editing) Object.assign(editing, data);
  else {
    const slug = data.code.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || ('e' + Date.now());
    if (entries.some(x => x.id===slug)) { toast('代號 '+data.code+' 已經存在'); return; }
    entries.push({id: slug, ...data});
  }
  commit(); $('dlg').close(); toast('已儲存');
});

/* 主色 */
const sw = $('swatches');
sw.innerHTML = ACCENTS.map((c,i) => `<button type="button" class="sw" id="accent-${i}" style="--c:${c.a}" aria-pressed="${i===0}"><i></i>${c.name}</button>`).join('');
function setAccent(i){
  const c = ACCENTS[i] || ACCENTS[0];
  document.documentElement.style.setProperty('--accent', c.a);
  document.documentElement.style.setProperty('--accent2', c.b);
  sw.querySelectorAll('.sw').forEach((x,j) => x.setAttribute('aria-pressed', j===i));
}
sw.addEventListener('click', e => {
  const b = e.target.closest('.sw'); if (!b) return;
  const i = +b.id.split('-')[1]; setAccent(i);
  try { localStorage.setItem('uilib-accent', i); } catch (_) {}
});
try { const i = +localStorage.getItem('uilib-accent'); if (i) setAccent(i); } catch (_) {}

window.addEventListener('resize', placeAll);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeAll);
render();

/* 同步設定 */
const G = ['owner','repo','branch','path','token'];
$('cfg').addEventListener('click', () => { G.forEach(k => $('gh-'+k).value = gh[k] || ''); $('gh-msg').textContent = ''; $('cfgdlg').showModal(); });
$('cfg-cancel').addEventListener('click', () => $('cfgdlg').close());
$('cfgform').addEventListener('submit', async e => {
  e.preventDefault();
  G.forEach(k => gh[k] = $('gh-'+k).value.trim());
  gh.branch = gh.branch || 'main'; gh.path = gh.path.replace(/^\/+/, '') || 'entries.json';
  jset(LS_GH, gh); ghSha = null;
  if (!ghReady()) { $('gh-msg').textContent = 'owner、repo、token 都要填'; return; }
  $('cfgdlg').close(); await pull();
});

/* 啟動 */
(async () => {
  const local = jget(LS_DATA, null);
  if (local && Array.isArray(local.entries)) { entries = local.entries; loaded = true; render(); }
  if (ghReady()) { await pull(); if (!loaded) { loaded = true; render(); } return; }
  setSync('只存在這台裝置，尚未設定同步');
  if (!loaded) {
    try { const r = await fetch('entries.default.json'); if (r.ok) { entries = (await r.json()).entries || []; jset(LS_DATA, { entries }); } } catch (_) {}
    loaded = true; render();
  }
})();
