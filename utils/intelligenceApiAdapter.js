import axios from 'axios';
// Browser-safe anon client (do NOT use service role here)
import supabase from './supabaseClient';

// Public-only HERE key for browser usage. Do NOT reference process.env.HERE_API_KEY here.
const HERE_API_KEY = process.env.NEXT_PUBLIC_HERE_API_KEY;
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

// Direct HERE geocode request (browser) – uses ONLY the public key.
async function fetchHereZip3(city, state) {
  if (!HERE_API_KEY) {
    console.error("[HERE] Missing NEXT_PUBLIC_HERE_API_KEY");
    return null;
  }
  try {
    const query = `${city}, ${state}`;
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&apiKey=${HERE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[HERE] API error: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const postal = data.items?.[0]?.address?.postalCode;
    return postal ? postal.slice(0, 3) : null;
  } catch (e) {
    console.warn('[HERE] Exception (ignored):', e);
    return null;
  }
}

// Backwards compatibility wrapper used elsewhere in code.
async function getZip3FromHereByCityState(city, state) {
  return fetchHereZip3(city, state);
}

async function cacheZip3Server(city, state, zip3) {
  await fetch("/api/cache-zip3", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, state, zip3 }),
  });
}