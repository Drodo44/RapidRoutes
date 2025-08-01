// pages/api/export/dat.js
import { generateDatCsvRows } from "../../../lib/exportDatCsv";
import Papa from "papaparse";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/lanes`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  });

  const lanes = await response.json();
  const rows = generateDatCsvRows(lanes);
  const csv = Papa.unparse(rows);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=dat_postings.csv");
  res.status(200).send(csv);
}
