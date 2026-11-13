/* UI 靈感庫（展櫃版）：一款一屏，上下滑動；底部懸浮選單負責全部／搜尋／分類／星號／篩選。
   條目與分類表由 Claude 直接寫進資料 repo；這一頁負責瀏覽、標星號、改狀態與備註。 */
const L = {home:'首頁',search:'搜尋',explore:'探索',folder:'專案',bookmark:'收藏',user:'我的',bell:'通知',chat:'訊息',chart:'分析',plus:'新增',grid:'資料庫'};
const I = {home:'home',search:'search',explore:'search',folder:'folder',bookmark:'bookmark',user:'user',bell:'bell',chat:'chat',chart:'chart',plus:'plus',grid:'grid'};
/* 可操作預覽的繪製設定（條目內容本身在資料檔） */
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
const HUES = {'bn-01':215,'bn-02':262,'bn-03':232,'bn-04':196,'bn-05':205,'bn-06':28,'bn-07':318,'bn-08':172,'bn-09':245,'bn-10':150,'bn-11':285,'db-01':28};
const STATUSES = ['收藏','想用','已用'];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = k => `<svg aria-hidden="true"><use href="#i-${I[k] || k}"/></svg>`;
const byCode = (a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'en', {numeric: true});

let entries = [], cats = [], loaded = false, editing = null, current = null, sheetKind = null, sheetArg = null, io = null;
const view = {cat:'全部', status:'全部', star:false};

