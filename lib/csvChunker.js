// lib/csvChunker.js

import Papa from "papaparse";

// Split an array into chunks of N
const chunkArray = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

export function generateChunkedCsv(allLanes, templateHeaders) {
  const fullRows = [];

  for (const lane of allLanes) {
    const postings = generateLanePostings(lane); // 22 rows
    fullRows.push(...postings);
  }

  const chunks = chunkArray(fullRows, 500); // DAT chunk size limit
  return chunks.map((rows) => Papa.unparse({ fields: templateHeaders, data: rows }));
}

// Dummy function; assume generateLanePostings returns 22 formatted rows per lane
function generateLanePostings(lane) {
  return Array.from({ length: 22 }, (_, i) => [
    lane.pickupEarliest,
    lane.pickupLatest,
    lane.length,
    lane.weight,
    lane.loadType,
    lane.equipment,
    "Yes",
    "",
    "Yes",
    "Yes",
    "Yes",
    "",
    "Yes",
    "No",
    i % 2 === 0 ? "Email" : "Primary Phone",
    lane.originCity,
    lane.originState,
    lane.originZip,
    lane.destCity,
    lane.destState,
    lane.destZip,
    "",
    lane.commodity,
    lane.referenceId,
  ]);
}
