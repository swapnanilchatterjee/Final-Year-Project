export function detectAnomalies({ nodes, edges, features, k = 1 }) {
  const anomalies = [];

  // --- Step 0: Collect degree distributions ---
  const inDegrees = Object.values(features).map(f => f.inDegree);
  const outDegrees = Object.values(features).map(f => f.outDegree);

  const avgIn = inDegrees.reduce((a, b) => a + b, 0) / inDegrees.length;
  const stdIn = Math.sqrt(inDegrees.reduce((a, b) => a + Math.pow(b - avgIn, 2), 0) / inDegrees.length);

  const avgOut = outDegrees.reduce((a, b) => a + b, 0) / outDegrees.length;
  const stdOut = Math.sqrt(outDegrees.reduce((a, b) => a + Math.pow(b - avgOut, 2), 0) / outDegrees.length);

  // --- Step 1: Compute anomaly scores per node ---
  const scores = [];
  for (const [nodeId, f] of Object.entries(features)) {
    let metrics = [];
    let reasons = [];

    // In-degree anomaly
    if (f.inDegree > avgIn + k * stdIn) {
      metrics.push((f.inDegree - avgIn) / (stdIn || 1));
      reasons.push('Unusual in-degree');
    }

    // Out-degree anomaly
    if (f.outDegree > avgOut + k * stdOut) {
      metrics.push((f.outDegree - avgOut) / (stdOut || 1));
      reasons.push('Unusual out-degree');
    }

    // Check service-related anomalies (e.g., many errors)
    if (f.type === 'SERVICE') {
      const serviceEdges = edges.filter(e => e.source === nodeId || e.target === nodeId);
      const errorEdges = serviceEdges.filter(e => String(e.type).includes('5xx'));
      if (errorEdges.length > 0) {
        metrics.push(errorEdges.length); 
        reasons.push('Service errors detected');
      }
    }

    // Combine metrics → anomaly score
    const score = metrics.reduce((a, b) => a + b, 0);
    features[nodeId].anomalyScore = score;
    features[nodeId].reasons = reasons;
    scores.push(score);
  }

  // --- Step 2: Compute universal threshold ---
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const threshold = mean + k * stdDev;

  // --- Step 3: Collect anomalies ---
  for (const [nodeId, f] of Object.entries(features)) {
    if (f.anomalyScore > threshold) {
      anomalies.push({
        nodeId,
        score: f.anomalyScore,
        reasons: f.reasons,
        type: f.type
      });
    }
  }

  return anomalies.sort((a, b) => b.score - a.score);
}
