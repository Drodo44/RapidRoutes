export function calculateRRSI(lane) {
  let score = 50;

  if (lane.weight > 47000) score += 5;
  if (lane.equipment === "FD" || lane.equipment === "RGN") score += 5;
  if (lane.comment?.toLowerCase().includes("hazmat")) score -= 15;
  if (lane.length > 48) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export function generateSmartComment(lane) {
  const parts = [];

  if (lane.equipment?.toLowerCase().includes("flatbed")) {
    parts.push("Straps/tarps may be required");
  }
  if (lane.weight > 47000) {
    parts.push("Heavy haul – check weight limits");
  }
  if ((lane.origin_state === "NY" || lane.dest_state === "NY") && lane.equipment !== "Reefer") {
    parts.push("No NYC tolls");
  }

  return parts.length ? parts.join(" / ") : "Standard freight lane";
}
