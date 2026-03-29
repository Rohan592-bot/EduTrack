// ════════════════════════════════
//  STATE
// ════════════════════════════════
let students = [];
let cmpSel   = [];

const YL  = ['Year 1 (L100)','Year 2 (L200)','Year 3 (L300)','Year 4 (L400)','Final SGPA'];
const YK  = ['CGPA100','CGPA200','CGPA300','CGPA400','SGPA'];
const CLR = ['#e6a817','#58a6ff','#3fb950','#bc8cff','#f85149','#39d0d8','#f97316','#a3e635'];

const charts   = {};
const PAGE_SIZE = 50;
const TBL_SIZE  = 50;

let filteredStudents = [];
let profileOffset    = 0;
let profileObserver  = null;
let activeTier       = 'all';   // NEW: tier filter state
let tblPage   = 0;
let tblSorted = [];
let rankMap   = {};

const dirty = { overview:true, profile:true, compare:true, semester:true, table:true };

// ════════════════════════════════
//  TIER LOGIC (new)
// ════════════════════════════════
function getTier(cgpa) {
  if (cgpa >= 3.5) return 'distinction';
  if (cgpa >= 3.0) return 'merit';
  if (cgpa >= 2.0) return 'pass';
  return 'atrisk';
}

function tierLabel(t) {
  return { distinction:'Distinction', merit:'Merit', pass:'Pass', atrisk:'At Risk' }[t] || t;
}

function tierClass(t) {
  return { distinction:'tier-distinction', merit:'tier-merit', pass:'tier-pass', atrisk:'tier-atrisk' }[t] || '';
}

// ════════════════════════════════
//  STATS HELPERS (new)
// ════════════════════════════════
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a,b)=>a-b);
  const m = Math.floor(s.length/2);
  return s.length%2 ? s[m] : (s[m-1]+s[m])/2;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a,b)=>a+b,0)/arr.length;
  return Math.sqrt(arr.reduce((s,v)=>s+(v-m)**2,0)/arr.length);
}

// ════════════════════════════════
//  HELPERS
// ════════════════════════════════
const gc  = v => v >= 3.5 ? '#3fb950' : v >= 2.5 ? '#e6a817' : '#f85149';
const gk  = v => v >= 3.5 ? 'good' : v >= 2.5 ? 'warn' : 'bad';
const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
const fmt = n => (+n).toFixed(2);
const sc  = s => CLR[students.indexOf(s) % CLR.length];

function trend(s) {
  const v = YK.map(k=>s[k]).filter(x=>x>0);
  if (v.length < 2) return '';
  const d = v[v.length-1] - v[0];
  if (d >  0.1) return `<span class="trend trend-up">▲ ${fmt(d)}</span>`;
  if (d < -0.1) return `<span class="trend trend-dn">▼ ${fmt(Math.abs(d))}</span>`;
  return `<span class="trend trend-eq">— stable</span>`;
}

function dc(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

function cd(extra) {
  return Object.assign({
    responsive:true, maintainAspectRatio:false, animation:{duration:250},
    plugins:{
      legend:{labels:{color:'#8b949e',font:{family:'JetBrains Mono',size:11},boxWidth:10,padding:14}},
      tooltip:{backgroundColor:'#1c2231',borderColor:'#21293a',borderWidth:1,
        titleColor:'#e6edf3',bodyColor:'#8b949e',
        titleFont:{family:'Sora',size:12},bodyFont:{family:'JetBrains Mono',size:11},padding:10}
    },
    clip: false,
    scales:{
      x:{grid:{color:'rgba(33,41,58,.7)'},ticks:{color:'#484f58',font:{family:'JetBrains Mono',size:10}}},
      y:{grid:{color:'rgba(33,41,58,.7)'},ticks:{color:'#484f58',font:{family:'JetBrains Mono',size:10}},min:0,suggestedMax:4.2}
    }
  }, extra||{});
}

function buildRankMap() {
  const srt=[...students].sort((a,b)=>b.cgpa-a.cgpa);
  rankMap={};
  srt.forEach((s,i)=>rankMap[s.id]=i+1);
}

function buildSearchIndex() {
  students.forEach(s=>{
    s._tier   = getTier(s.cgpa);
    s._search = [s.id, s.prog, s.gender, s.yog, fmt(s.cgpa), fmt(s.SGPA), tierLabel(s._tier)]
                .join(' ').toLowerCase();
  });
}

function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)};}

// ════════════════════════════════
//  CSV
// ════════════════════════════════
function parseCSV(txt) {
  const rows=txt.trim().split('\n').map(r=>r.trim()).filter(Boolean);
  const hdrs=rows[0].split(',').map(h=>h.trim());
  return rows.slice(1).map(row=>{
    const v=row.split(',').map(x=>x.trim()); const o={};
    hdrs.forEach((h,i)=>o[h]=v[i]||'');
    return {
      id:o['ID No'],prog:o['Prog Code'],gender:o['Gender'],yog:o['YoG'],
      cgpa:+o['CGPA']||0,CGPA100:+o['CGPA100']||0,CGPA200:+o['CGPA200']||0,
      CGPA300:+o['CGPA300']||0,CGPA400:+o['CGPA400']||0,SGPA:+o['SGPA']||0,
    };
  });
}

function onDataLoaded() {
  buildRankMap(); buildSearchIndex(); cmpSel=[]; activeTier='all';
  // Show export button
  document.getElementById('btn-export-all').style.display='inline-flex';
  document.getElementById('btn-export-filtered').style.display='inline-flex';
  Object.keys(dirty).forEach(k=>dirty[k]=true);
  renderPage(document.querySelector('.nav-item.active')?.dataset.page||'overview');
}

document.getElementById('csvInput').addEventListener('change',function(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{students=parseCSV(ev.target.result);onDataLoaded();};
  r.readAsText(f); this.value='';
});

