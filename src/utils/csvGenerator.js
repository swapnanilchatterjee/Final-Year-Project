export function generateCSVReport(results) {
  const rows = [];
  rows.push('Category,Entity,Metric,Value,Severity,Details');
  rows.push(`Overview,System,Total Nodes,${results.overview.totalNodes},INFO,System-wide node count`);
  rows.push(`Overview,System,Total Edges,${results.overview.totalEdges},INFO,System-wide edge count`);
  rows.push(`Overview,System,Average Path Length,${results.overview.avgPathLength.toFixed(2)},INFO,Mean shortest path length`);
  for (const [type, count] of Object.entries(results.overview.nodeTypes)) {
    rows.push(`Overview,System,${type} Count,${count},INFO,Count of ${type} nodes`);
  }
  for (const a of results.anomalies) {
    const sev = a.score > 0.7 ? 'CRITICAL' : a.score > 0.4 ? 'HIGH' : 'MEDIUM';
    rows.push(`Anomaly,${a.nodeId},Anomaly Score,${a.score.toFixed(3)},${sev},"${a.reasons}"`);
  }
  for (const [userId, b] of Object.entries(results.userBehavior)) {
    const status = b.sessionComplete ? 'COMPLETE' : 'INCOMPLETE';
    rows.push(`User Behavior,${userId},Total Actions,${b.totalActions},INFO,User activity count`);
    rows.push(`User Behavior,${userId},Session Status,${status},${b.sessionComplete ? 'INFO' : 'WARN'},Session completion status`);
    rows.push(`User Behavior,${userId},Cart Actions,${b.cartActions},INFO,Shopping cart interactions`);
  }
  for (const [service, a] of Object.entries(results.serviceAnalysis)) {
    const rStatus = a.reliability >= 0.9 ? 'GOOD' : a.reliability >= 0.7 ? 'WARN' : 'CRITICAL';
    rows.push(`Service,${service},Reliability,${(a.reliability * 100).toFixed(1)}%,${rStatus},Service success rate`);
    rows.push(`Service,${service},Error Responses,${a.errorResponses},${a.errorResponses > 0 ? 'WARN' : 'INFO'},Failed service calls`);
    rows.push(`Service,${service},Retry Attempts,${a.retryAttempts},${a.retryAttempts > 0 ? 'WARN' : 'INFO'},Retry count`);
  }
  for (const [server, h] of Object.entries(results.systemHealth.serverAlerts)) {
    rows.push(`System Health,${server},Status,${h.status},${h.status === 'CRITICAL' ? 'CRITICAL' : 'INFO'},Server health status`);
    rows.push(`System Health,${server},Alert Count,${h.alertCount},${h.alertCount > 0 ? 'CRITICAL' : 'INFO'},Number of active alerts`);
    if (h.alertTypes.length > 0) rows.push(`System Health,${server},Alert Types,"${h.alertTypes.join(', ')}",CRITICAL,Types of alerts triggered`);
  }
  const top = Object.entries(results.nodeFeatures)
    .sort(([,a],[,b]) => b.betweennessCentrality - a.betweennessCentrality)
    .slice(0, 10);
  for (const [id, f] of top) {
    if (f.betweennessCentrality > 0) rows.push(`Network Analysis,${id},Betweenness Centrality,${f.betweennessCentrality.toFixed(4)},INFO,Node importance in paths`);
  }
  return rows.join('\n');
}
