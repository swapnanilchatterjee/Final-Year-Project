// Generalized Graph Neural Network for Multi-Cloud Threat Detection
// Integrates with existing generalized modules: anomalyDetector.js, shortestPath.js, and dread.js

import { detectAnomalies } from './anomalyDetector.js';
import { dijkstra } from './shortestPath.js';
import { calculateDREADScore } from './dread.js';

export default class GraphNeuralNetwork {
  constructor(nodes = [], edges = [], config = {}) {
    this.nodes = nodes || [];
    this.edges = edges || [];
    this.config = {
      anomalyThreshold: config.anomalyThreshold || 1.5,
      pageRankIterations: config.pageRankIterations || 20,
      pageRankDamping: config.pageRankDamping || 0.85,
      convergenceThreshold: config.convergenceThreshold || 1e-6,
      ...config
    };
    
    this.adjacencyMatrix = this.buildAdjacencyMatrix();
    this.nodeFeatures = this.initializeNodeFeatures();
  }

  buildAdjacencyMatrix() {
    const allIds = new Set([
      ...this.nodes.map(n => n.id),
      ...this.edges.flatMap(e => [e.source, e.target])
    ]);

    const matrix = {};
    for (const a of allIds) {
      matrix[a] = {};
      for (const b of allIds) {
        matrix[a][b] = 0;
      }
    }

    for (const edge of this.edges) {
      if (matrix.hasOwnProperty(edge.source) && matrix.hasOwnProperty(edge.target)) {
        matrix[edge.source][edge.target] = edge.weight || 1;
      }
    }

    return matrix;
  }

  initializeNodeFeatures() {
    const features = {};
    const allNodeIds = new Set([
      ...this.nodes.map(n => n.id),
      ...this.edges.flatMap(e => [e.source, e.target])
    ]);

    for (const id of allNodeIds) {
      const nodeData = this.nodes.find(n => n.id === id);
      features[id] = {
        id,
        type: nodeData?.type || this.classifyNodeType(id),
        criticality: nodeData?.criticality || 5,
        inDegree: 0,
        outDegree: 0,
        totalDegree: 0,
        pageRank: 1.0 / allNodeIds.size,
        betweennessCentrality: 0,
        clusteringCoefficient: 0,
        anomalyScore: 0,
        dreadScore: 0,
        reasons: []
      };
    }

    for (const edge of this.edges) {
      if (features[edge.source]) features[edge.source].outDegree++;
      if (features[edge.target]) features[edge.target].inDegree++;
    }

    for (const feature of Object.values(features)) {
      feature.totalDegree = feature.inDegree + feature.outDegree;
    }

    return features;
  }

  classifyNodeType(id) {
    const idStr = String(id).toLowerCase();
    const patterns = {
      'USER': /^(user|client|account|person)/i,
      'SERVER': /^(server|host|machine|vm|instance)/i,
      'SERVICE': /^(service|api|microservice|app)/i,
      'ENDPOINT': /^(\/|endpoint|route|url)/i,
      'DATABASE': /(db|database|mongo|sql|redis)/i,
      'NETWORK': /(router|switch|gateway|firewall|balancer)/i,
      'ALERT': /(alert|warning|notification|alarm)/i,
      'ATTACKER': /(attacker|hacker|threat|malicious)/i,
      'ATTACK': /(attack|malware|breach|exploit|intrusion)/i,
      'RESOURCE': /(resource|file|storage|bucket|volume)/i,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(idStr)) return type;
    }

