/* LP-01 捷運路線導覽：把要介紹的項目排成一條路線，列車一站站開過去，
   到站時底部滑出介紹卡；走到一半地圖由日間切成霓虹夜間，終點給行程總結。
   地圖、路線、列車畫在 canvas（360×450 邏輯座標，自己做透視投影）；
   頂部列、到站卡片、總結卡是 DOM，放在 720×900 的圖層裡整層縮放。
   對外只有 lpHTML() 與 initLps()；點一下跳到下一站。 */
const LP_W = 360, LP_H = 450, LP_F = 430, LP_NIGHT = 3;
/* 站名、一句話、類別代號、類別數、路線色 */
const LP_STOPS = [
  ['導覽', '讓人知道現在在哪、還能去哪', 'BN · TB · SD · TA', '4 類', '#ff4d3d'],
  ['頁面', '整頁版面：儀表板、到達頁、登入', 'DB · LP · AU · ST · OB', '5 類', '#ff9a1f'],
  ['內容', '把資料裝進卡片、列表與圖表', 'CD · LS · DT · CH · ES', '5 類', '#35b84f'],
  ['輸入', '按鈕、表單、開關與搜尋', 'BT · FM · SW · SR', '4 類', '#12b5c9'],
  ['回饋', '對話框、通知與載入狀態', 'MD · NT · LD', '3 類', '#4f7dff'],
  ['風格', '配色、背景、字體、動效與圖示', 'CL · BG · TY · MO · IC', '5 類', '#a55cff']
];
const LP_N = LP_STOPS.length;
const LP_DEMO = [
  '<span></span><i></i><i></i><i></i><i></i>',
  '<i></i><b></b><span></span><span></span><span></span>',
  '<span></span><span></span><span></span>',
  '<i><b></b></i><span>送出</span><em></em>',
  '<span><i></i>已儲存</span><b><i></i></b>',
  '<i></i><i></i><i></i><i></i><i></i><b>Aa</b>'
];
const lpPad = n => String(n).padStart(2, '0');
const lpClamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lpEase = u => { u = lpClamp(u, 0, 1); return u * u * (3 - 2 * u); };
const lpOut = u => 1 - Math.pow(1 - lpClamp(u, 0, 1), 3);
const lpLerp = (a, b, u) => a + (b - a) * u;
const lpRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lpMix = (a, b, n, al) => { const c = a.map((v, i) => Math.round(v + (b[i] - v) * n)); return al == null ? `rgb(${c})` : `rgba(${c},${al})`; };
const LP_C = Object.fromEntries(Object.entries({
  bg: ['#efe9dc', '#0e1330'], river: ['#b9daf2', '#16306b'], park: ['#cfe6c0', '#12303a'], road: ['#d6cebd', '#1e2757'],
  ink: ['#16181d', '#ffffff'], ring: ['#16181d', '#ffffff'], disc: ['#ffffff', '#0e1330'],
  side: ['#e7e9ee', '#232a4d'], end: ['#d5d9e1', '#1a2040'], roof: ['#fbfbfc', '#313a66'], roofIn: ['#dfe3ea', '#262d52'], win: ['#36435f', '#ffd45e']
}).map(([k, v]) => [k, v.map(lpRgb)]));

