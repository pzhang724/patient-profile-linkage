// ---------- Collapsed views: patient × domain matrix, domain × time summary ----------
ST.mx=0;
const DOMV={EX:'c-ex',AE:'c-ae',LB:'c-lb',TR:'c-tr',CM:'c-cm'};
const MTOP=56;
const ALERT={alt:v=>v>=3,cre:v=>v>=1.5,tsh:v=>v>=2,anc:v=>v<1,gap:v=>v>42,mxg:v=>v>=3,irg:v=>v>=3};
function nRows(){return ST.mode==='DT'?dtRows().length:ROWS.length+(ST.mode==='PD'?2:0)}
const matCols=()=>FEAT.filter(c=>ST.layers.has(c.dom));
const fmtF=(c,v)=>c.cat?v:c.grade?(v?'Grade '+v:'–'):c.div?(v>0?'+':'')+v+'%':c.dec?v.toFixed(c.dec)+'×':String(v);
function fitText(s,maxW,font){ctx.font=font;if(ctx.measureText(s).width<=maxW)return s;while(s.length>2&&ctx.measureText(s+'…').width>maxW)s=s.slice(0,-1);return s+'…'}
function wrap2(s,maxW,font){ctx.font=font;const w=s.split(' ');let a='',i=0;for(;i<w.length;i++){const t=a?a+' '+w[i]:w[i];if(ctx.measureText(t).width>maxW&&a)break;a=t}
  return [a,fitText(w.slice(i).join(' '),maxW,font)].filter(Boolean)}
function matCW(n){return Math.max(64,(W-LW-6)/Math.max(1,n))}
function drawMatrix(){
  const cols=matCols(),cw=matCW(cols.length),maxMx=Math.max(0,cols.length*cw-(W-LW));ST.mx=Math.max(0,Math.min(ST.mx,maxMx));
  ctx.save();ctx.beginPath();ctx.rect(LW,MTOP,W-LW,H-MTOP);ctx.clip();
  ROWS.forEach((p,i)=>{const y=MTOP+i*rowH-ST.y0;if(y+rowH<MTOP||y>H)return;
    if(ST.sel===p)rect(LW,y,W-LW,rowH,COL.accent,.1);else if(i%2)rect(LW,y,W-LW,rowH,COL.soft);
    cols.forEach((c,j)=>{const x=LW+j*cw-ST.mx;if(x+cw<LW||x>W)return;const v=p.F[c.k],pad=6,bw=cw-pad*2;
      const al=ALERT[c.k]&&ALERT[c.k](v),s=fmtF(c,v);
      if(c.cat)circ(x+pad+3,y+rowH/2-1,3.5,RC(v));
      text(s,x+pad+(c.cat?10:0),y+rowH/2+2,al?COL.crit:(c.grade&&!v?COL.muted:COL.ink),(al?'600 ':'')+'11px '+MONO);
      let f=0,col=COL[DOMV[c.dom]];
      if(c.grade){f=v/5;col=gc(v||1)}else if(c.div){f=Math.min(1,Math.abs(v)/100);col=v<0?COL['c-tr']:COL.crit}
      else if(!c.cat){f=c.low?1-Math.min(v,c.max)/c.max:Math.min(v,c.max)/c.max}
      if(f>0)rect(x+pad,y+rowH-7,Math.max(2,bw*f),3,col,.9);
      if(j)line(x+.5,y+3,x+.5,y+rowH-3,COL.grid,1);
      hit(x,y,cw,rowH,p,`<b>${p.id}</b><br>${c.name}: ${s}${ST.align!=='rand'?'<br>Anchor on day '+p.off:''}`)});
  });
  ctx.restore();
  // header
  rect(0,0,W,MTOP,COL.panel);line(0,MTOP-.5,W,MTOP-.5,COL.line);
  ctx.save();ctx.beginPath();ctx.rect(LW,0,W-LW,MTOP);ctx.clip();
  let prev='';cols.forEach((c,j)=>{const x=LW+j*cw-ST.mx,dc=COL[DOMV[c.dom]];
    if(c.dom!==prev){line(x+1,4.5,x+cw*FEAT.filter(f=>f.dom===c.dom&&ST.layers.has(f.dom)).length-1,4.5,dc,2);text(c.dom,x+6,18,dc,'600 10px '+MONO);prev=c.dom}
    const on=ST.sort==='f:'+c.k;
    wrap2(c.name,cw-12,'11px '+BODY).forEach((t,k)=>text(t,x+6,33+k*13,on?COL.ink:COL.muted,(on?'600 ':'')+'11px '+BODY));
    if(on)text('▼',x+cw-12,18,COL.ink,'9px '+BODY);
    hit(x,0,cw,MTOP,null,`<b>${c.name}</b><br>Click to sort patients by this column`,false,()=>sortBy('f:'+c.k,c.name))});
  ctx.restore();
  // patient labels
  rect(0,MTOP,LW,H-MTOP,COL.panel);line(LW-.5,0,LW-.5,H,COL.line);
  text(ST.align==='rand'?'Patient':'Patient · anchor',10,MTOP-9,COL.muted,'600 10px '+BODY);
  ROWS.forEach((p,i)=>{const y=MTOP+i*rowH-ST.y0;if(y+rowH<MTOP||y>H)return;
    if(ST.sel===p)rect(0,y,LW,rowH,COL.accent,.14);rect(9,y+7,4,10,armC(p));
    text(LW<100?p.id.slice(-4):p.id,17,y+16,COL.ink,'11px '+MONO);
    hit(0,y,LW,rowH,p,`<b>${p.id}</b><br>${p.arm==='P'?'Pembrolizumab':'Placebo'} + chemo · TPS ${p.tps}%`,true)});
  if(!ROWS.length)text('No patients have this anchor with these filters.',LW+16,MTOP+30,COL.muted,'14px '+BODY);
}
function dtRows(){const arms=ST.arm==='all'?['P','B']:[ST.arm],out=arms.map(a=>({n:true,arm:a}));
  MEAS.filter(m=>ST.layers.has(m.dom)).forEach(m=>arms.forEach(a=>out.push({m,arm:a})));return out}
