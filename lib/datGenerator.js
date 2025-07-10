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
    date
  } = lane;

  const crawlOrigins = getNearbyMarkets(origin_city, origin_state, origin_zip);
  const crawlDestinations = getNearbyMarkets(dest_city, dest_state, dest_zip);

  const entries = [];

  for (let i = 0; i < 11; i++) {
    const pickup = i === 0 ? { city: origin_city, state: origin_state, zip: origin_zip } : crawlOrigins[i - 1];
    const delivery = i === 0 ? { city: dest_city, state: dest_state, zip: dest_zip } : crawlDestinations[i - 1];

    contactMethods.forEach((method) => {
      entries.push({
        "Pickup Earliest*": date,
        "Pickup Latest": date,
        "Length (ft)*": length,
        "Weight (lbs)*": weight,
        "Full/Partial*": "Full",
        "Equipment*": equipment,
        "Use Private Network*": "no",
        "Private Network Rate": "",
        "Allow Private Network Booking": "",
        "Allow Private Network Bidding": "",
        "Use DAT Loadboard*": "yes",
        "DAT Loadboard Rate": "",
        "Allow DAT Loadboard Booking": "",
        "Use Extended Network": "",
        "Contact Method*": method,
        "Origin City*": pickup.city,
        "Origin State*": pickup.state,
        "Origin Postal Code": pickup.zip,
        "Destination City*": delivery.city,
        "Destination State*": delivery.state,
        "Destination Postal Code": delivery.zip,
        "Comment": "",
        "Commodity": "",
        "Reference ID": ""
      });
    });
  }

  const csv = stringify(entries, {
    header: true,
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
      "Reference ID"
    ]
  });

  return csv;
}

// TEMPORARY – Replace with real 75-mile radius KMA crawl logic
function getNearbyMarkets(city, state, zip) {
  return [
    { city: "Aurora", state, zip: "60506" },
    { city: "Elgin", state, zip: "60120" },
    { city: "Naperville", state, zip: "60540" },
    { city: "Schaumburg", state, zip: "60173" },
    { city: "Cicero", state, zip: "60804" },
    { city: "Oak Lawn", state, zip: "60453" },
    { city: "Wheaton", state, zip: "60187" },
    { city: "Evanston", state, zip: "60201" },
    { city: "Skokie", state, zip: "60076" },
    { city: "Berwyn", state, zip: "60402" }
  ];
}
