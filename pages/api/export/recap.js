import { supabase } from "../../../utils/supabaseClient";
import { Workbook } from "exceljs";

export default async function handler(req, res) {
  const { data, error } = await supabase.from("lanes").select("*");

  if (error) return res.status(500).json({ error });

  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Active Postings");

  sheet.columns = [
    { header: "Origin", key: "origin", width: 20 },
    { header: "Destination", key: "destination", width: 20 },
    { header: "Equipment", key: "equipment", width: 15 },
    { header: "Pickup Date", key: "dateEarliest", width: 15 },
    { header: "Weight", key: "weight", width: 15 },
    { header: "Note", key: "note", width: 30 },
  ];

  data.forEach((lane) => {
    sheet.addRow({
      origin: lane.origin,
      destination: lane.destination,
      equipment: lane.equipment,
      dateEarliest: lane.dateEarliest,
      weight: lane.randomizeWeight
        ? `${lane.randomLow}-${lane.randomHigh}`
        : lane.baseWeight,
      note: lane.note || "",
    });
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=Active_Postings.xlsx");

  await workbook.xlsx.write(res);
  res.end();
}
