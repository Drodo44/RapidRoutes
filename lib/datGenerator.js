// lib/datGenerator.js
import { stringify } from "csv-stringify/sync";

const contactMethods = ["Email", "Primary Phone"];

export function generateDATCSV(lane) {
  const {
    origin_city,
    origin_state,
    origin_zip,
    dest_city,
    dest_state,
    dest_zip,
    equipment,
    weight,
    length,
    date,
  } = lane;

  const crawlMarketsOrigin = getNearbyMarkets(origin_city, origin_state);
  const crawlMarketsDest = getNearbyMarkets(dest_city, dest_state);

  const entries = [];

  for (let i = 0; i < 11; i++) {
    const pickup = i === 0
      ? { city: origin_city, state: origin_state, zip: origin_zip }
      : crawlMarketsOrigin[i - 1];
    const delivery = i === 0
      ? { city: dest_city, state: dest_state, zip: dest_zip }
      : crawlMarketsDest[i - 1];

    contactMethods.forEach((method) => {
      entries.push({
        "Origin City*": pickup.city,
        "Origin State*": pickup.state,
        "Origin ZIP Code": pickup.zip,
        "Destination City*": delivery.city,
        "Destination State*": delivery.state,
        "Destination ZIP Code": delivery.zip,
        "Truck Type*": equipment,
        "Length (ft)*": length,
        "Weight (lbs)*": weight,
        "Date Available*": date,
        "Contact Method": method,
        "Rate": "",
        "Comments": ""
      });
    });
  }

  const csv = stringify(entries, {
    header: true,
    columns: [
      "Origin City*",
      "Origin State*",
      "Origin ZIP Code",
      "Destination City*",
      "Destination State*",
      "Destination ZIP Code",
      "Truck Type*",
      "Length (ft)*",
      "Weight (lbs)*",
      "Date Available*",
      "Contact Method",
      "Rate",
      "Comments",
    ]
  });

  return csv;
}

// TEMP: Fake crawl logic (replace with real KMA/city logic later)
function getNearbyMarkets(city, state) {
  const samples = [
    { city: "Aurora", state, zip: "60506" },
    { city: "Elgin", state, zip: "60120" },
    { city: "Naperville", state, zip: "60540" },
    { city: "Schaumburg", state, zip: "60173" },
    { city: "Cicero", state, zip: "60804" },
    { city: "Oak Lawn", state, zip: "60453" },
    { city: "Wheaton", state, zip: "60187" },
    { city: "Evanston", state: "IL", zip: "60201" },
    { city: "Skokie", state: "IL", zip: "60076" },
    { city: "Berwyn", state: "IL", zip: "60402" },
  ];
  return samples.slice(0, 10);
}
