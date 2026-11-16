/* CD-01 三檢視卡片展示：同一批 14 張卡片在「螺旋／堆疊／網格」三種檢視間切換，
   每張卡片有自己的小動效，點開是工作區面板（滑桿、樣式色票、放大預覽）。
   版面以 420×300 的邏輯座標排，外層依容器寬度等比縮放（--k）。
   對外只有 cdHTML() 與 initCds()；點擊與拖曳都在這裡自己處理。 */
const CD_W = 420, CD_H = 300, CD_CW = 236, CD_CH = 156, CD_TAU = Math.PI * 2;
const CD_CATS = [['motion', '動態'], ['physics', '物理'], ['data', '資料'], ['2d', '2D'], ['3d', '3D'], ['video', '影片'], ['sound', '聲音']];
const CD_CAT = Object.fromEntries(CD_CATS);
/* 名稱、一句話、分類、色相、程式碼列 */
const CD_ITEMS = [
  ['交錯彈跳', '一排圓點依序彈起', 'motion', 8, 'stagger(dots, { delay: 80 })'],
  ['彈簧開關', '開關帶著回彈滑到定位', 'motion', 24, 'spring({ tension: 180, friction: 12 })'],
  ['粒子爆發', '粒子從中心噴出再落下', 'motion', 338, 'burst({ count: 80, gravity: 0.4 })'],
  ['流場線條', '線條順著雜訊場流動', 'motion', 44, 'flow({ scale: 0.005, agents: 120 })'],
  ['剛體掉落', '方塊與圓球落地彈跳', 'physics', 95, 'world({ gravity: 1, bounce: 0.6 })'],
  ['長條轉場', '換資料時長條錯開長高', 'data', 160, 'bars.transition().duration(750)'],
  ['洋蔥皮逐格', '逐格動畫，留前幾格殘影', '2d', 325, 'onion({ frames: 8, skins: 3 })'],
  ['圖片變立體', '一張平面圖變成立體模型', '3d', 255, 'mesh = toModel(image)'],
  ['點雲成形', '散點聚成實心立體', '3d', 272, 'solid = cloud.remesh(0.9)'],
  ['影音生成', '畫面與聲波一起產生', 'video', 225, 'clip = render(prompt, { audio: true })'],
  ['靜照動起來', '靜態頭像開始眨眼擺動', 'video', 212, 'animate(portrait, driving)'],
  ['補幀 8×', '兩格之間補出中間格', 'video', 190, 'interpolate(a, b, { factor: 8 })'],
  ['聲波生成', '聲波由左到右長出來', 'sound', 135, 'audio = compose("lofi, 100 bpm")'],
  ['節拍音序器', '播放頭掃過格子打節拍', 'sound', 150, 'sequence(pattern, "16n")']
];
const CD_N = CD_ITEMS.length;
const CD_TONES = [['原色', 0], ['暖色', 1], ['冷色', 2], ['灰階', 3]];
const CD_KNOT_TONES = ['亮面', '黏土', '線框', '金屬'];
const cdPad = n => String(n).padStart(2, '0');
const cdRnd = x => { const s = Math.sin(x * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
const cdEase = u => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
const cdClamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cdDot = (c, x, y, r, f) => { c.beginPath(); c.arc(x, y, Math.max(.1, r), 0, CD_TAU); c.fillStyle = f; c.fill(); };
function cdRR(c, x, y, w, h, r){
  r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)); c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function cdArrow(c, x0, x1, y, t, col){
  c.save(); c.strokeStyle = col; c.lineWidth = 1.2; c.setLineDash([3, 3]); c.lineDashOffset = -t * 14;
  c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.setLineDash([]);
  c.beginPath(); c.moveTo(x1 - 4, y - 3.5); c.lineTo(x1 + 1, y); c.lineTo(x1 - 4, y + 3.5); c.stroke(); c.restore();
}
/* 方塊組成的立體物件（椅子），畫家演算法排面 */
const CD_CHAIR = [[0, 0, 0, 1, .14, 1], [0, .6, -.43, 1, 1.06, .14], [-.42, -.55, -.42, .14, .96, .14], [.42, -.55, -.42, .14, .96, .14], [-.42, -.55, .42, .14, .96, .14], [.42, -.55, .42, .14, .96, .14]];
function cdBoxes(c, boxes, cx, cy, sc, ry, rx, C){
  const cyR = Math.cos(ry), syR = Math.sin(ry), cxR = Math.cos(rx), sxR = Math.sin(rx), faces = [];
  const F = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
  for (const [bx, by, bz, sx, sy, sz] of boxes) {
    const v = [];
    for (let i = 0; i < 8; i++) {
      const x = bx + (i & 4 ? .5 : -.5) * sx, y = by + (i & 2 ? .5 : -.5) * sy, z = bz + (i & 1 ? .5 : -.5) * sz;
      const x1 = x * cyR + z * syR, z1 = -x * syR + z * cyR, y1 = y * cxR - z1 * sxR, z2 = y * sxR + z1 * cxR;
      v.push([cx + x1 * sc, cy - y1 * sc, z2]);
    }
    for (const f of F) {
      const [a, b, d] = [v[f[0]], v[f[1]], v[f[2]]];
      const nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
      faces.push({p: f.map(i => v[i]), z: f.reduce((s, i) => s + v[i][2], 0) / 4, l: Math.abs(nz) / (sc * sc)});
    }
  }
  faces.sort((a, b) => a.z - b.z);
  for (const f of faces) {
    c.beginPath(); f.p.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
    c.fillStyle = `hsl(${C.h} ${C.s}% ${cdClamp(46 + f.z * 14 + Math.min(.3, f.l) * 40, 30, 82)}%)`; c.fill();
    c.strokeStyle = `hsl(${C.h} ${C.s}% 34% / .5)`; c.lineWidth = .6; c.stroke();
  }
}
/* 三葉結：mix 0 = 散點、1 = 聚成結的點雲；solid 時畫成有厚度的管子 */
function cdKnot(c, cx, cy, R, rot, o){
  const n = o.n, pts = [], cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(.5), st = Math.sin(.5);
  for (let i = 0; i < n; i++) {
    const u = i / n * CD_TAU;
    let x = (Math.sin(u) + 2 * Math.sin(2 * u)) / 3, y = (Math.cos(u) - 2 * Math.cos(2 * u)) / 3, z = -Math.sin(3 * u) / 3;
    if (o.mix < 1) {
      const m = cdEase(o.mix), a = cdRnd(i * 3.7) * CD_TAU, b = cdRnd(i * 9.1) * 2 - 1, r = .5 + cdRnd(i * 5.3) * .9;
      x = x * m + Math.cos(a) * r * (1 - m); y = y * m + b * r * .8 * (1 - m); z = z * m + Math.sin(a) * r * (1 - m);
    }
    const x1 = x * cr + z * sr, z1 = -x * sr + z * cr, y1 = y * ct - z1 * st, z2 = y * st + z1 * ct;
    pts.push([cx + x1 * R, cy + y1 * R, z2, i]);
  }
  if (!o.solid) { for (const p of pts) cdDot(c, p[0], p[1], 1 + (p[2] + 1) * .5, `hsl(${o.h} ${o.s}% ${42 + p[2] * 14}% / .85)`); return; }
  if (o.wire) {
    c.strokeStyle = `hsl(${o.h} ${o.s}% 45%)`; c.lineWidth = 1; c.beginPath();
    pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke();
    for (const p of pts) cdDot(c, p[0], p[1], 1.4, `hsl(${o.h} ${o.s}% 40%)`); return;
  }
  /* 依深度由遠到近畫；每畫一段深色外緣，就把已畫過的相鄰段亮面補回來，管身才不會出現一節一節的環紋 */
  const zs = pts.map((p, i) => (p[2] + pts[(i + 1) % n][2]) / 2), order = zs.map((_, i) => i).sort((a, b) => zs[a] - zs[b]), done = new Uint8Array(n);
  const tw = R * .34; c.lineCap = 'round'; c.lineJoin = 'round';
  const seg = (i, dx, dy, lw, col) => { const a = pts[i], b = pts[(i + 1) % n]; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(a[0] + dx, a[1] + dy); c.lineTo(b[0] + dx, b[1] + dy); c.stroke(); };
  const lit = i => {
    const l = o.l0 + (zs[i] + .6) / 1.2 * (o.l1 - o.l0);
    seg(i, -tw * .06, -tw * .08, tw * .78, `hsl(${o.h} ${o.s}% ${cdClamp(l, 8, 94)}%)`);
    if (o.gloss) seg(i, -tw * .22, -tw * .26, tw * .2, `hsl(${o.h} ${Math.min(100, o.s + 10)}% ${cdClamp(l + 26, 10, 97)}% / ${o.gloss})`);
  };
  for (const i of order) {
    const l = o.l0 + (zs[i] + .6) / 1.2 * (o.l1 - o.l0), p = (i + n - 1) % n, q = (i + 1) % n;
    seg(i, 0, 0, tw, `hsl(${o.h} ${o.s}% ${cdClamp(l - 14, 8, 92)}%)`);
    if (done[p]) lit(p); if (done[q]) lit(q); lit(i); done[i] = 1;
  }
}
function cdFace(c, x, y, r, col, live, t){
  c.save(); c.translate(x + (live ? Math.sin(t * 1.6) * r * .16 : 0), y); if (live) c.rotate(Math.sin(t * 1.6) * .09);
  cdDot(c, 0, r * 1.5, r * 1.25, col); cdDot(c, 0, 0, r, live ? '#f6d7c3' : '#d9d9de');
  c.fillStyle = col; c.beginPath(); c.arc(0, -r * .12, r * 1.02, Math.PI * 1.08, Math.PI * 1.92); c.closePath(); c.fill();
  const blink = live && (t % 2.4) < .13 ? .15 : 1;
  for (const s of [-1, 1]) { c.save(); c.translate(s * r * .36, r * .08); c.scale(1, blink); cdDot(c, 0, 0, r * .11, '#1b1b1f'); c.restore(); }
  const open = live ? Math.abs(Math.sin(t * 4.2)) * r * .2 : 0;
  c.strokeStyle = '#1b1b1f'; c.lineWidth = Math.max(1, r * .08); c.beginPath();
  if (open > r * .05) { c.ellipse(0, r * .5, r * .2, open, 0, 0, CD_TAU); c.fillStyle = '#7a2b2b'; c.fill(); } else { c.arc(0, r * .36, r * .26, .2 * Math.PI, .8 * Math.PI); c.stroke(); }
  c.restore();
}
/* 14 個小動效：(ctx, 寬, 高, 時間, 這張畫布的狀態, 參數, 顏色) */
const CD_DRAW = [
  (c, w, h, t, S, P, C) => {                                 /* 交錯彈跳 */
    const n = Math.round(6 + P.detail * 10), x0 = w * .34, gap = w * .62 / n, f = u => 1 - Math.exp(-5 * u) * Math.cos(11 * u);
    c.strokeStyle = C.a; c.lineWidth = 1.4; c.beginPath();
    for (let i = 0; i <= 40; i++) { const u = i / 40, x = w * .04 + u * w * .24, y = h * .82 - f(u) * h * .5; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    const u = (t * .5) % 1; cdDot(c, w * .04 + u * w * .24, h * .82 - f(u) * h * .5, 2.6, C.a);
    for (let i = 0; i < n; i++) {
      const x = x0 + gap * (i + .5), ph = ((t * .9 - i * .07) % 1.6 + 1.6) % 1.6, b = ph < .8 ? Math.sin(ph / .8 * Math.PI) : 0;
      c.strokeStyle = C.line; c.lineWidth = 1; c.beginPath(); c.moveTo(x, h * .2); c.lineTo(x, h * .86); c.stroke();
      cdDot(c, x, h * .76 - b * h * .5, Math.min(gap * .34, h * .075), i % 3 === 2 ? C.ink : C.a);
    }
  },
  (c, w, h, t, S, P, C) => {                                 /* 彈簧開關 */
    const per = 1.7, on = Math.floor(t / per) % 2 === 0, u = (t % per) / per * 2.2, damp = 2 + P.detail * 5;
    const f = v => 1 - Math.exp(-damp * v) * Math.cos(12 * v), sp = f(u), pos = on ? sp : 1 - sp;
    const tw = w * .2, th = Math.min(h * .34, tw * .55), tx = w * .06, ty = h * .5 - th / 2;
    cdRR(c, tx, ty, tw, th, th / 2); c.fillStyle = '#cfcfd6'; c.fill();
    c.globalAlpha = cdClamp(pos, 0, 1); cdRR(c, tx, ty, tw, th, th / 2); c.fillStyle = C.a; c.fill(); c.globalAlpha = 1;
    cdDot(c, tx + th / 2 + pos * (tw - th), h * .5, th * .39, '#fff');
    const gx = w * .36, gw = w * .58, gy = h * .8, gh = h * .46;
    c.strokeStyle = C.line; c.lineWidth = 1; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(gx, gy - gh); c.lineTo(gx + gw, gy - gh); c.stroke(); c.setLineDash([]);
    c.strokeStyle = C.a; c.lineWidth = 1.5; c.beginPath();
    for (let i = 0; i <= 60; i++) { const v = i / 60 * 2.2, x = gx + i / 60 * gw, y = gy - f(v) * gh; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    cdDot(c, gx + Math.min(1, u / 2.2) * gw, gy - sp * gh, 2.8, C.ink);
  },
  (c, w, h, t, S, P, C) => {                                 /* 粒子爆發 */
    const per = 1.8, k = Math.floor(t / per), u = t % per, n = Math.round(20 + P.detail * 80);
    for (let i = 0; i < n; i++) {
      const r1 = cdRnd(k * 131 + i), r2 = cdRnd(k * 71 + i * 7 + 3), a = r1 * CD_TAU, sp = (.25 + r2 * .75) * h * .9;
      c.globalAlpha = Math.max(0, 1 - u / 1.5);
      cdDot(c, w / 2 + Math.cos(a) * sp * u * 1.5, h * .45 + Math.sin(a) * sp * u * .8 + h * .5 * u * u, 1.1 + r2 * 2.3, i % 4 === 0 ? C.ink : `hsl(${C.h + (i % 5) * 14 - 20} ${C.s}% ${50 + (i % 3) * 10}%)`);
    }
    c.globalAlpha = 1;
  },
  (c, w, h, t, S, P, C) => {                                 /* 流場線條 */
    const n = Math.round(8 + P.detail * 24), st = w * .012; c.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      let x = cdRnd(i * 3.1) * w, y = cdRnd(i * 7.7) * h; c.beginPath(); c.moveTo(x, y);
      for (let s = 0; s < 34; s++) { const a = (Math.sin(x / w * 7 + t * .5) + Math.cos(y / h * 4 - t * .35) + Math.sin((x + y) / w * 4)) * 1.6; x += Math.cos(a) * st; y += Math.sin(a) * st; c.lineTo(x, y); }
      c.strokeStyle = `hsl(${C.h + (i % 3) * 8} ${C.s * .9}% ${38 + (i % 4) * 8}% / .75)`; c.stroke();
    }
  },
  (c, w, h, t, S, P, C) => {                                 /* 剛體掉落 */
    const n = Math.round(5 + P.detail * 9);
    if (!S.b || S.n !== n || t - S.t0 > 4.2 || t < S.t0) { S.n = n; S.t0 = t; S.lt = t; S.b = Array.from({length: n}, (_, i) => ({x: .08 + cdRnd(i + t) * .84, y: -.2 - cdRnd(i * 5 + t) * 1.3, vy: 0, vx: (cdRnd(i * 9 + t) - .5) * .3, r: .08 + cdRnd(i * 2) * .06, sq: i % 3 === 1, rot: 0})); }
    const dt = cdClamp(t - S.lt, 0, .033); S.lt = t;
    c.strokeStyle = C.line; c.lineWidth = 1; c.beginPath(); c.moveTo(w * .03, h * .92); c.lineTo(w * .97, h * .92); c.stroke();
    S.b.forEach((b, i) => {
      b.vy += 3 * dt; b.y += b.vy * dt; b.x += b.vx * dt; b.rot += b.vx * dt * 9;
      const fl = .92 - b.r; if (b.y > fl) { b.y = fl; b.vy *= -.56; b.vx *= .82; if (Math.abs(b.vy) < .08) b.vy = 0; }
      if (b.x < .04 || b.x > .96) { b.vx *= -1; b.x = cdClamp(b.x, .04, .96); }
      const col = i % 4 === 0 ? C.ink : `hsl(${C.h + (i % 3) * 12} ${C.s * .8}% ${42 + (i % 3) * 12}%)`, r = b.r * h;
      if (b.sq) { c.save(); c.translate(b.x * w, b.y * h); c.rotate(b.rot); cdRR(c, -r * .85, -r * .85, r * 1.7, r * 1.7, r * .25); c.fillStyle = col; c.fill(); c.restore(); }
      else cdDot(c, b.x * w, b.y * h, r, col);
    });
  },
  (c, w, h, t, S, P, C) => {                                 /* 長條轉場 */
    const n = Math.round(5 + P.detail * 9), per = 2, k = Math.floor(t / per), u = (t % per) / per, bw = w * .86 / n, pts = [];
    c.strokeStyle = C.line; c.lineWidth = 1;
    for (let g = 0; g < 3; g++) { const y = h * (.3 + g * .2); c.beginPath(); c.moveTo(w * .05, y); c.lineTo(w * .95, y); c.stroke(); }
    for (let i = 0; i < n; i++) {
      const a = .25 + cdRnd(k * 17 + i) * .7, b = .25 + cdRnd((k + 1) * 17 + i) * .7, v = a + (b - a) * cdEase(u * 1.8 - i * .05), x = w * .07 + i * bw;
      cdRR(c, x + bw * .15, h * .9 - v * h * .7, bw * .7, v * h * .7, 1.5); c.fillStyle = C.a; c.fill(); pts.push([x + bw / 2, h * .9 - v * h * .7 - h * .08]);
    }
    c.strokeStyle = C.ink; c.lineWidth = 1.1; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    pts.forEach(p => cdDot(c, p[0], p[1], 1.6, C.ink));
  },
  (c, w, h, t, S, P, C) => {                                 /* 洋蔥皮逐格 */
    const N = 8, f = Math.floor(t * (4 + P.detail * 8)) % N, pos = i => { const u = i / (N - 1); return [w * .12 + u * w * .76, h * .6 - Math.sin(u * Math.PI) * h * .4]; };
    c.strokeStyle = C.line; c.lineWidth = 1; c.setLineDash([2, 3]); c.beginPath();
    for (let i = 0; i <= 30; i++) { const u = i / 30, x = w * .12 + u * w * .76, y = h * .6 - Math.sin(u * Math.PI) * h * .4; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.setLineDash([]);
    for (let s = 3; s >= 1; s--) { if (f - s < 0) continue; const [x, y] = pos(f - s); c.beginPath(); c.arc(x, y, h * .09, 0, CD_TAU); c.strokeStyle = `hsl(${C.h} ${C.s}% 55% / ${.75 - s * .19})`; c.lineWidth = 1.2; c.stroke(); }
    const [x, y] = pos(f); cdDot(c, x, y, h * .1, C.a);
    const cw = w * .76 / N; for (let i = 0; i < N; i++) { cdRR(c, w * .12 + i * cw + 1, h * .84, cw - 2, h * .09, 1.5); c.fillStyle = i === f ? C.ink : C.line; c.fill(); }
  },
  (c, w, h, t, S, P, C) => {                                 /* 圖片變立體 */
    const s = Math.min(h * .78, w * .26), lx = w * .2, rx = w * .78, cy = h * .5;
    cdRR(c, lx - s / 2, cy - s / 2, s, s, 3); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = C.line; c.lineWidth = 1; c.stroke();
    const u = s * .22; c.fillStyle = C.a;
    c.fillRect(lx - u, cy - u * 1.6, u * 2, u * 1.5); c.fillRect(lx - u, cy + u * .1, u * 2, u * .35); c.fillRect(lx - u, cy + u * .45, u * .32, u * 1.2); c.fillRect(lx + u * .68, cy + u * .45, u * .32, u * 1.2);
    cdArrow(c, lx + s / 2 + 6, rx - s / 2 - 8, cy, t, C.a);
    cdBoxes(c, CD_CHAIR, rx, cy + s * .08, s * .36, t * (.6 + P.detail), .32, C);
  },
  (c, w, h, t, S, P, C) => {                                 /* 點雲成形 */
    const big = !!S.big, R = Math.min(h * .44, w * .22) * (big ? 1.25 : 1), n = Math.round(12 + P.detail * 150);
    const tone = P.tone, mat = [{s: 78, l0: 34, l1: 62, gloss: .9}, {s: 26, l0: 66, l1: 88, gloss: 0}, {wire: true, s: 60}, {s: 6, l0: 32, l1: 86, gloss: .95}][tone] || {};
    let mix = 1, solid = true;
    if (big) { const d = t - (S.re ?? -9); if (d < .7) { mix = .35 + d / .7 * .65; solid = false; } }
    else { const u = t % 6; if (u < 1.4) { mix = 0; solid = false; } else if (u < 2.8) { mix = (u - 1.4) / 1.4; solid = false; } }
    cdKnot(c, w / 2, h / 2, R, t * .7, Object.assign({n: solid ? n : Math.max(n, 110), mix, solid, h: C.h0, s: 70}, solid ? mat : {}));
  },
  (c, w, h, t, S, P, C) => {                                 /* 影音生成 */
    const fx = w * .05, fw = w * .36, fy = h * .1, fh = h * .8, g = c.createLinearGradient(0, fy, 0, fy + fh);
    g.addColorStop(0, `hsl(${C.h + 30} 55% 18%)`); g.addColorStop(.62, `hsl(${C.h + 110} 70% 45%)`); g.addColorStop(1, `hsl(${C.h + 170} 90% 62%)`);
    c.save(); cdRR(c, fx, fy, fw, fh, 3); c.clip(); c.fillStyle = g; c.fillRect(fx, fy, fw, fh);
    cdDot(c, fx + fw / 2, fy + fh * .62, fh * .3, `hsl(${C.h + 185} 95% 68%)`);
    c.fillStyle = `hsl(${C.h + 30} 55% 16%)`; for (let i = 0; i < 6; i++) { const y = fy + fh * (.6 + ((i / 6 + t * .12) % 1) * .42); c.fillRect(fx, y, fw, 1 + i * .25); }
    c.fillRect(fx, fy + fh * .92, fw, fh * .1); c.restore();
    const n = Math.round(16 + P.detail * 26), x0 = w * .47, bw = w * .48 / n, u = (t * .28) % 1;
    for (let i = 0; i < n; i++) { const a = (.18 + .82 * Math.abs(Math.sin(i * .9) * Math.cos(i * .23 + 1))) * h * .36; c.fillStyle = i / n < u ? C.a : C.line; cdRR(c, x0 + i * bw + bw * .2, h / 2 - a, bw * .6, a * 2, bw * .3); c.fill(); }
    c.fillStyle = C.ink; c.fillRect(x0 + u * w * .48, h * .08, 1.2, h * .84);
  },
  (c, w, h, t, S, P, C) => {                                 /* 靜照動起來 */
    const s = Math.min(h * .8, w * .26), lx = w * .2, rx = w * .8, cy = h * .5, r = s * .24;
    for (const [x, live] of [[lx, 0], [rx, 1]]) {
      c.save(); cdRR(c, x - s / 2, cy - s / 2, s, s, 3); c.fillStyle = live ? `hsl(${C.h} ${C.s}% 88%)` : '#ececef'; c.fill(); c.clip();
      cdFace(c, x, cy - r * .2, r, live ? C.a : '#9b9ba3', live, t * (.7 + P.detail * .8)); c.restore();
    }
    cdArrow(c, lx + s / 2 + 6, rx - s / 2 - 8, cy, t, C.a);
  },
  (c, w, h, t, S, P, C) => {                                 /* 補幀 */
    const m = Math.round(1 + P.detail * 12), x0 = w * .08, x1 = w * .7, y = h * .36, u = (t * .5) % 1.5, pr = Math.min(1, u / .9);
    c.strokeStyle = C.line; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
    for (let i = 1; i <= m; i++) { const x = x0 + (x1 - x0) * i / (m + 1), on = i / (m + 1) < pr; c.beginPath(); c.arc(x, y, Math.min(h * .055, (x1 - x0) / m * .3), 0, CD_TAU); if (on) { c.fillStyle = C.a; c.fill(); } else { c.strokeStyle = C.a; c.lineWidth = 1; c.stroke(); } }
    cdDot(c, x0, y, h * .085, C.ink); cdDot(c, x1, y, h * .085, C.ink);
    const v = ((t * .6) % 1), bx = x0 + (x1 - x0) * (.5 - .5 * Math.cos(v * Math.PI)); cdDot(c, bx, h * .74, h * .07, C.a);
    c.fillStyle = C.line; c.fillRect(x0, h * .86, x1 - x0, 1);
    c.fillStyle = C.ink; c.font = `600 ${h * .34}px ui-monospace, monospace`; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(`${m + 1}×`, w * .96, h * .52);
  },
  (c, w, h, t, S, P, C) => {                                 /* 聲波生成 */
    const n = Math.round(24 + P.detail * 44), bw = w * .9 / n, u = (t * .38) % 1.5;
    for (let i = 0; i < n; i++) {
      const base = .14 + .86 * Math.abs(Math.sin(i * .5) + Math.sin(i * .17 + 1)) / 2, p = i / n, x = w * .05 + i * bw;
      if (p < u) { const head = u < 1 && u - p < .04, a = base * h * .4 * (1 + .14 * Math.sin(t * 6 + i)) * cdEase((u - p) * 9); cdRR(c, x + bw * .2, h / 2 - a, bw * .6, a * 2, bw * .3); c.fillStyle = head ? C.ink : C.a; c.fill(); }
      else cdDot(c, x + bw / 2, h / 2, .8, C.line);
    }
  },
  (c, w, h, t, S, P, C) => {                                 /* 節拍音序器 */
    const rows = 4, cols = 8 + Math.round(P.detail * 4) * 2, cw = w * .92 / cols, ch = h * .86 / rows, ph = Math.floor(t * 5) % cols, sz = Math.min(cw, ch) * .62;
    cdRR(c, w * .04 + ph * cw, h * .04, cw, h * .92, 3); c.fillStyle = `hsl(${C.h} ${C.s}% 80% / .5)`; c.fill();
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const on = r === 0 ? q % 4 === 0 : cdRnd(r * 31 + q * 7) > .64, hit = on && q === ph, s = sz * (hit ? 1.3 : 1), x = w * .04 + (q + .5) * cw, y = h * .07 + (r + .5) * ch;
      cdRR(c, x - s / 2, y - s / 2, s, s, s * .28); c.fillStyle = hit ? C.ink : on ? C.a : C.line; c.fill();
    }
  }
];
function cdColors(i, tone){
  let h = CD_ITEMS[i][3], s = 72; const h0 = h;
  if (i !== 8) { if (tone === 1) h = (h + 48) % 360; else if (tone === 2) h = (h + 300) % 360; else if (tone === 3) s = 0; }
  return {h, h0, s, a: `hsl(${h} ${s}% 52%)`, line: `hsl(${h} ${s * .5}% 84%)`, ink: '#1b1b1f', bg: `hsl(${h} ${s * .9}% 95%)`};
}
function cdHTML(){
  const cards = CD_ITEMS.map(([name, sub, cat, hue, code], i) => `<span class="cdc" data-i="${i}" style="--ch:${hue}"><span class="cdno">${cdPad(i + 1)}</span><span class="cdin">
      <span class="cdmeta"><span>${cdPad(i + 1)} / ${CD_N}</span><i></i><span>${CD_CAT[cat]}</span><button type="button" class="cdopen">展開 ↗</button></span>
      <b class="cdt">${name}</b><span class="cdsub">${sub}</span><canvas aria-hidden="true"></canvas><span class="cdcode">${code}</span></span></span>`).join('');
  return `<div class="cdx" data-view="stack" role="group" aria-label="三檢視卡片展示示範：可切換螺旋、堆疊、網格，點卡片展開"><div class="cdp">
    <svg class="cdcurve" viewBox="0 0 420 300" aria-hidden="true"><path d="M-10 64 C 120 14, 372 30, 330 122 S 96 150, 150 230"/><circle r="3.2" cx="330" cy="122"/></svg>
    <span class="cdhd"><b>動效工作室</b><span>${CD_N} 個效果 · 3 種檢視</span></span>
    <span class="cdseg"><i class="cdsegi"></i><button type="button" data-v="helix">螺旋</button><button type="button" data-v="stack">堆疊</button><button type="button" data-v="grid">網格</button></span>
    <span class="cdcnt"><button type="button" data-go="-1" aria-label="上一張">‹</button><i></i><span class="cdcc"></span><b></b><span>/ ${CD_N}</span><button type="button" data-go="1" aria-label="下一張">›</button></span>
    <span class="cdh1"><b>${CD_N} 個效果，一個工作室</b><span>點任一張展開 · 下方可篩選分類</span></span>
    <span class="cdcards">${cards}</span>
    <span class="cdrule">${CD_ITEMS.map((_, i) => `<button type="button" data-to="${i}" aria-label="第 ${i + 1} 張"><i></i></button>`).join('')}</span>
    <span class="cdpills"><button type="button" data-cat="all">全部</button>${CD_CATS.map(([k, l]) => `<button type="button" data-cat="${k}">${l}</button>`).join('')}</span>
    <span class="cdw"><span class="cdwh"><i class="cdwd"></i><b></b><span class="cdwsub"></span><span class="cdst"><i></i><em>就緒</em></span><button type="button" class="cdclose" aria-label="關閉">×</button></span>
      <span class="cdwb"><span class="cdvp"><span class="cdlab">預覽</span><button type="button" class="cdpop">⤢ 放大</button><canvas aria-hidden="true"></canvas></span>
      <span class="cdctl">
        <span class="cdsl" data-p="detail"><span class="cdlab">細緻度</span><em></em><span class="cdtr"><i class="cdfl"></i><i class="cdkn"></i></span></span>
        <span class="cdsl" data-p="speed"><span class="cdlab">速度</span><em></em><span class="cdtr"><i class="cdfl"></i><i class="cdkn"></i></span></span>
        <span class="cdlab">樣式</span><span class="cdsw">${[0, 1, 2, 3].map(k => `<button type="button" data-tone="${k}"><i></i><span></span></button>`).join('')}</span>
      </span></span></span>
  </div></div>`;
}
const CD_STACK_TOP = [125, 82, 47, 22, 7], CD_STACK_OP = [1, 1, .85, .6, .3], CD_STACK_BL = [0, 0, .3, .8, 1.4];
function cdLayout(el, opt = {}){
  const st = el._cd, cards = st.cards;
  el.dataset.view = st.view; el.classList.toggle('wopen', st.open);
  cards.forEach((c, i) => {
    const d = (i - st.active + CD_N) % CD_N; let x = 0, cy, z = 0, sc = 1, op = 1, bl = 0, ry = 0, rz = 0, zi = 1, ghost = false, thumb = false, delay = 0;
    if (opt.scatter) { x = (cdRnd(i * 3 + 1) - .5) * 150; cy = 150 + (cdRnd(i * 7 + 2) - .5) * 70; rz = (cdRnd(i * 11) - .5) * 50; sc = .46; zi = 20 - d; thumb = true; }
    else if (st.view === 'stack') {
      if (d < 5) { sc = Math.pow(.9, d); cy = CD_STACK_TOP[d] + 78 * sc; op = CD_STACK_OP[d]; bl = CD_STACK_BL[d]; zi = 30 - d; }
      else if (d === CD_N - 1) { cy = 336; sc = 1.1; op = 0; zi = 40; }
      else { cy = 92; sc = .6; op = 0; zi = 1; }
    } else if (st.view === 'helix') {
      const s = d <= 7 ? d : d - CD_N;
      if (s === 0) { cy = 196; zi = 30; }
      else {
        ghost = true; const a = Math.abs(s);
        if (s > 0) { x = [0, 96, -28, -128, -40][Math.min(a, 4)]; cy = [0, 122, 98, 140, 70][Math.min(a, 4)]; z = -200 - a * 150; ry = [0, -38, 8, 34, 0][Math.min(a, 4)]; rz = [0, -5, 3, 6, 0][Math.min(a, 4)]; }
        else { x = -214 - (a - 1) * 60; cy = 150; z = -60; ry = 62; rz = -3; }
        sc = .9; op = a > 3 || s < -1 ? 0 : s < 0 ? .85 : 1 - (a - 1) * .22; zi = 20 - a;
      }
    } else {
      const col = i % 5, row = Math.floor(i / 5), last = row === 2 ? 39.4 : 0; thumb = true; sc = .3;
      x = 17 + 35.4 + col * 78.8 + last - 210; cy = 118 + row * 56; zi = 5; delay = opt.stagger ? i * 24 : 0;
      if (st.filter !== 'all' && CD_ITEMS[i][2] !== st.filter) op = .14;
    }
    if (st.open) { if (i === st.active) op = 0; else { op *= .22; bl += 1; cy -= 8; } }
    c.classList.toggle('ghost', ghost); c.classList.toggle('thumb', thumb); c.classList.toggle('cur', i === st.active && st.view !== 'grid' && !opt.scatter);
    c.style.zIndex = zi; c.style.transitionDelay = delay + 'ms'; c.style.opacity = op; c.style.filter = bl ? `blur(${bl}px)` : '';
    c.style.transform = `translate3d(${x}px,${cy - CD_CH / 2}px,${z}px) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${sc})`;
    c.style.pointerEvents = op < .1 && !(st.view === 'grid') ? 'none' : '';
  });
  cards.forEach(c => { if (c._cv) cdSizeCanvas(c._cv, st.k); });   /* 縮圖模式的畫布高度不同 */
  /* 周邊：分段控制、計數、刻度、分類膠囊 */
  const seg = el.querySelector(`.cdseg [data-v="${st.view}"]`), ind = el.querySelector('.cdsegi');
  el.querySelectorAll('.cdseg button').forEach(b => b.setAttribute('aria-pressed', b === seg));
  ind.style.left = seg.offsetLeft + 'px'; ind.style.width = seg.offsetWidth + 'px';
  const it = CD_ITEMS[st.active], cnt = el.querySelector('.cdcnt');
  cnt.style.setProperty('--ch', it[3]); cnt.querySelector('.cdcc').textContent = CD_CAT[it[2]]; cnt.querySelector('b').textContent = cdPad(st.active + 1);
  el.querySelectorAll('.cdrule button').forEach((b, i) => { b.classList.toggle('on', i === st.active); b.style.setProperty('--ch', CD_ITEMS[i][3]); });
  const pill = st.view === 'grid' ? st.filter : it[2];
  el.querySelectorAll('.cdpills button').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === pill));
}
function cdGo(el, to){ const st = el._cd; if (st.open) return; st.active = ((to % CD_N) + CD_N) % CD_N; cdLayout(el); }
function cdView(el, v){
  const st = el._cd; if (st.open || st.view === v) return;
  const from = st.view; st.view = v; if (v !== 'grid') st.filter = 'all';
  if (v === 'grid') { cdLayout(el, {scatter: true}); clearTimeout(st.sc); st.sc = setTimeout(() => { if (st.view === 'grid') cdLayout(el, {stagger: true}); }, 300); }
  else { clearTimeout(st.sc); cdLayout(el, {stagger: false}); }
  if (v === 'helix' && from !== 'helix') { const p = el.querySelector('.cdcurve path'); p.style.animation = 'none'; void p.getBoundingClientRect(); p.style.animation = ''; }
}
function cdFilter(el, cat){
  const st = el._cd; if (st.open) return;
  if (st.view === 'grid') { st.filter = cat; cdLayout(el); return; }
  const i = cat === 'all' ? 0 : CD_ITEMS.findIndex(x => x[2] === cat); if (i >= 0) cdGo(el, i);
}
function cdSyncCtl(el){
  const st = el._cd, P = st.P, w = el.querySelector('.cdw'), i = st.active, C = cdColors(i, P.tone);
  w.style.setProperty('--ch', C.h); w.style.setProperty('--cs', C.s + '%');
  for (const k of ['detail', 'speed']) {
    const s = w.querySelector(`.cdsl[data-p="${k}"]`), v = k === 'speed' ? (P.speed - .2) / 1.8 : P.detail;
    s.style.setProperty('--v', v); s.querySelector('em').textContent = (k === 'speed' ? P.speed : P.detail).toFixed(2) + (k === 'speed' ? '×' : '');
  }
  w.querySelectorAll('.cdsw button').forEach((b, k) => {
    b.setAttribute('aria-pressed', k === P.tone); b.querySelector('span').textContent = i === 8 ? CD_KNOT_TONES[k] : CD_TONES[k][0];
    const cc = cdColors(i, k); b.querySelector('i').style.background = i === 8 ? ['radial-gradient(circle at 35% 30%,#d9c2ff,hsl(272 78% 48%))', 'hsl(272 26% 82%)', 'repeating-conic-gradient(hsl(272 60% 45%) 0 25%,#fff 0 50%) 0 0/6px 6px', 'linear-gradient(160deg,#fff,#777 55%,#ddd)'][k] : cc.a;
  });
}
function cdBusy(el){
  const st = el._cd, s = el.querySelector('.cdst'); st.S.re = st.T; s.classList.add('busy'); s.querySelector('em').textContent = '重新計算中';
  clearTimeout(st.bt); st.bt = setTimeout(() => { s.classList.remove('busy'); s.querySelector('em').textContent = '就緒'; }, 700);
}
function cdOpen(el, i){
  const st = el._cd; if (st.open || st.anim) return;
  if (i != null) st.active = i;
  const w = el.querySelector('.cdw'), card = st.cards[st.active], it = CD_ITEMS[st.active];
  st.P = {detail: .5, speed: 1, tone: 0}; st.S = {big: true}; w.classList.remove('pop');
  w.querySelector('.cdwh b').textContent = it[0]; w.querySelector('.cdwsub').textContent = `${CD_CAT[it[2]]} · ${it[1]}`;
  cdSyncCtl(el); cdBusy(el);
  const pr = el.querySelector('.cdp').getBoundingClientRect(), k = st.k, cr = card.getBoundingClientRect();
  const wx = 10, wy = 46, ww = 400, wh = 230, fx = (cr.left - pr.left) / k, fy = (cr.top - pr.top) / k, fw = cr.width / k, fh = cr.height / k;
  st.open = true; st.anim = true; cdLayout(el); w.classList.add('on');
  const from = `translate(${fx - wx}px,${fy - wy}px) scale(${fw / ww},${fh / wh})`;
  st.from = from;
  w.animate([{transform: from, opacity: .5}, {transform: 'none', opacity: 1}], {duration: st.still ? 0 : 520, easing: 'cubic-bezier(.2,.85,.2,1)'}).finished.catch(() => {}).then(() => { st.anim = false; });
}
function cdClose(el){
  const st = el._cd; if (!st.open || st.anim) return; st.anim = true;
  const w = el.querySelector('.cdw'), card = st.cards[st.active]; w.classList.remove('pop');
  st.open = false; cdLayout(el);
  const pr = el.querySelector('.cdp').getBoundingClientRect(), k = st.k;
  /* 卡片正在回位，目標用它的版面位置（不是動畫中的位置） */
  const m = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(card.style.transform), sc = +(/scale\(([\d.]+)\)/.exec(card.style.transform) || [0, 1])[1];
  const fw = CD_CW * sc, fh = CD_CH * sc, fx = 92 + (+m[1]) + (CD_CW - fw) / 2, fy = (+m[2]) + (CD_CH - fh) / 2;
  const to = st.view === 'helix' || st.view === 'stack' || st.view === 'grid' ? `translate(${fx - 10}px,${fy - 46}px) scale(${fw / 400},${fh / 230})` : st.from;
  w.animate([{transform: 'none', opacity: 1}, {transform: to, opacity: 0}], {duration: st.still ? 0 : 420, easing: 'cubic-bezier(.4,0,.2,1)'}).finished.catch(() => {}).then(() => { w.classList.remove('on'); st.anim = false; st.P = {detail: .5, speed: 1, tone: 0}; });
}
function cdSizeCanvas(cv, k){
  const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return false;
  const r = Math.min(3, Math.max(1, (window.devicePixelRatio || 1) * k)), bw = Math.round(w * r), bh = Math.round(h * r);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  cv._w = w; cv._h = h; cv._r = r; return true;
}
function cdPaint(cv, i, t, S, P){
  if (!cv._w && !cdSizeCanvas(cv, 1)) return;
  const c = cv.getContext('2d'); c.setTransform(cv._r, 0, 0, cv._r, 0, 0); c.clearRect(0, 0, cv._w, cv._h);
  c.globalAlpha = 1; c.setLineDash([]); c.lineCap = 'butt'; c.lineJoin = 'miter';
  CD_DRAW[i](c, cv._w, cv._h, t, S, P, cdColors(i, P.tone));
}
function cdRipple(el, ev){
  const p = el.querySelector('.cdp'), r = p.getBoundingClientRect(), s = document.createElement('i');
  s.className = 'cdrip'; s.style.left = (ev.clientX - r.left) / el._cd.k + 'px'; s.style.top = (ev.clientY - r.top) / el._cd.k + 'px';
  p.appendChild(s); s.addEventListener('animationend', () => s.remove());
}
function cdSlide(el, sl, ev){
  const st = el._cd, r = sl.querySelector('.cdtr').getBoundingClientRect(), v = cdClamp((ev.clientX - r.left) / r.width, 0, 1);
  if (sl.dataset.p === 'speed') st.P.speed = +(.2 + v * 1.8).toFixed(2); else { st.P.detail = +v.toFixed(2); cdBusy(el); }
  cdSyncCtl(el);
}
const cdWait = ms => new Promise(r => setTimeout(r, ms));
async function cdTween(el, key, to, ms = 700){
  const st = el._cd, from = st.P[key], t0 = performance.now();
  while (el.isConnected && st.open) { const u = Math.min(1, (performance.now() - t0) / ms); st.P[key] = +(from + (to - from) * cdEase(u)).toFixed(2); cdSyncCtl(el); if (u >= 1) break; await new Promise(r => requestAnimationFrame(r)); }
  if (key === 'detail') cdBusy(el);
}
/* 沒人操作時自動把所有效果輪播一遍 */
const CD_TOUR = [
  [el => cdGo(el, el._cd.active + 1), 1500], [el => cdGo(el, el._cd.active + 1), 1500], [el => cdGo(el, el._cd.active + 1), 1700],
  [el => cdView(el, 'helix'), 1900], [el => cdGo(el, el._cd.active + 1), 1600], [el => cdGo(el, el._cd.active + 1), 1700],
  [el => cdView(el, 'grid'), 2300], [el => cdFilter(el, '3d'), 1500], [el => cdFilter(el, 'video'), 1400], [el => cdFilter(el, 'all'), 1300],
  [el => cdView(el, 'stack'), 1300], [el => cdGo(el, 8), 1500], [el => cdOpen(el), 1700],
  [el => cdTween(el, 'detail', .08), 1700], [el => cdTween(el, 'detail', .7), 1600],
  [el => { el._cd.P.tone = 1; cdSyncCtl(el); cdBusy(el); }, 1300], [el => { el._cd.P.tone = 3; cdSyncCtl(el); cdBusy(el); }, 1300], [el => { el._cd.P.tone = 0; cdSyncCtl(el); cdBusy(el); }, 1200],
  [el => el.querySelector('.cdw').classList.add('pop'), 1700], [el => el.querySelector('.cdw').classList.remove('pop'), 1000],
  [el => cdClose(el), 1400], [el => cdGo(el, 0), 1400]
];
let cdIO = null, cdRO = null;
function initCds(){
  const still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!cdIO && 'IntersectionObserver' in window) cdIO = new IntersectionObserver(es => es.forEach(en => { en.target._vis = en.isIntersecting; }), {threshold: .35});
  if (!cdRO && 'ResizeObserver' in window) cdRO = new ResizeObserver(es => es.forEach(en => cdFit(en.target)));
  document.querySelectorAll('.cdx:not([data-on])').forEach((el, n) => {
    el.dataset.on = '1'; el._vis = !cdIO;
    const st = el._cd = {view: 'stack', active: 0, filter: 'all', open: false, anim: false, k: 1, T: 0, still, cards: [...el.querySelectorAll('.cdc')], P: {detail: .5, speed: 1, tone: 0}, S: {}, cs: CD_ITEMS.map(() => ({})), frame: 0, step: 0};
    const big = el.querySelector('.cdvp canvas'), base = {detail: .5, speed: 1, tone: 0};
    cdFit(el); cdLayout(el); if (cdIO) cdIO.observe(el); if (cdRO) cdRO.observe(el);
    /* 操作 */
    let down = null, swiped = false, drag = null;
    el.addEventListener('pointerdown', ev => {
      st.user = performance.now(); down = {x: ev.clientX, y: ev.clientY}; swiped = false; cdRipple(el, ev);
      const sl = ev.target.closest('.cdsl'); if (sl && st.open) { drag = sl; try { el.setPointerCapture(ev.pointerId); } catch (_) {} cdSlide(el, sl, ev); }
    });
    el.addEventListener('pointermove', ev => { if (drag) { st.user = performance.now(); cdSlide(el, drag, ev); } });
    const up = ev => {
      if (drag) { drag = null; swiped = true; down = null; return; }
      if (down && ev.type === 'pointerup') { const dx = ev.clientX - down.x, dy = ev.clientY - down.y; if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 1.2 && !st.open && st.view !== 'grid') { swiped = true; cdGo(el, st.active + (dx < 0 ? 1 : -1)); } }
      down = null;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('click', ev => {
      ev.stopPropagation(); st.user = performance.now();
      if (swiped) { swiped = false; return; }
      const q = s => ev.target.closest(s); let b;
      if (st.open) {
        if (q('.cdclose') || !q('.cdw')) { cdClose(el); return; }
        if (q('.cdpop')) { el.querySelector('.cdw').classList.toggle('pop'); return; }
        if ((b = q('[data-tone]'))) { st.P.tone = +b.dataset.tone; cdSyncCtl(el); cdBusy(el); return; }
        if (el.querySelector('.cdw').classList.contains('pop') && !q('.cdsl')) el.querySelector('.cdw').classList.remove('pop');
        return;
      }
      if ((b = q('[data-v]'))) { cdView(el, b.dataset.v); return; }
      if ((b = q('[data-go]'))) { cdGo(el, st.active + (+b.dataset.go)); return; }
      if ((b = q('[data-to]'))) { cdGo(el, +b.dataset.to); return; }
      if ((b = q('[data-cat]'))) { cdFilter(el, b.dataset.cat); return; }
      if ((b = q('.cdc'))) { const i = +b.dataset.i; if (st.view === 'grid' || i === st.active) cdOpen(el, i); else cdGo(el, i); }
    });
    /* 繪製迴圈：只畫看得到的畫布 */
    let last = performance.now();
    const loop = now => {
      if (!el.isConnected) { if (cdIO) cdIO.unobserve(el); if (cdRO) cdRO.unobserve(el); return; }
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (el._vis && !document.hidden) {
        st.T += dt * (st.open ? st.P.speed : 1); st.frame++;
        if (st.open || st.anim) cdPaint(big, st.active, st.T, st.S, st.P);
        if (!st.open) {
          if (st.view === 'grid') { const half = st.frame & 1; st.cards.forEach((c, i) => { if ((i & 1) === half) cdPaint(c._cv, i, st.T, st.cs[i], base); }); }
          else { cdPaint(st.cards[st.active]._cv, st.active, st.T, st.cs[st.active], base); if (st.frame % 3 === 0) { const j = (st.active + 1) % CD_N; cdPaint(st.cards[j]._cv, j, st.T, st.cs[j], base); } }
        }
      }
      if (!still) requestAnimationFrame(loop);
    };
    st.cards.forEach((c, i) => { c._cv = c.querySelector('canvas'); cdSizeCanvas(c._cv, st.k); cdPaint(c._cv, i, 1.2 + i * .37, st.cs[i], base); });
    if (still) { el.addEventListener('click', () => requestAnimationFrame(() => { st.cards.forEach((c, i) => cdPaint(c._cv, i, 1.2 + i * .37, st.cs[i], base)); if (st.open) setTimeout(() => cdPaint(big, st.active, 3, st.S, st.P), 60); })); return; }
    requestAnimationFrame(loop);
    const idle = () => performance.now() - (st.user || -1e9) > 9000;
    const tick = async () => {
      if (!el.isConnected) return; let wait = 1200;
      if (el._vis && !document.hidden && idle() && !st.anim) { const [fn, ms] = CD_TOUR[st.step % CD_TOUR.length]; st.step++; fn(el); wait = ms; }
      else if (!idle()) st.step = st.open ? 13 : st.view === 'grid' ? 10 : st.view === 'helix' ? 6 : 0;
      setTimeout(tick, wait);
    };
    setTimeout(tick, 1400 + n * 500);
  });
}
function cdFit(el){
  const st = el._cd; if (!st) return; const w = el.clientWidth; if (!w) return;
  st.k = w / CD_W; el.style.setProperty('--k', st.k);
  el.querySelectorAll('canvas').forEach(cv => cdSizeCanvas(cv, st.k));
}

