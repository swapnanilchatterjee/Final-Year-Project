import { describe, it, expect } from 'vitest';
import GraphNeuralNetwork from '../src/algorithms/GraphNeuralNetwork.js';
import sample from '../src/data/sample_logs.json';

describe('GraphNeuralNetwork', () => {
  it('computes overview metrics', () => {
    const g = new GraphNeuralNetwork(sample.nodes, sample.edges);
    const r = g.analyze();
    expect(r.overview.totalNodes).toBe(sample.nodes.length);
    expect(r.overview.totalEdges).toBe(sample.edges.length);
    expect(r.overview.avgPathLength).toBeGreaterThanOrEqual(0);
  });

  it('detects some anomalies', () => {
    const g = new GraphNeuralNetwork(sample.nodes, sample.edges);
    const r = g.analyze();
    expect(r.anomalies.length).toBeGreaterThan(0);
  });
});
