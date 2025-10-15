import type { SavedCity } from "../types/database";

export interface NearbyCity extends SavedCity {
  miles: number | null;
}

export interface GroupedCities {
  groups: Record<string, NearbyCity[]>;
  flat: NearbyCity[];
}

type IncomingCity = Partial<NearbyCity> & {
  city?: string | null;
  state?: string | null;
  miles?: number | null;
  kma_code?: string | null;
};

function normalizeCity(city: IncomingCity): NearbyCity | null {
  const name = city.city?.trim();
  const state = city.state?.trim();

  if (!name || !state) {
    return null;
  }

  return {
    city: name,
    state,
    kma_code: city.kma_code ?? null,
    kma_name: city.kma_name ?? null,
    lat: typeof city.lat === "number" ? city.lat : null,
    lon: typeof city.lon === "number" ? city.lon : null,
    miles: typeof city.miles === "number" ? city.miles : null,
    zip: city.zip ?? null,
    zip3: city.zip3 ?? (city.zip ? city.zip.slice(0, 3) : null)
  };
}

function sortCities(cities: NearbyCity[]): NearbyCity[] {
  return [...cities].sort((a, b) => {
    const aMiles = typeof a.miles === "number" ? a.miles : Number.POSITIVE_INFINITY;
    const bMiles = typeof b.miles === "number" ? b.miles : Number.POSITIVE_INFINITY;
    if (aMiles !== bMiles) {
      return aMiles - bMiles;
    }

    const cityComparison = a.city.localeCompare(b.city);
    if (cityComparison !== 0) {
      return cityComparison;
    }

    return a.state.localeCompare(b.state);
  });
}

export function groupAndLimitByKMA(
  cities: IncomingCity[] = [],
  limit = 10
): GroupedCities {
  if (!Array.isArray(cities) || cities.length === 0) {
    return { groups: {}, flat: [] };
  }

  const normalized = cities
    .map(normalizeCity)
    .filter((city): city is NearbyCity => city !== null);

  const sorted = sortCities(normalized);

  const groups: Record<string, NearbyCity[]> = {};
  const flat: NearbyCity[] = [];

  for (const city of sorted) {
    const code = city.kma_code ?? "UNKNOWN";

    if (!groups[code]) {
      groups[code] = [];
    }

    if (groups[code].length >= limit) {
      continue;
    }

    groups[code].push(city);
    flat.push(city);
  }

  return { groups, flat };
}

export default groupAndLimitByKMA;
