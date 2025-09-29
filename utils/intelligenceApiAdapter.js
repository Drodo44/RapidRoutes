import { adminSupabase } from './supabaseClient.js';

/**
 * Intelligence API Adapter
 * 
 * This adapter ensures that requests to the intelligence-pairing API
 * are formatted correctly to avoid 400 Bad Request errors.
 * 
 * Key transformations:
 * 1. Renames dest_city/dest_state to destination_city/destination_state
 * 2. Converts all keys from camelCase to snake_case
 * 3. Ensures all required fields are present and non-empty
 * 
 * Required API parameters (snake_case):
 * - origin_city
 * - origin_state
 * - destination_city  (NOT dest_city)
 * - destination_state (NOT dest_state)
 * - equipment_code
 */

async function forceZip3(city, state) {
  const { data: supaData, error: supaErr } = await adminSupabase
    .from('cities')
    .select('zip3')
    .eq('city', city)
    .eq('state', state)
    .maybeSingle();

  if (supaErr) console.error('[ADAPTER] Supabase error:', supaErr);
  if (supaData?.zip3) return supaData.zip3;

  const resp = await fetch(`https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(`${city}, ${state}, USA`)}&apiKey=${process.env.HERE_API_KEY}`);
  if (!resp.ok) throw new Error(`HERE API error: ${resp.statusText}`);
  const data = await resp.json();
  const postalCode = data?.items?.[0]?.address?.postalCode;
  if (!postalCode) throw new Error(`HERE API gave no postal code for ${city}, ${state}`);
  return postalCode.slice(0, 3);
}

export async function callIntelligencePairingApi(lane) {
  const { originCity, originState, destinationCity, destinationState, equipmentCode } = lane;

  const originZip3 = await forceZip3(originCity, originState);
  const destinationZip3 = await forceZip3(destinationCity, destinationState);

  if (!originZip3 || !destinationZip3) {
    throw new Error('Missing zip3s — cannot proceed with pairing.');
  }

  const payload = {
    originCity,
    originState,
    destinationCity,
    destinationState,
    originZip3,
    destinationZip3,
    equipmentCode,
  };

  const response = await fetch('/api/intelligence-pairing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await response.text());
  return response.json();
}