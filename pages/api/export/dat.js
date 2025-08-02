import { NextApiRequest, NextApiResponse } from "next";
import { generateDatCsvRows } from "../../../lib/exportDatCsv";
import { Parser } from "json2csv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { lanes, settings } = req.body;

  if (!lanes || !settings) {
    return res.status(400).json({ error: "Missing lanes or settings." });
  }

  try {
    const rows = await generateDatCsvRows(lanes, settings);

    const parser = new Parser({ quote: "" });
    const csv = parser.parse(rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=DAT_Postings.csv");
    res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "CSV generation failed." });
  }
}
