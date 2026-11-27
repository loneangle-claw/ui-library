/* UI 靈感庫（範例庫版）：範例卡片格狀牆 + 單款示範頁。
   手機：單欄卡片、分類是橫向捲動列；電腦：左側分類欄 + 多欄卡片，示範頁左右兩欄。
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
const HUES = {'bn-01':215,'bn-02':262,'bn-03':232,'bn-04':196,'bn-05':205,'bn-06':28,'bn-07':318,'bn-08':172,'bn-09':245,'bn-10':150,'bn-11':285,'db-01':28,'bg-01':270,'bg-02':165,'bg-03':300,'bg-04':205,'bg-05':255,'bg-06':320,'nt-01':28,'nt-02':32,'nt-03':36,'nt-04':40,'nt-05':24,'nt-06':44,'mo-01':232,'sw-01':262,'sw-02':268,'sw-03':330,'sw-04':200,'sw-05':285,'sw-06':42,'cd-01':268};
const STATUSES = ['收藏','想用','已用'];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = k => `<svg aria-hidden="true"><use href="#i-${I[k] || k}"/></svg>`;
const byCode = (a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'en', {numeric: true});

let entries = [], cats = [], loaded = false, editing = null, route = '', gridY = 0, animateNext = true;
const view = {cat:'全部', status:'全部', star:false, q:''};

function toast(t){ const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); }
function hueOf(e){
  if (Number.isFinite(e.hue)) return e.hue;
  if (HUES[e.id] != null) return HUES[e.id];
  let h = 0; for (const c of String(e.id || e.code || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h;
}
const groupOf = name => (cats.find(c => c.name === name) || {}).group || '';
const filtersOn = () => view.cat !== '全部' || view.status !== '全部' || view.star || view.q.trim();
function filtered(){
  const q = view.q.trim().toLowerCase();
  return entries.filter(e =>
    (view.cat === '全部' || e.category === view.cat) &&
    (view.status === '全部' || (e.status || '收藏') === view.status) &&
    (!view.star || e.star) &&
    (!q || [e.code, e.name, e.en, e.desc, e.category, (e.tags || []).join(' ')].join(' ').toLowerCase().includes(q))).sort(byCode);
}
function clearFilters(){ view.cat = '全部'; view.status = '全部'; view.star = false; view.q = ''; $('q').value = ''; }

/* BG 系列：背景效果示範，點一下會互動 */
const BG_FX = {
  '1': '<span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>',
  '2': '<span class="bands"><span class="band a3"></span><span class="band a1"></span><span class="band a2"></span></span>',
  '3': '<span class="glow"></span><span class="grain"></span>',
  '4': '<span class="dots"></span>',
  '5': '<span class="lines"></span><span class="spot"></span><span class="lit"></span>',
  '6': '<span class="g6w"><span class="g6"></span></span>'
};
function bgHTML(k){
  return `<div class="bgx bg-${k}" data-bg="${k}" role="img" aria-label="背景效果示範，點一下互動"><span class="fx">${BG_FX[k]}</span>
    <span class="hc"><span class="badge">測試中</span><b>更快上線</b><small>幾分鐘做出一個精緻網站</small><i>開始使用</i></span></div>`;
}
function bgTap(el, ev){
  const r = el.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, k = el.dataset.bg;
  if (k === '1') el.querySelectorAll('.blob').forEach(b => { b.style.left = (8 + Math.random() * 84) + '%'; b.style.top = (8 + Math.random() * 84) + '%'; });
  if (k === '2' || k === '3') { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  if (k === '4') {
    const s = document.createElement('span'); s.className = 'rip4';
    s.style.setProperty('--rx', x + 'px'); s.style.setProperty('--ry', y + 'px');
    el.querySelector('.fx').appendChild(s); setTimeout(() => s.remove(), 1400);
  }
  if (k === '5' && el._spot) Object.assign(el._spot, { tx: x, ty: y, hold: performance.now() + 2500 });
  if (k === '6') { const n = (+el.dataset.n || 0) + 1; el.dataset.n = n; el.style.setProperty('--turn', n * 75 + 'deg'); el.style.setProperty('--hue', n * 50 + 'deg'); }
}
/* 聚光燈：光源平時慢慢遊走，被點時快速滑過去並停一下 */
function initBgs(){
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.bgx[data-bg="5"]:not([data-on])').forEach(el => {
    el.dataset.on = '1';
    const st = el._spot = { x: 0, y: 0, tx: 0, ty: 0, hold: 0, next: 0 };
    const step = t => {
      if (!el.isConnected) return;
      const w = el.clientWidth, h = el.clientHeight;
      if (!st.x && !st.y) { st.x = st.tx = w * .3; st.y = st.ty = h * .4; }
      if (!still && t > st.hold && t > st.next) { st.tx = w * (.12 + Math.random() * .76); st.ty = h * (.15 + Math.random() * .7); st.next = t + 2600; }
      const f = t < st.hold ? .09 : .02;
      st.x += (st.tx - st.x) * f; st.y += (st.ty - st.y) * f;
      el.style.setProperty('--sx', st.x.toFixed(1) + 'px'); el.style.setProperty('--sy', st.y.toFixed(1) + 'px');
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
/* NT 系列：通知動效示範。看得到時每隔幾秒自動播一次，點一下立刻播 */
function ntHTML(k){
  return `<div class="ntx nt-${k}" data-nt="${k}" role="img" aria-label="通知動效示範，點一下播放">
    <span class="nth"><b>收件匣</b><span class="inb">${icon('inbox')}</span></span>
    <span class="ntl"><i></i><i></i><i></i></span>
    <span class="fab">${icon('plus')}</span>
    <span class="lay"></span></div>`;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const anim = (el, kf, o) => el.animate(kf, Object.assign({duration: 400, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards'}, o)).finished.catch(() => {});
function mk(parent, cls, html = ''){ const s = document.createElement('span'); s.className = cls; s.innerHTML = html; parent.appendChild(s); return s; }
const TOAST = (msg = '七點見？', who = '阿美', side = '剛剛') => `<span class="av">${who.slice(-1)}</span><span class="tt"><b>${who}</b><small>${msg}</small></span><em>${side}</em>`;
const NT_PLAY = {
  '1': async (el, lay) => {                                     /* 黏液滴落 */
    const goo = mk(lay, 'goo'), lip = mk(goo, 'lip'), drop = mk(goo, 'drop');
    anim(lip, [{width: '0em'}, {width: '4.5em'}], {duration: 320});
    await anim(drop, [{top: '-1.6em', width: '1.4em', height: '1.4em'}, {top: '1.4em', width: '1.9em', height: '1.9em', offset: .6}, {top: '1.2em', width: '1.7em', height: '1.7em'}], {duration: 560, easing: 'cubic-bezier(.5,0,.3,1.3)'});
    anim(lip, [{width: '4.5em'}, {width: '0em'}], {duration: 380});
    await anim(drop, [{width: '1.7em', height: '1.7em'}, {width: '80%', height: '3em'}], {duration: 440, easing: 'cubic-bezier(.3,1.35,.5,1)'});
    const t = mk(lay, 'tst bare', TOAST());
    await anim(t, [{opacity: 0}, {opacity: 1}], {duration: 220});
    await sleep(1300);
    await anim(t, [{opacity: 1}, {opacity: 0}], {duration: 160});
    anim(lip, [{width: '0em'}, {width: '4.5em'}], {duration: 300, delay: 260});
    await anim(drop, [{width: '80%', height: '3em', top: '1.2em'}, {width: '1.7em', height: '1.7em', top: '1.2em', offset: .5}, {width: '1.2em', height: '1.2em', top: '-1.6em'}], {duration: 640, easing: 'cubic-bezier(.5,0,.5,1)'});
    await anim(lip, [{width: '4.5em'}, {width: '0em'}], {duration: 260});
  },
  '2': async (el, lay) => {                                     /* 翻落 */
    const t = mk(lay, 'tst top', TOAST());
    await anim(t, [{transform: 'translateX(-50%) rotateX(-95deg)', opacity: 0}, {transform: 'translateX(-50%) rotateX(12deg)', opacity: 1, offset: .7}, {transform: 'translateX(-50%) rotateX(0deg)', opacity: 1}], {duration: 650, easing: 'cubic-bezier(.3,.7,.3,1)'});
    await sleep(1400);
    await anim(t, [{transform: 'translateX(-50%) rotateX(0deg)', opacity: 1}, {transform: 'translateX(-50%) rotateX(-95deg)', opacity: 0}], {duration: 420, easing: 'cubic-bezier(.6,0,.8,.4)'});
  },
  '3': async (el, lay) => {                                     /* 飛進收件匣 */
    const t = mk(lay, 'tst mid', TOAST('在路上了', '阿力'));
    await anim(t, [{transform: 'translate(-50%,-50%) scale(.85)', opacity: 0}, {transform: 'translate(-50%,-50%) scale(1)', opacity: 1}], {duration: 380});
    await sleep(1000);
    const cs = getComputedStyle(t);
    t.querySelectorAll(':scope > *').forEach(c => anim(c, [{opacity: 1}, {opacity: 0}], {duration: 140}));
    await anim(t, [{width: cs.width, height: cs.height}, {width: '1.3em', height: '1.3em'}], {duration: 380, easing: 'cubic-bezier(.5,0,.2,1)'});
    const r0 = el.getBoundingClientRect(), a = t.getBoundingClientRect(), ib = el.querySelector('.inb').getBoundingClientRect();
    const x0 = a.left - r0.left + a.width / 2, y0 = a.top - r0.top + a.height / 2, x1 = ib.left - r0.left + ib.width / 2, y1 = ib.top - r0.top + ib.height / 2;
    const cx = x0 + (x1 - x0) * .62, cy = y0 + r0.height * .14;
    const pts = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14, x = (1-u)*(1-u)*x0 + 2*(1-u)*u*cx + u*u*x1, y = (1-u)*(1-u)*y0 + 2*(1-u)*u*cy + u*u*y1;
      pts.push({transform: `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${(1 - u * .55).toFixed(2)})`}); }
    t.remove();
    const dot = mk(lay, 'ndot'), dur = 640;
    [3, 6, 9].forEach(i => setTimeout(() => { if (!lay.isConnected) return; const g = mk(lay, 'ghost'); anim(g, [{transform: pts[i].transform, opacity: .7}, {transform: pts[i].transform + ' scale(2)', opacity: 0}], {duration: 520}); }, i * dur / 14));
    await anim(dot, pts, {duration: dur, easing: 'cubic-bezier(.45,0,.3,1)'});
    dot.remove(); el.classList.add('badge');
    await anim(el.querySelector('.inb'), [{transform: 'scale(1)'}, {transform: 'scale(1.25)'}, {transform: 'scale(1)'}], {duration: 340});
    await sleep(1500); el.classList.remove('badge');
  },
  '4': async (el, lay) => {                                     /* 推擠浮動按鈕 */
    const fab = el.querySelector('.fab'), t = mk(lay, 'tst snack', TOAST('七點見？', '阿美', '回覆'));
    const h = t.offsetHeight + 8;
    anim(fab, [{transform: 'translateY(0)'}, {transform: `translateY(-${h}px)`}], {duration: 440, easing: 'cubic-bezier(.3,1.3,.5,1)'});
    await anim(t, [{transform: 'translateY(140%)'}, {transform: 'translateY(0)'}], {duration: 440, easing: 'cubic-bezier(.3,1.2,.5,1)'});
    await sleep(1500);
    anim(fab, [{transform: `translateY(-${h}px)`}, {transform: 'translateY(0)'}], {duration: 380, easing: 'cubic-bezier(.5,0,.2,1)'});
    await anim(t, [{transform: 'translateY(0)'}, {transform: 'translateY(140%)'}], {duration: 380, easing: 'cubic-bezier(.5,0,.2,1)'});
  },
  '5': async (el, lay) => {                                     /* 聊天頭像 */
    const head = mk(lay, 'chead', '<span class="avb">美</span><span class="cnt">1</span>'), bub = mk(lay, 'cbub', '七點見？');
    const cnt = head.querySelector('.cnt'); cnt.style.transform = 'scale(0)';
    await anim(head, [{transform: 'translateY(-50%) scale(0)'}, {transform: 'translateY(-50%) scale(1.15)', offset: .6}, {transform: 'translateY(-50%) scale(1)'}], {duration: 460});
    anim(cnt, [{transform: 'scale(0)'}, {transform: 'scale(1.3)', offset: .6}, {transform: 'scale(1)'}], {duration: 360});
    await sleep(180);
    await anim(bub, [{clipPath: 'inset(0 0 0 100% round 999px)'}, {clipPath: 'inset(0 0 0 0 round 999px)'}], {duration: 440, easing: 'cubic-bezier(.2,.9,.3,1.1)'});
    await sleep(1400);
    await anim(bub, [{clipPath: 'inset(0 0 0 0 round 999px)'}, {clipPath: 'inset(0 0 0 100% round 999px)'}], {duration: 320, easing: 'cubic-bezier(.5,0,.2,1)'});
    await anim(head, [{transform: 'translateY(-50%) scale(1)', opacity: 1}, {transform: 'translateY(-50%) scale(0)', opacity: 0}], {duration: 300, easing: 'cubic-bezier(.5,0,.8,.5)'});
  },
  '6': async (el, lay) => {                                     /* 合併計數 */
    const ts = [0, 1, 2].map(i => { const t = mk(lay, 'tst stk', TOAST()); t.style.top = (4.6 + i * 3.6) + 'em'; t.style.zIndex = 3 - i; t.style.opacity = 0; return t; });
    for (const t of ts) { anim(t, [{transform: 'translateX(-50%) translateY(-1.2em)', opacity: 0}, {transform: 'translateX(-50%) translateY(0)', opacity: 1}], {duration: 400, easing: 'cubic-bezier(.3,1.3,.5,1)'}); await sleep(250); }
    await sleep(900);
    ts.slice(1).forEach((t, i) => anim(t, [{transform: 'translateX(-50%) translateY(0) scale(1)', opacity: 1}, {transform: `translateX(-50%) translateY(-${3.6 * (i + 1)}em) scale(.94)`, opacity: 0}], {duration: 440, easing: 'cubic-bezier(.5,0,.2,1)'}));
    await sleep(340);
    ts[0].querySelector('small').textContent = '3 則新訊息';
    const em = ts[0].querySelector('em'); em.textContent = '×3'; em.className = 'chip';
    await anim(ts[0], [{transform: 'translateX(-50%) scale(1)'}, {transform: 'translateX(-50%) scale(1.06)'}, {transform: 'translateX(-50%) scale(1)'}], {duration: 340});
    await sleep(1400);
    await anim(ts[0], [{transform: 'translateX(-50%) translateY(0)', opacity: 1}, {transform: 'translateX(-50%) translateY(-1em)', opacity: 0}], {duration: 300});
  }
};
async function playNt(el){
  if (el._busy) return; el._busy = true;
  const lay = el.querySelector('.lay'); lay.innerHTML = '';
  try { await NT_PLAY[el.dataset.nt](el, lay); }
  finally { lay.innerHTML = ''; el.querySelectorAll('.fab,.inb').forEach(x => x.getAnimations().forEach(a => a.cancel())); el.classList.remove('badge'); el._busy = false; }
}
let ntIO = null;
function initNts(){
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ntIO && 'IntersectionObserver' in window) ntIO = new IntersectionObserver(es => es.forEach(en => { en.target._vis = en.isIntersecting; }), {threshold: .6});
  document.querySelectorAll('.ntx:not([data-on])').forEach((el, i) => {
    el.dataset.on = '1'; if (ntIO) ntIO.observe(el);
    if (still) return;
    const tick = () => {
      if (!el.isConnected) { if (ntIO) ntIO.unobserve(el); return; }
      if (el._vis && !document.hidden) playNt(el);
      setTimeout(tick, 5600);
    };
    setTimeout(tick, 700 + i * 500);
  });
}
/* MO-01：同一個切換，三種後緣彈簧並排比較 */
function moHTML(){
  const tabs = ['home', 'search', 'bookmark', 'user'].map((k, i) => `<button type="button" class="tab"${i ? '' : ' aria-current="true"'} aria-label="${L[k]}">${icon(k)}</button>`).join('');
  return `<div class="mox">${[['19', '不伸縮'], ['11', '有彈性'], ['6', '軟 Q']].map(([b, l]) =>
    `<div class="mrow"><span class="mlab">後緣 ω₀ ${b}<b>${l}</b></span><nav class="bn bn-mo" data-back="${b}" aria-label="後緣 ω₀ ${b}"><span class="ind"></span>${tabs}</nav></div>`).join('')}
    <span class="mnote">前緣都是 ω₀ 19、ζ 0.55</span></div>`;
}
/* GL：元件詞典，一個名詞一個示範。點一下切換 .off（出現／關閉、選中／未選）。 */
const GLP = (top = '') => `<span class="gpg"${top ? ` style="top:${top}"` : ''}><i></i><i></i><i></i><i></i><i></i><i></i></span>`;
const GLB = t => `<span class="gbar">${t}</span>`;
const GROW = (inner, n = 3) => Array.from({length: n}, (_, i) => `<span class="grow">${inner(i)}</span>`).join('');
const GL = {
  modal: GLB('任務清單') + GLP() + '<span class="gdim gfx"></span><span class="gmod gcard gfx"><b>新增任務</b><span class="gin">任務名稱</span><span class="gin">期限</span><span class="gbtns"><u>取消</u><u class="p">儲存</u></span></span>',
  tooltip: GLB('報表') + GLP() + '<span class="gctr"><span class="gtip gfx">匯出成 Excel 檔</span><u>匯出 ⓘ</u></span>',
  popover: GLB('驗收單') + GLP('7em') + '<span class="ganc"><u>篩選 ▾</u><span class="gpop gcard gfx"><b>狀態</b><span class="gr2"><s class="gck y"></s>待驗收</span><span class="gr2"><s class="gck"></s>已結案</span><span class="gbtns"><u class="p">套用</u></span></span></span>',
  dropdown: GLB('請購單 PR-1103') + GLP('7em') + '<span class="ganc"><u>⋯ 更多</u><span class="gmenu gcard gfx"><i class="h">編輯</i><i>複製</i><i>匯出 PDF</i><hr><i class="d">刪除</i></span></span>',
  select: GLB('編輯任務') + GLP('9em') + '<span class="ganc"><small>狀態</small><span class="gin gsel">進行中<s>▾</s></span><span class="gmenu gcard gfx"><i>待處理</i><i class="h">進行中<s>✓</s></i><i>已完成</i></span></span>',
  combobox: GLB('選擇物料') + GLP('9em') + '<span class="ganc"><small>物料名稱</small><span class="gin gtyp">疫苗<s class="car"></s></span><span class="gmenu gcard gfx"><i class="h"><span><mark>疫苗</mark>冷藏櫃</span></i><i><span><mark>疫苗</mark>瓶蓋 20mm</span></i><i><span>動物用<mark>疫苗</mark>標籤</span></i></span></span>',
  drawer: GLB('☰　首頁') + GLP() + '<span class="gdim gfx"></span><span class="gdrw gfx"><b>選單</b><i class="h">首頁</i><i>請購</i><i>驗收</i><i>庫存</i><i>報表</i></span>',
  sheet: GLB('相簿') + GLP() + '<span class="gdim gfx"></span><span class="gsht gfx"><s class="ggr"></s><b>分享到</b><i>📋　複製連結</i><i>✉️　寄送 Email</i><i>💾　存到裝置</i></span>',
  tabs: GLB('批次 B-2611') + '<span class="gtabs"><i>概況</i><i>明細</i><i>紀錄</i><s class="gind"></s></span><span class="gp gp1"><span class="gstat"><span><small>數量</small><b>1,200</b></span><span><small>良率</small><b>98%</b></span></span></span><span class="gp gp2">' + GROW(() => '<i></i><i class="w"></i>', 3) + '</span>',
  pagination: GLB('採購單') + '<span class="glst">' + GROW(() => '<i></i><i class="w"></i>', 4) + '</span><span class="gpgn"><u>‹</u><u class="c1">1</u><u class="c2">2</u><u>3</u><u class="e">…</u><u>9</u><u>›</u></span>',
  accordion: GLB('常見問題') + '<span class="gacc"><span class="gai"><span class="gah">怎麼新增請購？<s class="chev">▾</s></span><span class="gab"><i></i><i></i><i class="w"></i></span></span><span class="gai"><span class="gah">誰可以簽核？<s class="chev x">▾</s></span></span><span class="gai"><span class="gah">忘記密碼<s class="chev x">▾</s></span></span></span>',
  breadcrumbs: GLB('請購單') + '<span class="gbc"><span>首頁</span><s>›</s><span>請購</span><s>›</s><b>PR-1103</b></span>' + GLP('6.6em'),
  toast: GLB('編輯任務') + GLP() + '<span class="gtst gfx"><s>✓</s>已儲存<u class="lk">復原</u></span>',
  alert: GLB('驗收') + '<span class="galt gfx"><s>⚠</s><span>有 3 筆驗收逾期未處理</span><s class="x">✕</s></span>' + GLP('7.8em'),
  badge: GLB('首頁') + `<span class="gbdg"><span class="gico">${icon('bell')}<s class="gnum gfx">3</s><small>通知</small></span><span class="gico">${icon('chat')}<s class="gnum gfx">12</s><small>訊息</small></span><span class="gico">${icon('inbox')}<s class="gdot gfx"></s><small>收件匣</small></span></span>`,
  tag: GLB('請購清單') + '<span class="glst">' + '<span class="grow"><b>PR-1103</b><s class="gtag t1">急件</s><s class="gtag t2 gfx">待驗收</s></span><span class="grow"><b>PR-1098</b><s class="gtag t2">待驗收</s></span><span class="grow"><b>PR-1090</b><s class="gtag t3">已結案</s></span>' + '</span>',
  switch: GLB('通知設定') + '<span class="glst">' + ['Email 通知', '推播通知', '每週摘要'].map((t, i) => `<span class="grow"><b>${t}</b><s class="gsw${i === 2 ? ' n' : ''}${i === 0 ? ' t' : ''}"></s></span>`).join('') + '</span>',
  checkbox: GLB('篩選條件') + '<span class="glst">' + ['急件', '待驗收', '已結案'].map((t, i) => `<span class="grow"><s class="gck${i === 0 ? ' y' : ''}${i === 1 ? ' t' : ''}"></s><b>${t}</b></span>`).join('') + '</span>',
  radio: GLB('報表頻率') + '<span class="glst">' + ['每日', '每週', '每月'].map((t, i) => `<span class="grow"><s class="grd${i === 1 ? ' y' : ''}${i === 2 ? ' t' : ''}"></s><b>${t}</b></span>`).join('') + '</span>',
  slider: GLB('冷藏櫃設定') + '<span class="gsld"><span class="gsr"><b>目標溫度</b><span><s class="v1">5 °C</s><s class="v2">3 °C</s></span></span><span class="gtr"><s class="gfl"></s><s class="gth"></s></span><span class="gsr mm"><small>2 °C</small><small>8 °C</small></span></span>',
  spinner: GLB('庫存') + '<span class="gspn"><s class="grg"></s><small>載入中…</small></span>',
  progress: GLB('上傳附件') + '<span class="gsld gprg"><span class="gsr"><b>驗收單.pdf</b><span><s class="v1">72%</s><s class="v2">完成 ✓</s></span></span><span class="gtr"><s class="gfl"></s></span><small>剩餘約 4 秒</small></span>',
  skeleton: GLB('動態') + '<span class="glst gsk gfx">' + GROW(() => '<s class="av"></s><span class="tx"><i></i><i class="w"></i></span>', 3) + '</span><span class="glst grl">' + [['王', '王小明送出請購單'], ['林', '林組長已簽核'], ['陳', '陳專員完成驗收']].map(([a, t]) => `<span class="grow"><s class="av">${a}</s><span class="tx"><b>${t}</b><small>2 分鐘前</small></span></span>`).join('') + '</span>',
  empty: GLB('請購單') + `<span class="gemp"><span class="gbox">${icon('inbox')}</span><b>還沒有任何請購單</b><small>建立第一張後會出現在這裡</small><u class="p">＋ 新增請購</u></span>`,
  stepper: GLB('新增請購') + '<span class="gstp">' + [['1', '填寫', 'd'], ['2', '簽核', 'c'], ['3', '完成', '']].map(([n, t, c]) => `<span class="gst ${c}"><s class="gcr">${n}</s>${t}</span>`).join('') + '</span><span class="gform gcard"><span class="gin">簽核人</span><span class="gbtns"><u>上一步</u><u class="p">下一步</u></span></span>'
};
function glHTML(k, name){
  return `<div class="glx gl-${k}" data-gl="${k}" role="img" aria-label="${esc(name)}示範，點一下切換">${GL[k]}</div>`;
}
/* GL-27 到 GL-63：component.gallery 其餘 37 個元件。靜態元件點一下會框出該元件（.gtg）。 */
const GLSTAR = (n, t) => Array.from({length: 5}, (_, i) => `<s class="${i < n ? 'y' : ''}${t && i >= 2 && i < n ? ' t' : ''}">★</s>`).join('');
const GLCAL = () => '日一二三四五六'.split('').map(d => `<i class="wd">${d}</i>`).join('') + Array.from({length: 21}, (_, i) => `<i class="${i === 13 ? 'sel' : ''}">${i + 1}</i>`).join('');
Object.assign(GL, {
  avatar: GLB('專案成員') + '<span class="gbx"><span class="grw"><s class="gav ph lg"><s class="gon gfx"></s></s><s class="gav lg">王</s><s class="gav lg c2">林</s><span class="gavg"><s class="gav">陳</s><s class="gav c2">李</s><s class="gav c3">+3</s></span></span><span class="grow"><s class="gav ph"></s><span class="tx"><b>王小明</b><small>品保部・簽核人</small></span></span></span>',
  button: GLB('送出請購') + '<span class="gbx"><span class="grw"><u class="p gtg"><s class="v1">送出</s><s class="v2"><s class="gmini"></s>送出中…</s></u><u>儲存草稿</u><u class="tb">取消</u></span><span class="grw"><u class="dgr">刪除</u><u class="p ds">停用</u></span><small>主要／次要／文字／危險／停用</small></span>',
  buttongroup: GLB('公告編輯') + '<span class="gbx"><span class="gbg"><u class="on t">B</u><u><i>I</i></u><u>U</u></span><span class="gbg"><u class="on">靠左</u><u>置中</u><u>靠右</u></span><span class="gpg" style="position:static"><i></i><i></i><i></i></span></span>',
  card: GLB('設備') + '<span class="gbx grw2"><span class="gcd gcard gtg"><s class="gimg"></s><span class="gcb"><b>疫苗冷藏櫃</b><small>庫存 12 台・2–8 °C</small><u class="p">查看</u></span></span><span class="gcd gcard"><s class="gimg b"></s><span class="gcb"><b>瓶蓋 20mm</b><small>庫存 3,000 個</small><u>查看</u></span></span></span>',
  carousel: GLB('最新消息') + '<span class="gcar"><span class="gtrk"><span class="gsl s1"><b>11 月盤點公告</b></span><span class="gsl s2"><b>新供應商上線</b></span><span class="gsl s3"><b>系統維護通知</b></span></span><u class="ga l">‹</u><u class="ga r">›</u><span class="gdts"><s></s><s></s><s></s></span></span>',
  colorpicker: GLB('標籤顏色') + '<span class="gbx"><span class="gsw2">' + ['#1E6884', '#2FBF71', '#E0A100', '#E5484D', '#8E5CF7', '#3B82F6', '#6B6B72', '#F472B6'].map((c, i) => `<s style="--c:${c}" class="${i === 0 ? 'sel' : ''}${i === 3 ? 't' : ''}"></s>`).join('') + '</span><s class="ghue"></s><span class="grw"><s class="gchip"></s><span class="gin ghex"><s class="v1">#1E6884</s><s class="v2">#E5484D</s></span></span></span>',
  dateinput: GLB('供應商資料') + '<span class="gbx"><b>證照到期日</b><span class="grw gdi gtg"><span class="gin"><small>年</small><b>2027</b></span><span class="gin"><small>月</small><b>03</b></span><span class="gin"><small>日</small><b>31</b></span></span><small>格式：西元年／月／日</small></span>',
  datepicker: GLB('驗收') + GLP('9.5em') + '<span class="ganc"><small>驗收日期</small><span class="gin gsel">2026/11/14<s>📅</s></span><span class="gcal gcard gfx"><span class="gch"><s>‹</s><b>2026 年 11 月</b><s>›</s></span><span class="ggrid">' + GLCAL() + '</span></span></span>',
  fieldset: GLB('新增供應商') + '<span class="gbx gfsw"><span class="gfs gtg"><s class="glg">聯絡資訊</s><span class="gin">聯絡人</span><span class="gin">電話</span></span><span class="gfs"><s class="glg">付款條件</s><span class="gin">月結 30 天</span></span></span>',
  file: GLB('驗收單附件') + '<span class="gbx"><span class="grow gfile gtg"><s class="gft">PDF</s><span class="tx"><b>驗收單_PR-1103.pdf</b><small>248 KB・11/14 上傳</small></span><u>下載</u></span><span class="grow gfile"><s class="gft x">XLS</s><span class="tx"><b>進貨明細_11月.xlsx</b><small>36 KB・11/12 上傳</small></span><u>下載</u></span></span>',
  fileupload: GLB('上傳附件') + '<span class="gbx"><span class="gdz"><s class="gup">⬆</s><b>拖曳檔案到這裡</b><small>或 <s class="lk">點擊選擇檔案</s>・PDF、JPG 10 MB 內</small></span><span class="grow gfile gfo"><s class="gft">PDF</s><span class="tx"><b>出貨單.pdf</b><s class="gtr"><s class="gfl" style="--v:100%"></s></s></span><s class="ok">✓</s></span></span>',
  footer: GLB('首頁') + GLP() + '<span class="gft2 gtg"><span class="grw"><s>關於我們</s><s>隱私權政策</s><s>聯絡客服</s></span><small>© 2026 公司名稱　版權所有</small></span>',
  form: GLB('新增請購') + '<span class="gbx gform2 gtg"><span><small>品名 *</small><span class="gin">疫苗冷藏櫃</span></span><span class="grw"><span class="f1"><small>數量</small><span class="gin">2</span></span><span class="f1"><small>單位</small><span class="gin">台</span></span></span><span class="gbtns"><u>取消</u><u class="p">送出</u></span></span>',
  header: '<span class="ghdr gtg"><b class="glogo">◆ ERP</b><span class="gnav"><s class="on">首頁</s><s>請購</s><s>庫存</s></span><s class="gav sm">王</s></span>' + GLP('4.6em'),
  heading: GLB('文件') + '<span class="gbx ghd"><b class="h1 gtg">請購作業說明</b><i class="ln"></i><i class="ln s"></i><b class="h2 gtg">一、適用範圍</b><i class="ln"></i><i class="ln s"></i><b class="h3">1.1 名詞定義</b><i class="ln s"></i></span>',
  hero: GLB('首頁') + '<span class="ghero gtg"><small>2026 年度</small><b>更快完成請購與驗收</b><span>一個系統管理從請購到入庫</span><u>開始使用</u></span>' + GLP('14.4em'),
  icon: GLB('功能') + '<span class="gicg">' + ['home', 'search', 'bell', 'chat', 'user', 'folder', 'chart', 'bookmark'].map(k => `<span><s class="gi">${icon(k)}</s><small>${L[k]}</small></span>`).join('') + '</span>',
  image: GLB('設備照片') + '<span class="gbx"><span class="gpic gtg"><s class="sun"></s><s class="m1"></s><s class="m2"></s></span><small>圖 1　冷藏櫃安裝位置（點圖可放大）</small></span>',
  label: GLB('新增供應商') + '<span class="gbx"><span><b class="glb gtg">供應商名稱 <s class="rq">*</s></b><span class="gin">例：台灣冷鏈股份有限公司</span><small class="hl">需與發票抬頭一致</small></span><span><b class="glb">統一編號</b><span class="gin">8 碼數字</span></span></span>',
  link: GLB('說明') + '<span class="gbx glk"><span>請先閱讀<s class="a gtg">請購作業規範</s>，再填寫申請單。</span><span>相關表單可在<s class="a">文件中心</s>下載，或參考<s class="a">外部法規網站 ↗</s>。</span><span><s class="a v">已看過的連結會變色</s></span></span>',
  list: GLB('注意事項') + '<span class="gbx grw2"><span class="gul gtg"><b>無序清單</b><s>戴手套</s><s>穿無塵衣</s><s>消毒雙手</s></span><span class="gol"><b>有序清單</b><s>填寫請購</s><s>主管簽核</s><s>採購下單</s></span></span>',
  navigation: '<span class="gsn"><b>◆ ERP</b>' + ['首頁', '請購', '驗收', '庫存', '報表'].map((t, i) => `<i class="${i === 1 ? 'on' : ''}${i === 3 ? 't' : ''}">${t}</i>`).join('') + '</span><span class="gmain"><b class="v1">請購</b><b class="v2">庫存</b><i></i><i></i><i></i><i></i><i></i></span>',
  quote: GLB('品質方針') + '<span class="gbx"><span class="gq gtg"><s class="qm">“</s><span>品質不是檢驗出來的，是製造出來的。</span><small>— 品質部　年度方針</small></span></span>' + GLP('11.6em'),
  rating: GLB('供應商評核') + '<span class="gbx">' + [['交期', 4, 1], ['品質', 5, 0], ['服務', 3, 0]].map(([t, n, g]) => `<span class="grow"><b>${t}</b><span class="gst5">${GLSTAR(n, g)}</span></span>`).join('') + '</span>',
  richtext: GLB('公告編輯') + '<span class="gbx"><span class="grte gtg"><span class="gtb"><s class="on">B</s><s><i>I</i></s><s>U</s><s>≡</s><s>🔗</s></span><span class="gtxt"><b>盤點通知</b><span>11/20 下午<b>暫停出入庫</b>，請各單位<i>提前</i>領料。</span><span>• 冷藏品優先盤點</span></span></span></span>',
  searchinput: GLB('物料主檔') + '<span class="gbx"><span class="gin gsrch"><s class="mg">' + icon('search') + '</s><s class="v1 tq">冷藏</s><s class="v2 ph">搜尋品名、料號…</s><s class="x v1">✕</s></span><small class="v1">找到 2 筆符合「冷藏」</small><span class="glst2 v1"><span class="grow"><b>疫苗<mark>冷藏</mark>櫃</b></span><span class="grow"><b><mark>冷藏</mark>運輸箱</b></span></span></span>',
  segmented: GLB('出貨統計') + '<span class="gbx"><span class="gseg"><s class="gsi"></s><i>日</i><i>週</i><i>月</i></span><span class="gbars">' + [[40, 70], [65, 55], [30, 85], [80, 60], [55, 90], [70, 45], [45, 75]].map(([b, c]) => `<s style="--b:${b}%;--c:${c}%"></s>`).join('') + '</span></span>',
  separator: GLB('登入') + '<span class="gbx gsep"><span class="gin">帳號</span><span class="gin">密碼</span><u class="p">登入</u><span class="gor gtg"><s>或</s></span><u>使用公司帳號登入</u></span>',
  skiplink: '<span class="ghdr"><b class="glogo">◆ ERP</b><span class="gnav"><s>首頁</s><s>請購</s><s>庫存</s><s>報表</s></span></span><span class="gskip gfx">⇥ 跳到主要內容</span>' + GLP('4.6em'),
  stack: GLB('版面') + '<span class="gbx gstk"><span class="gbk">標題</span><s class="gsp gfx">12px</s><span class="gbk">說明文字</span><s class="gsp gfx">12px</s><span class="gbk">輸入框</span><s class="gsp gfx">12px</s><span class="gbk">按鈕</span></span>',
  counter: GLB('領料單') + '<span class="gbx"><span class="grow"><s class="gthumb"></s><span class="tx"><b>手套 M 號</b><small>單價 $120</small></span><span class="gcnt"><u>−</u><b><s class="v1">3</s><s class="v2">4</s></b><u>＋</u></span></span><span class="grow"><b>小計</b><b class="r"><s class="v1">$360</s><s class="v2">$480</s></b></span></span>',
  table: GLB('請購單') + '<span class="gtbl gtg">' + ['單號 ▾', '品名', '數量', '狀態'].map(h => `<s class="th">${h}</s>`).join('') + [['PR-1103', '冷藏櫃', '2', '<s class="gtag t2">待驗收</s>'], ['PR-1098', '瓶蓋', '3,000', '<s class="gtag t1">急件</s>'], ['PR-1090', '標籤', '500', '<s class="gtag t3">已結案</s>'], ['PR-1088', '手套', '200', '<s class="gtag t3">已結案</s>']].map((r, i) => r.map((c, j) => `<s class="td${j === 2 ? ' n' : ''}${i === 1 ? ' r2' : ''}">${c}</s>`).join('')).join('') + '</span>',
  textinput: GLB('新增供應商') + '<span class="gbx"><span><small>聯絡人</small><span class="gin gti">王小明<s class="car"></s></span><small class="hl">請填中文全名</small></span><span><small>Email</small><span class="gin gerr">wang@</span><small class="err">Email 格式不正確</small></span></span>',
  textarea: GLB('偏差描述') + '<span class="gbx"><small>事件描述</small><span class="gin gta gtg">11/14 上午冷藏櫃 B2 溫度記錄 9.1 °C，超出 2–8 °C 範圍約 25 分鐘，已移置備用櫃。<s class="grz">◢</s></span><small class="cnt">48 / 500</small></span>',
  treeview: GLB('文件分類') + '<span class="gbx gtree"><i style="--l:0"><s class="ch">▾</s>📁 SOP</i><i style="--l:1" class="sel"><s class="ch t">▾</s>📁 品保</i><span class="gsub"><i style="--l:2"><s class="ch"></s>📄 QA-SOP-001 偏差處理</i><i style="--l:2"><s class="ch"></s>📄 QA-SOP-002 變更管制</i></span><i style="--l:1"><s class="ch x">▾</s>📁 生產</i><i style="--l:1"><s class="ch x">▾</s>📁 倉儲</i></span>',
  video: '<span class="gvid"><span class="gscr"><s class="gpl v1">▶</s></span><span class="gctl"><s class="v1">▶</s><s class="v2">❚❚</s><s class="gtr"><s class="gfl"></s></s><small>0:42 / 3:10</small><s>⛶</s></span></span><span class="gcap"><b>無塵衣穿著示範</b><small>教育訓練・3 分 10 秒</small></span>',
  visuallyhidden: GLB('請購清單') + '<span class="gbx"><span class="grow"><b>PR-1103 冷藏櫃</b><u class="gib">🗑</u></span><span class="grow"><b>PR-1098 瓶蓋</b><u class="gib2">🗑</u></span><span class="gsr2 gfo"><small>螢幕閱讀器念的是（畫面上看不到）：</small><b>「刪除 PR-1103 冷藏櫃」</b></span></span>'
});
/* SW 系列：同一個「檢視方式」下拉選單的六種展開動畫。看得到時自動示範，點一下自己操作 */
const SW_OPTS = [['grid', '格狀'], ['list', '清單'], ['board', '看板'], ['cal', '日曆']];
const swBtn = i => { const [k, l] = SW_OPTS[i]; return `<span class="ico c-${k}">${icon(k)}</span><b>${l}</b><span class="chev">›</span>`; };
function swView(k){
  const c = n => '<i></i>'.repeat(n);
  const body = k === 'grid' ? `<span class="vg">${c(6)}</span>` : k === 'list' ? `<span class="vl">${c(4)}</span>`
    : k === 'board' ? `<span class="vb"><span>${c(3)}</span><span>${c(2)}</span><span>${c(3)}</span></span>` : `<span class="vc">${c(28)}</span>`;
  return `<span class="vh">專案</span>${body}`;
}
function swHTML(n){
  return `<div class="swx sw-${n}" data-sw="${n}" data-sel="2" role="group" aria-label="下拉選單動效示範，點一下打開">
    <span class="sleft"><span class="slab">檢視方式</span><span class="sbtn">${swBtn(2)}</span><span class="scnt">12 個專案</span></span>
    <span class="spanel"><span class="sview">${swView('board')}</span><span class="smenu"></span></span></div>`;
}
const swRows = m => [...m.querySelectorAll('.si')];
const SW_FX = {
  '1': {                                                     /* 錨點彈出 */
    open: async (el, m, p, show) => { show(); await anim(m, [{transform: 'scale(.3,.25)', opacity: 0}, {transform: 'scale(1.04)', opacity: 1, offset: .7}, {transform: 'scale(1)', opacity: 1}], {duration: 380}); },
    close: async (el, m) => { await anim(m, [{transform: 'scale(1)', opacity: 1}, {transform: 'scale(.3,.25)', opacity: 0}], {duration: 220, easing: 'cubic-bezier(.5,0,.8,.4)'}); }
  },
  '2': {                                                     /* 翻面 */
    open: async (el, m, p, show) => {
      await anim(p, [{transform: 'rotateY(0deg)'}, {transform: 'rotateY(90deg)'}], {duration: 180, easing: 'cubic-bezier(.5,0,1,.6)'});
      show(); await anim(p, [{transform: 'rotateY(-90deg)'}, {transform: 'rotateY(0deg)'}], {duration: 260, easing: 'cubic-bezier(.2,.8,.3,1.2)'});
    },
    close: async (el, m, p, hide) => {
      await anim(p, [{transform: 'rotateY(0deg)'}, {transform: 'rotateY(-90deg)'}], {duration: 180, easing: 'cubic-bezier(.5,0,1,.6)'});
      hide(); await anim(p, [{transform: 'rotateY(90deg)'}, {transform: 'rotateY(0deg)'}], {duration: 260, easing: 'cubic-bezier(.2,.8,.3,1.2)'});
    }
  },
  '3': {                                                     /* 發牌 */
    open: async (el, m, p, show) => {
      show(); const b = el.querySelector('.sbtn').getBoundingClientRect();
      anim(m, [{opacity: 0}, {opacity: 1}], {duration: 200});
      await Promise.all(swRows(m).map((r, i) => { const q = r.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (q.left + q.width / 2), dy = b.top + b.height / 2 - (q.top + q.height / 2);
        return anim(r, [{transform: `translate(${dx}px,${dy}px) rotate(-14deg) scale(.55)`, opacity: 0}, {transform: 'translate(0,0) rotate(2deg) scale(1)', opacity: 1, offset: .8}, {transform: 'none', opacity: 1}], {duration: 440, delay: i * 70, fill: 'both'}); }));
    },
    close: async (el, m, p, hide, pick) => {
      const b = el.querySelector('.sbtn').getBoundingClientRect();
      await Promise.all(swRows(m).map((r, i) => { const q = r.getBoundingClientRect();
        if (i !== pick) return anim(r, [{transform: 'none', opacity: 1}, {transform: 'translateY(1.6em) rotate(7deg)', opacity: 0}], {duration: 260, delay: i * 35, easing: 'cubic-bezier(.5,0,.8,.4)'});
        const dx = b.left + b.width / 2 - (q.left + q.width / 2), dy = b.top + b.height / 2 - (q.top + q.height / 2);
        return anim(r, [{transform: 'none', opacity: 1}, {transform: `translate(${dx}px,${dy}px) rotate(-10deg) scale(.5)`, opacity: 0}], {duration: 420, easing: 'cubic-bezier(.5,0,.3,1)'}); }));
      await anim(m, [{opacity: 1}, {opacity: 0}], {duration: 120});
    }
  },
  '4': {                                                     /* 滾筒 */
    open: async (el, m, p, show) => {
      show(); anim(m, [{opacity: 0}, {opacity: 1}], {duration: 180});
      await Promise.all(swRows(m).map((r, i) => anim(r, [{transform: 'rotateX(90deg) translateY(-40%)', opacity: 0}, {transform: 'rotateX(0deg) translateY(0)', opacity: 1}], {duration: 380, delay: i * 60, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both'})));
    },
    close: async (el, m) => {
      await Promise.all(swRows(m).map((r, i) => anim(r, [{transform: 'rotateX(0deg) translateY(0)', opacity: 1}, {transform: 'rotateX(-90deg) translateY(40%)', opacity: 0}], {duration: 300, delay: i * 50, easing: 'cubic-bezier(.5,0,.8,.4)'})));
      await anim(m, [{opacity: 1}, {opacity: 0}], {duration: 120});
    }
  },
  '5': {                                                     /* 描邊 */
    open: async (el, m, p, show) => {
      const w = p.clientWidth, h = p.clientHeight, rx = parseFloat(getComputedStyle(p).borderTopLeftRadius) || 8, id = 'sg' + Math.random().toString(36).slice(2, 8);
      const ol = mk(p, 'sol', `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a26bff"/><stop offset="1" stop-color="#3fd5ff"/></linearGradient></defs><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${rx}" pathLength="100" stroke="url(#${id})"/></svg>`);
      show();
      swRows(m).forEach(r => { r.style.clipPath = 'inset(0 100% 0 0)'; });
      await anim(ol.querySelector('rect'), [{strokeDashoffset: 100}, {strokeDashoffset: 0}], {duration: 460, easing: 'cubic-bezier(.4,0,.2,1)'});
      anim(m, [{backgroundColor: 'rgba(37,32,54,0)'}, {backgroundColor: 'rgba(37,32,54,1)'}], {duration: 220});
      await Promise.all(swRows(m).map((r, i) => anim(r, [{clipPath: 'inset(0 100% 0 0)'}, {clipPath: 'inset(0 0% 0 0)'}], {duration: 260, delay: i * 60, fill: 'both'})));
    },
    close: async (el, m, p) => {
      await Promise.all(swRows(m).reverse().map((r, i) => anim(r, [{clipPath: 'inset(0 0% 0 0)'}, {clipPath: 'inset(0 0 0 100%)'}], {duration: 200, delay: i * 40})));
      anim(m, [{backgroundColor: 'rgba(37,32,54,1)'}, {backgroundColor: 'rgba(37,32,54,0)'}], {duration: 180});
      const rect = p.querySelector('.sol rect');
      if (rect) await anim(rect, [{strokeDashoffset: 0}, {strokeDashoffset: -100}], {duration: 380, easing: 'cubic-bezier(.4,0,.2,1)'});
    }
  },
  '6': {                                                     /* 方塊拼裝 */
    open: async (el, m, p, show) => {
      const tl = mk(p, 'stile', '<i></i>'.repeat(30)), cells = [...tl.children];
      swRows(m).forEach(r => { r.style.opacity = 0; }); show();
      await Promise.all(cells.map((c, k) => anim(c, [{transform: 'scale(0)'}, {transform: 'scale(1.08)', offset: .7}, {transform: 'scale(1)'}], {duration: 260, delay: ((k % 6) + Math.floor(k / 6)) * 28, fill: 'both'})));
      await Promise.all(swRows(m).map((r, i) => anim(r, [{opacity: 0, transform: 'translateY(.4em)'}, {opacity: 1, transform: 'none'}], {duration: 220, delay: i * 40, fill: 'both'})));
    },
    close: async (el, m, p, hide) => {
      await anim(m, [{opacity: 1}, {opacity: 0}], {duration: 140}); hide();
      const tl = p.querySelector('.stile'); if (!tl) return;
      await Promise.all([...tl.children].map((c, k) => anim(c, [{transform: 'scale(1)'}, {transform: 'scale(0) rotate(30deg)'}], {duration: 240, delay: ((k % 6) + Math.floor(k / 6)) * 26, easing: 'cubic-bezier(.5,0,.8,.4)'})));
    }
  }
};
async function swOpen(el){
  if (el._busy || el.classList.contains('open')) return; el._busy = true;
  const m = el.querySelector('.smenu'), p = el.querySelector('.spanel'), sel = +el.dataset.sel;
  m.innerHTML = SW_OPTS.map(([k, l], i) => `<span class="si${i === sel ? ' cur' : ''}" data-i="${i}"><span class="ico c-${k}">${icon(k)}</span><b>${l}</b><em>✓</em></span>`).join('');
  try { await SW_FX[el.dataset.sw].open(el, m, p, () => el.classList.add('open')); el.classList.add('open'); }
  finally { el._busy = false; }
}
async function swPick(el, i){
  if (el._busy || !el.classList.contains('open')) return; el._busy = true;
  const m = el.querySelector('.smenu'), p = el.querySelector('.spanel');
  swRows(m).forEach((r, j) => r.classList.toggle('cur', j === i));
  await sleep(150);
  el.dataset.sel = i; el.querySelector('.sview').innerHTML = swView(SW_OPTS[i][0]);
  try { await SW_FX[el.dataset.sw].close(el, m, p, () => el.classList.remove('open'), i); }
  finally {
    el.classList.remove('open'); el.querySelector('.sbtn').innerHTML = swBtn(i);
    m.getAnimations({subtree: true}).forEach(a => a.cancel()); p.getAnimations().forEach(a => a.cancel());
    p.querySelectorAll('.sol,.stile').forEach(x => x.remove()); m.innerHTML = ''; el._busy = false;
  }
}
function swTap(el, ev){
  el._user = performance.now();
  if (!el.classList.contains('open')) { swOpen(el); return; }
  const r = ev.target.closest('.si');
  swPick(el, r ? +r.dataset.i : +el.dataset.sel);
}
let swIO = null;
function initSws(){
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!swIO && 'IntersectionObserver' in window) swIO = new IntersectionObserver(es => es.forEach(en => { en.target._vis = en.isIntersecting; }), {threshold: .6});
  document.querySelectorAll('.swx:not([data-on])').forEach((el, i) => {
    el.dataset.on = '1'; if (swIO) swIO.observe(el);
    if (still) return;
    const idle = () => performance.now() - (el._user || -1e9) > 9000;
    const tick = async () => {
      if (!el.isConnected) { if (swIO) swIO.unobserve(el); return; }
      if (el._vis && !document.hidden && !el._busy && !el.classList.contains('open') && idle()) {
        await swOpen(el); await sleep(1300);
        if (el.isConnected && idle()) await swPick(el, (+el.dataset.sel + 1) % 4);
      }
      setTimeout(tick, 3800);
    };
    setTimeout(tick, 900 + i * 600);
  });
}
/* IC 系列：會動的小圖示（純 SVG＋CSS），一款六個，點一下重播 */
const IC_SVG = {"scan": ["t", "<path d=\"M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3\"/><path class=\"k-scan\" d=\"M6.5 12h11\"/>"], "broadcast": ["", "<circle cx=\"12\" cy=\"12\" r=\"1.7\" class=\"f\"/><path class=\"k-b1\" d=\"M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8\"/><path class=\"k-b2\" d=\"M5.7 5.7a8.9 8.9 0 0 0 0 12.6M18.3 5.7a8.9 8.9 0 0 1 0 12.6\"/>"], "listen": ["", "<rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><rect class=\"k-lvl f\" x=\"10.6\" y=\"7\" width=\"2.8\" height=\"5.4\" rx=\"1.4\"/><path d=\"M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21\"/>"], "wifi-search": ["", "<path class=\"k-w3\" d=\"M2.8 9a13.5 13.5 0 0 1 18.4 0\"/><path class=\"k-w2\" d=\"M5.8 12.4a9 9 0 0 1 12.4 0\"/><path class=\"k-w1\" d=\"M8.8 15.7a4.6 4.6 0 0 1 6.4 0\"/><circle cx=\"12\" cy=\"19\" r=\"1.2\" class=\"f\"/>"], "radar": ["", "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"4.5\" class=\"dim\"/><g class=\"k-spin\"><path d=\"M12 12L17.8 6.2\"/></g><circle class=\"k-blip f t\" cx=\"15.5\" cy=\"14.5\" r=\"1.1\"/>"], "notify": ["", "<path d=\"M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\"/><path d=\"M8 10h6M8 14h8\"/><circle class=\"k-dot f\" cx=\"19\" cy=\"5\" r=\"2.3\"/>"], "spark": ["", "<path class=\"k-tw\" d=\"M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z\"/>"], "layers": ["", "<path class=\"k-up\" d=\"M12 4l8 4-8 4-8-4z\"/><path d=\"M4 12l8 4 8-4M4 16l8 4 8-4\"/>"], "morph": ["", "<g class=\"k-rot\"><rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"><animate attributeName=\"rx\" values=\"2;6;2\" dur=\"2.6s\" repeatCount=\"indefinite\"/></rect></g>"], "facets": ["", "<path class=\"dim\" d=\"M8 5v14l11-7z\"/><path class=\"k-ants\" d=\"M8 5v14l11-7zM8 12h5.5\"/>"], "prism": ["", "<path d=\"M12 6.5l6 10H6z\"/><path d=\"M2 12.5h6.6\"/><path class=\"k-ray r1\" d=\"M15.6 11.5l5.4-2.2\"/><path class=\"k-ray r2\" d=\"M16.2 13l5.6.2\"/><path class=\"k-ray r3\" d=\"M15.8 14.5l5.2 2.5\"/>"], "wave": ["", "<circle cx=\"12\" cy=\"12\" r=\"1.6\" class=\"f\"/><circle class=\"k-ring\" cx=\"12\" cy=\"12\" r=\"9\"/><circle class=\"k-ring d2\" cx=\"12\" cy=\"12\" r=\"9\"/>"], "loading-orbit": ["t", "<circle cx=\"12\" cy=\"12\" r=\"8\" class=\"dim\"/><circle class=\"k-spin\" cx=\"12\" cy=\"12\" r=\"8\" pathLength=\"100\" stroke-dasharray=\"26 74\"/>"], "connecting": ["", "<circle cx=\"12\" cy=\"12\" r=\"7.5\" class=\"dim\" stroke-dasharray=\"2 2.4\"/><circle cx=\"12\" cy=\"12\" r=\"2.6\"/><g class=\"k-spin slow\"><circle cx=\"4.5\" cy=\"12\" r=\"1.5\" class=\"f\"/><circle cx=\"19.5\" cy=\"12\" r=\"1.5\" class=\"f\"/></g>"], "sync": ["", "<g class=\"k-sync\"><path d=\"M19 8.5a7.5 7.5 0 0 0-13.3-1.8M5 15.5a7.5 7.5 0 0 0 13.3 1.8\"/><path d=\"M19.2 4v4.6h-4.6M4.8 20v-4.6h4.6\"/></g>"], "infinity": ["", "<path class=\"dim\" d=\"M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4s3.6-4 5.5-4a4 4 0 0 1 0 8c-1.9 0-3.5-1.4-5.5-4z\"/><path class=\"k-trace\" pathLength=\"100\" d=\"M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4s3.6-4 5.5-4a4 4 0 0 1 0 8c-1.9 0-3.5-1.4-5.5-4z\"/>"], "gear": ["", "<g class=\"k-spin slow\"><path d=\"M18.83 10.47 L21.12 10.81 L21.12 13.19 L18.83 13.53 L17.91 15.75 L19.29 17.61 L17.61 19.29 L15.75 17.91 L13.53 18.83 L13.19 21.12 L10.81 21.12 L10.47 18.83 L8.25 17.91 L6.39 19.29 L4.71 17.61 L6.09 15.75 L5.17 13.53 L2.88 13.19 L2.88 10.81 L5.17 10.47 L6.09 8.25 L4.71 6.39 L6.39 4.71 L8.25 6.09 L10.47 5.17 L10.81 2.88 L13.19 2.88 L13.53 5.17 L15.75 6.09 L17.61 4.71 L19.29 6.39 L17.91 8.25Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></g>"], "compass": ["", "<circle cx=\"12\" cy=\"12\" r=\"9\"/><g class=\"k-needle\"><path class=\"f\" d=\"M12 5.8l2 6.2h-4z\"/><path d=\"M12 18.2l2-6.2h-4z\"/></g>"], "steps": ["t", "<path class=\"dim\" d=\"M7.4 12h2.2M14.4 12h2.2\"/><circle class=\"k-st s1\" cx=\"5\" cy=\"12\" r=\"2.4\"/><circle class=\"k-st s2\" cx=\"12\" cy=\"12\" r=\"2.4\"/><circle class=\"k-st s3\" cx=\"19\" cy=\"12\" r=\"2.4\"/>"], "verify": ["", "<path d=\"M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z\"/><path class=\"k-draw\" pathLength=\"100\" d=\"M8.4 12.2l2.5 2.5 4.8-5\"/>"], "upload": ["", "<path d=\"M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3\"/><g class=\"k-upl\"><path d=\"M12 15V4M7.5 8.5L12 4l4.5 4.5\"/></g>"], "download": ["", "<path d=\"M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3\"/><g class=\"k-dnl\"><path d=\"M12 3.5v11M7.5 10L12 14.5l4.5-4.5\"/></g>"], "percent-ring": ["", "<circle cx=\"12\" cy=\"12\" r=\"8\" class=\"dim\"/><circle class=\"k-fill\" cx=\"12\" cy=\"12\" r=\"8\" pathLength=\"100\"/><circle cx=\"12\" cy=\"12\" r=\"1.8\" class=\"f\"/>"], "retry": ["", "<g class=\"k-retry\"><path d=\"M19.5 12a7.5 7.5 0 1 1-2.2-5.3\"/><path d=\"M19.6 4.3v4.3h-4.3\"/></g>"], "stream": ["t", "<path class=\"k-type l1\" pathLength=\"100\" d=\"M4 7h14\"/><path class=\"k-type l2\" pathLength=\"100\" d=\"M4 12h9\"/><path class=\"k-type l3\" pathLength=\"100\" d=\"M4 17h16\"/>"], "prompt": ["", "<path d=\"M5 7l5 5-5 5\"/><path class=\"k-blink\" d=\"M12.5 17h7\"/>"], "translate": ["", "<g class=\"k-ba\"><rect x=\"3\" y=\"3\" width=\"10\" height=\"9\" rx=\"2\"/><path d=\"M6 6.5h4M6 9h3\"/></g><g class=\"k-bb\"><rect x=\"11\" y=\"11\" width=\"10\" height=\"10\" rx=\"2\"/><path d=\"M14 19l2-5 2 5M14.8 17.3h2.4\"/></g>"], "select": ["", "<rect class=\"k-hl\" x=\"4.5\" y=\"9.5\" width=\"15\" height=\"5\" rx=\"1\"/><path d=\"M5 7h14M5 12h14M5 17h9\"/>"], "search": ["", "<path class=\"dim k-lines\" d=\"M3.5 8h7M3.5 12h5M3.5 16h7\"/><g class=\"k-look\"><circle cx=\"13.5\" cy=\"11\" r=\"5\"/><path d=\"M17.2 14.7l3.8 3.8\"/></g>"], "summarize": ["", "<path class=\"k-sum a\" d=\"M4 7h16\"/><path class=\"k-sum b\" d=\"M4 12h16\"/><path class=\"k-sum c\" d=\"M4 17h16\"/>"], "flask": ["t", "<path d=\"M9.5 3h5M10.5 3v5.5L5.6 17.5A2 2 0 0 0 7.4 20.5h9.2a2 2 0 0 0 1.8-3L13.5 8.5V3\"/><path class=\"dim\" d=\"M7.6 15h8.8\"/><circle class=\"k-bub b1 f\" cx=\"10.5\" cy=\"17.5\" r=\".9\"/><circle class=\"k-bub b2 f\" cx=\"13.5\" cy=\"18\" r=\".7\"/><circle class=\"k-bub b3 f\" cx=\"12\" cy=\"17\" r=\".6\"/>"], "hourglass": ["", "<g class=\"k-flip\"><path d=\"M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9\"/><path class=\"f k-sand\" d=\"M9.6 19.6h4.8L12 16.8z\"/></g>"], "key": ["", "<g class=\"k-key\"><circle cx=\"7.5\" cy=\"12\" r=\"3.2\"/><path d=\"M10.7 12H20M17 12v3M20 12v2.5\"/></g>"], "mail-send": ["", "<g class=\"k-mail\"><rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M3.6 7.2l8.4 6 8.4-6\"/></g>"], "lamp": ["", "<path class=\"k-glow\" d=\"M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z\"/><path d=\"M9.5 18.5h5M10.5 21h3\"/><path class=\"k-rays\" d=\"M3 9.5h1.6M19.4 9.5H21M5.2 3.8l1.1 1.1M18.8 3.8l-1.1 1.1\"/>"], "bot": ["", "<rect x=\"5\" y=\"8\" width=\"14\" height=\"10.5\" rx=\"3\"/><path d=\"M12 8V5.6M3 12v3.2M21 12v3.2\"/><circle class=\"k-ant f\" cx=\"12\" cy=\"4.3\" r=\"1.2\"/><g class=\"k-eyes\"><circle class=\"f\" cx=\"9.5\" cy=\"13\" r=\"1.3\"/><circle class=\"f\" cx=\"14.5\" cy=\"13\" r=\"1.3\"/></g>"]};
const IC_NAME = {"scan": "掃描", "broadcast": "廣播", "listen": "收音", "wifi-search": "搜尋訊號", "radar": "雷達", "notify": "通知", "spark": "閃光", "layers": "圖層", "morph": "變形", "facets": "稜面", "prism": "稜鏡", "wave": "波紋", "loading-orbit": "載入中", "connecting": "連線中", "sync": "同步", "infinity": "循環", "gear": "設定", "compass": "方向", "steps": "步驟", "verify": "驗證", "upload": "上傳", "download": "下載", "percent-ring": "進度環", "retry": "重試", "stream": "串流輸出", "prompt": "指令", "translate": "翻譯", "select": "選取", "search": "搜尋", "summarize": "摘要", "flask": "實驗", "hourglass": "等待", "key": "金鑰", "mail-send": "寄出", "lamp": "靈感", "bot": "小助理"};
const IC_ROWS = [["scan", "broadcast", "listen", "wifi-search", "radar", "notify"], ["spark", "layers", "morph", "facets", "prism", "wave"], ["loading-orbit", "connecting", "sync", "infinity", "gear", "compass"], ["steps", "verify", "upload", "download", "percent-ring", "retry"], ["stream", "prompt", "translate", "select", "search", "summarize"], ["flask", "hourglass", "key", "mail-send", "lamp", "bot"]];
function icHTML(n){
  return `<div class="icx" role="group" aria-label="會動的小圖示示範，點一下重播">${IC_ROWS[n - 1].map(k => `<span class="ict" data-ic="${k}"><svg viewBox="0 0 24 24" class="${IC_SVG[k][0] === 't' ? 'tl' : ''}" aria-hidden="true">${IC_SVG[k][1]}</svg><small>${k}</small><em>${IC_NAME[k]}</em></span>`).join('')}</div>`;
}
function icReplay(t){ const svg = t.querySelector('svg'); const c = svg.cloneNode(true); svg.replaceWith(c); t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit'); }
function previewHTML(e){
  const uk = /^ui-(\d\d)$/.exec(e.preview || '');
  if (uk && UI_C[uk[1]]) return uiHTML(uk[1], esc(e.name));
  const ik = /^ic-0([1-6])$/.exec(e.preview || '');
  if (ik) return icHTML(+ik[1]);
  const sk = /^sw-0([1-6])$/.exec(e.preview || '');
  if (sk) return swHTML(sk[1]);
  const gk = /^gl-([a-z]+)$/.exec(e.preview || '');
  if (gk && GL[gk[1]]) return glHTML(gk[1], e.name);
  if (e.preview === 'mo-01') return moHTML();
  if (e.preview === 'cd-01') return cdHTML();
  if (e.preview === 'lp-01') return lpHTML();
  if (e.preview === 'sd-01') return sdHTML(esc(e.name));
  if (e.preview === 'fm-01') return fmHTML(esc(e.name));
  if (e.preview === 'ln-01') return lnHTML(esc(e.name));
  const fk = /^mo-(\d\d)$/.exec(e.preview || '');
  if (fk && +fk[1] >= 2 && +fk[1] <= 15) return cdFxHTML(+fk[1] - 2);
  const nk = /^nt-0([1-6])$/.exec(e.preview || '');
  if (nk) return ntHTML(nk[1]);
  const bk = /^bg-0([1-6])$/.exec(e.preview || '');
  if (bk) return bgHTML(bk[1]);
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

/* 選中指示器：左右兩個邊緣各用一顆彈簧追目標（MO-01 雙彈簧伸縮膠囊）。
   前緣（移動方向那一側）ω₀ 19、ζ 0.55；後緣 ω₀ 11、ζ 0.72，所以移動途中會拉長，到站再縮回。
   nav 上的 data-back 可覆寫後緣的 ω₀（19 不伸縮、11 有彈性、6 軟 Q）。 */
const SPRING_FRONT = {w: 19, z: .55}, SPRING_BACK = {w: 11, z: .72};
const stillMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function setInd(nav, L, R, base){
  const b = nav._bounds;                      /* 超過頭的部分壓在兩端的牆上，不跑出選單外 */
  if (b) { L = Math.min(Math.max(L, b[0]), b[1]); R = Math.min(Math.max(R, b[0]), b[1]); }
  nav.style.setProperty('--x', L.toFixed(2) + 'px');
  nav.style.setProperty('--w', Math.max(0, R - L).toFixed(2) + 'px');
  nav.style.setProperty('--st', Math.max(-base * .35, (R - L) - base).toFixed(2) + 'px');
}
function place(nav, instant){
  const cur = nav.querySelector('[aria-current="true"]'); if (!cur) return;
  const tL = cur.offsetLeft, tR = tL + cur.offsetWidth, tabs = nav.querySelectorAll('.tab');
  nav._bounds = [tabs[0].offsetLeft, tabs[tabs.length - 1].offsetLeft + tabs[tabs.length - 1].offsetWidth];
  let s = nav._spr;
  if (instant || !s || stillMotion()) {
    if (s) s.stop = true;
    nav._spr = {L: tL, R: tR, vL: 0, vR: 0, tL, tR, run: false};
    setInd(nav, tL, tR, tR - tL); return;
  }
  s.dir = Math.sign((tL + tR) - (s.L + s.R)) || s.dir || 1;
  s.tL = tL; s.tR = tR; s.stop = false;
  if (s.run) return;
  s.run = true;
  const back = nav.dataset.back ? {w: +nav.dataset.back, z: SPRING_BACK.z} : SPRING_BACK;
  let last = performance.now();
  const step = (now, x, v, t, k) => {           /* 半隱式歐拉，固定 1/240 秒小步 */
    const a = -k.w * k.w * (x - t) - 2 * k.z * k.w * v;
    v += a / 240; return [x + v / 240, v];
  };
  const tick = now => {
    if (s.stop || !nav.isConnected) { s.run = false; return; }
    let n = Math.min(24, Math.round((now - last) * .24)); last = now;
    const fL = s.dir < 0 ? SPRING_FRONT : back, fR = s.dir > 0 ? SPRING_FRONT : back;
    while (n-- > 0) { [s.L, s.vL] = step(now, s.L, s.vL, s.tL, fL); [s.R, s.vR] = step(now, s.R, s.vR, s.tR, fR); }
    setInd(nav, s.L, s.R, s.tR - s.tL);
    if (Math.abs(s.L - s.tL) < .3 && Math.abs(s.R - s.tR) < .3 && Math.abs(s.vL) < 4 && Math.abs(s.vR) < 4) {
      s.L = s.tL; s.R = s.tR; s.vL = s.vR = 0; setInd(nav, s.L, s.R, s.tR - s.tL); s.run = false; return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const placeAll = () => document.querySelectorAll('.bn').forEach(nav => place(nav, true));

/* 篩選列與分類欄 */
function renderNav(){
  const t = [['全部', view.status === '全部' && !view.star, 'status', '全部'], ['★ 星號', view.star, 'star', ''],
             ['想用', view.status === '想用', 'status', '想用'], ['已用', view.status === '已用', 'status', '已用']];
  $('tnav').innerHTML = t.map(([label, on, k, v]) => `<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${!!on}">${label}</button>`).join('');
  const count = n => entries.filter(e => e.category === n).length;
  const known = new Set(cats.map(c => c.name));
  const extra = [...new Set(entries.map(e => e.category).filter(n => n && !known.has(n)))].map(n => ({name: n, group: '其他'}));
  const all = cats.concat(extra), groups = [...new Set(all.map(c => c.group))];
  $('side').innerHTML = `<button type="button" class="sc" data-cat="全部" aria-pressed="${view.cat === '全部'}"><span>全部類別</span><b>${entries.length}</b></button>` +
    groups.map(g => `<div class="sg${all.some(c => c.group === g && count(c.name)) ? '' : ' none'}"><h4>${esc(g)}</h4>${all.filter(c => c.group === g).map(c => { const n = count(c.name);
      return `<button type="button" class="sc${n ? '' : ' none'}" data-cat="${esc(c.name)}" aria-pressed="${view.cat === c.name}"${n ? '' : ' disabled'}><span>${esc(c.name)}</span><b>${n || ''}</b></button>`; }).join('')}</div>`).join('');
}

/* 卡片牆 */
function cardHTML(e, i){
  return `<article class="card" data-id="${esc(e.id)}" style="--h:${hueOf(e)};--i:${Math.min(i, 12)}">
    <div class="pv">${previewHTML(e)}</div>
    <div class="info">
      <a href="#${encodeURIComponent(e.id)}"><span class="mono">${esc(e.code)}<i>/</i>${esc(e.category)}</span><b>${esc(e.name)}</b><em>${esc(e.en)}</em></a>
      <button type="button" class="star" data-act="star" aria-pressed="${!!e.star}" aria-label="星號">★</button>
    </div>
  </article>`;
}
function renderGrid(){
  const list = filtered(), stars = entries.filter(e => e.star).length, used = new Set(entries.map(e => e.category)).size;
  const crumb = view.cat === '全部' ? ['全部'] : [groupOf(view.cat), view.cat].filter(Boolean);
  const title = view.q.trim() ? `「${esc(view.q.trim())}」` : view.cat === '全部' ? '介面樣式範例' : esc(view.cat);
  $('main').innerHTML = `<section class="hero">
      <p class="mono crumb">${crumb.map(c => `<i>/</i>${esc(c)}`).join(' ')}</p>
      <h1>${title}</h1>
      <p class="mono stats"><span><b>${list.length}</b> 款${filtersOn() ? `（共 ${entries.length}）` : ''}</span><span><b>${used}</b> 個類別</span><span><b>${stars}</b> 個星號</span>${filtersOn() ? '<button type="button" class="link" data-act="clear">清除篩選</button>' : ''}</p>
    </section>
    ${list.length ? `<div class="grid${animateNext ? ' enter' : ''}">${list.map(cardHTML).join('')}</div>`
      : `<p class="empty">${entries.length ? '目前的篩選條件下沒有東西。' : loaded ? '還沒有任何條目。把截圖或影片傳給 Claude 說「加入靈感庫」，就會出現在這裡。' : ''}</p>`}`;
  if (list.length) animateNext = false;
}

/* 單款示範頁 */
function renderDetail(e){
  const list = filtered().some(x => x.id === e.id) ? filtered() : entries.slice().sort(byCode);
  const i = list.findIndex(x => x.id === e.id), prev = list[i - 1], next = list[i + 1];
  const lines = String(e.spec || '').split('\n').map(s => s.trim()).filter(Boolean);
  const link = (x, label) => x ? `<a href="#${encodeURIComponent(x.id)}"><span class="mono">${label}</span><b>${esc(x.name)}</b></a>` : '<span></span>';
  $('main').innerHTML = `<article class="detail" data-id="${esc(e.id)}" style="--h:${hueOf(e)}">
    <header class="dhead">
      <a class="mono back" href="#">← 回到範例牆</a>
      <p class="mono crumb">${[groupOf(e.category), e.category].filter(Boolean).map(c => `<i>/</i>${esc(c)}`).join(' ')}<i>/</i>${esc(e.code)}</p>
      <h1>${esc(e.name)}</h1>
      <p class="en">${esc(e.en)}</p>
      ${e.desc ? `<p class="desc">${esc(e.desc)}</p>` : ''}
    </header>
    <div class="dpv">
      <div class="pv big">${previewHTML(e)}</div>
      <p class="mono hint">${e.preview ? '可以直接點選操作' : '這一款只有文字規格'}</p>
    </div>
    <div class="dbody">
      <div class="acts">
        <button type="button" class="btn star" data-act="star" aria-pressed="${!!e.star}" aria-label="星號">★</button>
        <select class="btn" id="status-${esc(e.id)}" data-act="status" aria-label="狀態">${STATUSES.map(s => `<option${s === (e.status || '收藏') ? ' selected' : ''}>${s}</option>`).join('')}</select>
        <button type="button" class="btn pri" data-act="copy">複製指令</button>
        <button type="button" class="btn" data-act="edit">備註與編輯</button>
      </div>
      ${(e.tags || []).length ? `<div class="tags">${e.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      <h2 class="mono">規格</h2>
      ${lines.length ? `<ol class="spec">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ol>` : '<p class="empty">還沒寫規格。</p>'}
      ${e.note ? `<h2 class="mono">備註</h2><p class="note">${esc(e.note)}</p>` : ''}
      <p class="mono meta">${[e.source && '來源　' + esc(e.source), e.addedAt && '加入　' + esc(e.addedAt)].filter(Boolean).join('<br>')}</p>
    </div>
    <nav class="pn">${link(prev, '← 上一款')}${link(next, '下一款 →')}</nav>
  </article>`;
}

function render(){
  renderNav();
  const e = route && entries.find(x => x.id === route);
  document.body.classList.toggle('in-detail', !!e);
  if (e) renderDetail(e); else renderGrid();
  placeAll(); initBgs(); initNts(); initSws(); initCds(); initCdFx(); initLps(); initSds(); initFms(); initLns();
}
function copyCmd(e){
  const text = `用 UI 靈感庫的 ${e.code} ${e.name} 樣式來做`;
  navigator.clipboard.writeText(text).then(() => toast('已複製：' + text), () => toast(text));
}
function readRoute(){ try { return decodeURIComponent(location.hash.slice(1)); } catch (_) { return ''; } }
window.addEventListener('hashchange', () => {
  const was = route; route = readRoute();
  if (!was && route) gridY = window.scrollY;
  render();
  window.scrollTo(0, route ? 0 : (was ? gridY : 0));
});

/* 事件：內容區 */
$('main').addEventListener('click', ev => {
  if (ev.target.closest('.cdx, .lpx, .fmx')) return;               /* CD-01、LP-01、FM-01 自己處理點擊 */
  const tab = ev.target.closest('button.tab');
  if (tab) {
    const nav = tab.closest('.bn'), idx = [...nav.querySelectorAll('.tab')].indexOf(tab);
    const mox = nav.closest('.mox');                          /* MO-01 的三列一起切換，方便比較手感 */
    (mox ? [...mox.querySelectorAll('.bn')] : [nav]).forEach(n => {
      const tabs = [...n.querySelectorAll('.tab')], to = tabs[idx] || tab;
      tabs.forEach(t => { t.removeAttribute('aria-current'); t.classList.remove('pop'); });
      to.setAttribute('aria-current', 'true'); void to.offsetWidth; to.classList.add('pop'); place(n);
    });
    if (nav.classList.contains('bn-dash')) { const dz = nav.parentElement.querySelector('.dg'); dz.classList.remove('swap'); void dz.offsetWidth; dz.classList.add('swap'); }
    const r = tab.getBoundingClientRect(), rip = document.createElement('span');
    rip.className = 'rip'; rip.style.setProperty('--rx', (ev.clientX - r.left) + 'px'); rip.style.setProperty('--ry', (ev.clientY - r.top) + 'px');
    tab.appendChild(rip); rip.addEventListener('animationend', () => rip.remove());
    return;
  }
  if (ev.target.closest('.uix') && uiTap(ev)) return;              /* UI-01 到 UI-12 的控制項（ui12.js） */
  if (ev.target.closest('.sdx') && sdTap(ev)) return;
  if (ev.target.closest('.lnx') && lnTap(ev)) return;              /* LN-01 的步驟按鈕與時間軸（ln01.js） */              /* SD-01 的收合按鈕（sd01.js） */
  const bgx = ev.target.closest('.bgx');
  if (bgx) { bgTap(bgx, ev); return; }
  const glx = ev.target.closest('.glx');
  if (glx) { glx.classList.toggle('off'); return; }
  const ntx = ev.target.closest('.ntx');
  if (ntx) { playNt(ntx); return; }
  const swx = ev.target.closest('.swx');
  if (swx) { swTap(swx, ev); return; }
  const ict = ev.target.closest('.ict');
  if (ict) { icReplay(ict); return; }
  const mid = ev.target.closest('button.mid');
  if (mid) { mid.classList.remove('spin'); void mid.offsetWidth; mid.classList.add('spin'); return; }
  const b = ev.target.closest('[data-act]');
  if (b && b.dataset.act === 'clear') { clearFilters(); animateNext = true; render(); return; }
  const host = ev.target.closest('[data-id]'), e = host && entries.find(x => x.id === host.dataset.id);
  if (!e) return;
  if (b) {
    if (b.dataset.act === 'star') { patch(e.id, {star: !e.star}); b.setAttribute('aria-pressed', !!e.star); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    if (b.dataset.act === 'copy') copyCmd(e);
    if (b.dataset.act === 'edit') openDlg(e);
    return;
  }
  /* 卡片上除了示範本身以外的地方，點了都進示範頁 */
  if (host.classList.contains('card') && !ev.target.closest('a,.stage button')) location.hash = encodeURIComponent(e.id);
});
$('main').addEventListener('change', ev => {
  const s = ev.target.closest('select[data-act="status"]'); if (!s) return;
  patch(s.closest('[data-id]').dataset.id, {status: s.value});
});

/* 事件：篩選、分類、搜尋 */
function toGrid(){ animateNext = true; if (route) location.hash = ''; else { render(); } }
$('tnav').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.k === 'star') view.star = !view.star;
  else { view.status = b.dataset.v; if (b.dataset.v === '全部') view.star = false; }
  toGrid();
});
$('side').addEventListener('click', ev => {
  const b = ev.target.closest('.sc'); if (!b || b.disabled) return;
  view.cat = b.dataset.cat; toGrid(); if (!route) window.scrollTo(0, 0);
});
let qt; $('q').addEventListener('input', ev => { clearTimeout(qt); qt = setTimeout(() => { view.q = ev.target.value; toGrid(); }, 180); });
$('brand').addEventListener('click', ev => { ev.preventDefault(); clearFilters(); animateNext = true; if (route) location.hash = ''; else { render(); window.scrollTo(0, 0); } });

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
  entries = entries.filter(x => x.id !== editing.id); $('dlg').close(); toast('已刪除');
  commit(false); if (route) location.hash = ''; else render();
});
$('form').addEventListener('submit', ev => {
  ev.preventDefault();
  const v = k => $('f-' + k).value.trim();
  Object.assign(editing, {
    code: v('code').toUpperCase(), category: v('category'), name: v('name'), en: v('en'), desc: v('desc'), spec: v('spec'),
    tags: v('tags').split(/[,，、]/).map(s => s.trim()).filter(Boolean),
    status: v('status') || '收藏', source: v('source'), note: v('note')
  });
  commit(); $('dlg').close(); toast('已儲存');
});

/* 同步設定 */
const G = ['owner','repo','branch','path','token'];
$('cfg').addEventListener('click', () => { G.forEach(k => $('gh-' + k).value = gh[k] || ''); $('gh-msg').textContent = ''; $('cfgdlg').showModal(); });
$('cfg-cancel').addEventListener('click', () => $('cfgdlg').close());
$('cfgform').addEventListener('submit', async ev => {
  ev.preventDefault();
  G.forEach(k => gh[k] = $('gh-' + k).value.trim());
  gh.branch = gh.branch || 'main'; gh.path = gh.path.replace(/^\/+/, '') || 'entries.json';
  jset(LS_GH, gh); ghSha = null;
  if (!ghReady()) { $('gh-msg').textContent = 'owner、repo、token 都要填'; return; }
  $('cfgdlg').close(); await pull();
});

window.addEventListener('resize', placeAll);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeAll);

/* 啟動 */
(async () => {
  route = readRoute();
  const local = jget(LS_DATA, null);
  if (local && Array.isArray(local.entries)) { entries = local.entries; cats = Array.isArray(local.categories) ? local.categories : []; loaded = true; }
  render();
  let def = null;
  if (!loaded || !cats.length || !ghReady()) { try { const r = await fetch('entries.default.json', { cache: 'no-cache' }); if (r.ok) def = await r.json(); } catch (_) {} }
  if (def && !cats.length && Array.isArray(def.categories)) { cats = def.categories; if (loaded) render(); }
  if (ghReady()) { await pull(); if (!loaded) { loaded = true; render(); } return; }
  setSync('只存在這台裝置');
  /* 沒設定同步的裝置：每次開啟都把內建資料合進來——補上新條目與分類，保留這台改過的星號、狀態、備註，刪掉的不會回來 */
  const was = JSON.stringify([cats, entries]);
  if (def) mergeRemote(def, loaded);
  const changed = JSON.stringify([cats, entries]) !== was;
  if (changed) saveLocal();
  if (!loaded || changed) { loaded = true; render(); }
})();
