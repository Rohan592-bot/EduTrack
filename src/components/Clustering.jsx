import React, { useState, useEffect, useMemo } from 'react';
import { runKMeansClusteringAsync } from '../utils/mlAsync';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const CHART_THEME = {
  text: 'var(--text-md)',
  grid: 'var(--border)',
  bgTooltip: 'var(--bg-panel)',
  borderTooltip: 'var(--border)'
};

const ScatterTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: CHART_THEME.bgTooltip, border: `1px solid ${CHART_THEME.borderTooltip}`, padding: '10px', borderRadius: '6px', boxShadow: 'var(--shadow)' }}>
        <p style={{ color: 'var(--text-hi)', margin: '0 0 5px 0', fontFamily: 'Sora', fontSize: '13px', fontWeight: 600 }}>Student #{data.id}</p>
        <p style={{ color: data.color, margin: 0, fontFamily: 'JetBrains Mono', fontSize: '11px', fontWeight: 600 }}>
          {data.cluster}
        </p>
        <div style={{ width: '100%', height: '1px', background: CHART_THEME.borderTooltip, margin: '8px 0' }}></div>
        <p style={{ color: 'var(--text-md)', margin: '0 0 4px 0', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>L100: {data.x.toFixed(2)}</p>
        <p style={{ color: 'var(--text-md)', margin: 0, fontFamily: 'JetBrains Mono', fontSize: '11px' }}>L400: {data.y.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

const Clustering = ({ students, onOpenProfile }) => {
  const [clusters, setClusters] = useState(null);
  const [isCalculating, setIsCalculating] = useState(() => students && students.length > 0);
  const [prevStudents, setPrevStudents] = useState(students);

  // Sync loading state dynamically when the 'students' prop actually changes
  if (students !== prevStudents) {
    setPrevStudents(students);
    setIsCalculating(students && students.length > 0);
    setClusters(null);
  }

  useEffect(() => {
    if (!students || students.length === 0) {
      // Nothing to calculate if there's no data. 
      // The render-phase block above already handled setting isCalculating to false and clusters to null.
      return;
    }
    
    let isMounted = true;
    
    runKMeansClusteringAsync(students).then(res => {
      if (!isMounted) return;
      setClusters(res);
      setIsCalculating(false);
    }).catch(err => {
      console.error(err);
      if (!isMounted) return;
      setIsCalculating(false);
    });
    
    return () => {
      isMounted = false;
    };
  }, [students]);

  const scatterData = useMemo(() => {
    let data = [];
    if (clusters) {
      clusters.forEach(c => {
        c.meta.members.forEach(m => {
          data.push({
            id: m.id,
            x: m.CGPA100,
            y: m.CGPA400,
            color: c.color,
            cluster: c.label
          });
        });
      });
    }
    return data;
  }, [clusters]);

  if (isCalculating) {
    return (
      <div className="page active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-md)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
          Extrapolating multi-dimensional geometric centroids...
        </div>
      </div>
    );
  }

  if (!students.length || !clusters) {
    return (
      <div className="page active">
        <div className="page-head">
          <div><h1>Behavioral Clustering</h1><p>K-Means Unsupervised Learning</p></div>
        </div>
        <div className="panel">
          <div className="model-status no-data" style={{ padding: '12px', background: 'var(--bg-overlay)', borderRadius: '6px', color: 'var(--amber)', fontSize: '.8rem' }}>
            ⚠ Insufficient Data — Please upload valid data mapping continuous 4-year timelines.
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="page active" style={{ animation: 'appear .2s ease' }}>
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div><h1>Student Archetype Clustering</h1><p>Unsupervised 5-Dimensional K-Means Algorithm (k=4)</p></div>
      </div>

      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="panel-head">
          <span className="panel-title">Cohort Distribution (L100 vs L400 Scatter)</span>
        </div>
        <div style={{ height: '400px', width: '100%', marginTop: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
              <XAxis type="number" dataKey="x" name="Year 1 CGPA" stroke={CHART_THEME.text} domain={[0, 5]} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={{ stroke: CHART_THEME.grid }} />
              <YAxis type="number" dataKey="y" name="Year 4 CGPA" stroke={CHART_THEME.text} domain={[0, 5]} tick={{ fill: CHART_THEME.text, fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} />
              <RechartsTooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Students" data={scatterData}>
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
            </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
          {clusters.map(c => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '.75rem', color: 'var(--text-hi)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }}></span>
              {c.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {clusters.map(cluster => {
          const centroidData = [
            { name: 'L100', val: cluster.meta.centroid[0] },
            { name: 'L200', val: cluster.meta.centroid[1] },
            { name: 'L300', val: cluster.meta.centroid[2] },
            { name: 'L400', val: cluster.meta.centroid[3] },
            { name: 'SGPA', val: cluster.meta.centroid[4] }
          ];

          return (
            <div key={cluster.id} className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: cluster.color, fontWeight: 700 }}>{cluster.label}</h3>
                  <span style={{ fontSize: '.75rem', background: 'var(--bg-overlay)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-md)' }}>
                    N = {cluster.meta.members.length}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <span style={{ fontSize: '.65rem', color: 'var(--text-lo)', textTransform: 'uppercase' }}>Centroid Avg</span>
                     <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text-hi)', fontSize: '1.2rem' }}>
                       {cluster.meta.meanAll.toFixed(2)}
                     </span>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <span style={{ fontSize: '.65rem', color: 'var(--text-lo)', textTransform: 'uppercase' }}>L1 &gt; L4 Delta</span>
                     <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: cluster.meta.delta > 0 ? 'var(--green)' : 'var(--red)', fontSize: '1.2rem' }}>
                       {cluster.meta.delta > 0 ? '+' : ''}{cluster.meta.delta.toFixed(2)}
                     </span>
                   </div>
                </div>
              </div>

              <div style={{ height: '120px', width: '100%', marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={centroidData} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-md)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 9, fill: 'var(--text-lo)' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.03)'}} contentStyle={{background: 'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:'6px', boxShadow: 'var(--shadow)'}} itemStyle={{color: cluster.color, fontWeight: 600}} />
                    <Bar dataKey="val" fill={cluster.color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '250px', background: 'var(--bg-base)', borderRadius: '6px', border: '1px solid var(--border)', padding: '4px' }}>
                {cluster.meta.members.length === 0 ? (
                   <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-lo)', fontSize: '.8rem' }}>No Students</div>
                ) : (
                  cluster.meta.members.map(m => (
                    <div key={m.id} onClick={() => onOpenProfile(m.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onMouseOver={e=>e.currentTarget.style.background='var(--bg-overlay)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                         <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.8rem', color: 'var(--text-hi)', fontWeight: 600 }}>#{m.id}</span>
                         <span style={{ fontSize: '.65rem', color: 'var(--text-lo)' }}>{m.prog}</span>
                       </div>
                       <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.85rem', color: cluster.color, fontWeight: 600 }}>
                         {m.cgpa.toFixed(2)}
                       </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Clustering;
