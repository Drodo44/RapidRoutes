// /lib/ai.js

// AI lane notes memory (fetch and save per lane)
export async function fetchLaneNotes(supabase, laneId, userId) {
  const { data, error } = await supabase
    .from("lane_notes")
    .select("*")
    .eq("lane_id", laneId)
    .eq("user_id", userId)
    .single();
  return data?.notes || "";
}

export async function saveLaneNotes(supabase, laneId, userId, notes) {
  // Upsert: update if exists, else insert
  await supabase
    .from("lane_notes")
    .upsert({ lane_id: laneId, user_id: userId, notes });
}

// Hazmat checker (simple: keywords; expand with real DB as needed)
export function isHazmat(lane) {
  if (!lane || !lane.notes) return false;
  const hazmatKeywords = ["hazmat", "flammable", "corrosive", "explosive", "dangerous"];
  return hazmatKeywords.some(kw => lane.notes.toLowerCase().includes(kw));
}

// Blocklist check (by ZIP/KMA); expects arrays on user profile or a DB table
export function isBlocked(lane, userBlocklist = []) {
  if (!lane) return false;
  // Block by origin or dest ZIP or KMA string
  return userBlocklist.some(
    block =>
      lane.origin_zip === block ||
      lane.dest_zip === block ||
      (lane.origin_kma && lane.origin_kma === block) ||
      (lane.dest_kma && lane.dest_kma === block)
  );
}

// Carrier watchlist suggestion (dummy logic—expand with history)
export function suggestCarriers(lane, carrierHistory = []) {
  // Return top 3 carriers with matching equipment/region
  return carrierHistory
    .filter(carrier =>
      carrier.equipment === lane.equipment &&
      carrier.regions?.includes(lane.origin_state)
    )
    .slice(0, 3);
}
