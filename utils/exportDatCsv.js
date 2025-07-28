import Papa from "papaparse";
import { supabase } from "./supabaseClient";

// 24-column DAT template, fixed headers
const HEADERS = [
  "Pickup Earliest*","Pickup Latest","Length (ft)*","Weight (lbs)*","Full/Partial*",
  "Equipment*","Use Private Network*","Private Network Rate","Allow Private Network Booking",
  "Allow Private Network Bidding","Use DAT Loadboard*","DAT Loadboard Rate",
  "Allow DAT Loadboard Booking","Use Extended Network","Contact Method*",
  "Origin City*","Origin State*","Origin Postal Code",
  "Destination City*","Destination State*","Destination Postal Code",
  "Comment","Commodity","Reference ID"
];

// Generate 10 crawl cities (via Supabase function), 22 rows per lane
async function getCrawlCities(origin, dest) {
  const { data, error } = await supabase.rpc("fetch_nearby_cities", {
    origin_city: origin, dest_city: dest, radius_miles: 75
  });
  if (error) throw error;
  return data || [];
}

export default async function exportDatCsv(lanes) {
  let rows = [];

  for (const lane of lanes) {
    const crawls = await getCrawlCities(lane.origin_city, lane.dest_city);

    const postings = [
      { pickup: lane.origin_city, drop: lane.dest_city, origin_zip: lane.origin_zip, dest_zip: lane.dest_zip },
      ...crawls.slice(0, 10).map(c => ({
        pickup: c.origin_city, drop: c.dest_city, origin_zip: c.origin_zip, dest_zip: c.dest_zip
      }))
    ];

    postings.forEach((p) => {
      ["Email", "Primary Phone"].forEach((method) => {
        rows.push([
          lane.date, lane.date, lane.length,
          lane.weight ? lane.weight : Math.floor(Math.random() * (48000 - 46750 + 1)) + 46750,
          "Full", lane.equipment, "Yes","","Yes","Yes","Yes","","Yes","","",method,
          p.pickup, lane.origin_state, p.origin_zip,
          p.drop, lane.dest_state, p.dest_zip,
          lane.comment || "", "", ""
        ]);
      });
    });
  }

  const csv = Papa.unparse({ fields: HEADERS, data: rows });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  return url;
}
