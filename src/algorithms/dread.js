function calculateDamage(node, maxValues) {
    return node.damage || 1;
  }
  
  function calculateReproducibility(node, maxValues) {
    return node.reproducibility || 1;
  }
  
  function calculateExploitability(node, maxValues, edges) {
    return node.exploitability || 1;
  }
  
  function calculateAffectedUsers(node, maxValues) {
    return node.affectedUsers || 1;
  }
  
  function calculateDiscoverability(node, maxValues) {
    return node.discoverability || 1;
  }
  
  export function calculateDREADScore(node, maxValues, edges, customWeights) {
    const DEFAULT_WEIGHTS = {
      damage: 1,
      reproducibility: 1,
      exploitability: 1,
      affectedUsers: 1,
      discoverability: 1,
    };
  
    const weights = customWeights || DEFAULT_WEIGHTS;
  
    const damage = calculateDamage(node, maxValues);
    const reproducibility = calculateReproducibility(node, maxValues);
    const exploitability = calculateExploitability(node, maxValues, edges);
    const affectedUsers = calculateAffectedUsers(node, maxValues);
    const discoverability = calculateDiscoverability(node, maxValues);
  
    return (
      damage * weights.damage +
      reproducibility * weights.reproducibility +
      exploitability * weights.exploitability +
      affectedUsers * weights.affectedUsers +
      discoverability * weights.discoverability
    );
  }
  