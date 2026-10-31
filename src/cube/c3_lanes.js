// ---------- 2D lanes with semantic zoom ----------
const $=id=>document.getElementById(id);
const ST={view:'2d',mode:'PDT',align:'rand',term:AE_TERMS.includes('Pneumonitis')?'Pneumonitis':AE_TERMS[0],pick:null,layers:new Set(DOM.map(d=>d.k)),peel:true,arm:'all',tps:'all',show:'all',sort:'id',lab:'ALT',sel:null,focus:null,ppd:1,x0:-20,y0:0,yRow:null};
const COL={};
const CN=['bg','panel','ink','muted','line','grid','soft','accent','pbo','c-ex','c-ae','c-lb','c-tr','c-cm','c-ds','g1','g2','g3','g4','g5','ok','warn','crit'];
function readColors(){const cs=getComputedStyle(document.documentElement);CN.forEach(n=>COL[n]=cs.getPropertyValue('--'+n).trim()||'#888')}
const MONO='"JetBrains Mono",ui-monospace,Menlo,monospace', BODY='Barlow,system-ui,sans-serif';
const gc=g=>COL['g'+Math.min(5,Math.max(1,g))];
const armC=p=>p.arm==='P'?COL.accent:COL.pbo;
const sevC=s=>s==='crit'?COL.crit:s==='warn'?COL.warn:COL.accent;
const RESP={CR:'Complete response',PR:'Partial response',SD:'Stable disease',PD:'Progressive disease',NE:'Not evaluable',BL:'Baseline'};
const RC=r=>r==='PR'||r==='CR'?COL['c-tr']:r==='PD'?COL.crit:COL.muted;
const cv=$('cv'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1,LW=132,hits=[],ROWS=[],rowH=20,laneH=15,prevRowH=0,SIGV=[];
const AX=28;
const level=(ppd=ST.ppd)=>ppd<0.8?0:ppd<3?1:2;
let OFF=0;const X=d=>LW+(d-OFF-ST.x0)*ST.ppd;
const dayAt=px=>ST.x0+(px-LW)/ST.ppd;
const relMin=()=>ROWS.length?Math.min(...ROWS.map(p=>-14-p.off)):-14;
const maxDay=()=>ROWS.length?Math.max(...ROWS.map(p=>p.ds.last-p.off)):700;
const fitPPD=()=>Math.max(.2,(W-LW-24)/(maxDay()-relMin()+30));

function filterRows(){
  const r=PTS.filter(p=>{p.off=anchorDay(p,ST.align,ST.term);return p.off!=null&&(ST.arm==='all'||p.arm===ST.arm)&&(ST.tps==='all'||p.tg===+ST.tps)&&
    (ST.show==='all'||(ST.show==='g3'&&p.g3)||(ST.show==='ir'&&p.irAny)||(ST.show==='sig'&&p.sig.length)||(ST.show==='xo'&&p.ds.xo)||(ST.show==='pd'&&p.ds.pd)||(ST.show==='pick'&&ST.pick&&ST.pick.has(p.id)))});
  let key={id:p=>p.i,pfs:p=>-p.pfsT,trt:p=>-p.trtT,ae:p=>-p.nAE,alt:p=>-p.altMax,tps:p=>-p.tps,shr:p=>p.best,anc:p=>p.off}[ST.sort];
  if(!key){const c=FEAT.find(f=>'f:'+f.k===ST.sort)||FEAT[0];key=c.cat?p=>['CR','PR','SD','PD','NE'].indexOf(p.F[c.k]):(c.low||c.div)?p=>p.F[c.k]:p=>-p.F[c.k]}
  return r.sort((a,b)=>key(a)-key(b)||a.i-b.i);
}
function rowHFor(ppd){if(ST.mode==='PD')return 24;if(ST.mode==='DT')return 22;const L=level(ppd),nl=Math.max(1,ST.layers.size);return ST.peel?10+nl*(L===2?26:15):(L===2?32:20)}
function layout(){LW=ST.mode==='DT'?(W<520?118:214):(W<520?86:132);
  laneH=level()===2?26:15; rowH=rowHFor(ST.ppd);
  if(prevRowH&&rowH!==prevRowH&&ST.yRow==null){const c=(H-AX)/2;ST.y0=(ST.y0+c)*rowH/prevRowH-c}
  prevRowH=rowH;
  if(ST.yRow!=null) ST.y0=ST.yRow*rowH-(H-AX)/4;
}
function clampView(){
  ST.ppd=Math.min(40,Math.max(fitPPD()*.85,ST.ppd));
  const vis=(W-LW)/ST.ppd; const lo=relMin()-30;ST.x0=Math.max(lo,Math.min(ST.x0,Math.max(lo,maxDay()+30-vis)));
  ST.y0=Math.max(0,Math.min(ST.y0,Math.max(0,nRows()*rowH-(H-AX)+8)));
}
function resize(){const r=cv.getBoundingClientRect();if(!r.width)return;DPR=window.devicePixelRatio||1;W=r.width;H=r.height;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);LW=W<520?86:132}

