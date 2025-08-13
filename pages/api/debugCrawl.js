// pages/api/debugCrawl.js
import { generateCrawlCities } from "../../lib/datcrawl.js";

export default async function handler(req, res) {
  try {
    const origin = req.query.origin || "";
    const dest = req.query.dest || "";
    const equip = (req.query.equip || "V").toUpperCase();
    const preferFillTo10 = req.query.fill === "1";
    if (!origin || !dest) return res.status(400).json({ error: "Query: origin=City,ST & dest=City,ST" });

    const { baseOrigin, baseDest, pairs, allowedDuplicates, shortfallReason } =
      await generateCrawlCities(origin, dest, { equipment: equip, preferFillTo10 });

    return res.status(200).json({
      baseOrigin, baseDest, allowedDuplicates, shortfallReason,
      count: pairs.length,
      pairs: pairs.map((p) => ({
        pickup: { city: p.pickup.city, state: p.pickup.state, kma: p.pickup.kma },
        delivery: { city: p.delivery.city, state: p.delivery.state, kma: p.delivery.kma },
        reason: p.reason,
        score: Number(p.score?.toFixed(3)),
      })),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "debugCrawl failed" });
  }
}
