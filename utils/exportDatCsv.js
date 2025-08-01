// lib/exportDatCsv.js
import Papa from "papaparse";

// Utility to generate valid DAT rows
export function generateDatCsvRows(lanes) {
  const headers = [
    "Pickup Earliest*", "Pickup Latest", "Length (ft)*", "Weight (lbs)*",
    "Full/Partial*", "Equipment*", "Use Private Network*", "Private Network Rate",
    "Allow Private Network Booking", "Allow Private Network Bidding",
    "Use DAT Loadboard*", "DAT Loadboard Rate", "Allow DAT Loadboard Booking",
    "Use Extended Network", "Contact Method*", "Origin City*", "Origin State*",
    "Origin Postal Code", "Destination City*", "Destination State*",
    "Destination Postal Code", "Comment", "Commodity", "Reference ID"
  ];

  const output = [];

  lanes.forEach((lane) => {
    const crawlCities = generateSmartCrawlCities(lane.origin_city);
    const crawlDest = generateSmartCrawlCities(lane.dest_city);

    const crawls = [lane.origin_city].concat(crawlCities.slice(0, 10));
    const dests = [lane.dest_city].concat(crawlDest.slice(0, 10));

    for (let i = 0; i < crawls.length; i++) {
      const rowBase = [
        lane.date, lane.date, lane.length, randomWeight(),
        "Full", lane.equipment, "YES", "", "NO", "NO",
        "YES", "", "NO", "NO", "", crawls[i], lane.origin_state,
        "", dests[i], lane.dest_state, "", "", "", ""
      ];

      output.push([...rowBase.slice(0, 14), "Email", ...rowBase.slice(15)]);
      output.push([...rowBase.slice(0, 14), "Primary Phone", ...rowBase.slice(15)]);
    }
  });

  return [headers].concat(output);
}

function randomWeight() {
  return Math.floor(46750 + Math.random() * (48000 - 46750));
}

// Placeholder: real logic should use DB of KMA/city data
function generateSmartCrawlCities(city) {
  const sample = [
    "Hammond", "Decatur", "Dayton", "Evansville", "Owensboro",
    "Lafayette", "Florence", "Marion", "Terre Haute", "Bloomington"
  ];
  return sample.sort(() => 0.5 - Math.random()).slice(0, 10);
}