function handleInlineUpload(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{students=parseCSV(ev.target.result);onDataLoaded();};
  r.readAsText(f);
}

// ════════════════════════════════
//  EXPORT CSV (new)
// ════════════════════════════════
function toCSVRow(s) {
  return [s.id,s.prog,s.gender,s.yog,s.CGPA100,s.CGPA200,s.CGPA300,s.CGPA400,s.SGPA,s.cgpa,tierLabel(s._tier)]
    .map(v=>`"${v}"`).join(',');
}

function downloadCSV(data, filename) {
  const header = '"ID No","Prog Code","Gender","YoG","CGPA100","CGPA200","CGPA300","CGPA400","SGPA","CGPA","Tier"';
  const csv = [header, ...data.map(toCSVRow)].join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

function exportAllCSV() {
  if (!students.length) return;
  downloadCSV([...students].sort((a,b)=>b.cgpa-a.cgpa), 'edutrack_all_students.csv');
}

function exportFilteredCSV() {
  if (!filteredStudents.length) return;
  const label = activeTier!=='all' ? `_${activeTier}` : '';
  downloadCSV(filteredStudents, `edutrack_students${label}.csv`);
}

// ════════════════════════════════
//  DELETE
// ════════════════════════════════
function delStudent(id,ev) {
  ev&&ev.stopPropagation();
  if (!confirm(`Remove student #${id}?`)) return;
  students=students.filter(s=>s.id!==id);
  cmpSel=cmpSel.filter(x=>x!==id);
  buildRankMap(); buildSearchIndex();
  Object.keys(dirty).forEach(k=>dirty[k]=true);
  renderPage(document.querySelector('.nav-item.active')?.dataset.page||'overview');
}

// ════════════════════════════════
//  MODALS
// ════════════════════════════════
function openModal(id){document.getElementById(id).classList.add('open');document.body.style.overflow='hidden';}
function closeModal(id){
  document.getElementById(id).classList.remove('open');document.body.style.overflow='';
  if(id==='pm')dc('pm-line');
  if(id==='cm'){dc('cm-line');dc('cm-bar');}
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal('pm');closeModal('cm');}});

