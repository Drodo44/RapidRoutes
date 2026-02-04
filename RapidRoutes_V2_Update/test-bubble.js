const normalizeCityName = (name) => {
  return (name || '').toLowerCase()
    .replace(/\s+(mkt|market)\s*$/i, '')
    .replace(/\b(ft\.?|fort)\b/g, 'fort')
    .replace(/\b(st\.?|saint)\b/g, 'saint')
    .replace(/\b(mt\.?|mount)\b/g, 'mount')
    .replace(/[^a-z0-9]/g, '');
};

function balanceByKMA(cities, max = 50) {
  const grouped = {};
  for (const c of cities) {
    const kma = c.kma_code || 'UNK';
    if (!grouped[kma]) grouped[kma] = [];
    grouped[kma].push(c);
  }

  // Sort each group by distance BUT prioritize Market City
  for (const kma in grouped) {
    // 1. Sort by distance first
    grouped[kma].sort((a, b) => a.distance - b.distance);
    
    // 2. Find Market City and move to front
    const marketCityIndex = grouped[kma].findIndex(c => {
      if (!c.kma_name) return false;
      const kmaName = normalizeCityName(c.kma_name);
      const cityName = normalizeCityName(c.city);
      const match = kmaName === cityName;
      if (kmaName.includes('lexington')) console.log(`Comparing ${c.city} (${cityName}) to ${c.kma_name} (${kmaName}): ${match}`);
      return match;
    });

    if (marketCityIndex > 0) {
      console.log(`Bubbling ${grouped[kma][marketCityIndex].city} to top!`);
      const marketCity = grouped[kma].splice(marketCityIndex, 1)[0];
      grouped[kma].unshift(marketCity); 
    }
  }

  // Slice logic (mocked)
  const results = [];
  for (const kma in grouped) {
      results.push(...grouped[kma].slice(0, 20)); // Top 20
  }
  return results;
}

const mockCities = [
    { city: 'Francisville', kma_code: 'KY_LEX', kma_name: 'Lexington Mkt', distance: 51 },
    { city: 'Hebron', kma_code: 'KY_LEX', kma_name: 'Lexington Mkt', distance: 54 },
    // ... imagine 20 cities closer than Lexington
    { city: 'Closer Town', kma_code: 'KY_LEX', kma_name: 'Lexington Mkt', distance: 10 },
    { city: 'Lexington', kma_code: 'KY_LEX', kma_name: 'Lexington Mkt', distance: 0 }, // Should bubble even if we appended it last
];

const balanced = balanceByKMA(mockCities);
console.log('Top city in KY_LEX:', balanced[0].city);
