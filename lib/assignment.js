// lib/assignment.js
// assignPairs(scores: number[][]) -> [ [row, col], ... ]
// Maximizes total score using Hungarian algorithm on a squared cost matrix.
export function assignPairs(scores) {
  const m = scores.length || 0;
  const n = scores[0]?.length || 0;
  if (!m || !n) return [];
  const size = Math.max(m, n);

  // Build square cost matrix for minimization: cost = maxScore - score
  let maxScore = 0;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) maxScore = Math.max(maxScore, scores[i][j] || 0);
  const cost = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => {
      const s = i < m && j < n ? (scores[i][j] || 0) : 0;
      return maxScore - s;
    })
  );

  // Hungarian (O(n^3)) — potentials + matching on columns
  const u = Array(size + 1).fill(0);
  const v = Array(size + 1).fill(0);
  const p = Array(size + 1).fill(0);
  const way = Array(size + 1).fill(0);

  for (let i = 1; i <= size; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(size + 1).fill(Infinity);
    const used = Array(size + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= size; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= size; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  // p[j] = i matched; collect valid (row< m && col< n)
  const pairs = [];
  for (let j = 1; j <= size; j++) {
    const i = p[j];
    const r = i - 1, c = j - 1;
    if (r < m && c < n && r >= 0 && c >= 0) pairs.push([r, c]);
  }
  return pairs;
}
