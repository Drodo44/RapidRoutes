// pages/api/export/recap.js
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export default async function handler(req, res) {
  const { lanes } = req.body;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Active Postings");

  sheet.columns = [
    { header: "Origin", key: "origin", width: 20 },
    { header: "Destination", key: "destination", width: 20 },
    { header: "Equipment", key: "equipment", width: 15 },
    { header: "Miles", key: "miles", width: 10 },
    { header: "Comment", key: "comment", width: 30 },
  ];

  lanes.forEach((lane) => {
    sheet.addRow({
      origin: lane.originCity + ", " + lane.originState,
      destination: lane.destinationCity + ", " + lane.destinationState,
      equipment: lane.equipment,
      miles: lane.miles || "",
      comment: lane.comment || "",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader("Content-Disposition", "attachment; filename=Active_Postings.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
}
