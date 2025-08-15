// pages/api/debugCrawl.js
import { generateCrawlPairs } from "../../lib/datcrawl.js";

export default async function handler(req, res) {
  try {
    const origin = String(req.query.origin || "");
    const dest = String(req.query.dest || req.query.destination || "");
    const equip = String(req.query.equip || "V").toUpperCase();
    const fill = req.query.fill === "1";

    if (!origin || !dest) return res.status(400).json({ error: "origin and dest required" });

    const out = await generateCrawlPairs({ origin, destination: dest, equipment: equip, preferFillTo10: fill });
    return res.status(200).json({
      origin,
      destination: dest,
      equipment: equip,
      count: out.pairs.length,
      shortfallReason: out.shortfallReason,
      allowedDuplicates: out.allowedDuplicates,
      pairs: out.pairs.map((p) => ({
        pickup: { city: p.pickup.city, state: p.pickup.state, zip: p.pickup.zip, kma: p.pickup.kma },
        delivery: { city: p.delivery.city, state: p.delivery.state, zip: p.delivery.zip, kma: p.delivery.kma },
        score: p.score,
        reason: p.reason
      }))
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "debugCrawl failed" });
  }
}
