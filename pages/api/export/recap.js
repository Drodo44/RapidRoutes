// pages/api/export/recap.js

import ExcelJS from "exceljs";

export default async function handler(req, res) {
  const lanes = req.body?.lanes || [];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Active Postings");

  sheet.columns = [
    { header: "Pickup", key: "origin" },
    { header: "Delivery", key: "destination" },
    { header: "Equipment", key: "equipment" },
    { header: "Weight", key: "weight" },
    { header: "Length", key: "length" },
    { header: "Date", key: "date" },
    { header: "RRSI", key: "rrsi" },
    { header: "Comment", key: "comment" }
  ];

  lanes.forEach((lane) => {
    sheet.addRow({
      origin: `${lane.originCity}, ${lane.originState}`,
      destination: `${lane.destCity}, ${lane.destState}`,
      equipment: lane.equipment,
      weight: lane.weight,
      length: lane.length,
      date: lane.date,
      rrsi: lane.rrsi,
      comment: lane.comment,
    });
  });

  sheet.columns.forEach((col) => (col.width = Math.max(12, col.header.length + 2)));

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=Active_Postings.xlsx");
  res.status(200).send(buffer);
}
