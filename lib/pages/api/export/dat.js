import { supabase } from "../../../utils/supabaseClient";
import { generateDatCsv } from "../../../lib/dat";
import { NextApiRequest, NextApiResponse } from "next";

// API: Exports all user's lanes as perfect DAT CSV
export default async function handler(req, res) {
  // Auth: Accepts GET or POST with user ID (session must be handled securely)
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  // Fetch lanes for user
  const { data: lanes, error } = await supabase
    .from("lanes")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    return res.status(500).json({ error: "Failed to fetch lanes" });
  }

  // Generate CSV with strict DAT logic
  const csv = generateDatCsv(lanes);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=RapidRoutes_DAT.csv");
  res.status(200).send(csv);
}
