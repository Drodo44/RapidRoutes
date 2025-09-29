import axios from 'axios';
// Browser-safe anon client (do NOT use service role here)
import supabase from './supabaseClient';

const HERE_API_KEY = process.env.HERE_API_KEY; // Should be undefined client-side unless explicitly exposed (keep calls server-side if sensitive)
const ZIP3_RETRY_ENABLED = process.env.ZIP3_RETRY_ENABLED === 'true';

async function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

export async function callIntelligencePairingApi({
  originCity,
  originState,
  destinationCity,
  destinationState,
  equipmentCode,
}) {
  if (!originCity || !originState || !destinationCity || !destinationState) {
    throw new Error("[INTELLIGENCE] Missing required city/state fields");
  }

  // Resolve ZIP3s (Supabase-first, HERE fallback)
  const originZip3 = await resolveZip3(originCity, originState);
  const destinationZip3 = await resolveZip3(destinationCity, destinationState);

  if (!originZip3 || !destinationZip3) {
    console.error("[INTELLIGENCE] Missing zip3(s) after resolution", {
      originZip3,
      destinationZip3,
      originCity,
      originState,
      destinationCity,
      destinationState,
    });
    throw new Error("Missing zip3s — cannot proceed with pairing.");
  }

  // Minimal payload to API (server may later enrich KMA)
  const payload = {
    originCity,
    originState,
    originZip3,
    destinationCity,
    destinationState,
    destinationZip3,
    equipmentCode: equipmentCode || "FD",
  };

  const resp = await fetch("/api/intelligence-pairing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`[INTELLIGENCE] API error (${resp.status}): ${text}`);
  }

  return resp.json();
}

export default callIntelligencePairingApi;

// ---------- Helpers ----------

async function resolveZip3(city, state) {
  // 1) Supabase first (read-only from browser)
  const zip3Db = await getZip3FromSupabase(city, state);
  if (zip3Db) return zip3Db;

  // 2) HERE fallback
  const zip3Here = await getZip3FromHereByCityState(city, state);
  if (zip3Here) {
    // 3) Cache HERE-derived zip3 securely via server API
    cacheZip3Server(city, state, zip3Here).catch((e) =>
      console.warn("[ZIP3] Cache upsert failed (ignored):", e)
    );
    return zip3Here;
  }

  return null;
}

async function getZip3FromSupabase(city, state) {
  try {
    const c = (city || "").trim();
    const s = (state || "").trim().toUpperCase();

    const { data, error } = await supabase
      .from("zip3s")
      .select("zip3")
      .eq("state", s)
      .ilike("city", c) // case-insensitive
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[ZIP3] Supabase read error (ignored):", error);
      return null;
    }
    return data?.zip3 || null;
  } catch (e) {
    console.warn("[ZIP3] Supabase read exception (ignored):", e);
    return null;
  }
}

async function getZip3FromHereByCityState(city, state) {
  try {
    const key = process.env.NEXT_PUBLIC_HERE_API_KEY || process.env.HERE_API_KEY;
    if (!key) {
      console.warn("[ZIP3] HERE key missing; skipping HERE fallback");
      return null;
    }
    const q = encodeURIComponent(`${city}, ${state}, USA`);
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${q}&in=countryCode:USA&apiKey=${key}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn("[ZIP3] HERE fetch non-OK:", resp.status);
      return null;
    }
    const json = await resp.json();
    const pc = json?.items?.[0]?.address?.postalCode || "";
    const zip5 = pc.match(/\d{5}/)?.[0] || "";
    const zip3 = zip5.slice(0, 3);
    return zip3 || null;
  } catch (e) {
    console.warn("[ZIP3] HERE exception (ignored):", e);
    return null;
  }
}

async function cacheZip3Server(city, state, zip3) {
  await fetch("/api/cache-zip3", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, state, zip3 }),
  });
}