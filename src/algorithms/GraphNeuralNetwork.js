import { dijkstra } from './ShortestPath.js';

export default class GraphNeuralNetwork {
  constructor(nodes = [], edges = []) {
    this.nodes = nodes || [];
    this.edges = edges || [];
    this.adjacencyMatrix = this.buildAdjacencyMatrix();
    this.nodeFeatures = this.initializeNodeFeatures();
  }

  buildAdjacencyMatrix() {
    const ids = this.nodes.map(n => n.id);
    const m = {};
    for (const a of ids) {
      m[a] = {};
      for (const b of ids) m[a][b] = 0;
    }
    for (const e of this.edges) {
      if (m[e.source] && m[e.target]) {
        m[e.source][e.target] = e.weight || 1;
      }
    }
    return m;
  }

  initializeNodeFeatures() {
    const f = {};

    // initialize all nodes
    for (const n of this.nodes) {
      const id = n.id;
      f[id] = {
        id,
        type: this.classifyNodeType(id),
        inDegree: 0,
        outDegree: 0,
        pageRank: 0,
        betweennessCentrality: 0,
        clusteringCoefficient: 0,
        shortestPathMetrics: {},
        anomalyScore: 0
      };
    }

    // add missing nodes that may appear in edges
    for (const e of this.edges) {
      if (!f[e.source]) {
        f[e.source] = {
          id: e.source,
          type: this.classifyNodeType(e.source),
          inDegree: 0,
          outDegree: 0,
          pageRank: 0,
          betweennessCentrality: 0,
          clusteringCoefficient: 0,
          shortestPathMetrics: {},
          anomalyScore: 0
        };
      }
      if (!f[e.target]) {
        f[e.target] = {
          id: e.target,
          type: this.classifyNodeType(e.target),
          inDegree: 0,
          outDegree: 0,
          pageRank: 0,
          betweennessCentrality: 0,
          clusteringCoefficient: 0,
          shortestPathMetrics: {},
          anomalyScore: 0
        };
      }

      // increment degrees safely
      if (f[e.source]) f[e.source].outDegree++;
      if (f[e.target]) f[e.target].inDegree++;
    }

    return f;
  }

  classifyNodeType(id) {
    if (String(id).startsWith('User')) return 'USER';
    if (String(id).startsWith('Server')) return 'SERVER';
    if (String(id).startsWith('Service')) return 'SERVICE';
    if (String(id).startsWith('/')) return 'ENDPOINT';
    if ([ 'HighCPU', 'MemoryThreshold', 'DiskFull' ].includes(String(id))) return 'ALERT';
    return 'RESOURCE';
  }

  calculateOptimizedShortestPaths() {
    const res = {};
    for (const n of Object.keys(this.nodeFeatures)) {
      res[n] = dijkstra(this.nodes, this.adjacencyMatrix, n);
    }
    return res;
  }

  reconstructPath(previous, source, target) {
    const p = []; let cur = target;
    while (cur !== null && cur !== undefined) { 
      p.unshift(cur); 
      cur = previous[cur]; 
    }
    return p[0] === source ? p : [];
  }

  calculateBetweennessCentrality() {
    const centrality = Object.fromEntries(Object.keys(this.nodeFeatures).map(id => [id, 0]));
    const sp = this.calculateOptimizedShortestPaths();

    for (const s of Object.keys(this.nodeFeatures)) {
      for (const t of Object.keys(this.nodeFeatures)) {
        if (s === t) continue;
        const path = this.reconstructPath(sp[s].previous, s, t);
        for (let i = 1; i < path.length - 1; i++) {
          if (centrality[path[i]] !== undefined) centrality[path[i]] += 1;
        }
      }
    }

    const n = Object.keys(this.nodeFeatures).length;
    const normalizer = (n - 1) * (n - 2) / 2;
    for (const [id, val] of Object.entries(centrality)) {
      const score = normalizer ? val / normalizer : 0;
      this.nodeFeatures[id].betweennessCentrality = score;
    }
    return centrality;
  }

