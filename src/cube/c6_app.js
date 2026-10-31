// ---------- App: interaction, controls, panels, boot ----------
function hitAt(px,py){for(let k=hits.length-1;k>=0;k--){const h=hits[k];if((px<LW)!==!!h.lab)continue;
  if(px>=h.x-1&&px<=h.x+h.w+1&&py>=h.y-1&&py<=h.y+h.h+1)return h}return null}
function showTip(h,px,py){const t=$('tip');if(!h){t.hidden=true;return}t.innerHTML=h.html;t.hidden=false;
  const vp=$('vp'),r=t.getBoundingClientRect();let x=px+14,y=py+14;
  if(x+r.width>vp.clientWidth-6)x=px-r.width-14;if(y+r.height>vp.clientHeight-6)y=py-r.height-14;
  t.style.left=Math.max(4,x)+'px';t.style.top=Math.max(4,y)+'px'}
function zoomAt(px,f,smooth){if(ST.mode==='PD')return;const day=dayAt(px),ppd=Math.min(40,Math.max(fitPPD()*.85,ST.ppd*f)),to={ppd,x0:day-(px-LW)/ppd};
  if(smooth)anim(to);else{ST.ppd=to.ppd;ST.x0=to.x0;draw()}}
function anim(to){const fr={ppd:ST.ppd,x0:ST.x0},frRow=(ST.y0+(H-AX)/4)/rowH,t0=performance.now(),red=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step=now=>{const k=red?1:Math.min(1,(now-t0)/300),e=1-Math.pow(1-k,3);
    ST.ppd=Math.exp(Math.log(fr.ppd)+(Math.log(to.ppd)-Math.log(fr.ppd))*e);ST.x0=fr.x0+(to.x0-fr.x0)*e;
    if(to.row!=null&&to.row>=0)ST.yRow=frRow+(to.row-frRow)*e;draw();if(k<1)requestAnimationFrame(step);else ST.yRow=null};
  requestAnimationFrame(step)}
function zoomPreset(z){const c=dayAt(LW+(W-LW)/2),ppd={fit:fitPPD(),overview:.7,events:1.6,detail:4}[z]||ST.ppd;
  anim(z==='fit'?{ppd,x0:relMin()-6}:{ppd,x0:c-(W-LW)/2/ppd})}

const ptrs=new Map();let drag=null,pinch=null,moved=false;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});moved=false;ST.yRow=null;
  if(ptrs.size===1){drag={x:e.offsetX,y:e.offsetY,x0:ST.x0,y0:ST.y0,mx:ST.mx};cv.classList.add('drag')}
  else if(ptrs.size===2){const[a,b]=[...ptrs.values()],cx=(a.x+b.x)/2;pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,ppd:ST.ppd,cx,day:dayAt(cx)};drag=null}});
cv.addEventListener('pointermove',e=>{
  if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(pinch&&ptrs.size===2){if(ST.mode==='PD')return;const[a,b]=[...ptrs.values()];ST.ppd=Math.min(40,Math.max(fitPPD()*.85,pinch.ppd*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d));
    ST.x0=pinch.day-(pinch.cx-LW)/ST.ppd;moved=true;$('tip').hidden=true;draw();return}
  if(drag){const dx=e.offsetX-drag.x,dy=e.offsetY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;
    if(moved){if(ST.mode==='PD')ST.mx=drag.mx-dx;else ST.x0=drag.x0-dx/ST.ppd;ST.y0=drag.y0-dy;$('tip').hidden=true;draw()}return}
  showTip(hitAt(e.offsetX,e.offsetY),e.offsetX,e.offsetY)});
const up2=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;cv.classList.remove('drag');
  if(drag&&!moved&&e.type==='pointerup'){const h=hitAt(e.offsetX,e.offsetY);
    if(h&&h.act)h.act();else{const p=h&&h.p?h.p:(ST.mode==='PDT'||ST.mode==='PT')&&e.offsetY>AX?ROWS[Math.floor((e.offsetY-AX+ST.y0)/rowH)]:null;if(p)select(p)}}
  drag=null};
cv.addEventListener('pointerup',up2);cv.addEventListener('pointercancel',up2);
cv.addEventListener('pointerleave',()=>{$('tip').hidden=true});
cv.addEventListener('wheel',e=>{e.preventDefault();ST.yRow=null;$('tip').hidden=true;const m=e.deltaMode===1?16:1;
  if(e.ctrlKey||e.metaKey)zoomAt(e.offsetX,Math.exp(-e.deltaY*m*.01));
  else if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)){const d=(e.deltaX||e.deltaY)*m;if(ST.mode==='PD')ST.mx+=d;else ST.x0+=d/ST.ppd;draw()}
  else{ST.y0+=e.deltaY*m;draw()}},{passive:false});