// ════════════════════════════════
//  PRINT INDIVIDUAL REPORT (new)
// ════════════════════════════════
function printStudentReport() {
  // Capture the live chart canvas as a PNG before opening the print window
  const canvas = document.getElementById('cv-pm');
  const chartImg = canvas ? canvas.toDataURL('image/png') : null;

  const title = document.getElementById('pm-title').textContent;
  const sub   = document.getElementById('pm-sub').innerHTML;

  // Build body HTML but replace the canvas panel with the captured image
  let body = document.getElementById('pm-body').innerHTML;
  if (chartImg) {
    // Replace the entire chart-wrap div (which contains the canvas) with an img tag
    body = body.replace(
      /<div class="chart-wrap">[\s\S]*?<\/div>/,
      `<div class="chart-img-wrap"><img src="${chartImg}" style="width:100%;height:auto;display:block;border-radius:6px"/></div>`
    );
  }

  const w = window.open('', '_blank', 'width=860,height=700');
  w.document.write(`<!DOCTYPE html><html><head>
    <title>${title} — EduTrack Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <style>
      :root {
        --bg:      #0d1117;
        --surface: #161b22;
        --overlay: #1c2231;
        --border:  #21293a;
        --text-hi: #e6edf3;
        --text-md: #8b949e;
        --text-lo: #484f58;
        --amber:   #e6a817;
        --green:   #3fb950;
        --blue:    #58a6ff;
        --red:     #f85149;
        --purple:  #bc8cff;
      }
      * { box-sizing:border-box; margin:0; padding:0; }
      html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      body {
        background: var(--bg);
        color: var(--text-hi);
        font-family: 'Inter', sans-serif;
        padding: 36px 40px;
        font-size: 13px;
        line-height: 1.6;
      }

      /* Header */
      .print-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        border-bottom: 1px solid var(--border);
        padding-bottom: 16px;
        margin-bottom: 22px;
      }
      .print-header h1 {
        font-family: 'Sora', sans-serif;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-hi);
        letter-spacing: -.02em;
      }
      .print-header p { font-size:.78rem; color:var(--text-md); margin-top:4px; }
      .print-logo {
        font-family: 'Sora', sans-serif;
        font-size: .85rem;
        color: var(--text-lo);
      }
      .print-logo strong { color: var(--amber); }

      /* Info grid */
      .pm-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
      .info-panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 14px;
      }
      .info-panel h4 {
        font-size:.63rem; font-weight:600; text-transform:uppercase;
        letter-spacing:.09em; color:var(--text-lo); margin-bottom:10px;
      }
      .info-row {
        display:flex; justify-content:space-between; align-items:center;
        padding:6px 0; border-bottom:1px solid var(--border); font-size:.78rem;
      }
      .info-row:last-child { border-bottom:none; }
      .info-key { color:var(--text-md); }
      .info-val { font-weight:500; font-family:'JetBrains Mono',monospace; font-size:.76rem; color:var(--text-hi); }

      /* GPA bars */
      .bar-row { display:flex; align-items:center; gap:9px; margin-bottom:8px; }
      .bar-lbl { font-size:.68rem; color:var(--text-md); width:44px; flex-shrink:0; font-family:'JetBrains Mono',monospace; }
      .bar-track { flex:1; height:5px; background:var(--border); border-radius:99px; overflow:hidden; }
      .bar-fill  { height:100%; border-radius:99px; }
      .bar-val   { font-family:'JetBrains Mono',monospace; font-size:.7rem; width:32px; text-align:right; color:var(--text-hi); }

      /* Chart panel */
      .panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 16px;
        margin-top: 12px;
      }
      .panel-head { margin-bottom:12px; }
      .panel-title { font-size:.83rem; font-weight:600; color:var(--text-hi); }
      .panel-sub   { font-size:.7rem; color:var(--text-lo); margin-left:8px; }
      .chart-img-wrap { border-radius:6px; overflow:hidden; }

      /* Pills */
      .pill { display:inline-flex; align-items:center; padding:2px 7px; border-radius:99px; font-size:.65rem; font-weight:500; font-family:'JetBrains Mono',monospace; }
      .pill-prog   { background:rgba(230,168,23,.15); color:var(--amber); }
      .pill-female { background:rgba(188,140,255,.15); color:var(--purple); }
      .pill-male   { background:rgba(88,166,255,.15);  color:var(--blue); }

      /* Tier badges */
      .tier { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:99px; font-size:.63rem; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
      .tier-distinction { background:rgba(63,185,80,.2);   color:var(--green);  border:1px solid rgba(63,185,80,.3); }
      .tier-merit       { background:rgba(88,166,255,.2);  color:var(--blue);   border:1px solid rgba(88,166,255,.3); }
      .tier-pass        { background:rgba(230,168,23,.2);  color:var(--amber);  border:1px solid rgba(230,168,23,.3); }
      .tier-atrisk      { background:rgba(248,81,73,.2);   color:var(--red);    border:1px solid rgba(248,81,73,.3); }

      /* Trend */
      .trend-up { color:var(--green); font-family:'JetBrains Mono',monospace; font-size:.75rem; }
      .trend-dn { color:var(--red);   font-family:'JetBrains Mono',monospace; font-size:.75rem; }
      .trend-eq { color:var(--text-lo); font-family:'JetBrains Mono',monospace; font-size:.75rem; }

      /* Footer */
      .print-footer {
        margin-top: 28px;
        padding-top: 12px;
        border-top: 1px solid var(--border);
        font-size: .7rem;
        color: var(--text-lo);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .print-footer strong { color: var(--amber); }

      canvas { display:none !important; }

      @media print {
        html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        body { padding:24px 28px; }
      }
    </style>
  </head><body>
    <div class="print-header">
      <div>
        <h1>${title}</h1>
        <p>${sub.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}</p>
      </div>
      <div class="print-logo">Edu<strong>Track</strong></div>
    </div>

    ${body}

    <div class="print-footer">
      <span>Generated by <strong>EduTrack</strong></span>
      <span>${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
    </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 600);
}

// ════════════════════════════════
//  EMPTY STATE
// ════════════════════════════════
function emptyState(icon,title,sub){
  return `<div class="empty-state">
    <span class="empty-icon">${icon}</span>
    <p style="font-size:.88rem;font-weight:500;color:var(--text-md);margin-bottom:4px">${title}</p>
    <p style="font-size:.76rem;margin-bottom:12px">${sub}</p>
    <label class="empty-upload">
      <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6.5 1v7M3.5 3.5L6.5 1l3 2.5"/><path d="M1 9.5v1A1.5 1.5 0 002.5 12h8A1.5 1.5 0 0012 10.5v-1"/>
      </svg>Upload CSV<input type="file" accept=".csv" onchange="handleInlineUpload(event)"/></label>
  </div>`;
}

// ════════════════════════════════
//  OVERVIEW
// ════════════════════════════════
function renderOverview() {
  if (!dirty.overview) return;
  dirty.overview=false;
  const se=document.getElementById('ov-stats');
  const ss=document.getElementById('ov-stats-strip');
  const ce=document.getElementById('ov-charts');
  const mo=document.getElementById('ov-movers');
  ['ov-cgpa','ov-prog','ov-trend','ov-gender','ov-hist'].forEach(dc);

  if (!students.length) {
    se.innerHTML=''; ss.innerHTML=''; mo.innerHTML='';
    ce.innerHTML=emptyState('📊','No data loaded','Upload a CSV file to see class performance metrics.'); return;
  }

  const cgpas=students.map(s=>s.cgpa);
  const top=students.reduce((a,b)=>a.cgpa>b.cgpa?a:b);
  const progs=[...new Set(students.map(s=>s.prog))];
  const fC=students.filter(s=>s.gender==='Female').length;
  const mC=students.filter(s=>s.gender==='Male').length;

  // KPI cards
  se.innerHTML=[
    ['Total Students',  students.length,   `${progs.length} program${progs.length!==1?'s':''}`, '#e6a817'],
    ['Class Avg CGPA',  fmt(avg(cgpas)),    'out of 4.00', '#3fb950'],
    ['Top Performer',   fmt(top.cgpa),      `ID ${top.id} · ${top.prog}`, '#58a6ff'],
    ['Gender Split',    `${fC}F / ${mC}M`,  `${students.length} total`, '#bc8cff'],
  ].map(([l,v,s,c])=>`<div class="kpi"><div class="kpi-accent" style="background:${c}"></div><div class="kpi-label">${l}</div><div class="kpi-value" style="color:${c}">${v}</div><div class="kpi-sub">${s}</div></div>`).join('');

  // ── STATS STRIP (new) ──
  const med   = median(cgpas);
  const sd    = stddev(cgpas);
  const passR = cgpas.filter(v=>v>=2.0).length;
  const distR = cgpas.filter(v=>v>=3.5).length;
  const minC  = Math.min(...cgpas);
  const maxC  = Math.max(...cgpas);
  ss.innerHTML=[
    ['Median CGPA',    fmt(med),  '50th percentile'],
    ['Std Deviation',  fmt(sd),   'spread of scores'],
    ['Min CGPA',       fmt(minC), 'lowest recorded'],
    ['Max CGPA',       fmt(maxC), 'highest recorded'],
    ['Pass Rate',      `${((passR/students.length)*100).toFixed(1)}%`, `${passR} of ${students.length}`],
    ['Distinction',    `${((distR/students.length)*100).toFixed(1)}%`, `${distR} of ${students.length}`],
  ].map(([l,v,s])=>`<div class="stat-item"><div class="stat-item-label">${l}</div><div class="stat-item-value">${v}</div><div class="stat-item-sub">${s}</div></div>`).join('');

  // Charts
  const top50=[...students].sort((a,b)=>b.cgpa-a.cgpa).slice(0,50);
  ce.innerHTML=`
    <div class="grid2">
      <div class="panel"><div class="panel-head"><span class="panel-title">GPA Distribution</span><span class="panel-sub">students per band</span></div><div class="chart-wrap"><canvas id="cv-hist"></canvas></div></div>
      <div class="panel"><div class="panel-head"><span class="panel-title">By Program</span><span class="panel-sub">avg CGPA</span></div><div class="chart-wrap"><canvas id="cv-prog"></canvas></div></div>
    </div>
    <div class="panel"><div class="panel-head"><span class="panel-title">Class GPA Trend</span><span class="panel-sub">avg per year-level</span></div><div class="chart-wrap"><canvas id="cv-trend"></canvas></div></div>
    <div class="grid2">
      <div class="panel"><div class="panel-head"><span class="panel-title">Top 50 CGPA</span><span class="panel-sub">ranked students</span></div><div class="chart-wrap"><canvas id="cv-cgpa"></canvas></div></div>
      <div class="panel"><div class="panel-head"><span class="panel-title">Gender Comparison</span><span class="panel-sub">avg CGPA</span></div><div class="chart-wrap"><canvas id="cv-gender"></canvas></div></div>
    </div>`;

  // ── HISTOGRAM (new — proper GPA distribution) ──
  const bands=[
    {label:'< 1.0', min:0,   max:1.0, color:'#f85149'},
    {label:'1.0–1.9',min:1.0,max:2.0, color:'#f97316'},
    {label:'2.0–2.4',min:2.0,max:2.5, color:'#e6a817'},
    {label:'2.5–2.9',min:2.5,max:3.0, color:'#e6a817'},
    {label:'3.0–3.4',min:3.0,max:3.5, color:'#58a6ff'},
    {label:'3.5–3.9',min:3.5,max:4.0, color:'#3fb950'},
    {label:'4.0',    min:4.0,max:4.01, color:'#3fb950'},
  ];
  const histCounts=bands.map(b=>students.filter(s=>s.cgpa>=b.min&&s.cgpa<b.max).length);
  charts['ov-hist']=new Chart(document.getElementById('cv-hist'),{type:'bar',data:{
    labels:bands.map(b=>b.label),
    datasets:[{label:'Students',data:histCounts,
      backgroundColor:bands.map(b=>b.color+'55'),
      borderColor:bands.map(b=>b.color),borderWidth:1.5,borderRadius:4}]
  },options:{...cd({scales:{x:{...cd().scales.x},y:{...cd().scales.y,min:undefined,max:undefined}}}),plugins:{...cd().plugins,legend:{display:false}}}});

  const pa=progs.map(p=>({p,a:avg(students.filter(s=>s.prog===p).map(s=>s.cgpa))})).sort((a,b)=>b.a-a.a);
  charts['ov-prog']=new Chart(document.getElementById('cv-prog'),{type:'bar',data:{
    labels:pa.map(x=>x.p),
    datasets:[{label:'Avg CGPA',data:pa.map(x=>x.a),
      backgroundColor:CLR.slice(0,pa.length).map(c=>c+'33'),
      borderColor:CLR.slice(0,pa.length),borderWidth:1.5,borderRadius:4}]
  },options:cd()});

  charts['ov-trend']=new Chart(document.getElementById('cv-trend'),{type:'line',data:{
    labels:YL,
    datasets:[{label:'Class Avg',data:YK.map(k=>avg(students.map(s=>s[k]))),
      borderColor:'#e6a817',backgroundColor:'rgba(230,168,23,.06)',
      pointBackgroundColor:'#e6a817',pointRadius:5,pointHoverRadius:7,tension:.4,fill:true,borderWidth:2,clip:false}]
  },options:cd()});

  charts['ov-cgpa']=new Chart(document.getElementById('cv-cgpa'),{type:'bar',data:{
    labels:top50.map(s=>`#${s.id}`),
    datasets:[{label:'CGPA',data:top50.map(s=>s.cgpa),
      backgroundColor:top50.map(s=>gc(s.cgpa)+'33'),
      borderColor:top50.map(s=>gc(s.cgpa)),borderWidth:1,borderRadius:3}]
  },options:{...cd(),plugins:{...cd().plugins,legend:{display:false}}}});

  const gF=avg(students.filter(s=>s.gender==='Female').map(s=>s.cgpa));
  const gM=avg(students.filter(s=>s.gender==='Male').map(s=>s.cgpa));
  charts['ov-gender']=new Chart(document.getElementById('cv-gender'),{type:'bar',data:{
    labels:['Female','Male'],
    datasets:[{label:'Avg CGPA',data:[gF,gM],
      backgroundColor:['rgba(188,140,255,.2)','rgba(88,166,255,.2)'],
      borderColor:['#bc8cff','#58a6ff'],borderWidth:1.5,borderRadius:4}]
  },options:{...cd(),indexAxis:'y',scales:{x:{...cd().scales.x,min:0,max:4.5},y:cd().scales.y}}});

  // ── MOST IMPROVED / MOST DECLINED (new) ──
  const withDelta=students
    .map(s=>({s, delta:s.CGPA400&&s.CGPA100? s.CGPA400-s.CGPA100 : null}))
    .filter(x=>x.delta!==null);

  const improved =[...withDelta].sort((a,b)=>b.delta-a.delta).slice(0,5);
  const declined =[...withDelta].sort((a,b)=>a.delta-b.delta).slice(0,5);

  function moverRow(item,i,isUp){
    const d=item.delta;
    return `<div class="mover-row">
      <span class="mover-rank">${i+1}</span>
      <span class="mover-id">#${item.s.id}</span>
      <span class="mover-prog">${item.s.prog}</span>
      <span class="mover-delta" style="color:${isUp?'#3fb950':'#f85149'}">${d>=0?'+':''}${fmt(d)}</span>
    </div>`;
  }

  mo.innerHTML=`<div class="movers-grid">
    <div class="panel"><div class="panel-head"><span class="panel-title">📈 Most Improved</span><span class="panel-sub">Yr 1 → Yr 4 CGPA change</span></div><div class="movers-list">${improved.map((x,i)=>moverRow(x,i,true)).join('')}</div></div>
    <div class="panel"><div class="panel-head"><span class="panel-title">📉 Most Declined</span><span class="panel-sub">Yr 1 → Yr 4 CGPA change</span></div><div class="movers-list">${declined.map((x,i)=>moverRow(x,i,false)).join('')}</div></div>
  </div>`;
}

