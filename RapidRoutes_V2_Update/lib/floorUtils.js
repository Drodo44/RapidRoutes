// Assumes standard 26' box truck = 312 inches interior length
export function checkFitInBoxTruck({ length, width, height, count }) {
  const lengthInches = parseInt(length);
  const totalLengthUsed = lengthInches * parseInt(count || 0);
  return totalLengthUsed <= 312; // 26 feet
}
