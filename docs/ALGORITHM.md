We use a lightweight graph pipeline:

1. **Adjacency Matrix** – Built from edges with default weight `1`.
2. **Shortest Paths** – Dijkstra for each source. Complexity roughly `O(V * (E log V))` with a simple array-based queue (acceptable for demo sizes).
3. **Betweenness Centrality** – Path reconstruction on shortest paths, counting interior nodes, normalized by `(n-1)(n-2)/2`.
4. **Anomalies** – Heuristics: degree spikes, alert nodes, and presence of HTTP 500s for services.
5. **User Behavior** – Counts actions and session completion.
6. **Service Communication** – Reliability = 200-responses / all incoming responses.
7. **System Health** – Server → Alert edges imply `CRITICAL` for that server.