function toast(t){ const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); }
function hueOf(e){
  if (Number.isFinite(e.hue)) return e.hue;
  if (HUES[e.id] != null) return HUES[e.id];
  let h = 0; for (const c of String(e.id || e.code || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h;
}
const groupOf = name => (cats.find(c => c.name === name) || {}).group || '';
const filtersOn = () => view.cat !== '全部' || view.status !== '全部' || view.star;
function filtered(){
  return entries.filter(e =>
    (view.cat === '全部' || e.category === view.cat) &&
    (view.status === '全部' || (e.status || '收藏') === view.status) &&
    (!view.star || e.star)).sort(byCode);
}

function previewHTML(e){
  if (e.preview === 'db-01') return `<div class="stage dash"><div class="dz">
      <div class="dr"><i class="on"></i><i></i><i></i><i></i><i></i></div>
      <div class="dg"><div class="g a"><small>總餘額</small><b>$595,241</b><em><u></u><u></u></em></div><div class="g t"><small>收入</small><b>$799</b></div><div class="g"><small>支出</small><b>$536</b></div>
      <div class="g c"><small>每月收支</small><span class="bars"><i style="--v:.9"></i><i style="--v:.7"></i><i style="--v:.75"></i><i style="--v:.55"></i><i style="--v:.6"></i><i style="--v:.3"></i></span></div><div class="g w"><small>最近活動</small><span class="ln"></span><span class="ln"></span><span class="ln"></span></div></div></div>
      <nav class="bn bn-dash" aria-label="${esc(e.name)}示範"><span class="ind"></span><button type="button" class="tab" aria-current="true"><span>總覽</span></button><button type="button" class="tab"><span>活動</span></button><button type="button" class="tab"><span>管理</span></button><button type="button" class="tab"><span>報表</span></button><button type="button" class="mid" aria-label="新增"><span class="dot">${icon('plus')}</span></button></nav></div>`;
  const items = PREVIEWS[e.preview];
  if (!items) return `<div class="noprev"><b>${esc(e.code)}</b><span>這筆只有文字規格，還沒有可操作的預覽</span></div>`;
  const n = e.preview.split('-')[1]; let t = -1;
  const btns = items.map(raw => {
    const mid = raw[0] === '*', k = mid ? raw.slice(1) : raw;
    if (mid) return `<button type="button" class="mid" aria-label="${L[k]}"><span class="dot">${icon(k)}</span>${n === '03' ? L[k] : ''}</button>`;
    t++; return `<button type="button" class="tab"${t === 0 ? ' aria-current="true"' : ''}>${icon(k)}<span>${L[k]}</span></button>`;
  }).join('');
  return `<div class="stage s-${n}"><nav class="bn bn-${n}" aria-label="${esc(e.name)}示範"><span class="ind"></span>${btns}</nav></div>`;
}
function place(nav){
  const cur = nav.querySelector('[aria-current="true"]'); if (!cur) return;
  nav.style.setProperty('--x', cur.offsetLeft + 'px'); nav.style.setProperty('--w', cur.offsetWidth + 'px');
}
const placeAll = () => document.querySelectorAll('.bn').forEach(place);

function sectionHTML(e, i, total){
  const num = (String(e.code || '').match(/(\d+)\s*$/) || [,''])[1] || String(i + 1).padStart(2, '0');
  const name = String(e.name || '');
  return `<section class="sp" data-id="${esc(e.id)}" style="--h:${hueOf(e)}">
    <div class="num" aria-hidden="true">${esc(num)}</div>
    <div class="meta">${esc(e.code)}<span>${esc([groupOf(e.category), e.category].filter(Boolean).join(' › '))}　${i + 1} / ${total}</span></div>
    <h2 class="${name.length > 5 ? 'long' : ''}">${esc(name)}</h2>
    <div class="en">${esc(e.en)}</div>
    <div class="vit">${previewHTML(e)}</div>
    ${e.desc ? `<p class="desc">${esc(e.desc)}</p>` : ''}
    ${(e.tags || []).length ? `<div class="tags">${e.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="acts">
      <button type="button" class="pill star" data-act="star" aria-pressed="${!!e.star}" aria-label="星號">★</button>
      <select class="pill" id="status-${esc(e.id)}" data-act="status" aria-label="狀態">${STATUSES.map(s => `<option${s === (e.status || '收藏') ? ' selected' : ''}>${s}</option>`).join('')}</select>
      <button type="button" class="pill" data-act="spec">規格</button>
      <button type="button" class="pill" data-act="copy">複製指令</button>
    </div>
  </section>`;
}

function render(){
  const feed = $('feed'), rail = $('rail');
  updateDock();
  if (!loaded) { feed.innerHTML = ''; rail.innerHTML = ''; return; }
  const list = filtered();
  if (!list.length) {
    rail.innerHTML = '';
    feed.innerHTML = `<section class="sp empty" style="--h:255"><h2 class="long">${entries.length ? '沒有符合的條目' : '還沒有任何條目'}</h2>
      <p class="desc">${entries.length ? '目前的篩選條件下沒有東西。' : '把截圖或影片傳給 Claude 說「加入靈感庫」，就會出現在這裡。'}</p>
      ${entries.length ? '<div class="acts"><button type="button" class="pill" data-act="clear">清除篩選</button></div>' : ''}</section>`;
    return;
  }
  if (!list.some(e => e.id === current)) current = list[0].id;
  feed.innerHTML = list.map((e, i) => sectionHTML(e, i, list.length)).join('');
  rail.innerHTML = list.length <= 24 ? list.map(e => `<i data-id="${esc(e.id)}"></i>`).join('') : '';
  const el = [...feed.children].find(s => s.dataset.id === current);
  el.classList.add('on'); feed.scrollTop = el.offsetTop; markRail(); placeAll();
  if (io) io.disconnect();
  io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    current = en.target.dataset.id;
    feed.querySelectorAll('.sp.on').forEach(x => { if (x !== en.target) x.classList.remove('on'); });
    en.target.classList.add('on'); markRail();
  }), {root: feed, threshold: .6});
  feed.querySelectorAll('.sp[data-id]').forEach(s => io.observe(s));
}
function markRail(){ $('rail').querySelectorAll('i').forEach(i => i.classList.toggle('on', i.dataset.id === current)); }
function updateDock(){
  $('d-star').classList.toggle('on', view.star);
  $('d-cat').classList.toggle('on', view.cat !== '全部');
  $('d-filter').classList.toggle('on', view.status !== '全部');
}
function clearFilters(){ view.cat = '全部'; view.status = '全部'; view.star = false; }
function jump(id){
  closeSheet();
  if (!filtered().some(e => e.id === id)) { clearFilters(); current = id; render(); return; }
  const el = [...$('feed').children].find(s => s.dataset.id === id);
  if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
}

/* 儲存：localStorage 為本機快取，GitHub Contents API 為跨裝置同步（token 只存本機）。
   條目與分類表由 Claude 寫進資料 repo；裝置端只改星號、狀態、備註，所以同步時一律「合併」而不是整份覆寫。 */
const LS_DATA = 'uilib.data', LS_GH = 'uilib.gh', LS_DIRTY = 'uilib.dirty', LS_DEL = 'uilib.deleted';
const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (_) { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
let gh = Object.assign({ owner: 'loneangle-claw', repo: 'ui-library-data', branch: 'main', path: 'entries.json', token: '' }, jget(LS_GH, {}));
let ghSha = null, pushTimer = null, pushing = false, dirty = !!jget(LS_DIRTY, false), rev = 0;
const ghReady = () => gh.owner && gh.repo && gh.path && gh.token;
const ghUrl = () => `https://api.github.com/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}/contents/${gh.path.split('/').map(encodeURIComponent).join('/')}`;
const ghHeaders = () => ({ Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
const b64enc = s => { const b = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < b.length; i += 0x8000) o += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(o); };
const b64dec = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));
function setSync(t){ $('sync').textContent = t; $('sdot').dataset.s = /失敗/.test(t) ? 'bad' : /已同步/.test(t) ? 'ok' : 'wait'; }
const saveLocal = () => jset(LS_DATA, { categories: cats, entries });
async function ghFetchRemote(){
  const r = await fetch(ghUrl() + '?ref=' + encodeURIComponent(gh.branch), { headers: ghHeaders(), cache: 'no-store' });
  if (r.status === 404) return { data: null, sha: null };
  if (!r.ok) throw new Error(r.status === 401 ? 'token 無效或過期' : 'GitHub ' + r.status);
  const j = await r.json();
  return { data: JSON.parse(b64dec(j.content)), sha: j.sha };
}
/* 把遠端合進本機：分類表以遠端為準；遠端有、本機沒有（且不是本機刪掉的）的條目補進來；
   兩邊都有的條目，內容以遠端為準，但保留本機改過的星號、狀態、備註 */
function mergeRemote(data, keepLocalMarks){
  if (!data) return;
  if (Array.isArray(data.categories)) cats = data.categories;
  if (!Array.isArray(data.entries)) return;
  if (!keepLocalMarks) { entries = data.entries; return; }
  const del = new Set(jget(LS_DEL, [])), local = new Map(entries.map(e => [e.id, e]));
  entries = data.entries.filter(e => !del.has(e.id)).map(e => {
    const l = local.get(e.id); local.delete(e.id);
    return l ? { ...e, star: l.star, status: l.status, note: l.note } : e;
  }).concat([...local.values()]);
}
async function ghPut(){
  const body = { message: '更新靈感庫條目', content: b64enc(JSON.stringify({ categories: cats, entries }, null, 2) + '\n'), branch: gh.branch };
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
    catch (e) {                                   // 遠端被改過（多半是 Claude 加了新條目）：先合併再寫回
      if (!e.conflict) throw e;
      const rem = await ghFetchRemote(); ghSha = rem.sha; mergeRemote(rem.data, true); saveLocal(); render(); await ghPut();
    }
    if (at === rev) { dirty = false; jset(LS_DIRTY, false); jset(LS_DEL, []); setSync('已同步到 GitHub'); }
  } catch (e) { setSync('同步失敗：' + e.message); }
  finally { pushing = false; if (at !== rev) schedulePush(); }
}
function schedulePush(){ clearTimeout(pushTimer); pushTimer = setTimeout(push, 1200); }
function commit(rerender = true){
  rev++; dirty = true; saveLocal(); jset(LS_DIRTY, true); if (rerender) render();
  if (ghReady()) schedulePush(); else setSync('只存在這台裝置，尚未設定同步');
}
function patch(id, fields){ const e = entries.find(x => x.id === id); if (!e) return; Object.assign(e, fields); commit(false); }
async function pull(){
  if (!ghReady()) return;
  setSync('讀取 GitHub 中');
  try {
    const rem = await ghFetchRemote(); ghSha = rem.sha;
    if (rem.data) { mergeRemote(rem.data, dirty); saveLocal(); loaded = true; render(); }
    if (dirty || !rem.data) { if (entries.length) await push(); else setSync('已連線，資料檔還是空的'); }
    else setSync('已同步到 GitHub');
  } catch (e) { setSync('同步失敗：' + e.message); }
}

/* 底部面板 */
const rowHTML = e => `<button type="button" class="row" data-jump="${esc(e.id)}" style="--h:${hueOf(e)}"><i></i><span class="rc">${esc(e.code)}</span><span class="rn">${esc(e.name)}</span><span class="rs">${e.star ? '★' : ''}</span><span class="rt">${esc(e.status || '收藏')}</span></button>`;
const chipRow = (label, key, list, cur) => `<div class="crow"><span>${label}</span>${list.map(v => `<button type="button" class="chip" data-k="${key}" data-v="${esc(v)}" aria-pressed="${v === cur}">${esc(v)}</button>`).join('')}</div>`;
function groupedRows(list){
  const by = new Map(); list.forEach(e => { const k = e.category || '未分類'; if (!by.has(k)) by.set(k, []); by.get(k).push(e); });
  const order = cats.map(c => c.name), keys = [...by.keys()].sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999));
  return keys.map(k => `<h4>${esc([groupOf(k), k].filter(Boolean).join(' › '))}<small>${by.get(k).length}</small></h4><div class="rows">${by.get(k).map(rowHTML).join('')}</div>`).join('');
}
function sheetHTML(){
  if (sheetKind === 'index') {
    const list = filtered();
    return `<h3>${filtersOn() ? `符合篩選 ${list.length} / ${entries.length} 款` : `全部 ${entries.length} 款`}</h3>
      ${filtersOn() ? '<button type="button" class="link" data-act="clear">清除篩選</button>' : ''}
      ${groupedRows(list) || '<p class="hint">沒有條目</p>'}`;
  }
  if (sheetKind === 'search') {
    return `<h3>搜尋</h3><input id="q" type="search" placeholder="名稱、代號、標籤" autocomplete="off" aria-label="搜尋">
      <div class="rows" id="results">${entries.slice().sort(byCode).map(rowHTML).join('')}</div>`;
  }
  if (sheetKind === 'cat') {
    const count = n => entries.filter(e => e.category === n).length;
    const known = new Set(cats.map(c => c.name));
    const extra = [...new Set(entries.map(e => e.category).filter(n => n && !known.has(n)))].map(n => ({ name: n, group: '其他', code: '' }));
    const all = cats.concat(extra), groups = [...new Set(all.map(c => c.group))];
    return `<h3>分類</h3>
      <button type="button" class="cat all" data-cat="全部" aria-pressed="${view.cat === '全部'}"><span>全部</span><b>${entries.length}</b></button>
      ${groups.map(g => `<h4>${esc(g)}</h4><div class="catgrid">${all.filter(c => c.group === g).map(c => { const n = count(c.name);
        return `<button type="button" class="cat${n ? '' : ' none'}" data-cat="${esc(c.name)}" aria-pressed="${view.cat === c.name}"><span>${esc(c.name)}</span><b>${n || ''}</b></button>`; }).join('')}</div>`).join('')}
      <p class="hint">灰色的類別還沒有收錄。</p>`;
  }
  if (sheetKind === 'filter') {
    return `<h3>篩選與同步</h3>
      ${chipRow('狀態', 'status', ['全部', ...STATUSES], view.status)}
      <div class="crow"><span>星號</span><button type="button" class="chip" data-k="star" aria-pressed="${view.star}">★ 只看星號</button></div>
      <div class="syncbox"><div><b>同步</b><p>${esc($('sync').textContent)}</p></div><button type="button" class="pill" data-act="cfg">同步設定</button></div>`;
  }
  if (sheetKind === 'spec') {
    const e = entries.find(x => x.id === sheetArg); if (!e) return '';
    const lines = String(e.spec || '').split('\n').map(s => s.trim()).filter(Boolean);
    return `<div class="meta" style="--h:${hueOf(e)}">${esc(e.code)}<span>${esc([groupOf(e.category), e.category].filter(Boolean).join(' › '))}</span></div><h3>${esc(e.name)} <small>${esc(e.en)}</small></h3>
      ${lines.length ? `<ol class="spec">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ol>` : '<p class="hint">還沒寫規格</p>'}
      ${e.note ? `<p class="note">${esc(e.note)}</p>` : ''}
      <p class="hint">${[e.source && '來源：' + esc(e.source), e.addedAt && '加入：' + esc(e.addedAt)].filter(Boolean).join('　')}</p>
      <div class="acts"><button type="button" class="pill" data-act="edit">備註與編輯</button><button type="button" class="pill" data-act="copy">複製指令</button></div>`;
  }
  return '';
}
function openSheet(kind, arg){
  sheetKind = kind; sheetArg = arg ?? null;
  $('sheet-body').innerHTML = sheetHTML(); $('sheet').classList.add('open'); $('sheet-panel').scrollTop = 0;
  if (kind === 'search') setTimeout(() => { const q = $('q'); if (q) q.focus(); }, 250);
}
function closeSheet(){ $('sheet').classList.remove('open'); sheetKind = null; }
function copyCmd(e){
  const text = `用 UI 靈感庫的 ${e.code} ${e.name} 樣式來做`;
  navigator.clipboard.writeText(text).then(() => toast('已複製：' + text), () => toast(text));
}

