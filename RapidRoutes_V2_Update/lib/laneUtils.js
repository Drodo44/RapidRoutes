export function formatMiles(miles) {
  if (!miles) return "-";
  return `${parseFloat(miles).toFixed(1)} mi`;
}

export function groupLanesByEquipment(lanes) {
  const groups = {};
  lanes.forEach((lane) => {
    const eq = lane.equipment || "Other";
    if (!groups[eq]) groups[eq] = [];
    groups[eq].push(lane);
  });
  return groups;
}
