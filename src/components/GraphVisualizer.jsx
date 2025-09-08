import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function GraphVisualizer({ nodes, edges, height = 380 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!nodes?.length || !edges?.length) return;

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const width = ref.current.clientWidth || 800;

    const color = d3.scaleOrdinal()
      .domain(['USER', 'SERVER', 'SERVICE', 'ENDPOINT', 'ALERT', 'RESOURCE', 'ATTACK', 'ATTACKER'])
      .range(['#3b82f6', '#16a34a', '#8b5cf6', '#0ea5e9', '#ef4444', '#6b7280', '#f97316', '#db2777']);

    const idToType = new Map(nodes.map(n => [n.id, inferType(n.id)]));

    const sim = d3.forceSimulation(nodes.map(d => ({ ...d })))
      .force('link', d3.forceLink(edges.map(e => ({ ...e }))).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .stop();

    for (let i = 0; i < 200; i++) sim.tick();

    svg.attr('viewBox', [0, 0, width, height]);

    // Draw edges
    svg.append('g')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-opacity', 0.8)
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('x1', d => getNode(nodes, d.source).x)
      .attr('y1', d => getNode(nodes, d.source).y)
      .attr('x2', d => getNode(nodes, d.target).x)
      .attr('y2', d => getNode(nodes, d.target).y);

    // Draw nodes
    const nodeG = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    nodeG.append('circle')
      .attr('r', 8)
      .attr('fill', d => color(idToType.get(d.id)));

    nodeG.append('title').text(d => `${d.id} (${idToType.get(d.id)})`);

    nodeG.append('text')
      .text(d => d.id)
      .attr('x', 10)
      .attr('y', 3)
      .attr('font-size', 10)
      .attr('fill', '#334155');

    function getNode(arr, id) {
      return arr.find(n => n.id === (id.id || id));
    }

    function inferType(id) {
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
  }, [nodes, edges, height]);

  return <svg ref={ref} className="w-full" style={{ height }} />;
}
