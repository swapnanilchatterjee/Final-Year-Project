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
      const inScore = (f.inDegree - avgIn) / (stdIn || 1);
      metrics.push(inScore);
      reasons.push('Unusual in-degree');
    }

    // Out-degree anomaly
    if (f.outDegree > avgOut + k * stdOut) {
      const outScore = (f.outDegree - avgOut) / (stdOut || 1);
      metrics.push(outScore);
      reasons.push('Unusual out-degree');
    }

    // Service error anomalies
    if (f.type === 'SERVICE') {
      const serviceEdges = edges.filter(e => e.source === nodeId || e.target === nodeId);
      const errorEdges = serviceEdges.filter(e => String(e.type).includes('500') || String(e.type).includes('5xx'));
      if (errorEdges.length > 0) {
        metrics.push(errorEdges.length * 0.5); // weight error edges
        reasons.push('Service errors detected');
      }
    }

    // Alert node anomalies
    if (f.type === 'ALERT') {
      metrics.push(1.0); // alerts carry high anomaly weight
      reasons.push('Alert node triggered');
    }

    // Attack node anomalies
    if (f.type === 'ATTACK') {
      metrics.push(2.0); // attack events are very suspicious
      reasons.push('Attack activity detected');
    }

    if (f.type === 'ATTACKER') {
      metrics.push(1.5); // suspicious attacker node
      reasons.push('Suspicious attacker profile');
    }

    // Resource anomalies if applicable
    if (f.type === 'RESOURCE') {
      const resourceEdges = edges.filter(e => e.source === nodeId || e.target === nodeId);
      if (resourceEdges.length > avgOut + k * stdOut) {
        metrics.push(0.5);
        reasons.push('Excessive resource interactions');
      }
    }

    // Final anomaly score aggregation
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