/* 事件：展櫃 */
$('feed').addEventListener('click', ev => {
  const tab = ev.target.closest('button.tab');
  if (tab) {
    const nav = tab.closest('.bn');
    nav.querySelectorAll('.tab').forEach(t => { t.removeAttribute('aria-current'); t.classList.remove('pop'); });
    tab.setAttribute('aria-current', 'true'); void tab.offsetWidth; tab.classList.add('pop'); place(nav);
    const r = tab.getBoundingClientRect(), rip = document.createElement('span');
    if (nav.classList.contains('bn-dash')) { const dz = nav.parentElement.querySelector('.dg'); dz.classList.remove('swap'); void dz.offsetWidth; dz.classList.add('swap'); }
    rip.className = 'rip'; rip.style.setProperty('--rx', (ev.clientX - r.left) + 'px'); rip.style.setProperty('--ry', (ev.clientY - r.top) + 'px');
    tab.appendChild(rip); rip.addEventListener('animationend', () => rip.remove());
    return;
  }
  const mid = ev.target.closest('button.mid');
  if (mid) { mid.classList.remove('spin'); void mid.offsetWidth; mid.classList.add('spin'); return; }
  const b = ev.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'clear') { clearFilters(); render(); return; }
  const sp = b.closest('.sp'), e = entries.find(x => x.id === sp.dataset.id); if (!e) return;
  if (b.dataset.act === 'star') { patch(e.id, {star: !e.star}); b.setAttribute('aria-pressed', !!e.star); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  if (b.dataset.act === 'spec') openSheet('spec', e.id);
  if (b.dataset.act === 'copy') copyCmd(e);
});
$('feed').addEventListener('change', ev => {
  const s = ev.target.closest('select[data-act="status"]'); if (!s) return;
  patch(s.closest('.sp').dataset.id, {status: s.value});
});

