// lib/cityUtils.js
import cities from '../data/allCities.json';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 3959; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getTopCrawlCities(cityState, limit = 10) {
  const [city, state] = cityState.split(',').map((s) => s.trim().toUpperCase());
  const base = cities.find(
    (c) => c.city.toUpperCase() === city && c.state.toUpperCase() === state
  );
  if (!base) return [];

  const withinRadius = cities
    .map((c) => ({
      ...c,
      distance: haversineDistance(base.lat, base.lon, c.lat, c.lon),
    }))
    .filter((c) => c.distance <= 75 && `${c.city},${c.state}` !== `${city},${state}`)
    .sort((a, b) => b.freight_score - a.freight_score);

  const seenKmas = new Set();
  const uniqueKma = withinRadius.filter((c) => {
    if (!c.kma || seenKmas.has(c.kma)) return false;
    seenKmas.add(c.kma);
    return true;
  });

  return uniqueKma.slice(0, limit).map((c) => `${c.city}, ${c.state}`);
}
