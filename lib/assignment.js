// lib/assignment.js
// Hungarian algorithm (max-sum) to build unique pickup→delivery pairs.
export function assignPairs(scores) {
  const rows = scores.length;
  const cols = scores[0]?.length ?? 0;
  const n = Math.max(rows, cols);
  const INF = 1e9;

  const cost = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      const v = (i < rows && j < cols && scores[i][j] != null) ? scores[i][j] : -INF;
      return -v;
    })
  );

  const u = Array(n + 1).fill(0);
  const v = Array(n + 1).fill(0);
  const p = Array(n + 1).fill(0);
  const way = Array(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(n + 1).fill(INF);
    const used = Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else { minv[j] -= delta; }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const result = [];
  for (let j = 1; j <= n; j++) {
    const i = p[j];
    if (i && i - 1 < rows && j - 1 < cols) result.push([i - 1, j - 1]);
  }
  return result;
}
