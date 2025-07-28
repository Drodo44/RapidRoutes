import Papa from "papaparse";
import { supabase } from "./supabaseClient";

// Your official DAT header order (24 fields, permanent)
const HEADERS = [
  "Pickup Earliest*","Pickup Latest","Length (ft)*","Weight (lbs)*","Full/Partial*",
  "Equipment*","Use Private Network*","Private Network Rate","Allow Private Network Booking",
  "Allow Private Network Bidding","Use DAT Loadboard*","DAT Loadboard Rate",
  "Allow DAT Loadboard Booking","Use Extended Network","Contact Method*",
  "Origin City*","Origin State*","Origin Postal Code",
  "Destination City*","Destination State*","Destination Postal Code",
  "Comment","Commodity","Reference ID"
];

// Master scoring: Higher = better freight visibility, market depth, and carrier call-ins
function scoreCity(city) {
  // Use these criteria — all must exist in your Supabase `cities` table
  // Example: city.freight_density, city.kma_score, city.highway_proximity, city.reload_score, city.seasonal_boost
  // For this template: assign mock logic, replace with real columns as needed
  let score = 0;
  if (city.freight_density) score += city.freight_density * 2;
  if (city.kma_score) score += city.kma_score * 1.2;
  if (city.highway_proximity) score += city.highway_proximity * 1.2;
  if (city.reload_score) score += city.reload_score;
  if (city.seasonal_boost) score += city.seasonal_boost;
  // Add AI weightings here if needed
  return score;
}

// Given a lane, fetch 10 unique crawl cities (Supabase fn: fetch_nearby_cities)
async function getCrawlCities(origin, dest) {
  // Example: RPC returns array of city objects
  const { data, error } = await supabase.rpc("fetch_nearby_cities", {
    origin_city: origin,
    dest_city: dest,
    radius_miles: 75
  });
  if (error) throw error;
  // Score and sort cities
  const scored = (data || []).map(city => ({
    ...city,
    _score: scoreCity(city)
  }));
  // Top 10 unique by KMA/ZIP/city
  const uniqueBy = {};
  const sorted = scored.sort((a, b) => b._score - a._score);
  const top10 = [];
  for (const city of sorted) {
    const key = `${city.city}_${city.kma}_${city.zip}`;
    if (!uniqueBy[key] && top10.length < 10) {
      uniqueBy[key] = true;
      top10.push(city);
    }
  }
  return top10;
}

export default async function exportDatCsv(lanes) {
  let rows = [];

  for (const lane of lanes) {
    // 1 original + 10 crawls = 11
    const crawls = await getCrawlCities(lane.origin_city, lane.dest_city);

    const postings = [
      { 
        pickup: lane.origin_city,
        drop: lane.dest_city,
        origin_zip: lane.origin_zip,
        dest_zip: lane.dest_zip,
        kma: lane.kma,
        rscore: 95 // Highest for the base lane (can replace w/ true scoring)
      },
      ...crawls.map((c) => ({
        pickup: c.city,
        drop: lane.dest_city,
        origin_zip: c.zip,
        dest_zip: lane.dest_zip,
        kma: c.kma,
        rscore: c._score || 85
      }))
    ];

    postings.forEach((p) => {
      ["Email", "Primary Phone"].forEach((method) => {
        rows.push([
          lane.date, lane.date, lane.length,
          lane.weight ? lane.weight : Math.floor(Math.random() * (48000 - 46750 + 1)) + 46750,
          "Full", lane.equipment, "Yes","","Yes","Yes","Yes","","Yes","",method,
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
