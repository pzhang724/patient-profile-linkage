// ---------- Interaction, panels, 3D layers, boot ----------
function hitAt(px,py){if(py<AX)return null;for(let k=hits.length-1;k>=0;k--){const h=hits[k];if((px<LW)!==!!h.lab)continue;
  if(px>=h.x-1&&px<=h.x+h.w+1&&py>=h.y-1&&py<=h.y+h.h+1)return h}return null}
function showTip(h,px,py){const t=$('tip');if(!h){t.hidden=true;return}t.innerHTML=h.html;t.hidden=false;
  const vp=$('vp'),r=t.getBoundingClientRect();let x=px+14,y=py+14;
  if(x+r.width>vp.clientWidth-6)x=px-r.width-14;if(y+r.height>vp.clientHeight-6)y=py-r.height-14;
  t.style.left=Math.max(4,x)+'px';t.style.top=Math.max(4,y)+'px'}
function zoomAt(px,f,smooth){const day=dayAt(px),ppd=Math.min(40,Math.max(fitPPD()*.85,ST.ppd*f)),to={ppd,x0:day-(px-LW)/ppd};
  if(smooth)anim(to);else{ST.ppd=to.ppd;ST.x0=to.x0;draw()}}
function anim(to){const fr={ppd:ST.ppd,x0:ST.x0},frRow=(ST.y0+(H-AX)/4)/rowH,t0=performance.now(),red=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step=now=>{const k=red?1:Math.min(1,(now-t0)/300),e=1-Math.pow(1-k,3);
    ST.ppd=Math.exp(Math.log(fr.ppd)+(Math.log(to.ppd)-Math.log(fr.ppd))*e);ST.x0=fr.x0+(to.x0-fr.x0)*e;
    if(to.row!=null&&to.row>=0)ST.yRow=frRow+(to.row-frRow)*e;
    draw();if(k<1)requestAnimationFrame(step);else ST.yRow=null};
  requestAnimationFrame(step)}

const ptrs=new Map();let drag=null,pinch=null,moved=false;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});moved=false;ST.yRow=null;
  if(ptrs.size===1){drag={x:e.offsetX,y:e.offsetY,x0:ST.x0,y0:ST.y0};cv.classList.add('drag')}
  else if(ptrs.size===2){const[a,b]=[...ptrs.values()],cx=(a.x+b.x)/2;pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,ppd:ST.ppd,cx,day:dayAt(cx)};drag=null}});
cv.addEventListener('pointermove',e=>{
  if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(pinch&&ptrs.size===2){const[a,b]=[...ptrs.values()];ST.ppd=Math.min(40,Math.max(fitPPD()*.85,pinch.ppd*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d));
    ST.x0=pinch.day-(pinch.cx-LW)/ST.ppd;moved=true;$('tip').hidden=true;draw();return}
  if(drag){const dx=e.offsetX-drag.x,dy=e.offsetY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;
    if(moved){ST.x0=drag.x0-dx/ST.ppd;ST.y0=drag.y0-dy;$('tip').hidden=true;draw()}return}
  showTip(hitAt(e.offsetX,e.offsetY),e.offsetX,e.offsetY)});
const up2=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;cv.classList.remove('drag');
  if(drag&&!moved&&e.type==='pointerup'&&e.offsetY>AX){const h=hitAt(e.offsetX,e.offsetY),p=h?h.p:ROWS[Math.floor((e.offsetY-AX+ST.y0)/rowH)];if(p)select(p)}
  drag=null};
cv.addEventListener('pointerup',up2);cv.addEventListener('pointercancel',up2);
cv.addEventListener('pointerleave',()=>{$('tip').hidden=true});
cv.addEventListener('wheel',e=>{e.preventDefault();ST.yRow=null;$('tip').hidden=true;const m=e.deltaMode===1?16:1;
  if(e.ctrlKey||e.metaKey)zoomAt(e.offsetX,Math.exp(-e.deltaY*m*.01));
  else if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)){ST.x0+=(e.deltaX||e.deltaY)*m/ST.ppd;draw()}
  else{ST.y0+=e.deltaY*m;draw()}},{passive:false});
