// lib/generateDatCsv.js
import Papa from "papaparse";

export function generateDatCsv(lanes) {
  const headers = [
    "Pickup Earliest*", "Pickup Latest", "Length (ft)*", "Weight (lbs)*",
    "Full/Partial*", "Equipment*", "Use Private Network*", "Private Network Rate",
    "Allow Private Network Booking", "Allow Private Network Bidding", "Use DAT Loadboard*",
    "DAT Loadboard Rate", "Allow DAT Loadboard Booking", "Use Extended Network", "Contact Method*",
    "Origin City*", "Origin State*", "Origin Postal Code", "Destination City*", "Destination State*",
    "Destination Postal Code", "Comment", "Commodity", "Reference ID"
  ];

  const getRandomWeight = () => Math.floor(46750 + Math.random() * 1250);

  const csvRows = [];

  lanes.forEach((lane, i) => {
    const { origin_city, origin_state, origin_zip, dest_city, dest_state, dest_zip, equipment, comment } = lane;

    const cities75mi = [{ city: origin_city, state: origin_state, zip: origin_zip }]; // TODO: add smart crawl logic
    const dests75mi = [{ city: dest_city, state: dest_state, zip: dest_zip }]; // TODO: add smart crawl logic

    const allPostings = [...cities75mi.map(c => ({ origin: c, dest: { city: dest_city, state: dest_state, zip: dest_zip } })),
                         ...dests75mi.map(d => ({ origin: { city: origin_city, state: origin_state, zip: origin_zip }, dest: d }))];

    allPostings.forEach((post, index) => {
      ["Email", "Primary Phone"].forEach(method => {
        csvRows.push({
          "Pickup Earliest*": "7/10/2025",
          "Pickup Latest": "7/11/2025",
          "Length (ft)*": "48",
          "Weight (lbs)*": getRandomWeight(),
          "Full/Partial*": "Full",
          "Equipment*": equipment,
          "Use Private Network*": "No",
          "Private Network Rate": "",
          "Allow Private Network Booking": "No",
          "Allow Private Network Bidding": "No",
          "Use DAT Loadboard*": "Yes",
          "DAT Loadboard Rate": "",
          "Allow DAT Loadboard Booking": "Yes",
          "Use Extended Network": "No",
          "Contact Method*": method,
          "Origin City*": post.origin.city,
          "Origin State*": post.origin.state,
          "Origin Postal Code": post.origin.zip,
          "Destination City*": post.dest.city,
          "Destination State*": post.dest.state,
          "Destination Postal Code": post.dest.zip,
          "Comment": comment || "",
          "Commodity": "",
          "Reference ID": `RR${i + 1}-${index + 1}`
        });
      });
    });
  });

  const csv = Papa.unparse({ fields: headers, data: csvRows.map(r => headers.map(h => r[h] || "")) });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "DAT_Postings.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