/* 事件：選單與面板 */
$('d-all').addEventListener('click', () => openSheet('index'));
$('d-search').addEventListener('click', () => openSheet('search'));
$('d-filter').addEventListener('click', () => openSheet('filter'));
$('d-star').addEventListener('click', () => { view.star = !view.star; render(); toast(view.star ? '只看星號' : '顯示全部'); });
$('d-cat').addEventListener('click', () => openSheet('cat'));
$('sheet-bg').addEventListener('click', closeSheet);
$('sheet-body').addEventListener('click', ev => {
  const j = ev.target.closest('[data-jump]'); if (j) { jump(j.dataset.jump); return; }
  const ct = ev.target.closest('[data-cat]');
  if (ct) { if (ct.classList.contains('none')) { toast('這個類別還沒有收錄'); return; } view.cat = ct.dataset.cat; current = null; render(); closeSheet(); return; }
  const c = ev.target.closest('.chip');
  if (c) { if (c.dataset.k === 'star') view.star = !view.star; else view[c.dataset.k] = c.dataset.v; render(); $('sheet-body').innerHTML = sheetHTML(); return; }
  const a = ev.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'clear') { clearFilters(); render(); $('sheet-body').innerHTML = sheetHTML(); }
  if (a.dataset.act === 'cfg') { closeSheet(); openCfg(); }
  const e = entries.find(x => x.id === sheetArg);
  if (a.dataset.act === 'edit' && e) { closeSheet(); openDlg(e); }
  if (a.dataset.act === 'copy' && e) copyCmd(e);
});
$('sheet-body').addEventListener('input', ev => {
  if (ev.target.id !== 'q') return;
  const q = ev.target.value.trim().toLowerCase();
  const list = entries.filter(e => !q || [e.code, e.name, e.en, e.desc, e.category, (e.tags || []).join(' ')].join(' ').toLowerCase().includes(q)).sort(byCode);
  $('results').innerHTML = list.map(rowHTML).join('') || '<p class="hint">找不到符合的條目</p>';
});

