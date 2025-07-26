// pages/api/exportDatCsv.js
import { generateDatCsv } from "../../lib/datcrawl";

export default async function handler(req, res) {
  try {
    const { lanes } = req.body;
    if (!lanes || !Array.isArray(lanes)) {
      return res.status(400).json({ error: "Invalid lane data" });
    }

    const csv = generateDatCsv(lanes);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=DAT_Upload.csv");
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
