// lib/datcrawl.js
import { adminSupabase as supabase } from "../utils/supabaseClient";
import { distanceInMiles } from "./haversine";

/**
 * Rules:
 * - Try 75 miles for pickups around origin; expand to 100; allow up to 125 ONLY if "no-brainer" score.
 * - Same for deliveries around destination.
 * - Choose up to 10 PAIRS (each pair includes one pickup alt and one delivery alt).
 * - Avoid duplicate KMAs; allow justified KMA dup only if preferFillTo10=true and we can justify score.
 * - Scoring weights:
 *   rate strength 0.40 + capacity/reload (population) 0.25 + hot-region boost 0.20 + distance penalty 0.15
 */
export async function generateCrawlPairs({ origin, destination, equipment, preferFillTo10 = false }) {
  const baseOrigin = await resolveCity(origin);
  const baseDest = await resolveCity(destination);
  if (!baseOrigin || !baseDest) throw new Error("Could not resolve base cities");

  const pickupCands = await findNearbyCities(baseOrigin, equipment, { radius: [75,100,125] });
  const deliveryCands = await findNearbyCities(baseDest, equipment, { radius: [75,100,125] });

  const topPickups = selectTopByKma(pickupCands, { hardMax: 10 });
  const topDeliveries = selectTopByKma(deliveryCands, { hardMax: 10 });

  // create candidate pairs by cross-matching top lists, prefer same-index
  const pairs = [];
  const maxPairs = 10;
  let usedKMA = new Set([baseOrigin.kma_code, baseDest.kma_code].filter(Boolean));
  let i = 0;
  while (pairs.length < maxPairs && (i < topPickups.length || i < topDeliveries.length)) {
    const p = topPickups[i] || topPickups[topPickups.length - 1];
    const d = topDeliveries[i] || topDeliveries[topDeliveries.length - 1];
    if (!p || !d) break;

    const kmaOk = (!usedKMA.has(p.kma_code) && !usedKMA.has(d.kma_code));
    const scorePair = 0.5 * p.score + 0.5 * d.score;

    if (kmaOk) {
      pairs.push({ pickup: p, delivery: d, score: scorePair, reason: ["top-ranked"] });
      usedKMA.add(p.kma_code); usedKMA.add(d.kma_code);
    } else if (preferFillTo10 && scorePair >= 0.80) {
      // justified duplicate only if very strong
      pairs.push({ pickup: p, delivery: d, score: scorePair, reason: ["fill-10","justified-dup"] });
    }
    i++;
  }

  let shortfallReason = "";
  if (pairs.length < maxPairs) {
    shortfallReason = "insufficient_unique_kma_or_low_scores";
  }

  return { baseOrigin, baseDest, pairs, allowedDuplicates: preferFillTo10, shortfallReason };
}

async function resolveCity(s) {
  const term = String(s || "").trim();
  if (!term) return null;
  const [city, st] = term.split(",").map((x) => x.trim());
  const q = supabase.from("cities").select("id, city, state_or_province, state, zip, postal_code, latitude, longitude, kma_code, kma_name, population, is_hot").ilike("city", city);
  const { data } = st ? await q.ilike("state_or_province", st).limit(1) : await q.limit(1);
  const r = (data || [])[0];
  if (!r) return null;
  return {
    id: r.id,
    city: r.city,
    state: r.state_or_province || r.state || "",
    zip: r.zip || r.postal_code || "",
    lat: r.latitude, lon: r.longitude,
    kma_code: r.kma_code || null, kma_name: r.kma_name || null,
    population: r.population || 0,
    is_hot: !!r.is_hot,
  };
}

async function findNearbyCities(base, equipment, { radius }) {
  const [r75, r100, r125] = radius;
  const { data } = await supabase
    .from("cities")
    .select("id, city, state_or_province, state, zip, postal_code, latitude, longitude, kma_code, kma_name, population, is_hot")
    .ilike("state_or_province", "%") // noop filter so we can select
    .limit(5000);

  const all = (data || []).map((c) => ({
    id: c.id,
    city: c.city,
    state: c.state_or_province || c.state || "",
    zip: c.zip || c.postal_code || "",
    lat: c.latitude, lon: c.longitude,
    kma_code: c.kma_code, kma_name: c.kma_name,
    population: c.population || 0,
    is_hot: !!c.is_hot,
  })).filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon));

  // compute distance & score
  const scored = [];
  for (const c of all) {
    const dist = distanceInMiles({ lat: base.lat, lon: base.lon }, { lat: c.lat, lon: c.lon });
    let band = (dist <= r75) ? "75" : (dist <= r100) ? "100" : (dist <= r125) ? "125" : "far";
    if (band === "far") continue;

    const s = scoreCity(base, c, equipment, dist);
    // Only allow 125 if "no-brainer": score high enough
    if (band === "125" && s < 0.88) continue;

    scored.push({ ...c, score: s, dist });
  }

  // Sort best first
  scored.sort((a, b) => b.score - a.score || a.dist - b.dist);

  return scored;
}

function scoreCity(base, c, equipment, dist) {
  const rateStrength = 0.4 * estimateRateStrength(base.state, c.state);
  const capacity = 0.25 * normalizePop(c.population);
  const hotBoost = 0.20 * (c.is_hot ? 1 : 0);
  const distancePenalty = 0.15 * (1 - clamp(1 - dist / 150, 0, 1)); // closer is better
  const equipBias = equipmentBias(equipment, c);
  // cap overall to 0..1
  return clamp(rateStrength + capacity + hotBoost + (1 - distancePenalty) + equipBias, 0, 1);
}

// Simple heuristics without requiring preloaded matrices (safe now)
function estimateRateStrength(fromState, toState) {
  if (!fromState || !toState) return 0.5;
  if (fromState === toState) return 0.65;
  const favored = new Set(["TX","CA","FL","GA","IL","NJ","PA","WA","NC","OH","AZ","TN","IN"]);
  let base = (favored.has(fromState) || favored.has(toState)) ? 0.65 : 0.55;
  if ((fromState === "AL" && toState === "FL") || (fromState === "GA" && toState === "NC")) base += 0.05;
  return clamp(base, 0, 1);
}
function normalizePop(p) { if (!p || p <= 0) return 0.4; if (p > 2_000_000) return 1; if (p > 500_000) return 0.8; if (p > 100_000) return 0.6; return 0.45; }
function equipmentBias(eq, c) {
  const E = String(eq || "").toUpperCase();
  let b = 0;
  if (E.startsWith("R")) b += c.is_hot ? 0.05 : 0.02; // reefer prefers hot produce zones
  if (E.startsWith("F") || E.startsWith("SD") || E.startsWith("DD") || E.startsWith("RGN")) b += 0.04; // flat/step
  return b;
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

function selectTopByKma(list, { hardMax }) {
  const out = []; const seenKMA = new Set();
  for (const c of list) {
    if (!c.kma_code) {
      if (out.length < hardMax) out.push(c);
      continue;
    }
    if (seenKMA.has(c.kma_code)) continue;
    seenKMA.add(c.kma_code);
    out.push(c);
    if (out.length >= hardMax) break;
  }
  return out;
}