// ════════════════════════════════
//  TIER FILTER (new)
// ════════════════════════════════
function setTierFilter(tier) {
  activeTier = tier;
  document.querySelectorAll('.tier-chip').forEach(c=>{
    c.classList.toggle('active', c.dataset.tier===tier);
  });
  // Re-run search pipeline with new tier
  filterProfileList();
}

function updateTierCounts() {
  if (!students.length) return;
  ['distinction','merit','pass','atrisk'].forEach(t=>{
    const el=document.getElementById('tc-'+t);
    if (el) el.textContent=students.filter(s=>s._tier===t).length;
  });
}

// ════════════════════════════════
//  PROFILE LIST (virtual scroll)
// ════════════════════════════════
function studentCard(s) {
  const rank=rankMap[s.id]||'?';
  const col=CLR[students.indexOf(s)%CLR.length];
  const rc=rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'rank-n';
  const tier=s._tier||getTier(s.cgpa);
  return `<div class="s-card" style="--card-color:${col}" onclick="openPM('${s.id}')">
    <div class="s-avatar" style="background:${col}18;color:${col}">#${s.id}</div>
    <div class="s-info">
      <div class="s-name">Student ${s.id}</div>
      <div class="s-meta">
        <span class="pill pill-prog">${s.prog}</span>
        <span class="pill ${s.gender==='Female'?'pill-female':'pill-male'}">${s.gender}</span>
        <span style="color:var(--text-lo)">·</span> ${s.yog}
      </div>
    </div>
    <div class="s-stats">
      <div class="s-stat"><div class="s-stat-val" style="color:${gc(s.cgpa)}">${fmt(s.cgpa)}</div><div class="s-stat-lbl">CGPA</div></div>
      <div class="s-stat"><div class="s-stat-val" style="color:${gc(s.SGPA)}">${fmt(s.SGPA)}</div><div class="s-stat-lbl">SGPA</div></div>
      <span class="rank ${rc}">${rank}</span>
      <span class="tier ${tierClass(tier)}">${tierLabel(tier)}</span>
      <button class="del-btn" onclick="delStudent('${s.id}',event)" title="Remove">🗑</button>
    </div>
  </div>`;
}

