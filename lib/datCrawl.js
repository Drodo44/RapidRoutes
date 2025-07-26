// lib/datcrawl.js
import Papa from "papaparse";

// DAT requires exactly these 24 headers in order
const HEADERS = [
  "Pickup Earliest*",
  "Pickup Latest",
  "Length (ft)*",
  "Weight (lbs)*",
  "Full/Partial*",
  "Equipment*",
  "Use Private Network*",
  "Private Network Rate",
  "Allow Private Network Booking",
  "Allow Private Network Bidding",
  "Use DAT Loadboard*",
  "DAT Loadboard Rate",
  "Allow DAT Loadboard Booking",
  "Use Extended Network",
  "Contact Method*",
  "Origin City*",
  "Origin State*",
  "Origin Postal Code",
  "Destination City*",
  "Destination State*",
  "Destination Postal Code",
  "Comment",
  "Commodity",
  "Reference ID"
];

// Generate DAT-compliant CSV (22 rows per lane: 1 original + 10 crawl cities × 2 contact methods)
export function generateDatCsv(lanes) {
  const rows = [];

  lanes.forEach((lane) => {
    const crawlCities = pickCrawlCities(
      lane.origin_city,
      lane.origin_state,
      lane.dest_city,
      lane.dest_state
    );

    crawlCities.forEach(({ originCity, originState, destCity, destState }) => {
      ["Email", "Primary Phone"].forEach((method) => {
        rows.push([
          lane.pickup_earliest,
          lane.pickup_latest,
          lane.length,
          lane.weight,
          "Full",
          lane.equipment,
          "YES",
          "",
          "YES",
          "YES",
          "YES",
          "",
          "YES",
          "NO",
          method,
          originCity,
          originState,
          lane.origin_zip || "",
          destCity,
          destState,
          lane.dest_zip || "",
          lane.comment || "",
          lane.commodity || "",
          lane.id || ""
        ]);
      });
    });
  });

  return Papa.unparse([HEADERS, ...rows]);
}

// Placeholder crawl city logic (replace later with real freight city intelligence)
function pickCrawlCities(originCity, originState, destCity, destState) {
  const cities = [];
  for (let i = 0; i < 11; i++) {
    cities.push({ originCity, originState, destCity, destState });
  }
  return cities;
}
