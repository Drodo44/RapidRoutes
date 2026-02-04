import cities from "../data/allCities.json";

export function autofillState(cityInput) {
  const match = cities.find(
    (c) => c.city.toLowerCase() === cityInput.toLowerCase()
  );
  return match?.state || "";
}
