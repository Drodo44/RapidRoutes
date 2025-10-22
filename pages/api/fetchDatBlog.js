// pages/api/fetchDatBlog.js
// Weekly cron to fetch DAT blog market maps, store to Supabase Storage, and index in dat_maps.
// Idempotent by (effective_date, equipment).
//
// This scraper is defensive: it tries to locate images with "hot" + "map" hints and
// associates likely equipment by filename/alt. If nothing found, responds gracefully.

import supabaseAdmin from "@/lib/supabaseAdmin";

async function ensureBucket() {
  try {
    // Make sure bucket exists (public)
    const { data: list } = await adminSupabase.storage.listBuckets();
    const exists = (list || []).some((b) => b.name === 'dat_maps');
    if (!exists) {
      await adminSupabase.storage.createBucket('dat_maps', { public: true });
    }
  } catch (e) {
    // ignore if already exists
  }
}

function guessEquipmentFrom(src, alt) {
  const s = (src || '' + ' ' + (alt || '')).toLowerCase();
  if (s.includes('reefer') || s.includes('rfm') || /r(v|eefer)/.test(s)) return 'reefer';
  if (s.includes('flatbed') || s.includes('fbm') || s.includes('open-deck')) return 'flatbed';
  return 'van';
}

function pickEffectiveDate(html) {
  // Try to find a date in the article like "August 19, 2025"
  const m = html.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/);
  if (m) return new Date(m[0]);
  // fallback to today UTC
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function alreadyIndexed(effectiveDateISO, equipment) {
  const { data, error } = await adminSupabase
    .from('dat_maps')
    .select('id')
    .eq('effective_date', effectiveDateISO)
    .eq('equipment', equipment)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureBucket();

    // Fetch a likely DAT market update page
    const url = 'https://www.dat.com/blog/';
    const resp = await fetch(url, { headers: { 'User-Agent': 'RapidRoutesBot/1.0' } });
    if (!resp.ok) throw new Error(`Fetch failed ${resp.status}`);
    const html = await resp.text();

    // Find candidate images (very defensive). Look for "hot" and "map".
    const imgMatches = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi))
      .map((m) => ({ src: m[1], alt: m[2] }))
      .filter(({ src, alt }) => {
        const s = (src + ' ' + alt).toLowerCase();
        return s.includes('map') || s.includes('hot');
      });

    if (!imgMatches.length) {
      return res.status(200).json({ message: 'No candidate images found; try manual upload later.' });
    }

    // Effective date
    const eff = pickEffectiveDate(html);
    const effISO = eff.toISOString().slice(0, 10); // YYYY-MM-DD
    const folder = `${effISO}`;

    // Try to collect up to one per equipment
    const picks = { van: null, reefer: null, flatbed: null };
    for (const img of imgMatches) {
      const eq = guessEquipmentFrom(img.src, img.alt);
      if (!picks[eq]) picks[eq] = img;
      if (picks.van && picks.reefer && picks.flatbed) break;
    }

    const saved = [];
    for (const eq of ['van', 'reefer', 'flatbed']) {
      const img = picks[eq];
      if (!img) continue;

      // Idempotency check
      if (await alreadyIndexed(effISO, eq)) {
        saved.push({ equipment: eq, status: 'exists' });
        continue;
      }

      // Download the image
      const abs = img.src.startsWith('http') ? img.src : new URL(img.src, url).href;
      const get = await fetch(abs);
      if (!get.ok) continue;
      const buf = Buffer.from(await get.arrayBuffer());
      const path = `${folder}/${eq}.png`;

      // Upload to Storage (overwrite if exists)
      await adminSupabase.storage.from('dat_maps').upload(path, buf, {
        contentType: 'image/png',
        upsert: true,
      });

      // Insert row
      await adminSupabase
        .from('dat_maps')
        .insert([{ effective_date: effISO, equipment: eq, image_path: path, summary: img.alt || null }]);

      saved.push({ equipment: eq, status: 'saved', path });
    }

    return res.status(200).json({ effective_date: effISO, saved });
  } catch (err) {
    console.error('fetchDatBlog error:', err);
    return res.status(500).json({ error: err.message || 'Fetch failed' });
  }
}
