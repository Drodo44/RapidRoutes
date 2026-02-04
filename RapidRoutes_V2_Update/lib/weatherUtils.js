export function getLaneRiskTag(lane) {
  const highRiskStates = ["CO", "WY", "MT", "ND"];
  const winterMonths = [12, 1, 2];
  const today = new Date();
  const month = today.getMonth() + 1;

  if (highRiskStates.includes(lane.origin_state) || highRiskStates.includes(lane.dest_state)) {
    if (winterMonths.includes(month)) {
      return { label: "⚠ Weather Risk", note: "Snow/ice likely in mountainous region" };
    }
  }

  if (lane.weight > 48000) {
    return { label: "⚠ Overweight", note: "Weight may exceed bridge limits" };
  }

  return null;
}

export function getHeatColor(rrs) {
  if (rrs >= 85) return "text-green-400";
  if (rrs >= 65) return "text-yellow-400";
  return "text-red-400";
}
