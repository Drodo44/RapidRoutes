// lib/datcrawl.js
// Smart city selection: 1 base + up to 10 intelligent pairs (pickup, delivery)
// Distances: 75 → 100 → (optionally 125 if score is a no-brainer)

import { adminSupabase as supabase } from "../utils/supabaseClient.js";

// ---- helpers

function normalizeCityState(s) {
  const [c, st] = String(s || "").split(",").map((x) => String(x || "").trim());
  return { city: c || "", state: (st || "").toUpperCase() };
}

function haversineMiles(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.7613;
  const dLat = toRad((b.lat || 0) - (a.lat || 0));
  const dLon = toRad((b.lon || 0) - (a.lon || 0));
  const la1 = toRad(a.lat || 0);
  const la2 = toRad(b.lat || 0);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function getCityRow(city, state) {
  if (!city || !state) return null;
  const { data, error } = await supabase
    .from("cities")
    .select("id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name, population, is_hot, equipment_bias")
    .eq("state_or_province", state)
    .ilike("city", city)
    .order("population", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

// Prefer RPC if present; fallback to SELECT if RPC missing.
async function nearbyCities({ lat, lon, radius, equipment, max = 50 }) {
  try {
    const { data, error } = await supabase.rpc("fetch_nearby_cities", {
      i_lat: lat,
      i_lon: lon,
      i_radius_miles: radius,
      i_equipment: equipment || "V",
      i_expand_if_needed: false,
      i_max: max
    });
    if (!error && Array.isArray(data)) return data.map(mapRow);
  } catch {}
  // Fallback: distance calc in SQL-lite
  const { data } = await supabase
    .from("cities")
    .select("id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name, population, is_hot, equipment_bias")
    .limit(2000);
  const base = { lat, lon };
  return (data || [])
    .map(mapRow)
    .map((c) => ({ ...c, distance: haversineMiles(base, { lat: c.lat, lon: c.lon }) }))
    .filter((c) => c.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, max);
}

function mapRow(r) {
  return {
    id: r.id,
    city: r.city,
    state: r.state_or_province,
    zip: r.zip || null,
    lat: r.latitude,
    lon: r.longitude,
    kma: r.kma_code || r.kma || null,
    kma_name: r.kma_name || null,
    population: r.population || 0,
    is_hot: !!r.is_hot,
    equipment_bias: Array.isArray(r.equipment_bias) ? r.equipment_bias : [],
  };
}

function scoreCity(c, equipment, base) {
  // Distance: closer is better
  const d = haversineMiles({ lat: c.lat, lon: c.lon }, base);
  const distScore = 1 - Math.min(1, d / 150); // normalized 0..1 (150mi worst)
  const hotBoost = c.is_hot ? 0.15 : 0;
  const eqBoost = c.equipment_bias?.includes?.(equipClass(equipment)) ? 0.1 : 0;
  const popScore = Math.min(0.2, (c.population || 0) / 2_000_000 * 0.2);
  return 0.55 * distScore + hotBoost + eqBoost + popScore;
}

function equipClass(code) {
  const c = String(code || "").toUpperCase();
  if (c === "R" || c.startsWith("REEF")) return "reefer";
  if (c === "F" || c === "SD" || c === "DD" || c === "RGN" || c === "LBY" || c === "CONEST") return "flatbed";
  return "van";
}

function uniqByKMA(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const key = x.kma || `${x.city}-${x.state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
}

// ---- main

export async function generateCrawlPairs({ origin, destination, equipment, preferFillTo10 = false }) {
  // Resolve base cities
  const o = normalizeCityState(origin);
  const d = normalizeCityState(destination);
  const baseOrigin = await getCityRow(o.city, o.state);
  const baseDest = await getCityRow(d.city, d.state);
  if (!baseOrigin || !baseDest) {
    return { baseOrigin, baseDest, pairs: [], shortfallReason: "base_city_not_found", allowedDuplicates: false };
  }

  // Candidate pools with expansion logic
  const originPools = [];
  const destPools = [];
  for (const r of [75, 100]) {
    originPools.push(await nearbyCities({ lat: baseOrigin.lat, lon: baseOrigin.lon, radius: r, equipment, max: 60 }));
    destPools.push(await nearbyCities({ lat: baseDest.lat, lon: baseDest.lon, radius: r, equipment, max: 60 }));
  }

  // Optional 125 mi if "no-brainer" (score >= 0.8)
  let used125 = false;
  const need125 = (arr) => uniqByKMA(arr.flat()).length < 10;
  if ((need125(originPools) || need125(destPools))) {
    const moreO = await nearbyCities({ lat: baseOrigin.lat, lon: baseOrigin.lon, radius: 125, equipment, max: 100 });
    const moreD = await nearbyCities({ lat: baseDest.lat, lon: baseDest.lon, radius: 125, equipment, max: 100 });
    const oBase = { lat: baseOrigin.lat, lon: baseOrigin.lon };
    const dBase = { lat: baseDest.lat, lon: baseDest.lon };
    const strongO = moreO.map((c) => ({ ...c, __score: scoreCity(c, equipment, oBase) })).filter((x) => x.__score >= 0.8);
    const strongD = moreD.map((c) => ({ ...c, __score: scoreCity(c, equipment, dBase) })).filter((x) => x.__score >= 0.8);
    if (strongO.length) { originPools.push(strongO); used125 = true; }
    if (strongD.length) { destPools.push(strongD); used125 = true; }
  }

  // Rank & KMA-unique lists
  const oBase = { lat: baseOrigin.lat, lon: baseOrigin.lon };
  const dBase = { lat: baseDest.lat, lon: baseDest.lon };
  const pickups = uniqByKMA(
    originPools.flat().map((c) => ({ ...c, score: scoreCity(c, equipment, oBase) }))
  ).sort((a, b) => b.score - a.score).filter((c) => !(c.city === baseOrigin.city && c.state === baseOrigin.state));
  const deliveries = uniqByKMA(
    destPools.flat().map((c) => ({ ...c, score: scoreCity(c, equipment, dBase) }))
  ).sort((a, b) => b.score - a.score).filter((c) => !(c.city === baseDest.city && c.state === baseDest.state));

  // Pairing (greedy, enforce KMA uniqueness for both sides)
  const pairs = [];
  const usedPK = new Set();
  const usedDK = new Set();

  function kmaKey(c) { return c.kma || `${c.city}-${c.state}`; }

  const maxPairs = 10;
  // Try balanced pairing by index
  const len = Math.max(pickups.length, deliveries.length);
  for (let i = 0; i < len && pairs.length < maxPairs; i++) {
    const p = pickups[i];
    const q = deliveries[i];
    if (!p || !q) continue;
    const pk = kmaKey(p), dk = kmaKey(q);
    if (usedPK.has(pk) || usedDK.has(dk)) continue;
    usedPK.add(pk); usedDK.add(dk);
    pairs.push({ pickup: p, delivery: q, score: (p.score + q.score) / 2, reason: ["balanced_pair"] });
  }

  // Fill remaining slots by best remaining combinations
  function fillWithBest(limitDup = false) {
    for (const p of pickups) {
      if (pairs.length >= maxPairs) break;
      const pk = kmaKey(p);
      if (limitDup && usedPK.has(pk)) continue;
      for (const q of deliveries) {
        if (pairs.length >= maxPairs) break;
        const dk = kmaKey(q);
        if (limitDup && usedDK.has(dk)) continue;
        const comboScore = (p.score + q.score) / 2;
        // Only accept strong combos or when we must fill
        if (!limitDup && comboScore < 0.45) continue;
        if (usedPK.has(pk) || usedDK.has(dk)) continue;
        usedPK.add(pk); usedDK.add(dk);
        pairs.push({ pickup: p, delivery: q, score: comboScore, reason: ["best_combo"] });
      }
    }
  }

  fillWithBest(true);

  const beforeRelax = pairs.length;
  let allowedDuplicates = false;

  // If still short and fill-to-10 requested, allow justified dup
  if (pairs.length < maxPairs && preferFillTo10) {
    allowedDuplicates = true;
    for (const p of pickups) {
      if (pairs.length >= maxPairs) break;
      for (const q of deliveries) {
        if (pairs.length >= maxPairs) break;
        const comboScore = (p.score + q.score) / 2;
        if (comboScore < 0.6) continue; // only strong dups
        pairs.push({ pickup: p, delivery: q, score: comboScore, reason: ["dup_kma_allowed"] });
      }
    }
  }

  const shortfallReason =
    pairs.length >= maxPairs
      ? null
      : used125
      ? "insufficient_candidates_even_at_125"
      : "insufficient_candidates_within_100";

  return { baseOrigin, baseDest, pairs: pairs.slice(0, maxPairs), shortfallReason, allowedDuplicates };
}
