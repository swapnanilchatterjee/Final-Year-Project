export function detectAnomalies({ nodes, edges, features }) {
  const anomalies = [];
  const avgIn = Object.values(features).reduce((s, f) => s + f.inDegree, 0) / nodes.length;
  const avgOut = Object.values(features).reduce((s, f) => s + f.outDegree, 0) / nodes.length;

  for (const [nodeId, f] of Object.entries(features)) {
    let score = 0; const reasons = [];
    if (f.inDegree > avgIn * 3) { score += 0.3; reasons.push('High in-degree'); }
    if (f.outDegree > avgOut * 3) { score += 0.3; reasons.push('High out-degree'); }
    if (f.type === 'ALERT') { score += 0.5; reasons.push('Alert node'); }

    if (f.type === 'SERVICE') {
      const serviceEdges = edges.filter(e => e.source === nodeId || e.target === nodeId);
      const errorEdges = serviceEdges.filter(e => String(e.type).includes('500'));
      if (errorEdges.length > 0) { score += 0.4; reasons.push('Service errors detected'); }
    }

    features[nodeId].anomalyScore = score;
    if (score > 0.3) anomalies.push({ nodeId, score, reasons: reasons.join(', '), type: f.type });
  }
  return anomalies.sort((a, b) => b.score - a.score);
}