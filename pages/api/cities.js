// pages/api/cities.js
// GET /api/cities?q=City[, ST|ZIP]
// - No dependency on nonexistent columns (postal_code removed)
// - DAT-style: returns { id, city, state, zip, label } with "City, ST ZIP"
// - Typing digits searches ZIP; "City, ST" respected; up to 12 results.

import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = String(req.query.q || '').trim();
  if (!q) return res.status(200).json([]);

  const looksZip = /\d/.test(q);
  let cityQ = q, stateQ = null;

  // Parse "City, ST"
  const parts = q.split(',').map(s => s.trim()).filter(Boolean);
  if (!looksZip && parts.length >= 2 && parts[1].length <= 3) {
    cityQ = parts[0];
    stateQ = parts[1];
  }

  try {
    let query = supabaseAdmin
      .from('cities')
      .select('id, city, state_or_province, zip, latitude, longitude, kma_code')
      .limit(150);

    if (looksZip) {
      // ZIP prefix search
      query = query.ilike('zip', `${q.replace(/\D/g, '')}%`);
    } else {
      query = query.ilike('city', `${cityQ}%`);
      if (stateQ) query = query.ilike('state_or_province', `${stateQ}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Prioritize exact state match
    const ranked = (data || []).sort((a, b) => {
      const asa = stateQ && a.state_or_province?.toUpperCase() === stateQ.toUpperCase() ? 1 : 0;
      const bsa = stateQ && b.state_or_province?.toUpperCase() === stateQ.toUpperCase() ? 1 : 0;
      if (bsa !== asa) return bsa - asa;
      // Alphabetical sorting as fallback
      return a.city.localeCompare(b.city);
    });

    let out = ranked.slice(0, 12).map(c => {
      const state = c.state_or_province;
      const zip = c.zip || '';
      return {
        id: c.id,
        city: c.city,
        state,
        zip,
        label: zip ? `${c.city}, ${state} ${zip}` : `${c.city}, ${state}`
      };
    });

    // If no results found in our database, try HERE.com API as fallback
    if (out.length === 0 && !looksZip) {
      console.log(`No local results for "${q}", trying HERE.com fallback...`);
      try {
        const hereResults = await fetchFromHereAPI(cityQ, stateQ);
        out = hereResults;
        console.log(`HERE.com returned ${hereResults.length} results`);
      } catch (hereError) {
        console.error('HERE.com fallback failed:', hereError);
        // Continue with empty results rather than failing
      }
    }

    return res.status(200).json(out);
  } catch (err) {
    console.error('GET /api/cities error:', err);
    return res.status(500).json({ error: 'Failed to search cities' });
  }
}

// HERE.com API fallback for cities not in our database
async function fetchFromHereAPI(city, state) {
  const hereApiKey = process.env.HERE_API_KEY;
  if (!hereApiKey) {
    console.warn('HERE_API_KEY not configured, skipping fallback');
    return [];
  }

  // Build search query
  let searchQuery = city;
  if (state) {
    searchQuery += `, ${state}`;
  }
  searchQuery += ', USA'; // Always search within USA

  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(searchQuery)}&apikey=${hereApiKey}&limit=5&in=countryCode:USA`;
  
  console.log(`HERE.com search: ${searchQuery}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HERE API returned ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    return [];
  }

  // Convert HERE results to our format
  const results = data.items.map((item, index) => {
    const address = item.address;
    const cityName = address.city || address.district || 'Unknown';
    const stateName = address.stateCode || address.state || 'Unknown';
    const zipCode = address.postalCode || '';
    
    return {
      id: `here-${index}`, // Temporary ID for HERE results
      city: cityName,
      state: stateName,
      zip: zipCode,
      label: zipCode ? `${cityName}, ${stateName} ${zipCode}` : `${cityName}, ${stateName}`,
      isHereResult: true, // Flag to indicate this came from HERE.com
      latitude: item.position?.lat,
      longitude: item.position?.lng
    };
  }).filter(result => result.city !== 'Unknown' && result.state !== 'Unknown');

  return results;
}