cv.addEventListener('dblclick',e=>zoomAt(e.offsetX,2.2,true));
cv.tabIndex=0;
cv.addEventListener('keydown',e=>{const c=LW+(W-LW)/2;
  if(e.key==='+'||e.key==='=')zoomAt(c,1.6,true);else if(e.key==='-')zoomAt(c,1/1.6,true);
  else if(e.key==='ArrowRight'){ST.x0+=60/ST.ppd;draw()}else if(e.key==='ArrowLeft'){ST.x0-=60/ST.ppd;draw()}
  else if(e.key==='ArrowDown'){ST.y0+=rowH;draw()}else if(e.key==='ArrowUp'){ST.y0-=rowH;draw()}else return;e.preventDefault()});
$('zIn').onclick=()=>zoomAt(LW+(W-LW)/2,1.8,true);
$('zOut').onclick=()=>zoomAt(LW+(W-LW)/2,1/1.8,true);
$('zFit').onclick=()=>anim({ppd:fitPPD(),x0:-20});

// ---- panels ----
function select(p){ST.sel=p;if(ST.focus&&ST.focus.p!==p)ST.focus=null;renderCard();markSig();draw();if(T3.lib&&ST.view==='3d')T3.highlight()}
function renderCard(){const p=ST.sel,el=$('pcard');
  if(!p){el.innerHTML='<h2>Patient</h2><p class="empty">Click a lane to open one patient\'s profile.</p>';return}
  const ev=[];p.ae.filter(a=>a.g>=3).forEach(a=>ev.push([a.s,`${a.term}, grade ${a.g}${a.ir?', immune-related':''}`,gc(a.g)]));
  if(p.ds.pd)ev.push([p.ds.pd,'Progressive disease',COL.crit]);if(p.ds.xo)ev.push([p.ds.xo,'Crossover to pembrolizumab',COL.accent]);
  if(p.ds.death)ev.push([p.ds.death,'Death',COL.ink]);p.sig.forEach(s=>ev.push([s.day,s.title,sevC(s.sev)]));ev.sort((a,b)=>a[0]-b[0]);
  const i=ROWS.indexOf(p);
  el.innerHTML=`<h2>Patient <span>${i<0?'outside this subset':(i+1)+' of '+ROWS.length}</span></h2>
  <p class="pid">${p.id}<span class="arm" style="background:${armC(p)}">${p.arm==='P'?'Pembro + chemo':'Placebo + chemo'}</span></p>
  <dl class="kv"><dt>Age / sex</dt><dd>${p.age} / ${p.sex}</dd><dt>PD-L1 TPS</dt><dd>${p.tps}%</dd><dt>ECOG status</dt><dd>${p.ecog}</dd><dt>Platinum</dt><dd>${p.plat}</dd>
  <dt>Best response</dt><dd>${RESP[p.bor]} (${p.best}%)</dd><dt>Progression</dt><dd>${p.ds.pd?'Day '+p.ds.pd:'None through day '+(p.ds.death??p.fu)}</dd>
  <dt>Status</dt><dd>${p.ds.death?'Died day '+p.ds.death:'Alive at day '+p.fu}</dd>
  <dt>Adverse events</dt><dd>${p.nAE} total · ${p.ae.filter(a=>a.g>=3).length} grade ≥3 · ${p.ae.filter(a=>a.ir).length} immune</dd></dl>
  <ul class="evlist">${ev.map(e=>`<li><span class="day">D${e[0]}</span><span style="color:${e[2]}">●</span><span>${e[1]}</span></li>`).join('')||'<li>No grade ≥3 events or signals.</li>'}</ul>
  <button class="btn" id="zPat" type="button">Zoom into this patient</button>`;
  $('zPat').onclick=()=>{if(ST.view!=='2d')setView('2d');zoomPatient(p)}}
