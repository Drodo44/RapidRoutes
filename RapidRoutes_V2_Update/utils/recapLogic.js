// utils/recapLogic.js

export function getDistanceToMarket(originZip, destZip) {
  const origin = parseInt(originZip?.slice(0, 3), 10);
  const dest = parseInt(destZip?.slice(0, 3), 10);
  return Math.abs(origin - dest) * 7; // Fake miles for demo
}

export function getSellingPoints(originCity, destCity) {
  if (originCity === "Chicago" || destCity === "Chicago") return "Hot market, strong reloads.";
  if (originCity === "Laredo") return "Mexico crossover, high urgency outbound.";
  return "Strategic volume and outbound density.";
}

export function getWeatherFlags(origin, dest) {
  if (["Buffalo", "Minneapolis"].includes(origin) || ["Fargo", "Denver"].includes(dest)) {
    return "⚠️ Possible Snow/Storm Risk";
  }
  return "";
}
