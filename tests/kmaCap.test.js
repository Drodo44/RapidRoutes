// tests/kmaCap.test.js
import { _capKMAForTest } from "../lib/datcrawl.js";

function mk(city, state, kma) {
  return { cand: { city, state, kma } };
}

describe("KMA capping helper", () => {
  it("keeps at most 1 per KMA when cap=1", () => {
    const list = [
      mk("A", "AL", "K1"),
      mk("B", "AL", "K1"),
      mk("C", "AL", "K2"),
      mk("D", "AL", "K2"),
      mk("E", "AL", "K3"),
    ];
    const capped = _capKMAForTest(list, 1);
    const seen = new Map();
    for (const item of capped) {
      const k = item.cand.kma;
      expect((seen.get(k) || 0)).toBeLessThan(1);
      seen.set(k, (seen.get(k) || 0) + 1);
    }
  });

  it("allows up to 2 per KMA when cap=2", () => {
    const list = [
      mk("A", "AL", "K1"),
      mk("B", "AL", "K1"),
      mk("C", "AL", "K1"),
      mk("D", "AL", "K2"),
      mk("E", "AL", "K2"),
      mk("F", "AL", "K3"),
    ];
    const capped = _capKMAForTest(list, 2);
    const counts = capped.reduce((m, i) => (m[i.cand.kma] = (m[i.cand.kma] || 0) + 1, m), {});
    expect(counts["K1"]).toBeLessThanOrEqual(2);
    expect(counts["K2"]).toBeLessThanOrEqual(2);
    expect((counts["K3"] || 0)).toBeLessThanOrEqual(2);
  });
});
