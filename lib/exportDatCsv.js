// lib/exportDatCsv.js

import { getNearbyFreightCities } from "./cityUtils";

function randomWeight(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createDatRow(lane, origin, destination, contactMethod, weight) {
  return {
    "Pickup Earliest*": lane.date,
    "Pickup Latest": lane.date,
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
    "Allow DAT Loadboard Booking": "No",
    "Use Extended Network": "No",
    "Contact Method*": contactMethod,
    "Origin City*": origin.City,
    "Origin State*": origin.State,
    "Origin Postal Code": origin.ZIP,
    "Destination City*": destination.City,
    "Destination State*": destination.State,
    "Destination Postal Code": destination.ZIP,
    "Comment": lane.comment || "",
    "Commodity": "",
    "Reference ID": `RR-${lane.id}`,
  };
}

export function generateDatPostings(lanes, weightMin = 46750, weightMax = 48000) {
  const allRows = [];

  for (const lane of lanes) {
    const originOptions = getNearbyFreightCities(lane.origin, 75, 10);
    const destOptions = getNearbyFreightCities(lane.destination, 75, 10);
    const baseOrigin = originOptions[0];
    const baseDest = destOptions[0];

    const crawlPairs = [{ origin: baseOrigin, dest: baseDest }, ...Array.from({ length: 10 }, (_, i) => ({
      origin: originOptions[i % originOptions.length],
      dest: destOptions[i % destOptions.length],
    }))];

    for (const pair of crawlPairs) {
      const weight = randomWeight(weightMin, weightMax);
      allRows.push(createDatRow(lane, pair.origin, pair.dest, "Email", weight));
      allRows.push(createDatRow(lane, pair.origin, pair.dest, "Primary Phone", randomWeight(weightMin, weightMax)));
    }
  }

  return allRows;
}
