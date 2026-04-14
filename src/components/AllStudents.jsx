import React, { useState, useMemo } from 'react';

const TBL_SIZE = 50;

const fmt = (n) => Number(n).toFixed(2);
const gk = (v) => (v >= 3.5 ? 'good' : v >= 2.5 ? 'warn' : 'bad');

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

function renderTrend(s) {
  const YK = ['CGPA100', 'CGPA200', 'CGPA300', 'CGPA400', 'SGPA'];
  const v = YK.map(k => s[k]).filter(x => x > 0);
  if (v.length < 2) return null;
  const d = v[v.length - 1] - v[0];
  
  if (d > 0.1) return <span className="trend trend-up">▲ {fmt(d)}</span>;
  if (d < -0.1) return <span className="trend trend-dn">▼ {fmt(Math.abs(d))}</span>;
  return <span className="trend trend-eq">— stable</span>;
}

const AllStudents = ({ students, onDelete }) => {
  const [page, setPage] = useState(0);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => b.cgpa - a.cgpa);
  }, [students]);

  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / TBL_SIZE));
  const currentStudents = sortedStudents.slice(page * TBL_SIZE, (page + 1) * TBL_SIZE);

  if (!students.length) {
    return (
      <div className="page active">
        <div className="empty-state">
          <span className="empty-icon">📂</span>
          <p style={{fontSize: '.88rem', fontWeight: 500, color: 'var(--text-md)', marginBottom: '4px'}}>No data</p>
          <p style={{fontSize: '.76rem'}}>Upload a CSV to view the master student table.</p>
        </div>
      </div>
    );
  }

  const startIdx = page * TBL_SIZE;

  return (
    <div className="page active" style={{ animation: 'appear .2s ease' }} id="page-table">
      <div className="page-head">
        <div><h1>All Students</h1><p>Master data table of all records and progression</p></div>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student ID</th>
                <th>Program</th>
                <th>Gender</th>
                <th>L100</th>
                <th>L200</th>
                <th>L300</th>
                <th>L400</th>
                <th>SGPA</th>
                <th>Overall</th>
                <th>Tier</th>
                <th>Trend</th>
                {onDelete && <th></th>}
              </tr>
            </thead>
            <tbody id="tbl-body">
              {currentStudents.map((s, i) => {
                const g = startIdx + i;
                const rc = g === 0 ? 'rank-1' : g === 1 ? 'rank-2' : g === 2 ? 'rank-3' : 'rank-n';
                const tier = getTier(s.cgpa);
                return (
                  <tr key={s.id}>
                    <td><span className={`rank ${rc}`}>{g + 1}</span></td>
                    <td className="hi">#{s.id}</td>
                    <td><span className="pill pill-prog">{s.prog}</span></td>
                    <td><span className={`pill ${s.gender === 'Female' ? 'pill-female' : 'pill-male'}`}>{s.gender}</span></td>
                    <td className={gk(s.CGPA100)}>{fmt(s.CGPA100)}</td>
                    <td className={gk(s.CGPA200)}>{fmt(s.CGPA200)}</td>
                    <td className={gk(s.CGPA300)}>{fmt(s.CGPA300)}</td>
                    <td className={gk(s.CGPA400)}>{fmt(s.CGPA400)}</td>
                    <td className={gk(s.SGPA)}>{fmt(s.SGPA)}</td>
                    <td className="mono" style={{ color: 'var(--text-hi)' }}>{fmt(s.cgpa)}</td>
                    <td><span className={`tier ${tierClass(tier)}`}>{tierLabel(tier)}</span></td>
                    <td>{renderTrend(s)}</td>
                    {onDelete && (
                      <td>
                        <button className="del-btn" style={{ opacity: 1 }} onClick={() => onDelete(s.id)} title="Remove">🗑</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="tbl-pagination">
          <button className="pg-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
          <span className="pg-info">
            Showing <strong>{startIdx + 1}–{Math.min((page + 1) * TBL_SIZE, sortedStudents.length)}</strong> of <strong>{sortedStudents.length}</strong> &nbsp;·&nbsp; Page {page + 1} of {totalPages}
          </span>
          <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next →</button>
        </div>
      )}
    </div>
  );
};

export default AllStudents;
