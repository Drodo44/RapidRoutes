// lib/datcrawl.js  (PATCH: add the last line only if missing)
// ... existing contents from the last version I sent ...

// expose a tiny pure helper for tests (does not affect runtime)
export function _capKMAForTest(list, cap) {
  const by = new Map();
  const out = [];
  for (const item of list) {
    const kma = item.cand?.kma || `${item.cand?.city}-${item.cand?.state}`;
    const arr = by.get(kma) || [];
    if (arr.length < cap) {
      arr.push(item);
      by.set(kma, arr);
      out.push(item);
    }
  }
  return out;
}
