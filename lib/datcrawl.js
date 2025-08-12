// lib/datcrawl.js
import { supabase } from "../utils/supabaseClient";
import { distanceInMiles } from "./haversine";
import { assignPairs } from "./assignment";

// Radius policy
const R75 = 75;
const R100 = 100;
const R125 = 125; // no-brainer only
const NO_BRAINER = 0.92;
const TOP_PCT = 0.05;

// KMA policy
const CAP_STRICT = 1;
const CAP_RELAXED = 2;
const DUP_KMA_PENALTY = 0.03; // only used when allowDup
const JUSTIFY_GAP = 0.06;

function parseCityState(text) {
  if (!text) return { city: "", state: "" };
  const [c, s] = String(text).split(",").map((x) => x.trim());
  return { city: c || "", state: (s || "").toUpperCase() };
}

async function getBaseCity(city, state) {
  const { data, error } = await supabase
    .from("cities")
    .select("id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name")
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
    kma: c.kma_code || c.kma_name || "",
  };
}

async function latestStateSnapshots(equipment) {
  const { data, error } = await supabase
    .from("rates_snapshots")
    .select("*")
    .eq("equipment", equipment)
    .eq("level", "state")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  const spot = data.find((d) => d.source === "spot")?.matrix || null;
  const contract = data.find((d) => d.source === "contract")?.matrix || null;
  return { spot, contract };
}

function rateLookup(matrix, o, d) {
  if (!matrix) return null;
  const row = matrix[o] || matrix[o?.toUpperCase()];
  if (!row) return null;
  const v = row[d] ?? row[d?.toUpperCase()];
  return typeof v === "number" ? v : null;
}

async function nearby(base, radius) {
  const { data, error } = await supabase.rpc("fetch_nearby_cities", {
    lat: base.lat, lon: base.lon, radius_miles: radius,
  });
  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id,
    city: c.city,
    state: c.state_or_province,
    zip: c.zip || "",
    lat: c.latitude,
    lon: c.longitude,
    kma: c.kma || "",
    // Your table doesn’t store these; we treat missing as neutral
    population: 0,
    equipment_bias: [],
    is_hot: false,
  }));
}

