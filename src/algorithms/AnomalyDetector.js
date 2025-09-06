export function detectAnomalies({ nodes, edges, features, k = 1 }) {
  const anomalies = [];

  // Collect degree distributions
  const inDegrees = Object.values(features).map(f => f.inDegree);
  const outDegrees = Object.values(features).map(f => f.outDegree);

  const avgIn = inDegrees.reduce((a, b) => a + b, 0) / inDegrees.length;
  const avgOut = outDegrees.reduce((a, b) => a + b, 0) / outDegrees.length;

  const stdIn = Math.sqrt(inDegrees.reduce((a, b) => a + (b - avgIn) ** 2, 0) / inDegrees.length);
  const stdOut = Math.sqrt(outDegrees.reduce((a, b) => a + (b - avgOut) ** 2, 0) / outDegrees.length);

  const scores = [];

  // Step 1: Compute anomaly scores using z-scores + categorical boosts
  for (const [nodeId, f] of Object.entries(features)) {
    let score = 0;
    const reasons = [];

    // Z-score for in-degree
    if (stdIn > 0 && f.inDegree > avgIn) {
      const zIn = (f.inDegree - avgIn) / stdIn;
      score += zIn;
      reasons.push(`High in-degree (z=${zIn.toFixed(2)})`);
    }

    // Z-score for out-degree
    if (stdOut > 0 && f.outDegree > avgOut) {
      const zOut = (f.outDegree - avgOut) / stdOut;
      score += zOut;
      reasons.push(`High out-degree (z=${zOut.toFixed(2)})`);
    }

    // Boosts for categorical conditions
    if (f.type === 'ALERT') {
      score += 2; // strong signal
      reasons.push('Alert node');
    }

    if (f.type === 'SERVICE') {
      const serviceEdges = edges.filter(e => e.source === nodeId || e.target === nodeId);
      const errorEdges = serviceEdges.filter(e => String(e.type).includes('500'));
      if (errorEdges.length > 0) {
        score += 1.5; // moderate boost
        reasons.push('Service errors detected');
      }
    }

    features[nodeId].anomalyScore = score;
    features[nodeId].reasons = reasons;
    scores.push(score);
  }

  // Step 2: Calculate universal threshold T = μ + kσ
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const threshold = mean + k * stdDev;

  // Step 3: Collect anomalies above threshold
  for (const [nodeId, f] of Object.entries(features)) {
    if (f.anomalyScore > threshold) {
      anomalies.push({
        nodeId,
        score: Number(f.anomalyScore.toFixed(2)),
        reasons: f.reasons.join(', '),
        type: f.type
      });
    }
  }

  return anomalies.sort((a, b) => b.score - a.score);
}
