// utils/citySearch.js
import { supabase } from "./supabaseClient";

export async function searchCities(query) {
  if (!query || query.length < 2) return [];

  const isZip = /^\d{5}$/.test(query.trim());

  const { data, error } = await supabase
    .from("cities")
    .select("city, state, zip")
    .ilike(isZip ? "zip" : "city", `${query}%`)
    .limit(10);

  if (error) {
    console.error("Supabase city search error:", error.message);
    return [];
  }

  return data || [];
}
