import React, { useState, useMemo } from 'react';
import ProfileModal from './ProfileModal';

const CLR = ['#e6a817','#58a6ff','#3fb950','#bc8cff','#f85149','#39d0d8','#f97316','#a3e635'];
const fmt = (n) => Number(n).toFixed(2);
const gc = (v) => (v >= 3.5 ? '#3fb950' : v >= 2.5 ? '#e6a817' : '#f85149');



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

const Profiles = ({ students }) => {
  const [search, setSearch] = useState('');
  const [activeTier, setActiveTier] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Extend students with tier, rank, color
  const enrichedStudents = useMemo(() => {
    let sorted = [...students].sort((a, b) => b.cgpa - a.cgpa);
    return sorted.map((s, idx) => ({
      ...s,
      _tier: getTier(s.cgpa),
      _rank: idx + 1,
      _searchStr: [s.id, s.prog, s.gender, s.yog, fmt(s.cgpa), tierLabel(getTier(s.cgpa))].join(' ').toLowerCase(),
      _col: CLR[students.indexOf(s) % CLR.length]
    }));
  }, [students]);

  const tierCounts = useMemo(() => {
    return enrichedStudents.reduce((acc, s) => {
      acc[s._tier] = (acc[s._tier] || 0) + 1;
      return acc;
    }, {});
  }, [enrichedStudents]);

  const filtered = useMemo(() => {
    let list = activeTier === 'all' ? enrichedStudents : enrichedStudents.filter(s => s._tier === activeTier);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s._searchStr.includes(q));
    }
    return list;
  }, [enrichedStudents, activeTier, search]);

  const renderStudentCard = (s) => {
    const rc = s._rank === 1 ? 'rank-1' : s._rank === 2 ? 'rank-2' : s._rank === 3 ? 'rank-3' : 'rank-n';
    return (
      <div 
        key={`${s.id}-${s.prog}-${s.yog}`} 
        className="s-card" 
        style={{ '--card-color': s._col }}
        onClick={() => setSelectedStudent(s)}
      >
        <div className="s-avatar" style={{ background: `${s._col}18`, color: s._col }}>
          #{s.id}
        </div>
        <div className="s-info">
          <div className="s-name">Student {s.id}</div>
          <div className="s-meta">
            <span className="pill pill-prog">{s.prog}</span>
            <span className={`pill ${s.gender === 'Female' ? 'pill-female' : 'pill-male'}`}>{s.gender}</span>
            <span style={{ color: 'var(--text-lo)' }}>·</span> {s.yog}
          </div>
        </div>
        <div className="s-stats">
          <div className="s-stat"><div className="s-stat-val" style={{ color: gc(s.cgpa) }}>{fmt(s.cgpa)}</div><div className="s-stat-lbl">CGPA</div></div>
          <div className="s-stat"><div className="s-stat-val" style={{ color: gc(s.SGPA) }}>{fmt(s.SGPA)}</div><div className="s-stat-lbl">SGPA</div></div>
          <span className={`rank ${rc}`}>{s._rank}</span>
          <span className={`tier ${tierClass(s._tier)}`}>{tierLabel(s._tier)}</span>
        </div>
      </div>
    );
  };



  return (
    <div className="page active" style={{ animation: 'appear .2s ease' }}>
      <div className="page-head">
        <div><h1>Student Profiles</h1><p>Click a student to view their report</p></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge-count">{filtered.length} results</span>
        </div>
      </div>

      <div className="search-bar-wrap">
        <svg className="search-bar-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5L14 14"/>
        </svg>
        <input 
          className="search-bar" 
          placeholder="Search by ID, program, gender, year..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="search-bar-clear" onClick={() => setSearch('')}>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>
          </button>
        )}
      </div>

      {/* Tier Filters */}
      <div className="tier-filters">
        <button className={`tier-chip ${activeTier === 'all' ? 'active' : ''}`} onClick={() => setActiveTier('all')}>All</button>
        <button className={`tier-chip ${activeTier === 'distinction' ? 'active' : ''}`} onClick={() => setActiveTier('distinction')}>
          <span className="tier-dot" style={{background: '#3fb950'}}></span>Distinction <span className="tier-count">{tierCounts['distinction'] || 0}</span>
        </button>
        <button className={`tier-chip ${activeTier === 'merit' ? 'active' : ''}`} onClick={() => setActiveTier('merit')}>
          <span className="tier-dot" style={{background: '#58a6ff'}}></span>Merit <span className="tier-count">{tierCounts['merit'] || 0}</span>
        </button>
        <button className={`tier-chip ${activeTier === 'pass' ? 'active' : ''}`} onClick={() => setActiveTier('pass')}>
          <span className="tier-dot" style={{background: '#e6a817'}}></span>Pass <span className="tier-count">{tierCounts['pass'] || 0}</span>
        </button>
        <button className={`tier-chip ${activeTier === 'atrisk' ? 'active' : ''}`} onClick={() => setActiveTier('atrisk')}>
          <span className="tier-dot" style={{background: '#f85149'}}></span>At Risk <span className="tier-count">{tierCounts['atrisk'] || 0}</span>
        </button>
      </div>

      <div className="student-list" style={{ marginTop: '10px' }}>
        {filtered.length > 0 ? filtered.map(renderStudentCard) : (
          <div className="no-results">
            <span className="no-results-icon">⊘</span>
            <p>No students match your search</p>
          </div>
        )}
      </div>

      {/* React Modal */}
      {selectedStudent && (
        <ProfileModal 
          selectedStudent={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
          allStudentsLength={students.length} 
        />
      )}
    </div>
  );
};

export default Profiles;
