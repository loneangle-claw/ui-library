/* FM-01：投籃上傳。上傳區做成籃板和籃框，檔案往後拉再放開（彈弓），沿拋物線投進籃框就開始上傳。
   可操作：按住檔案往後拉會畫出軌跡點，放開投出；也可以直接把檔案拖到籃板上放開、按「幫我投」，
   或用「選擇檔案」／從桌面拖檔案進來換成自己的檔案（只是示範，不會真的上傳到任何地方）。
   沒人操作時自動示範（看得到時才跑）；碰過之後停 9 秒再接手。外觀在 style.css 的 .fmx，尺寸用 em。 */
const FM_K = 9;            /* 力道：初速 = 拉的距離 × 9／秒 */
const FM_G = 70;           /* 重力，em/s² */
const FM_PULL = 8;         /* 最大拉距，em */
const FM_DOTS = 12;
const FM_FILES = [['報告.pdf', '2.4 MB'], ['照片.jpg', '1.8 MB'], ['清單.xlsx', '640 KB']];
const FM_TAG = {pdf: '#d63b52', jpg: '#2f7fe0', jpeg: '#2f7fe0', png: '#2f7fe0', heic: '#2f7fe0', xlsx: '#1f9d61', xls: '#1f9d61', csv: '#1f9d61', docx: '#2f62d6', doc: '#2f62d6', mp4: '#8a4fd8', mov: '#8a4fd8', zip: '#b7791f'};
const fmWait = ms => new Promise(r => setTimeout(r, ms));
function fmNet(){
  let s = '';
  const top = i => 4 + i * 6.5, bot = i => 15 + i * 3.75;
  for (let i = 0; i < 9; i++) {
    if (i < 8) s += `<path d="M${top(i)} 7L${bot(i + 1)} 43M${top(i + 1)} 7L${bot(i)} 43"/>`;
  }
  return s;
}
function fmHTML(name){
  const page = '<span class="fmpg"><i></i><i></i><i></i><em>PDF</em></span>';
  return `<div class="fmx" role="group" aria-label="${name}示範">
    <div class="fmh"><b>上傳檔案</b><small>拖放檔案，或直接投籃</small>
      <div class="fmk"><label class="fmbt pri"><input type="file" hidden>選擇檔案</label><button type="button" class="fmbt" data-fm="shot">幫我投</button></div>
      <span class="fmct">已上傳 <b>0</b></span></div>
    <div class="fmb"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4.5M8 8.2l4-3.9 4 3.9M6 12.5v6h12v-6"/></svg><b>把檔案放這裡</b><small>或投進籃框</small><i class="fmsq"></i><em class="fmp">+1</em></div>
    <svg class="fmr bk" viewBox="0 0 60 46" aria-hidden="true"><rect class="br" x="26" y="-3" width="8" height="7" rx="1"/><path class="rm" d="M3 5a27 4.5 0 0 1 54 0"/></svg>
    <div class="fmd" aria-hidden="true">${'<i></i>'.repeat(FM_DOTS)}</div>
    <span class="fmc" aria-hidden="true"></span>
    <div class="fmf home">${page}<small>報告.pdf</small></div>
    <svg class="fmr ft" viewBox="0 0 60 46" aria-hidden="true"><g class="nt">${fmNet()}</g><path class="rm" d="M3 5a27 4.5 0 0 0 54 0"/></svg>
    <span class="fmt">按住檔案往後拉，放開就投</span>
    <div class="fmu"><span class="fmui">${page}</span><span class="fmun"><b>報告.pdf</b><small>2.4 MB</small></span><span class="fmus"><em>上傳中</em><i><s></s></i></span><span class="fmuk"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.6 3.6 7.4-8"/></svg></span></div>
  </div>`;
}
function fmSize(n){ return n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
function fmReplay(el, cls){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

function fmSetup(el){
  const q = s => el.querySelector(s);
  const file = q('.fmf'), board = q('.fmb'), rim = q('.fmr.ft'), net = q('.fmr.ft .nt'), ring = q('.fmc'), row = q('.fmu'), hint = q('.fmt');
  const dots = [...el.querySelectorAll('.fmd i')], count = q('.fmct b');
  const S = {mode: 'home', x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, py: 0, n: 0, fi: 0, tok: 0, up: 0, shots: 0, cur: FM_FILES[0], scored: false, t0: 0, last: 0};
  const M = {};
  const touch = () => { el._user = performance.now(); };
  function measure(){
    const b = el.getBoundingClientRect(), rr = rim.getBoundingClientRect(), br = board.getBoundingClientRect();
    M.e = parseFloat(getComputedStyle(el).fontSize) || 10; M.w = el.clientWidth; M.h = el.clientHeight; M.l = b.left; M.t = b.top;
    M.rx = rr.left + rr.width / 2 - b.left; M.ry = rr.top - b.top + rr.width * 5 / 60; M.rw = rr.width * 27 / 60;
    M.hx = Math.max(4.4 * M.e, M.w * .17); M.hy = 21.4 * M.e;
    M.b = [br.left - b.left, br.top - b.top, br.right - b.left, br.bottom - b.top];
  }
  const put = () => { file.style.transform = `translate(${S.x}px,${S.y}px) rotate(${S.r}deg)`; };
  const onBoard = (x, y) => x > M.b[0] && x < M.b[2] && y > M.b[1] && y < M.b[3];
  function setFile(f){
    S.cur = f;
    tag(file, f[0]); file.querySelector('small').textContent = f[0];
  }
  function tag(host, name){
    const ext = (/\.([a-z0-9]+)$/i.exec(name) || [, 'file'])[1].toLowerCase(), t = host.querySelector('.fmpg em');
    t.textContent = ext.slice(0, 4).toUpperCase(); t.style.background = FM_TAG[ext] || '#6b7280';
  }
  function clearDots(){ dots.forEach(d => { d.style.opacity = 0; }); }
  function home(pop){
    if (!el.isConnected) return;
    measure(); S.mode = 'home'; S.scored = false; S.x = M.hx; S.y = M.hy; S.r = 0; put();
    file.classList.remove('out'); file.classList.add('home'); el.classList.remove('drag'); board.classList.remove('over'); ring.classList.remove('on'); clearDots();
    if (pop) fmReplay(file, 'pop');
  }
  /* 拉到 (px,py)：檔案跟著手指走；手指在起點下方時是彈弓（限制拉距、畫軌跡點），拉到起點上方就是一般拖曳 */
  function aim(px, py){
    let dx = px - M.hx, dy = py - M.hy;
    const free = dy < -1.5 * M.e, len = Math.hypot(dx, dy), max = FM_PULL * M.e;
    if (!free && len > max) { dx *= max / len; dy *= max / len; }
    S.x = M.hx + dx; S.y = M.hy + dy; S.r = free ? 0 : dx * -.25 / M.e * 4; put();
    S.vx = free ? 0 : -dx * FM_K; S.vy = free ? 0 : -dy * FM_K;
    const show = !free && Math.hypot(dx, dy) > .9 * M.e, g = FM_G * M.e;
    dots.forEach((d, i) => {
      const t = (i + 1) * .075, x = S.x + S.vx * t, y = S.y + S.vy * t + .5 * g * t * t;
      const ok = show && x > 0 && x < M.w && y < M.h && y > -M.e;
      d.style.transform = `translate(${x}px,${y}px) scale(${1 - i * .045})`;
      d.style.opacity = ok ? 1 - i * .06 : 0;
    });
    return {free, pull: Math.hypot(dx, dy)};
  }
  function launch(){
    S.mode = 'fly'; S.scored = false; S.py = S.y; S.vr = S.vx / M.e * 9; S.t0 = performance.now(); S.last = 0;
    file.classList.remove('home', 'pop'); el.classList.remove('drag'); board.classList.remove('over'); ring.classList.remove('on');
    const tok = S.tok; setTimeout(() => { if (S.tok === tok && S.mode !== 'drag' && S.mode !== 'auto') clearDots(); }, 620);
    requestAnimationFrame(loop);
  }
  /* 直接放到籃板上：從放開的位置掉進籃框 */
  function dropIn(){
    const T = .3, g = FM_G * M.e;
    S.vx = (M.rx - S.x) / T; S.vy = (M.ry - .2 * M.e - S.y - .5 * g * T * T) / T; clearDots(); launch(); S.vr = 0;
  }
  function score(){
    S.scored = true; S.vx *= .2; S.vy *= .45; S.n++;
    count.textContent = S.n; fmReplay(count, 'pop'); fmReplay(board, 'hit'); fmReplay(q('.fmp'), 'go'); fmReplay(net, 'sw');
    upload(S.cur);
  }
  function upload(f){
    const id = ++S.up, bar = row.querySelector('s'), st = row.querySelector('.fmus em'), t0 = performance.now();
    tag(row, f[0]); row.querySelector('.fmun b').textContent = f[0]; row.querySelector('.fmun small').textContent = f[1];
    row.classList.remove('done'); row.classList.add('on'); el.classList.add('upl');
    const tick = () => {
      if (id !== S.up || !el.isConnected) return;
      const p = Math.min(1, (performance.now() - t0) / 1500), k = 1 - Math.pow(1 - p, 2.2);
      bar.style.transform = `scaleX(${k})`; st.textContent = '上傳中 ' + Math.round(k * 100) + '%';
      if (p < 1) return requestAnimationFrame(tick);
      row.classList.add('done'); st.textContent = '上傳完成';
      setTimeout(() => { if (id === S.up) { row.classList.remove('on'); el.classList.remove('upl'); } }, 1700);
    };
    tick();
  }
  function leave(made){
    S.mode = 'out'; file.classList.add('out');
    hint.textContent = made ? '按住檔案往後拉，放開就投' : '沒進，再投一次';
    if (made && !S.picked) { S.fi = (S.fi + 1) % FM_FILES.length; }
    const tok = ++S.tok;
    setTimeout(() => { if (S.tok !== tok) return; if (made) { S.picked = null; setFile(FM_FILES[S.fi]); } home(true); }, made ? 650 : 480);
  }
  function step(dt){
    const e = M.e, g = FM_G * e;
    S.vy += g * dt; S.x += S.vx * dt; S.y += S.vy * dt; S.r += S.vr * dt;
    if (S.scored) {
      S.x += (M.rx - S.x) * Math.min(1, 5 * dt); S.vx *= 1 - Math.min(1, 6 * dt); S.vr *= 1 - Math.min(1, 3 * dt); S.vy = Math.min(S.vy, 24 * e);
      if (S.y > M.ry + 4.4 * e) { leave(true); return false; }
    } else if (S.py < M.ry && S.y >= M.ry && S.vy > 0 && Math.abs(S.x - M.rx) < M.rw - .35 * e) {
      score();
    } else {
      for (const sx of [-1, 1]) {                                   /* 籃框兩端 */
        const cx = M.rx + sx * M.rw, dx = S.x - cx, dy = S.y - M.ry, d = Math.hypot(dx, dy), R = 1.25 * e;
        if (d < R && d > 0) {
          const nx = dx / d, ny = dy / d, vn = S.vx * nx + S.vy * ny;
          if (vn < 0) { S.vx -= 1.55 * vn * nx; S.vy -= 1.55 * vn * ny; S.vr *= -.6; }
          S.x = cx + nx * R; S.y = M.ry + ny * R;
        }
      }
      const fr = 1.3 * e, fl = M.h - 1.6 * e;
      if (S.x < fr) { S.x = fr; S.vx = Math.abs(S.vx) * .6; }
      if (S.x > M.w - fr) { S.x = M.w - fr; S.vx = -Math.abs(S.vx) * .6; }
      if (S.y > fl) {
        S.y = fl;
        if (S.vy > 13 * e) { S.vy *= -.48; S.vx *= .75; S.vr *= .55; } else { leave(false); return false; }
      }
    }
    S.py = S.y;
    return true;
  }
  function loop(ts){
    if (S.mode !== 'fly' || !el.isConnected) return;
    let dt = Math.min(.05, S.last ? (ts - S.last) / 1000 : 1 / 60); S.last = ts;
    for (; dt > 0; dt -= 1 / 120) if (!step(Math.min(dt, 1 / 120))) { put(); return; }
    put();
    if (performance.now() - S.t0 > 5000) { leave(false); return; }
    requestAnimationFrame(loop);
  }
  /* 自動投一球：反推要拉到哪裡，才會在 T 秒後剛好落進籃框中心；miss 時少拉一點，讓它打到框 */
  async function shot(miss, fast){
    if (S.mode !== 'home') return;
    measure();
    const tok = ++S.tok, e = M.e, T = .86 + Math.random() * .1, k = 1 - FM_K * T;
    let tx = (M.rx - FM_K * M.hx * T) / k, ty = (M.ry - FM_K * M.hy * T - .5 * FM_G * e * T * T) / k;
    if (miss) { tx += 1.5 * e; ty -= .5 * e; }
    S.mode = 'auto'; file.classList.remove('home', 'pop'); ring.classList.add('on');
    const dur = fast ? 380 : 760, t0 = performance.now();
    await new Promise(done => {
      const f = () => {
        if (S.tok !== tok || !el.isConnected) return done();
        const p = Math.min(1, (performance.now() - t0) / dur), k2 = 1 - Math.pow(1 - p, 3);
        aim(M.hx + (tx - M.hx) * k2, M.hy + (ty - M.hy) * k2);
        ring.style.transform = `translate(${S.x}px,${S.y}px)`;
        p < 1 ? requestAnimationFrame(f) : done();
      };
      f();
    });
    await fmWait(fast ? 140 : 300);
    if (S.tok !== tok || !el.isConnected || S.mode !== 'auto') return;
    launch();
  }
  /* 手動 */
  const rel = ev => [ev.clientX - M.l, ev.clientY - M.t];
  file.addEventListener('pointerdown', ev => {
    if (S.mode !== 'home' && S.mode !== 'auto') return;
    ev.preventDefault(); touch(); S.tok++; measure();
    if (S.mode === 'auto') { S.x = M.hx; S.y = M.hy; }
    const [x, y] = rel(ev); S.off = [x - S.x, y - S.y];
    S.mode = 'drag'; S.free = false; S.pull = 0;
    try { file.setPointerCapture(ev.pointerId); } catch (_) {}
    file.classList.remove('home', 'pop'); el.classList.add('drag'); ring.classList.remove('on');
  });
  file.addEventListener('pointermove', ev => {
    if (S.mode !== 'drag') return;
    touch(); const [x, y] = rel(ev), a = aim(x - S.off[0], y - S.off[1]);
    S.free = a.free; S.pull = a.pull; board.classList.toggle('over', a.free && onBoard(S.x, S.y));
  });
  const up = () => {
    if (S.mode !== 'drag') return;
    touch();
    if (S.free && onBoard(S.x, S.y)) return dropIn();
    if (!S.free && S.pull < .9 * M.e) return home(false);
    launch();
  };
  file.addEventListener('pointerup', up); file.addEventListener('pointercancel', up);
  q('[data-fm="shot"]').addEventListener('click', () => { touch(); shot(false, true); });
  q('input[type="file"]').addEventListener('change', ev => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    touch(); S.tok++; S.picked = true; setFile([f.name, fmSize(f.size)]); home(true); ev.target.value = '';
  });
  /* 從桌面拖檔案進來：放在籃板上就直接上傳 */
  el.addEventListener('dragover', ev => { ev.preventDefault(); measure(); board.classList.toggle('over', onBoard(ev.clientX - M.l, ev.clientY - M.t)); });
  el.addEventListener('dragleave', ev => { if (!el.contains(ev.relatedTarget)) board.classList.remove('over'); });
  el.addEventListener('drop', ev => {
    ev.preventDefault(); touch(); board.classList.remove('over');
    const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (S.mode !== 'home' && S.mode !== 'auto') return;
    S.tok++; measure(); if (f) { S.picked = true; setFile([f.name, fmSize(f.size)]); }
    S.x = ev.clientX - M.l; S.y = ev.clientY - M.t; file.classList.remove('home', 'pop'); put();
    if (onBoard(S.x, S.y)) dropIn(); else { S.vx = 0; S.vy = 0; launch(); }
  });
  setFile(FM_FILES[0]); home(false);
  el._shot = () => shot(S.shots++ % 3 === 2, false);
  el._ready = () => S.mode === 'home' && !row.classList.contains('on');
  el._fix = () => { if (S.mode === 'home') home(false); };
}
let fmIO = null;
function initFms(){
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fmIO && 'IntersectionObserver' in window) fmIO = new IntersectionObserver(es => es.forEach(en => { en.target._vis = en.isIntersecting; }), {threshold: .5});
  document.querySelectorAll('.fmx:not([data-on])').forEach((el, i) => {
    el.dataset.on = '1'; fmSetup(el); if (fmIO) fmIO.observe(el);
    if (still) return;
    const idle = () => performance.now() - (el._user || -1e9) > 9000;
    const tick = () => {
      if (!el.isConnected) { if (fmIO) fmIO.unobserve(el); return; }
      if (el._vis && !document.hidden && idle() && el._ready()) el._shot();
      setTimeout(tick, 1400);
    };
    setTimeout(tick, 900 + i * 300);
  });
}
window.addEventListener('resize', () => document.querySelectorAll('.fmx[data-on]').forEach(el => el._fix && el._fix()));
