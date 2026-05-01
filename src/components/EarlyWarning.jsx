import React, { useState, useEffect, useMemo } from 'react';
import { predictRiskProbability } from '../utils/mlEngine';
import { trainLogisticModelAsync } from '../utils/mlAsync';

const EarlyWarning = ({ students }) => {
  const [y1Str, setY1Str] = useState('');

  const [logisticModel, setLogisticModel] = useState(null);
  const [isCalculating, setIsCalculating] = useState(() => students && students.length > 0);
  const [prevStudents, setPrevStudents] = useState(students);

  if (students !== prevStudents) {
    setPrevStudents(students);
    setIsCalculating(students && students.length > 0);
    setLogisticModel(null);
  }

  useEffect(() => {
    if (!students || students.length === 0) {
      return; // Handled synchronously above
    }
    
    let isMounted = true;
    
    trainLogisticModelAsync(students).then(res => {
      if (!isMounted) return;
      setLogisticModel(res);
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
  const y1 = parseFloat(y1Str);
  const prob = (isNaN(y1) || !logisticModel) ? 0 : predictRiskProbability(logisticModel, y1);
  const probPct = (prob * 100).toFixed(1);

  let riskLevel = 'Low';
  let riskColor = '#3fb950'; // green
  let actionRec = 'Student is on a safe trajectory. Continue normal monitoring.';
  if (prob > 0.8) {
    riskLevel = 'Critical';
    riskColor = '#f85149'; // red
    actionRec = 'Immediate intervention required. Schedule mandatory academic advising and tutoring.';
  } else if (prob > 0.5) {
    riskLevel = 'High';
    riskColor = '#ff7b72'; // light red
    actionRec = 'At-Risk trajectory detected. Send early warning notification and recommend study groups.';
  } else if (prob > 0.2) {
    riskLevel = 'Medium';
    riskColor = '#e6a817'; // amber
    actionRec = 'Borderline performance. Monitor closely in upcoming assessments.';
  }

  // Find all current students whose L100 scores flag them as high risk (prob >= 0.5)
  const flagged = useMemo(() => {
    if (!logisticModel || !students.length) return [];
    return students
      .filter(s => s.CGPA100 > 0 && s.cgpa > 0) // only active ones
      .map(s => {
        const p = predictRiskProbability(logisticModel, s.CGPA100);
        return { ...s, riskProb: p };
      })
      .filter(s => s.riskProb >= 0.5)
      .sort((a, b) => b.riskProb - a.riskProb); // highest risk first
  }, [students, logisticModel]);

  if (isCalculating) {
    return (
      <div className="page active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-md)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
          Deep Learning (5,000 Epochs) running securely in background thread...
        </div>
      </div>
    );
  }

  if (!students.length || !logisticModel) {
    return (
      <div className="page active">
        <div className="page-head">
          <div><h1>At-Risk Early Warning</h1><p>Predict student failure risk based purely on Level 100 performance.</p></div>
        </div>
        <div className="panel">
          <div className="model-status no-data" style={{ padding: '12px', background: 'var(--bg-overlay)', borderRadius: '6px', color: 'var(--amber)', fontSize: '.8rem' }}>
            ⚠ No data — please upload a CSV containing Final CGPA targets to train the Logistic Regression engine.
          </div>
        </div>
      </div>
    );
  }

  const accuracyPct = (logisticModel.accuracy * 100).toFixed(1);

  return (
    <div className="page active" style={{ animation: 'appear .2s ease' }}>
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div><h1>At-Risk Early Warning System</h1><p>Logistic Regression model to flag high-risk students early using exclusively Level 100 data.</p></div>
      </div>

      <div className="panel" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: 'var(--shadow)' }}></div>
          <span style={{ fontSize: '.83rem', fontWeight: 600, color: 'var(--green)' }}>Logistic Regression Active</span>
        </div>
        
        <div className="stats-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 0 }}>
           <div className="stat-item">
            <div className="stat-item-label">Model Accuracy</div>
            <div className="stat-item-value" style={{ color: logisticModel.accuracy > 0.8 ? 'var(--green)' : 'var(--amber)' }}>{accuracyPct}%</div>
            <div className="stat-item-sub">overall validation</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-label">Training Pool</div>
            <div className="stat-item-value">{logisticModel.n}</div>
            <div className="stat-item-sub">valid student records</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-label">Actual At-Risk</div>
            <div className="stat-item-value" style={{ color: 'var(--red)' }}>{logisticModel.totalRisk}</div>
            <div className="stat-item-sub">historical failures</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-label">Flagged Active</div>
            <div className="stat-item-value" style={{ color: 'var(--red)' }}>{flagged.length}</div>
            <div className="stat-item-sub">present warning flags</div>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ marginBottom: '16px' }}>
        {/* Sandbox */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Early Warning Calculator</span>
            <span className="panel-sub">Test a Level 100 CGPA</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 500, color: 'var(--text-hi)', marginBottom: '8px' }}>Year 1 CGPA (L100)</label>
              <input 
                  type="number" min="0" max="4" step="0.01" placeholder="e.g. 1.85" 
                  value={y1Str} onChange={(e) => setY1Str(e.target.value)}
                  style={{ width: '100%', maxWidth: '200px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', color: 'var(--text-hi)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1rem' }}
                />
            </div>
            
            {y1Str !== '' && !isNaN(y1) && (
              <div style={{ marginTop: '10px', padding: '16px', borderRadius: '8px', background: 'var(--bg-overlay)', border: `1px solid ${riskColor}33` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '.8rem', color: 'var(--text-md)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Risk Probability</span>
                  <span style={{ fontFamily: 'Sora', fontSize: '1.8rem', fontWeight: 700, color: riskColor, lineHeight: 1 }}>{probPct}%</span>
                </div>
                
                {/* Gauge Meter */}
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-base)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px', display: 'flex' }}>
                   <div style={{ height: '100%', width: `${probPct}%`, background: riskColor, transition: 'width 0.4s ease, background 0.4s ease' }}></div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', background: `${riskColor}22`, color: riskColor, fontSize: '.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    {riskLevel} RISK
                  </span>
                </div>
                <p style={{ fontSize: '.8rem', color: 'var(--text-lo)', lineHeight: 1.5 }}>
                  {actionRec}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Flagged List */}
        <div className="panel" style={{ maxHeight: '420px', overflowY: 'auto' }}>
          <div className="panel-head" style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 2, paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <span className="panel-title" style={{ color: 'var(--red)' }}>🚨 Flagged Roster (Probability &gt; 50%)</span>
            <span className="panel-sub">These current students show a high probability of entering the At Risk tier.</span>
          </div>
          
          {flagged.length === 0 ? (
            <div style={{ 
              padding: '60px 20px', 
              textAlign: 'center', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              background: 'radial-gradient(circle at 50% 50%, rgba(63, 185, 80, 0.08) 0%, transparent 60%)',
              borderRadius: '8px',
              minHeight: '280px'
            }}>
              <style>
                {`
                  @keyframes pulse-ring {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(2.2); opacity: 0; }
                  }
                `}
              </style>
              <div style={{ position: 'relative', width: '60px', height: '60px', marginBottom: '24px' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--green)', animation: 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' }}></div>
                <div style={{ position: 'absolute', inset: '5px', borderRadius: '50%', background: 'var(--green)', opacity: 0.2 }}></div>
                <div style={{ position: 'absolute', inset: '10px', borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--green)', marginBottom: '8px', letterSpacing: '.5px', fontFamily: '"Sora", sans-serif' }}>System Clear: Zero Risk</span>
              <span style={{ fontSize: '.8rem', color: 'var(--text-md)', maxWidth: '280px', lineHeight: 1.6 }}>
                No active students are currently flagged as high risk based on their foundational Level 100 trajectory.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {flagged.map(s => (
                <div key={`${s.id}-${s.prog}-${s.yog}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-overlay)', borderLeft: '3px solid var(--red)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                     <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.85rem', fontWeight: 600, color: 'var(--text-hi)' }}>#{s.id}</span>
                     <span style={{ fontSize: '.7rem', color: 'var(--text-lo)' }}>{s.prog} | L100: <span style={{ color: 'var(--text-md)'}}>{s.CGPA100.toFixed(2)}</span></span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--red)', fontFamily: 'JetBrains Mono' }}>{(s.riskProb * 100).toFixed(1)}%</div>
                    <div style={{ fontSize: '.65rem', color: 'var(--text-lo)', textTransform: 'uppercase' }}>Risk</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EarlyWarning;