// primitives
function line(x1,y1,x2,y2,c,w=1,dash){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.setLineDash(dash||[]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([])}
function rect(x,y,w,h,c,a=1){ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(x,y,w,h);ctx.globalAlpha=1}
function circ(x,y,r,fill,stroke,lw=1.2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function text(s,x,y,c,font,align='left'){ctx.fillStyle=c;ctx.font=font||'10px '+MONO;ctx.textAlign=align;ctx.fillText(s,x,y)}
function poly(pts,c){ctx.beginPath();pts.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=c;ctx.fill()}
const diamond=(x,y,r,c)=>poly([[x,y-r],[x+r,y],[x,y+r],[x-r,y]],c);
const triDown=(x,y,r,c)=>poly([[x-r,y-r*.8],[x+r,y-r*.8],[x,y+r*.8]],c);
const triRight=(x,y,r,c)=>poly([[x-r*.7,y-r],[x+r,y],[x-r*.7,y+r]],c);
function cross(x,y,r,c){line(x-r,y-r,x+r,y+r,c,2);line(x-r,y+r,x+r,y-r,c,2)}
function hit(x,y,w,h,p,html,lab){hits.push({x,y,w,h,p,html,lab})}
const inView=x=>x>LW-30&&x<W+30;

// tooltips
const aeTip=a=>`<b>${a.term}</b> · grade ${a.g}${a.ir?' · immune-related':''}${a.ser?' · serious':''}<br>Day ${a.s} to ${a.e}${a.dc?'<br>Led to stopping treatment':''}`;
const labTip=(l,p)=>{let s=`<b>${l.t} ${l.val} ${LABS[l.t].u}</b>${l.f?(l.f==='H'?' high':' low'):''}<br>${l.x.toFixed(2)}× upper limit of normal · Day ${l.d}`;
  if(l.t==='ALT'||l.t==='AST'){const b=p.lb.find(m=>m.d===l.d&&m.t==='BILI');if(b)s+=`<br>Bilirubin same visit: ${b.x.toFixed(2)}× ULN`}return s};
const cmTip=c=>`<b>${c.name}</b><br>Day ${c.s} to ${c.e} · for ${c.why}`;

// one function per domain layer: (patient, lane centre y, lane height, peeled?)
function packed(p,items,cy,h,tn,colorFn,labelFn,tipFn,outlineFn){
  const L=level(),th=(h-6)/tn,tr=new Array(tn).fill(-1e9);ctx.font='10px '+BODY;
  for(const a of items){
    let k=tr.findIndex(t=>t<a.s);if(k<0)k=tr.indexOf(Math.min(...tr));
    const x=X(a.s),w=Math.max(2,(a.e-a.s)*ST.ppd),yy=cy-h/2+3+k*th;
    const lab=L===2&&th>=7?labelFn(a):'';ctx.font='10px '+BODY;const lw=lab?ctx.measureText(lab).width+8:0;
    tr[k]=a.e+(lw+4)/ST.ppd;
    if(x>W+20||x+w+lw<LW-20)continue;
    rect(x,yy+1,w,th-2,colorFn(a),.92);
    if(outlineFn&&outlineFn(a)){ctx.strokeStyle=COL.ink;ctx.lineWidth=1;ctx.strokeRect(x+.5,yy+1.5,Math.max(1,w-1),th-3)}
    if(lab)text(lab,x+w+4,yy+th/2+3.5,COL.ink,'10px '+BODY);
    hit(x,yy,Math.max(w,4),th,p,tipFn(a));
  }
}
const DRAW={
  EX(p,cy,h,peel){const L=level();
    if(peel){rect(X(1),cy-2,(p.trtT+20)*ST.ppd,4,armC(p),.3);
      if(p.ds.xo){const xs=p.ex.filter(e=>e.xo);if(xs.length)rect(X(p.ds.xo),cy-2,(xs[xs.length-1].d-p.ds.xo+21)*ST.ppd,4,COL.accent,.3)}}
    if(L===0)return;
    const th=peel?h*.62:(L===2?12:8);
    for(const e of p.ex){if(!(e.drug==='Placebo'||e.drug==='Pembrolizumab'))continue;const x=X(e.d);if(!inView(x))continue;
      line(x,cy-th/2,x,cy+th/2,e.xo?COL.accent:COL['c-ex'],L===2?2:1.4);
      const chem=e.xo?[]:p.ex.filter(c=>c.d===e.d&&c!==e&&!c.xo);
      if(L===2&&peel){chem.forEach((c,k)=>circ(x+4.5,cy-th/2+3+k*5,1.8,c.drug==='Pemetrexed'?COL['c-ex']:COL.ink));
        if(ST.ppd*21>30)text('C'+e.c,x+8,cy+th/2-1,COL.muted,'9px '+MONO)}
      hit(x-3,cy-th/2,7,th,p,`<b>Cycle ${e.c}${e.xo?' (crossover)':''}</b> · Day ${e.d}<br>${e.drug} ${e.dose}${chem.length?'<br>+ '+chem.map(c=>c.drug+' '+c.dose).join('<br>+ '):''}`)}
  },
  AE(p,cy,h,peel){const L=level();
    if(peel){packed(p,p.ae.filter(a=>L>0||a.g>=3),cy,h,L===2?3:2,a=>gc(a.g),a=>`${a.term} ${a.g}`,aeTip,a=>a.ir);return}
    for(const a of p.ae){if(L===0&&a.g<3)continue;const x=X(a.s);if(!inView(x)&&!inView(X(a.e)))continue;
      if(L===0){triDown(x,cy-7,4.5,gc(a.g));hit(x-5,cy-12,10,10,p,aeTip(a));continue}
      const yy=cy+(L===2?6:4),hh=L===2?4:2.5,w=Math.max(2,(a.e-a.s)*ST.ppd);
      rect(x,yy,w,hh,gc(a.g),.95);if(a.ir)line(x,yy-.8,x+w,yy-.8,COL.ink,1);
      hit(x,yy-3,w,hh+6,p,aeTip(a))}
  },
  LB(p,cy,h,peel){const L=level(),t=ST.lab,pts=p.lb.filter(l=>l.t===t);
    if(peel&&L>=1){const top=cy-h/2+3,bot=cy+h/2-3,lim=t==='TSH'?4:t==='ANC'?1.6:5;
      const yv=x=>bot-(Math.min(lim,x)/lim)*(bot-top);
      line(X(-10),yv(1),X(p.ds.last),yv(1),COL['c-lb'],.8,[3,3]);
      if(t==='ANC')line(X(-10),yv(LABS.ANC.lln/LABS.ANC.uln),X(p.ds.last),yv(LABS.ANC.lln/LABS.ANC.uln),COL['c-lb'],.8,[1,3]);
      if(L===2){ctx.beginPath();pts.forEach((l,k)=>{const xx=X(l.d),yy=yv(l.x);k?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.strokeStyle=COL['c-lb'];ctx.lineWidth=1.3;ctx.stroke()}
      for(const l of pts){const xx=X(l.d);if(!inView(xx))continue;const yy=yv(l.x);
        if(l.f)circ(xx,yy,L===2?3:2.4,l.f==='H'?COL['c-lb']:COL.panel,COL['c-lb']);else if(L===2)circ(xx,yy,1.5,COL.muted);
        if(L===2&&l.f&&(l.x>=2||l.f==='L'))text(l.x.toFixed(1)+'×',xx+4,yy-4,COL['c-lb'],'9px '+MONO);
        hit(xx-4,yy-4,8,8,p,labTip(l,p))}
      return}
    if(L===0&&!peel)return;
    const yy=peel?cy:cy-(L===2?11:6);
    for(const l of pts){if(!l.f||(L===0&&l.x<3))continue;const xx=X(l.d);if(!inView(xx))continue;
      const r=Math.min(4,1.6+Math.abs(Math.log2(l.x))*.9);circ(xx,yy,r,l.f==='H'?COL['c-lb']:COL.panel,COL['c-lb']);
      if(L===2&&l.x>=2)text(l.x.toFixed(1)+'×',xx+r+2,yy+3,COL['c-lb'],'9px '+MONO);
      hit(xx-4,yy-4,8,8,p,labTip(l,p))}
  },
  TR(p,cy,h,peel){const L=level();if(L===0)return;
    let yv=()=>cy;
    if(peel&&L===2){const top=cy-h/2+4,bot=cy+h/2-4;yv=v=>top+(60-Math.min(60,Math.max(-100,v)))/160*(bot-top);
      line(X(-10),yv(0),X(p.ds.last),yv(0),COL.line,1);line(X(-10),yv(-30),X(p.ds.last),yv(-30),COL['c-tr'],.8,[3,3]);
      ctx.beginPath();p.tr.forEach((t,k)=>{const xx=X(t.d),yy=yv(t.pct);k?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.strokeStyle=COL['c-tr'];ctx.lineWidth=1.2;ctx.stroke()}
    for(const t of p.tr){const xx=X(t.d);if(!inView(xx))continue;const yy=yv(t.pct);
      if(t.resp==='BL')circ(xx,yy,2,COL.muted);
      else{const r=L===2?4.5:3.3;circ(xx,yy,r,t.resp==='SD'?COL.panel:RC(t.resp),RC(t.resp),1.4);if(t.resp==='CR')circ(xx,yy,r+2.5,null,RC(t.resp),1);
        if(L===2&&peel)text(`${t.resp} ${t.pct>0?'+':''}${t.pct}%`,xx+7,yy+3.5,COL.muted,'9px '+MONO)}
      hit(xx-5,yy-5,10,10,p,`<b>${RESP[t.resp]}</b> · Day ${t.d}<br>Sum of target lesions ${t.sld} mm (${t.pct>0?'+':''}${t.pct}% vs baseline)`)}
  },
  CM(p,cy,h,peel){const L=level();
    if(peel){const list=p.cm.filter(c=>L===2||!c.bg);packed(p,list,cy,h,Math.min(3,Math.max(1,list.length)),c=>COL['c-cm'],c=>c.name,cmTip);return}
    if(L===0)return;const yy=cy+(L===2?12:8);
    for(const c of p.cm){if(c.bg)continue;const x=X(c.s),w=Math.max(2,(c.e-c.s)*ST.ppd);rect(x,yy,w,1.8,COL['c-cm']);hit(x,yy-3,w,8,p,cmTip(c))}
  }
};
function drawDS(p,y){
  const L=level(),cy=y+rowH/2,top=y+3,bot=y+rowH-3,my=ST.peel?top+5:cy;
  if(p.ds.pd){const x=X(p.ds.pd);if(ST.peel)line(x,top,x,bot,COL.crit,1,[2,2]);diamond(x,my,L===0?4:5,COL.crit);hit(x-5,my-6,10,12,p,`<b>Progressive disease</b> · Day ${p.ds.pd}`)}
  if(p.ds.xo){const x=X(p.ds.xo);triRight(x,my,4.5,COL.accent);hit(x-5,my-6,10,12,p,`<b>Crossover</b> to pembrolizumab · Day ${p.ds.xo}`)}
  if(p.ds.death){const x=X(p.ds.death);if(ST.peel)line(x,top,x,bot,COL.ink,1,[2,2]);cross(x,my,3.5,COL.ink);hit(x-5,my-6,10,12,p,`<b>Death</b> · Day ${p.ds.death}`)}
  else{const x=X(p.fu);line(x,my-5,x,my+5,COL.muted,1.5);hit(x-4,my-6,8,12,p,`<b>Alive at data cut</b> · Day ${p.fu}`)}
  for(const s of p.sig){if(s.sev==='info')continue;const x=X(s.day),f=ST.focus===s;circ(x,cy,f?11:8,null,sevC(s.sev),f?2.5:1.3);if(f)circ(x,cy,15,null,sevC(s.sev),1)}
}
function drawRow(p,y,i){OFF=p.off;
  if(ST.sel===p)rect(LW,y,W-LW,rowH,COL.accent,.09);else if(i%2)rect(LW,y,W-LW,rowH,COL.soft);
  if(ST.peel){
    DOM.filter(d=>ST.layers.has(d.k)).forEach((d,j)=>{const lc=y+5+j*laneH+laneH/2;
      line(X(1),lc,X(p.ds.last),lc,COL.grid,1);DRAW[d.k](p,lc,laneH,true)});
    line(LW,y+rowH-.5,W,y+rowH-.5,COL.line,1);
  }else{
    const cy=y+rowH/2,L=level(),bh=L===0?6:L===1?5:7;
    line(X(1),cy,X(p.ds.last),cy,COL.line,1);
    rect(X(1),cy-bh/2,Math.max(1,(p.trtT+20)*ST.ppd),bh,armC(p),.5);
    if(p.ds.xo){const xs=p.ex.filter(e=>e.xo);if(xs.length)rect(X(p.ds.xo),cy-bh/2,(xs[xs.length-1].d-p.ds.xo+21)*ST.ppd,bh,COL.accent,.25)}
    DOM.forEach(d=>{if(ST.layers.has(d.k))DRAW[d.k](p,cy,rowH,false)});
  }
  drawDS(p,y);
}
const tickStep=()=>[7,21,42,84,168,336].find(s=>s*ST.ppd>=58)||336;
function drawAxis(st){
  rect(0,0,W,AX,COL.panel);line(0,AX-.5,W,AX-.5,COL.line);
  ctx.save();ctx.beginPath();ctx.rect(LW,0,W-LW,AX);ctx.clip();
  for(let t=tick0(st);X(t)<W+40;t+=st){const x=X(t);line(x+.5,AX-5,x+.5,AX,COL.muted);text(tickLabel(t),x+3,AX-9,t===0&&ST.align!=='rand'?COL.ink:COL.muted,(t===0&&ST.align!=='rand'?'600 ':'')+'10px '+MONO)}
  ctx.restore();text(ST.mode==='DT'?'Measure':LW<100?'Patient':'Patient · week',10,AX-9,COL.muted,'600 10px '+BODY);
}
function drawLabels(){
  rect(0,AX,LW,H-AX,COL.panel);line(LW-.5,AX,LW-.5,H,COL.line);
  ROWS.forEach((p,i)=>{const y=AX+i*rowH-ST.y0;if(y+rowH<AX||y>H)return;
    if(ST.sel===p)rect(0,y,LW,rowH,COL.accent,.14);
    const ty=ST.peel?y+15:y+rowH/2+(rowH>=30?-2:4);
    rect(9,ty-8,4,10,armC(p));
    const id=LW<100?p.id.slice(-4):p.id;text(id,17,ty,COL.ink,'11px '+MONO);
    if(p.sig.some(s=>s.sev!=='info')){ctx.font='11px '+MONO;const sv=p.sig.some(s=>s.sev==='crit')?'crit':'warn';circ(17+ctx.measureText(id).width+7,ty-4,3.2,sevC(sv))}
    if(ST.peel||rowH>=30)text(`TPS ${p.tps}% · ${p.bor}${ST.align!=='rand'?' · @D'+p.off:''}`,17,ty+13,COL.muted,'11px '+BODY);
    if(ST.peel)DOM.filter(d=>ST.layers.has(d.k)).forEach((d,j)=>{if(j===0&&LW<100)return;text(d.k,LW-6,y+5+j*laneH+laneH/2+3,COL[d.v.slice(2)],'9px '+MONO,'right')});
    hit(0,y,LW,rowH,p,`<b>${p.id}</b><br>${p.arm==='P'?'Pembrolizumab':'Placebo'} + pemetrexed + ${p.plat.toLowerCase()}<br>PD-L1 TPS ${p.tps}% · best response: ${RESP[p.bor]}`,true)});
}
const tick0=st=>{const b=ST.align==='rand'?1:0;return Math.ceil((ST.x0-b)/st)*st+b};
const tickLabel=t=>ST.align==='rand'?(t===1?'Day 1':`Wk ${(t-1)/7}`):(t===0?'Anchor':`${t>0?'+':'−'}${Math.abs(t/7)} wk`);
function draw(){
  if(!W)return;
  ctx.setTransform(DPR,0,0,DPR,0,0);rect(0,0,W,H,COL.panel);
  layout();clampView();hits=[];OFF=0;
  if(ST.mode==='PD'){drawMatrix();$('zLvl').textContent='Matrix';return}
  const st=tickStep();
  ctx.save();ctx.beginPath();ctx.rect(LW,AX,W-LW,H-AX);ctx.clip();
  for(let t=tick0(st);X(t)<W;t+=st)line(X(t)+.5,AX,X(t)+.5,H,COL.grid,1);
  if(ST.mode==='DT')drawSummary();else ROWS.forEach((p,i)=>{const y=AX+i*rowH-ST.y0;if(y+rowH<AX||y>H)return;drawRow(p,y,i)});
  OFF=0;if(ST.align!=='rand')line(X(0)+.5,AX,X(0)+.5,H,COL.ink,1.5);
  ctx.restore();
  if(ST.mode==='DT')drawSummaryLabels();else drawLabels();
  drawAxis(st);
  if(!ROWS.length)text('No patients have this anchor with these filters.',LW+16,AX+34,COL.muted,'14px '+BODY);
  $('zLvl').textContent=['Overview','Events','Detail'][level()];
}
