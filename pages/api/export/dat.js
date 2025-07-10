// pages/api/export/dat.js

import { generateDATCSV } from "../../../lib/datGenerator";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // TEMP: Replace with DB fetch later
  const sampleLane = {
    origin_city: "Chicago",
    origin_state: "IL",
    origin_zip: "60601",
    dest_city: "Dallas",
    dest_state: "TX",
    dest_zip: "75201",
    equipment: "FD",
    weight: 48000,
    length: 48,
    date: "2025-07-10"
  };

  const csv = generateDATCSV(sampleLane);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=DAT_Upload.csv");
  res.status(200).send(csv);
}
