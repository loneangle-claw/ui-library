/* LN-01：步驟式等角互動課。一張等角場景從頭用到尾，每按一步只改一件事，而且看得到它「發生」：
   這一步的道具先彈出來 → 鏡頭把相關的東西框進畫面 → 小人一步一步走過去（地上留下流動的點狀軌跡）→
   做動作（東西沿拋物線飛進道具、水滴落下、頭上的進度膠囊填滿）→ 數字卡變動的那張翻上來並閃一下。最後一步拉遠看全景並打勾。
   可操作：按「下一步／上一步」或直接點時間軸圓點。沒人操作時自動播放（看得到時才跑）；碰過之後停 9 秒再接手。
   示範內容是通用的手沖咖啡四步驟。外觀在 style.css 的 .lnx，尺寸用 em。 */
const LN_U = 15, LN_NS = 'http://www.w3.org/2000/svg';
const lnP = (x, y, z = 0) => [+((x - y) * LN_U * .866).toFixed(1), +((x + y) * LN_U * .5 - z * LN_U).toFixed(1)];
const lnPoly = (p, f, c = 'o') => `<polygon class="${c}" points="${p.map(q => q.join(',')).join(' ')}" fill="${f}"/>`;
const lnHsl = (c, d = 0) => `hsl(${c[0]} ${c[1]}% ${c[2] - d}%)`;
const lnE = (t, a, p) => { const e = document.createElementNS(LN_NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const lnEase = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const lnBack = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
/* 方塊三個面：頂面原色，前左面暗 8%，前右面暗 16% */
function lnBox(x, y, w, d, h, c){
  return lnPoly([lnP(x, y + d, h), lnP(x + w, y + d, h), lnP(x + w, y + d), lnP(x, y + d)], lnHsl(c, 8))
    + lnPoly([lnP(x + w, y, h), lnP(x + w, y + d, h), lnP(x + w, y + d), lnP(x + w, y)], lnHsl(c, 16))
    + lnPoly([lnP(x, y, h), lnP(x + w, y, h), lnP(x + w, y + d, h), lnP(x, y + d, h)], lnHsl(c));
}
const LN_TILES = ['粉量', '水量', '時間'], LN_ZERO = ['0 g', '0 g', '0:00'], LN_START = [-1.6, 2.4];
const LN_STEPS = [
  {lab: '磨豆', name: '磨豆機', note: '中細研磨', x: 0, v: ['15 g', '0 g', '0:00'], c: [28, 45, 68], h: 1.5, fx: 'bean'},
  {lab: '悶蒸', name: '濾杯', note: '先注 30 g 水', x: 3.4, v: ['15 g', '30 g', '0:30'], c: [205, 50, 76], h: 1, fx: 'drop'},
  {lab: '注水', name: '手沖壺', note: '繞圈注到 240 g', x: 6.8, v: ['15 g', '240 g', '2:00'], c: [262, 40, 80], h: 1.25, fx: 'drop'},
  {lab: '完成', name: '杯子', note: '', x: 10.2, v: ['15 g', '240 g', '2:30'], c: [150, 40, 72], h: .75, fx: 'check'}
];
function lnScene(){
  const X0 = -2, X1 = 13, Y0 = -.5, Y1 = 3.4, T = .3;
  let s = lnPoly([lnP(X0, Y1), lnP(X1, Y1), lnP(X1, Y1, -T), lnP(X0, Y1, -T)], 'var(--lnf2)')
    + lnPoly([lnP(X1, Y0), lnP(X1, Y1), lnP(X1, Y1, -T), lnP(X1, Y0, -T)], 'var(--lnf3)')
    + lnPoly([lnP(X0, Y0), lnP(X1, Y0), lnP(X1, Y1), lnP(X0, Y1)], 'var(--lnf)');
  for (let i = Math.ceil(X0); i < X1; i++) { const a = lnP(i, Y0), b = lnP(i, Y1); s += `<line class="g" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
  for (let j = 0; j <= 3; j++) { const a = lnP(X0, j), b = lnP(X1, j); s += `<line class="g" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
  s += '<polyline class="tr"/>';
  LN_STEPS.forEach((t, i) => {
    const p = lnP(t.x + .65, .5, t.h), w = t.name.length * 7 + 9;
    s += `<g class="rv" data-r="${i}">${lnBox(t.x, 0, 1.3, 1, t.h, t.c)}<g class="p"><rect x="${p[0] - w / 2}" y="${p[1] - 18}" width="${w}" height="11.5" rx="5.7"/><text x="${p[0]}" y="${+p[1] - 9.8}">${t.name}</text></g></g>`;
  });
  const pawn = `<g class="lnm"><ellipse class="r" cx="0" cy="0" rx="12" ry="6"/><ellipse cx="0" cy=".4" rx="8" ry="3.6" fill="rgba(0,0,0,.18)"/>
    <ellipse class="o sh" cx="-3.4" cy="-1.6" rx="3.5" ry="2.3" fill="#3b3b40"/><ellipse class="o sh" cx="3.4" cy="-1.6" rx="3.5" ry="2.3" fill="#3b3b40"/>
    <g class="up"><rect class="o b" x="-6.2" y="-21" width="12.4" height="18.6" rx="6.2"/><circle class="o" cx="0" cy="-26.4" r="5.9" fill="#ebc9a5"/>
    <circle cx="-2.1" cy="-27.2" r=".8" fill="#1b1b1f"/><circle cx="2.1" cy="-27.2" r=".8" fill="#1b1b1f"/></g></g>`;
  return `<svg viewBox="-112 -66 224 132" aria-hidden="true"><g class="lnw">${s}${pawn}<g class="fx"></g></g></svg>`;
}
function lnHTML(name){
  return `<div class="lnx" role="group" aria-label="${name}示範">
    <div class="lnh"><small>01 · 手沖咖啡 ／ 第 1 課</small><b>四個步驟沖一杯</b></div>
    <div class="lnt">${LN_TILES.map((t, k) => `<span><small>${t}</small><b>${LN_ZERO[k]}</b></span>`).join('')}</div>
    <div class="lns">${lnScene()}<em class="lnc"></em><em class="lnq"></em></div>
    <div class="lnl">${LN_STEPS.map((t, i) => `<button type="button" class="lnd" data-lni="${i}"><i>${i + 1}</i><span>${t.lab}</span></button>`).join('')}</div>
    <div class="lnn"><button type="button" class="lnb" data-ln="-1">上一步</button><button type="button" class="lnb pri" data-ln="1"><span></span><b>→</b></button></div>
  </div>`;
}
/* 每個示範各自記狀態：run 用來作廢上一步還沒跑完的動畫 */
function lnTween(el, ms, fn, then){
  const id = el._run, t0 = performance.now();
  const f = now => { if (id !== el._run || !el.isConnected) return; const t = Math.min(1, (now - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(f); else if (then) then(); };
  requestAnimationFrame(f);
}
const lnLater = (el, ms, fn) => { const id = el._run; setTimeout(() => { if (id === el._run && el.isConnected) fn(); }, ms); };
function lnPlace(el){ const p = lnP(el._pos[0], el._pos[1]); el._m.setAttribute('transform', `translate(${p[0]},${p[1]})`); }
function lnTrail(el, i, cur){
  const out = [lnP(LN_START[0], LN_START[1], .02)];
  for (let k = 0; k <= i; k++) out.push(lnP(LN_STEPS[k].x - .2, 2.4, .02));
  if (cur) out.push(lnP(cur[0], cur[1], .02));
  el._tr.setAttribute('points', out.map(q => q.join(',')).join(' '));
}
function lnCam(el, i){
  const W = [], add = (x, y, z = 0) => W.push(lnP(x, y, z)), t = LN_STEPS[i], n = LN_STEPS.length;
  if (i === n - 1) { add(LN_START[0], LN_START[1]); LN_STEPS.forEach(s => { add(s.x, 0, s.h + 1.4); add(s.x + 1.3, 2.4); }); }
  else { add(t.x - .2, 2.4); add(t.x - .2, 2.4, 3.4); add(t.x, 0, t.h + 1.4); const b = i ? LN_STEPS[i - 1].x - .2 : LN_START[0]; add(b, 2.4, 1); }
  const xs = W.map(p => p[0]), ys = W.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.max(.5, Math.min(224 / (x1 - x0 + 52), 132 / (y1 - y0 + 40), 1.35));
  el._w.style.transform = `scale(${k.toFixed(3)}) translate(${(-(x0 + x1) / 2).toFixed(1)}px,${(-(y0 + y1) / 2 + 4).toFixed(1)}px)`;
}
function lnTiles(el, v, quiet){
  el.querySelectorAll('.lnt span').forEach((sp, k) => {
    const b = sp.querySelector('b'), ch = b.textContent !== v[k];
    b.textContent = v[k];
    if (ch && !quiet) { sp.classList.remove('chg'); void sp.offsetWidth; sp.classList.add('chg'); }
  });
}
function lnAct(el, i){
  const t = LN_STEPS[i], fx = el._fx, p = lnP(el._pos[0], el._pos[1]), hand = [p[0], p[1] - 14], head = [p[0], p[1] - 40];
  const top = lnP(t.x + .65, .5, t.h), box = el.querySelector(`.rv[data-r="${i}"]`);
  lnTrail(el, i);
  box.classList.remove('use'); void box.getBoundingClientRect(); box.classList.add('use');
  let T = 900;
  if (t.fx === 'bean') {                                    /* 東西沿拋物線飛進道具 */
    for (let k = 0; k < 3; k++) lnLater(el, k * 150, () => { const c = lnE('circle', {r: 2.4, fill: '#7a4a2a', class: 'o'}, fx);
      lnTween(el, 520, u => { const e = lnEase(u); c.setAttribute('cx', (hand[0] + (top[0] - hand[0]) * e).toFixed(1)); c.setAttribute('cy', (hand[1] + (top[1] - hand[1]) * e - Math.sin(Math.PI * u) * 20).toFixed(1)); c.setAttribute('opacity', u > .85 ? (1 - u) / .15 : 1); }, () => c.remove()); });
  } else if (t.fx === 'drop') {                             /* 水滴落下 */
    const ds = []; for (let j = 0; j < 6; j++) ds.push(lnE('circle', {r: 1.6, fill: '#3e9be0', cx: top[0] + (j % 3 - 1) * 2}, fx));
    lnTween(el, 900, u => ds.forEach((d, j) => { const ph = (u * 2.2 + j / 6) % 1; d.setAttribute('cy', (top[1] - 14 + ph * 13).toFixed(1)); d.setAttribute('opacity', ((1 - ph) * (u > .9 ? (1 - u) * 10 : 1)).toFixed(2)); }), () => ds.forEach(d => d.remove()));
  } else {                                                  /* 完成：打勾＋彩點 */
    T = 500;
    const g = lnE('g', {}, fx); lnE('circle', {r: 8, fill: '#2a9d63', stroke: '#fff', 'stroke-width': 1.4}, g);
    lnE('path', {d: 'M-3.6,.4 L-1,3 L4,-2.6', fill: 'none', stroke: '#fff', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}, g);
    lnTween(el, 420, u => g.setAttribute('transform', `translate(${head[0]},${head[1] - 4}) scale(${lnBack(u).toFixed(2)})`));
    const cs = []; for (let j = 0; j < 10; j++) cs.push(lnE('circle', {r: 1.7, fill: ['#f2c230', '#2a9d63', '#5ba8d8', '#e0705a'][j % 4]}, fx));
    lnTween(el, 800, u => cs.forEach((d, j) => { const an = j / 10 * 6.283, r = 8 + lnEase(u) * 26; d.setAttribute('cx', (head[0] + Math.cos(an) * r).toFixed(1)); d.setAttribute('cy', (head[1] - 4 + Math.sin(an) * r * .8 + u * u * 10).toFixed(1)); d.setAttribute('opacity', (1 - u).toFixed(2)); }), () => cs.forEach(d => d.remove()));
  }
  if (t.fx !== 'check') {                                   /* 進度膠囊 */
    const w = t.lab.length * 7 + 14, g = lnE('g', {class: 'pg'}, fx);
    lnE('rect', {x: head[0] - w / 2, y: head[1] - 16, width: w, height: 16, rx: 6}, g); lnE('text', {x: head[0], y: head[1] - 7.2}, g).textContent = t.lab;
    lnE('rect', {class: 'bg', x: head[0] - w / 2 + 4, y: head[1] - 4.4, width: w - 8, height: 2.2, rx: 1.1}, g);
    const bar = lnE('rect', {class: 'bar', x: head[0] - w / 2 + 4, y: head[1] - 4.4, width: 0, height: 2.2, rx: 1.1}, g);
    lnTween(el, T, u => bar.setAttribute('width', ((w - 8) * u).toFixed(1)), () => lnLater(el, 500, () => lnTween(el, 260, u => g.setAttribute('opacity', 1 - u), () => g.remove())));
  }
  lnLater(el, T, () => lnTiles(el, t.v));
}
function lnGo(el, i, quiet){
  const n = LN_STEPS.length; i = (i + n) % n; el._i = i; el._run = (el._run || 0) + 1;
  if (!el._w) { el._w = el.querySelector('.lnw'); el._m = el.querySelector('.lnm'); el._tr = el.querySelector('.tr'); el._fx = el.querySelector('.fx'); el._pos = [...LN_START]; lnPlace(el); }
  const t = LN_STEPS[i], to = [t.x - .2, 2.4];
  el._fx.textContent = '';
  el.querySelectorAll('.rv').forEach(g => g.classList.toggle('in', +g.dataset.r <= i));
  el.querySelectorAll('.lnd').forEach((d, k) => { d.classList.toggle('done', k < i); d.classList.toggle('on', k === i); });
  el.querySelector('.lnc').textContent = `${i + 1} / ${n}`;
  const q = el.querySelector('.lnq'); q.textContent = t.note; q.classList.toggle('on', !!t.note);
  el.querySelector('.lnb.pri span').textContent = i === n - 1 ? '再看一次' : '下一步：' + LN_STEPS[i + 1].lab;
  el.querySelector('.lnb[data-ln="-1"]').disabled = i === 0;
  lnCam(el, i);
  const up = el._m.querySelector('.up'), sh = el._m.querySelectorAll('.sh');
  if (quiet) { el._pos = to; lnPlace(el); lnTrail(el, i); lnTiles(el, t.v, true); return; }
  if (i === 0) lnTiles(el, LN_ZERO, true);
  const from = [...el._pos], d = Math.hypot(to[0] - from[0], to[1] - from[1]);
  if (d < .05) { lnLater(el, 300, () => lnAct(el, i)); return; }
  const steps = Math.max(2, Math.round(d * 1.25));
  lnTween(el, Math.max(380, Math.min(1100, d * 150)), u => {                 /* 走路：身體上下、兩腳輪流抬 */
    const e = lnEase(u), ph = Math.sin(e * steps * Math.PI);
    el._pos = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e]; lnPlace(el);
    up.setAttribute('transform', `translate(0,${(-Math.abs(ph) * 2.6).toFixed(1)})`);
    sh[0].setAttribute('cy', (-1.6 - Math.max(0, ph) * 2.4).toFixed(1)); sh[1].setAttribute('cy', (-1.6 - Math.max(0, -ph) * 2.4).toFixed(1));
    lnTrail(el, Math.min(i - 1, n - 1), el._pos);
  }, () => { el._pos = to; lnPlace(el); up.removeAttribute('transform'); sh.forEach(s => s.setAttribute('cy', -1.6)); lnAct(el, i); });
}
/* 回傳 true 表示點到的是示範裡的控制項（不要進示範頁） */
function lnTap(ev){
  const x = ev.target.closest('.lnx'); if (!x) return false;
  const d = ev.target.closest('.lnd'), b = ev.target.closest('.lnb');
  if (!d && !b) return false;
  x._user = performance.now();
  if (d) lnGo(x, +d.dataset.lni); else if (!b.disabled) lnGo(x, (x._i || 0) + +b.dataset.ln);
  return true;
}
let lnIO = null;
function initLns(){
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!lnIO && 'IntersectionObserver' in window) lnIO = new IntersectionObserver(es => es.forEach(en => { en.target._vis = en.isIntersecting; }), {threshold: .5});
  document.querySelectorAll('.lnx:not([data-on])').forEach((el, i) => {
    el.dataset.on = '1'; el.classList.add('still'); lnGo(el, 0, true); if (lnIO) lnIO.observe(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('still')));
    if (still) return;
    el._i = -1;
    const tick = () => {
      if (!el.isConnected) { if (lnIO) lnIO.unobserve(el); return; }
      const idle = performance.now() - (el._user || -1e9) > 9000;
      if (el._vis && !document.hidden && idle) lnGo(el, el._i + 1);
      setTimeout(tick, el._i === LN_STEPS.length - 1 ? 3600 : 3000);
    };
    setTimeout(tick, 1200 + i * 300);
  });
}
