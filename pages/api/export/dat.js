import { generateDatPostings } from "../../../lib/exportDatCsv";
import { parse } from "json2csv";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { lanes, weightMin = 46750, weightMax = 48000 } = req.body;
    if (!Array.isArray(lanes)) throw new Error("Invalid input data");

    const rows = generateDatPostings(lanes, weightMin, weightMax);
    const csv = parse(rows, { header: true });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=DAT_Upload.csv");
    res.status(200).send(csv);
  } catch (err) {
    console.error("Export DAT error:", err);
    res.status(500).json({ error: "Failed to generate CSV" });
  }
}
