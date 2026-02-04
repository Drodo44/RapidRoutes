// utils/reeferAdvisor.js

const reeferHotMarkets = [
  "Salinas, CA", "Yakima, WA", "Nogales, AZ", "McAllen, TX", "Miami, FL",
  "Fresno, CA", "Atlanta, GA", "Twin Falls, ID", "Watsonville, CA", "Green Bay, WI"
];

export function shouldSuggestReefer(lane) {
  if (!lane.equipment || !["V", "VV", "VT"].includes(lane.equipment)) return false;

  const origin = `${lane.originCity}, ${lane.originState}`;
  const destination = `${lane.destCity}, ${lane.destState}`;

  const isOriginHot = reeferHotMarkets.includes(origin);
  const isDestHot = reeferHotMarkets.includes(destination);

  if (isOriginHot || isDestHot) {
    const reason = isOriginHot
      ? `produce season in ${origin}`
      : `seasonal demand in ${destination}`;
    return { show: true, reason };
  }

  return { show: false };
}
