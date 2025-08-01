// lib/sellingPoints.js

export function getSellingPoint(originCity, destCity, equipment) {
  const key = `${originCity.toLowerCase()}-${destCity.toLowerCase()}-${equipment.toLowerCase()}`;

  const database = {
    "chicago-dallas-fd": "High volume route with strong reload in TX",
    "atlanta-miami-rf": "Steady reefer demand, seasonal peak support",
    "laredo-mcallen-fd": "Strong border market; rapid spot moves"
  };

  return database[key] || "";
}
