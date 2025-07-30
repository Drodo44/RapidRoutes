// lib/datExport.js
import Papa from "papaparse";

// Helper to generate correct CSV fields per your DAT template (edit as needed!)
export function generateDATCsv(lanes) {
  // Your official DAT template fields here
  const headers = [
    "Pickup Earliest*", "Pickup Latest", "Length (ft)*", "Weight (lbs)*", "Full/Partial*",
    "Equipment*", "Use Private Network*", "Private Network Rate", "Allow Private Network Booking", "Allow Private Network Bidding",
    "Use DAT Loadboard*", "DAT Loadboard Rate", "Allow DAT Loadboard Booking", "Use Extended Network", "Contact Method*",
    "Origin City*", "Origin State*", "Origin Postal Code", "Destination City*", "Destination State*", "Destination Postal Code",
    "Comment", "Commodity", "Reference ID"
  ];

  // Build rows for each lane
  const rows = lanes.map(lane => [
    lane.earliest,
    lane.latest,
    lane.length,
    lane.weight,
    "Full", // example: hardcoded; update as needed
    lane.equipment,
    "YES", "", "NO", "NO", // Private Network options
    "YES", "", "NO", "NO", // DAT Loadboard options
    "Email", // Contact Method (example, update as needed)
    lane.origin.split(",")[0],
    lane.origin.split(",")[1]?.trim(),
    lane.originZip,
    lane.dest.split(",")[0],
    lane.dest.split(",")[1]?.trim(),
    lane.destZip,
    lane.comment,
    "", // Commodity (if needed)
    ""  // Reference ID (if needed)
  ]);

  // Use PapaParse to export
  const csv = Papa.unparse({ fields: headers, data: rows });
  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "DAT_Postings.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
