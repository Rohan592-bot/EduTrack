import React, { useState, useEffect } from 'react';
import { calculateAnomaliesAsync } from '../utils/mlAsync';

const getSeverityColor = (sev) => {
  if (sev === 'Severe') return '#f85149'; // red
  if (sev === 'Moderate') return '#e6a817'; // amber
  return '#1f6feb'; // blue (mild)
};

const AnomalyDetection = ({ students, onOpenProfile }) => {
  const [anomalyData, setAnomalyData] = useState(null);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    setIsCalculating(true);
    if (!students || students.length === 0) {
      setAnomalyData(null);
      setIsCalculating(false);
      return;
    }
    calculateAnomaliesAsync(students).then(res => {
      setAnomalyData(res);
      setIsCalculating(false);
    }).catch(err => {
      console.error(err);
      setIsCalculating(false);
    });
  }, [students]);
  if (isCalculating) {
    return (
      <div className="page active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-md)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
          Calculating multi-dimensional Standard Deviations...
        </div>
      </div>
    );
  }

  if (!students.length || !anomalyData) {
    return (
      <div className="page active">
        <div className="page-head">
          <div><h1>Anomaly Detection</h1><p>Algorithmic scanning utilizing standard deviation Z-Scores.</p></div>
        </div>
        <div className="panel">
          <div className="model-status no-data" style={{ padding: '12px', background: 'var(--bg-overlay)', borderRadius: '6px', color: 'var(--amber)', fontSize: '.8rem' }}>
            ⚠ No data — please upload a CSV containing semester histories to scan for variance anomalies.
          </div>
        </div>
      </div>
    );
  }

  const { anomalies, globalStats } = anomalyData;
  const severeCount = anomalies.filter(a => a.severity === 'Severe').length;
  const modCount = anomalies.filter(a => a.severity === 'Moderate').length;
  const mildCount = anomalies.filter(a => a.severity === 'Mild').length;

  return (
    <div className="page active" style={{ animation: 'appear .2s ease' }}>
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div><h1>Statistical Anomaly Detection</h1><p>Automatically flags student trajectories that mathematically deviate from the class average.</p></div>
      </div>

      <div className="panel" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }}></div>
          <span style={{ fontSize: '.83rem', fontWeight: 600, color: 'var(--green)' }}>Z-Score Engine Active</span>
        </div>
        
        <div className="stats-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 0 }}>
          <div className="stat-item">
            <div className="stat-item-label">Total Outliers</div>
            <div className="stat-item-value">{anomalies.length}</div>
            <div className="stat-item-sub">students flagged</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-label">Severe (|Z| &gt; 3.0)</div>
            <div className="stat-item-value" style={{ color: getSeverityColor('Severe') }}>{severeCount}</div>
            <div className="stat-item-sub">critical variances</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-label">Moderate (|Z| &gt; 2.5)</div>
            <div className="stat-item-value" style={{ color: getSeverityColor('Moderate') }}>{modCount}</div>
            <div className="stat-item-sub">significant variance</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-label">Mild (|Z| &gt; 2.0)</div>
            <div className="stat-item-value" style={{ color: getSeverityColor('Mild') }}>{mildCount}</div>
            <div className="stat-item-sub">notable variance</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Outlier Matrix</span>
          <span className="panel-sub">Click a row to inspect the student's profile</span>
        </div>
        
        {anomalies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-lo)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.4 }}>📊</div>
            <p style={{ fontSize: '.83rem', color: 'var(--text-md)' }}>No anomalies detected. The class trajectories are highly consistent.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Student</th>
                  <th>Anomaly Type</th>
                  <th>Severity Target</th>
                  <th>Variance Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a, i) => (
                  <tr key={a.student.id} onClick={() => onOpenProfile(a.student.id)} style={{ cursor: 'pointer', transition: 'background .2s' }} onMouseOver={e => e.currentTarget.style.background='var(--bg-overlay)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ color: 'var(--text-lo)', fontSize: '.75rem', fontWeight: 600 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text-hi)' }}>#{a.student.id}</span>
                        <span style={{ fontSize: '.7rem', color: 'var(--text-lo)' }}>{a.student.prog}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: `${getSeverityColor(a.severity)}22`, color: getSeverityColor(a.severity), fontSize: '.65rem', fontWeight: 600, textTransform: 'uppercase' }}>
                          {a.severity}
                        </span>
                        <span style={{ fontSize: '.75rem', color: 'var(--text-md)' }}>{a.type}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.85rem', fontWeight: 700, color: getSeverityColor(a.severity) }}>
                          Z: {a.highestAbsZ.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {a.flags.map((flag, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.7rem' }}>
                            <span style={{ color: 'var(--text-lo)', width: '70px' }}>{flag.period}</span>
                            <span style={{ fontFamily: 'JetBrains Mono', color: flag.zScore > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600, width: '45px' }}>
                              {flag.delta > 0 ? '+' : ''}{flag.delta.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AnomalyDetection;
