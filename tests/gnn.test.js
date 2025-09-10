import GraphNeuralNetwork from '../src/algorithms/GraphNeuralNetwork.js';
import { calculateDREADScore } from '../src/algorithms/dread.js';


// Sample nodes
const nodes = [
  { id: 'user1', type: 'USER', criticality: 3 },
  { id: 'server1', type: 'SERVER', criticality: 5 },
  { id: 'service1', type: 'SERVICE', criticality: 4 },
  { id: 'attacker1', type: 'ATTACKER', criticality: 1 },
];

// Sample edges
const edges = [
  { source: 'user1', target: 'service1', weight: 1 },
  { source: 'service1', target: 'server1', weight: 1 },
  { source: 'attacker1', target: 'server1', weight: 2 },
  { source: 'attacker1', target: 'service1', weight: 1 },
];

// Initialize GNN
const gnn = new GraphNeuralNetwork(nodes, edges, {
  anomalyThreshold: 1.0,
  pageRankIterations: 10
});

// Run analysis
const result = gnn.analyze();

console.log('--- Overview ---');
console.log(result.overview);

console.log('--- Node Features ---');
console.log(result.nodeFeatures);

console.log('--- Anomalies ---');
console.log(result.anomalies);

console.log('--- Threat Paths ---');
console.log(result.threatPaths);

// --- Testing Utility Functions ---
console.log('Graph Density:', gnn.calculateGraphDensity());
console.log('Average Path Length:', gnn.calculateAveragePathLength(result.shortestPaths));
console.log('Node Type Distribution:', gnn.getNodeTypeDistribution());

// --- Test shortest paths individually ---
console.log('Shortest paths from user1:', result.shortestPaths['user1']);

// --- Test individual node metrics ---
gnn.calculatePageRank();
gnn.calculateBetweennessCentrality();
gnn.calculateClusteringCoefficient();
console.log('Updated Node Features:', gnn.nodeFeatures);
