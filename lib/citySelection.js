export function normalizeCityName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+(mkt|market)\s*$/i, '')
    .replace(/^n[\.\s]+/, 'north ')
    .replace(/^s[\.\s]+/, 'south ')
    .replace(/^e[\.\s]+/, 'east ')
    .replace(/^w[\.\s]+/, 'west ')
    .replace(/\b(ft\.?|fort)\b/g, 'fort')
    .replace(/\b(st\.?|saint)\b/g, 'saint')
    .replace(/\b(mt\.?|mount)\b/g, 'mount')
    .replace(/[^a-z0-9]/g, '');
}

export function getCityState(city) {
  return city?.state || city?.state_or_province || '';
}

export function buildCityOptionId(city) {
  if (!city) return '';
  const id = city.id ?? `${city.city || 'city'}-${getCityState(city) || 'state'}`;
  const cityName = city.city || '';
  const state = getCityState(city);
  return `${id}-${cityName}-${state}`;
}

function cityLookupKey(city) {
  return `${String(city?.city || '').trim().toLowerCase()}|${String(getCityState(city) || '').trim().toLowerCase()}`;
}

export function groupCitiesByKma(options = []) {
  const grouped = {};
  options.forEach((option) => {
    const kma = option?.kma_code || 'UNKNOWN';
    if (!grouped[kma]) grouped[kma] = [];
    grouped[kma].push(option);
  });
  return grouped;
}

export function findBestCity(cities = []) {
  if (!Array.isArray(cities) || cities.length === 0) return null;

  const marketCity = cities.find((city) => {
    if (!city?.kma_name) return false;
    return normalizeCityName(city.kma_name) === normalizeCityName(city.city);
  });

  if (marketCity) return marketCity;

  return cities.reduce((best, city) => {
    if (!best) return city;
    return Number(city?.distance || 0) < Number(best?.distance || 0) ? city : best;
  }, null);
}

export function buildSmartSelectionIds(originOptions = [], destOptions = []) {
  const originsByKma = groupCitiesByKma(originOptions);
  const destsByKma = groupCitiesByKma(destOptions);

  const originIds = [];
  const destinationIds = [];

  Object.values(originsByKma).forEach((cities) => {
    const best = findBestCity(cities);
    if (best) originIds.push(buildCityOptionId(best));
  });

  Object.values(destsByKma).forEach((cities) => {
    const best = findBestCity(cities);
    if (best) destinationIds.push(buildCityOptionId(best));
  });

  return { originIds, destinationIds };
}

export function hydrateSelectionIdsFromSavedCities(savedCities = [], options = []) {
  if (!Array.isArray(savedCities) || savedCities.length === 0 || !Array.isArray(options) || options.length === 0) {
    return [];
  }

  const optionLookup = new Map();
  options.forEach((option) => {
    optionLookup.set(cityLookupKey(option), buildCityOptionId(option));
  });

  const hydrated = [];
  savedCities.forEach((savedCity) => {
    const optionId = optionLookup.get(cityLookupKey(savedCity));
    if (optionId) hydrated.push(optionId);
  });

  return hydrated;
}

export function mapSelectionIdsToSavedCities(selectionIds = [], options = []) {
  if (!Array.isArray(selectionIds) || selectionIds.length === 0 || !Array.isArray(options) || options.length === 0) {
    return [];
  }

  const byId = new Map();
  options.forEach((option) => {
    byId.set(buildCityOptionId(option), option);
  });

  return selectionIds
    .map((selectionId) => byId.get(selectionId))
    .filter(Boolean)
    .map((city) => ({
      id: city.id,
      city: city.city,
      state: getCityState(city),
      zip: city.zip,
      kma_code: city.kma_code,
      latitude: city.latitude,
      longitude: city.longitude,
      distance: city.distance
    }));
}