function zoomPatient(p){ST.peel=true;$('peel').checked=true;draw();const ppd=Math.max(3.1,(W-LW-30)/(p.ds.last+40));anim({ppd,x0:-15,row:ROWS.indexOf(p)})}
const SEVR={crit:0,warn:1,info:2};
function renderSignals(){const vis=new Set(ROWS);SIGV=ALLSIG.filter(s=>vis.has(s.p)).sort((a,b)=>SEVR[a.sev]-SEVR[b.sev]||a.p.i-b.p.i);
  const nc=SIGV.filter(s=>s.sev!=='info').length;$('sigN').textContent=`${nc} to review · ${SIGV.length-nc} notes`;
  $('sigList').innerHTML=SIGV.map((s,k)=>`<li data-k="${k}" tabindex="0"><span class="sv" style="background:${sevC(s.sev)}"></span><div><div class="t">${s.title}</div><div class="d">${s.detail}</div><div class="id">${s.p.id} · day ${s.day}</div></div></li>`).join('')||'<li><span></span><div class="d">No signals in this subset.</div></li>';
  markSig()}
function markSig(){[...$('sigList').children].forEach(li=>{const s=SIGV[+li.dataset.k];li.classList.toggle('on',!!s&&s.p===ST.sel)})}
function focusSignal(s){if(ST.view!=='2d')setView('2d');ST.focus=s;ST.sel=s.p;renderCard();markSig();const ppd=Math.max(ST.ppd,3.4);anim({ppd,x0:s.day-(W-LW)/2/ppd,row:ROWS.indexOf(s.p)})}
$('sigList').addEventListener('click',e=>{const li=e.target.closest('li[data-k]');if(li)focusSignal(SIGV[+li.dataset.k])});
$('sigList').addEventListener('keydown',e=>{if(e.key==='Enter'){const li=e.target.closest('li[data-k]');if(li)focusSignal(SIGV[+li.dataset.k])}});
function renderLegend(){const sw=(st,t)=>`<span><i style="${st}"></i>${t}</span>`;
  $('legend').innerHTML=[sw('width:16px;height:6px;background:var(--accent);opacity:.6','Pembrolizumab + chemo, on treatment'),
    sw('width:16px;height:6px;background:var(--pbo);opacity:.6','Placebo + chemo'),sw('width:2px;height:12px;background:var(--c-ex)','Dose (21-day cycle)'),
    `<span>AE grade 1–5 ${[1,2,3,4,5].map(g=>`<i title="Grade ${g}" style="width:11px;height:8px;background:var(--g${g})"></i>`).join('')}</span>`,
    sw('width:14px;height:7px;border:1px solid var(--ink)','Outlined AE = immune-related'),
    sw('width:8px;height:8px;border-radius:50%;background:var(--c-lb)','Lab above upper limit of normal (ULN)'),
    sw('width:8px;height:8px;border-radius:50%;background:var(--c-tr)','Tumor scan (RECIST response)'),
    '<span><b style="color:var(--crit)">◆</b> progression · ✕ death · | alive at data cut · <b style="color:var(--accent)">▶</b> crossover</span>',
    '<span>TPS = PD-L1 tumor proportion score</span>'].join('')}

// ---- controls ----
function refresh(){ROWS=filterRows();renderSignals();renderCard();if(ST.view==='2d')draw();else if(T3.lib)T3.build()}
$('layerChips').innerHTML=DOM.map(d=>`<button type="button" class="chip on" data-k="${d.k}" style="--dc:var(${d.v})" aria-pressed="true" title="${d.name}"><i></i>${d.k} <span style="font-family:var(--f-body);font-weight:500">${d.name}</span></button>`).join('');
$('layerChips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const k=b.dataset.k;
  if(ST.layers.has(k)){if(ST.layers.size===1)return;ST.layers.delete(k)}else ST.layers.add(k);
  b.classList.toggle('on',ST.layers.has(k));b.setAttribute('aria-pressed',ST.layers.has(k));if(ST.view==='2d')draw();else T3.build()});
