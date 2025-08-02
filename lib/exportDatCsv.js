import Papa from "papaparse";
import { getCrawlCities } from "./cityUtils";

export async function generateDatCsv(lanes, options = {}) {
  const rows = [];
  for (const lane of lanes) {
    const {
      origin,
      destination,
      equipment,
      length,
      baseWeight,
      randomizeWeight,
      randomLow,
      randomHigh,
      dateEarliest,
      dateLatest,
      commodity,
      fullPartial = "Full",
    } = lane;

    const crawlCities = await getCrawlCities(origin, destination);
    for (const contactMethod of ["Email", "Primary Phone"]) {
      for (const { pickup, delivery } of crawlCities) {
        rows.push({
          "Pickup Earliest*": dateEarliest,
          "Pickup Latest": dateLatest,
          "Length (ft)*": length,
          "Weight (lbs)*": randomizeWeight
            ? Math.floor(Math.random() * (randomHigh - randomLow + 1) + randomLow)
            : baseWeight,
          "Full/Partial*": fullPartial,
          "Equipment*": equipment,
          "Use Private Network*": "NO",
          "Private Network Rate": "",
          "Allow Private Network Booking": "",
          "Allow Private Network Bidding": "",
          "Use DAT Loadboard*": "YES",
          "DAT Loadboard Rate": "",
          "Allow DAT Loadboard Booking": "",
          "Use Extended Network": "",
          "Contact Method*": contactMethod,
          "Origin City*": pickup.city,
          "Origin State*": pickup.state,
          "Origin Postal Code": pickup.zip,
          "Destination City*": delivery.city,
          "Destination State*": delivery.state,
          "Destination Postal Code": delivery.zip,
          Comment: "",
          Commodity: commodity || "",
          "Reference ID": "",
        });
      }
    }
  }

  const csv = Papa.unparse(rows, {
    columns: [
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
      "Reference ID",
    ],
  });

  return csv;
}
