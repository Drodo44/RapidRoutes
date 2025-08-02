import { supabase } from "../utils/supabaseClient";

export async function getCrawlCitiesNear(zip) {
  if (!zip) return [];

  const { data: baseCityData } = await supabase
    .from("cities")
    .select("*")
    .eq("ZIP", zip)
    .single();

  if (!baseCityData) return [];

  const { Latitude: lat1, Longitude: lon1 } = baseCityData;

  const { data: nearby } = await supabase
    .from("cities")
    .select("*")
    .neq("ZIP", zip);

  const radiusMiles = 75;
  const results = [];

  for (const city of nearby) {
    const dist = haversineDistance(lat1, lon1, city.Latitude, city.Longitude);
    if (dist <= radiusMiles) {
      results.push({
        city: city.City,
        state: city.State,
        zip: city.ZIP,
      });
    }
  }

  return results.slice(0, 10); // max 10 unique crawl cities
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 3959;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.asin(Math.sqrt(a));
}