function appendBatch() {
  const el=document.getElementById('profile-list');
  const batch=filteredStudents.slice(profileOffset,profileOffset+PAGE_SIZE);
  if (!batch.length) return;
  const div=document.createElement('div');
  div.innerHTML=batch.map(s=>studentCard(s)).join('');
  const frag=document.createDocumentFragment();
  while(div.firstChild) frag.appendChild(div.firstChild);
  el.appendChild(frag);
  profileOffset+=batch.length;
  updateSentinel();
}

function updateSentinel() {
  let s=document.getElementById('p-sentinel');
  if (profileOffset>=filteredStudents.length) {
    if(s)s.remove();
    if(profileObserver){profileObserver.disconnect();profileObserver=null;}
    return;
  }
  if (!s){s=document.createElement('div');s.id='p-sentinel';s.style.height='1px';document.getElementById('profile-list').appendChild(s);}
  if (!profileObserver){
    profileObserver=new IntersectionObserver(entries=>{if(entries[0].isIntersecting)appendBatch();},{rootMargin:'300px'});
    profileObserver.observe(s);
  }
}

const _doSearch=debounce(()=>{
  const q=document.getElementById('profile-search').value.trim().toLowerCase();
  const clrBtn=document.getElementById('profile-search-clear');
  const cnt=document.getElementById('profile-search-count');
  const noRes=document.getElementById('profile-no-results');

  clrBtn.style.display=q?'flex':'none';

  // Apply tier filter first, then text search
  let base = activeTier==='all' ? students : students.filter(s=>s._tier===activeTier);
  filteredStudents = q ? base.filter(s=>s._search.includes(q)) : [...base];

  document.getElementById('profile-list').innerHTML='';
  profileOffset=0;

  if (!filteredStudents.length&&(q||activeTier!=='all')){
    noRes.style.display='block';
    cnt.textContent='0 results'; return;
  }
  noRes.style.display='none';
  cnt.textContent=`${filteredStudents.length} of ${students.length} student${students.length!==1?'s':''}`;

  appendBatch();
  setTimeout(updateSentinel,0);
},250);

function filterProfileList(){_doSearch();}

function clearProfileSearch(){
  document.getElementById('profile-search').value='';
  filterProfileList();
  document.getElementById('profile-search').focus();
}

function renderProfileList(){
  if (!dirty.profile) return;
  dirty.profile=false;
  const el=document.getElementById('profile-list');
  if (!students.length){
    el.innerHTML=emptyState('👤','No students','Upload a CSV file to see student profiles.');
    document.getElementById('profile-search-count').textContent='';
    document.getElementById('profile-no-results').style.display='none';
    if(profileObserver){profileObserver.disconnect();profileObserver=null;}
    return;
  }
  updateTierCounts();
  document.getElementById('profile-search').value='';
  filterProfileList();
}

