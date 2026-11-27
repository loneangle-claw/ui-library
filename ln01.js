/* LN-01：步驟式等角互動課。一張等角場景從頭用到尾，每按一步只改一件事：小人走到下一站、鏡頭跟著平移、數字卡變動的那張閃一下、時間軸前進。
   可操作：按「下一步／上一步」或直接點時間軸圓點。沒人操作時自動播放（看得到時才跑）；碰過之後停 9 秒再接手。
   示範內容是通用的手沖咖啡四步驟。外觀在 style.css 的 .lnx，尺寸用 em。 */
const LN_U = 15;
const lnP = (x, y, z = 0) => [+((x - y) * LN_U * .866).toFixed(1), +((x + y) * LN_U * .5 - z * LN_U).toFixed(1)];
const lnPoly = (p, f, c = 'o') => `<polygon class="${c}" points="${p.map(q => q.join(',')).join(' ')}" fill="${f}"/>`;
const lnHsl = (c, d = 0) => `hsl(${c[0]} ${c[1]}% ${c[2] - d}%)`;
/* 方塊三個面：頂面原色，前左面暗 8%，前右面暗 16% */
function lnBox(x, y, w, d, h, c){
  return lnPoly([lnP(x, y + d, h), lnP(x + w, y + d, h), lnP(x + w, y + d), lnP(x, y + d)], lnHsl(c, 8))
    + lnPoly([lnP(x + w, y, h), lnP(x + w, y + d, h), lnP(x + w, y + d), lnP(x + w, y)], lnHsl(c, 16))
    + lnPoly([lnP(x, y, h), lnP(x + w, y, h), lnP(x + w, y + d, h), lnP(x, y + d, h)], lnHsl(c));
}
const LN_TILES = ['粉量', '水量', '時間'];
const LN_STEPS = [
  {lab: '磨豆', x: 0, v: ['15 g', '0 g', '0:00'], c: [28, 30, 64], h: 1.5},
  {lab: '悶蒸', x: 3.4, v: ['15 g', '30 g', '0:30'], c: [200, 32, 72], h: 1},
  {lab: '注水', x: 6.8, v: ['15 g', '240 g', '2:00'], c: [220, 8, 74], h: 1.25},
  {lab: '完成', x: 10.2, v: ['15 g', '240 g', '2:30'], c: [150, 30, 70], h: .75}
];
const LN_NAMES = ['磨豆機', '濾杯', '手沖壺', '杯子'];
function lnScene(){
  const X0 = -1.6, X1 = 13, Y0 = -.5, Y1 = 3.4;
  let s = lnPoly([lnP(X0, Y0), lnP(X1, Y0), lnP(X1, Y1), lnP(X0, Y1)], 'var(--lnf)', 'o');
  for (let i = Math.ceil(X0); i < X1; i++) { const a = lnP(i, Y0), b = lnP(i, Y1); s += `<line class="g" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
  for (let j = 0; j <= 3; j++) { const a = lnP(X0, j), b = lnP(X1, j); s += `<line class="g" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
  let lb = '';
  LN_STEPS.forEach((t, i) => {
    s += lnBox(t.x, 0, 1.3, 1, t.h, t.c);
    const p = lnP(t.x + .65, .5, t.h), w = LN_NAMES[i].length * 7 + 9;
    lb += `<g class="p"><rect x="${p[0] - w / 2}" y="${p[1] - 18}" width="${w}" height="11.5" rx="5.7"/><text x="${p[0]}" y="${+p[1] - 9.8}">${LN_NAMES[i]}</text></g>`;
  });
  const pawn = `<g class="lnm"><ellipse class="r" cx="0" cy="0" rx="12" ry="6"/><ellipse cx="0" cy=".4" rx="8" ry="3.6" fill="rgba(0,0,0,.18)"/>
    <ellipse class="o" cx="-3.4" cy="-1.6" rx="3.5" ry="2.3" fill="#3b3b40"/><ellipse class="o" cx="3.4" cy="-1.6" rx="3.5" ry="2.3" fill="#3b3b40"/>
    <rect class="o b" x="-6.2" y="-21" width="12.4" height="18.6" rx="6.2"/><circle class="o" cx="0" cy="-26.4" r="5.9" fill="#ebc9a5"/>
    <circle cx="-2.1" cy="-27.2" r=".8" fill="#1b1b1f"/><circle cx="2.1" cy="-27.2" r=".8" fill="#1b1b1f"/></g>`;
  return `<svg viewBox="-112 -74 224 132" aria-hidden="true"><g class="lnw">${s}${lb}${pawn}</g></svg>`;
}
function lnHTML(name){
  return `<div class="lnx" role="group" aria-label="${name}示範">
    <div class="lnh"><small>01 · 手沖咖啡 ／ 第 1 課</small><b>四個步驟沖一杯</b></div>
    <div class="lnt">${LN_TILES.map(t => `<span><small>${t}</small><b></b></span>`).join('')}</div>
    <div class="lns">${lnScene()}<em class="lnc"></em></div>
    <div class="lnl">${LN_STEPS.map((t, i) => `<button type="button" class="lnd" data-lni="${i}"><i>${i + 1}</i><span>${t.lab}</span></button>`).join('')}</div>
    <div class="lnn"><button type="button" class="lnb" data-ln="-1">上一步</button><button type="button" class="lnb pri" data-ln="1"><span></span><b>→</b></button></div>
  </div>`;
}
function lnGo(el, i, quiet){
  const n = LN_STEPS.length; i = (i + n) % n; el._i = i;
  const t = LN_STEPS[i], c = lnP(t.x + .65, 1.4, .7), m = lnP(t.x + .65, 2.2);
  el.querySelector('.lnw').style.transform = `translate(${-c[0]}px,${-c[1]}px)`;
  el.querySelector('.lnm').style.transform = `translate(${m[0]}px,${m[1]}px)`;
  el.querySelectorAll('.lnt span').forEach((sp, k) => {
    const b = sp.querySelector('b'), ch = b.textContent !== t.v[k];
    b.textContent = t.v[k];
    if (ch && !quiet) { sp.classList.remove('chg'); void sp.offsetWidth; sp.classList.add('chg'); }
  });
  el.querySelectorAll('.lnd').forEach((d, k) => { d.classList.toggle('done', k < i); d.classList.toggle('on', k === i); });
  el.querySelector('.lnc').textContent = `${i + 1} / ${n}`;
  el.querySelector('.lnb.pri span').textContent = i === n - 1 ? '再看一次' : '下一步：' + LN_STEPS[i + 1].lab;
  el.querySelector('.lnb[data-ln="-1"]').disabled = i === 0;
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
    el.dataset.on = '1'; lnGo(el, 0, true); if (lnIO) lnIO.observe(el);
    if (still) return;
    const tick = () => {
      if (!el.isConnected) { if (lnIO) lnIO.unobserve(el); return; }
      const idle = performance.now() - (el._user || -1e9) > 9000;
      if (el._vis && !document.hidden && idle) lnGo(el, (el._i || 0) + 1);
      setTimeout(tick, el._i === LN_STEPS.length - 1 ? 2600 : 1700);
    };
    setTimeout(tick, 1500 + i * 300);
  });
}