/* 編輯（新增由 Claude 直接寫進資料 repo，這裡只改既有條目） */
const F = ['code','category','name','en','desc','spec','tags','status','source','note'];
function openDlg(ent){
  if (!ent) return;
  editing = ent;
  F.forEach(k => { $('f-' + k).value = k === 'tags' ? (ent.tags || []).join(', ') : (ent[k] ?? ''); });
  $('cat-list').innerHTML = cats.map(c => `<option value="${esc(c.name)}">`).join('');
  const del = $('del'); del.textContent = '刪除'; del.dataset.sure = '';
  $('dlg').showModal();
}
$('cancel').addEventListener('click', () => $('dlg').close());
$('del').addEventListener('click', ev => {
  const b = ev.currentTarget;
  if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = '再按一次確認刪除'; return; }
  jset(LS_DEL, [...new Set([...jget(LS_DEL, []), editing.id])]);
  entries = entries.filter(x => x.id !== editing.id); commit(); $('dlg').close(); toast('已刪除');
});
$('form').addEventListener('submit', ev => {
  ev.preventDefault();
  const v = k => $('f-' + k).value.trim();
  Object.assign(editing, {
    code: v('code').toUpperCase(), category: v('category'), name: v('name'), en: v('en'), desc: v('desc'), spec: v('spec'),
    tags: v('tags').split(/[,，、]/).map(s => s.trim()).filter(Boolean),
    status: v('status') || '收藏', source: v('source'), note: v('note')
  });
  current = editing.id;
  if (!filtered().some(x => x.id === current)) clearFilters();
  commit(); $('dlg').close(); toast('已儲存');
});

