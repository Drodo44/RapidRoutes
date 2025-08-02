import cities from "../data/allCities.json";

export async function getCrawlCities(origin, destination) {
  // replace with real filtering logic based on KMA or ZIP
  const valid = cities.filter((c) => c.zip && c.city && c.state);

  const crawlCities = [];
  for (let i = 0; i < 10; i++) {
    crawlCities.push({
      pickup: valid[(i * 3) % valid.length],
      delivery: valid[(i * 7) % valid.length],
    });
  }

  crawlCities.unshift({
    pickup: origin,
    delivery: destination,
  });

  return crawlCities;
}
