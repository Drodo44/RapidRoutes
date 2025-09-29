// pages/api/post-options.js
// Returns nearby origin/destination city options (manual posting workflow)
import { adminSupabase } from '../../utils/supabaseAdminClient.js';
import axios from 'axios';

const HERE_API_KEY = process.env.HERE_API_KEY; // server-only key

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { originCity, originState, destCity, destState, radiusMiles = 100 } = req.body || {};
    if (!originCity || !originState || !destCity || !destState) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [originLL, destLL] = await Promise.all([
      resolveLatLng(originCity, originState),
      resolveLatLng(destCity, destState)
    ]);

    if (!originLL || !destLL) {
      return res.status(400).json({ error: 'Unable to resolve lat/lng for one or both cities' });
    }

    const [originNearbyRaw, destNearbyRaw] = await Promise.all([
      fetchNearbyCities(originLL, radiusMiles),
      fetchNearbyCities(destLL, radiusMiles)
    ]);

    const originOptions = await enrichCities(originLL, originNearbyRaw, radiusMiles);
    const destOptions   = await enrichCities(destLL, destNearbyRaw, radiusMiles);

    return res.status(200).json({
      success: true,
      origin: { city: originCity, state: originState, ...originLL },
      destination: { city: destCity, state: destState, ...destLL },
      originOptions,
      destOptions
    });
  } catch (err) {
    console.error('[post-options] error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ---------- helpers ----------

async function resolveLatLng(city, state) {
  const candidates = [
    { table: 'cities', latCols: ['latitude','lat'], lngCols: ['longitude','lng'] },
    { table: 'us_cities', latCols: ['latitude','lat'], lngCols: ['longitude','lng'] },
    { table: 'city_locations', latCols: ['lat'], lngCols: ['lng'] }
  ];

  for (const c of candidates) {
    for (const latCol of c.latCols) {
      for (const lngCol of c.lngCols) {
        try {
          const { data, error } = await adminSupabase
            .from(c.table)
            .select(`city,state_or_province,state,${latCol},${lngCol}`)
            .or(`state.eq.${state},state_or_province.eq.${state}`)
            .ilike('city', city)
            .limit(1)
            .maybeSingle();
          if (!error && data && data[latCol] && data[lngCol]) {
            return { lat: Number(data[latCol]), lng: Number(data[lngCol]) };
          }
        } catch { /* try next combo */ }
      }
    }
  }
  if (!HERE_API_KEY) return null;
  try {
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(`${city}, ${state}, USA`)}&in=countryCode:USA&apiKey=${HERE_API_KEY}`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const hit = data?.items?.[0]?.position;
    if (hit?.lat && hit?.lng) return { lat: hit.lat, lng: hit.lng };
  } catch (e) {
    console.error('[HERE geocode] error', e?.response?.data || e.message);
  }
  return null;
}

async function fetchNearbyCities(centerLL, radiusMiles) {
  const { lat, lng } = centerLL;
  const latDelta = radiusMiles / 69; // ~69 miles per degree latitude
  const lngDelta = radiusMiles / (Math.cos((lat * Math.PI)/180) * 69);
  const tables = [
    { table: 'cities', latCols: ['latitude','lat'], lngCols: ['longitude','lng'], zipCols: ['zip','zipcode'], kmaCols: ['kma_code'] },
    { table: 'us_cities', latCols: ['latitude'], lngCols: ['longitude'], zipCols: ['zip'], kmaCols: ['kma_code'] },
    { table: 'city_locations', latCols: ['lat'], lngCols: ['lng'], zipCols: ['zipcode','zip'], kmaCols: ['kma_code'] }
  ];
  for (const t of tables) {
    for (const la of t.latCols) {
      for (const lo of t.lngCols) {
        for (const z of t.zipCols) {
          for (const k of t.kmaCols) {
            try {
              const { data, error } = await adminSupabase
                .from(t.table)
                .select(`city,state_or_province,state,${z},${la},${lo},${k}`)
                .gte(la, lat - latDelta)
                .lte(la, lat + latDelta)
                .gte(lo, lng - lngDelta)
                .lte(lo, lng + lngDelta)
                .limit(500);
              if (!error && Array.isArray(data) && data.length) {
                return data.map(r => ({
                  city: r.city,
                  state: r.state || r.state_or_province,
                  zip: r[z] || null,
                  lat: Number(r[la]),
                  lng: Number(r[lo]),
                  kma_code: r[k] || null
                })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
              }
            } catch { /* try next combination */ }
          }
        }
      }
    }
  }
  return [];
}

function haversineMiles(a, b) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI)/180;
  const dLng = ((b.lng - a.lng) * Math.PI)/180;
  const s1 = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s1));
}

async function enrichCities(centerLL, rows, radiusMiles) {
  const withMiles = rows.map(r => ({
    ...r,
    miles: Math.round(haversineMiles(centerLL, { lat: r.lat, lng: r.lng })),
    zip3: r.zip ? String(r.zip).slice(0,3) : null
  })).filter(r => r.miles <= radiusMiles);

  const missingZip3 = withMiles.filter(r => r.zip3 && !r.kma_code).map(r => r.zip3);
  let kmaByZip3 = {};
  if (missingZip3.length) {
    const uniq = Array.from(new Set(missingZip3));
    try {
      const { data } = await adminSupabase.from('zip3s').select('zip3,kma_code').in('zip3', uniq);
      for (const row of (data||[])) kmaByZip3[row.zip3] = row.kma_code || null;
    } catch {}
  }
  return withMiles.map(r => ({
    city: r.city,
    state: r.state,
    zip3: r.zip3,
    kma: r.kma_code || (r.zip3 ? kmaByZip3[r.zip3] || null : null),
    miles: r.miles
  })).sort((a,b) => a.miles - b.miles).slice(0,50);
}