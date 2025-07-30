// utils/laneHelpers.js
import allCities from "../data/cities.json"; // Or however your city DB is imported

// ALL DAT Equipment Types (from your PDF)
export const equipmentTypes = [
  { code: "FD", label: "FD Flatbed" },
  { code: "SD", label: "SD Stepdeck" },
  { code: "R", label: "R Reefer" },
  { code: "V", label: "V Dry Van" },
  { code: "SB", label: "SB Straight Box Truck" },
  { code: "PO", label: "PO Power Only" },
  { code: "DD", label: "DD Double Drop" },
  { code: "RG", label: "RG Removable Gooseneck" },
  { code: "BT", label: "BT B-Train" },
  { code: "MX", label: "MX Maxi" },
  // ...continue adding all DAT types from the official PDF...
];

// City, State autocomplete (returns array of matches)
export function getCitySuggestions(input) {
  if (!input) return [];
  const lc = input.toLowerCase();
  return allCities.filter(
    (city) =>
      `${city.city}, ${city.state}`.toLowerCase().includes(lc)
  ).slice(0, 10); // top 10 matches
}
