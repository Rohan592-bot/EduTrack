import React, { useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// Helpers
const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const fmt = (n) => Number(n).toFixed(2);
const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a,b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
};
const stddev = (arr) => {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length);
};

const CHART_THEME = {
  text: 'var(--text-md)',
  grid: 'var(--border)',
  bgTooltip: 'var(--bg-panel)',
  borderTooltip: 'var(--border)'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: CHART_THEME.bgTooltip, border: `1px solid ${CHART_THEME.borderTooltip}`, padding: '10px', borderRadius: '6px', boxShadow: 'var(--shadow)' }}>
        <p style={{ color: 'var(--text-hi)', margin: '0 0 5px 0', fontFamily: 'Sora', fontSize: '12px', fontWeight: 600 }}>{label}</p>
        <p style={{ color: 'var(--text-md)', margin: 0, fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
          {payload[0].name}: {typeof payload[0].value === 'number' && !Number.isInteger(payload[0].value) ? payload[0].value.toFixed(2) : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const EmptyState = () => (
  <div className="empty-state">
    <span className="empty-icon">📊</span>
    <p style={{ fontSize: '.88rem', fontWeight: 500, color: 'var(--text-md)', marginBottom: '4px' }}>No data loaded</p>
    <p style={{ fontSize: '.76rem', marginBottom: '12px' }}>Upload a CSV file to see class performance metrics.</p>
  </div>
);

const Overview = ({ students }) => {
  const stats = useMemo(() => {
    if (!students.length) return null;

    const cgpas = students.map(s => s.cgpa);
    const top = students.reduce((a, b) => a.cgpa > b.cgpa ? a : b);
    const progs = [...new Set(students.map(s => s.prog))];
    const fC = students.filter(s => s.gender === 'Female').length;
    const mC = students.filter(s => s.gender === 'Male').length;

    const med = median(cgpas);
    const sd = stddev(cgpas);
    const passR = cgpas.filter(v => v >= 2.0).length;
    const distR = cgpas.filter(v => v >= 3.5).length;
    
    // Trend Data
    const trendData = [
      { name: 'Year 1 (L100)', value: avg(students.map(s => s.CGPA100).filter(Boolean)) },
      { name: 'Year 2 (L200)', value: avg(students.map(s => s.CGPA200).filter(Boolean)) },
      { name: 'Year 3 (L300)', value: avg(students.map(s => s.CGPA300).filter(Boolean)) },
      { name: 'Year 4 (L400)', value: avg(students.map(s => s.CGPA400).filter(Boolean)) },
      { name: 'Final SGPA', value: avg(students.map(s => s.SGPA).filter(Boolean)) },
    ];

    // Gender Data
    const genderData = [
      { name: 'Female', value: avg(students.filter(s => s.gender === 'Female').map(s => s.cgpa)), fill: 'rgba(188,140,255,0.8)', border: '#bc8cff' },
      { name: 'Male', value: avg(students.filter(s => s.gender === 'Male').map(s => s.cgpa)), fill: 'rgba(88,166,255,0.8)', border: '#58a6ff' },
    ];

    // Department Data
    const deptData = progs.map((prog, i) => {
      const deptStudents = students.filter(s => s.prog === prog);
      const colors = ['#f85149', '#58a6ff', '#3fb950', '#e6a817', '#bc8cff', '#0969da'];
      const dimColors = ['rgba(248,81,73,0.8)', 'rgba(88,166,255,0.8)', 'rgba(63,185,80,0.8)', 'rgba(230,168,23,0.8)', 'rgba(188,140,255,0.8)', 'rgba(9,105,218,0.8)'];
      const cIdx = i % colors.length;
      return {
        name: prog,
        value: avg(deptStudents.map(s => s.cgpa)),
        fill: dimColors[cIdx],
        border: colors[cIdx]
      };
    }).sort((a, b) => b.value - a.value);

    return { cgpas, top, progs, fC, mC, med, sd, passR, distR, minC: Math.min(...cgpas), maxC: Math.max(...cgpas), trendData, genderData, deptData };
  }, [students]);

  if (!students.length || !stats) {
    return (
      <div className="page active">
        <div className="page-head">
          <div><h1>Class Overview</h1><p>Aggregate performance, statistics, and trends across all students</p></div>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="page active" style={{ animation: 'appear .2s ease' }}>
      <div className="page-head">
        <div><h1>Class Overview</h1><p>Aggregate performance, statistics, and trends across all students</p></div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-accent" style={{background: '#e6a817'}}></div><div className="kpi-label">Total Students</div><div className="kpi-value" style={{color: '#e6a817'}}>{students.length}</div><div className="kpi-sub">{stats.progs.length} program(s)</div></div>
        <div className="kpi"><div className="kpi-accent" style={{background: '#3fb950'}}></div><div className="kpi-label">Class Avg CGPA</div><div className="kpi-value" style={{color: '#3fb950'}}>{fmt(avg(stats.cgpas))}</div><div className="kpi-sub">out of 4.00</div></div>
        <div className="kpi"><div className="kpi-accent" style={{background: '#58a6ff'}}></div><div className="kpi-label">Top Performer</div><div className="kpi-value" style={{color: '#58a6ff'}}>{fmt(stats.top.cgpa)}</div><div className="kpi-sub">ID {stats.top.id} · {stats.top.prog}</div></div>
        <div className="kpi"><div className="kpi-accent" style={{background: '#bc8cff'}}></div><div className="kpi-label">Gender Split</div><div className="kpi-value" style={{color: '#bc8cff'}}>{stats.fC}F / {stats.mC}M</div><div className="kpi-sub">{students.length} total</div></div>
      </div>

      <div className="stats-strip">
        <div className="stat-item"><div className="stat-item-label">Median CGPA</div><div className="stat-item-value">{fmt(stats.med)}</div><div className="stat-item-sub">50th percentile</div></div>
        <div className="stat-item"><div className="stat-item-label">Std Deviation</div><div className="stat-item-value">{fmt(stats.sd)}</div><div className="stat-item-sub">spread of scores</div></div>
        <div className="stat-item"><div className="stat-item-label">Min CGPA</div><div className="stat-item-value">{fmt(stats.minC)}</div><div className="stat-item-sub">lowest recorded</div></div>
        <div className="stat-item"><div className="stat-item-label">Max CGPA</div><div className="stat-item-value">{fmt(stats.maxC)}</div><div className="stat-item-sub">highest recorded</div></div>
        <div className="stat-item"><div className="stat-item-label">Pass Rate</div><div className="stat-item-value">{((stats.passR/students.length)*100).toFixed(1)}%</div><div className="stat-item-sub">{stats.passR} of {students.length}</div></div>
        <div className="stat-item"><div className="stat-item-label">Distinction</div><div className="stat-item-value">{((stats.distR/students.length)*100).toFixed(1)}%</div><div className="stat-item-sub">{stats.distR} of {students.length}</div></div>
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">Class GPA Trend</span><span className="panel-sub">avg per year-level</span></div>
        <div className="chart-wrap">
          <ResponsiveContainer>
            <LineChart data={stats.trendData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
              <XAxis dataKey="name" stroke={CHART_THEME.text} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={{ stroke: CHART_THEME.grid }} tickLine={false} />
              <YAxis stroke={CHART_THEME.text} domain={[0, 4.2]} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" name="Class Avg" stroke="#e6a817" strokeWidth={2} dot={{ r: 5, fill: '#e6a817' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="panel-head"><span className="panel-title">Gender Comparison</span><span className="panel-sub">avg CGPA</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer>
              <BarChart data={stats.genderData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_THEME.grid} />
                <XAxis type="number" stroke={CHART_THEME.text} domain={[0, 4.5]} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke={CHART_THEME.text} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={{ stroke: CHART_THEME.grid }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.03)'}} />
                <Bar dataKey="value" name="Avg CGPA" radius={[0, 4, 4, 0]}>
                  {stats.genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.border} strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="panel-title">Department Performance</span><span className="panel-sub">avg CGPA by program</span></div>
          <div className="chart-wrap">
            <ResponsiveContainer>
              <BarChart data={stats.deptData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_THEME.grid} />
                <XAxis type="number" stroke={CHART_THEME.text} domain={[0, 4.5]} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke={CHART_THEME.text} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={{ stroke: CHART_THEME.grid }} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.03)'}} />
                <Bar dataKey="value" name="Avg CGPA" radius={[0, 4, 4, 0]}>
                  {stats.deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.border} strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
