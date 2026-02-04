// lib/rrsi.js

export function calculateRRSI(lane) {
  let score = 70;

  if (["TX", "FL", "CA"].includes(lane.dest_state)) score += 10;
  if (lane.equipment === "FD") score += 5;
  if (lane.weight < 47000) score += 5;

  return Math.min(100, score);
}
