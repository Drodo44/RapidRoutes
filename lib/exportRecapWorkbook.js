// lib/exportRecapWorkbook.js
import ExcelJS from "exceljs";

export async function generateRecapWorkbook(lanes) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Active Postings");

  sheet.columns = [
    { header: "Origin", key: "origin" },
    { header: "Destination", key: "destination" },
    { header: "Equipment", key: "equipment" },
    { header: "Weight", key: "weight" },
    { header: "Date", key: "date" },
    { header: "Length", key: "length" },
    { header: "Status", key: "status" },
    { header: "RRSI", key: "rrs" },
    { header: "Comment", key: "comment" }
  ];

  lanes.forEach((lane) => {
    sheet.addRow({
      origin: `${lane.origin_city}, ${lane.origin_state}`,
      destination: `${lane.dest_city}, ${lane.dest_state}`,
      equipment: lane.equipment,
      weight: lane.weight,
      date: lane.date,
      length: lane.length,
      status: lane.status || "Active",
      rrs: lane.rrs || "",
      comment: lane.comment || "",
    });
  });

  sheet.eachRow((row, i) => {
    row.eachCell((cell) => {
      cell.font = { color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: i % 2 === 0 ? "FF1A2437" : "FF202B42" },
      };
    });
  });

  return wb;
}
