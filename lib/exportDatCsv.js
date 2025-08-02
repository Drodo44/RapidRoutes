// lib/exportDatCsv.js
import Papa from "papaparse";
import { getRandomWeight, getCrawlCitiesForLane } from "./cityUtils";
import { format } from "date-fns";

export async function generateDatCsv(lanes, globalWeightRange = null) {
  const rows = [];

  for (const lane of lanes) {
    const {
      originCity,
      originState,
      destinationCity,
      destinationState,
      equipment,
      date,
      fullPartial,
      length,
      weight,
      randomizeWeight,
    } = lane;

    const crawlCities = await getCrawlCitiesForLane(originCity, originState, destinationCity, destinationState);

    const postings = [lane, ...crawlCities]; // 1 original + 10 crawls

    for (const post of postings) {
      const actualWeight = randomizeWeight
        ? getRandomWeight(globalWeightRange || [46750, 48000])
        : weight;

      const baseRow = {
        "Pickup Earliest*": format(new Date(date), "MM/dd/yyyy"),
        "Pickup Latest": format(new Date(date), "MM/dd/yyyy"),
        "Length (ft)*": length || 48,
        "Weight (lbs)*": actualWeight,
        "Full/Partial*": fullPartial || "Full",
        "Equipment*": equipment || "FD",
        "Use Private Network*": "NO",
        "Private Network Rate": "",
        "Allow Private Network Booking": "NO",
        "Allow Private Network Bidding": "NO",
        "Use DAT Loadboard*": "YES",
        "DAT Loadboard Rate": "",
        "Allow DAT Loadboard Booking": "NO",
        "Use Extended Network": "",
        "Contact Method*": "",
        "Origin City*": post.originCity,
        "Origin State*": post.originState,
        "Origin Postal Code": post.originZip,
        "Destination City*": post.destinationCity,
        "Destination State*": post.destinationState,
        "Destination Postal Code": post.destinationZip,
        "Comment": post.comment || "",
        "Commodity": "",
        "Reference ID": "",
      };

      rows.push({ ...baseRow, "Contact Method*": "Email" });
      rows.push({ ...baseRow, "Contact Method*": "Primary Phone" });
    }
  }

  const csv = Papa.unparse(rows, { quotes: false });
  return csv;
}
