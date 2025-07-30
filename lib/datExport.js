// /lib/datExport.js

import Papa from "papaparse";
import EQUIPMENT_TYPES from "../data/equipmentTypes";

const DAT_COLUMNS = [
  "Pickup Earliest*", "Pickup Latest", "Length (ft)*", "Weight (lbs)*",
  "Full/Partial*", "Equipment*", "Use Private Network*", "Private Network Rate",
  "Allow Private Network Booking", "Allow Private Network Bidding", "Use DAT Loadboard*", "DAT Loadboard Rate",
  "Allow DAT Loadboard Booking", "Use Extended Network", "Contact Method*",
  "Origin City*", "Origin State*", "Origin Postal Code", "Destination City*",
  "Destination State*", "Destination Postal Code", "Comment", "Commodity", "Reference ID"
];

// Helper: get code label from code
function getEquipmentLabel(code) {
  const found = EQUIPMENT_TYPES.find(e => e.code === code);
  return found ? found.desc : code;
}

// Takes an array of lane objects and returns the correct CSV text
export function generateDatCsv(lanes) {
  const rows = [];

  lanes.forEach(lane => {
    // Generate two rows per lane: Email, Primary Phone
    ["Email", "Primary Phone"].forEach(contactMethod => {
      rows.push([
        lane.earliest || "",
        lane.latest || "",
        lane.length || "",
        lane.randomize
          ? Math.floor(
              Math.random() * (Number(lane.weightMax) - Number(lane.weightMin) + 1)
            ) + Number(lane.weightMin)
          : lane.weight || "",
        "Full", // or "Partial" if you ever want to support that field
        lane.equipment,
        "YES", "", "NO", "NO",
        "YES", "", "NO", "NO",
        contactMethod,
        lane.originCity,
        lane.originState,
        lane.originZip,
        lane.destCity,
        lane.destState,
        lane.destZip,
        lane.comment || "",
        "", // Commodity (optional)
        ""  // Reference ID (optional)
      ]);
    });
  });

  return Papa.unparse({
    fields: DAT_COLUMNS,
    data: rows
  });
}