const binW=()=>level()===2?7:21;
const armName=a=>a==='P'?'Pembro + chemo':'Placebo + chemo';
const relRange=(a,b)=>ST.align==='rand'?`Days ${a} to ${b-1}`:`Days ${a>0?'+':''}${a} to ${b-1>0?'+':''}${b-1} from anchor`;
const measName=m=>m.name.replace('LAB',ST.lab);
function drawSummary(){
  const rows=dtRows(),bw=binW(),base=ST.align==='rand'?1:0,k0=Math.floor((ST.x0-base)/bw)*bw+base,w=bw*ST.ppd;
  const pa={P:ROWS.filter(p=>p.arm==='P'),B:ROWS.filter(p=>p.arm==='B')};
  rows.forEach((r,i)=>{const y=AX+i*rowH-ST.y0;if(y+rowH<AX||y>H)return;
    if(i%2)rect(LW,y,W-LW,rowH,COL.soft);
    if(i&&(r.m!==rows[i-1].m))line(LW,y+.5,W,y+.5,COL.line,1);
    const ps=pa[r.arm];
    for(let a=k0;X(a)<W;a+=bw){const b=a+bw,x=X(a);if(x+w<LW)continue;let den=0,num=0;const ids=[];
      for(const p of ps){const A=a+p.off,B=b+p.off;if(!observed(p,A,B))continue;
        if(r.n){den++;ids.push(p.id);continue}
        if(r.m.den&&!r.m.den(p,A,B,ST.lab))continue;den++;if(r.m.num(p,A,B,ST.lab)){num++;ids.push(p.id)}}
      if(!den)continue;
      if(r.n){const f=den/Math.max(1,ps.length);rect(x+.5,y+3,w-1,rowH-6,armC({arm:r.arm}),.12+.5*f);
        if(w>=22)text(String(den),x+w/2,y+rowH/2+4,COL.ink,'10px '+MONO,'center');
        hit(x,y,w,rowH,null,`<b>${armName(r.arm)}</b><br>${relRange(a,b)}: ${den} of ${ps.length} patients observed<br>Click to open them as lanes`,false,()=>drill(ids,`${armName(r.arm)}, observed ${relRange(a,b).toLowerCase()}`));continue}
      const f=num/den,thin=den<3;
      rect(x+.5,y+2,w-1,rowH-4,COL[DOMV[r.m.dom]],thin?.1+.25*f:.06+.8*f);
      if(w>=24&&num)text(String(Math.round(f*100)),x+w/2,y+rowH/2+4,f>.6&&!thin?COL.panel:COL.ink,'10px '+MONO,'center');
      hit(x,y,w,rowH,null,`<b>${measName(r.m)}</b> · ${armName(r.arm)}<br>${relRange(a,b)}: ${num} of ${den} (${Math.round(f*100)}%)${num?'<br>Click to open these patients as lanes':''}`,false,num?()=>drill(ids,`${measName(r.m)}, ${relRange(a,b).toLowerCase()}`):null)}
  });
}
function drawSummaryLabels(){
  rect(0,AX,LW,H-AX,COL.panel);line(LW-.5,AX,LW-.5,H,COL.line);
  const rows=dtRows(),one=ST.arm!=='all';
  rows.forEach((r,i)=>{const y=AX+i*rowH-ST.y0;if(y+rowH<AX||y>H)return;
    if(i&&r.m!==rows[i-1].m)line(0,y+.5,LW,y+.5,COL.line,1);
    rect(9,y+6,4,10,armC({arm:r.arm}));
    const first=one||i===0||r.m!==rows[i-1].m,nm=r.n?'Patients observed':measName(r.m);
    if(first)text(fitText(nm,LW-74,'11px '+BODY),17,y+15,COL.ink,'11px '+BODY);
    text(r.arm==='P'?'Pembro':'Placebo',LW-8,y+15,COL.muted,'10px '+MONO,'right');
    hit(0,y,LW,rowH,null,`<b>${nm}</b><br>${armName(r.arm)}${r.n?'':' · '+(r.m.den?'% of patients assessed in each window':'% of patients observed in each window')}`,true)});
}
