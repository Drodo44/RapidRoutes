import axios from 'axios';
// Browser-safe anon client (do NOT use service role here)
import supabase from './supabaseClient';

const HERE_API_KEY = process.env.HERE_API_KEY; // Should be undefined client-side unless explicitly exposed (keep calls server-side if sensitive)
const ZIP3_RETRY_ENABLED = process.env.ZIP3_RETRY_ENABLED === 'true';

async function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

export async function resolveZip3(city, state) {
  if (!city || !state) return null;
  const normalizedCity = city.trim();
  const normalizedState = state.trim().toUpperCase();
  try {
    // Read-only lookup using anon client (RLS must allow select on zip3s)
    const { data, error } = await supabase
      .from('zip3s')
      .select('zip3')
      .eq('city', normalizedCity)
      .eq('state', normalizedState)
      .maybeSingle();
    if (error) throw error;
    if (data?.zip3) return data.zip3;
  } catch (err) {
    console.warn(`[ZIP3] Supabase anon lookup failed for ${city}, ${state}:`, err.message);
  }

  // HERE geocode lookup (client-side) — consider moving server-side if rate-limited/sensitive
  const fetchFromHere = async () => {
    const url = 'https://geocode.search.hereapi.com/v1/geocode';
    const { data } = await axios.get(url, { params: { q: `${city}, ${state}, USA`, apiKey: HERE_API_KEY }});
    const postalCode = data?.items?.[0]?.address?.postalCode;
    if (!postalCode) return null;
    return postalCode.slice(0,3);
  };

  let zip3 = null;
  if (ZIP3_RETRY_ENABLED) {
    let attempt = 0;
    while (attempt < 3 && !zip3) {
      try { zip3 = await fetchFromHere(); }
      catch (err) { console.warn(`[ZIP3] HERE attempt ${attempt+1} failed:`, err.message); await wait(500 * Math.pow(2, attempt)); }
      attempt++;
    }
  } else {
    zip3 = await fetchFromHere().catch(err => { console.error('[ZIP3] HERE fallback error:', err.message); return null; });
  }

  // Skip caching write from browser (would require service role / elevated RLS). Optionally, send to API route later.
  return zip3;
}

export async function buildPairingPayload(lane) {
  const originZip3 = await resolveZip3(lane.originCity, lane.originState);
  const destinationZip3 = await resolveZip3(lane.destinationCity, lane.destinationState);
  return {
    originCity: lane.originCity,
    originState: lane.originState,
    originZip3,
    destinationCity: lane.destinationCity,
    destinationState: lane.destinationState,
    destinationZip3,
    equipmentCode: lane.equipmentCode || null,
  };
}

export async function sendToPairingApi(payload) {
  const response = await axios.post('/api/intelligence-pairing', payload);
  return response.data;
}

export async function callIntelligencePairingApi(lane) {
  const payload = await buildPairingPayload(lane);
  return await sendToPairingApi(payload);
}