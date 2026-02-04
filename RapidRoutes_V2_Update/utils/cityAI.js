// utils/cityAI.js

import allCities from "../data/allCities.json"; // Preloaded dataset with lat/lon/market info

export function getTopCrawlCities(baseCity, radius = 75, count = 10) {
  const origin = allCities.find(c => c.city === baseCity.city && c.state === baseCity.state);
  if (!origin) return [];

  const filtered = allCities.filter((c) => {
    const dist = getDistance(origin.lat, origin.lon, c.lat, c.lon);
    return dist <= radius && c.kma !== origin.kma;
  });

  const uniqueMarkets = {};
  for (let city of filtered) {
    if (!uniqueMarkets[city.kma]) {
      uniqueMarkets[city.kma] = city;
    }
  }

  return Object.values(uniqueMarkets).slice(0, count);
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 69; // approx miles per deg lat
  const dx = lat1 - lat2;
  const dy = (lon1 - lon2) * Math.cos((lat1 + lat2) / 2);
  return Math.sqrt(dx * dx + dy * dy) * R;
}
