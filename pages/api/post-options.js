// Real nearby city lookup (lane-driven) – replaces earlier radius + HERE hybrid logic with direct DB geo proximity for us_cities.
// pages/api/post-options.js
import { adminSupabase as supabase } from "@/utils/supabaseAdminClient";

function toRad(value) {
  return (value * Math.PI) / 180;
}

// Haversine distance (miles)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Group results by KMA and spread them evenly
function balanceByKMA(cities, max = 50) {
  const grouped = {};
  for (const c of cities) {
    if (!grouped[c.kma_code]) grouped[c.kma_code] = [];
    grouped[c.kma_code].push(c);
  }

  // Sort each group by distance
  for (const kma in grouped) {
    grouped[kma].sort((a, b) => a.distance - b.distance);
  }

  // Round-robin pull from each KMA until cap
  const results = [];
  let added = true;
  while (results.length < max && added) {
    added = false;
    for (const kma in grouped) {
      if (grouped[kma].length > 0 && results.length < max) {
        results.push(grouped[kma].shift());
        added = true;
      }
    }
  }
  return results;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { laneId } = req.body;
  if (!laneId) {
    return res.status(400).json({ error: "Missing laneId" });
  }

  try {
    // 1. Fetch the lane
    const { data: lane, error: laneErr } = await supabase
      .from("lanes")
      .select("*")
      .eq("id", laneId)
      .single();

    if (laneErr || !lane) {
      return res.status(404).json({ error: "Lane not found" });
    }

    // Lane coords
    const originLat = lane.origin_latitude;
    const originLon = lane.origin_longitude;
    const destLat = lane.dest_latitude;
    const destLon = lane.dest_longitude;

    if (
      originLat == null ||
      originLon == null ||
      destLat == null ||
      destLon == null
    ) {
      return res.status(400).json({ error: "Lane missing coordinates" });
    }

    // 2. Fetch candidate cities (limit radius 120 miles by rough lat/lon box first)
    const latMin = Math.min(originLat, destLat) - 2;
    const latMax = Math.max(originLat, destLat) + 2;
    const lonMin = Math.min(originLon, destLon) - 2;
    const lonMax = Math.max(originLon, destLon) + 2;

    const { data: cities, error: cityErr } = await supabase
      .from("us_cities")
      .select("id, city, state, latitude, longitude, zip3, kma_code")
      .gte("latitude", latMin)
      .lte("latitude", latMax)
      .gte("longitude", lonMin)
      .lte("longitude", lonMax);

    if (cityErr) {
      console.error("Error fetching cities:", cityErr);
      return res.status(500).json({ error: "Failed to fetch cities" });
    }

    if (!cities || cities.length === 0) {
      return res.status(404).json({ error: "No cities found near lane" });
    }

    // 3. Enrich with KMA if missing (serial for simplicity; could batch)
    const enriched = [];
    for (const c of cities) {
      let kma = c.kma_code;
      if (!kma && c.zip3) {
        const { data: zipRow } = await supabase
          .from("zip3s")
          .select("kma_code")
          .eq("zip3", c.zip3)
          .maybeSingle();
        if (zipRow) kma = zipRow.kma_code;
      }
      enriched.push({ ...c, kma_code: kma || "UNK" });
    }

    // 4. Calculate distances
    const originOptions = enriched
      .map((c) => ({
        ...c,
        distance: haversine(originLat, originLon, c.latitude, c.longitude),
      }))
      .filter((c) => c.distance <= 100);

    const destOptions = enriched
      .map((c) => ({
        ...c,
        distance: haversine(destLat, destLon, c.latitude, c.longitude),
      }))
      .filter((c) => c.distance <= 100);

    // 5. Balance across KMAs
    const balancedOrigin = balanceByKMA(originOptions, 50);
    const balancedDest = balanceByKMA(destOptions, 50);

    return res.status(200).json({
      success: true,
      laneId,
      origin: {
        city: lane.origin_city,
        state: lane.origin_state,
        options: balancedOrigin,
      },
      destination: {
        city: lane.dest_city,
        state: lane.dest_state,
        options: balancedDest,
      },
      originOptions: balancedOrigin,
      destOptions: balancedDest,
    });
  } catch (err) {
    console.error("post-options error", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}