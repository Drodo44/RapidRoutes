import type { SavedCity } from "../types/database";
import { MAJOR_HUBS, FREIGHT_KEYWORDS, DENSE_STATES } from "./freightHubs";

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
  kma_name?: string | null;
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

// Calculate a sorting score (Higher is better)
function calculateSortScore(city: NearbyCity): number {
  let score = 0;
  
  if (!city.city) return 0;
  const cityName = city.city.toLowerCase().trim();
  
  // 1. Key City (Namesake matches KMA) - Priority #1 (Score: 2000+)
  if (city.kma_name) {
    const kmaBase = city.kma_name.replace(/\s+(Mkt|Market|Metro)$/i, "").toLowerCase().trim();
    if (kmaBase === cityName) score += 2000;
    else if (kmaBase.startsWith(cityName)) score += 1900;
  }
  
  // 2. Major Hub Check - Priority #2 (Score: 1000)
  if (MAJOR_HUBS.has(cityName)) {
    score += 1000;
  }
  
  // 3. Keyword Check - Priority #3 (Score: 50)
  if (FREIGHT_KEYWORDS.some(kw => cityName.includes(kw))) {
    score += 50;
  }
  
  return score;
}

function sortCities(cities: NearbyCity[]): NearbyCity[] {
  return [...cities].sort((a, b) => {
    // Primary Sort: Freight Score (High to Low)
    const scoreA = calculateSortScore(a);
    const scoreB = calculateSortScore(b);
    
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    // Secondary Sort: Distance (Low to High)
    const aMiles = typeof a.miles === "number" ? a.miles : Number.POSITIVE_INFINITY;
    const bMiles = typeof b.miles === "number" ? b.miles : Number.POSITIVE_INFINITY;
    
    if (aMiles !== bMiles) {
      return aMiles - bMiles;
    }

    // Tertiary Sort: Alphabetical
    return a.city.localeCompare(b.city);
  });
}

function getLimitForKMA(kmaCode: string): number {
  // Extract state from KMA code (e.g. "IL_CHI" -> "IL")
  const statePrefix = kmaCode.split('_')[0];
  
  if (DENSE_STATES.has(statePrefix)) {
    return 12; // Allow more cities in dense/complex states
  }
  return 6; // Standard cap for most states to reduce clutter
}

export function groupAndLimitByKMA(
  cities: IncomingCity[] = [],
  defaultLimit = 10
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
  const seenCities = new Set<string>();

  for (const city of sorted) {
    // Deduplication: Ensure unique City + State combination
    const uniqueKey = `${city.city?.toLowerCase()}|${city.state?.toLowerCase()}`;
    if (seenCities.has(uniqueKey)) {
      continue;
    }
    seenCities.add(uniqueKey);

    const code = city.kma_code ?? "UNKNOWN";
    const limit = getLimitForKMA(code); // Use smart dynamic limit

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