$('peel').addEventListener('change',e=>{ST.peel=e.target.checked;draw()});
[['fArm','arm'],['fTps','tps'],['fShow','show'],['fSort','sort'],['fLab','lab']].forEach(([id,k])=>$(id).addEventListener('change',e=>{ST[k]=e.target.value;refresh()}));
function setView(v){ST.view=v;['v2d','v3d'].forEach(id=>{const on=id==='v'+v;$(id).classList.toggle('on',on);$(id).setAttribute('aria-selected',on)});
  cv.hidden=v!=='2d';$('zoombar').hidden=v!=='2d';['three','lbl3d','xrnote','spreadBox'].forEach(id=>$(id).hidden=v!=='3d');
  $('peel').closest('label').style.visibility=v==='2d'?'':'hidden';$('tip').hidden=true;
  $('hint').textContent=v==='2d'?'Pinch or Ctrl + scroll to zoom time · scroll to move through patients · drag to pan · hover for detail · double-click to zoom in':
    'Each domain is a horizontal layer, each patient a line across all layers. Red pillars mark progression and cut through every layer.';
  if(v==='3d')T3.load(()=>{if(!T3.lib)T3.init();T3.size();T3.build()});else{resize();draw()}}
$('v2d').onclick=()=>setView('2d');$('v3d').onclick=()=>setView('3d');
$('spread').addEventListener('input',e=>{T3.gapT=e.target.value/100;T3.req&&T3.req()});

