import ExcelJS from "exceljs";

export async function generateRecapExcel(lanes) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Active Postings");

  ws.columns = [
    { header: "Origin", key: "origin" },
    { header: "Destination", key: "destination" },
    { header: "Miles", key: "miles" },
    { header: "Equipment", key: "equipment" },
    { header: "Weight", key: "weight" },
    { header: "RRSI Score", key: "rrsi" },
    { header: "Selling Point", key: "sellingPoint" },
  ];

  lanes.forEach((lane) => {
    ws.addRow({
      origin: lane.origin,
      destination: lane.destination,
      miles: lane.miles,
      equipment: lane.equipment,
      weight: lane.weight,
      rrsi: lane.rrsi,
      sellingPoint: lane.sellingPoint,
    });
  });

  ws.footer = {
    center: "Created by Andrew Connellan – Logistics Account Exec at TQL, Cincinnati, OH",
  };

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}
