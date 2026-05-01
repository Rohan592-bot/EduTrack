import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CLR = ['#e6a817','#58a6ff','#3fb950','#bc8cff','#f85149','#39d0d8','#f97316','#a3e635'];
const fmt = (n) => Number(n).toFixed(2);
const gc = (v) => (v >= 3.5 ? '#3fb950' : v >= 2.5 ? '#e6a817' : '#f85149');

const CHART_THEME = {
  text: '#8b949e',
  grid: 'rgba(33,41,58,0.7)',
  bgTooltip: '#1c2231',
  borderTooltip: '#21293a'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: CHART_THEME.bgTooltip, border: `1px solid ${CHART_THEME.borderTooltip}`, padding: '10px', borderRadius: '6px' }}>
        <p style={{ color: '#e6edf3', margin: '0 0 5px 0', fontFamily: 'Sora', fontSize: '12px' }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || p.fill || '#8b949e', margin: '2px 0', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
             {p.name}: {typeof p.value === 'number' && !Number.isInteger(p.value) ? p.value.toFixed(2) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

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

const Compare = ({ students }) => {
  const [search, setSearch] = useState('');
  const [cmpSel, setCmpSel] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchWrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const enrichedStudents = useMemo(() => {
    return students.map(s => ({
      ...s,
      _tier: getTier(s.cgpa),
      _searchStr: [s.id, s.prog, s.gender, s.yog, fmt(s.cgpa), tierLabel(getTier(s.cgpa))].join(' ').toLowerCase(),
      _col: CLR[students.indexOf(s) % CLR.length]
    }));
  }, [students]);

  const searchHits = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return enrichedStudents.filter(s => s._searchStr.includes(q)).slice(0, 12);
  }, [search, enrichedStudents]);

  const toggleCmp = (id) => {
    if (cmpSel.includes(id)) {
      setCmpSel(cmpSel.filter(x => x !== id));
    } else {
      setCmpSel([...cmpSel, id]);
    }
  };

  const selectedStudents = useMemo(() => {
    return cmpSel.map(id => enrichedStudents.find(s => s.id === id)).filter(Boolean);
  }, [cmpSel, enrichedStudents]);

  // Line Chart Data formatting
  const lineChartData = useMemo(() => {
    if (selectedStudents.length < 2) return [];
    const points = [
      { key: 'CGPA100', name: 'Year 1 (L100)' },
      { key: 'CGPA200', name: 'Year 2 (L200)' },
      { key: 'CGPA300', name: 'Year 3 (L300)' },
      { key: 'CGPA400', name: 'Year 4 (L400)' },
      { key: 'SGPA', name: 'Final SGPA' }
    ];

    return points.map(pt => {
      let ptObj = { name: pt.name };
      selectedStudents.forEach(s => {
        ptObj[`#${s.id}`] = s[pt.key] || 0;
      });
      return ptObj;
    });
  }, [selectedStudents]);

  // Bar Chart Data formatting
  const barChartData = useMemo(() => {
    if (selectedStudents.length < 2) return [];
    const sorted = [...selectedStudents].sort((a, b) => b.cgpa - a.cgpa);
    return sorted.map(s => ({
      name: `#${s.id}`,
      value: s.cgpa,
      fill: `${s._col}33`,  // 33 = 20% opacity hex
      stroke: s._col
    }));
  }, [selectedStudents]);

  return (
    <div className="page active" style={{ animation: 'appear .2s ease' }}>
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div><h1>Compare Students</h1><p>Search and compare up to N individual student trajectories</p></div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="hdr-btn" onClick={() => { setCmpSel([]); setSearch(''); }} disabled={!cmpSel.length}>
            Clear All
          </button>
        </div>
      </div>

      <div className="compare-top">
        <div className="search-bar-wrap" ref={searchWrapRef} style={{ maxWidth: '400px', margin: 0 }}>
          <svg className="search-bar-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5L14 14"/>
          </svg>
          <input 
            className="search-bar" 
            placeholder="Search by ID, program, gender, year..." 
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
          />
          {search && (
            <button className="search-bar-clear" onClick={() => setSearch('')}>
              <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>
            </button>
          )}

          {showDropdown && searchHits.length > 0 && (
            <div className="cmp-dropdown" style={{ display: 'block' }}>
              {searchHits.map(s => {
                const added = cmpSel.includes(s.id);
                return (
                  <div key={`${s.id}-${s.prog}-${s.yog}`} className={`cmp-di ${added ? 'added' : ''}`} onClick={() => toggleCmp(s.id)}>
                    <span>
                      <span style={{ color: s._col, marginRight: '6px' }}>●</span>#{s.id}
                      <span style={{ color: 'var(--text-lo)', marginLeft: '6px', fontSize: '.7rem' }}>
                        {s.prog} · {s.gender} · CGPA {fmt(s.cgpa)} · <span className={`tier ${tierClass(s._tier)}`}>{tierLabel(s._tier)}</span>
                      </span>
                    </span>
                    <span style={{ fontSize: '.68rem', color: added ? 'var(--text-lo)' : 'var(--amber)' }}>
                      {added ? 'Added ✓' : '+ Add'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="cmp-selected-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', minHeight: '44px' }}>
          {selectedStudents.map(s => (
             <div key={`${s.id}-${s.prog}-${s.yog}`} className="cmp-chip">
               <div className="cmp-chip-l">
                 <div className="cmp-dot" style={{ background: s._col }}></div>
                 <div>
                   <div className="cmp-chip-name">#{s.id}</div>
                   <div className="cmp-chip-info">{s.prog} · {s.gender} · CGPA {fmt(s.cgpa)} · <span className={`tier ${tierClass(s._tier)}`}>{tierLabel(s._tier)}</span></div>
                 </div>
               </div>
               <button className="cmp-rm" onClick={() => toggleCmp(s.id)}>✕</button>
             </div>
          ))}
          {cmpSel.length === 0 && <div id="cmp-hint" className="cmp-hint" style={{ display: 'block' }}>Search and add at least 2 students to compare performance.</div>}
          {cmpSel.length === 1 && <div id="cmp-hint" className="cmp-hint" style={{ display: 'block' }}>Add at least one more student to enable comparison.</div>}
        </div>
      </div>

      {cmpSel.length >= 2 && (
        <div style={{ marginTop: '24px' }}>
          <div className="panel" style={{ marginBottom: '12px' }}>
            <div className="panel-head">
              <span className="panel-title">GPA Progression</span>
              <span className="panel-sub">year-by-year</span>
              <div style={{marginLeft: 'auto', fontSize: '.76rem', color: 'var(--text-lo)'}}>Comparing {selectedStudents.length} students</div>
            </div>
            <div className="chart-wrap" style={{ height: '340px' }}>
              <ResponsiveContainer>
                <LineChart data={lineChartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
                  <XAxis dataKey="name" stroke={CHART_THEME.text} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={{ stroke: CHART_THEME.grid }} tickLine={false} />
                  <YAxis stroke={CHART_THEME.text} domain={[0, 4.2]} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  {selectedStudents.map(s => (
                    <Line 
                      key={`${s.id}-${s.prog}-${s.yog}`}
                      type="monotone" 
                      dataKey={`#${s.id}`} 
                      name={`#${s.id} (${s.prog})`} 
                      stroke={s._col} 
                      strokeWidth={2} 
                      dot={{ r: 5, fill: s._col }} 
                      activeDot={{ r: 7 }} 
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">CGPA Ranking</span>
              <span className="panel-sub">overall</span>
            </div>
            <div className="chart-wrap" style={{ height: '240px' }}>
              <ResponsiveContainer>
                <BarChart data={barChartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
                  <XAxis dataKey="name" stroke={CHART_THEME.text} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={{ stroke: CHART_THEME.grid }} tickLine={false} />
                  <YAxis stroke={CHART_THEME.text} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                  <Bar dataKey="value" name="Overall CGPA" radius={[4, 4, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.stroke} strokeWidth={1.5} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compare;
