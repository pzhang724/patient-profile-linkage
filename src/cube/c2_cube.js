// ---------- Cube helpers: anchors, per-patient features, time-bin measures, flat tables ----------
const AE_TERMS=[...new Set(PTS.flatMap(p=>p.ae.map(a=>a.term)))].sort();
const ALIGN_NAME={rand:'Randomization',g3:'First grade ≥3 AE',ir:'First immune-related AE',term:'First AE of term',cpr:'Confirmed partial response',pd:'Progression',xo:'Crossover'};
const isResp=r=>r==='PR'||r==='CR';
function anchorDay(p,a,term){
  if(a==='rand')return 0;
  if(a==='g3'){const x=p.ae.find(e=>e.g>=3);return x?x.s:null}
  if(a==='ir'){const x=p.ae.find(e=>e.ir);return x?x.s:null}
  if(a==='term'){const x=p.ae.find(e=>e.term===term);return x?x.s:null}
  if(a==='cpr'){const r=p.tr.filter(t=>t.d>0);for(const t of r)if(isResp(t.resp)&&r.some(u=>u.d>=t.d+28&&isResp(u.resp)))return t.d;return null}
  if(a==='pd')return p.ds.pd??null;
  if(a==='xo')return p.ds.xo??null;
  return 0;
}
const maxGap=p=>{const d=[...new Set(p.ex.filter(e=>!e.xo).map(e=>e.d))].sort((a,b)=>a-b);let g=0;for(let i=1;i<d.length;i++)g=Math.max(g,d[i]-d[i-1]);return g};
const peakX=(p,t)=>Math.max(0,...p.lb.filter(l=>l.t===t).map(l=>l.x));
// Columns of the patient × domain matrix (time collapsed)
const FEAT=[
  {k:'cyc',dom:'EX',name:'Cycles given',f:p=>new Set(p.ex.filter(e=>!e.xo).map(e=>e.d)).size,max:30},
  {k:'gap',dom:'EX',name:'Longest gap (days)',f:maxGap,max:56},
  {k:'nae',dom:'AE',name:'AEs reported',f:p=>p.nAE,max:10},
  {k:'mxg',dom:'AE',name:'Worst grade',f:p=>Math.max(0,...p.ae.map(a=>a.g)),grade:true},
  {k:'irg',dom:'AE',name:'Worst immune AE grade',f:p=>Math.max(0,...p.ae.filter(a=>a.ir).map(a=>a.g)),grade:true},
  {k:'alt',dom:'LB',name:'Peak ALT ×ULN',f:p=>peakX(p,'ALT'),max:4,dec:1},
  {k:'cre',dom:'LB',name:'Peak creatinine ×ULN',f:p=>peakX(p,'CREAT'),max:2.5,dec:1},
  {k:'tsh',dom:'LB',name:'Peak TSH ×ULN',f:p=>peakX(p,'TSH'),max:4,dec:1},
  {k:'anc',dom:'LB',name:'Lowest ANC ×LLN',f:p=>Math.min(9,...p.lb.filter(l=>l.t==='ANC').map(l=>l.val/LABS.ANC.lln)),max:3,dec:1,low:true},
  {k:'best',dom:'TR',name:'Best % change',f:p=>p.best,div:true},
  {k:'bor',dom:'TR',name:'Best response',f:p=>p.bor,cat:true},
  {k:'ster',dom:'CM',name:'Steroid days',f:p=>p.cm.filter(c=>c.name==='Prednisone').reduce((s,c)=>s+c.e-c.s,0),max:90},
  {k:'cmn',dom:'CM',name:'Treatment meds',f:p=>p.cm.filter(c=>!c.bg).length,max:4}
];
for(const p of PTS){p.F={};for(const c of FEAT)p.F[c.k]=c.f(p)}
// Rows of the domain × time summary (patients collapsed). a,b = absolute study-day window
const io=e=>e.drug==='Pembrolizumab'||e.drug==='Placebo';
const MEAS=[
  {dom:'EX',name:'Dosed (pembrolizumab or placebo)',num:(p,a,b)=>p.ex.some(e=>io(e)&&e.d>=a&&e.d<b)},
  {dom:'AE',name:'Grade ≥3 AE ongoing',num:(p,a,b)=>p.ae.some(x=>x.g>=3&&x.s<b&&x.e>=a)},
  {dom:'AE',name:'Immune-related AE ongoing',num:(p,a,b)=>p.ae.some(x=>x.ir&&x.s<b&&x.e>=a)},
  {dom:'LB',name:'LAB outside normal range',lab:true,den:(p,a,b,t)=>p.lb.some(l=>l.t===t&&l.d>=a&&l.d<b),num:(p,a,b,t)=>p.lb.some(l=>l.t===t&&l.d>=a&&l.d<b&&l.f)},
  {dom:'TR',name:'Responding at scan (CR or PR)',den:(p,a,b)=>p.tr.some(t=>t.d>0&&t.d>=a&&t.d<b),num:(p,a,b)=>p.tr.some(t=>t.d>=a&&t.d<b&&isResp(t.resp))},
  {dom:'TR',name:'Progressed so far',num:(p,a,b)=>p.ds.pd!=null&&p.ds.pd<b},
  {dom:'CM',name:'On corticosteroid',num:(p,a,b)=>p.cm.some(c=>c.name==='Prednisone'&&c.s<b&&c.e>=a)}
];
const observed=(p,a,b)=>a<=p.ds.last&&b>-14;
// Flat SDTM-like tables the agent can query
const TB={DM:[],AE:[],LB:[],EX:[],TR:[],CM:[],SIG:[]};
for(const p of PTS){const A=p.arm==='P'?'Pembrolizumab + chemo':'Placebo + chemo',u=p.id;
  TB.DM.push({USUBJID:u,ARM:A,AGE:p.age,SEX:p.sex,TPS:p.tps,TPSGRP:['<1%','1-49%','>=50%'][p.tg],ECOG:p.ecog,PLATINUM:p.plat,BOR:p.bor,BESTPCHG:p.best,PDDY:p.ds.pd,DTHDY:p.ds.death,XODY:p.ds.xo,LASTDY:p.ds.last,NAE:p.nAE,LASTDOSEDY:p.trtT});
  p.ae.forEach(a=>TB.AE.push({USUBJID:u,ARM:A,AETERM:a.term,AESOC:a.soc,AETOXGR:a.g,AEIR:a.ir?'Y':'N',AESER:a.ser?'Y':'N',AESTDY:a.s,AEENDY:a.e}));
  p.lb.forEach(l=>TB.LB.push({USUBJID:u,ARM:A,LBTESTCD:l.t,LBSTRESN:l.val,XULN:+l.x.toFixed(2),LBNRIND:l.f==='H'?'HIGH':l.f==='L'?'LOW':'NORMAL',LBDY:l.d}));
  p.ex.forEach(e=>TB.EX.push({USUBJID:u,ARM:A,EXTRT:e.drug,EXDOSE:e.dose,CYCLE:e.c,EXSTDY:e.d,CROSSOVER:e.xo?'Y':'N'}));
  p.tr.forEach(t=>TB.TR.push({USUBJID:u,ARM:A,TRDY:t.d,SLD:t.sld,PCHG:t.pct,RSORRES:t.resp}));
  p.cm.forEach(c=>TB.CM.push({USUBJID:u,ARM:A,CMTRT:c.name,CMINDC:c.why,CMSTDY:c.s,CMENDY:c.e}));
  p.sig.forEach(s=>TB.SIG.push({USUBJID:u,ARM:A,SIGNAL:s.title,DETAIL:s.detail,SEVERITY:s.sev,DAY:s.day}));
}
