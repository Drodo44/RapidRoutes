// tests/datCsvBuilder.test.js
import { vi } from "vitest";
import * as crawlMod from "../lib/datcrawl.js";
import { buildRowsForLane, DAT_HEADERS, toCsv } from "../lib/datCsvBuilder.js";

function mockPairs(n = 10) {
  return Array.from({ length: n }, (_, i) => ({
    pickup: { city: `P${i}`, state: "AL", zip: "", kma: `AL_${i}` },
    delivery: { city: `D${i}`, state: "IL", zip: "", kma: `IL_${i}` },
    reason: ["rates+"],
    score: 0.95,
  }));
}

vi.spyOn(crawlMod, "generateCrawlCities").mockImplementation(async () => ({
  baseOrigin: { city: "Maplesville", state: "AL", zip: "36756", kma: "AL_BASE" },
  baseDest: { city: "Chicago", state: "IL", zip: "60601", kma: "IL_BASE" },
  pairs: mockPairs(10),
  allowedDuplicates: false,
  shortfallReason: "",
}));

describe("DAT CSV builder", () => {
  const laneFixed = {
    origin: "Maplesville, AL",
    destination: "Chicago, IL",
    equipment: "V",
    length: 53,
    weight: 42000,
    randomize_weight: false,
    date: "8/12/2025",
    full_partial: "full",
    comment: "test",
  };

  const laneRand = {
    ...laneFixed,
    weight: null,
    randomize_weight: true,
    weight_min: 42000,
    weight_max: 48000,
  };

  it("builds 22 rows per lane (11 postings x 2 contact methods)", async () => {
    const { rows, totalPostings } = await buildRowsForLane(laneFixed);
    expect(totalPostings).toBe(11);
    expect(rows).toHaveLength(22);
    // headers present
    const csv = toCsv(DAT_HEADERS, rows);
    expect(csv.split("\n")[0]).toBe(DAT_HEADERS.join(","));
  });

  it("fixed weight — all rows carry identical weight", async () => {
    const { rows } = await buildRowsForLane(laneFixed);
    const weights = rows.map((r) => r["Weight (lbs)*"]);
    expect(new Set(weights).size).toBe(1);
    expect(weights[0]).toBe(42000);
  });

  it("randomized weight — all rows within min/max", async () => {
    const { rows } = await buildRowsForLane(laneRand);
    for (const r of rows) {
      const w = Number(r["Weight (lbs)*"]);
      expect(w).toBeGreaterThanOrEqual(42000);
      expect(w).toBeLessThanOrEqual(48000);
    }
  });
});
