import { supabase } from "../../utils/supabaseClient";
import Papa from "papaparse";
import { generateCrawlCities } from "../../lib/datcrawl";

export default async function handler(req, res) {
  const { data: lanes } = await supabase.from("lanes").select("*").eq("status", "active");

  if (!lanes) {
    return res.status(500).json({ error: "No lanes found." });
  }

  const rows = [];

  for (const lane of lanes) {
    const crawlCities = generateCrawlCities(lane.origin, lane.destination);

    const postings = [lane.origin, ...crawlCities].slice(0, 11); // 1 original + 10 crawl

    postings.forEach((pickupCity) => {
      ["Email", "Primary Phone"].forEach((contactMethod) => {
        const weight = lane.randomize
          ? Math.floor(Math.random() * (lane.weightMax - lane.weightMin + 1)) + lane.weightMin
          : lane.weight;

        rows.push({
          "Pickup Earliest*": lane.earliest,
          "Pickup Latest": lane.latest,
          "Length (ft)*": lane.length,
          "Weight (lbs)*": weight,
          "Full/Partial*": "Full",
          "Equipment*": lane.equipment,
          "Use Private Network*": "Yes",
          "Private Network Rate": "",
          "Allow Private Network Booking": "Yes",
          "Allow Private Network Bidding": "Yes",
          "Use DAT Loadboard*": "Yes",
          "DAT Loadboard Rate": "",
          "Allow DAT Loadboard Booking": "Yes",
          "Use Extended Network": "No",
          "Contact Method*": contactMethod,
          "Origin City*": pickupCity.city,
          "Origin State*": pickupCity.state,
          "Origin Postal Code": pickupCity.zip,
          "Destination City*": lane.destination,
          "Destination State*": lane.destinationState || "",
          "Destination Postal Code": lane.destinationZip || "",
          "Comment": lane.notes || "",
          "Commodity": "",
          "Reference ID": lane.id,
        });
      });
    });
  }

  const csv = Papa.unparse(rows, { header: true });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="DAT_Postings.csv"');
  res.status(200).send(csv);
}
