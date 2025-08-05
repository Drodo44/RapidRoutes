import cities from "../data/allCities.json"; // Ensure this file is loaded properly

export function autofillState(city) {
  const match = cities.find(
    (c) => c.city.toLowerCase() === city.toLowerCase()
  );
  return match?.state || "";
}
