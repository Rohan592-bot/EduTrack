// Matrix operations
export function matMul(A, B) {
  const rows = A.length, cols = B[0].length, inner = B.length;
  return Array.from({length: rows}, (_, i) =>
    Array.from({length: cols}, (_, j) =>
      A[i].reduce((s, _, k) => s + A[i][k] * B[k][j], 0)));
}

export function matTranspose(A) {
  return A[0].map((_, j) => A.map(row => row[j]));
}

// Gauss-Jordan inverse for small square matrices
export function matInverse(M) {
  const n = M.length;
  const aug = M.map((row, i) => {
    const e = Array(n).fill(0); e[i] = 1;
    return [...row, ...e];
  });
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(aug[r][col]) > Math.abs(aug[maxRow][col])) maxRow = r;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-10) return null; // singular
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = aug[r][col];
      for (let j = 0; j < 2 * n; j++) aug[r][j] -= f * aug[col][j];
    }
  }
  return aug.map(row => row.slice(n));
}

// Model training
export function trainModel(students) {
  const valid = students.filter(s =>
    s.CGPA100 > 0 && s.CGPA200 > 0 && s.CGPA300 > 0 && s.cgpa > 0
  );

  if (valid.length < 5) { return null; }

  const X = valid.map(s => [1, s.CGPA100, s.CGPA200, s.CGPA300]);
  const y = valid.map(s => [s.cgpa]);

  const Xt   = matTranspose(X);
  const XtX  = matMul(Xt, X);
  const XtXi = matInverse(XtX);
  if (!XtXi) { return null; }

  const Xty   = matMul(Xt, y);
  const beta  = matMul(XtXi, Xty);
  const coeffs = beta.map(r => r[0]);

  const meanY = valid.reduce((s, x) => s + x.cgpa, 0) / valid.length;
  let ssTot = 0, ssRes = 0, sumAE = 0;

  valid.forEach(s => {
    const pred = coeffs[0] + coeffs[1]*s.CGPA100 + coeffs[2]*s.CGPA200 + coeffs[3]*s.CGPA300;
    const res  = s.cgpa - pred;
    ssTot += (s.cgpa - meanY) ** 2;
    ssRes += res ** 2;
    sumAE += Math.abs(res);
  });

  const r2   = 1 - ssRes / ssTot;
  const rmse = Math.sqrt(ssRes / valid.length);
  const mae  = sumAE / valid.length;

  return { coeffs, r2, rmse, mae, n: valid.length, meanY, valid };
}

export function predictCGPA(model, y1, y2, y3) {
  if (!model) return null;
  const { coeffs } = model;
  const raw = y3 !== null
    ? coeffs[0] + coeffs[1]*y1 + coeffs[2]*y2 + coeffs[3]*y3
    : coeffs[0] + coeffs[1]*y1 + coeffs[2]*y2 + coeffs[3]*((y1+y2)/2);
  return Math.min(4.0, Math.max(0, raw));
}

export function calcConfidence(model, predicted) {
  if (!model) return 0;
  const baseConf = model.r2 * 100;
  const dist = Math.abs(predicted - model.meanY);
  const penalty = Math.min(15, dist * 8);
  return Math.max(40, Math.round(baseConf - penalty));
}

