const EARTH_RADIUS_MI = 3958.761;

export interface HaversineInput {
  lat1: number;
  lon1: number;
  lat2: number;
  lon2: number;
}

export interface BoundingBoxInput {
  lat: number;
  lon: number;
  miles: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function haversineMiles({ lat1, lon1, lat2, lon2 }: HaversineInput): number {
  if (![lat1, lon1, lat2, lon2].every(isFiniteNumber)) {
    throw new Error("Invalid coordinates for haversineMiles");
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const clamped = Math.min(1, Math.max(0, a));
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(clamped));
}

export function bboxFromMiles({ lat, lon, miles }: BoundingBoxInput): BoundingBox {
  if (![lat, lon, miles].every(isFiniteNumber)) {
    throw new Error("Invalid inputs for bboxFromMiles");
  }

  const ONE_DEG_LAT_MI = 69;
  const latDelta = miles / ONE_DEG_LAT_MI;
  const latRad = toRadians(lat);
  const cosLat = Math.cos(latRad);
  const adjustedCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : Math.abs(cosLat);
  const lonDelta = miles / (ONE_DEG_LAT_MI * adjustedCosLat);

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta
  };
}
