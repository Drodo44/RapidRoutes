// utils/smartCitySelector.js
// Intelligent crawl: 75→100 mi, 125 mi only for no-brainers; KMA diversity; unique pairing.
import { supabase } from "./supabaseClient";
import { distanceInMiles } from "./haversine";
import { assignPairs } from "./assignment";

// Radius policy
const PASS1_RADIUS = 75;
const PASS2_RADIUS = 100;
const PASS3_RADIUS = 125;             // only for no-brainers
const NO_BRAINER_SCORE = 0.92;        // "absolutely works"
const TOP_PERCENTILE = 0.05;          // top 5%

// Diversity & duplicates
const KMA_CAP_STRICT = 1;
const KMA_CAP_RELAXED = 2;
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
    .select("id, city, state_or_province, postal_code, latitude, longitude, kma, population, equipment_bias, is_hot")
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
    zip: c.postal_code || "",
    lat: c.latitude,
    lon: c.longitude,
    kma: c.kma,
    population: c.population,
    equipment_bias: c.equipment_bias || [],
    is_hot: !!c.is_hot,
  };
}

async function queryNearby(base, radius) {
  // Preferred: RPC (fast)
  const { data, error } = await supabase.rpc("fetch_nearby_cities", {
    lat: base.lat, lon: base.lon, radius_miles: radius,
  });
  if (!error && Array.isArray(data)) {
    return data.map((c) => ({
      id: c.id,
      city: c.city,
      state: c.state_or_province,
      zip: c.postal_code || c.zip || "",
      lat: c.latitude ?? c.lat,
      lon: c.longitude ?? c.lon,
      kma: c.kma,
      population: c.population,
      equipment_bias: c.equipment_bias || [],
      is_hot: !!c.is_hot,
    }));
  }

  // Fallback: bounding box + client filter
  const latDelta = radius / 69;
  const lonDelta = radius / (Math.cos((base.lat * Math.PI) / 180) * 69);
  const { data: approx } = await supabase
    .from("cities")
    .select("id, city, state_or_province, postal_code, latitude, longitude, kma, population, equipment_bias, is_hot")
    .gt("latitude", base.lat - latDelta)
    .lt("latitude", base.lat + latDelta)
    .gt("longitude", base.lon - lonDelta)
    .lt("longitude", base.lon + lonDelta)
    .limit(2000);

  return (approx || [])
    .map((c) => ({
      id: c.id,
      city: c.city,
      state: c.state_or_province,
      zip: c.postal_code || "",
      lat: c.latitude,
      lon: c.longitude,
      kma: c.kma,
      population: c.population,
      equipment_bias: c.equipment_bias || [],
      is_hot: !!c.is_hot,
    }))
    .filter((c) => distanceInMiles(base, c) <= radius);
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
  maxPairs = 10,
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

  // Nearby pools (75 → 100)
  const p75 = await queryNearby(baseOrigin, PASS1_RADIUS);
  const d75 = await queryNearby(baseDest, PASS1_RADIUS);
  let pCands = p75, dCands = d75;
  if (pCands.length < maxPairs) pCands = await queryNearby(baseOrigin, PASS2_RADIUS);
  if (dCands.length < maxPairs) dCands = await queryNearby(baseDest, PASS2_RADIUS);

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

  // If still short, allow 125 mi "no-brainers" only
  if (Math.min(Pstrict.length, Dstrict.length) < maxPairs) {
    const p125 = await queryNearby(baseOrigin, PASS3_RADIUS);
    const d125 = await queryNearby(baseDest, PASS3_RADIUS);

    const pExtra = scoreSide(
      p125.filter((c) => distanceInMiles(baseOrigin, c) > PASS2_RADIUS && distanceInMiles(baseOrigin, c) <= PASS3_RADIUS),
      "pickup"
    );
    const dExtra = scoreSide(
      d125.filter((c) => distanceInMiles(baseDest, c) > PASS2_RADIUS && distanceInMiles(baseDest, c) <= PASS3_RADIUS),
      "delivery"
    );

    const pCut = Math.max(1, Math.floor(pExtra.length * TOP_PERCENTILE));
    const dCut = Math.max(1, Math.floor(dExtra.length * TOP_PERCENTILE));
    const pNoBrain = pExtra.filter((x, i) => x.score >= NO_BRAINER_SCORE && i < pCut && (x.cand.is_hot || (x.cand.equipment_bias || []).includes(equipment)));
    const dNoBrain = dExtra.filter((x, i) => x.score >= NO_BRAINER_SCORE && i < dCut && (x.cand.is_hot || (x.cand.equipment_bias || []).includes(equipment)));

    Pstrict = enforceKmaCap([...Pstrict, ...pNoBrain].sort((a, b) => b.score - a.score), KMA_CAP_STRICT);
    Dstrict = enforceKmaCap([...Dstrict, ...dNoBrain].sort((a, b) => b.score - a.score), KMA_CAP_STRICT);
  }

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