// ── Profile Modal ──
function openPM(id){
  const s=students.find(x=>x.id===id); if(!s) return;
  const rank=rankMap[id]||'?';
  const col=CLR[students.indexOf(s)%CLR.length];
  const tier=s._tier||getTier(s.cgpa);

  document.getElementById('pm-title').textContent=`Student #${s.id}`;
  document.getElementById('pm-sub').innerHTML=
    `<span class="pill pill-prog" style="margin-right:5px">${s.prog}</span>
     <span class="pill ${s.gender==='Female'?'pill-female':'pill-male'}">${s.gender}</span>
     &nbsp;·&nbsp;Rank #${rank} of ${students.length}&nbsp;·&nbsp;Class of ${s.yog}&nbsp;
     <span class="tier ${tierClass(tier)}" style="margin-left:4px">${tierLabel(tier)}</span>`;

  document.getElementById('pm-body').innerHTML=`
    <div class="pm-grid">
      <div class="info-panel"><h4>Student Info</h4>
        ${[['Student ID',s.id],['Program',`<span class="pill pill-prog">${s.prog}</span>`],
          ['Gender',`<span class="pill ${s.gender==='Female'?'pill-female':'pill-male'}">${s.gender}</span>`],
          ['Year of Grad.',s.yog],
          ['Overall CGPA',`<span style="color:${gc(s.cgpa)};font-family:'JetBrains Mono',monospace">${fmt(s.cgpa)}</span>`],
          ['Performance Tier',`<span class="tier ${tierClass(tier)}">${tierLabel(tier)}</span>`],
          ['Class Rank',`#${rank} of ${students.length}`],
          ['Final SGPA',`<span style="color:${gc(s.SGPA)};font-family:'JetBrains Mono',monospace">${fmt(s.SGPA)}</span>`],
        ].map(([k,v])=>`<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`).join('')}
      </div>
      <div class="info-panel"><h4>Year-level CGPA</h4>
        ${YK.map((k,i)=>`<div class="bar-row">
          <div class="bar-lbl">${['L100','L200','L300','L400','SGPA'][i]}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${(s[k]/4)*100}%;background:${gc(s[k])}"></div></div>
          <div class="bar-val" style="color:${gc(s[k])}">${fmt(s[k])}</div>
        </div>`).join('')}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">GPA Progression</span><span class="panel-sub">${trend(s)}</span></div>
      <div class="chart-wrap"><canvas id="cv-pm"></canvas></div>
    </div>`;

  openModal('pm');
  dc('pm-line');
  setTimeout(()=>{
    charts['pm-line']=new Chart(document.getElementById('cv-pm'),{type:'line',data:{
      labels:YL,
      datasets:[{label:`#${s.id}`,data:YK.map(k=>s[k]),
        borderColor:col,backgroundColor:col+'10',
        pointBackgroundColor:col,pointRadius:6,pointHoverRadius:8,tension:.4,fill:true,borderWidth:2,clip:false}]
    },options:cd()});
  },50);
}

// ════════════════════════════════
//  COMPARE PAGE
// ════════════════════════════════
function renderComparePage(){
  document.getElementById('cmp-search').value='';
  document.getElementById('cmp-dropdown').style.display='none';
  renderCmpList();
}

function onCmpSearch(){
  const q=document.getElementById('cmp-search').value.trim().toLowerCase();
  const dd=document.getElementById('cmp-dropdown');
  if(!q||!students.length){dd.style.display='none';return;}
  const hits=students.filter(s=>s._search.includes(q)).slice(0,12);
  if(!hits.length){dd.style.display='none';return;}
  dd.style.display='block';
  dd.innerHTML=hits.map(s=>{
    const added=cmpSel.includes(s.id);
    return `<div class="cmp-di ${added?'added':''}" onclick="${added?'':` addToCmp('${s.id}') `}">
      <span><span style="color:${sc(s)};margin-right:6px">●</span>#${s.id}
        <span style="color:var(--text-lo);margin-left:6px;font-size:.7rem">${s.prog} · ${s.gender} · CGPA ${fmt(s.cgpa)} · <span class="tier ${tierClass(s._tier)}">${tierLabel(s._tier)}</span></span>
      </span>
      <span style="font-size:.68rem;color:${added?'var(--text-lo)':'var(--amber)'}">${added?'Added ✓':'+ Add'}</span>
    </div>`;
  }).join('');
}

function addToCmp(id){
  if(!cmpSel.includes(id))cmpSel.push(id);
  document.getElementById('cmp-search').value='';
  document.getElementById('cmp-dropdown').style.display='none';
  renderCmpList();
}
function removeFromCmp(id){cmpSel=cmpSel.filter(x=>x!==id);renderCmpList();}
function clearCompare(){
  cmpSel=[];
  document.getElementById('cmp-search').value='';
  document.getElementById('cmp-dropdown').style.display='none';
  renderCmpList();
}

