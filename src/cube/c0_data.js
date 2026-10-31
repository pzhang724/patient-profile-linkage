// ---------- Synthetic raw data (seeded, reproducible) ----------
const CUTOFF = 760;            // global data-cut day since first enrollment
const DOM = [
  {k:'EX', name:'Exposure', v:'--c-ex'},
  {k:'AE', name:'Adverse events', v:'--c-ae'},
  {k:'LB', name:'Labs', v:'--c-lb'},
  {k:'TR', name:'Tumor response', v:'--c-tr'},
  {k:'CM', name:'Con meds', v:'--c-cm'}
];
const LABS = {ALT:{uln:40,lln:7,u:'U/L'},AST:{uln:40,lln:10,u:'U/L'},BILI:{uln:1.2,lln:0.2,u:'mg/dL'},
  CREAT:{uln:1.2,lln:0.6,u:'mg/dL'},TSH:{uln:4.5,lln:0.4,u:'mIU/L'},ANC:{uln:7.5,lln:1.5,u:'10^9/L'}};

function rngFrom(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R = rngFrom(189);
const U = (a,b)=>a+(b-a)*R();
const UI = (a,b)=>Math.floor(U(a,b+1));
const pick = a=>a[Math.floor(R()*a.length)];
const expo = med=>-Math.log(1-R())*med/Math.LN2;
const norm = ()=>{let u=0,v=0;while(!u)u=R();while(!v)v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};

const CHEMO_AE = [
  ['Nausea','GI',.55,.04],['Fatigue','General',.45,.06],['Anaemia','Blood',.45,.15],['Neutropenia','Blood',.35,.3],
  ['Constipation','GI',.3,.01],['Decreased appetite','Metab',.28,.02],['Diarrhoea','GI',.25,.05],['Vomiting','GI',.22,.03],
  ['Rash','Skin',.18,.02],['Pyrexia','General',.17,.01],['Thrombocytopenia','Blood',.17,.08],['Dyspnoea','Resp',.17,.04],
  ['Peripheral oedema','General',.15,.0],['Cough','Resp',.15,.0]];
const IR_AE = [['Hypothyroidism','Endocrine',.07,0],['Pneumonitis','Resp',.05,.45],['Hyperthyroidism','Endocrine',.04,0],
  ['Colitis','GI',.025,.5],['Hepatitis','Hepatobiliary',.02,.7],['Acute kidney injury','Renal',.04,.4],['Severe skin reaction','Skin',.02,.6]];

function makePatient(i){
  const arm = R()<2/3?'P':'B';
  const tg = R()<.31?0:(R()<.47?1:2);
  const tps = tg===0?0:tg===1?UI(1,49):UI(50,100);
  const enr = Math.round(U(0,300));
  const fu = CUTOFF-enr;
  const sex = R()<.6?'M':'F', age = Math.round(Math.min(84,Math.max(34,64+norm()*9)));
  const plat = R()<.72?'Carboplatin':'Cisplatin';
  const ecog = R()<.45?0:1;
  const id = `189-${String(100+UI(1,9)*10+UI(0,9))}-${String(i+1).padStart(4,'0')}`;
  // hidden timelines
  let pfsMed = arm==='P'? (tg===2?380:tg===1?260:200) : 150;
  const pfs = Math.max(30,expo(pfsMed));
  const os = pfs + expo(arm==='P'?260:200);
  const p = {i,id,arm,tps,tg,sex,age,plat,ecog,enr,fu,ex:[],ae:[],lb:[],tr:[],cm:[],ds:{},sig:[]};
  // tumor scans: wk6,12,18 then q9w
  const scans=[]; for(let d=43; d<=fu; d+= d<127?42:63) scans.push(d);
  const base = Math.round(U(35,130));
  const depth = arm==='P'? Math.min(.98,Math.max(0,U(-.05,.75)+(tg===2?.12:0))) : Math.max(0,U(-.1,.55));
  p.tr.push({d:-10,sld:base,pct:0,resp:'BL'});
  let nadir=base, pd=null;
  for(const d of scans){
    if(d>os) break;
    let sld;
    if(d<pfs){ sld = base*(1-depth*Math.min(1,d/130)) + norm()*2; }
    else { sld = Math.max(nadir*1.28, nadir+6) + norm()*2; }
    sld=Math.max(0,Math.round(sld)); nadir=Math.min(nadir,sld);
    const pct = Math.round((sld-base)/base*100);
    let resp = pct<=-30?'PR':'SD'; if(sld<=2){resp='CR'}
    if(!pd && d>=pfs){resp='PD'; pd=d;}
    else if(pd) resp = 'PD';
    p.tr.push({d,sld,pct,resp});
    if(pd && p.tr.filter(t=>t.resp==='PD').length>=2) break;
  }
  const death = os<=fu? Math.round(os): null;
  // treatment end
  let tbp = pd && arm==='P' && R()<.14 ? UI(2,4):0;            // treatment beyond progression
  let aeStop = R()<.12 ? Math.round(U(60,400)) : null;          // discontinuation for toxicity
  let eot = Math.min(fu, death??1e9, pd?pd+tbp*21:1e9, aeStop??1e9, 35*21);
  // dosing q3w
  let d=1, c=1, lastDose=1;
  while(d<=eot){
    const ind = c<=4;
    p.ex.push({d,c,drug:arm==='P'?'Pembrolizumab':'Placebo',dose:arm==='P'?'200 mg':'0 mg',ind});
    if(c<=35) p.ex.push({d,c,drug:'Pemetrexed',dose:'500 mg/m²',ind});
    if(ind) p.ex.push({d,c,drug:plat,dose:plat==='Carboplatin'?'AUC 5':'75 mg/m²',ind});
    lastDose=d; c++;
    d += 21 + (R()<.12?7:0) + (R()<.03?14:0);
  }
  // placebo crossover to pembro monotherapy after PD
  let xo=null;
  if(arm==='B' && pd && R()<.55 && (!death || death-pd>50)){
    xo = pd+UI(21,40); let d2=xo, cc=1;
    const xend = Math.min(fu, death??1e9, xo+expo(160));
    while(d2<=xend){p.ex.push({d:d2,c:cc++,drug:'Pembrolizumab',dose:'200 mg',xo:true}); d2+=21;}
  }
  const ioOn = arm==='P' || xo;
  const lastEx = Math.max(...p.ex.map(e=>e.d));
  // AEs
  const span = Math.max(30,lastEx+30);
  for(const [term,soc,rate,g3] of CHEMO_AE){
    if(R()<rate*(eot>60?1:.6)){
      const s=Math.round(U(2,Math.min(span,eot+21))); const g = R()<g3? (R()<.15?4:3) : (R()<.6?1:2);
      p.ae.push({s,e:s+UI(3,g>=3?28:20),term,soc,g,ir:false,ser:g>=3&&R()<.5});
    }
  }
  if(ioOn){
    const st = xo||1;
    for(const [term,soc,rate,g3] of IR_AE){
      if(R()<rate*2.2){
        const s=Math.round(st+U(30,Math.max(60,lastEx-st+20))); const g = R()<g3?(R()<.12?4:3):(R()<.5?1:2);
        p.ae.push({s,e:s+UI(14,term.includes('thyroid')?300:60),term,soc,g,ir:true,ser:g>=3});
      }
    }
  }
  if(aeStop){ p.ae.push({s:aeStop-UI(5,15),e:aeStop+UI(10,40),term:pick(['Pneumonitis','Neutropenic sepsis','Acute kidney injury','Colitis']),soc:'—',g:3,ir:false,ser:true,dc:true}); }
  if(death && R()<.08){ p.ae.push({s:death-UI(1,6),e:death,term:pick(['Pneumonia','Sepsis','Cardiac arrest']),soc:'Fatal',g:5,ir:false,ser:true}); }
  p.ae.sort((a,b)=>a.s-b.s);
  if(death){p.ae=p.ae.filter(a=>a.s<=death);p.ae.forEach(a=>{if(a.e>death)a.e=death})}
  // Labs: screening + day 1 of each cycle (+ crossover cycles)
  const visits=[-7,...new Set(p.ex.map(e=>e.d))].filter(v=>v<=fu).sort((a,b)=>a-b);
  const has = t=>p.ae.find(a=>a.term===t);
  const hep=has('Hepatitis'), aki=has('Acute kidney injury'), hypo=has('Hypothyroidism'), hyper=has('Hyperthyroidism'), neut=has('Neutropenia');
  const bALT=U(14,30), bCR=U(.65,1.05), bTSH=U(1,2.8), bANC=U(3,6), bBI=U(.3,.8);
  for(const v of visits){
    const inAE=(a,pad=10)=>a&&v>=a.s-3&&v<=a.e+pad;
    const alt = bALT*(1+.15*norm()) * (inAE(hep)? U(3.2,6):1) * (v>1&&R()<.06?U(1.6,2.6):1);
    const ast = alt*U(.8,1.15);
    const bili = bBI*(1+.15*norm()) * (inAE(hep)&&hep.g>=3? U(1.5,2.6):1);
    const cr = bCR*(1+.08*norm()) * (inAE(aki)? U(1.6,2.8):1) * (1+Math.min(.25,v/2500));
    const tsh = bTSH*(1+.2*norm()) * (inAE(hypo,400)? U(3,6): inAE(hyper)? U(.03,.12):1);
    const anc = bANC*(1+.2*norm()) * (inAE(neut)? U(.18,.45): v>1?U(.7,1):1);
    const vals={ALT:alt,AST:ast,BILI:bili,CREAT:cr,TSH:tsh,ANC:anc};
    for(const t in vals){
      if(t==='TSH' && v>1 && (visits.indexOf(v)%2)) continue;
      const L=LABS[t], val=+vals[t].toFixed(t==='ALT'||t==='AST'?0:2);
      p.lb.push({d:v,t,val,x:val/L.uln,f:val>L.uln?'H':val<L.lln?'L':''});
    }
  }
  // Con meds
  p.cm.push({s:-7,e:Math.min(fu,(arm==='P'||!xo?lastDose:lastDose)+21),name:'Folic acid',why:'Pemetrexed premedication',bg:true});
  for(const a of p.ae){
    if(a.ir && a.g>=2 && !a.term.includes('thyroid')) p.cm.push({s:a.s+UI(0,3),e:a.s+UI(28,56),name:'Prednisone',why:a.term});
    if(a.term==='Hypothyroidism') p.cm.push({s:a.s+UI(5,20),e:fu,name:'Levothyroxine',why:a.term});
    if(a.term==='Neutropenia'&&a.g>=3) p.cm.push({s:a.s+1,e:a.s+8,name:'Filgrastim',why:a.term});
  }
  p.ds = {eot:lastEx, pd, death, xo, tbp:tbp&&pd?true:false, aeStop, reason: death&&death<=lastEx+30?'Death':pd&&lastEx>=pd-21? 'Progressive disease': aeStop?'Adverse event': lastEx+21>=fu?'Ongoing':'Completed / other', last: death??fu};
  return p;
}
const PTS = Array.from({length:60},(_,i)=>makePatient(i));

// Plant a few known data problems so the signal engine has edge cases to find
(function plant(){
  let pw = PTS.filter(p=>p.arm==='P'&&p.ex.length>20);
  if(pw.length<9) pw = PTS.filter(p=>p.ex.length>14).sort((a,b)=>b.ex.length-a.ex.length);
  pw = Array.from({length:9},(_,k)=>pw[k%pw.length]);
  // 1) Hy's law pattern
  const h = pw[2]; const vd = h.ex[h.ex.length>40?30:12].d;
  h.lb.filter(l=>l.d===vd).forEach(l=>{ if(l.t==='ALT'){l.val=172;l.x=4.3;l.f='H'} if(l.t==='AST'){l.val=150;l.x=3.75;l.f='H'} if(l.t==='BILI'){l.val=2.9;l.x=2.42;l.f='H'} });
  h.ae.push({s:vd-2,e:vd+35,term:'Hepatitis',soc:'Hepatobiliary',g:3,ir:true,ser:true}); h.ae.sort((a,b)=>a.s-b.s);
  h.cm.push({s:vd+1,e:vd+45,name:'Prednisone',why:'Hepatitis'});
  // 2) AE recorded after death date
  const dd = PTS.find(p=>p.ds.death && p.ds.death>120 && !p.ae.some(a=>a.g===5));
  if(dd) dd.ae.push({s:dd.ds.death+9,e:dd.ds.death+14,term:'Fatigue',soc:'General',g:1,ir:false,ser:false});
  // 3) Grade 3 irAE with no steroid
  const ns = pw[5]; const s = Math.min(ns.ds.eot-10,120);
  ns.ae.push({s,e:s+30,term:'Colitis',soc:'GI',g:3,ir:true,ser:true}); ns.ae.sort((a,b)=>a.s-b.s);
  // 4) Long dosing gap
  const lg = pw[8]; const k = Math.min(10,lg.ex.length-1); const cut = lg.ex[k].d;
  lg.ex.forEach(e=>{ if(e.d>=cut && !e.xo) e.d+=35 }); lg.ex=lg.ex.filter(e=>e.d<=lg.fu);
})();

// ---------- Derived per-patient metrics + signal engine ----------
for(const p of PTS){
  const pd = p.ds.pd; p.pfsT = pd ?? (p.ds.death ?? p.fu);
  const exP = p.ex.filter(e=>!e.xo); p.trtT = exP.length? Math.max(...exP.map(e=>e.d)):0;
  p.nAE = p.ae.length; p.g3 = p.ae.some(a=>a.g>=3); p.irAny = p.ae.some(a=>a.ir);
  p.altMax = Math.max(...p.lb.filter(l=>l.t==='ALT').map(l=>l.x));
  p.best = Math.min(0,...p.tr.filter(t=>t.d>0 && (!pd||t.d<=pd)).map(t=>t.pct));
  const bor = p.tr.filter(t=>t.d>0).map(t=>t.resp); p.bor = bor.includes('CR')?'CR':bor.includes('PR')?'PR':bor.includes('SD')?'SD':bor.includes('PD')?'PD':'NE';
  p.ds.eot = p.trtT;
  const S=(sev,title,detail,day)=>p.sig.push({sev,title,detail,day,p});
  // Hy's law
  const days=[...new Set(p.lb.map(l=>l.d))];
  for(const d of days){ const a=p.lb.find(l=>l.d===d&&l.t==='ALT'), b=p.lb.find(l=>l.d===d&&l.t==='BILI');
    if(a&&b&&a.x>3&&b.x>2) S('crit',"Potential Hy's law",`ALT ${a.x.toFixed(1)}×ULN with bilirubin ${b.x.toFixed(1)}×ULN on the same visit`,d); }
  // AE after death
  if(p.ds.death) for(const a of p.ae) if(a.s>p.ds.death) S('crit','AE starts after death',`${a.term} starts day ${a.s}, death on day ${p.ds.death}`,a.s);
  // irAE >=3 without steroid
  for(const a of p.ae) if(a.ir && a.g>=3 && !a.term.includes('thyroid') && !p.cm.some(c=>c.name==='Prednisone'&&c.s>=a.s-3&&c.s<=a.s+14))
    S('warn','Grade ≥3 irAE, no steroid recorded',`${a.term} grade ${a.g} on day ${a.s}; no corticosteroid within 14 days`,a.s);
  // dosing gap
  const io=[...new Set(p.ex.filter(e=>!e.xo).map(e=>e.d))].sort((a,b)=>a-b);
  for(let j=1;j<io.length;j++) if(io[j]-io[j-1]>42) S('warn','Dosing gap over 6 weeks',`${io[j]-io[j-1]} days between cycles (day ${io[j-1]} → ${io[j]})`,io[j-1]);
  // treatment beyond progression
  if(pd){ const after = io.filter(d=>d>pd); if(after.length) S('info','Dosed after documented PD',`${after.length} cycle(s) after PD on day ${pd}; check treatment-beyond-progression criteria`,after[0]); }
  if(p.ds.xo) S('info','Crossover to pembrolizumab',`Placebo arm, PD day ${pd}, pembrolizumab from day ${p.ds.xo}`,p.ds.xo);
}
const ALLSIG = PTS.flatMap(p=>p.sig);
