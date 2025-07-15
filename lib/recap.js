import ExcelJS from "exceljs";

// Strict recap fields; expand as needed
const RECAP_HEADERS = [
  "Origin", "Origin State", "Destination", "Dest State", "Equipment", "Weight", "Pickup Date", "Delivery Date", "Notes"
];

export async function generateRecapWorkbook(lanes = []) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Active Postings");

  // Header row
  sheet.addRow(RECAP_HEADERS);
  sheet.getRow(1).font = { bold: true, color: { argb: "FF22d3ee" }, size: 13 };

  // Data rows
  lanes.forEach((lane) => {
    sheet.addRow([
      lane.origin,
      lane.origin_state,
      lane.destination,
      lane.dest_state,
      lane.equipment,
      lane.weight,
      lane.pickup_date,
      lane.delivery_date,
      lane.notes,
    ]);
  });

  // Add logo & credit line (footer)
  sheet.addRow([]);
  sheet.addRow([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Created by Andrew Connellan – Logistics Account Executive at TQL HQ: Cincinnati, OH",
  ]);

  // Column widths
  RECAP_HEADERS.forEach((_, idx) => {
    sheet.getColumn(idx + 1).width = 16;
  });

  // Write buffer
  return await workbook.xlsx.writeBuffer();
}
