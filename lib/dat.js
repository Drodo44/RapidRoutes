import Papa from "papaparse";

// Column order from your absolute DAT Bulk Posting Template
const DAT_HEADERS = [
  "Pickup Earliest*", "Pickup Latest", "Length (ft)*", "Weight (lbs)*", "Full/Partial*", "Equipment*",
  "Use Private Network*", "Private Network Rate", "Allow Private Network Booking", "Allow Private Network Bidding",
  "Use DAT Loadboard*", "DAT Loadboard Rate", "Allow DAT Loadboard Booking", "Use Extended Network", "Contact Method*",
  "Origin City*", "Origin State*", "Origin Postal Code", "Destination City*", "Destination State*", "Destination Postal Code",
  "Comment", "Commodity", "Reference ID"
];

// Main CSV generator
export function generateDatCsv(lanes = []) {
  const rows = [];
  lanes.forEach((lane) => {
    // TODO: Insert your 1+10 crawl logic, city AI, ZIP/KMA, weight/equipment field mapping here
    // This is a minimal row for testing, expand as needed
    rows.push({
      "Pickup Earliest*": lane.pickup_date || "",
      "Pickup Latest": lane.delivery_date || "",
      "Length (ft)*": "48", // or lane.length
      "Weight (lbs)*": lane.weight || "",
      "Full/Partial*": "Full", // or from lane
      "Equipment*": lane.equipment || "",
      "Use Private Network*": "No",
      "Private Network Rate": "",
      "Allow Private Network Booking": "",
      "Allow Private Network Bidding": "",
      "Use DAT Loadboard*": "Yes",
      "DAT Loadboard Rate": "",
      "Allow DAT Loadboard Booking": "",
      "Use Extended Network": "",
      "Contact Method*": "Email",
      "Origin City*": lane.origin,
      "Origin State*": lane.origin_state,
      "Origin Postal Code": lane.origin_zip || "",
      "Destination City*": lane.destination,
      "Destination State*": lane.dest_state,
      "Destination Postal Code": lane.dest_zip || "",
      "Comment": lane.notes || "",
      "Commodity": lane.commodity || "",
      "Reference ID": lane.id || ""
    });
  });

  // Build CSV string (headers must match template order)
  return Papa.unparse({
    fields: DAT_HEADERS,
    data: rows.map(r => DAT_HEADERS.map(h => r[h] || "")),
  });
}
