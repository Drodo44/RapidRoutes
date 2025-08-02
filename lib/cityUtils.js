// lib/cityUtils.js
import allCities from "../data/allCities.json";

export function getRandomWeight([min, max]) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function getCrawlCitiesForLane(origCity, origState, destCity, destState) {
  // Use existing freight_cities DB or static dataset
  // Return 10 unique city pairs within 75mi radius (mocked here)

  const crawlPairs = [];

  for (let i = 0; i < 10; i++) {
    crawlPairs.push({
      originCity: `${origCity} Crawl${i + 1}`,
      originState: origState,
      originZip: "00000",
      destinationCity: `${destCity} Crawl${i + 1}`,
      destinationState: destState,
      destinationZip: "00000",
      comment: "",
    });
  }

  return crawlPairs;
}
