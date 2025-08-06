import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RecapExportButtons({ lanes }) {
  const exportToExcel = () => {
    const data = lanes.map((lane) => ({
      Origin: `${lane.originCity}, ${lane.originState}`,
      Destination: `${lane.destCity}, ${lane.destState}`,
      Equipment: lane.equipment,
      Weight: lane.weight,
      Length: lane.length,
      Date: lane.date,
      Comment: lane.comment || "",
    }));

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Recap");
    writeFile(wb, "Active_Postings.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Active Postings Recap", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["Origin", "Destination", "Equipment", "Weight", "Length", "Date", "Comment"]],
      body: lanes.map((lane) => [
        `${lane.originCity}, ${lane.originState}`,
        `${lane.destCity}, ${lane.destState}`,
        lane.equipment,
        lane.weight,
        lane.length,
        lane.date,
        lane.comment || "",
      ]),
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    doc.setFontSize(8);
    doc.text("Created by Andrew Connellan – Logistics Account Executive at Total Quality Logistics HQ: Cincinnati, OH", 14, doc.internal.pageSize.height - 10);

    doc.save("Active_Postings.pdf");
  };

  return (
    <div className="flex gap-4 mb-6 justify-center">
      <button onClick={exportToExcel} className="bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-lg text-white font-semibold">
        Export to Excel
      </button>
      <button onClick={exportToPDF} className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-white font-semibold">
        Export to PDF
      </button>
    </div>
  );
}