export function findSimilar(model, y1, y2, y3, top = 5) {
  if (!model) return [];
  return model.valid
    .map(s => {
      const d = Math.sqrt(
        (s.CGPA100 - y1) ** 2 +
        (s.CGPA200 - y2) ** 2 +
        (y3 !== null ? (s.CGPA300 - y3) ** 2 : 0)
      );
      return { s, dist: d };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, top);
}

// ── Trajectory Forecasting ─────────────────────────
// Trains 3 separate regression models for a sequential timeline projection
export function trainTrajectoryModels(students) {
  // M1: Predicts Y2 from Y1
  // M2: Predicts Y3 from Y1+Y2
  // M3: Predicts Y4 from Y1+Y2+Y3
  
  const buildModel = (validSet, getX, getY) => {
    if (validSet.length < 5) return null;
    const X = validSet.map(s => [1, ...getX(s)]);
    const y = validSet.map(s => [getY(s)]);
    
    const Xt = matTranspose(X);
    const XtX = matMul(Xt, X);
    const XtXi = matInverse(XtX);
    if (!XtXi) return null;
    
    const Xty = matMul(Xt, y);
    const beta = matMul(XtXi, Xty);
    const coeffs = beta.map(r => r[0]);

    let ssRes = 0;
    validSet.forEach(s => {
      let pred = coeffs[0];
      const xVals = getX(s);
      for(let i=0; i<xVals.length; i++) pred += coeffs[i+1]*xVals[i];
      ssRes += Math.pow(getY(s) - pred, 2);
    });
    
    const rmse = Math.sqrt(ssRes / validSet.length);
    return { coeffs, rmse };
  }

  const valid2 = students.filter(s => s.CGPA100 > 0 && s.CGPA200 > 0);
  const m1 = buildModel(valid2, s => [s.CGPA100], s => s.CGPA200);

  const valid3 = valid2.filter(s => s.CGPA300 > 0);
  const m2 = buildModel(valid3, s => [s.CGPA100, s.CGPA200], s => s.CGPA300);

  const valid4 = valid3.filter(s => s.CGPA400 > 0);
  const m3 = buildModel(valid4, s => [s.CGPA100, s.CGPA200, s.CGPA300], s => s.CGPA400);

  return { m1, m2, m3, validPoints: valid4.length };
}

// Recursively predicts given known values
export function predictTrajectoryChained(models, y1, y2 = null, y3 = null) {
  if (!models || !models.m1 || !models.m2 || !models.m3 || isNaN(y1)) return null;

  const result = {
    y1: { val: y1, isPredicted: false, rmse: 0 },
    y2: { val: y2, isPredicted: false, rmse: 0 },
    y3: { val: y3, isPredicted: false, rmse: 0 },
    y4: { val: null, isPredicted: true, rmse: 0 }
  };

  const c1 = models.m1.coeffs;
  const c2 = models.m2.coeffs;
  const c3 = models.m3.coeffs;

  if (y2 === null || isNaN(y2)) {
    result.y2.val = Math.min(4.0, Math.max(0, c1[0] + c1[1]*result.y1.val));
    result.y2.isPredicted = true;
    result.y2.rmse = models.m1.rmse;
  }
  
  if (y3 === null || isNaN(y3)) {
    result.y3.val = Math.min(4.0, Math.max(0, c2[0] + c2[1]*result.y1.val + c2[2]*result.y2.val));
    result.y3.isPredicted = true;
    // Compounded error heuristic
    result.y3.rmse = models.m2.rmse + (result.y2.isPredicted ? result.y2.rmse * 0.5 : 0);
  }

  result.y4.val = Math.min(4.0, Math.max(0, c3[0] + c3[1]*result.y1.val + c3[2]*result.y2.val + c3[3]*result.y3.val));
  result.y4.rmse = models.m3.rmse + (result.y3.isPredicted ? result.y3.rmse * 0.5 : 0);

  return result;
}

// ── Logistic Regression (Early Warning) ────────────────────
export function trainLogisticModel(students) {
  const valid = students.filter(s => s.CGPA100 > 0 && s.cgpa > 0);
  if (valid.length < 5) return null;

  // y = 1 if At Risk (cgpa < 2.0), else 0
  const X = valid.map(s => s.CGPA100);
  const y = valid.map(s => s.cgpa < 2.0 ? 1 : 0);

  // If no "At Risk" students exist, the model can't really learn separation.
  // Gradient descent will just push probabilities to 0. That's fine technically but b0 will go very negative.
  
  let b0 = 0.0;
  let b1 = 0.0;
  const alpha = 0.5; // learning rate
  const epochs = 5000;
  const m = valid.length;

  for (let i = 0; i < epochs; i++) {
    let sumGradB0 = 0;
    let sumGradB1 = 0;
    
    for (let j = 0; j < m; j++) {
      const z = b0 + b1 * X[j];
      const p = 1 / (1 + Math.exp(-z));
      const error = p - y[j];
      sumGradB0 += error;
      sumGradB1 += error * X[j];
    }
    
    b0 -= alpha * (sumGradB0 / m);
    b1 -= alpha * (sumGradB1 / m);
  }

  // Calculate Accuracy
  let correct = 0;
  let riskIdentified = 0;
  let totalRisk = 0;

  valid.forEach(s => {
    const isRisk = s.cgpa < 2.0 ? 1 : 0;
    if (isRisk) totalRisk++;
    const z = b0 + b1 * s.CGPA100;
    const p = 1 / (1 + Math.exp(-z));
    const predictedRisk = p >= 0.5 ? 1 : 0;
    if (predictedRisk === isRisk) correct++;
    if (isRisk === 1 && predictedRisk === 1) riskIdentified++;
  });
  
  const accuracy = correct / m;

  return { b0, b1, accuracy, n: m, totalRisk, riskIdentified };
}

export function predictRiskProbability(logisticModel, y1) {
  if (!logisticModel) return 0;
  const { b0, b1 } = logisticModel;
  const z = b0 + b1 * y1;
  const p = 1 / (1 + Math.exp(-z));
  return p;
}

// ── Anomaly Detection (Z-Score) ────────────────────────
export function calculateAnomalies(students) {
  if (students.length < 5) return { anomalies: [], globalStats: null };

  const valid = students.filter(s => s.CGPA100 > 0 && s.CGPA200 > 0);

  // Extract all valid deltas
  const d1 = []; // L100 -> L200
  const d2 = []; // L200 -> L300
  const d3 = []; // L300 -> L400

  valid.forEach(s => {
    d1.push({ id: s.id, val: s.CGPA200 - s.CGPA100 });
    if (s.CGPA300 > 0) d2.push({ id: s.id, val: s.CGPA300 - s.CGPA200 });
    if (s.CGPA400 > 0) d3.push({ id: s.id, val: s.CGPA400 - s.CGPA300 });
  });

  const getStats = (arr) => {
    if (arr.length === 0) return { mean: 0, std: 1 };
    const mean = arr.reduce((sum, item) => sum + item.val, 0) / arr.length;
    const variance = arr.reduce((sum, item) => sum + Math.pow(item.val - mean, 2), 0) / arr.length;
    return { mean, std: Math.sqrt(variance) || 1 }; // prevent div 0
  };

  const stats1 = getStats(d1);
  const stats2 = getStats(d2);
  const stats3 = getStats(d3);

  const anomalies = [];

  const checkDelta = (student, deltaVal, stats, label) => {
    const z = (deltaVal - stats.mean) / stats.std;
    const absZ = Math.abs(z);
    
    if (absZ > 2.0) {
      let severity = 'Mild';
      if (absZ >= 3.0) severity = 'Severe';
      else if (absZ >= 2.5) severity = 'Moderate';

      let type = z > 0 ? 'Sudden Spike' : 'Sudden Drop';

      anomalies.push({
        student,
        delta: deltaVal,
        zScore: z,
        absZ,
        period: label,
        severity,
        type
      });
    }
  };

  valid.forEach(s => {
    checkDelta(s, s.CGPA200 - s.CGPA100, stats1, 'L100 → L200');
    if (s.CGPA300 > 0) checkDelta(s, s.CGPA300 - s.CGPA200, stats2, 'L200 → L300');
    if (s.CGPA400 > 0) checkDelta(s, s.CGPA400 - s.CGPA300, stats3, 'L300 → L400');
  });

  // Group by student if multiple
  const grouped = {};
  anomalies.forEach(a => {
    if (!grouped[a.student.id]) {
      grouped[a.student.id] = {
        student: a.student,
        highestAbsZ: a.absZ,
        severity: a.severity,
        flags: [a],
        type: a.type
      };
    } else {
      grouped[a.student.id].flags.push(a);
      grouped[a.student.id].type = 'Inconsistent Pattern';
      if (a.absZ > grouped[a.student.id].highestAbsZ) {
        grouped[a.student.id].highestAbsZ = a.absZ;
        grouped[a.student.id].severity = a.severity;
      }
    }
  });

  return {
    anomalies: Object.values(grouped).sort((a, b) => b.highestAbsZ - a.highestAbsZ), // sorted by extreme
    globalStats: { d1: stats1, d2: stats2, d3: stats3 }
  };
}

// ── K-Means Clustering (Archetypes) ─────────────────────
export function runKMeansClustering(students) {
  // Only cluster students with 5D vector
  const valid = students.filter(s => s.CGPA100 > 0 && s.CGPA200 > 0 && s.CGPA300 > 0 && s.CGPA400 > 0 && s.SGPA > 0);
  if (valid.length < 4) return null; // We need at least k=4 items

  const k = 4;
  const vectors = valid.map(s => ({
    student: s,
    v: [s.CGPA100, s.CGPA200, s.CGPA300, s.CGPA400, s.SGPA]
  }));

  // 1. Initialize pseudo-random centroids (spread across the DB so it is deterministic instead of visually vibrating every re-render)
  let centroids = [];
  const step = Math.floor(vectors.length / k);
  for (let i = 0; i < k; i++) {
    centroids.push([...vectors[i * step].v]); 
  }

  const getDistance = (v1, v2) => {
    return Math.sqrt(v1.reduce((sum, val, idx) => sum + Math.pow(val - v2[idx], 2), 0));
  };

  let assignments = new Array(vectors.length).fill(0);
  const iterations = 100;

  for (let iter = 0; iter < iterations; iter++) {
    // Assign to closest centroid via Euclidean Distance calculations
    let changed = false;
    vectors.forEach((item, i) => {
      let minDist = Infinity;
      let clusterIdx = 0;
      centroids.forEach((c, cIdx) => {
        const d = getDistance(item.v, c);
        if (d < minDist) {
          minDist = d;
          clusterIdx = cIdx;
        }
      });
      if (assignments[i] !== clusterIdx) {
        assignments[i] = clusterIdx;
        changed = true;
      }
    });

    if (!changed) break; // converged prior to 100 max passes

    // Recalculate centroids mapped against the multidimensional 5 layer vectors
    const newCentroids = Array(k).fill(0).map(() => [0,0,0,0,0]);
    const counts = Array(k).fill(0);
    
    vectors.forEach((item, i) => {
      const c = assignments[i];
      counts[c]++;
      for (let dim=0; dim<5; dim++){
        newCentroids[c][dim] += item.v[dim];
      }
    });

    for (let c=0; c<k; c++) {
      if (counts[c] > 0) {
        for (let dim=0; dim<5; dim++) {
          centroids[c][dim] = newCentroids[c][dim] / counts[c];
        }
      }
    }
  }

  // Label the centroids intelligently
  const clustersMeta = centroids.map((c, i) => {
    const mems = vectors.filter((_, idx) => assignments[idx] === i);
    const m100 = c[0];
    const m400 = c[3];
    const delta = m400 - m100; 
    const meanAll = c.reduce((sum, val) => sum+val, 0)/5;
    return {
      index: i,
      centroid: c,
      members: mems.map(m => m.student),
      delta,
      meanAll
    };
  });

  // Assign Archetypes:
  // Highest positive delta -> Late Bloomer
  // Lowest delta (negative) -> Early Decliner
  // Highest remaining meanAll -> Consistent High Achiever
  // Lowest remaining meanAll -> Steady Average

  clustersMeta.sort((a,b) => b.delta - a.delta);
  const lateBloomer = clustersMeta[0];
  const decliner = clustersMeta[clustersMeta.length - 1];

  const remain = clustersMeta.filter(c => c.index !== lateBloomer.index && c.index !== decliner.index);
  remain.sort((a,b) => b.meanAll - a.meanAll);
  const highAchiever = remain[0];
  const steadyAvg = remain[remain.length > 1 ? 1 : 0]; // safely bound

  // Return exactly structured cluster payloads matched to distinct UX Token colors
  return [
    { label: 'Consistent High Achiever', id: 'achiever', meta: highAchiever, color: '#3fb950' }, // Green
    { label: 'Late Bloomer', id: 'bloomer', meta: lateBloomer, color: '#58a6ff' }, // Blue
    { label: 'Early Decliner', id: 'decliner', meta: decliner, color: '#f85149' }, // Red
    { label: 'Steady Average', id: 'average', meta: steadyAvg, color: '#e6a817' }, // Amber
  ];
}
