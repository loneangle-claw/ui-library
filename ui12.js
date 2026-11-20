/* UI-01 到 UI-12：同一組元件換 12 種外皮。結構共用（uiHTML），外觀全在 style.css 的 .u01–.u12。
   可操作：分段切換（換數字與圖表）、開關、環圈（點一下加值）、待辦勾選、按鈕、加減器。 */
const UI_D = [[.35,.5,.42,.7,.55,.9,.62],[.6,.4,.75,.5,.85,.65,.95],[.3,.45,.4,.6,.8,.7,.88]];
/* [區塊名 ×5, 三組數字, 增減, 分段 ×3, 待辦 ×2, 按鈕, 環圈起始值] */
const UI_C = {
  '01':[['Revenue','Focus','Storage','Tasks','Guests'],['$48,290','$312k','$1.2M'],'+12.4%',['1D','1W','1M'],['Frost the tiles','Tune the springs'],'Download',72],
  '02':[['Energy','Lights','Humidity','Scenes','Fan'],['24.8','168','702'],'kWh',['D','W','M'],['Night lock','Eco when away'],'Start',48],
  '03':[['Votes','Loud','Disk','To do','Qty'],['2,481','9,930','41K'],'LIVE',['ALL','DEV','UX'],['Ship it raw','No gradients'],'Publish',98],
  '04':[['Steps','Zen mode','Water','Habits','Cups'],['6,240','41k','182k'],'+8% vs last',['Day','Week','Month'],['Stretch 5 min','Read ten pages'],'Start session',63],
  '05':[['Throughput','Stream','GPU','Queue','Tokens'],['1,284','9,120','61k'],'tok/s ▲ 8.2%',['1H','24H','7D'],['vector-store','eval-runner'],'Deploy',86],
  '06':[['Master','Power','Gain','Patch','Prog'],['124','096','140'],'',['A','B','C'],['Sync','Delay'],'Save',55],
  '07':[['Disk','Sound','Memory','Untitled','Copies'],['412K','388K','96K'],'in disk',['Name','Size','Kind'],['Zoom boxes','Click sounds'],'OK',70],
  '08':[['sketches / day','desk lamp','pages','to-do','ideas'],['46','212','980'],'not bad!',['week','month','year'],['redraw the logo','scan page 12'],'sign in',68],
  '09':[['visitors','snap','storage','list','copies'],['4,829','31,060','128k'],'+18',['day','week','month'],['cut the stencils','print forty'],'play',75],
  '10':[['sysmon','crt','build','todo','threads'],['214','1902','8840'],'tasks · load 1.42',['cpu','mem','net'],['draw the frames','ship the loop'],'Save',87],
  '11':[['Circulation','Mode','Issue','Contents','Size'],['207,560','1.4m','16.8m'],'↑ 12.4 readers',['Day','Month','Year'],['Type that moves','Notes on white space'],'Read the essay',12],
  '12':[['Sheets pulled','Overprint','Ink left','Print run','Staples'],['9,640','41,200','180K'],'this week',['Zines','Posters','Cards'],['Mix the fluoro','Trim and staple'],'Print 120',54]
};
function uiPath(d){
  const p = d.map((v, i) => [i * 100 / 6, 36 - v * 32]); let s = `M${p[0][0]} ${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(p.length - 1, i + 2)];
    s += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }
  return [s, s + ' L100 40 L0 40 Z', p[6][1] / 40];
}
function uiHTML(n, name){
  const c = UI_C[n]; if (!c) return '';
  const [l, , dl, seg, todo, btn, pct] = c, [ln, ar, ey] = uiPath(UI_D[0]);
  const lab = i => `<small class="xl"><span>${l[i]}</span></small>`;
  return `<div class="uix u${n}" data-ui="${n}" role="group" aria-label="${name}示範">
    <div class="xc xa" style="--i:0">${lab(0)}<div class="xseg">${seg.map((s, i) => `<button type="button"${i ? '' : ' class="on"'}>${s}</button>`).join('')}</div>
      <b class="xn">${c[1][0]}</b><em class="xd">${dl}</em>
      <span class="xbars">${UI_D[0].map((v, i) => `<i${i === 5 ? ' class="hi"' : ''} style="--v:${v}"></i>`).join('')}</span>
      <span class="xline" style="--ey:${ey.toFixed(3)}"><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path class="ar" d="${ar}"/><path class="ln" d="${ln}"/></svg><u></u></span></div>
    <div class="xc xb2" style="--i:1">${lab(1)}<button type="button" class="xt" aria-pressed="false" aria-label="${l[1]}"><i></i></button><span class="xs"></span></div>
    <div class="xc xr2" style="--i:2">${lab(2)}<button type="button" class="xr" style="--p:${pct}" aria-label="${l[2]}"><b>${pct}</b></button></div>
    <div class="xc xd4" style="--i:3">${lab(3)}${todo.map((t, i) => `<button type="button" class="xk${i ? '' : ' on'}"><i></i><span>${t}</span></button>`).join('')}<button type="button" class="xb">${btn}</button></div>
    <div class="xc xe" style="--i:4">${lab(4)}<div class="xst"><button type="button" aria-label="減少">−</button><b>2</b><button type="button" aria-label="增加">+</button></div></div>
  </div>`;
}
/* 回傳 true 表示點到的是示範裡的控制項（不要進示範頁） */
function uiTap(ev){
  const b = ev.target.closest('.uix button'); if (!b) return false;
  const x = b.closest('.uix'), c = UI_C[x.dataset.ui];
  if (b.parentElement.classList.contains('xseg')) {
    const k = [...b.parentElement.children].indexOf(b), d = UI_D[k], [ln, ar, ey] = uiPath(d);
    [...b.parentElement.children].forEach(s => s.classList.toggle('on', s === b));
    x.querySelector('.xn').textContent = c[1][k];
    x.querySelectorAll('.xbars i').forEach((el, i) => el.style.setProperty('--v', d[i]));
    const line = x.querySelector('.xline'), svg = line.querySelector('svg');
    line.style.setProperty('--ey', ey.toFixed(3));
    svg.querySelector('.ln').setAttribute('d', ln); svg.querySelector('.ar').setAttribute('d', ar);
    svg.style.animation = 'none'; void svg.getBoundingClientRect(); svg.style.animation = '';
  } else if (b.classList.contains('xt')) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
  else if (b.classList.contains('xk')) b.classList.toggle('on');
  else if (b.classList.contains('xr')) { let p = +b.style.getPropertyValue('--p') + 9; if (p > 100) p = 18; b.style.setProperty('--p', p); b.firstElementChild.textContent = p; }
  else if (b.classList.contains('xb')) { b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 220); }
  else if (b.parentElement.classList.contains('xst')) { const o = b.parentElement.querySelector('b'); o.textContent = Math.max(0, Math.min(9, +o.textContent + (b === b.parentElement.lastElementChild ? 1 : -1))); }
  return true;
}
