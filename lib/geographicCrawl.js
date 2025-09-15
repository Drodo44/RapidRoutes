// lib/geographicCrawl.js
// Smart radius crawl with HERE fallback
// Tries 75 → 100 → 125 miles to find ≥5 unique KMA pairs

import fetch from "node-fetch";
import { adminSupabase } from "../utils/supabaseClient.js";
import { calculateDistance } from "./distanceCalculator.js";

const HERE_API_KEY = process.env.HERE_API_KEY;
const MIN_PAIRS = 5;

// -------------------------
// Helpers
// -------------------------

function sanitizeHereQuery(city, state) {
  const cleanCity = (city || "").toString().replace(/undefined|null/gi, "").trim();
  const cleanState = (state || "").toString().replace(/undefined|null/gi, "").trim();
  return cleanState ? `${cleanCity}, ${cleanState}, USA` : `${cleanCity}, USA`;
}

async function queryHereCities(city, state) {
  if (!HERE_API_KEY) throw new Error("HERE_API_KEY not set");
  const query = sanitizeHereQuery(city, state);
  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&limit=10&apikey=${HERE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`❌ HERE API error: ${response.status} ${response.statusText}`);
    return [];
  }
  const data = await response.json();
  return (data.items || []).map(item => ({
    city: item.address?.city || item.title?.split(",")[0] || "",
    state: item.address?.stateCode || item.address?.state || "",
    latitude: item.position?.lat,
    longitude: item.position?.lng,
    zip: item.address?.postalCode || null,
  }));
}

async function getCitiesWithFlexibleRadius(lat, lng, label = "") {
  const radiusSteps = [75, 100, 125]; // miles
  let bestData = [];

  for (const radiusMiles of radiusSteps) {
    const radiusMeters = radiusMiles * 1609.34;
    const { data, error } = await adminSupabase.rpc("find_cities_within_radius", {
      lat_param: lat,
      lng_param: lng,
      radius_meters: radiusMeters,
    });

    if (error) {
      console.error(`[${label}] Supabase query error at ${radiusMiles}mi:`, error.message);
      continue;
    }

    const filtered = (data || []).filter(c => c.kma_code);
    const uniqueKMAs = new Set(filtered.map(c => c.kma_code));

    if (filtered.length > bestData.length) bestData = filtered;

    if (uniqueKMAs.size >= MIN_PAIRS) {
      console.log(`[${label}] ✅ Found ${uniqueKMAs.size} KMAs within ${radiusMiles}mi`);
      return filtered;
    } else {
      console.warn(`[${label}] ⚠️ Only ${uniqueKMAs.size} KMAs within ${radiusMiles}mi`);
    }
  }

  console.warn(`[${label}] ❌ Could not find ${MIN_PAIRS} unique KMAs within 125mi. Returning best effort (${bestData.length} cities)`);
  return bestData;
}

async function getCityCoords(city, state, label = "") {
  const { data } = await adminSupabase
    .from("cities")
    .select("city, state_or_province, latitude, longitude, kma_code")
    .eq("city", city)
    .eq("state_or_province", state)
    .not("latitude", "is", null)
    .not("kma_code", "is", null)
    .limit(1);

  if (data && data.length > 0) return data[0];

  console.warn(`[GEOCRAWL] ${label} not in Supabase: ${city}, ${state}, using HERE...`);
  const hereResults = await queryHereCities(city, state);
  const hereCity = hereResults.find(c => c.city && c.state && c.latitude && c.longitude);
  if (!hereCity) return null;

  const { data: kmaCities } = await adminSupabase
    .from("cities")
    .select("kma_code, latitude, longitude")
    .not("kma_code", "is", null)
    .limit(1000);

  let nearestKma = null, minDist = Infinity;
  if (kmaCities) {
    for (const kmaCity of kmaCities) {
      const d = calculateDistance(hereCity.latitude, hereCity.longitude, kmaCity.latitude, kmaCity.longitude);
      if (d < minDist) {
        minDist = d;
        nearestKma = kmaCity.kma_code;
      }
    }
  }

  if (!nearestKma) return null;
  hereCity.kma_code = nearestKma;

  await adminSupabase.from("cities").upsert({
    city: hereCity.city,
    state_or_province: hereCity.state,
    latitude: hereCity.latitude,
    longitude: hereCity.longitude,
    zip: hereCity.zip,
    kma_code: nearestKma,
    here_verified: true,
    here_confidence: 0.9,
    discovered_by: "here_api_basecity",
    discovery_date: new Date().toISOString(),
  }, { onConflict: ["city", "state_or_province"] });

  console.log(`[GEOCRAWL] Inserted via HERE: ${hereCity.city}, ${hereCity.state}`);
  return hereCity;
}

// -------------------------
// Main Function
// -------------------------

export async function generateGeographicCrawlPairs({ origin, destination }) {
  try {
    const baseOrigin = await getCityCoords(origin.city, origin.state, "Origin");
    if (!baseOrigin) throw new Error(`Origin not found: ${origin.city}, ${origin.state}`);

    const baseDest = await getCityCoords(destination.city, destination.state, "Destination");
    if (!baseDest) throw new Error(`Destination not found: ${destination.city}, ${destination.state}`);

    const pickupCities = await getCitiesWithFlexibleRadius(baseOrigin.latitude, baseOrigin.longitude, "Pickup");
    const deliveryCities = await getCitiesWithFlexibleRadius(baseDest.latitude, baseDest.longitude, "Delivery");

    const uniquePickups = [];
    const seenPickupKmas = new Set();
    for (const c of pickupCities) {
      if (c.kma_code && !seenPickupKmas.has(c.kma_code)) {
        uniquePickups.push(c);
        seenPickupKmas.add(c.kma_code);
      }
    }

    const uniqueDeliveries = [];
    const seenDeliveryKmas = new Set();
    for (const c of deliveryCities) {
      if (c.kma_code && !seenDeliveryKmas.has(c.kma_code)) {
        uniqueDeliveries.push(c);
        seenDeliveryKmas.add(c.kma_code);
      }
    }

    const availablePairs = Math.min(uniquePickups.length, uniqueDeliveries.length);
    if (availablePairs < MIN_PAIRS) {
      console.warn(`⚠️ Lane has only ${availablePairs} pairs (need ${MIN_PAIRS}). Proceeding with available pairs.`);
    }

    const pairs = [];
    const usedPickup = new Set();
    const usedDelivery = new Set();

    for (let i = 0; i < availablePairs; i++) {
      const pickup = uniquePickups[i];
      const delivery = uniqueDeliveries[i];
      if (!pickup || !delivery) continue;
      if (usedPickup.has(pickup.city) || usedDelivery.has(delivery.city)) continue;

      pairs.push({ pickup, delivery });
      usedPickup.add(pickup.city);
      usedDelivery.add(delivery.city);

      if (pairs.length >= MIN_PAIRS) break;
    }

    return { pairs, debug: { pickups: uniquePickups.length, deliveries: uniqueDeliveries.length, generated: pairs.length } };
  } catch (err) {
    console.error("❌ Error in generateGeographicCrawlPairs:", err.message);
    return { pairs: [], debug: { error: err.message } };
  }
}
