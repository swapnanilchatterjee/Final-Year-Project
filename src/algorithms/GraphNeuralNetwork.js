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
    const matrix = {};
    for (const a of ids) {
      matrix[a] = {};
      for (const b of ids) matrix[a][b] = 0;
    }
    for (const edge of this.edges) {
      if (matrix[edge.source] && matrix[edge.target]) {
        matrix[edge.source][edge.target] = edge.weight || 1;
      }
    }
    return matrix;
  }

  initializeNodeFeatures() {
    const features = {};
    for (const node of this.nodes) {
      const id = node.id;
      features[id] = {
        id,
        type: this.classifyNodeType(id),
        inDegree: 0,
        outDegree: 0,
        pageRank: 0,
        betweennessCentrality: 0,
        clusteringCoefficient: 0,
        shortestPathMetrics: {},
        anomalyScore: 0,
        reasons: []
      };
    }

    for (const edge of this.edges) {
      if (!features[edge.source]) {
        features[edge.source] = {
          id: edge.source,
          type: this.classifyNodeType(edge.source),
          inDegree: 0,
          outDegree: 0,
          pageRank: 0,
          betweennessCentrality: 0,
          clusteringCoefficient: 0,
          shortestPathMetrics: {},
          anomalyScore: 0,
          reasons: []
        };
      }
      if (!features[edge.target]) {
        features[edge.target] = {
          id: edge.target,
          type: this.classifyNodeType(edge.target),
          inDegree: 0,
          outDegree: 0,
          pageRank: 0,
          betweennessCentrality: 0,
          clusteringCoefficient: 0,
          shortestPathMetrics: {},
          anomalyScore: 0,
          reasons: []
        };
      }
      features[edge.source].outDegree++;
      features[edge.target].inDegree++;
    }
    return features;
  }

  classifyNodeType(id) {
    if (String(id).startsWith('User')) return 'USER';
    if (String(id).startsWith('Server')) return 'SERVER';
    if (String(id).startsWith('Service')) return 'SERVICE';
    if (String(id) === 'ConsoleLogin') return 'ATTACK';
    if (String(id) === 'attacker@example.com') return 'ATTACKER';
    if (String(id) === 'Account') return 'RESOURCE';
    if (String(id).startsWith('/')) return 'ENDPOINT';
    if (['HighCPU', 'MemoryThreshold', 'DiskFull'].includes(String(id))) return 'ALERT';
    return 'RESOURCE';
  }

  calculateOptimizedShortestPaths() {
    const paths = {};
    for (const node of Object.keys(this.nodeFeatures)) {
      paths[node] = dijkstra(this.nodes, this.adjacencyMatrix, node);
    }
    return paths;
  }

  reconstructPath(previous, source, target) {
    const path = [];
    let current = target;
    while (current !== null && current !== undefined) {
      path.unshift(current);
      current = previous[current];
    }
    return path[0] === source ? path : [];
  }

  calculateBetweennessCentrality() {
    const centrality = {};
    for (const id of Object.keys(this.nodeFeatures)) {
      centrality[id] = 0;
    }
    const sp = this.calculateOptimizedShortestPaths();

    for (const s of Object.keys(this.nodeFeatures)) {
      for (const t of Object.keys(this.nodeFeatures)) {
        if (s === t) continue;
        const path = this.reconstructPath(sp[s].previous, s, t);
        for (let i = 1; i < path.length - 1; i++) {
          if (centrality[path[i]] !== undefined) {
            centrality[path[i]] += 1;
          }
        }
      }
    }

    const n = Object.keys(this.nodeFeatures).length;
    const normalizer = (n - 1) * (n - 2) / 2;
    for (const [id, value] of Object.entries(centrality)) {
      this.nodeFeatures[id].betweennessCentrality = normalizer ? value / normalizer : 0;
    }
    return centrality;
  }

  detectAnomalies() {
    const features = this.nodeFeatures;
    const anomalies = [];
    const avgIn = Object.values(features).reduce((sum, f) => sum + f.inDegree, 0) / Object.keys(features).length;
    const stdIn = Math.sqrt(Object.values(features).reduce((sum, f) => sum + Math.pow(f.inDegree - avgIn, 2), 0) / Object.keys(features).length);

    const avgOut = Object.values(features).reduce((sum, f) => sum + f.outDegree, 0) / Object.keys(features).length;
    const stdOut = Math.sqrt(Object.values(features).reduce((sum, f) => sum + Math.pow(f.outDegree - avgOut, 2), 0) / Object.keys(features).length);

    for (const [nodeId, f] of Object.entries(features)) {
      let score = 0;
      const reasons = [];

      if (stdIn > 0 && f.inDegree > avgIn + stdIn) {
        const inScore = (f.inDegree - avgIn) / stdIn;
        score += inScore * 0.3;
        reasons.push('High in-degree');
      }
      if (stdOut > 0 && f.outDegree > avgOut + stdOut) {
        const outScore = (f.outDegree - avgOut) / stdOut;
        score += outScore * 0.3;
        reasons.push('High out-degree');
      }
      if (f.type === 'ALERT') {
        score += 0.5;
        reasons.push('Alert node');
      }
      if (f.type === 'SERVICE') {
        const serviceEdges = this.edges.filter(e => e.source === nodeId || e.target === nodeId);
        const errorEdges = serviceEdges.filter(e => String(e.type).includes('500'));
        if (errorEdges.length > 0) {
          score += 0.4;
          reasons.push('Service errors detected');
        }
      }
      if (f.type === 'ATTACK') {
        score += 0.8;
        reasons.push('Attack node detected');
      }
      if (f.type === 'ATTACKER') {
        score += 0.7;
        reasons.push('Suspicious attacker node');
      }

      f.anomalyScore = score;
      f.reasons = reasons;
    }

    const allScores = Object.values(features).map(f => f.anomalyScore);
    const meanScore = allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
    const stdDev = Math.sqrt(allScores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / allScores.length);
    const threshold = meanScore + stdDev;

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

  analyzeUserBehavior() {
    const users = {};
    const userIds = Object.keys(this.nodeFeatures).filter(id => String(id).startsWith('User'));
    for (const id of userIds) {
      const userEdges = this.edges.filter(e => e.source === id);
      users[id] = {
        totalActions: userEdges.length,
        loginCount: userEdges.filter(e => e.type === 'LOGIN').length,
        viewCount: userEdges.filter(e => e.type === 'VIEW').length,
        cartActions: userEdges.filter(e => e.type === 'ADD_TO_CART').length,
        logoutCount: userEdges.filter(e => e.type === 'LOGOUT').length,
        attackAttempts: userEdges.filter(e => e.type === 'ATTEMPT').length,
        uniqueEndpoints: [...new Set(userEdges.map(e => e.target))].length,
        sessionComplete: false
      };
      users[id].sessionComplete = users[id].loginCount > 0 && users[id].logoutCount > 0;
    }
    return users;
  }

  analyzeServiceCommunication() {
    const services = Object.keys(this.nodeFeatures).filter(id => String(id).startsWith('Service'));
    const analysis = {};
    for (const service of services) {
      const outgoing = this.edges.filter(e => e.source === service);
      const incoming = this.edges.filter(e => e.target === service);
      analysis[service] = {
        outgoingCalls: outgoing.length,
        incomingCalls: incoming.length,
        successfulResponses: incoming.filter(e => String(e.type).includes('200')).length,
        errorResponses: incoming.filter(e => String(e.type).includes('500')).length,
        retryAttempts: outgoing.filter(e => String(e.type).includes('RETRY')).length,
        reliability: incoming.length > 0 ? incoming.filter(e => String(e.type).includes('200')).length / incoming.length : 1
      };
    }
    return analysis;
  }

  analyzeSystemHealth() {
    const servers = Object.keys(this.nodeFeatures).filter(id => String(id).startsWith('Server'));
    const alerts = Object.keys(this.nodeFeatures).filter(id => this.classifyNodeType(id) === 'ALERT');
    const health = {
      totalServers: servers.length,
      totalAlerts: alerts.length,
      serverAlerts: {}
    };
    for (const server of servers) {
      const serverEdges = this.edges.filter(e => e.source === server);
      const alertEdges = serverEdges.filter(e => alerts.includes(e.target));
      health.serverAlerts[server] = {
        alertCount: alertEdges.length,
        alertTypes: [...new Set(alertEdges.map(e => e.target))],
        status: alertEdges.length > 0 ? 'CRITICAL' : 'HEALTHY'
      };
    }
    return health;
  }

  analyzeAttacks() {
    const attacks = {};
    const attackNodes = Object.keys(this.nodeFeatures).filter(id => this.nodeFeatures[id].type === 'ATTACK');
    for (const id of attackNodes) {
      const relatedEdges = this.edges.filter(e => e.source === id || e.target === id);
      attacks[id] = {
        relatedNodes: new Set(relatedEdges.map(e => e.source === id ? e.target : e.source)).size,
        totalEdges: relatedEdges.length,
        severityScore: this.nodeFeatures[id].anomalyScore
      };
    }
    return attacks;
  }

  getNodeTypeDistribution() {
    const distribution = {};
    for (const feature of Object.values(this.nodeFeatures)) {
      distribution[feature.type] = (distribution[feature.type] || 0) + 1;
    }
    return distribution;
  }

  calculateAveragePathLength(sp) {
    let total = 0;
    let count = 0;
    for (const paths of Object.values(sp)) {
      for (const dist of Object.values(paths.distances)) {
        if (dist !== Infinity && dist > 0) {
          total += dist;
          count++;
        }
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
    const attackAnalysis = this.analyzeAttacks();

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
      attackAnalysis,
      shortestPaths,
      nodeFeatures: this.nodeFeatures,
      nodes: this.nodes,
      edges: this.edges
    };
  }
}
