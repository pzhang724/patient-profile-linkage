// ---------- Agent: query engine, view tools, chat ----------
const chat=$('chat');let turns=[],ctl=null,sampleFn=null,cur=null;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function md(s){let h='',ul=false;for(let l of esc(s).split('\n')){l=l.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`([^`]+)`/g,'<code>$1</code>');
  if(/^\s*([-*•]|\d+\.) /.test(l)){if(!ul){h+='<ul>';ul=true}h+='<li>'+l.replace(/^\s*([-*•]|\d+\.) /,'')+'</li>'}
  else{if(ul){h+='</ul>';ul=false}if(l.trim())h+='<p>'+l.replace(/^#+\s*/,'')+'</p>'}}return h+(ul?'</ul>':'')}
function addMsg(cls,html){const d=document.createElement('div');d.className='msg '+cls;d.innerHTML=html;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;return d}
function logStep(t){if(!cur)return;const s=document.createElement('div');s.className='step';s.textContent=t;cur.querySelector('.steps').appendChild(s);chat.scrollTop=chat.scrollHeight}

const lc=v=>String(v??'').toLowerCase();
const OPS={eq:(a,b)=>lc(a)===lc(b),ne:(a,b)=>lc(a)!==lc(b),gt:(a,b)=>a!=null&&+a>+b,ge:(a,b)=>a!=null&&+a>=+b,lt:(a,b)=>a!=null&&+a<+b,le:(a,b)=>a!=null&&+a<=+b,
  in:(a,b)=>[].concat(b).map(lc).includes(lc(a)),contains:(a,b)=>lc(a).includes(lc(b)),is_null:a=>a==null,not_null:a=>a!=null};
function runQuery(q){
  const name=String(q.table||'').toUpperCase(),t=TB[name];if(!t)throw new Error('Unknown table. Use one of '+Object.keys(TB).join(', '));
  const where=Array.isArray(q.where)?q.where:[];
  for(const w of where){if(!(w.field in t[0]))throw new Error(`No field ${w.field} in ${name}. Fields: ${Object.keys(t[0]).join(', ')}`);if(!OPS[w.op||'eq'])throw new Error('Unknown op '+w.op)}
  const rows=t.filter(r=>where.every(w=>OPS[w.op||'eq'](r[w.field],w.value)));
  const pts=rs=>new Set(rs.map(r=>r.USUBJID)).size,agg=q.agg||{};
  const val=rs=>{if(!agg.fn||agg.fn==='count')return rs.length;if(agg.fn==='patients')return pts(rs);
    const v=rs.map(r=>+r[agg.field]).filter(Number.isFinite).sort((a,b)=>a-b);if(!v.length)return null;
    return agg.fn==='max'?v[v.length-1]:agg.fn==='min'?v[0]:agg.fn==='median'?v[Math.floor((v.length-1)/2)]:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(2)};
  const out={table:name,n_rows:rows.length,n_patients:pts(rows)};
  const gb=[].concat(q.group_by||[]).filter(Boolean);
  if(gb.length){const m=new Map();rows.forEach(r=>{const k=gb.map(f=>r[f]).join(' | ');if(!m.has(k))m.set(k,[]);m.get(k).push(r)});
    out.groups=[...m].map(([k,rs])=>({group:k,n_rows:rs.length,n_patients:pts(rs),value:val(rs)})).sort((a,b)=>(b.value??0)-(a.value??0)).slice(0,50);return out}
  if(agg.fn)out.value=val(rows);
  out.usubjids=[...new Set(rows.map(r=>r.USUBJID))].slice(0,80);
  out.rows=rows.slice(0,Math.min(40,Math.max(1,+q.limit||20)));return out;
}
const MODE_IN={full:'PDT',patient_x_time:'PT',patient_x_domain:'PD',domain_x_time:'DT'};
const ALIGN_IN={randomization:'rand',first_grade3_ae:'g3',first_immune_ae:'ir',first_ae_term:'term',confirmed_pr:'cpr',progression:'pd',crossover:'xo'};
const SORT_IN={id:'id',time_to_pd:'pfs',time_on_treatment:'trt',ae_count:'ae',peak_alt:'alt',tps:'tps',best_shrinkage:'shr',anchor_day:'anc'};
const SUB_IN={all:'all',grade3_ae:'g3',immune_ae:'ir',has_signal:'sig',crossover:'xo',progressed:'pd'};
const keyOf=(m,v)=>Object.keys(m).find(k=>m[k]===v);
function viewState(){return{mode:keyOf(MODE_IN,ST.mode),align:keyOf(ALIGN_IN,ST.align),ae_term:ST.align==='term'?ST.term:undefined,patients_shown:ROWS.length,
  arm:{all:'both',P:'pembro',B:'placebo'}[ST.arm],subset:ST.show==='pick'?'selection':keyOf(SUB_IN,ST.show),sort:keyOf(SORT_IN,ST.sort)||ST.sort,layers:[...ST.layers],lab:ST.lab,selected_patient:ST.sel?.id||null}}
function applyView(v){
  if(v.align){const a=ALIGN_IN[v.align];if(!a)throw new Error('align must be one of '+Object.keys(ALIGN_IN).join(', '));ST.align=a}
  if(v.ae_term){const t=AE_TERMS.find(x=>lc(x)===lc(v.ae_term));if(!t)throw new Error('Unknown AE term. Terms: '+AE_TERMS.join(', '));ST.term=t;if(!v.align)ST.align='term'}
  if(v.arm)ST.arm={both:'all',pembro:'P',placebo:'B'}[v.arm]||ST.arm;
  if(v.tps)ST.tps={all:'all','<1':'0','1-49':'1','>=50':'2'}[v.tps]??ST.tps;
  if(v.subset&&SUB_IN[v.subset])ST.show=SUB_IN[v.subset];
  if(v.sort){if(SORT_IN[v.sort])ST.sort=SORT_IN[v.sort];else{const c=FEAT.find(f=>f.k===v.sort||lc(f.name)===lc(v.sort));if(c){ensureSortOpt(c);ST.sort='f:'+c.k}}}
  if(Array.isArray(v.layers)){const L=v.layers.map(x=>String(x).toUpperCase()).filter(k=>DOMV[k]);if(L.length)ST.layers=new Set(L)}
  if(v.lab&&LABS[String(v.lab).toUpperCase()])ST.lab=String(v.lab).toUpperCase();
  if(v.mode&&MODE_IN[v.mode])setMode(MODE_IN[v.mode]);
  syncControls();refresh(true);
  if(v.zoom)zoomPreset(v.zoom);
  return viewState();
}
const TOOLS=[
  {name:'query_data',description:'Query one table of the synthetic trial data. Filters with where (ANDed); optional group_by and agg. Returns n_rows, n_patients, and either groups or the first rows plus matching USUBJIDs. Query before stating any number.',
    inputSchema:{type:'object',properties:{table:{type:'string',enum:Object.keys(TB)},where:{type:'array',items:{type:'object',properties:{field:{type:'string'},op:{type:'string',enum:Object.keys(OPS)},value:{}},required:['field','op']}},
      group_by:{type:'array',items:{type:'string'}},agg:{type:'object',properties:{fn:{type:'string',enum:['count','patients','max','min','mean','median']},field:{type:'string'}}},limit:{type:'integer'}},required:['table']},
    execute:i=>{logStep(`query ${String(i.table).toUpperCase()}${(i.where||[]).map(w=>` · ${w.field} ${w.op} ${JSON.stringify(w.value??'')}`).join('')}${i.group_by?' · by '+[].concat(i.group_by).join(', '):''}`);return runQuery(i)}},
  {name:'set_view',description:'Change what the page shows; every field optional. mode collapses one cube dimension. align re-aligns time on an event (patients without it drop out). Returns the new view state.',
    inputSchema:{type:'object',properties:{mode:{type:'string',enum:Object.keys(MODE_IN)},align:{type:'string',enum:Object.keys(ALIGN_IN)},ae_term:{type:'string'},arm:{type:'string',enum:['both','pembro','placebo']},
      tps:{type:'string',enum:['all','<1','1-49','>=50']},subset:{type:'string',enum:Object.keys(SUB_IN)},sort:{type:'string',description:'one of '+Object.keys(SORT_IN).join(', ')+', or a matrix column key: '+FEAT.map(f=>f.k).join(', ')},
      layers:{type:'array',items:{type:'string',enum:Object.keys(DOMV)}},lab:{type:'string',enum:Object.keys(LABS)},zoom:{type:'string',enum:['fit','overview','events','detail']}}},
    execute:i=>{logStep('view · '+Object.entries(i).map(([k,v])=>k+' '+v).join(' · '));return applyView(i)}},
  {name:'show_patients',description:'Restrict the view to these patients (USUBJIDs, e.g. from query_data). Returns how many are shown.',
    inputSchema:{type:'object',properties:{usubjids:{type:'array',items:{type:'string'}},label:{type:'string'}},required:['usubjids']},
    execute:i=>{const ids=[].concat(i.usubjids||[]).map(String);logStep(`show ${ids.length} patients`);drill(ids,i.label||'Agent selection',true);return{shown:ROWS.length,view:viewState()}}},
  {name:'open_patient',description:'Open one patient: select it, switch to the full cube lanes and zoom to it.',
    inputSchema:{type:'object',properties:{usubjid:{type:'string'}},required:['usubjid']},
    execute:i=>{const p=PTS.find(x=>x.id===String(i.usubjid));if(!p)throw new Error('No such USUBJID');logStep('open '+p.id);openPatient(p);return{opened:p.id}}}
];
function rules(){const n=a=>PTS.filter(p=>p.arm===a).length;return `You are the agent inside "KN189 Event Cube", a page showing SYNTHETIC KEYNOTE-189-style trial data: ${PTS.length} patients randomized 2:1 to pembrolizumab or placebo, each + pemetrexed + platinum (4 cycles, then maintenance). Placebo patients may cross over to pembrolizumab after progression. Study day 1 = randomization.
Tables for query_data (one row per record):
DM: USUBJID, ARM, AGE, SEX, TPS (PD-L1 %), TPSGRP, ECOG, PLATINUM, BOR (CR/PR/SD/PD/NE), BESTPCHG, PDDY, DTHDY, XODY (crossover day), LASTDY, NAE, LASTDOSEDY
AE: USUBJID, ARM, AETERM, AESOC, AETOXGR (1-5), AEIR (Y = immune-related), AESER, AESTDY, AEENDY
LB: USUBJID, ARM, LBTESTCD (ALT, AST, BILI, CREAT, TSH, ANC), LBSTRESN, XULN (value / upper limit of normal), LBNRIND (HIGH/LOW/NORMAL), LBDY
EX: USUBJID, ARM, EXTRT, EXDOSE, CYCLE, EXSTDY, CROSSOVER (Y/N)
TR: USUBJID, ARM, TRDY, SLD (mm), PCHG (% vs baseline), RSORRES (BL/CR/PR/SD/PD)
CM: USUBJID, ARM, CMTRT, CMINDC, CMSTDY, CMENDY
SIG: USUBJID, ARM, SIGNAL, DETAIL, SEVERITY (crit/warn/info), DAY  (auto-detected data issues)
ARM values: "Pembrolizumab + chemo" (${n('P')} patients), "Placebo + chemo" (${n('B')}). AE terms: ${AE_TERMS.join(', ')}.
The view is a patient × domain × time cube. Modes: full (each patient's domains peeled into lanes), patient_x_time (domains merged into one line per patient), patient_x_domain (time collapsed: matrix of per-patient summaries), domain_x_time (patients collapsed: % of patients per time window, by arm). Time can be aligned on: ${Object.keys(ALIGN_IN).join(', ')}; first_ae_term needs ae_term.
Current view: ${JSON.stringify(viewState())}
How to work: query before giving any number and give denominators. When the user asks to see, show, align, collapse, compress, sort, filter or open something, call set_view, show_patients or open_patient, then say in one line what is now on screen. Keep answers short: 2 to 5 sentences or a short list. Answer in the language the user writes in. Never invent data.`}
function busy(b){$('send').disabled=b;$('stop').hidden=!b}
async function ask(q){
  q=q.trim();if(!q)return;addMsg('u',esc(q));$('ask').value='';
  cur=addMsg('a','<div class="who">Agent</div><div class="steps"></div><div class="body"><p>Thinking…</p></div>');const body=cur.querySelector('.body');
  if(!sampleFn){body.innerHTML=md(localCommand(q));return}
  turns.push({role:'user',content:q});if(turns.length>12)turns=turns.slice(-12);
  ctl=new AbortController();busy(true);
  try{const {text}=await sampleFn([{role:'user',content:rules()},...turns],{tools:TOOLS,signal:ctl.signal,modelTier:$('tier').value,onText:({text})=>{body.innerHTML=md(text);chat.scrollTop=chat.scrollHeight}});
    body.innerHTML=md(text);turns.push({role:'assistant',content:text})}
  catch(e){const code=e&&e.code;
    if(code==='cancelled')body.innerHTML=e.text?md(e.text):'<p>Stopped.</p>';
    else if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed','tools_unavailable'].includes(code)){sampleFn=null;
      $('agentNote').textContent='Claude is off for this page, so the agent understands simple view commands only.';body.innerHTML=md(localCommand(q))}
    else if(code==='rate_limited')body.innerHTML='<p>Too many requests right now. Try again in a minute.</p>';
    else if(code==='refused')body.innerHTML='<p>Claude declined that request. Try rephrasing it.</p>';
    else body.innerHTML=(e&&e.text?md(e.text):'')+`<p class="msg err">The agent stopped before finishing (${esc(code||'error')}). Ask again to retry.</p>`}
  finally{busy(false);cur=null}
}
function localCommand(q){
  const s=q.toLowerCase(),v={},C='(collapse|compress|压缩|折叠|合并)';
  if(new RegExp(C+'.*(time|时间)').test(s)||/patient\s*[x×]\s*domain/.test(s))v.mode='patient_x_domain';
  else if(new RegExp(C+'.*(patient|病人|患者)').test(s)||/domain\s*[x×]\s*time|summary/.test(s))v.mode='domain_x_time';
  else if(new RegExp(C+'.*(domain)').test(s)||/patient\s*[x×]\s*time|profile/.test(s))v.mode='patient_x_time';
  else if(/full cube|全部展开|还原|peel|剥离/.test(s))v.mode='full';
  if(/align|对齐|anchor/.test(s)){
    const t=AE_TERMS.find(x=>s.includes(x.toLowerCase()));
    if(t){v.align='first_ae_term';v.ae_term=t}
    else if(/random|随机/.test(s))v.align='randomization';
    else if(/confirm|\bpr\b|partial|缓解/.test(s))v.align='confirmed_pr';
    else if(/immune|irae|免疫/.test(s))v.align='first_immune_ae';
    else if(/grade\s*(≥|>=)?\s*3|3级|≥3/.test(s))v.align='first_grade3_ae';
    else if(/progress|\bpd\b|进展/.test(s))v.align='progression';
    else if(/crossover|交叉/.test(s))v.align='crossover'}
  if(/placebo|安慰剂/.test(s))v.arm='placebo';else if(/both arms|两组|all arms/.test(s))v.arm='both';else if(/pembro/.test(s)&&/only|只/.test(s))v.arm='pembro';
  if(/sort|排序/.test(s)){const m=[[/alt/,'peak_alt'],[/shrink|缩小|best|%/,'best_shrinkage'],[/tps|pd-?l1/,'tps'],[/pfs|progress|进展/,'time_to_pd'],[/treatment|治疗/,'time_on_treatment'],[/anchor/,'anchor_day'],[/\bae|不良/,'ae_count']].find(([r])=>r.test(s));if(m)v.sort=m[1]}
  if(/only|只看|筛选|filter/.test(s)){if(/signal|信号/.test(s))v.subset='has_signal';else if(/grade\s*3|3级/.test(s))v.subset='grade3_ae';else if(/immune|irae|免疫/.test(s)&&!v.align)v.subset='immune_ae'}
  if(!Object.keys(v).length)return 'Claude is not available here, so I can only change the view. Try "collapse time", "align on confirmed PR", "sort by peak ALT" or "only placebo".';
  try{const st=applyView(v);return `Done. Now showing **${st.patients_shown} patients**: ${Object.entries(v).map(([k,x])=>k.replace('_',' ')+' '+String(x).replace(/_/g,' ')).join(', ')}.`}catch(e){return e.message}
}
$('askF').addEventListener('submit',e=>{e.preventDefault();ask($('ask').value)});
$('ask').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask($('ask').value)}});
$('stop').onclick=()=>ctl&&ctl.abort();
const SUGS=['Align on first immune-related AE, then collapse patients','Which patients had grade ≥3 pneumonitis, and did they get steroids?','Compare grade ≥3 AE rates by arm','对齐 confirmed PR，压缩时间维度，按 best % change 排序'];
$('sugs').innerHTML=SUGS.map((s,i)=>`<button type="button" class="sug" data-i="${i}">${esc(s)}</button>`).join('');
$('sugs').addEventListener('click',e=>{const b=e.target.closest('.sug');if(b)ask(SUGS[+b.dataset.i])});
addMsg('a',`<div class="who">Agent</div><p>I can query the synthetic tables (demographics, AEs, labs, dosing, tumor scans, con meds, signals) and drive this view: collapse a dimension, re-align time, filter, sort and open patients.</p>`);
(async()=>{try{sampleFn=window.claude&&window.claude.use?await window.claude.use('sample'):null}catch(e){sampleFn=null}
  if(!sampleFn)$('agentNote').textContent='Claude is not available in this view, so the agent understands simple view commands only (collapse, align, sort, arm, only).'})();
