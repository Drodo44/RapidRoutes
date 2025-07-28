import { supabase } from "../utils/supabaseClient";

// Fetch 10 unique origin + 10 unique destination cities near each lane (75 miles radius)
export async function generateCrawlCities(originCity, destinationCity) {
  const [origin, destination] = await Promise.all([
    fetchNearbyCities(originCity),
    fetchNearbyCities(destinationCity),
  ]);

  // Return 10 origin + 10 destination cities (no duplicates, sorted by freight density)
  const crawls = origin.slice(0, 10).map((city, idx) => ({
    city: city.city,
    state: city.state_or_province,
    zip: city.zip || "",
    lat: city.latitude,
    lon: city.longitude,
    market: city.kma_name,
  }));

  return crawls;
}

async function fetchNearbyCities(baseCity) {
  // Find base city coords
  const { data: cityData } = await supabase
    .from("cities")
    .select("latitude, longitude, city, state_or_province, kma_name, zip")
    .ilike("city", baseCity)
    .limit(1);

  if (!cityData || !cityData.length) return [];

  const { latitude, longitude } = cityData[0];

  // Query nearby cities (within 75 miles)
  const { data: nearby } = await supabase.rpc("fetch_nearby_cities", {
    lat: latitude,
    lon: longitude,
    radius_miles: 75,
  });

  return nearby || [];
}
