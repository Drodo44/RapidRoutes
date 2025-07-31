// utils/sellingPoints.js

const laneInsights = [
  {
    origin: "McAllen, TX",
    dest: "Chicago, IL",
    reason: "South Texas produce surge creates above-average demand through the Midwest corridor."
  },
  {
    origin: "Savannah, GA",
    dest: "Atlanta, GA",
    reason: "Port congestion in Savannah is pushing short-haul reefer rates upward in-state."
  },
  {
    origin: "Fresno, CA",
    dest: "Dallas, TX",
    reason: "California stone fruit and nut harvests increase summer reefer volume heading to Texas."
  }
];

export function getSellingPoint(origin, dest, metadata) {
  const match = laneInsights.find(
    (lane) =>
      lane.origin.toLowerCase() === origin.toLowerCase() &&
      lane.dest.toLowerCase() === dest.toLowerCase()
  );

  return match ? match.reason : null;
}
