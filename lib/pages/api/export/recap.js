import { supabase } from "../../../utils/supabaseClient";
import { generateRecapWorkbook } from "../../../lib/recap";
import { NextApiRequest, NextApiResponse } from "next";

// Returns recap workbook (xlsx) of all user lanes
export default async function handler(req, res) {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  const { data: lanes, error } = await supabase
    .from("lanes")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    return res.status(500).json({ error: "Failed to fetch lanes" });
  }

  const workbookBuffer = await generateRecapWorkbook(lanes);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=RapidRoutes_Recap.xlsx");
  res.status(200).send(workbookBuffer);
}