function renderCmpList(){
  const listEl=document.getElementById('cmp-list');
  const hintEl=document.getElementById('cmp-hint');
  const btn=document.getElementById('btn-show-cmp');
  const cnt=document.getElementById('cmp-count');

  if(!cmpSel.length){
    listEl.innerHTML='';hintEl.style.display='block';
    hintEl.textContent='Search and add at least 2 students to compare performance.';
    btn.disabled=true;cnt.textContent='';return;
  }
  hintEl.style.display=cmpSel.length===1?'block':'none';
  if(cmpSel.length===1)hintEl.textContent='Add at least one more student to enable comparison.';
  btn.disabled=cmpSel.length<2;
  cnt.textContent=cmpSel.length>=2?`${cmpSel.length} students selected`:'';

  const sel=cmpSel.map(id=>students.find(s=>s.id===id)).filter(Boolean);
  listEl.innerHTML=sel.map(s=>`
    <div class="cmp-chip">
      <div class="cmp-chip-l">
        <div class="cmp-dot" style="background:${sc(s)}"></div>
        <div><div class="cmp-chip-name">#${s.id}</div>
          <div class="cmp-chip-info">${s.prog} · ${s.gender} · CGPA ${fmt(s.cgpa)} · <span class="tier ${tierClass(s._tier)}">${tierLabel(s._tier)}</span></div>
        </div>
      </div>
      <button class="cmp-rm" onclick="removeFromCmp('${s.id}')">✕</button>
    </div>`).join('');
}

function openCompareModal(){
  const sel=cmpSel.map(id=>students.find(s=>s.id===id)).filter(Boolean);
  if(sel.length<2)return;
  document.getElementById('cm-sub').textContent=`Comparing ${sel.length} students: ${sel.map(s=>'#'+s.id).join(', ')}`;
  document.getElementById('cm-body').innerHTML=`
    <div class="panel" style="margin-bottom:12px">
      <div class="panel-head"><span class="panel-title">GPA Progression</span><span class="panel-sub">year-by-year</span></div>
      <div class="chart-wrap" style="height:340px"><canvas id="cv-cmline"></canvas></div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">CGPA Ranking</span><span class="panel-sub">overall</span></div>
      <div class="chart-wrap" style="height:240px"><canvas id="cv-cmbar"></canvas></div>
    </div>`;
  openModal('cm');
  dc('cm-line');dc('cm-bar');
  setTimeout(()=>{
    charts['cm-line']=new Chart(document.getElementById('cv-cmline'),{type:'line',data:{
      labels:YL,
      datasets:sel.map(s=>({label:`#${s.id} (${s.prog})`,data:YK.map(k=>s[k]),
        borderColor:sc(s),backgroundColor:sc(s)+'10',
        pointBackgroundColor:sc(s),pointRadius:5,pointHoverRadius:7,tension:.4,borderWidth:2,clip:false}))
    },options:cd()});
    const srt=[...sel].sort((a,b)=>b.cgpa-a.cgpa);
    charts['cm-bar']=new Chart(document.getElementById('cv-cmbar'),{type:'bar',data:{
      labels:srt.map(s=>`#${s.id}`),
      datasets:[{label:'Overall CGPA',data:srt.map(s=>s.cgpa),
        backgroundColor:srt.map(s=>sc(s)+'33'),
        borderColor:srt.map(s=>sc(s)),borderWidth:1.5,borderRadius:4}]
    },options:cd()});
  },50);
}

document.addEventListener('click',e=>{
  const dd=document.getElementById('cmp-dropdown');
  const wrap=document.querySelector('.search-bar-wrap');
  if(dd&&wrap&&!wrap.contains(e.target))dd.style.display='none';
});

// ════════════════════════════════
//  SEMESTER
// ════════════════════════════════
function renderSemester(){
  if(!dirty.semester)return;
  dirty.semester=false;
  const LK=['CGPA100','CGPA200','CGPA300','CGPA400','SGPA'];
  const LN=['Level 100','Level 200','Level 300','Level 400','Final SGPA'];

  if(!students.length){
    document.getElementById('sem-cards').innerHTML='';
    document.getElementById('heatmap').innerHTML=emptyState('📅','No data','Upload a CSV to see semester breakdown.');
    document.getElementById('sem-tables').innerHTML='';return;
  }

  document.getElementById('sem-cards').innerHTML=LK.map((k,i)=>{
    const a=avg(students.map(s=>s[k]));
    const top=students.reduce((a2,b)=>a2[k]>b[k]?a2:b);
    return `<div class="sem-card"><div class="sem-lbl">${LN[i]}</div><div class="sem-val" style="color:${gc(a)}">${fmt(a)}</div><div class="sem-note">avg · best #${top.id}</div></div>`;
  }).join('');

  const hmS=students.slice(0,100);
  const hmNote=students.length>100?`<div style="font-size:.7rem;color:var(--text-lo);padding:5px 13px">Showing first 100 of ${students.length} students</div>`:'';
  document.getElementById('heatmap').innerHTML=hmNote+`<table style="border-collapse:collapse;width:100%;font-family:'JetBrains Mono',monospace;font-size:.7rem">
    <thead><tr>
      <th style="padding:7px 13px;text-align:left;color:var(--text-lo);font-size:.62rem;font-weight:600;letter-spacing:.08em;border-bottom:1px solid var(--border)">STUDENT</th>
      ${LN.map(l=>`<th style="padding:7px 13px;text-align:center;color:var(--text-lo);font-size:.62rem;font-weight:600;letter-spacing:.08em;border-bottom:1px solid var(--border)">${l}</th>`).join('')}
    </tr></thead>
    <tbody>${hmS.map(s=>`<tr>
      <td style="padding:6px 13px;color:var(--text-md);border-bottom:1px solid var(--border)">#${s.id}</td>
      ${LK.map(k=>{const v=s[k],p=Math.min(v/4,1);const bg=v>=3.5?'rgba(63,185,80,':v>=2.5?'rgba(230,168,23,':'rgba(248,81,73,';
        return `<td style="padding:5px 13px;text-align:center;border-bottom:1px solid var(--border)">
          <span style="display:inline-block;background:${bg}${.08+p*.22});border-radius:4px;padding:2px 7px;color:${gc(v)}">${fmt(v)}</span></td>`;}).join('')}
    </tr>`).join('')}</tbody></table>`;

  const levelAvgs=LK.map(k=>avg(students.map(s=>s[k])));
  document.getElementById('sem-tables').innerHTML=LK.map((k,i)=>{
    const srt=[...students].sort((a,b)=>b[k]-a[k]).slice(0,50);
    const note=students.length>50?`<div style="font-size:.7rem;color:var(--text-lo);margin-bottom:8px">Top 50 of ${students.length}</div>`:'';
    return `<div class="panel"><div class="panel-head"><span class="panel-title">${LN[i]} — Rankings</span></div>${note}
      <div class="table-wrap"><table>
        <thead><tr><th>Rank</th><th>Student ID</th><th>Program</th><th>Gender</th><th>GPA</th><th>vs Avg</th><th>Tier</th></tr></thead>
        <tbody>${srt.map((s,ri)=>{const d=s[k]-levelAvgs[i];const rc=ri===0?'rank-1':ri===1?'rank-2':ri===2?'rank-3':'rank-n';
          return `<tr>
            <td><span class="rank ${rc}">${ri+1}</span></td>
            <td class="hi">#${s.id}</td>
            <td><span class="pill pill-prog">${s.prog}</span></td>
            <td><span class="pill ${s.gender==='Female'?'pill-female':'pill-male'}">${s.gender}</span></td>
            <td class="${gk(s[k])}">${fmt(s[k])}</td>
            <td style="color:${d>=0?'#3fb950':'#f85149'};font-family:'JetBrains Mono',monospace;font-size:.73rem">${d>=0?'+':''}${fmt(d)}</td>
            <td><span class="tier ${tierClass(s._tier)}">${tierLabel(s._tier)}</span></td>
          </tr>`;}).join('')}</tbody>
      </table></div></div>`;
  }).join('');
}

