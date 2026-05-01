import React, { useState, useEffect } from 'react';
import { predictCGPA, calcConfidence, findSimilar } from '../utils/mlEngine';
import { trainPredictorModelAsync } from '../utils/mlAsync';

const fmt = (n) => Number(n).toFixed(2);
const gc = (v) => (v >= 3.5 ? '#3fb950' : v >= 2.5 ? '#e6a817' : '#f85149');

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

const Predictor = ({ students }) => {
  const [y1Str, setY1] = useState('');
  const [y2Str, setY2] = useState('');
  const [y3Str, setY3] = useState('');
  const [result, setResult] = useState(null);

  const [model, setModel] = useState(null);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    setIsCalculating(true);
    if (!students || students.length === 0) {
      setModel(null);
      setIsCalculating(false);
      return;
    }
    trainPredictorModelAsync(students).then(res => {
      setModel(res);
      setIsCalculating(false);
    }).catch(err => {
      console.error(err);
      setIsCalculating(false);
    });
  }, [students]);

  const y1 = parseFloat(y1Str);
  const y2 = parseFloat(y2Str);
  const y3 = y3Str.trim() !== '' ? parseFloat(y3Str) : null;

  const handlePredict = () => {
    if (isNaN(y1) || isNaN(y2) || !model) return;
    const predicted = predictCGPA(model, y1, y2, y3);
    const confidence = calcConfidence(model, predicted);
    const similar = findSimilar(model, y1, y2, y3);
    setResult({ predicted, confidence, similar });
  };

  const clearPrediction = () => {
    setY1(''); setY2(''); setY3(''); setResult(null);
  };

  const renderInputBar = (valStr) => {
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0) return { width: '0%', fill: 'transparent', label: '', color: 'inherit' };
    const clamped = Math.min(4, Math.max(0, val));
    const pct = (clamped / 4) * 100;
    const color = gc(clamped);
    return { width: `${pct}%`, fill: color, label: tierLabel(getTier(clamped)), color };
  };

  const bY1 = renderInputBar(y1Str);
  const bY2 = renderInputBar(y2Str);
  const bY3 = renderInputBar(y3Str);

  if (isCalculating) {
    return (
      <div className="page active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-md)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
          Loading ML Engine asynchronously...
        </div>
      </div>
    );
  }

  if (!students.length || !model) {
    return (
      <div className="page active">
        <div className="page-head">
          <div><h1>GPA Predictor</h1><p>Predict final outcomes using historical class data</p></div>
        </div>
        <div className="panel">
          <div className="model-status no-data" style={{ padding: '12px', background: 'var(--bg-overlay)', borderRadius: '6px', color: 'var(--amber)', fontSize: '.8rem' }}>
            ⚠ No data — upload a CSV with full student histories to train the algorithm.
          </div>
        </div>
      </div>
    );
  }

  const r2pct = (model.r2 * 100).toFixed(1);
  const r2Color = model.r2 > 0.8 ? '#3fb950' : model.r2 > 0.6 ? '#e6a817' : '#f85149';
  const [b0, b1, b2, b3] = model.coeffs;
  const maxW = Math.max(Math.abs(b1), Math.abs(b2), Math.abs(b3));

  const lo = Math.max(0, (result ? result.predicted : 0) - model.rmse * 1.5).toFixed(2);
  const hi = Math.min(4.0, (result ? result.predicted : 4.0) + model.rmse * 1.5).toFixed(2);

  return (
    <div className="page active" style={{ animation: 'appear .2s ease' }}>
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div><h1>GPA Predictor</h1><p>Predict final outcomes using regression analysis on historical class data</p></div>
      </div>

      <div className="panel" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }}></div>
          <span style={{ fontSize: '.83rem', fontWeight: 600, color: 'var(--green)' }}>Model Trained ({model.n} students)</span>
        </div>
        
        <div className="stats-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 0 }}>
          <div className="stat-item">
            <div className="stat-item-label">Training Samples</div>
            <div className="stat-item-value">{model.n}</div>
            <div className="stat-item-sub">students used</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-label">R² Score</div>
            <div className="stat-item-value" style={{ color: r2Color }}>{r2pct}%</div>
            <div className="stat-item-sub">prediction accuracy</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-label">Avg Error (MAE)</div>
            <div className="stat-item-value">± {fmt(model.mae)}</div>
            <div className="stat-item-sub">mean absolute error</div>
          </div>
          <div className="stat-item">
            <div className="stat-item-label">Root MSE</div>
            <div className="stat-item-value">{fmt(model.rmse)}</div>
            <div className="stat-item-sub">typical deviation</div>
          </div>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="panel-head"><span className="panel-title">Enter Student Scores</span><span className="panel-sub">Year 1 to 3 CGPA</span></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 500, color: 'var(--text-hi)', marginBottom: '6px' }}>Year 1 CGPA <span style={{color: 'var(--text-lo)', fontWeight: 400}}>(L100)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="number" min="0" max="4" step="0.01" placeholder="e.g. 3.25" 
                  value={y1Str} onChange={(e) => setY1(e.target.value)}
                  style={{ width: '100px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-hi)', fontFamily: 'JetBrains Mono, monospace' }}
                />
                <div style={{ flex: 1, height: '4px', background: 'var(--bg-base)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: bY1.width, height: '100%', background: bY1.fill, transition: 'width .2s, background .2s' }}></div>
                </div>
                <span style={{ width: '60px', fontSize: '.65rem', fontWeight: 600, color: bY1.color, textAlign: 'right', textTransform: 'uppercase' }}>{bY1.label}</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 500, color: 'var(--text-hi)', marginBottom: '6px' }}>Year 2 CGPA <span style={{color: 'var(--text-lo)', fontWeight: 400}}>(L200)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="number" min="0" max="4" step="0.01" placeholder="e.g. 3.48" 
                  value={y2Str} onChange={(e) => setY2(e.target.value)}
                  style={{ width: '100px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-hi)', fontFamily: 'JetBrains Mono, monospace' }}
                />
                <div style={{ flex: 1, height: '4px', background: 'var(--bg-base)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: bY2.width, height: '100%', background: bY2.fill, transition: 'width .2s, background .2s' }}></div>
                </div>
                <span style={{ width: '60px', fontSize: '.65rem', fontWeight: 600, color: bY2.color, textAlign: 'right', textTransform: 'uppercase' }}>{bY2.label}</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 500, color: 'var(--text-hi)', marginBottom: '6px' }}>Year 3 CGPA <span style={{color: 'var(--text-lo)', fontWeight: 400}}>(L300) · optional</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="number" min="0" max="4" step="0.01" placeholder="leave blank" 
                  value={y3Str} onChange={(e) => setY3(e.target.value)}
                  style={{ width: '100px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-hi)', fontFamily: 'JetBrains Mono, monospace' }}
                />
                <div style={{ flex: 1, height: '4px', background: 'var(--bg-base)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: bY3.width, height: '100%', background: bY3.fill, transition: 'width .2s, background .2s' }}></div>
                </div>
                <span style={{ width: '60px', fontSize: '.65rem', fontWeight: 600, color: bY3.color, textAlign: 'right', textTransform: 'uppercase' }}>{bY3.label}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={handlePredict} disabled={isNaN(y1) || isNaN(y2)}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}>
                <circle cx="6.5" cy="6.5" r="5"/><path d="M6.5 4v3l2 1"/>
              </svg>
              Predict Final CGPA
            </button>
            <button className="btn-ghost" onClick={clearPrediction}>Clear</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="panel-title">Prediction Result</span></div>
          {!result ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-lo)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.4 }}>🎯</div>
              <p style={{ fontSize: '.83rem', color: 'var(--text-md)' }}>Enter scores on the left and click <strong>Predict</strong></p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
                <span style={{ fontSize: '.8rem', color: 'var(--text-md)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>Predicted Final CGPA</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`tier ${tierClass(getTier(result.predicted))}`}>{tierLabel(getTier(result.predicted))}</span>
                  <span style={{ fontFamily: 'Sora', fontSize: '1.8rem', fontWeight: 700, color: gc(result.predicted), lineHeight: 1 }}>{fmt(result.predicted)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.76rem' }}>
                  <span style={{ color: 'var(--text-md)' }}>Confidence</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '200px' }}>
                    <div style={{ flex: 1, height: '4px', background: 'var(--bg-base)', borderRadius: '2px', overflow: 'hidden' }}>
                       <div style={{ width: `${result.confidence}%`, height: '100%', background: result.confidence > 75 ? '#3fb950' : result.confidence > 55 ? '#e6a817' : '#f85149' }}></div>
                    </div>
                    <span style={{ fontWeight: 600, color: result.confidence > 75 ? '#3fb950' : result.confidence > 55 ? '#e6a817' : '#f85149' }}>{result.confidence}%</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.76rem' }}>
                  <span style={{ color: 'var(--text-md)' }}>Expected range</span>
                  <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-hi)' }}>{lo} – {hi}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.76rem' }}>
                  <span style={{ color: 'var(--text-md)' }}>Model error (MAE)</span>
                  <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-hi)' }}>± {fmt(model.mae)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.76rem' }}>
                  <span style={{ color: 'var(--text-md)' }}>Based on</span>
                  <span style={{ color: 'var(--text-hi)' }}>{model.n} students</span>
                </div>
              </div>

              {y3 === null && (
                <div style={{ border: '1px dashed rgba(230,168,23,.3)', borderRadius: '6px', padding: '8px 12px', marginTop: '16px', background: 'rgba(230,168,23,.05)' }}>
                  <span style={{ fontSize: '.7rem', color: 'var(--amber)' }}>⚠ Year 3 not provided — accuracy is lower. Add Year 3 for a better prediction.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="panel">
          <div className="panel-head"><span className="panel-title">📋 Similar Historical Students</span><span className="panel-sub">students with closest Year 1–3 scores</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {result.similar.map((item, i) => {
              const s = item.s;
              return (
                <div key={`${s.id}-${s.prog}-${s.yog}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 12px', background: 'var(--bg-overlay)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-md)', width: '20px' }}>{i + 1}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.8rem', color: 'var(--text-hi)', width: '60px' }}>#{s.id}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.75rem', color: 'var(--text-lo)', flex: 1 }}>
                    {fmt(s.CGPA100)} <span style={{color:'var(--border-md)'}}>→</span> {fmt(s.CGPA200)} <span style={{color:'var(--border-md)'}}>→</span> {fmt(s.CGPA300)}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.85rem', fontWeight: 600, color: gc(s.cgpa) }}>{fmt(s.cgpa)}</span>
                  <span style={{ fontSize: '.65rem', color: 'var(--text-lo)', width: '60px', textAlign: 'right' }}>dist: {item.dist.toFixed(3)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head"><span className="panel-title">📐 Model Details</span><span className="panel-sub">how the algorithm weighted each year</span></div>
        <p style={{ fontSize: '.78rem', color: 'var(--text-md)', marginBottom: '14px', lineHeight: 1.6 }}>
          The model learned these weights natively from your data.<br/>
          A higher weight means that year has more influence on the final CGPA prediction.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px' }}>
          {[
            ['Year 1 (L100)', b1], 
            ['Year 2 (L200)', b2], 
            ['Year 3 (L300)', b3]
          ].map(([lbl, w]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '.75rem', color: 'var(--text-md)', width: '100px' }}>{lbl}</span>
              <div style={{ flex: 1, height: '6px', background: 'var(--bg-overlay)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(Math.abs(w) / maxW) * 100}%`, background: w > 0 ? 'var(--amber)' : 'var(--red)', borderRadius: '3px' }}></div>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.75rem', fontWeight: 500, color: w > 0 ? 'var(--amber)' : 'var(--red)', width: '50px', textAlign: 'right' }}>
                {w > 0 ? '+' : ''}{w.toFixed(4)}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '6px', opacity: 0.6 }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-md)', width: '100px' }}>Intercept</span>
            <div style={{ flex: 1, height: '6px' }}></div>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '.75rem', width: '50px', textAlign: 'right', color: 'var(--text-hi)' }}>{b0.toFixed(4)}</span>
          </div>
        </div>

        <p style={{ fontSize: '.72rem', color: 'var(--text-lo)', marginTop: '16px', fontFamily: 'JetBrains Mono' }}>
          Equation: CGPA = {b0.toFixed(3)} + {b1.toFixed(3)}L100 + {b2.toFixed(3)}L200 + {b3.toFixed(3)}L300
        </p>
      </div>

    </div>
  );
};

export default Predictor;
