import ExcelJS from "exceljs";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { lanes } = req.body;
  if (!lanes) return res.status(400).json({ error: "Missing lanes data." });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Active Postings");

  sheet.columns = [
    { header: "Pickup City", key: "origin_city", width: 20 },
    { header: "Pickup State", key: "origin_state", width: 15 },
    { header: "Dropoff City", key: "dest_city", width: 20 },
    { header: "Dropoff State", key: "dest_state", width: 15 },
    { header: "Equipment", key: "equipment", width: 20 },
    { header: "Miles", key: "distance", width: 10 },
    { header: "Weather Flag", key: "weather_flag", width: 15 },
    { header: "Selling Point", key: "selling_point", width: 40 },
  ];

  lanes.forEach((lane) => {
    sheet.addRow(lane);
  });

  // Footer credit line
  const row = sheet.addRow([]);
  row.getCell(1).value =
    "Created by Andrew Connellan – Logistics Account Exec at TQL, Cincinnati, OH";
  row.getCell(1).font = { italic: true, size: 10 };
  sheet.mergeCells(`A${row.number}:H${row.number}`);

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=Active_Postings.xlsx");
  res.send(buffer);
}
