// pages/api/export/recap.js

import ExcelJS from "exceljs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { lanes } = req.body;
    if (!Array.isArray(lanes)) throw new Error("Invalid lane data");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Active Postings");

    sheet.columns = [
      { header: "Origin", key: "origin", width: 20 },
      { header: "Destination", key: "destination", width: 20 },
      { header: "Equipment", key: "equipment", width: 15 },
      { header: "Weight", key: "weight", width: 12 },
      { header: "Date", key: "date", width: 15 },
      { header: "Length", key: "length", width: 10 },
      { header: "Status", key: "status", width: 12 },
      { header: "RRSI", key: "rrs", width: 10 },
      { header: "Comment", key: "comment", width: 30 },
    ];

    lanes.forEach((lane) => {
      sheet.addRow(lane);
    });

    sheet.eachRow((row, rowNum) => {
      row.eachCell((cell) => {
        cell.font = { color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowNum % 2 === 0 ? "FF1a2437" : "FF202b42" },
        };
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Active_Postings.xlsx");

    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    console.error("Recap export error:", error);
    res.status(500).json({ error: "Failed to generate recap workbook" });
  }
}
