// lib/cityUtils.js

import allCities from "../data/allCities.json"; // assumes preloaded KMA/ZIP data

export function getNearbyFreightCities(baseCity, maxRadiusMiles = 75, limit = 10) {
  const base = allCities.find(c => `${c.City}, ${c.State}` === baseCity);
  if (!base) return [];

  const toRad = (val) => (val * Math.PI) / 180;
  const haversine = (a, b) => {
    const R = 3959;
    const dLat = toRad(b.Latitude - a.Latitude);
    const dLon = toRad(b.Longitude - a.Longitude);
    const lat1 = toRad(a.Latitude);
    const lat2 = toRad(b.Latitude);
    const aVal =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
    return R * c;
  };

  const uniqueKMA = new Set();
  const nearby = [];

  for (const city of allCities) {
    const distance = haversine(base, city);
    if (distance <= maxRadiusMiles && !uniqueKMA.has(city.KMA)) {
      uniqueKMA.add(city.KMA);
      nearby.push(city);
      if (nearby.length === limit) break;
    }
  }

  return nearby;
}
