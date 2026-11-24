/* SD-01：不亂跑的收合按鈕。上面的視窗收起後按鈕換位置（要追著按鈕跑），下面的視窗按鈕固定在左上角。
   可操作：兩個視窗的收合按鈕都能點，上面會標出游標要移動的實際距離（px）。
   沒人操作時由假游標自動示範（看得到時才跑）；點過之後停 9 秒再接手。外觀在 style.css 的 .sdx。 */
const SD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="f" x="4.6" y="6.1" width="4.6" height="11.8" rx="1.6"/><rect x="3.5" y="5" width="17" height="14" rx="3.2"/><path d="M10 5v14"/></svg>';
const SD_CUR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 8.2-6.3 1.5L9.6 19z"/></svg>';
const SD_SLIDE = 300;                                   /* 側邊欄滑完（CSS 是 260ms）才量新位置 */
const sdWait = ms => new Promise(r => setTimeout(r, ms));
function sdWin(k){
  const btn = c => `<button type="button" class="sdb ${c}" aria-label="收起側邊欄">${SD_ICON}</button>`;
  const bad = k === 'bad';
  return `<div class="sdw ${k} open">
    ${bad ? '' : btn('f')}
    <div class="sds"><div class="sdh"><i class="sdl"></i><b>筆記</b>${bad ? btn('r') : ''}</div><span class="sdi on">全部筆記</span><span class="sdi">旅行</span><span class="sdi">家裡</span></div>
    <div class="sdm"><div class="sdt">${bad ? btn('l') : ''}<span class="sdtab on">行程<s>×</s></span><span class="sdtab">點子</span></div><div class="sdp"><i></i><i></i></div></div>
    ${bad ? '<span class="sdg"></span><span class="sda"></span>' : ''}
    <span class="sdcap"><i></i>${bad ? '按鈕會跑<b></b>' : '按鈕固定<b>0 px</b>'}</span>
    <span class="sdc">${SD_CUR}</span>
  </div>`;
}
function sdHTML(name){
  return `<div class="sdx user" role="group" aria-label="${name}示範">${sdWin('bad')}${sdWin('good')}</div>`;
}
/* 目前看得到的那顆收合按鈕 */
function sdBtn(win){
  if (win.classList.contains('good')) return win.querySelector('.sdb.f');
  return win.querySelector(win.classList.contains('open') ? '.sdb.r' : '.sdb.l');
}
/* 按鈕中心，相對於視窗內緣（px） */
function sdCenter(win, el){
  const r = el.getBoundingClientRect(), w = win.getBoundingClientRect();
  return [r.left + r.width / 2 - w.left - win.clientLeft, r.top + r.height / 2 - w.top - win.clientTop];
}
function sdReplay(el, cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
/* 收合一次。上面的視窗：原位置留虛線框，滑完後畫出指向新位置的箭頭，右下角標出距離。回傳的 Promise 在標示畫好後結束。 */
function sdToggle(win){
  const bad = win.classList.contains('bad'), from = sdCenter(win, sdBtn(win)), n = win._n = (win._n || 0) + 1;
  const open = win.classList.toggle('open'), cap = win.querySelector('.sdcap b');
  win.querySelectorAll('.sdb').forEach(b => b.setAttribute('aria-label', open ? '收起側邊欄' : '展開側邊欄'));
  if (!bad) { sdReplay(sdBtn(win), 'tap'); sdReplay(cap, 'pop'); return Promise.resolve(); }
  const g = win.querySelector('.sdg'), a = win.querySelector('.sda');
  a.classList.remove('on', 'rev');
  g.style.transform = `translate(${from[0]}px,${from[1]}px)`; g.classList.add('on');
  return sdWait(SD_SLIDE).then(() => {
    if (win._n !== n || !win.isConnected) return;
    const b = sdBtn(win), to = sdCenter(win, b), half = b.offsetWidth / 2, d = to[0] - from[0], s = Math.sign(d) || 1;
    /* 標示線畫在按鈕列下緣（不壓到分頁文字），從原位置中心指到新位置中心 */
    a.style.left = Math.min(from[0], to[0]) + 'px'; a.style.top = (from[1] + half * 1.2) + 'px'; a.style.width = Math.abs(d) + 'px';
    cap.textContent = Math.round(Math.abs(d)) + ' px';
    a.classList.toggle('rev', s < 0); void a.offsetWidth; a.classList.add('on'); sdReplay(cap, 'pop');
  });
}
/* 回傳 true 表示點到的是示範裡的收合按鈕（不要進示範頁） */
function sdTap(ev){
  const b = ev.target.closest('.sdx .sdb'); if (!b) return false;
  const x = b.closest('.sdx'); x._user = performance.now(); x.classList.add('user');
  sdToggle(b.closest('.sdw'));
  return true;
}
/* 假游標 */
function sdPut(win, instant){
  const c = win.querySelector('.sdc'), [x, y] = sdCenter(win, sdBtn(win));
  if (instant) c.style.transition = 'none';
  c.style.transform = `translate(${x}px,${y}px)`;
  if (instant) { void c.offsetWidth; c.style.transition = ''; }
}
function sdClick(win){ sdReplay(win.querySelector('.sdc'), 'hit'); return sdToggle(win); }
/* 自動示範一輪：兩邊同時按一下收起。下面原地再按一下就開回來；上面得先把游標移到新位置才能按。 */
async function sdDemo(el, ok){
  const [bad, good] = el.querySelectorAll('.sdw');
  const go = ms => sdWait(ms).then(() => { if (!ok() || !el.isConnected) throw 0; });
  try {
    sdPut(bad, true); sdPut(good, true); el.classList.remove('user');
    await go(650);
    sdClick(bad); sdClick(good);
    await go(800);
    sdClick(good); sdPut(bad);
    await go(820);
    sdClick(bad);
    await go(800);
    sdPut(bad);
    await go(900);
  } catch (_) { if (el.isConnected) el.classList.add('user'); }
}
let sdIO = null;
function initSds(){
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!sdIO && 'IntersectionObserver' in window) sdIO = new IntersectionObserver(es => es.forEach(en => { en.target._vis = en.isIntersecting; }), {threshold: .5});
  document.querySelectorAll('.sdx:not([data-on])').forEach((el, i) => {
    el.dataset.on = '1'; if (sdIO) sdIO.observe(el);
    if (still) return;
    const idle = () => performance.now() - (el._user || -1e9) > 9000;
    const tick = async () => {
      if (!el.isConnected) { if (sdIO) sdIO.unobserve(el); return; }
      if (el._vis && !document.hidden && idle()) await sdDemo(el, idle);
      setTimeout(tick, 700);
    };
    setTimeout(tick, 900 + i * 300);
  });
}
