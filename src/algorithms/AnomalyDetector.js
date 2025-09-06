export function detectAnomalies({ nodes, edges, features, k = 1 }) {
  const anomalies = [];
  const avgIn = Object.values(features).reduce((s, f) => s + f.inDegree, 0) / nodes.length;
  const avgOut = Object.values(features).reduce((s, f) => s + f.outDegree, 0) / nodes.length;

  // Step 1: Compute anomaly scores for each node
  const scores = [];
  for (const [nodeId, f] of Object.entries(features)) {
    let score = 0; 
    const reasons = [];

    if (f.inDegree > avgIn * 3) { score += 0.3; reasons.push('High in-degree'); }
    if (f.outDegree > avgOut * 3) { score += 0.3; reasons.push('High out-degree'); }
    if (f.type === 'ALERT') { score += 0.5; reasons.push('Alert node'); }

    if (f.type === 'SERVICE') {
      const serviceEdges = edges.filter(e => e.source === nodeId || e.target === nodeId);
      const errorEdges = serviceEdges.filter(e => String(e.type).includes('500'));
      if (errorEdges.length > 0) { score += 0.4; reasons.push('Service errors detected'); }
    }

    features[nodeId].anomalyScore = score;
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
        score: f.anomalyScore,
        reasons: f.reasons || '', 
        type: f.type
      });
    }
  }

  return anomalies.sort((a, b) => b.score - a.score);
}
