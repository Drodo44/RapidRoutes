// lib/intermodalAdvisor.js

const railRamps = [
  { city: "Atlanta", state: "GA", zip: "30336" },
  { city: "Dallas", state: "TX", zip: "75212" },
  { city: "Chicago", state: "IL", zip: "60638" },
  { city: "Los Angeles", state: "CA", zip: "90058" },
  { city: "New Jersey", state: "NJ", zip: "07105" },
  { city: "Kansas City", state: "MO", zip: "64120" },
  { city: "Memphis", state: "TN", zip: "38118" },
  { city: "St. Louis", state: "MO", zip: "63147" },
  { city: "Portland", state: "OR", zip: "97218" },
  { city: "Seattle", state: "WA", zip: "98108" },
  { city: "Salt Lake City", state: "UT", zip: "84104" },
];

function zipMatch(zip1, zip2, range = 40) {
  const z1 = parseInt(zip1.slice(0, 3));
  const z2 = parseInt(zip2.slice(0, 3));
  return Math.abs(z1 - z2) <= Math.ceil(range / 10);
}

export function isIntermodalCandidate({ origin_zip, dest_zip, weight, miles }) {
  if (!origin_zip || !dest_zip || !weight || !miles) return false;

  const isDistanceGood = miles >= 650;
  const isWeightGood = parseInt(weight) <= 43500;

  const nearOriginRamp = railRamps.some(r => zipMatch(r.zip, origin_zip));
  const nearDestRamp = railRamps.some(r => zipMatch(r.zip, dest_zip));

  return isDistanceGood && isWeightGood && nearOriginRamp && nearDestRamp;
}