// ---- 3D layers (three.js, loaded on demand) ----
const T3={lib:false,gap:.55,gapT:.55,
  load(cb){if(window.THREE){cb();return}const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload=cb;s.onerror=()=>{$('xrnote').textContent='The 3D library could not load. The 2D lanes still work.'};document.head.appendChild(s)},
  init(){this.r=new THREE.WebGLRenderer({antialias:true});this.r.setPixelRatio(Math.min(2,devicePixelRatio));$('three').appendChild(this.r.domElement);
    this.sc=new THREE.Scene();this.cam=new THREE.PerspectiveCamera(38,1,.1,600);
    this.sc.add(new THREE.AmbientLight(0xffffff,.72));const dl=new THREE.DirectionalLight(0xffffff,.55);dl.position.set(10,30,20);this.sc.add(dl);
    this.orb={th:-.8,ph:1.0,r:52};this.ray=new THREE.Raycaster();this.ptr=new THREE.Vector2();this.tgt=new THREE.Vector3();this.lib=true;this.bind()},
  size(){if(!this.r)return;const el=$('vp');this.r.setSize(el.clientWidth,el.clientHeight,false);this.r.domElement.style.width='100%';this.r.domElement.style.height='100%';
    this.cam.aspect=el.clientWidth/Math.max(1,el.clientHeight);this.cam.updateProjectionMatrix();this.req()},
  req(){if(!this.lib||this.raf)return;this.raf=requestAnimationFrame(()=>{this.raf=0;this.frame()})},
  frame(){const d=this.gapT-this.gap;if(Math.abs(d)>.002){this.gap+=d*.18;this.req()}else this.gap=this.gapT;
    this.applyGap();const o=this.orb,t=this.tgt;
    this.cam.position.set(t.x+o.r*Math.sin(o.ph)*Math.sin(o.th),t.y+o.r*Math.cos(o.ph),t.z+o.r*Math.sin(o.ph)*Math.cos(o.th));
    this.cam.lookAt(t);this.r.render(this.sc,this.cam);this.labels()},
  applyGap(){if(!this.groups)return;const G=.3+this.gap*7,n=this.groups.length,top=Math.max(.6,(n-1)*G+.8);
    this.groups.forEach((g,j)=>g.position.y=j*G);this.pil.forEach(l=>l.scale.y=top);this.tgt.y=(n-1)*G/2;
    this.selM.scale.y=top+.3;this.selM.position.y=top/2-.15},
  build(){if(!this.lib)return;readColors();const c=s=>new THREE.Color(s);
    if(this.root){this.sc.remove(this.root);this.root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose()})}
    this.root=new THREE.Group();this.sc.add(this.root);this.r.setClearColor(c(COL.panel));
    const XS=1.2/30.44,ZS=.62,xp=d=>d*XS,zp=i=>i*ZS;this.XS=XS;this.ZS=ZS;
    const sx=maxDay()*XS,sz=Math.max(1,ROWS.length)*ZS;this.tgt.set(sx/2,0,sz/2);
    this.act=DOM.filter(d=>ST.layers.has(d.k));this.groups=[];this.picks=[];
    const box=new THREE.BoxGeometry(1,1,1),sph=new THREE.SphereGeometry(1,12,8),oct=new THREE.OctahedronGeometry(1);
    this.act.forEach(dm=>{const g=new THREE.Group();this.root.add(g);this.groups.push(g);const dc=COL[dm.v.slice(2)];
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(sx+2,sz+1),new THREE.MeshBasicMaterial({color:c(dc),transparent:true,opacity:.08,side:THREE.DoubleSide,depthWrite:false}));
      pl.rotation.x=-Math.PI/2;pl.position.set(sx/2,-.02,sz/2-ZS/2);g.add(pl);
      const pos=[];ROWS.forEach((p,i)=>pos.push(xp(1),0,zp(i),xp(p.ds.last),0,zp(i)));
      const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(pos.length?pos:[0,0,0,0,0,0],3));
      g.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:c(COL.muted),transparent:true,opacity:.4})));
      const it=[];
      ROWS.forEach((p,i)=>{const z=zp(i);
        if(dm.k==='EX')p.ex.forEach(e=>{if(e.drug==='Placebo'||e.drug==='Pembrolizumab')it.push({x:xp(e.d),y:.12,z,s:[.05,.24,.34],col:e.xo?COL.accent:COL['c-ex'],p,tip:`<b>Cycle ${e.c}</b> · Day ${e.d}<br>${e.drug} ${e.dose}`})});
        if(dm.k==='AE')p.ae.forEach(a=>{const r=.07+.035*a.g;it.push({x:xp(a.s),y:r,z,s:[r,r,r],col:gc(a.g),p,tip:aeTip(a),k:'sph'})});
        if(dm.k==='LB')p.lb.filter(l=>l.t===ST.lab&&l.f).forEach(l=>{const h=Math.min(3,Math.abs(Math.log2(l.x))+.3)*.5;it.push({x:xp(l.d),y:h/2,z,s:[.12,h,.12],col:COL['c-lb'],p,tip:labTip(l,p)})});
        if(dm.k==='TR')p.tr.forEach(t=>{it.push({x:xp(t.d),y:.12+Math.max(0,-t.pct)/100*1.6,z,s:[.14,.14,.14],col:t.resp==='BL'?COL.muted:RC(t.resp),p,tip:`<b>${RESP[t.resp]}</b> · Day ${t.d} · ${t.pct>0?'+':''}${t.pct}% vs baseline`,k:'oct'})});
        if(dm.k==='CM')p.cm.filter(m=>!m.bg).forEach(m=>{const w=Math.max(.1,(m.e-m.s)*XS);it.push({x:xp(m.s)+w/2,y:.05,z,s:[w,.08,.2],col:COL['c-cm'],p,tip:cmTip(m)})});
      });
      for(const kind of ['box','sph','oct']){const its=it.filter(q=>(q.k||'box')===kind);if(!its.length)continue;
        const m=new THREE.InstancedMesh(kind==='sph'?sph:kind==='oct'?oct:box,new THREE.MeshLambertMaterial({color:0xffffff}),its.length);
        const o=new THREE.Object3D();its.forEach((q,k)=>{o.position.set(q.x,q.y,q.z);o.scale.set(...q.s);o.updateMatrix();m.setMatrixAt(k,o.matrix);m.setColorAt(k,c(q.col))});
        m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.frustumCulled=false;m.userData.items=its;g.add(m);this.picks.push(m)}
    });
    const pp=[],dp=[];ROWS.forEach((p,i)=>{if(p.ds.pd)pp.push(xp(p.ds.pd),0,zp(i),xp(p.ds.pd),1,zp(i));if(p.ds.death)dp.push(xp(p.ds.death),0,zp(i),xp(p.ds.death),1,zp(i))});
    const mk=(a,col,op)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a.length?a:[0,0,0,0,0,0],3));
      const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:c(col),transparent:true,opacity:op}));l.frustumCulled=false;this.root.add(l);return l};
    this.pil=[mk(pp,COL.crit,.85),mk(dp,COL.ink,.5)];
    this.selM=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:c(COL.accent),transparent:true,opacity:.16,depthWrite:false}));this.root.add(this.selM);
    $('lbl3d').innerHTML=this.act.map(d=>`<span style="color:var(${d.v});border-color:var(${d.v})">${d.name}</span>`).join('');
    this.highlight()},
  highlight(){if(!this.selM)return;const i=ROWS.indexOf(ST.sel);this.selM.visible=i>=0;
    if(i>=0){const x0=this.XS,x1=ST.sel.ds.last*this.XS;this.selM.scale.set(x1-x0+.6,1,this.ZS*.9);this.selM.position.x=(x0+x1)/2;this.selM.position.z=i*this.ZS}this.req()},
  labels(){const ls=$('lbl3d').children,w=this.r.domElement.clientWidth,h=this.r.domElement.clientHeight;
    this.groups.forEach((g,j)=>{const s=ls[j];if(!s)return;const v=new THREE.Vector3(-.4,g.position.y,-.3).project(this.cam);
      s.style.left=Math.max(90,(v.x+1)/2*w)+'px';s.style.top=((1-v.y)/2*h)+'px';s.hidden=v.z>1})},
  pick(e){const rc=this.r.domElement.getBoundingClientRect();this.ptr.set((e.clientX-rc.left)/rc.width*2-1,-(e.clientY-rc.top)/rc.height*2+1);
    this.ray.setFromCamera(this.ptr,this.cam);const hs=this.ray.intersectObjects(this.picks,false);return hs.length?hs[0].object.userData.items[hs[0].instanceId]:null},
  bind(){const el=this.r.domElement,pts=new Map();let last=null,pin=null,mv=false;
    el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);mv=false;last=[e.clientX,e.clientY];
      if(pts.size===2){const[a,b]=[...pts.values()];pin={d:Math.hypot(a[0]-b[0],a[1]-b[1])||1,r:this.orb.r}}});
    el.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId)){const q=this.pick(e),rc=$('vp').getBoundingClientRect();
        showTip(q?{html:`${q.p.id} · ${q.tip}`}:null,e.clientX-rc.left,e.clientY-rc.top);return}
      pts.set(e.pointerId,[e.clientX,e.clientY]);$('tip').hidden=true;
      if(pin&&pts.size===2){const[a,b]=[...pts.values()];this.orb.r=Math.min(160,Math.max(6,pin.r*pin.d/Math.max(10,Math.hypot(a[0]-b[0],a[1]-b[1]))));mv=true;this.req();return}
      const dx=e.clientX-last[0],dy=e.clientY-last[1];if(Math.abs(dx)+Math.abs(dy)>2)mv=true;last=[e.clientX,e.clientY];
      this.orb.th-=dx*.006;this.orb.ph=Math.min(1.52,Math.max(.1,this.orb.ph-dy*.006));this.req()});
    const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pin=null;if(!mv&&e.type==='pointerup'){const q=this.pick(e);if(q)select(q.p)}};
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',()=>{$('tip').hidden=true});
    el.addEventListener('wheel',e=>{e.preventDefault();this.orb.r=Math.min(160,Math.max(6,this.orb.r*Math.exp(e.deltaY*(e.deltaMode===1?16:1)*.0012)));this.req()},{passive:false})}
};

// ---- boot ----
function onTheme(){readColors();renderCard();renderSignals();draw();if(T3.lib&&ST.view==='3d')T3.build()}
readColors();resize();ROWS=filterRows();ST.ppd=fitPPD();ST.x0=-20;
ST.sel=(ALLSIG.find(s=>s.sev==='crit')||ALLSIG[0]||{p:PTS[0]}).p;
renderSignals();renderCard();renderLegend();draw();
if(document.fonts)document.fonts.ready.then(()=>draw());
new ResizeObserver(()=>{if(ST.view==='2d'){const fit=ST.ppd<=fitPPD()*1.01;resize();if(fit)ST.ppd=fitPPD();draw()}else T3.size()}).observe($('vp'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',onTheme);
new MutationObserver(onTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