function normalize(v, min, max) {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

function scoreCity({ baseOrigin, baseDest, cand, side, equip, rates }) {
  const oState = side === "pickup" ? cand.state : baseOrigin.state;
  const dState = side === "pickup" ? baseDest.state : cand.state;

  const spot = rateLookup(rates.spot, oState, dState);
  const contract = rateLookup(rates.contract, oState, dState);
  const avg = spot != null && contract != null ? (spot + contract) / 2 : (spot ?? contract ?? 0);
  const rateN = normalize(avg, 0, 6);

  const popN = 0; // not available in your schema
  const hot = 0;  // not available in your schema

  const miles = distanceInMiles(side === "pickup" ? baseOrigin : baseDest, cand);
  const proxN = 1 - normalize(Math.min(miles, R100), 0, R100);

  const score = 0.40 * rateN + 0.25 * popN + 0.20 * hot + 0.15 * proxN;

  const reason = [];
  if (rateN > 0.6) reason.push("rates+");
  if (proxN > 0.7) reason.push("prox");

  return { score, reason, miles };
}

function capKMA(list, cap) {
  const by = new Map();
  const out = [];
  for (const item of list) {
    const kma = item.cand.kma || `${item.cand.city}-${item.cand.state}`;
    const arr = by.get(kma) || [];
    if (arr.length < cap) {
      arr.push(item);
      by.set(kma, arr);
      out.push(item);
    }
  }
  return out;
}

function pair({ pickups, deliveries, allowDup }) {
  const P = pickups.length, D = deliveries.length;
  const n = Math.min(10, P, D);
  if (!n) return [];
  const scores = Array.from({ length: P }, () => Array(D).fill(0));
  for (let i = 0; i < P; i++) {
    for (let j = 0; j < D; j++) {
      let s = (pickups[i].score + deliveries[j].score) / 2;
      if (allowDup) {
        if (pickups[i].cand.kma) s -= DUP_KMA_PENALTY;
        if (deliveries[j].cand.kma) s -= DUP_KMA_PENALTY;
      }
      scores[i][j] = s;
    }
  }
  return assignPairs(scores)
    .map(([i, j]) => ({ pickup: pickups[i], delivery: deliveries[j], s: scores[i][j] }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(({ pickup, delivery }) => ({
      pickup: pickup.cand,
      delivery: delivery.cand,
      reason: Array.from(new Set([...(pickup.reason || []), ...(delivery.reason || [])])),
      score: (pickup.score + delivery.score) / 2,
    }));
}

export async function generateCrawlCities(originText, destinationText, options = {}) {
  const preferFillTo10 = !!options.preferFillTo10;
  const { city: oCity, state: oState } = parseCityState(originText);
  const { city: dCity, state: dState } = parseCityState(destinationText);

  const baseOrigin = await getBaseCity(oCity, oState);
  const baseDest = await getBaseCity(dCity, dState);
  if (!baseOrigin || !baseDest) {
    return { baseOrigin, baseDest, pairs: [], allowedDuplicates: false, shortfallReason: "missing_base_cities" };
  }

  const eqText = String(options.equipment || "").toUpperCase();
  const equip =
    eqText === "R" || /REEFER/.test(eqText) ? "reefer"
    : eqText === "F" || eqText === "FD" || /FLATBED|STEP/.test(eqText) ? "flatbed"
    : "van";

  const rates = await latestStateSnapshots(equip);

  // Nearby pools
  const p75 = await nearby(baseOrigin, R75);
  const d75 = await nearby(baseDest, R75);
  let pCands = p75, dCands = d75;
  if (pCands.length < 10) pCands = await nearby(baseOrigin, R100);
  if (dCands.length < 10) dCands = await nearby(baseDest, R100);

  // Scoring
  const scoreSide = (arr, side) =>
    arr
      .filter((c) => c.id !== (side === "pickup" ? baseOrigin.id : baseDest.id))
      .map((cand) => ({ cand, ...scoreCity({ baseOrigin, baseDest, cand, side, equip, rates }) }))
      .sort((a, b) => b.score - a.score);

  // Strict: exclude base KMA entirely to avoid “same load look”
  const excludeBaseKMA = (list, side) =>
    list.filter((x) => x.cand.kma && x.cand.kma !== (side === "pickup" ? baseOrigin.kma : baseDest.kma));

  let P = scoreSide(pCands, "pickup");
  let D = scoreSide(dCands, "delivery");

  let Pstrict = capKMA(excludeBaseKMA(P, "pickup"), CAP_STRICT);
  let Dstrict = capKMA(excludeBaseKMA(D, "delivery"), CAP_STRICT);

  // 125mi "no-brainer" expansion if still short
  if (Math.min(Pstrict.length, Dstrict.length) < 10) {
    const p125 = await nearby(baseOrigin, R125);
    const d125 = await nearby(baseDest, R125);

    const pExtra = scoreSide(p125.filter((c) => distanceInMiles(baseOrigin, c) > R100), "pickup");
    const dExtra = scoreSide(d125.filter((c) => distanceInMiles(baseDest, c) > R100), "delivery");

    const pCut = Math.max(1, Math.floor(pExtra.length * TOP_PCT));
    const dCut = Math.max(1, Math.floor(dExtra.length * TOP_PCT));
    const pNoBr = pExtra.filter((x, i) => x.score >= NO_BRAINER && i < pCut);
    const dNoBr = dExtra.filter((x, i) => x.score >= NO_BRAINER && i < dCut);

    Pstrict = capKMA([...Pstrict, ...excludeBaseKMA(pNoBr, "pickup")].sort((a, b) => b.score - a.score), CAP_STRICT);
    Dstrict = capKMA([...Dstrict, ...excludeBaseKMA(dNoBr, "delivery")].sort((a, b) => b.score - a.score), CAP_STRICT);
  }

  // Attempt A: strict (no KMA dupes, and no base-KMA reuse)
  let pairs = pair({ pickups: Pstrict, deliveries: Dstrict, allowDup: false });
  let allowedDuplicates = false;

  // Attempt B: broker opted to "Fill to 10" — allow limited, justified reuse
  if (pairs.length < 10 && preferFillTo10) {
    const bestP = P[0]?.score ?? 0;
    const bestD = D[0]?.score ?? 0;

    // Allow ≤2 per KMA; still prefer not to reuse base KMA unless it’s a no-brainer within 75mi
    const allowBaseKMAIfNoBrainer = (x, side) => {
      const isBase = x.cand.kma === (side === "pickup" ? baseOrigin.kma : baseDest.kma);
      if (!isBase) return true;
      return x.score >= NO_BRAINER && x.miles <= R75;
    };

    const Prelaxed = capKMA(
      P.filter((x) => x.score >= bestP - JUSTIFY_GAP && allowBaseKMAIfNoBrainer(x, "pickup")),
      CAP_RELAXED
    );
    const Drelaxed = capKMA(
      D.filter((x) => x.score >= bestD - JUSTIFY_GAP && allowBaseKMAIfNoBrainer(x, "delivery")),
      CAP_RELAXED
    );

    const built = pair({ pickups: Prelaxed, deliveries: Drelaxed, allowDup: true });
    if (built.length > pairs.length) {
      pairs = built.slice(0, 10);
      allowedDuplicates = true;
    }
  }

  const shortfallReason = pairs.length < 10 ? "not_enough_unique_pairs" : "";
  return { baseOrigin, baseDest, pairs, allowedDuplicates, shortfallReason };
}
