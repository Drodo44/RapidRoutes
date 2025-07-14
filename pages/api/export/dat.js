// pages/api/export/dat.js

import { generateDatCsv } from "../../../lib/generateDatCsv";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const lanes = req.body.lanes;

    if (!Array.isArray(lanes) || lanes.length === 0) {
      return res.status(400).json({ error: "No lanes provided." });
    }

    const csv = await generateDatCsv(lanes);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=dat_upload.csv");
    res.status(200).send(csv);
  } catch (error) {
    console.error("DAT export error:", error);
    res.status(500).json({ error: "Failed to generate DAT CSV." });
  }
}
