import { describe, it, expect } from 'vitest';
import { generateCSVReport } from '../src/utils/csvGenerator.js';

describe('csvGenerator', () => {
  it('creates CSV with header', () => {
    const csv = generateCSVReport({
      overview: { totalNodes: 1, totalEdges: 0, avgPathLength: 0, nodeTypes: { USER: 1 } },
      anomalies: [], userBehavior: {}, serviceAnalysis: {}, systemHealth: { serverAlerts: {} }, nodeFeatures: {}
    });
    expect(csv.split('\n')[0]).toContain('Category,Entity,Metric,Value,Severity,Details');
  });
});
