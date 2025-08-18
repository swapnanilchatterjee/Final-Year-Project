export function dijkstra(nodes, adjacencyMatrix, source) {
  const nodeIds = nodes.map(n => n.id);
  const distances = Object.fromEntries(nodeIds.map(id => [id, Infinity]));
  const previous = Object.fromEntries(nodeIds.map(id => [id, null]));
  const visited = new Set();
  const queue = [];

  distances[source] = 0;
  queue.push({ node: source, distance: 0 });

  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const { node } = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);

    const neighbors = Object.keys(adjacencyMatrix[node] || {});
    for (const neighbor of neighbors) {
      const w = adjacencyMatrix[node][neighbor];
      if (w > 0) {
        const alt = distances[node] + w;
        if (alt < distances[neighbor]) {
          distances[neighbor] = alt;
          previous[neighbor] = node;
          queue.push({ node: neighbor, distance: alt });
        }
      }
    }
  }

  return { distances, previous };
}
