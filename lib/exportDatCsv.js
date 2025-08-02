import { getCrawlCitiesNear } from "./cityUtils";

export async function generateDatCsvRows(lanes, settings) {
  const rows = [];

  for (const lane of lanes) {
    const pickups = await getCrawlCitiesNear(lane.origin_zip);
    const drops = await getCrawlCitiesNear(lane.dest_zip);

    const allCombos = [
      { city: lane.origin_city, state: lane.origin_state, zip: lane.origin_zip },
      ...pickups,
    ].slice(0, 10).map((pickup) =>
      [
        { city: lane.dest_city, state: lane.dest_state, zip: lane.dest_zip },
        ...drops,
      ]
        .slice(0, 10)
        .map((drop) => ({
          origin_city: pickup.city,
          origin_state: pickup.state,
          origin_zip: pickup.zip,
          dest_city: drop.city,
          dest_state: drop.state,
          dest_zip: drop.zip,
        }))
    ).flat();

    for (const combo of allCombos.slice(0, 11)) {
      ["Email", "Primary Phone"].forEach((contactMethod) => {
        rows.push({
          "Pickup Earliest*": lane.date,
          "Pickup Latest": lane.date,
          "Length (ft)*": "48",
          "Weight (lbs)*":
            Math.floor(
              Math.random() * (settings.weightMax - settings.weightMin + 1)
            ) + settings.weightMin,
          "Full/Partial*": "Full",
          "Equipment*": lane.equipment || settings.trailer || "FD",
          "Use Private Network*": "",
          "Private Network Rate": "",
          "Allow Private Network Booking": "",
          "Allow Private Network Bidding": "",
          "Use DAT Loadboard*": "Yes",
          "DAT Loadboard Rate": "",
          "Allow DAT Loadboard Booking": "",
          "Use Extended Network": "",
          "Contact Method*": contactMethod,
          "Origin City*": combo.origin_city,
          "Origin State*": combo.origin_state,
          "Origin Postal Code": combo.origin_zip,
          "Destination City*": combo.dest_city,
          "Destination State*": combo.dest_state,
          "Destination Postal Code": combo.dest_zip,
          Comment: lane.comment || "",
          Commodity: lane.commodity || "",
          "Reference ID": "",
        });
      });
    }
  }

  return rows;
}