/* 路線：站點都在直線段上，轉角另外倒圓；LP_PTS 是加密後的折線，LP_ARC 是累計長度 */
const LP_WAY = [[-230, 110], [-120, 110, 0], [-20, 110, 1], [50, 110], [95, 65, 2], [140, 20], [140, -50, 3], [140, -80], [100, -120], [10, -120, 4], [-100, -120, 5]];
const LP_PTS = [], LP_ARC = [], LP_S = [];
(() => {
  const stopAt = [];
  LP_WAY.forEach((w, j) => {
    const a = LP_WAY[j - 1], c = LP_WAY[j + 1];
    if (!a || !c || w[2] != null) { if (w[2] != null) stopAt[w[2]] = LP_PTS.length; LP_PTS.push([w[0], w[1]]); return; }
    const la = Math.hypot(a[0] - w[0], a[1] - w[1]), lc = Math.hypot(c[0] - w[0], c[1] - w[1]), r = Math.min(20, la / 2, lc / 2);
    const p0 = [w[0] + (a[0] - w[0]) / la * r, w[1] + (a[1] - w[1]) / la * r], p1 = [w[0] + (c[0] - w[0]) / lc * r, w[1] + (c[1] - w[1]) / lc * r];
    for (let q = 0; q <= 6; q++) { const u = q / 6, m = 1 - u; LP_PTS.push([m * m * p0[0] + 2 * m * u * w[0] + u * u * p1[0], m * m * p0[1] + 2 * m * u * w[1] + u * u * p1[1]]); }
  });
  let s = 0; LP_PTS.forEach((p, i) => { if (i) s += Math.hypot(p[0] - LP_PTS[i - 1][0], p[1] - LP_PTS[i - 1][1]); LP_ARC.push(s); });
  stopAt.forEach((idx, i) => { LP_S[i] = LP_ARC[idx]; });
})();
const LP_LEN = LP_ARC[LP_ARC.length - 1], LP_START = 96;
function lpPos(s){
  s = lpClamp(s, 0, LP_LEN); let i = 1; while (i < LP_ARC.length - 1 && LP_ARC[i] < s) i++;
  const a = LP_PTS[i - 1], b = LP_PTS[i], u = (s - LP_ARC[i - 1]) / ((LP_ARC[i] - LP_ARC[i - 1]) || 1);
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}
function lpSub(a, b){ const out = [lpPos(a)]; LP_PTS.forEach((p, i) => { if (LP_ARC[i] > a + .01 && LP_ARC[i] < b - .01) out.push(p); }); out.push(lpPos(b)); return out; }
function lpRibbon(pts, w){
  const L = [], R = [];
  pts.forEach((p, i) => {
    const a = pts[i - 1] || p, b = pts[i + 1] || p; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    L.push([p[0] - ty * w / 2, p[1] + tx * w / 2]); R.unshift([p[0] + ty * w / 2, p[1] - tx * w / 2]);
  });
  return L.concat(R);
}
const LP_RIVER = lpRibbon(Array.from({length: 17}, (_, i) => { const x = -480 + i * 60; return [x, -8 + 13 * Math.sin(x / 85)]; }), 40);
const LP_PARKS = [[-95, 30, 70, 46], [10, 140, 86, 34], [-215, -90, 64, 60], [178, -28, 56, 66], [-40, -200, 96, 44], [196, 118, 60, 54], [-190, 150, 60, 40], [40, 28, 50, 30]]
  .map(([x, y, w, h]) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const LP_ROADS = [[[-480, 178], [480, 178]], [[-480, 62], [480, 62]], [[-480, -160], [480, -160]], [[-160, -330], [-160, 330]], [[0, -330], [0, 330]], [[205, -330], [205, 330]], [[-480, -230], [-250, -60], [-250, 330]], [[90, 330], [300, 120], [480, 120]]];
const LP_GRID = (() => { const g = []; for (let v = -420; v <= 420; v += 60) { g.push([[v, -330], [v, 330]]); if (Math.abs(v) <= 300) g.push([[-480, v], [480, v]]); } return g; })();
const LP_CIRC = Array.from({length: 22}, (_, i) => [Math.cos(i / 22 * Math.PI * 2), Math.sin(i / 22 * Math.PI * 2)]);
/* 站名標籤相對站點的位置（單位是字級）：往東、往西的站放線的下方，往南的站放右邊 */
const LP_LAB = [[0, 2.5, 'c'], [0, 2.5, 'c'], [2.3, .6, 'l'], [2.3, .2, 'l'], [0, 2.5, 'c'], [0, 2.5, 'c']];
const LP_YAW = [-.42, -.2, .1, .3, .16, -.14];

/* 鏡頭：看向 (tx,ty)，yaw 繞垂直軸，pitch 90° 是正俯視；ox/oy 是目標點落在畫面上的位置 */
const LP_OV = {
  intro: {tx: -40, ty: -5, yaw: 0, pitch: 1.5, D: 590, ox: 180, oy: 285},
  sum: {tx: -40, ty: -5, yaw: 0, pitch: 1.5, D: 690, ox: 180, oy: 142}
};
function lpFollow(s, yaw){ const p = lpPos(s - 16); return {tx: p[0], ty: p[1], yaw, pitch: .92, D: 215, ox: 180, oy: 152}; }
function lpCamMix(a, b, u){ const o = {}; for (const k in a) o[k] = lpLerp(a[k], b[k], u); return o; }
function lpP(c, x, y, z){
  const dx = x - c.tx, dy = y - c.ty, rx = dx * c.cy + dy * c.sy, ry = -dx * c.sy + dy * c.cy;
  const d = Math.max(45, c.D + ry * c.cp - (z || 0) * c.sp), k = LP_F / d;
  return [c.ox + rx * k, c.oy - (ry * c.sp + (z || 0) * c.cp) * k, d];
}

/* 時間表：開場 → (前往第 i 站 → 停靠) × N → 總結，整段循環 */
const LP_SCHED = (() => {
  const a = [['intro', 0, 3]]; for (let i = 0; i < LP_N; i++) a.push(['go', i, i ? 1.15 : 1.8], ['stay', i, 2.4]); a.push(['sum', 0, 5.6]);
  let t = 0; return a.map(([type, i, d]) => { const o = {type, i, d, t0: t}; t += d; return o; });
})();
const LP_TOTAL = LP_SCHED.reduce((s, p) => s + p.d, 0);
function lpAt(t){ t = ((t % LP_TOTAL) + LP_TOTAL) % LP_TOTAL; const ph = LP_SCHED.find(p => t < p.t0 + p.d) || LP_SCHED[0]; return [ph, (t - ph.t0) / ph.d]; }
function lpState(ph, u){
  const i = ph.i, last = LP_N - 1;
  if (ph.type === 'intro') return {s: LP_START, cam: LP_OV.intro, n: 0, draw: lpEase(u * 3 / 2), fade: lpClamp(u * 5, 0, 1), reached: -1, rip: -1};
  if (ph.type === 'go') {
    const e = lpEase(u), s = lpLerp(i ? LP_S[i - 1] : LP_START, LP_S[i], e);
    const cam = i ? lpFollow(s, lpLerp(LP_YAW[i - 1], LP_YAW[i], e)) : lpCamMix(LP_OV.intro, lpFollow(s, LP_YAW[0]), e);
    return {s, cam, n: i > LP_NIGHT ? 1 : i === LP_NIGHT ? lpEase(u) : 0, draw: 1, fade: 1, reached: u > .94 ? i : i - 1, rip: -1};
  }
  if (ph.type === 'stay') return {s: LP_S[i], cam: lpFollow(LP_S[i], LP_YAW[i]), n: i >= LP_NIGHT ? 1 : 0, draw: 1, fade: 1, reached: i, rip: u * ph.d};
  const tail = lpClamp((u * ph.d - (ph.d - .7)) / .7, 0, 1);
  const cam = tail > 0 ? lpCamMix(LP_OV.sum, LP_OV.intro, lpEase(tail)) : lpCamMix(lpFollow(LP_S[last], LP_YAW[last]), LP_OV.sum, lpEase(u * ph.d / 1.4));
  return {s: LP_S[last], cam, n: 1 - lpEase(tail), draw: 1, fade: 1 - tail, reached: last, rip: -1};
}

function lpPath(c, cam, pts, close){ c.beginPath(); pts.forEach((p, i) => { const q = lpP(cam, p[0], p[1], p[2] || 0); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); if (close) c.closePath(); }
function lpFill(c, cam, pts, fill){ lpPath(c, cam, pts, true); c.fillStyle = fill; c.fill(); }
function lpCar(c, cam, p, dir, col, n){
  const L = 13, Wd = 4.7, z0 = 1.4, z1 = 10.6, ax = dir[0], ay = dir[1], nx = -ay, ny = ax;
  const at = (u, v, z) => [p[0] + ax * u * L + nx * v * Wd, p[1] + ay * u * L + ny * v * Wd, z];
  const quad = (q, fill) => lpFill(c, cam, q, fill);
  const depth = q => q.reduce((s, v) => s + lpP(cam, v[0], v[1], v[2])[2], 0) / q.length;
  const faces = [];
  [-1, 1].forEach(v => faces.push({q: [at(-1, v, z0), at(1, v, z0), at(1, v, z1), at(-1, v, z1)], side: v}));
  [-1, 1].forEach(u => faces.push({q: [at(u, -1, z0), at(u, 1, z0), at(u, 1, z1), at(u, -1, z1)], end: u}));
  faces.forEach(f => { f.d = depth(f.q); }); faces.sort((a, b) => b.d - a.d);
  faces.forEach(f => {
    quad(f.q, lpMix(f.side ? LP_C.side[0] : LP_C.end[0], f.side ? LP_C.side[1] : LP_C.end[1], n));
    if (f.side) {
      const v = f.side; quad([at(-1, v, 2.6), at(1, v, 2.6), at(1, v, 4.2), at(-1, v, 4.2)], col);
      for (let w = 0; w < 4; w++) { const u0 = -.84 + w * .44; quad([at(u0, v, 5.6), at(u0 + .34, v, 5.6), at(u0 + .34, v, 8.9), at(u0, v, 8.9)], lpMix(LP_C.win[0], LP_C.win[1], n)); }
    } else quad([at(f.end, -.6, 5.6), at(f.end, .6, 5.6), at(f.end, .6, 8.9), at(f.end, -.6, 8.9)], lpMix(LP_C.win[0], LP_C.win[1], n));
  });
  quad([at(-1, -1, z1), at(1, -1, z1), at(1, 1, z1), at(-1, 1, z1)], lpMix(LP_C.roof[0], LP_C.roof[1], n));
  quad([at(-.8, -.5, z1), at(.8, -.5, z1), at(.8, .5, z1), at(-.8, .5, z1)], lpMix(LP_C.roofIn[0], LP_C.roofIn[1], n));
}
function lpRR(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

function lpDraw(el, t){
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'), [ph, u] = lpAt(t), st = lpState(ph, u), key = ph.type + ph.i;
  if (el._key !== key) { el._key = key; lpPhase(el, ph); }
  const night = st.n > .5; if (el._night !== night) { el._night = night; el.classList.toggle('night', night); }
  const cam = Object.assign({}, st.cam), n = st.n, k = cv.width / LP_W;
  cam.cy = Math.cos(cam.yaw); cam.sy = Math.sin(cam.yaw); cam.cp = Math.cos(cam.pitch); cam.sp = Math.sin(cam.pitch);
  const mix = (name, al) => lpMix(LP_C[name][0], LP_C[name][1], n, al);
  c.setTransform(k, 0, 0, k, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.lineJoin = 'round'; c.lineCap = 'round';
  c.fillStyle = mix('bg'); c.fillRect(0, 0, LP_W, LP_H);
  lpFill(c, cam, LP_RIVER, mix('river')); LP_PARKS.forEach(p => lpFill(c, cam, p, mix('park')));
  c.strokeStyle = mix('road'); c.lineWidth = 1.1; LP_ROADS.forEach(r => { lpPath(c, cam, r); c.stroke(); });
  if (n > .02) { c.globalAlpha = n * .55; c.lineWidth = .7; LP_GRID.forEach(r => { lpPath(c, cam, r); c.stroke(); }); c.globalAlpha = 1; }

  /* 路線：第 i 段（前一站到第 i 站）用第 i 站的顏色；夜間加兩層發光 */
  const sEnd = st.draw * LP_LEN;
  for (let i = 0; i < LP_N; i++) {
    const a = i ? LP_S[i - 1] : 0, b = Math.min(LP_S[i], sEnd); if (b <= a) break;
    const pts = lpSub(a, b), col = LP_STOPS[i][4];
    if (n > .02) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = n * n * .16 * st.fade; lpFill(c, cam, lpRibbon(pts, 24), col); c.globalAlpha = n * n * .26 * st.fade; lpFill(c, cam, lpRibbon(pts, 13), col); c.globalCompositeOperation = 'source-over'; }
    c.globalAlpha = st.fade; lpFill(c, cam, lpRibbon(pts, 6.4), col);
    if (n > .02) { c.globalAlpha = n * .55 * st.fade; lpFill(c, cam, lpRibbon(pts, 1.6), '#fff'); }
  }
  /* 站點與到站波紋 */
  const labels = [];
  LP_STOPS.forEach((sp, i) => {
    if (LP_S[i] > sEnd + .5) return;
    const p = lpPos(LP_S[i]), q = lpP(cam, p[0], p[1], 0), ks = LP_F / q[2], col = sp[4], on = i <= st.reached;
    const ring = r => LP_CIRC.map(v => [p[0] + v[0] * r, p[1] + v[1] * r]);
    c.globalAlpha = st.fade;
    if (st.rip >= 0 && i === ph.i) {
      c.globalAlpha = .14; lpFill(c, cam, ring(20), col);
      for (let j = 0; j < 2; j++) { const w = (st.rip / 1.3 + j * .5) % 1; c.globalAlpha = (1 - w) * .6; lpPath(c, cam, ring(8 + w * 24), true); c.strokeStyle = col; c.lineWidth = 1.3 * ks; c.stroke(); }
      c.globalAlpha = 1;
    }
    lpFill(c, cam, ring(7.4), mix('ring')); lpFill(c, cam, ring(4.9), on ? col : mix('disc'));
    if (on && n < .98) lpFill(c, cam, ring(2), '#fff');
    labels.push([i, q, ks]);
  });
  /* 列車：三節車廂，離鏡頭遠的先畫 */
  c.globalAlpha = st.fade;
  const cars = [0, 1, 2].map(j => { const s = st.s - 13.5 - j * 29, p = lpPos(s), a = lpPos(s - 5), b = lpPos(s + 5), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return {p, dir: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], d: lpP(cam, p[0], p[1], 0)[2]}; });
  let seg = 0; while (seg < LP_N - 1 && LP_S[seg] < st.s - .5) seg++;
  cars.forEach(o => { const ax = o.dir[0], ay = o.dir[1]; lpFill(c, cam, [[-14.5, -6.6], [14.5, -6.6], [14.5, 6.6], [-14.5, 6.6]].map(([a, b]) => [o.p[0] + ax * a - ay * b + 2.5, o.p[1] + ay * a + ax * b - 2.5]), `rgba(0,0,0,${.2 + n * .2})`); });
  cars.sort((a, b) => b.d - a.d).forEach(o => lpCar(c, cam, o.p, o.dir, LP_STOPS[seg][4], n));
  /* 站名標籤（畫在螢幕座標，大小跟著遠近） */
  c.textBaseline = 'middle';
  labels.forEach(([i, q, ks]) => {
    const fs = lpClamp(5.4 * ks, 4.4, 12), lab = LP_LAB[i], num = lpPad(i + 1), name = LP_STOPS[i][0];
    c.font = `800 ${fs}px "Schibsted Grotesk","Noto Sans TC",system-ui,sans-serif`;
    const nw = c.measureText(num).width + fs * .9, tw = c.measureText(name).width, tot = nw + fs * .45 + tw;
    const x = q[0] + lab[0] * fs - (lab[2] === 'c' ? tot / 2 : 0), y = q[1] + lab[1] * fs;
    c.globalAlpha = st.fade * (n > .5 ? .0 : .78); lpRR(c, x - fs * .35, y - fs * .85, tot + fs * .9, fs * 1.7, fs * .85); c.fillStyle = mix('bg'); c.fill();
    c.globalAlpha = st.fade; lpRR(c, x, y - fs * .62, nw, fs * 1.24, fs * .62); c.fillStyle = LP_STOPS[i][4]; c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(num, x + nw / 2, y + fs * .04);
    c.fillStyle = mix('ink'); c.textAlign = 'left'; c.fillText(name, x + nw + fs * .45, y + fs * .04);
  });
  c.globalAlpha = 1;
}

/* DOM 部分 */
const LP_GRAD = `linear-gradient(90deg,${LP_STOPS.map(s => s[4]).join(',')})`;
function lpCardHTML(i){
  const s = LP_STOPS[i], nx = LP_STOPS[i + 1];
  return `<header><em>${lpPad(i + 1)}</em><p><b>NOW ARRIVING${nx ? '' : ' · TERMINUS'}</b><small>${nx ? '下一站　' + nx[0] : '本線終點'}</small></p><span>${lpPad(i + 1)} / ${lpPad(LP_N)}</span></header>
    <h4>${s[0]}</h4><p class="lpcd">${s[1]}</p><p class="lpcl"><span>${s[2]}</span><u>${s[3]}</u></p><div class="lpd d${i}">${LP_DEMO[i]}</div>`;
}
function lpHTML(){
  const dots = LP_STOPS.map((s, i) => `<i style="left:${i / (LP_N - 1) * 100}%;--c:${s[4]}"></i>`).join('');
  return `<div class="lpx" data-ph="intro" role="group" aria-label="捷運路線導覽示範，點一下跳到下一站"><canvas aria-hidden="true"></canvas><div class="lpu">
    <div class="lpt"><span>整座靈感庫，</span><span>只要 <b style="background-image:${LP_GRAD}">${LP_N} 站</b>。</span></div>
    <div class="lptk"><i></i>LINE U · ${LP_N} STOPS · FARE $0</div>
    <div class="lpb"><em>U</em><p><b>靈感線</b><small>往 ${LP_STOPS[LP_N - 1][0]} · ${LP_N} 站</small></p><span class="lpbs">STOP 01</span><u>FARE $0</u>
      <div class="lpp"><div class="lppf"><s style="background-image:${LP_GRAD}"></s></div>${dots}</div></div>
    <div class="lpc"></div>
    <div class="lps"><p class="lpsk"><span>TRIP SUMMARY</span><em>ARRIVED ✓</em></p><h4>${LP_N} 站，<i style="background-image:${LP_GRAD}">一條線。</i></h4>
      <p class="lpsf"><span>總票價</span><b>$0</b></p><ul>${LP_STOPS.map(s => `<li><i style="background:${s[4]}"></i>${s[0]}<small>${s[2]}</small></li>`).join('')}</ul><p class="lpsb">點一下再搭一次</p></div>
  </div></div>`;
}
function lpPhase(el, ph){
  const card = el.querySelector('.lpc'), i = ph.i; el.dataset.ph = ph.type;
  const prog = n => {
    el.querySelector('.lppf').style.width = n / (LP_N - 1) * 100 + '%';
    el.querySelectorAll('.lpp > i').forEach((d, j) => { d.className = j < n ? 'done' : j === n ? 'cur' : ''; });
    el.querySelector('.lpbs').textContent = 'STOP ' + lpPad(n + 1);
  };
  if (ph.type === 'intro') { card.className = 'lpc'; prog(0); }
  else if (ph.type === 'go') { prog(i); card.className = i ? 'lpc outL' : 'lpc'; }
  else if (ph.type === 'stay') {
    prog(i); card.innerHTML = lpCardHTML(i); card.style.setProperty('--c', LP_STOPS[i][4]);
    card.className = i ? 'lpc inR' : 'lpc'; void card.offsetWidth; card.className = 'lpc on';
  } else { prog(LP_N - 1); card.className = 'lpc'; }
}
let lpIO = null, lpRO = null, lpRun = false;
function lpFit(el){
  const w = el.clientWidth; if (!w) return; el.style.setProperty('--k', w / LP_W);
  const cv = el.querySelector('canvas'), r = Math.min(2, window.devicePixelRatio || 1), W = Math.round(w * r), H = Math.round(w * LP_H / LP_W * r);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; lpDraw(el, el._t); }
}
function initLps(){
  const still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!lpIO && 'IntersectionObserver' in window) lpIO = new IntersectionObserver(es => es.forEach(en => { en.target._vis = en.isIntersecting; }), {threshold: .3});
  if (!lpRO && 'ResizeObserver' in window) lpRO = new ResizeObserver(es => es.forEach(en => lpFit(en.target)));
  const stayT = i => { const p = LP_SCHED.find(x => x.type === 'stay' && x.i === i); return p.t0 + p.d * .5; };
  document.querySelectorAll('.lpx:not([data-on])').forEach(el => {
    el.dataset.on = '1'; el._vis = !lpIO; el._t = still ? stayT(0) : 0;
    if (lpIO) lpIO.observe(el); if (lpRO) lpRO.observe(el);
    lpFit(el); lpDraw(el, el._t);
    el.addEventListener('click', ev => {
      ev.stopPropagation(); const [ph] = lpAt(el._t);
      if (still) el._t = ph.type === 'sum' ? stayT(0) : ph.i >= LP_N - 1 ? LP_SCHED[LP_SCHED.length - 1].t0 + 2 : stayT(ph.i + 1);
      else { const nx = LP_SCHED[LP_SCHED.indexOf(ph) + 1]; el._t = nx ? nx.t0 + .001 : 0; }
      lpDraw(el, el._t);
    });
  });
  if (lpRun || still) return; lpRun = true;
  let last = performance.now();
  const loop = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const all = document.querySelectorAll('.lpx[data-on]');
    if (!document.hidden) all.forEach(el => { if (el._vis) { el._t = (el._t + dt) % LP_TOTAL; lpDraw(el, el._t); } });
    if (all.length) requestAnimationFrame(loop); else lpRun = false;
  };
  requestAnimationFrame(loop);
}