  detectAnomalies() {
    const features = this.nodeFeatures;
    const anomalies = [];
    const avgIn = Object.values(features).reduce((s, f) => s + f.inDegree, 0) / Object.keys(features).length;
    const avgOut = Object.values(features).reduce((s, f) => s + f.outDegree, 0) / Object.keys(features).length;

    for (const [nodeId, f] of Object.entries(features)) {
      let score = 0; const reasons = [];
      if (f.inDegree > avgIn * 3) { score += 0.3; reasons.push('High in-degree'); }
      if (f.outDegree > avgOut * 3) { score += 0.3; reasons.push('High out-degree'); }
      if (f.type === 'ALERT') { score += 0.5; reasons.push('Alert node'); }
      if (f.type === 'SERVICE') {
        const serviceEdges = this.edges.filter(e => e.source === nodeId || e.target === nodeId);
        const errorEdges = serviceEdges.filter(e => String(e.type).includes('500'));
        if (errorEdges.length > 0) { score += 0.4; reasons.push('Service errors detected'); }
      }
      features[nodeId].anomalyScore = score;
      if (score > 0.3) anomalies.push({ nodeId, score, reasons: reasons.join(', '), type: f.type });
    }
    return anomalies.sort((a, b) => b.score - a.score);
  }

  analyzeUserBehavior() {
    const u = {};
    const users = Object.keys(this.nodeFeatures).filter(id => String(id).startsWith('User'));
    for (const id of users) {
      const userEdges = this.edges.filter(e => e.source === id);
      u[id] = {
        totalActions: userEdges.length,
        loginCount: userEdges.filter(e => e.type === 'LOGIN').length,
        viewCount: userEdges.filter(e => e.type === 'VIEW').length,
        cartActions: userEdges.filter(e => e.type === 'ADD_TO_CART').length,
        logoutCount: userEdges.filter(e => e.type === 'LOGOUT').length,
        uniqueEndpoints: new Set(userEdges.map(e => e.target)).size,
        sessionComplete: false
      };
      u[id].sessionComplete = u[id].loginCount > 0 && u[id].logoutCount > 0;
    }
    return u;
  }

  analyzeServiceCommunication() {
    const services = Object.keys(this.nodeFeatures).filter(id => String(id).startsWith('Service'));
    const a = {};
    for (const s of services) {
      const outgoing = this.edges.filter(e => e.source === s);
      const incoming = this.edges.filter(e => e.target === s);
      a[s] = {
        outgoingCalls: outgoing.length,
        incomingCalls: incoming.length,
        successfulResponses: incoming.filter(e => String(e.type).includes('200')).length,
        errorResponses: incoming.filter(e => String(e.type).includes('500')).length,
        retryAttempts: outgoing.filter(e => String(e.type).includes('RETRY')).length,
        reliability: incoming.length > 0 ? incoming.filter(e => String(e.type).includes('200')).length / incoming.length : 1
      };
    }
    return a;
  }

  analyzeSystemHealth() {
    const servers = Object.keys(this.nodeFeatures).filter(id => String(id).startsWith('Server'));
    const alerts = Object.keys(this.nodeFeatures).filter(id => ['HighCPU', 'MemoryThreshold', 'DiskFull'].includes(id));
    const health = { totalServers: servers.length, totalAlerts: alerts.length, serverAlerts: {} };
    for (const server of servers) {
      const serverEdges = this.edges.filter(e => e.source === server);
      const alertEdges = serverEdges.filter(e => alerts.includes(e.target));
      health.serverAlerts[server] = {
        alertCount: alertEdges.length,
        alertTypes: alertEdges.map(e => e.target),
        status: alertEdges.length > 0 ? 'CRITICAL' : 'HEALTHY'
      };
    }
    return health;
  }

  getNodeTypeDistribution() {
    const d = {};
    for (const f of Object.values(this.nodeFeatures)) d[f.type] = (d[f.type] || 0) + 1;
    return d;
  }

  calculateAveragePathLength(sp) {
    let total = 0; let count = 0;
    for (const v of Object.values(sp)) {
      for (const dist of Object.values(v.distances)) {
        if (dist !== Infinity && dist > 0) { total += dist; count++; }
      }
    }
    return count > 0 ? total / count : 0;
  }

  analyze() {
    const shortestPaths = this.calculateOptimizedShortestPaths();
    this.calculateBetweennessCentrality();
    const anomalies = this.detectAnomalies();
    const userBehavior = this.analyzeUserBehavior();
    const serviceAnalysis = this.analyzeServiceCommunication();
    const systemHealth = this.analyzeSystemHealth();

    return {
      overview: {
        totalNodes: Object.keys(this.nodeFeatures).length,
        totalEdges: this.edges.length,
        nodeTypes: this.getNodeTypeDistribution(),
        avgPathLength: this.calculateAveragePathLength(shortestPaths)
      },
      anomalies,
      userBehavior,
      serviceAnalysis,
      systemHealth,
      shortestPaths,
      nodeFeatures: this.nodeFeatures,
      nodes: this.nodes,
      edges: this.edges
    };
  }
}
