// pages/api/export/dat.js

import { generateChunkedCsv } from "../../../lib/csvChunker";

export default async function handler(req, res) {
  const lanes = req.body.lanes || [];

  const headers = [
    "Pickup Earliest*", "Pickup Latest", "Length (ft)*", "Weight (lbs)*", "Full/Partial*", "Equipment*", "Use Private Network*",
    "Private Network Rate", "Allow Private Network Booking", "Allow Private Network Bidding",
    "Use DAT Loadboard*", "DAT Loadboard Rate", "Allow DAT Loadboard Booking", "Use Extended Network",
    "Contact Method*", "Origin City*", "Origin State*", "Origin Postal Code",
    "Destination City*", "Destination State*", "Destination Postal Code", "Comment", "Commodity", "Reference ID"
  ];

  const csvChunks = generateChunkedCsv(lanes, headers);
  const mergedCsv = csvChunks.join("\n\n---NEXT FILE---\n\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=DAT_Postings.csv");
  res.status(200).send(mergedCsv);
}