cv.addEventListener('dblclick',e=>zoomAt(e.offsetX,2.2,true));
cv.tabIndex=0;
cv.addEventListener('keydown',e=>{const c=LW+(W-LW)/2;
  if(e.key==='+'||e.key==='=')zoomAt(c,1.6,true);else if(e.key==='-')zoomAt(c,1/1.6,true);
  else if(e.key==='ArrowRight'){if(ST.mode==='PD')ST.mx+=60;else ST.x0+=60/ST.ppd;draw()}else if(e.key==='ArrowLeft'){if(ST.mode==='PD')ST.mx-=60;else ST.x0-=60/ST.ppd;draw()}
  else if(e.key==='ArrowDown'){ST.y0+=rowH;draw()}else if(e.key==='ArrowUp'){ST.y0-=rowH;draw()}else return;e.preventDefault()});
$('zIn').onclick=()=>zoomAt(LW+(W-LW)/2,1.8,true);
$('zOut').onclick=()=>zoomAt(LW+(W-LW)/2,1/1.8,true);
$('zFit').onclick=()=>{ST.mx=0;if(ST.mode==='PD')draw();else anim({ppd:fitPPD(),x0:relMin()-6})};

// ---- panels ----
function showTab(id){document.querySelectorAll('.tabs button').forEach(b=>{const on=b.dataset.t===id;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  ['pAgent','pcard','pSig'].forEach(p=>$(p).hidden=p!==id)}
document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-t]');if(b)showTab(b.dataset.t)});
function select(p){ST.sel=p;if(ST.focus&&ST.focus.p!==p)ST.focus=null;renderCard();markSig();draw()}
function renderCard(){const p=ST.sel,el=$('pcard');document.querySelector('[data-t="pcard"]').textContent=p?'Patient '+p.id.slice(-4):'Patient';
  if(!p){el.innerHTML='<h2>Patient</h2><p class="empty">Click a lane or a matrix row to open one patient.</p>';return}
  const ev=[];p.ae.filter(a=>a.g>=3).forEach(a=>ev.push([a.s,`${a.term}, grade ${a.g}${a.ir?', immune-related':''}`,gc(a.g)]));
  if(p.ds.pd)ev.push([p.ds.pd,'Progressive disease',COL.crit]);if(p.ds.xo)ev.push([p.ds.xo,'Crossover to pembrolizumab',COL.accent]);
  if(p.ds.death)ev.push([p.ds.death,'Death',COL.ink]);p.sig.forEach(s=>ev.push([s.day,s.title,sevC(s.sev)]));ev.sort((a,b)=>a[0]-b[0]);
  const i=ROWS.indexOf(p),an=anchorDay(p,ST.align,ST.term);
  el.innerHTML=`<h2>Patient <span>${i<0?'outside this view':(i+1)+' of '+ROWS.length}</span></h2>
  <p class="pid">${p.id}<span class="arm" style="background:${armC(p)}">${p.arm==='P'?'Pembro + chemo':'Placebo + chemo'}</span></p>
  <dl class="kv"><dt>Age / sex</dt><dd>${p.age} / ${p.sex}</dd><dt>PD-L1 TPS</dt><dd>${p.tps}%</dd><dt>ECOG status</dt><dd>${p.ecog}</dd><dt>Platinum</dt><dd>${p.plat}</dd>
  <dt>Best response</dt><dd>${RESP[p.bor]} (${p.best}%)</dd><dt>Progression</dt><dd>${p.ds.pd?'Day '+p.ds.pd:'None through day '+(p.ds.death??p.fu)}</dd>
  <dt>Status</dt><dd>${p.ds.death?'Died day '+p.ds.death:'Alive at day '+p.fu}</dd>
  <dt>Adverse events</dt><dd>${p.nAE} total · ${p.ae.filter(a=>a.g>=3).length} grade ≥3 · ${p.ae.filter(a=>a.ir).length} immune</dd>
  ${ST.align!=='rand'?`<dt>Anchor</dt><dd>${an==null?'none for this anchor':'Day '+an}</dd>`:''}</dl>
  <ul class="evlist">${ev.map(e=>`<li><span class="day">D${e[0]}</span><span style="color:${e[2]}">●</span><span>${e[1]}</span></li>`).join('')||'<li>No grade ≥3 events or signals.</li>'}</ul>
  <button class="btn" id="zPat" type="button">Open as lanes and zoom in</button>`;
  $('zPat').onclick=()=>openPatient(p)}
function openPatient(p){if(!ROWS.includes(p)){ST.align='rand';ST.show='all';ST.arm='all';ST.tps='all';syncControls();refresh(true)}
  if(ST.mode!=='PDT'){setMode('PDT');syncControls()}ST.sel=p;renderCard();markSig();
  const ppd=Math.max(3.1,(W-LW-30)/(p.ds.last-p.off+40));anim({ppd,x0:-20-p.off,row:ROWS.indexOf(p)})}
const SEVR={crit:0,warn:1,info:2};
function renderSignals(){const vis=new Set(ROWS);SIGV=ALLSIG.filter(s=>vis.has(s.p)).sort((a,b)=>SEVR[a.sev]-SEVR[b.sev]||a.p.i-b.p.i);
  const nc=SIGV.filter(s=>s.sev!=='info').length;$('sigN').textContent=nc?String(nc):'';
  $('sigList').innerHTML=SIGV.map((s,k)=>`<li data-k="${k}" tabindex="0"><span class="sv" style="background:${sevC(s.sev)}"></span><div><div class="t">${s.title}</div><div class="d">${s.detail}</div><div class="id">${s.p.id} · day ${s.day}</div></div></li>`).join('')||'<li><span></span><div class="d">No signals in this view.</div></li>';
  markSig()}
function markSig(){[...$('sigList').children].forEach(li=>{const s=SIGV[+li.dataset.k];li.classList.toggle('on',!!s&&s.p===ST.sel)})}
function focusSignal(s){if(ST.mode!=='PDT'&&ST.mode!=='PT'){setMode('PDT');syncControls()}if(!ROWS.includes(s.p)){ST.align='rand';syncControls();refresh(true)}
  ST.focus=s;ST.sel=s.p;renderCard();markSig();const ppd=Math.max(ST.ppd,3.4);anim({ppd,x0:s.day-s.p.off-(W-LW)/2/ppd,row:ROWS.indexOf(s.p)})}
$('sigList').addEventListener('click',e=>{const li=e.target.closest('li[data-k]');if(li)focusSignal(SIGV[+li.dataset.k])});
$('sigList').addEventListener('keydown',e=>{if(e.key==='Enter'){const li=e.target.closest('li[data-k]');if(li)focusSignal(SIGV[+li.dataset.k])}});
function renderLegend(){const sw=(st,t)=>`<span><i style="${st}"></i>${t}</span>`,dom=DOM.map(d=>sw(`width:10px;height:10px;border-radius:2px;background:var(${d.v})`,d.name)).join('');
  const abbr='<span>TPS = PD-L1 tumor proportion score · ULN / LLN = upper / lower limit of normal</span>';
  const L={PD:[dom,'<span>Bar = size within the column · <b style="color:var(--crit)">red value</b> = worth a look (ALT ≥3×ULN, creatinine ≥1.5×, TSH ≥2×, ANC below LLN, grade ≥3, gap over 6 weeks) · click a header to sort</span>',abbr],
    DT:[dom,'<span>Cell = % of patients in that arm and time window · darker = higher · faint = fewer than 3 assessed · click a cell to open those patients as lanes</span>',abbr],
    LN:[sw('width:16px;height:6px;background:var(--accent);opacity:.6','Pembro + chemo on treatment'),sw('width:16px;height:6px;background:var(--pbo);opacity:.6','Placebo + chemo'),
      sw('width:2px;height:12px;background:var(--c-ex)','Dose'),`<span>AE grade ${[1,2,3,4,5].map(g=>`<i style="width:11px;height:8px;background:var(--g${g})"></i>`).join('')}</span>`,
      sw('width:14px;height:7px;border:1px solid var(--ink)','Outlined AE = immune-related'),sw('width:8px;height:8px;border-radius:50%;background:var(--c-lb)','Lab outside normal'),
      sw('width:8px;height:8px;border-radius:50%;background:var(--c-tr)','Tumor scan'),'<span><b style="color:var(--crit)">◆</b> progression · ✕ death · | alive at cut · <b style="color:var(--accent)">▶</b> crossover</span>',abbr]};
  $('legend').innerHTML=(L[ST.mode]||L.LN).join('')}

// ---- cube + controls ----
function iso(w,h,d){const o=4,b=28,dx=d*.7,dy=d*.45;
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><polygon points="${o},${b} ${o+w},${b} ${o+w},${b-h} ${o},${b-h}" fill="currentColor" opacity=".35"/><polygon points="${o},${b-h} ${o+w},${b-h} ${o+w+dx},${b-h-dy} ${o+dx},${b-h-dy}" fill="currentColor" opacity=".6"/><polygon points="${o+w},${b} ${o+w+dx},${b-dy} ${o+w+dx},${b-h-dy} ${o+w},${b-h}" fill="currentColor" opacity=".85"/></svg>`}
const MODES=[['PDT','Patient × Domain × Time','Full cube: lanes peeled by domain',iso(16,14,12)],['PT','Patient × Time','Domains merged: profile lanes',iso(16,2.5,12)],
  ['PD','Patient × Domain','Time collapsed: matrix',iso(2.5,14,12)],['DT','Domain × Time','Patients collapsed: % by arm',iso(16,14,1.5)]];
$('cube').innerHTML=MODES.map(([k,t,s,svg])=>`<button type="button" class="cb" role="radio" data-m="${k}">${svg}<span><b>${t}</b><small>${s}</small></span></button>`).join('');
$('cube').addEventListener('click',e=>{const b=e.target.closest('.cb');if(!b)return;setMode(b.dataset.m);syncControls();refresh(false)});
const HINT={PDT:'Pinch or Ctrl + scroll to zoom time · scroll through patients · drag to pan · hover for detail · double-click to zoom in',PT:'Every domain on one line per patient. Pinch or Ctrl + scroll to zoom; more detail appears as you zoom in.',
  PD:'Time is collapsed: one summary per patient and measure. Drag sideways if the columns run off screen; click a header to sort.',DT:'Patients are collapsed: each cell is a share of one arm in one time window. Zoom in for weekly windows; click a cell to drill back into lanes.'};
function setMode(m){ST.mode=m;ST.peel=m==='PDT';$('zoombar').hidden=m==='PD';$('hint').textContent=HINT[m];$('tip').hidden=true;renderLegend()}
function ensureSortOpt(c){const v='f:'+c.k;if(![...$('fSort').options].some(o=>o.value===v))$('fSort').add(new Option('Column: '+c.name,v))}
function sortBy(v){const c=FEAT.find(f=>'f:'+f.k===v);if(c)ensureSortOpt(c);ST.sort=v;syncControls();refresh(false)}
function drill(ids,label,keepMode){ST.pick=new Set(ids);ST.show='pick';const o=$('fShow').querySelector('option[value="pick"]');o.hidden=false;o.textContent='Selection: '+(label.length>44?label.slice(0,43)+'…':label);
  if(!keepMode)setMode('PDT');syncControls();refresh(true)}
function syncControls(){
  document.querySelectorAll('.cb').forEach(b=>{const on=b.dataset.m===ST.mode;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)});
  $('fAlign').value=ST.align;$('termBox').hidden=ST.align!=='term';$('fTerm').value=ST.term;
  $('fArm').value=ST.arm;$('fTps').value=ST.tps;$('fShow').value=ST.show;$('fSort').value=ST.sort;$('fLab').value=ST.lab;
  document.querySelectorAll('#layerChips .chip').forEach(b=>{const on=ST.layers.has(b.dataset.k);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
function refresh(fit){ROWS=filterRows();renderSignals();renderCard();
  const n=ROWS.length,a=ST.align==='rand'?'':` with ${ALIGN_NAME[ST.align].toLowerCase()}${ST.align==='term'?' ('+ST.term+')':''}`;
  $('anchorInfo').textContent=`${n} of ${PTS.length} patients${a}`;
  if(fit){ST.ppd=fitPPD();ST.x0=relMin()-6;ST.y0=0;ST.mx=0}draw()}
$('fTerm').innerHTML=AE_TERMS.map(t=>`<option>${t}</option>`).join('');
$('layerChips').innerHTML=DOM.map(d=>`<button type="button" class="chip on" data-k="${d.k}" style="--dc:var(${d.v})" aria-pressed="true"><i></i>${d.k} <span style="font-family:var(--f-body);font-weight:500">${d.name}</span></button>`).join('');
$('layerChips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const k=b.dataset.k;
  if(ST.layers.has(k)){if(ST.layers.size===1)return;ST.layers.delete(k)}else ST.layers.add(k);syncControls();draw()});
$('fAlign').addEventListener('change',e=>{ST.align=e.target.value;syncControls();refresh(true)});
$('fTerm').addEventListener('change',e=>{ST.term=e.target.value;refresh(true)});
[['fArm','arm'],['fTps','tps'],['fShow','show'],['fSort','sort'],['fLab','lab']].forEach(([id,k])=>$(id).addEventListener('change',e=>{ST[k]=e.target.value;refresh(k==='arm'||k==='tps'||k==='show')}));

// ---- boot ----
function onTheme(){readColors();renderCard();renderSignals();draw()}
readColors();resize();setMode('PDT');syncControls();
ST.sel=(ALLSIG.find(s=>s.sev==='crit')||ALLSIG[0]||{p:PTS[0]}).p;
refresh(true);renderLegend();
if(document.fonts)document.fonts.ready.then(()=>draw());
new ResizeObserver(()=>{const fit=ST.ppd<=fitPPD()*1.01;resize();if(fit)ST.ppd=fitPPD();draw()}).observe($('vp'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',onTheme);
new MutationObserver(onTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