/* MO-02 到 MO-15：把上面 14 個小動效各自拆成一款獨立示範（同一套 CD_DRAW）。
   點一下在三段細緻度之間切換；看得到時才畫。 */
const CFX_LEVELS = [.5, .9, .15], CFX_LABEL = ['標準', '密', '疏'];
function cdFxHTML(i){
  const it = CD_ITEMS[i]; if (!it) return '';
  return `<div class="cfx" data-fx="${i}" style="--ch:${it[3]}" role="group" aria-label="${it[0]}示範，點一下切換疏密"><canvas aria-hidden="true"></canvas><span class="cfxl"><i></i><em>標準</em></span><span class="cfxc">${it[4]}</span></div>`;
}
let cfxIO = null, cfxRO = null, cfxRun = false;
function initCdFx(){
  const still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!cfxIO && 'IntersectionObserver' in window) cfxIO = new IntersectionObserver(es => es.forEach(en => { en.target._vis = en.isIntersecting; }), {threshold: .2});
  if (!cfxRO && 'ResizeObserver' in window) cfxRO = new ResizeObserver(es => es.forEach(en => { const cv = en.target.querySelector('canvas'); if (cv) { cdSizeCanvas(cv, 1); if (still) cfxDraw(en.target, 2.2); } }));
  document.querySelectorAll('.cfx:not([data-on])').forEach(el => {
    el.dataset.on = '1'; el._vis = !cfxIO; el._lv = 0; el._S = {}; el._T = cdRnd(+el.dataset.fx) * 3;
    if (cfxIO) cfxIO.observe(el); if (cfxRO) cfxRO.observe(el);
    cdSizeCanvas(el.querySelector('canvas'), 1); cfxDraw(el, 2.2);
    el.addEventListener('click', ev => {
      ev.stopPropagation(); el._lv = (el._lv + 1) % 3; el._S = {}; el.querySelector('.cfxl em').textContent = CFX_LABEL[el._lv];
      el.classList.remove('tap'); void el.offsetWidth; el.classList.add('tap'); if (still) cfxDraw(el, 2.2);
    });
  });
  if (cfxRun || still) return; cfxRun = true;
  let last = performance.now();
  const loop = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const all = document.querySelectorAll('.cfx[data-on]');
    if (!document.hidden) all.forEach(el => { if (el._vis) { el._T += dt; cfxDraw(el, el._T); } });
    if (all.length) requestAnimationFrame(loop); else cfxRun = false;
  };
  requestAnimationFrame(loop);
}
function cfxDraw(el, t){ cdPaint(el.querySelector('canvas'), +el.dataset.fx, t, el._S, {detail: CFX_LEVELS[el._lv], speed: 1, tone: 0}); }
