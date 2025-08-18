export function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function sum(nums) {
  return nums.reduce((a, b) => a + b, 0);
}