// lib/carrierWatchlist.js

export function getTopCarriersForLane(originCity, destCity) {
  const key = `${originCity.toLowerCase()}-${destCity.toLowerCase()}`;

  const memory = {
    "chicago-dallas": ["Knight", "CRST", "Marten"],
    "atlanta-miami": ["Prime Inc", "Covenant"],
    "laredo-houston": ["PAM Transport", "Stevens"]
  };

  return memory[key] || [];
}