/* 同步設定 */
const G = ['owner','repo','branch','path','token'];
function openCfg(){ G.forEach(k => $('gh-' + k).value = gh[k] || ''); $('gh-msg').textContent = ''; $('cfgdlg').showModal(); }
$('cfg-cancel').addEventListener('click', () => $('cfgdlg').close());
$('cfgform').addEventListener('submit', async ev => {
  ev.preventDefault();
  G.forEach(k => gh[k] = $('gh-' + k).value.trim());
  gh.branch = gh.branch || 'main'; gh.path = gh.path.replace(/^\/+/, '') || 'entries.json';
  jset(LS_GH, gh); ghSha = null;
  if (!ghReady()) { $('gh-msg').textContent = 'owner、repo、token 都要填'; return; }
  $('cfgdlg').close(); await pull();
});

window.addEventListener('resize', () => { placeAll(); const el = [...$('feed').children].find(s => s.dataset.id === current); if (el) $('feed').scrollTop = el.offsetTop; });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeAll);

/* 從主畫面開啟時（iOS），版面視窗會比螢幕短一截狀態列的高度，底部因此留白：改用螢幕實際高度排版 */
const standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
function fitScreen(){
  if (!standalone) return;
  const portrait = !window.matchMedia || matchMedia('(orientation: portrait)').matches;
  const full = portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width);
  document.documentElement.classList.add('standalone');
  document.documentElement.style.setProperty('--app-h', Math.max(full, window.innerHeight) + 'px');
}
fitScreen(); window.addEventListener('orientationchange', () => setTimeout(() => { fitScreen(); render(); }, 300));

/* 啟動 */
(async () => {
  const local = jget(LS_DATA, null);
  if (local && Array.isArray(local.entries)) { entries = local.entries; cats = Array.isArray(local.categories) ? local.categories : []; loaded = true; render(); }
  let def = null;
  if (!loaded || !cats.length) { try { const r = await fetch('entries.default.json'); if (r.ok) def = await r.json(); } catch (_) {} }
  if (def && !cats.length && Array.isArray(def.categories)) { cats = def.categories; if (loaded) render(); }
  if (ghReady()) { await pull(); if (!loaded) { loaded = true; render(); } return; }
  setSync('只存在這台裝置');
  if (!loaded) { if (def) { entries = def.entries || []; saveLocal(); } loaded = true; render(); }
})();