// ════════════════════════════════
//  TABLE (paginated)
// ════════════════════════════════
function renderTable(){
  if(!dirty.table)return;
  dirty.table=false;
  tblSorted=[...students].sort((a,b)=>b.cgpa-a.cgpa);
  tblPage=0;
  renderTblPage();
}

function renderTblPage(){
  const el=document.getElementById('tbl-body');
  if(!tblSorted.length){
    el.innerHTML=`<tr><td colspan="13" style="text-align:center;padding:48px;color:var(--text-lo)">No students loaded. Upload a CSV to begin.</td></tr>`;
    renderTblPag();return;
  }
  const start=tblPage*TBL_SIZE;
  const slice=tblSorted.slice(start,start+TBL_SIZE);
  el.innerHTML=slice.map((s,i)=>{
    const g=start+i;
    const rc=g===0?'rank-1':g===1?'rank-2':g===2?'rank-3':'rank-n';
    return `<tr>
      <td><span class="rank ${rc}">${g+1}</span></td>
      <td class="hi">#${s.id}</td>
      <td><span class="pill pill-prog">${s.prog}</span></td>
      <td><span class="pill ${s.gender==='Female'?'pill-female':'pill-male'}">${s.gender}</span></td>
      <td class="${gk(s.CGPA100)}">${fmt(s.CGPA100)}</td>
      <td class="${gk(s.CGPA200)}">${fmt(s.CGPA200)}</td>
      <td class="${gk(s.CGPA300)}">${fmt(s.CGPA300)}</td>
      <td class="${gk(s.CGPA400)}">${fmt(s.CGPA400)}</td>
      <td class="${gk(s.SGPA)}">${fmt(s.SGPA)}</td>
      <td class="mono">${fmt(s.cgpa)}</td>
      <td><span class="tier ${tierClass(s._tier)}">${tierLabel(s._tier)}</span></td>
      <td>${trend(s)}</td>
      <td><button class="del-btn" style="opacity:1" onclick="delStudent('${s.id}',event)" title="Remove">🗑</button></td>
    </tr>`;
  }).join('');
  renderTblPag();
}

function renderTblPag(){
  let pg=document.getElementById('tbl-pag');
  if(!pg){pg=document.createElement('div');pg.id='tbl-pag';pg.className='tbl-pagination';document.getElementById('page-table').querySelector('.panel').after(pg);}
  const total=Math.max(1,Math.ceil(tblSorted.length/TBL_SIZE));
  if(total<=1){pg.innerHTML='';return;}
  const s=tblPage*TBL_SIZE+1,e=Math.min((tblPage+1)*TBL_SIZE,tblSorted.length);
  pg.innerHTML=`
    <button class="pg-btn" onclick="goTblPg(${tblPage-1})" ${tblPage===0?'disabled':''}>← Prev</button>
    <span class="pg-info">Showing <strong>${s}–${e}</strong> of <strong>${tblSorted.length}</strong> &nbsp;·&nbsp; Page ${tblPage+1} of ${total}</span>
    <button class="pg-btn" onclick="goTblPg(${tblPage+1})" ${tblPage>=total-1?'disabled':''}>Next →</button>`;
}

function goTblPg(n){
  const total=Math.ceil(tblSorted.length/TBL_SIZE);
  if(n<0||n>=total)return;
  tblPage=n;renderTblPage();
  document.getElementById('page-table').scrollIntoView({block:'start'});
}

// ════════════════════════════════
//  NAVIGATION
// ════════════════════════════════
function renderPage(pg){
  if(pg==='overview')renderOverview();
  if(pg==='profile'){document.getElementById('profile-search').value='';activeTier='all';document.querySelectorAll('.tier-chip').forEach(c=>c.classList.toggle('active',c.dataset.tier==='all'));renderProfileList();}
  if(pg==='compare')renderComparePage();
  if(pg==='semester')renderSemester();
  if(pg==='table')renderTable();
}

document.querySelectorAll('.nav-item').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    const pg=btn.dataset.page;
    document.getElementById('page-'+pg).classList.add('active');
    renderPage(pg);
  });
});

// ════════════════════════════════
//  INIT
// ════════════════════════════════
renderPage('overview');
