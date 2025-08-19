// pages/api/cities.js
// GET /api/cities?q=City[, ST|ZIP]
// - No dependency on nonexistent columns (postal_code removed)
// - DAT-style: returns { id, city, state, zip, label } with "City, ST ZIP"
// - Typing digits searches ZIP; "City, ST" respected; up to 12 results.

import { adminSupabase } from '../../utils/supabaseClient';

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
    let query = adminSupabase
      .from('cities')
      .select('id, city, state_or_province, zip, latitude, longitude, kma_code, is_hot, population')
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

    // Prioritize: exact state match > is_hot > population desc
    const ranked = (data || []).sort((a, b) => {
      const asa = stateQ && a.state_or_province?.toUpperCase() === stateQ.toUpperCase() ? 1 : 0;
      const bsa = stateQ && b.state_or_province?.toUpperCase() === stateQ.toUpperCase() ? 1 : 0;
      if (bsa !== asa) return bsa - asa;
      if ((b.is_hot|0) !== (a.is_hot|0)) return (b.is_hot|0) - (a.is_hot|0);
      return (b.population|0) - (a.population|0);
    });

    const out = ranked.slice(0, 12).map(c => {
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

    return res.status(200).json(out);
  } catch (err) {
    console.error('GET /api/cities error:', err);
    return res.status(500).json({ error: 'Failed to search cities' });
  }
}
