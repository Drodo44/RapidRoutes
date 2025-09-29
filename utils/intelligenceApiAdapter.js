import adminSupabase from './supabaseAdminClient.js';

const HERE_API_KEY = process.env.HERE_API_KEY;
const ZIP3_RETRY_ENABLED = process.env.ZIP3_RETRY_ENABLED === 'true';

async function withRetry(fn, label, retries = 3) {
  let attempt = 0;
  let delay = 200;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      if (!ZIP3_RETRY_ENABLED || attempt === retries) {
        throw new Error(`[${label}] failed after ${attempt + 1} attempts: ${err.message}`);
      }
      console.warn(`[${label}] retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
      attempt++;
    }
  }
}

async function cacheZip3(city, state, zip3) {
  try {
    const { error } = await adminSupabase.from('zip3s').upsert(
      { city, state, zip3 },
      { onConflict: ['city', 'state'] }
    );
    if (error) console.error('[CACHE] Failed to cache zip3:', error);
    else console.log(`[CACHE] Cached zip3 ${zip3} for ${city}, ${state}`);
  } catch (e) {
    console.error('[CACHE] Unexpected cache error:', e);
  }
}

async function resolveZip3(city, state, type) {
  const trySupabase = async () => {
    const { data, error } = await adminSupabase
      .from('zip3s')
      .select('zip3')
      .eq('city', city)
      .eq('state', state)
      .maybeSingle();
    if (error) throw error;
    if (data?.zip3) return data.zip3;
    throw new Error(`No Supabase match for ${city}, ${state}`);
  };
  const tryHere = async () => {
    const q = `${city}, ${state}, USA`;
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(q)}&apiKey=${HERE_API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HERE error ${resp.status}`);
    const json = await resp.json();
    const postal = json.items?.[0]?.address?.postalCode;
    if (!postal) throw new Error('HERE no postalCode');
    const zip3 = postal.slice(0,3);
    await cacheZip3(city, state, zip3);
    return zip3;
  };
  try {
    return await withRetry(trySupabase, `${type}-supabase`);
  } catch {
    return await withRetry(tryHere, `${type}-here`);
  }
}

export async function buildPairingPayload(lane) {
  const originZip3 = await resolveZip3(lane.originCity, lane.originState, 'origin');
  const destinationZip3 = await resolveZip3(lane.destinationCity, lane.destinationState, 'destination');
  return {
    originCity: lane.originCity,
    originState: lane.originState,
    originZip3,
    destinationCity: lane.destinationCity,
    destinationState: lane.destinationState,
    destinationZip3,
    equipmentCode: lane.equipmentCode || 'FD'
  };
}

export async function sendToPairingApi(lane) {
  const payload = await buildPairingPayload(lane);
  const res = await fetch('/api/intelligence-pairing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pairing API failed: ${res.status} ${text}`);
  }
  return res.json();
}