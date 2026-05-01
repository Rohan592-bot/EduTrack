import React, { useMemo } from 'react';

const fmt = (n) => Number(n).toFixed(2);
const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const gc = (v) => (v >= 3.5 ? '#3fb950' : v >= 2.5 ? '#e6a817' : '#f85149');
const gk = (v) => (v >= 3.5 ? 'good' : v >= 2.5 ? 'warn' : 'bad');

// Tier logic
function getTier(cgpa) {
  if (cgpa >= 3.5) return 'distinction';
  if (cgpa >= 3.0) return 'merit';
  if (cgpa >= 2.0) return 'pass';
  return 'atrisk';
}

function tierLabel(t) {
  return { distinction: 'Distinction', merit: 'Merit', pass: 'Pass', atrisk: 'At Risk' }[t] || t;
}

function tierClass(t) {
  return { distinction: 'tier-distinction', merit: 'tier-merit', pass: 'tier-pass', atrisk: 'tier-atrisk' }[t] || '';
}

const Semester = ({ students }) => {
  const LK = ['CGPA100', 'CGPA200', 'CGPA300', 'CGPA400', 'SGPA'];
  const LN = ['Level 100', 'Level 200', 'Level 300', 'Level 400', 'Final SGPA'];

  const levelAvgs = useMemo(() => LK.map(k => avg(students.map(s => s[k]).filter(v => v > 0))), [students, LK]);

  const topStudents = useMemo(() => {
    return LK.map(k => {
      const valid = students.filter(s => s[k] > 0);
      if (!valid.length) return null;
      return valid.reduce((a, b) => a[k] > b[k] ? a : b);
    });
  }, [students, LK]);

  const hmStudents = useMemo(() => students.slice(0, 100), [students]);

  const rankedTables = useMemo(() => {
    return LK.map((k, i) => {
      const sorted = [...students].filter(s => s[k] > 0).sort((a, b) => b[k] - a[k]).slice(0, 50);
      return { k, name: LN[i], avgC: levelAvgs[i], data: sorted };
    });
  }, [students, LK, LN, levelAvgs]);

  if (!students.length) {
    return (
      <div className="page active">
        <div className="empty-state">
          <span className="empty-icon">📅</span>
          <p style={{fontSize: '.88rem', fontWeight: 500, color: 'var(--text-md)', marginBottom: '4px'}}>No data</p>
          <p style={{fontSize: '.76rem'}}>Upload a CSV to see semester breakdown.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page active" style={{ animation: 'appear .2s ease' }}>
      <div className="page-head">
        <div><h1>Semester Breakdown</h1><p>Deep dive into year-level specific performance patterns</p></div>
      </div>

      <div className="sem-cards">
        {LK.map((k, i) => {
          const a = levelAvgs[i];
          const top = topStudents[i];
          return (
             <div key={k} className="sem-card">
               <div className="sem-lbl">{LN[i]}</div>
               <div className="sem-val" style={{ color: gc(a) }}>{fmt(a)}</div>
               <div className="sem-note">avg {top ? `· best #${top.id}` : ''}</div>
             </div>
          );
        })}
      </div>

      <div style={{ marginTop: '24px' }}>
        <h4 style={{ fontSize: '.8rem', color: 'var(--text-hi)', marginBottom: '12px' }}>CGPA Heatmap Progression</h4>
        {students.length > 100 && (
          <div style={{ fontSize: '.7rem', color: 'var(--text-lo)', padding: '0 0 8px 4px' }}>Showing first 100 of {students.length} students</div>
        )}
        <div className="panel" style={{ overflowX: 'auto', padding: '16px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: '"JetBrains Mono", monospace', fontSize: '.7rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '7px 13px', textAlign: 'left', color: 'var(--text-lo)', fontSize: '.62rem', fontWeight: 600, letterSpacing: '.08em', borderBottom: '1px solid var(--border)' }}>STUDENT</th>
                {LN.map(l => (
                   <th key={l} style={{ padding: '7px 13px', textAlign: 'center', color: 'var(--text-lo)', fontSize: '.62rem', fontWeight: 600, letterSpacing: '.08em', borderBottom: '1px solid var(--border)' }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hmStudents.map(s => (
                <tr key={`${s.id}-${s.prog}-${s.yog}`}>
                  <td style={{ padding: '6px 13px', color: 'var(--text-md)', borderBottom: '1px solid var(--border)' }}>#{s.id}</td>
                  {LK.map(k => {
                    const v = s[k];
                    if (!v || v === 0) return <td key={k} style={{ padding: '5px 13px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>-</td>;
                    const p = Math.min(v / 4, 1);
                    const bg = v >= 3.5 ? 'rgba(63,185,80,' : v >= 2.5 ? 'rgba(230,168,23,' : 'rgba(248,81,73,';
                    return (
                       <td key={k} style={{ padding: '5px 13px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                         <span style={{ display: 'inline-block', background: `${bg}${.08 + p * .22})`, borderRadius: '4px', padding: '2px 7px', color: gc(v) }}>
                           {fmt(v)}
                         </span>
                       </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '24px' }} className="grid2">
        {rankedTables.map((tbl, i) => (
           <div key={tbl.k} className="panel">
             <div className="panel-head">
               <span className="panel-title">{tbl.name} — Rankings</span>
             </div>
             {tbl.data.length > 0 && <div style={{ fontSize: '.7rem', color: 'var(--text-lo)', marginBottom: '8px' }}>Top {tbl.data.length} performing students</div>}
             <div className="table-wrap">
               <table>
                 <thead>
                   <tr>
                     <th>Rank</th>
                     <th>Student ID</th>
                     <th>Program</th>
                     <th>GPA</th>
                     <th>vs Avg</th>
                     <th>Tier</th>
                   </tr>
                 </thead>
                 <tbody>
                   {tbl.data.map((s, ri) => {
                     const d = s[tbl.k] - tbl.avgC;
                     const rc = ri === 0 ? 'rank-1' : ri === 1 ? 'rank-2' : ri === 2 ? 'rank-3' : 'rank-n';
                     const tier = getTier(s.cgpa);
                     return (
                        <tr key={`${s.id}-${s.prog}-${s.yog}`}>
                          <td><span className={`rank ${rc}`}>{ri + 1}</span></td>
                          <td className="hi">#{s.id}</td>
                          <td><span className="pill pill-prog">{s.prog}</span></td>
                          <td className={gk(s[tbl.k])}>{fmt(s[tbl.k])}</td>
                          <td style={{ color: d >= 0 ? '#3fb950' : '#f85149', fontFamily: '"JetBrains Mono", monospace', fontSize: '.73rem' }}>
                            {d >= 0 ? '+' : ''}{fmt(d)}
                          </td>
                          <td><span className={`tier ${tierClass(tier)}`}>{tierLabel(tier)}</span></td>
                        </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           </div>
        ))}
      </div>
    </div>
  );
};

export default Semester;
