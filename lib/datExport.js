// lib/datExport.js
import Papa from 'papaparse';

const DAT_HEADERS = [
  "Pickup Earliest*", "Pickup Latest", "Length (ft)*", "Weight (lbs)*", "Full/Partial*", "Equipment*", "Use Private Network*",
  "Private Network Rate", "Allow Private Network Booking", "Allow Private Network Bidding", "Use DAT Loadboard*", "DAT Loadboard Rate",
  "Allow DAT Loadboard Booking", "Use Extended Network", "Contact Method*", "Origin City*", "Origin State*", "Origin Postal Code",
  "Destination City*", "Destination State*", "Destination Postal Code", "Comment", "Commodity", "Reference ID"
];

function generateRandomWeight() {
  return Math.floor(Math.random() * (48000 - 46750 + 1)) + 46750;
}

function duplicateRow(row) {
  const emailRow = { ...row, "Contact Method*": "Email" };
  const phoneRow = { ...row, "Contact Method*": "Primary Phone" };
  return [emailRow, phoneRow];
}

export function generateDATCsv(lanes) {
  const rows = [];

  for (const lane of lanes) {
    const base = {
      "Pickup Earliest*": lane.earliest || "",
      "Pickup Latest": lane.latest || "",
      "Length (ft)*": lane.length,
      "Weight (lbs)*": lane.randomize ? generateRandomWeight() : lane.weight,
      "Full/Partial*": "Full",
      "Equipment*": lane.equipment,
      "Use Private Network*": "NO",
      "Private Network Rate": "",
      "Allow Private Network Booking": "NO",
      "Allow Private Network Bidding": "NO",
      "Use DAT Loadboard*": "YES",
      "DAT Loadboard Rate": "",
      "Allow DAT Loadboard Booking": "YES",
      "Use Extended Network": "NO",
      "Origin City*": lane.originCity,
      "Origin State*": lane.originState,
      "Origin Postal Code": lane.originZip,
      "Destination City*": lane.destCity,
      "Destination State*": lane.destState,
      "Destination Postal Code": lane.destZip,
      "Comment": lane.comment || "",
      "Commodity": "",
      "Reference ID": ""
    };

    rows.push(...duplicateRow(base));
  }

  const csv = Papa.unparse({ fields: DAT_HEADERS, data: rows.map(row => DAT_HEADERS.map(h => row[h] || "")) });
  return csv;
}

export function downloadCsv(csv, filename = "DAT_Upload.csv") {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.click();
}
