// pages/api/debugCrawl.js
import { generateCrawlPairs } from "../../lib/datcrawl";

export default async function handler(req, res) {
  try {
    const origin = String(req.query.origin || "");
    const dest = String(req.query.dest || "");
    const equip = String(req.query.equip || "V");
    const fill = req.query.fill === "1";
    if (!origin || !dest) return res.status(400).json({ error: "origin and dest required" });

    const out = await generateCrawlPairs({ origin, destination: dest, equipment: equip, preferFillTo10: fill });
    return res.status(200).json({
      baseOrigin: out.baseOrigin, baseDest: out.baseDest,
      count: out.pairs.length, pairs: out.pairs, shortfallReason: out.shortfallReason || "",
      allowedDuplicates: !!out.allowedDuplicates,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "crawl failed" });
  }
}