    return 'UNKNOWN';
  }

  calculatePageRank() {
    const nodeIds = Object.keys(this.nodeFeatures);
    const n = nodeIds.length;
    if (n === 0) return {};

    const damping = this.config.pageRankDamping;
    let pagerank = Object.fromEntries(nodeIds.map(id => [id, 1.0 / n]));

    for (let iter = 0; iter < this.config.pageRankIterations; iter++) {
      const newPagerank = {};
      let maxDiff = 0;

      for (const node of nodeIds) {
        let rankSum = 0;
        for (const source of nodeIds) {
          if (this.adjacencyMatrix[source][node] > 0) {
            const outDegree = Object.values(this.adjacencyMatrix[source])
              .reduce((sum, weight) => sum + (weight > 0 ? 1 : 0), 0);
            if (outDegree > 0) {
              rankSum += pagerank[source] / outDegree;
            }
          }
        }
        newPagerank[node] = (1 - damping) / n + damping * rankSum;
        maxDiff = Math.max(maxDiff, Math.abs(newPagerank[node] - pagerank[node]));
      }

      pagerank = newPagerank;
      if (maxDiff < this.config.convergenceThreshold) break;
    }

    for (const id of nodeIds) {
      this.nodeFeatures[id].pageRank = pagerank[id];
    }

    return pagerank;
  }

  calculateBetweennessCentrality() {
    const centrality = Object.fromEntries(
      Object.keys(this.nodeFeatures).map(id => [id, 0])
    );
    const nodeIds = Object.keys(this.nodeFeatures);

    for (const source of nodeIds) {
      const { previous } = dijkstra(this.nodes, this.adjacencyMatrix, source);
      for (const target of nodeIds) {
        if (source === target) continue;
        const path = this.reconstructPath(previous, source, target);
        for (let i = 1; i < path.length - 1; i++) {
          if (centrality[path[i]] !== undefined) {
            centrality[path[i]]++;
          }
        }
      }
    }

    const n = nodeIds.length;
    const normalizer = (n - 1) * (n - 2) / 2;
    for (const [id, value] of Object.entries(centrality)) {
      this.nodeFeatures[id].betweennessCentrality = normalizer ? value / normalizer : 0;
    }

    return centrality;
  }

  calculateClusteringCoefficient() {
    for (const nodeId of Object.keys(this.nodeFeatures)) {
      const neighbors = Object.keys(this.adjacencyMatrix[nodeId] || {})
        .filter(neighbor => this.adjacencyMatrix[nodeId][neighbor] > 0);
      if (neighbors.length < 2) {
        this.nodeFeatures[nodeId].clusteringCoefficient = 0;
        continue;
      }
      let triangles = 0;
      const possible = neighbors.length * (neighbors.length - 1) / 2;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (this.adjacencyMatrix[neighbors[i]][neighbors[j]] > 0) {
            triangles++;
          }
        }
      }
      this.nodeFeatures[nodeId].clusteringCoefficient = possible > 0 ? triangles / possible : 0;
    }
  }

  calculateAllShortestPaths() {
    const paths = {};
    for (const nodeId of Object.keys(this.nodeFeatures)) {
      paths[nodeId] = dijkstra(this.nodes, this.adjacencyMatrix, nodeId);
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

  calculateDREADScores() {
    const nodeIds = Object.keys(this.nodeFeatures);
    const nodes = Object.values(this.nodeFeatures);
    const maxValues = {
      inDegree: Math.max(...nodes.map(n => n.inDegree), 1),
      outDegree: Math.max(...nodes.map(n => n.outDegree), 1),
      centrality: Math.max(...nodes.map(n => n.betweennessCentrality), 1),
      pageRank: Math.max(...nodes.map(n => n.pageRank), 1),
      totalDegree: Math.max(...nodes.map(n => n.totalDegree), 1)
    };
    for (const nodeId of nodeIds) {
      const node = this.nodeFeatures[nodeId];
      node.dreadScore = calculateDREADScore(node, maxValues, this.edges);
    }
  }

  analyze() {
    this.calculatePageRank();
    this.calculateBetweennessCentrality();
    this.calculateClusteringCoefficient();
    this.calculateDREADScores();

    const anomalies = detectAnomalies({
      nodes: this.nodes,
      edges: this.edges,
      features: this.nodeFeatures,
      k: this.config.anomalyThreshold
    });

    const shortestPaths = this.calculateAllShortestPaths();
    const userBehavior = this.analyzeUserBehavior();
    const serviceAnalysis = this.analyzeServiceCommunication();
    const systemHealth = this.analyzeSystemHealth();
    const attackAnalysis = this.analyzeAttacks();
    const threatPaths = this.reconstructThreatPaths(anomalies, shortestPaths);

    console.log("DEBUG: Nodes counted in analyze():", this.nodes.map(n => n.id || n));

    return {
      overview: {
        totalNodes: Object.keys(this.nodeFeatures).length,
        totalEdges: this.edges.length,
        nodeTypeDistribution: this.getNodeTypeDistribution(),
        avgPathLength: this.calculateAveragePathLength(shortestPaths),
        graphDensity: this.calculateGraphDensity()
      },
      anomalies: anomalies.sort((a, b) => b.score - a.score),
      threatPaths,
      userBehavior,
      serviceAnalysis,
      systemHealth,
      attackAnalysis,
      shortestPaths,
      nodeFeatures: this.nodeFeatures
    };
  }

  reconstructThreatPaths(anomalies, shortestPaths) {
    const threatPaths = [];
    const attackSources = Object.keys(this.nodeFeatures).filter(id => {
      const type = this.nodeFeatures[id].type;
      return ['ATTACKER', 'ATTACK', 'UNKNOWN'].includes(type) || this.nodeFeatures[id].anomalyScore > 0;
    });
    const criticalTargets = Object.keys(this.nodeFeatures).filter(id => {
      const type = this.nodeFeatures[id].type;
      return ['SERVER', 'DATABASE', 'SERVICE'].includes(type);
    });

    for (const anomaly of anomalies) {
      for (const source of attackSources) {
        if (source === anomaly.nodeId) continue;
        const pathData = shortestPaths[source];
        if (pathData.distances[anomaly.nodeId] !== Infinity) {
          const path = this.reconstructPath(pathData.previous, source, anomaly.nodeId);
          if (path.length > 1) {
            threatPaths.push({
              source,
              target: anomaly.nodeId,
              path,
              distance: pathData.distances[anomaly.nodeId],
              riskScore: this.calculatePathRiskScore(path),
              anomalyScore: anomaly.score
            });
          }
        }
      }
    }

    return threatPaths.sort((a, b) => b.riskScore - a.riskScore);
  }

  calculatePathRiskScore(path) {
    let riskScore = 0;
    for (const nodeId of path) {
      const feature = this.nodeFeatures[nodeId];
      riskScore += feature.anomalyScore + feature.dreadScore;
      const typeRisk = {
        'ATTACKER': 3.0,
        'ATTACK': 2.5,
        'ALERT': 1.5,
        'DATABASE': 1.5,
        'SERVER': 1.2,
        'SERVICE': 1.0
      };
      riskScore += typeRisk[feature.type] || 0.5;
    }
    return path.length > 0 ? riskScore / path.length : 0;
  }

  analyzeUserBehavior() {
    const users = {};
    const userIds = Object.keys(this.nodeFeatures).filter(id => this.nodeFeatures[id].type === 'USER');
    for (const id of userIds) {
      const userEdges = this.edges.filter(e => e.source === id);
      const uniqueTargets = new Set(userEdges.map(e => e.target));
      users[id] = {
        totalActions: userEdges.length,
        uniqueEndpoints: uniqueTargets.size,
        anomalyScore: this.nodeFeatures[id].anomalyScore,
        dreadScore: this.nodeFeatures[id].dreadScore,
        isSuspicious: this.nodeFeatures[id].anomalyScore > 1.0
      };
    }
    return users;
  }

  analyzeServiceCommunication() {
    const services = Object.keys(this.nodeFeatures).filter(id => this.nodeFeatures[id].type === 'SERVICE');
    const analysis = {};
    for (const service of services) {
      const incoming = this.edges.filter(e => e.target === service);
      const outgoing = this.edges.filter(e => e.source === service);
      analysis[service] = {
        incomingCalls: incoming.length,
        outgoingCalls: outgoing.length,
        anomalyScore: this.nodeFeatures[service].anomalyScore,
        dreadScore: this.nodeFeatures[service].dreadScore
      };
    }
    return analysis;
  }

  analyzeSystemHealth() {
    const servers = Object.keys(this.nodeFeatures).filter(id => this.nodeFeatures[id].type === 'SERVER');
    const alerts = Object.keys(this.nodeFeatures).filter(id => this.nodeFeatures[id].type === 'ALERT');
    return {
      totalServers: servers.length,
      totalAlerts: alerts.length,
      highRiskServers: servers.filter(id => 
        this.nodeFeatures[id].anomalyScore > 1.0 || 
        this.nodeFeatures[id].dreadScore > 7.0
      ).length
    };
  }

  analyzeAttacks() {
    const attackNodes = Object.keys(this.nodeFeatures).filter(id => 
      ['ATTACK', 'ATTACKER'].includes(this.nodeFeatures[id].type)
    );
    const attacks = {};
    for (const id of attackNodes) {
      const relatedEdges = this.edges.filter(e => e.source === id || e.target === id);
      attacks[id] = {
        relatedEdges: relatedEdges.length,
        anomalyScore: this.nodeFeatures[id].anomalyScore,
        dreadScore: this.nodeFeatures[id].dreadScore,
        centrality: this.nodeFeatures[id].betweennessCentrality
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

  calculateAveragePathLength(shortestPaths) {
    let total = 0;
    let count = 0;
    for (const paths of Object.values(shortestPaths)) {
      for (const distance of Object.values(paths.distances)) {
        if (distance !== Infinity && distance > 0) {
          total += distance;
          count++;
        }
      }
    }
    return count > 0 ? total / count : 0;
  }

  calculateGraphDensity() {
    const n = Object.keys(this.nodeFeatures).length;
    if (n < 2) return 0;
    return (2 * this.edges.length) / (n * (n - 1));
  }
}
