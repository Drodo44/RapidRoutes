import allCities from "../data/allCities.json"; // master freight city database

export function generateCrawlCities(origin, destination) {
  // Filter cities within ~75 miles of origin/destination, prioritize dense freight markets
  const originCandidates = allCities
    .filter((c) => c.market === "strong" && distance(origin, c) <= 75)
    .slice(0, 10);

  const destinationCandidates = allCities
    .filter((c) => c.market === "strong" && distance(destination, c) <= 75)
    .slice(0, 10);

  // Combine intelligently to create balanced postings
  const crawls = [];
  for (let i = 0; i < 10; i++) {
    if (originCandidates[i] && destinationCandidates[i]) {
      crawls.push(originCandidates[i]); // pickup city
    }
  }
  return crawls;
}

function distance(a, b) {
  const R = 3958.8; // miles
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
