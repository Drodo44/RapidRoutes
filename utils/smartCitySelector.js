// utils/smartCitySelector.js
// Intelligent crawl: 50→75 mi MAX; KMA diversity; unique pairing. Business rule: Never exceed 75 miles.
import supabase from "./supabaseClient.js";
import { distanceInMiles } from "./haversine.js";
import { assignPairs } from "./assignment.js";

// Radius policy - BUSINESS RULE: Never exceed 75 miles
const PASS1_RADIUS = 50;              // Start conservative
const PASS2_RADIUS = 75;              // Maximum allowed distance
const MAX_RADIUS = 75;                // Hard limit - never exceed
const NO_BRAINER_SCORE = 0.92;        // "absolutely works"
const TOP_PERCENTILE = 0.05;          // top 5%

// Diversity & duplicates - CORRECT: 1 per KMA to avoid load board flooding
const KMA_CAP_STRICT = 1;             // Only 1 city per KMA (prevents KMA flooding)
const KMA_CAP_RELAXED = 2;            // Relaxed allows 2 per KMA if justified
const DUP_KMA_PENALTY = 0.03;
const JUSTIFY_GAP = 0.06;

function normalize(v, min, max) {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

async function latestSnapshots(equipment, level = "state") {
  const { data, error } = await supabase
    .from("rates_snapshots")
    .select("*")
    .eq("equipment", equipment)
    .eq("level", level)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  const spot = data.find((d) => d.source === "spot")?.matrix || null;
  const contract = data.find((d) => d.source === "contract")?.matrix || null;
  return { spot, contract };
}

function lookupRate(matrix, o, d) {
  if (!matrix) return null;
  const row = matrix[o] || matrix[o?.toUpperCase()];
  if (!row) return null;
  const v = row[d] ?? row[d?.toUpperCase()];
  return typeof v === "number" ? v : null;
}

async function fetchCityRecord(city, state) {
  const { data, error } = await supabase
    .from("cities")
    .select("id, city, state_or_province, zip, latitude, longitude, kma_code, population")
    .ilike("city", city)
    .eq("state_or_province", state)
    .limit(1);
  if (error) throw error;
  const c = data?.[0];
  if (!c) return null;
  return {
    id: c.id,
    city: c.city,
    state: c.state_or_province,
    zip: c.zip || "",
    lat: c.latitude,
    lon: c.longitude,
    kma: c.kma_code,
    population: c.population,
    equipment_bias: [], // Default empty array since column doesn't exist
    is_hot: false, // Default false since column doesn't exist
  };
}

async function queryNearby(base, radius) {
  // Use bounding box + client filter (reliable fallback)
  const latDelta = radius / 69;
  const lonDelta = radius / (Math.cos((base.lat * Math.PI) / 180) * 69);
  
  const { data: approx, error } = await supabase
    .from("cities")
    .select("id, city, state_or_province, zip, latitude, longitude, kma_code, population")
    .gt("latitude", base.lat - latDelta)
    .lt("latitude", base.lat + latDelta)
    .gt("longitude", base.lon - lonDelta)
    .lt("longitude", base.lon + lonDelta)
    .limit(2000);

  if (error) {
    console.error("Error fetching nearby cities:", error);
    return [];
  }

  return (approx || [])
    .map((c) => ({
      id: c.id,
      city: c.city,
      state: c.state_or_province,
      zip: c.zip || "",
      lat: c.latitude,
      lon: c.longitude,
      kma: c.kma_code,
      population: c.population,
      equipment_bias: [], // Default empty array since column doesn't exist
      is_hot: false, // Default false since column doesn't exist
    }))
    .filter((c) => distanceInMiles(base, c) <= radius)
    .sort((a, b) => distanceInMiles(base, a) - distanceInMiles(base, b));
}

function scoreCity({ baseOrigin, baseDest, cand, side, equip, rates }) {
  const oState = side === "pickup" ? cand.state : baseOrigin.state;
  const dState = side === "pickup" ? baseDest.state : cand.state;

  const spot = lookupRate(rates.spot, oState, dState);
  const contract = lookupRate(rates.contract, oState, dState);
  const avgRate = spot != null && contract != null ? (spot + contract) / 2 : (spot ?? contract ?? 0);
  const rateN = normalize(avgRate, 0, 6);

  const pop = Number(cand.population || 0);
  const popN = Math.min(1, Math.log10(Math.max(pop, 1)) / 6);

  const hot = cand.is_hot ? 1 : 0;

  const miles = distanceInMiles(side === "pickup" ? baseOrigin : baseDest, cand);
  const proxN = 1 - normalize(Math.min(miles, PASS2_RADIUS), 0, PASS2_RADIUS);

  const bias = Array.isArray(cand.equipment_bias) && cand.equipment_bias.includes(equip) ? 0.05 : 0;

  const score = 0.40 * rateN + 0.25 * popN + 0.20 * hot + 0.15 * proxN + bias;

  const reason = [];
  if (rateN > 0.6) reason.push("rates+");
  if (hot) reason.push("hot");
  if (popN > 0.6) reason.push("reload");
  if (proxN > 0.7) reason.push("prox");

  return { score, reason, miles };
}

function enforceKmaCap(list, cap) {
  const byKma = new Map();
  const picked = [];
  for (const item of list) {
    const kma = item.cand.kma || `${item.cand.city}-${item.cand.state}`;
    const arr = byKma.get(kma) || [];
    if (arr.length < cap) {
      arr.push(item);
      byKma.set(kma, arr);
      picked.push(item);
    }
  }
  return picked;
}

function pairUp({ pickups, deliveries, allowKmaDup }) {
  const P = pickups.length, D = deliveries.length;
  const n = Math.min(10, P, D);
  if (!n) return { pairs: [] };

  const scores = Array.from({ length: P }, () => Array(D).fill(0));
  for (let i = 0; i < P; i++) {
    for (let j = 0; j < D; j++) {
      let s = (pickups[i].score + deliveries[j].score) / 2;
      if (allowKmaDup) {
        if (pickups[i].cand.kma) s -= DUP_KMA_PENALTY;
        if (deliveries[j].cand.kma) s -= DUP_KMA_PENALTY;
      }
      scores[i][j] = s;
    }
  }
  const assignment = assignPairs(scores)
    .map(([i, j]) => ({ i, j, s: scores[i][j] }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n);

  const pairs = assignment.map(({ i, j }) => ({
    pickup: pickups[i].cand,
    delivery: deliveries[j].cand,
    reason: Array.from(new Set([...(pickups[i].reason || []), ...(deliveries[j].reason || [])])),
    score: (pickups[i].score + deliveries[j].score) / 2,
  }));
  return { pairs };
}

function parseCityState(text) {
  if (!text) return { city: "", state: "" };
  const [cityPart, statePart] = String(text).split(",").map((s) => s.trim());
  return { city: cityPart || "", state: (statePart || "").toUpperCase() };
}

export async function generateSmartCrawlCities({
  laneOriginText,         // "City, ST"
  laneDestinationText,    // "City, ST"
  equipment,              // 'van' | 'reefer' | 'flatbed'
  maxPairs = 25,          // Allow for 10-15+ pairs like manual process (6 minimum, no maximum)
  preferFillTo10 = false
}) {
  const { city: oCity, state: oState } = parseCityState(laneOriginText);
  const { city: dCity, state: dState } = parseCityState(laneDestinationText);

  const baseOrigin = await fetchCityRecord(oCity, oState);
  const baseDest   = await fetchCityRecord(dCity, dState);
  if (!baseOrigin || !baseDest) {
    return { pairs: [], baseOrigin, baseDest, allowedDuplicates: false, shortfallReason: "missing_base_cities" };
    // Why: can't build postings without canonical base cities.
  }

  const rates = await latestSnapshots(equipment, "state");

  // Find ALL cities within 75 miles for maximum KMA diversity like manual process
  console.log(`🔍 Searching for ALL cities within 75 miles of ${baseOrigin.city}, ${baseOrigin.state} and ${baseDest.city}, ${baseDest.state}`);
  
  // Always search full 75-mile radius to get maximum unique KMAs
  const pCands = await queryNearby(baseOrigin, PASS2_RADIUS);  // 75 miles
  const dCands = await queryNearby(baseDest, PASS2_RADIUS);    // 75 miles
  
  console.log(`📊 Found ${pCands.length} pickup candidates and ${dCands.length} delivery candidates`);

  // Score + sort
  const scoreSide = (arr, side) =>
    arr
      .filter((c) => c.id !== (side === "pickup" ? baseOrigin.id : baseDest.id))
      .map((cand) => ({ cand, ...scoreCity({ baseOrigin, baseDest, cand, side, equip: equipment, rates }) }))
      .sort((a, b) => b.score - a.score);

  let P = scoreSide(pCands, "pickup");
  let D = scoreSide(dCands, "delivery");

  // Enforce ≤1 per KMA (strict)
  let Pstrict = enforceKmaCap(P, KMA_CAP_STRICT);
  let Dstrict = enforceKmaCap(D, KMA_CAP_STRICT);

  // BUSINESS RULE: Never exceed 75 miles - removed 125-mile "no-brainer" logic
  // If we don't have enough pairs within 75 miles, that's acceptable
  // Quality over quantity - stay within freight-intelligent radius

  // Attempt A: strict (no KMA dupes)
  let { pairs } = pairUp({ pickups: Pstrict, deliveries: Dstrict, allowKmaDup: false });
  let allowedDuplicates = false;

  // Attempt B: broker may allow fill-to-10 (≤2 per KMA, justified)
  if (pairs.length < maxPairs && preferFillTo10) {
    const bestP = P[0]?.score ?? 0;
    const bestD = D[0]?.score ?? 0;
    const Prelaxed = enforceKmaCap(
      P.filter((x) => x.score >= bestP - JUSTIFY_GAP && (x.reason.includes("hot") || x.reason.includes("rates+") || x.reason.includes("reload"))),
      KMA_CAP_RELAXED
    );
    const Drelaxed = enforceKmaCap(
      D.filter((x) => x.score >= bestD - JUSTIFY_GAP && (x.reason.includes("hot") || x.reason.includes("rates+") || x.reason.includes("reload"))),
      KMA_CAP_RELAXED
    );
    const built = pairUp({ pickups: Prelaxed, deliveries: Drelaxed, allowKmaDup: true });
    if (built.pairs.length > pairs.length) {
      pairs = built.pairs.slice(0, maxPairs);
      allowedDuplicates = true;
    }
  }

  const shortfallReason = pairs.length < maxPairs ? "not_enough_unique_pairs" : "";
  return { pairs, baseOrigin, baseDest, allowedDuplicates, shortfallReason };
}
