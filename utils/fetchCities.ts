import type { SupabaseClient } from "@supabase/supabase-js";
import supabaseRaw, { withRetry } from "../lib/supabaseClient";
import { bboxFromMiles, haversineMiles } from "./distance";
import {
  groupAndLimitByKMA,
  type GroupedCities,
  type NearbyCity
} from "./groupCitiesByKMA";
import type { Database, IntelligentCityRow } from "../types/database";

const TABLE = "intelligent_cities";
const COORD_COLUMNS = "city,state_or_province,latitude,longitude,kma_code,kma_name,zip";
const SEARCH_RADIUS_MI = 100;

const supabase = supabaseRaw as SupabaseClient<Database>;

export interface Coordinate {
  lat: number;
  lon: number;
}

export interface CitySelectionPayload {
  city?: string | null;
  state?: string | null;
  state_or_province?: string | null;
  origin_city?: string | null;
  origin_state?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  dest_city?: string | null;
  dest_state?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export interface FetchCitiesInput {
  origin: CitySelectionPayload | null;
  destination: CitySelectionPayload | null;
}

export interface FetchCitiesResult {
  originCities: GroupedCities;
  destinationCities: GroupedCities;
  originCoord: Coordinate;
  destinationCoord: Coordinate;
}

function ensureCoordinateInput(target: CitySelectionPayload | null, label: string):
  | { lat: number; lon: number }
  | { city: string; state: string } {
  if (!target) {
    throw new Error(`Missing ${label} location input`);
  }

  if (typeof target.lat === "number" && typeof target.lon === "number") {
    return { lat: target.lat, lon: target.lon };
  }

  const city =
    target.city ?? target.origin_city ?? target.dest_city ?? target.destinationCity ?? null;
  const state =
    target.state ??
    target.state_or_province ??
    target.origin_state ??
    target.dest_state ??
    target.destinationState ??
    null;

  if (!city || !state) {
    throw new Error(`${label} city/state or coordinates required`);
  }

  return { city, state };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function pickCentralRow(rows: IntelligentCityRow[]): IntelligentCityRow | null {
  if (rows.length === 0) {
    return null;
  }
  if (rows.length === 1) {
    return rows[0];
  }

  const medianLat = median(rows.map((row) => row.latitude));
  const medianLon = median(rows.map((row) => row.longitude));

  let best: IntelligentCityRow | null = null;
  let smallestDistance = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    const distance = Math.abs(row.latitude - medianLat) + Math.abs(row.longitude - medianLon);

    if (distance < smallestDistance) {
      best = row;
      smallestDistance = distance;
      continue;
    }

    if (distance === smallestDistance && best) {
      const bestKey = `${best.city || ""}|${best.state_or_province || ""}`;
      const candidateKey = `${row.city || ""}|${row.state_or_province || ""}`;
      if (candidateKey.localeCompare(bestKey) < 0) {
        best = row;
      }
    }
  }

  return best;
}

async function resolveCoordinates(
  client: SupabaseClient<Database>,
  target: CitySelectionPayload | null,
  label: string
): Promise<Coordinate> {
  const input = ensureCoordinateInput(target, label);

  if ("lat" in input && "lon" in input) {
    return input;
  }

  const { city, state } = input;

  const { data, error } = await withRetry(
    () =>
      client
        .from(TABLE)
        .select("latitude,longitude,city,state_or_province")
        .eq("city", city)
        .eq("state_or_province", state),
    `resolve:${label}:${city},${state}`
  );

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data : [];

  if (rows.length === 0) {
    throw new Error(`No coordinates for ${city}, ${state}`);
  }

  const chosen = pickCentralRow(rows);

  return {
    lat: chosen?.latitude ?? rows[0].latitude,
    lon: chosen?.longitude ?? rows[0].longitude
  };
}

async function queryBoundingBox(
  client: SupabaseClient<Database>,
  bounds: ReturnType<typeof bboxFromMiles>,
  label: string
): Promise<IntelligentCityRow[]> {
  const { minLat, maxLat, minLon, maxLon } = bounds;

  const { data, error } = await withRetry(
    () =>
      client
        .from(TABLE)
        .select(COORD_COLUMNS)
        .gte("latitude", minLat)
        .lte("latitude", maxLat)
        .gte("longitude", minLon)
        .lte("longitude", maxLon),
    `bbox:${label}`
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

function normalizeResults(rows: IntelligentCityRow[], reference: Coordinate): NearbyCity[] {
  return rows
    .map((row) => {
      const milesValue = haversineMiles({
        lat1: reference.lat,
        lon1: reference.lon,
        lat2: row.latitude,
        lon2: row.longitude
      });

      if (Number.isNaN(milesValue) || milesValue > SEARCH_RADIUS_MI) {
        return null;
      }

      const city: NearbyCity = {
        city: row.city,
        state: row.state_or_province,
        kma_code: row.kma_code ?? null,
        kma_name: row.kma_name ?? null,
        lat: row.latitude,
        lon: row.longitude,
        miles: Number(milesValue.toFixed(2)),
        zip: (row as any).zip ?? null,
        zip3: typeof (row as any).zip === "string" ? (row as any).zip.slice(0, 3) : null
      };

      return city;
    })
    .filter((city): city is NearbyCity => city !== null);
}

async function fetchMajorFloridaCities(
  client: SupabaseClient<Database>,
  referenceCoord: Coordinate,
  originState: string | null,
  destinationState: string | null
): Promise<IntelligentCityRow[]> {
  // Only apply FL enhancement if either origin or destination is in Florida
  if (originState !== 'FL' && destinationState !== 'FL') {
    return [];
  }

  // Comprehensive list of major Florida freight cities
  // User-provided list to support 300-500 mile deadheading patterns common in FL freight market
  const majorFLCities = [
    'Tallahassee', 'Lake City', 'Jacksonville', 'Gainesville', 'St Augustine',
    'Daytona Beach', 'Ocala', 'Orlando', 'The Villages', 'Kissimmee',
    'Bartow', 'Lakeland', 'Tampa', 'Sarasota', 'Clearwater',
    'St. Petersburg', 'Bradenton', 'Sebring', 'Melbourne', 'Fort Pierce',
    'Vero Beach', 'Punta Gorda', 'Fort Myers', 'Cape Coral', 'Fort Lauderdale',
    'Bornton Beach', 'Boca Raton', 'West Palm Beach', 'Doral', 'Port St Lucie',
    'Delray Beach', 'Miami', 'Homestead', 'Naples', 'Bonita Springs',
    'Hollywood', 'Pembroke Pines', 'Hialeah', 'Lehigh Acres', 'Labelle',
    'Ft Meade', 'Auburndale', 'Zephyrhills', 'Dade City', 'Silver Springs',
    'Panama City', 'Alachua', 'Lady Lake', 'Belleview', 'Clermont',
    'Oviedo', 'Apopka', 'Winter Park', 'Winter Garden', 'Bay Lake',
    'Polk City', 'Land O Lakes', 'New Port Richey', 'Odessa', 'Spring Hill',
    'Holiday', 'Williston'
  ];

  const { data, error } = await withRetry(
    () =>
      client
        .from(TABLE)
        .select(COORD_COLUMNS)
        .eq('state_or_province', 'FL')
        .in('city', majorFLCities),
    'major-fl-cities'
  );

  if (error) {
    console.warn('Failed to fetch major FL cities:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function fetchCities({ origin, destination }: FetchCitiesInput): Promise<FetchCitiesResult> {
  if (!origin || !destination) {
    throw new Error("Origin and destination inputs are required");
  }

  const originCoord = await resolveCoordinates(supabase, origin, "origin");
  const destinationCoord = await resolveCoordinates(supabase, destination, "destination");

  const originBounds = bboxFromMiles({ ...originCoord, miles: SEARCH_RADIUS_MI });
  const destinationBounds = bboxFromMiles({ ...destinationCoord, miles: SEARCH_RADIUS_MI });

  // Extract states from origin and destination
  const originState = origin?.state ?? origin?.state_or_province ?? origin?.origin_state ?? null;
  const destState = destination?.state ?? destination?.state_or_province ?? destination?.dest_state ?? destination?.destinationState ?? null;

  const [originRows, destinationRows, majorFLCities] = await Promise.all([
    queryBoundingBox(supabase, originBounds, "origin"),
    queryBoundingBox(supabase, destinationBounds, "destination"),
    fetchMajorFloridaCities(supabase, originCoord, originState, destState)
  ]);

  let normalizedOrigin = normalizeResults(originRows, originCoord);
  let normalizedDestination = normalizeResults(destinationRows, destinationCoord);

  // Add major FL cities to origin list if origin is in FL
  if (originState === 'FL' && majorFLCities.length > 0) {
    const majorFLNormalized = majorFLCities
      .map((row) => {
        const milesValue = haversineMiles({
          lat1: originCoord.lat,
          lon1: originCoord.lon,
          lat2: row.latitude,
          lon2: row.longitude
        });

        if (Number.isNaN(milesValue)) {
          return null;
        }

        const city: NearbyCity = {
          city: row.city,
          state: row.state_or_province,
          kma_code: row.kma_code ?? null,
          kma_name: row.kma_name ?? null,
          lat: row.latitude,
          lon: row.longitude,
          miles: Number(milesValue.toFixed(2)),
          zip: (row as any).zip ?? null,
          zip3: typeof (row as any).zip === "string" ? (row as any).zip.slice(0, 3) : null
        };

        return city;
      })
      .filter((city): city is NearbyCity => city !== null);

    // Merge with existing cities, avoiding duplicates
    const originCityKeys = new Set(normalizedOrigin.map(c => `${c.city}|${c.state}`));
    const uniqueFL = majorFLNormalized.filter(c => !originCityKeys.has(`${c.city}|${c.state}`));
    normalizedOrigin = [...normalizedOrigin, ...uniqueFL];
    
    console.log(`Added ${uniqueFL.length} major FL cities to origin list for broader coverage`);
  }

  // Add major FL cities to destination list if destination is in FL
  if (destState === 'FL' && majorFLCities.length > 0) {
    const majorFLNormalized = majorFLCities
      .map((row) => {
        const milesValue = haversineMiles({
          lat1: destinationCoord.lat,
          lon1: destinationCoord.lon,
          lat2: row.latitude,
          lon2: row.longitude
        });

        if (Number.isNaN(milesValue)) {
          return null;
        }

        const city: NearbyCity = {
          city: row.city,
          state: row.state_or_province,
          kma_code: row.kma_code ?? null,
          kma_name: row.kma_name ?? null,
          lat: row.latitude,
          lon: row.longitude,
          miles: Number(milesValue.toFixed(2)),
          zip: (row as any).zip ?? null,
          zip3: typeof (row as any).zip === "string" ? (row as any).zip.slice(0, 3) : null
        };

        return city;
      })
      .filter((city): city is NearbyCity => city !== null);

    // Merge with existing cities, avoiding duplicates
    const destCityKeys = new Set(normalizedDestination.map(c => `${c.city}|${c.state}`));
    const uniqueFL = majorFLNormalized.filter(c => !destCityKeys.has(`${c.city}|${c.state}`));
    normalizedDestination = [...normalizedDestination, ...uniqueFL];
    
    console.log(`Added ${uniqueFL.length} major FL cities to destination list for broader coverage`);
  }

  return {
    originCities: groupAndLimitByKMA(normalizedOrigin, 10),
    destinationCities: groupAndLimitByKMA(normalizedDestination, 10),
    originCoord,
    destinationCoord
  };
}

export default fetchCities;
