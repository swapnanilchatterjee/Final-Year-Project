# Public API

- `GraphNeuralNetwork(nodes, edges)` – core analyzer class.
- `GraphNeuralNetwork#analyze()` – returns a result object with: `overview`, `anomalies`, `userBehavior`, `serviceAnalysis`, `systemHealth`, `shortestPaths`, `nodeFeatures`, `nodes`, `edges`.
- `generateCSVReport(results)` – CSV summary.
- `GraphVisualizer` – D3 SVG network rendering component.
