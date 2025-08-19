// utils/api.js

import { supabase } from "./supabaseClient";

export async function fetchRecapLanes() {
  const { data, error } = await supabase.from("lanes").select("*");
  if (error) {
    console.error("Error fetching lanes:", error.message);
    return [];
  }
  return data.map((lane) => ({
    ...lane,
    rrs: Math.floor(Math.random() * 11) + 90, // Placeholder AI score
  }));
}
