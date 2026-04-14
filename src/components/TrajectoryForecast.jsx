import React, { useState, useEffect, useMemo } from 'react';
import { predictTrajectoryChained } from '../utils/mlEngine';
import { trainTrajectoryModelsAsync } from '../utils/mlAsync';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_THEME = {
  text: '#8b949e',
  grid: 'rgba(33,41,58,0.7)',
  bgTooltip: '#1c2231',
  borderTooltip: '#21293a',
  actual: '#3fb950', // green
  forecast: '#58a6ff', // blue
  bandOpts: 'rgba(88, 166, 255, 0.15)', // light blue translucent
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const isForecast = payload.some(p => p.dataKey === 'forecast' && p.value !== null);
    const val = payload.find(p => p.dataKey === 'actual' || p.dataKey === 'forecast')?.value;
    const min = payload.find(p => p.dataKey === 'areaBounds')?.payload?.areaMin;
    const max = payload.find(p => p.dataKey === 'areaBounds')?.payload?.areaMax;

    return (
      <div style={{ background: CHART_THEME.bgTooltip, border: `1px solid ${CHART_THEME.borderTooltip}`, padding: '10px', borderRadius: '6px' }}>
        <p style={{ color: '#e6edf3', margin: '0 0 5px 0', fontFamily: 'Sora', fontSize: '13px' }}>{label}</p>
        <p style={{ color: isForecast ? CHART_THEME.forecast : CHART_THEME.actual, margin: 0, fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: 600 }}>
          {isForecast ? 'Projected' : 'Actual'}: {val?.toFixed(2)}
        </p>
        {isForecast && min !== max && (
          <p style={{ color: '#8b949e', margin: '4px 0 0 0', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
            Range: {min?.toFixed(2)} - {max?.toFixed(2)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const TrajectoryForecast = ({ students }) => {
  const [models, setModels] = useState(null);
  const [isCalculating, setIsCalculating] = useState(true);

  const [y1Str, setY1Str] = useState('');
  const [y2Str, setY2Str] = useState('');
  const [y3Str, setY3Str] = useState('');

  useEffect(() => {
    setIsCalculating(true);
    if (!students || students.length === 0) {
      setModels(null);
      setIsCalculating(false);
      return;
    }
    trainTrajectoryModelsAsync(students).then(res => {
      setModels(res);
      setIsCalculating(false);
    }).catch(err => {
      console.error(err);
      setIsCalculating(false);
    });
  }, [students]);

  // Derive inputs
  const y1 = parseFloat(y1Str);
  const y2 = y2Str !== '' ? parseFloat(y2Str) : null;
  const y3 = y3Str !== '' ? parseFloat(y3Str) : null;

  const result = useMemo(() => {
    if (!models || isNaN(y1)) return null;
    return predictTrajectoryChained(models, y1, y2, y3);
  }, [models, y1, y2, y3]);

  const chartData = useMemo(() => {
    if (!result) return [];
    
    const d = [
      { name: 'L100', node: result.y1 },
      { name: 'L200', node: result.y2 },
      { name: 'L300', node: result.y3 },
      { name: 'L400', node: result.y4 }
    ];

    return d.map((item, index) => {
      const isP = item.node.isPredicted;
      const val = item.node.val;
      const rmse = item.node.rmse;
      
      // We want the lines to connect.
      // If THIS node is predicted but the previous node was ACTUAL, we add the previous node to the forecast line as well so they trace smoothly.
      // However, we can simply structure data so 'actual' stops at the last actual, and 'forecast' STARTS at the last actual.
      const isConnectingNode = isP && index > 0 && !d[index-1].node.isPredicted;
      
      let actual = !isP ? val : null;
      let forecast = isP ? val : null;
      
      if (isP && isConnectingNode) {
        // Current is predicted, previous was actual.
        // Wait, for this node itself it's purely forecast. The connection requires the PREVIOUS node to have 'forecast' populated.
      }

      const areaMin = isP ? Math.max(0, val - limitRmse(rmse)) : null;
      const areaMax = isP ? Math.min(4.0, val + limitRmse(rmse)) : null;

      return {
        name: item.name,
        actual,
        forecast,
        areaBounds: isP ? [areaMin, areaMax] : null,
        isPredicted: isP
      };
    });
  }, [result]);

  // Post-process to connect the lines seamlessly
  const finalChartData = useMemo(() => {
    if (chartData.length === 0) return [];
    const processed = [...chartData];
    // Find the transition point
    for (let i = 1; i < processed.length; i++) {
      if (processed[i].isPredicted && !processed[i-1].isPredicted) {
        // The previous node is actual. Make its forecast equal to its actual so the dashed line starts from it.
        processed[i-1].forecast = processed[i-1].actual;
        processed[i-1].areaBounds = [processed[i-1].actual, processed[i-1].actual];
      }
    }
    return processed;
  }, [chartData]);

  // Helper
  function limitRmse(rmse) {
    // confidence intervals around 95% is ~1.96*RMSE
    return rmse * 1.5;
  }

  if (isCalculating) {
    return (
      <div className="page active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-md)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
          Extrapolating timeline tensors...
        </div>
      </div>
    );
  }

  if (!students.length || !models) {
    return (
      <div className="page active">
        <div className="page-head">
          <div><h1>Trajectory Forecasting</h1><p>Year-by-Year Multi-Stage Regression</p></div>
        </div>
        <div className="panel">
          <div className="model-status no-data" style={{ padding: '12px', background: 'var(--bg-overlay)', borderRadius: '6px', color: 'var(--amber)', fontSize: '.8rem' }}>
            ⚠ Insufficient Data.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page active" style={{ animation: 'appear .2s ease' }}>
      <div className="page-head" style={{ marginBottom: '16px' }}>
        <div><h1>Trajectory Forecasting</h1><p>Iterative progression forecasting using chained regression models.</p></div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'minmax(300px, 1fr) 2fr' }}>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Known Performance Input</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div className="input-group">
              <label>L100 CGPA (Required)</label>
              <input type="number" step="0.01" min="0" max="4" value={y1Str} onChange={e => setY1Str(e.target.value)} placeholder="e.g. 2.8" />
            </div>
            <div className="input-group">
              <label>L200 CGPA (Optional)</label>
              <input type="number" step="0.01" min="0" max="4" value={y2Str} onChange={e => setY2Str(e.target.value)} placeholder="e.g. 3.1" disabled={!y1Str} />
            </div>
            <div className="input-group">
              <label>L300 CGPA (Optional)</label>
              <input type="number" step="0.01" min="0" max="4" value={y3Str} onChange={e => setY3Str(e.target.value)} placeholder="e.g. 3.3" disabled={!y2Str || !y1Str} />
            </div>
          </div>
          
          {result && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-overlay)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-lg)', fontFamily: 'Sora' }}>Expected Outcomes</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-md)' }}>
                  <span>L200:</span> <span style={{ fontWeight: 600, color: result.y2.isPredicted ? CHART_THEME.forecast : CHART_THEME.actual }}>{result.y2.val.toFixed(2)} {result.y2.isPredicted ? '(Proj)' : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-md)' }}>
                  <span>L300:</span> <span style={{ fontWeight: 600, color: result.y3.isPredicted ? CHART_THEME.forecast : CHART_THEME.actual }}>{result.y3.val.toFixed(2)} {result.y3.isPredicted ? '(Proj)' : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-md)' }}>
                  <span>Final L400:</span> <span style={{ fontWeight: 600, color: result.y4.isPredicted ? CHART_THEME.forecast : CHART_THEME.actual }}>{result.y4.val.toFixed(2)} {result.y4.isPredicted ? '(Proj)' : ''}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="panel" style={{ minHeight: '350px' }}>
          <div className="panel-head" style={{ marginBottom: '20px' }}>
            <span className="panel-title">Projected Academic Curve</span>
          </div>
          {result ? (
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer>
                <ComposedChart data={finalChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={CHART_THEME.text} tick={{ fill: CHART_THEME.text, fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 4]} stroke={CHART_THEME.text} tick={{ fill: CHART_THEME.text, fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                  
                  {/* Confidence Interval Band */}
                  <Area type="monotone" dataKey="areaBounds" stroke="none" fill={CHART_THEME.bandOpts} isAnimationActive={true} />
                  
                  {/* Lines */}
                  <Line type="monotone" dataKey="actual" stroke={CHART_THEME.actual} strokeWidth={3} dot={{ r: 5, fill: CHART_THEME.actual, strokeWidth: 0 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="forecast" stroke={CHART_THEME.forecast} strokeWidth={3} strokeDasharray="6 6" dot={{ r: 5, fill: CHART_THEME.forecast, strokeWidth: 0 }} isAnimationActive={true} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ display: 'flex', height: '280px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Enter L100 performance to general predictive model...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrajectoryForecast;
