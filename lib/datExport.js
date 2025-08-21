import Papa from "papaparse";

export function generateDATCSV(lanes) {
  const headers = [
    "Pickup Earliest*", "Pickup Latest", "Length (ft)*", "Weight (lbs)*",
    "Full/Partial*", "Equipment*", "Use Private Network*", "Private Network Rate",
    "Allow Private Network Booking", "Allow Private Network Bidding",
    "Use DAT Loadboard*", "DAT Loadboard Rate", "Allow DAT Loadboard Booking",
    "Use Extended Network", "Contact Method*", "Origin City*", "Origin State*",
    "Origin Postal Code", "Destination City*", "Destination State*", "Destination Postal Code",
    "Comment", "Commodity", "Reference ID", "RRSI ID"
  ];

  const rows = [];

  lanes.forEach((lane) => {
    const {
      pickupCity, pickupState, pickupZip,
      deliveryCity, deliveryState, deliveryZip,
      length, weightMin, weightMax, earliestDate, latestDate,
      equipment, comment, contactMethods, randomize,
    } = lane;

    const randomWeight = () =>
      Math.floor(
        Math.random() * (parseInt(weightMax || 48000) - parseInt(weightMin || 46750)) +
        parseInt(weightMin || 46750)
      );

    const baseRow = {
      "Pickup Earliest*": earliestDate,
      "Pickup Latest": latestDate,
      "Length (ft)*": length || "48",
      "Weight (lbs)*": randomize ? randomWeight() : weightMin,
      "Full/Partial*": "Full",
      "Equipment*": equipment || "FD",
      "Use Private Network*": "NO",
      "Private Network Rate": "",
      "Allow Private Network Booking": "NO",
      "Allow Private Network Bidding": "NO",
      "Use DAT Loadboard*": "YES",
      "DAT Loadboard Rate": "",
      "Allow DAT Loadboard Booking": "NO",
      "Use Extended Network": "NO",
      "Origin City*": pickupCity,
      "Origin State*": pickupState,
      "Origin Postal Code": pickupZip || "",
      "Destination City*": deliveryCity,
      "Destination State*": deliveryState,
      "Destination Postal Code": deliveryZip || "",
      "Comment": comment || "",
      "Commodity": "",
      "Reference ID": ""
    };

    contactMethods.forEach((method) => {
      rows.push({ ...baseRow, "Contact Method*": method });
    });
  });

  return Papa.unparse([headers, ...rows.map((r) => headers.map((h) => r[h] || ""))]);
}
