// utils/datExport.js
// DAT CSV strict headers, variable rows per lane (minimum 12 rows for 6 pairs, no maximum); manual CSV writer; 499-row chunking.
import { generateSmartCrawlCities } from "./smartCitySelector.js";

// Import canonical headers to ensure consistency
import { DAT_HEADERS } from '../lib/datHeaders.js';
export { DAT_HEADERS };

const CONTACT_METHODS = ["email", "primary phone"];
const MAX_ROWS_PER_FILE = 499;

function csvEscape(s) {
  if (s == null) return "";
  const str = String(s);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(headers, rows) {
  const lines = [];
  lines.push(headers.join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

export function chunkRows(rows, size = MAX_ROWS_PER_FILE) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function parseCityState(text) {
  if (!text) return { city: "", state: "" };
  const [c, s] = String(text).split(",").map((x) => x.trim());
  return { city: c || "", state: (s || "").toUpperCase() };
}

function getEquipmentCode(equipText) {
  if (!equipText) throw new Error("Equipment is required");
  const raw = String(equipText).trim();
  if (/^[A-Z0-9]{1,3}$/.test(raw)) return raw.toUpperCase();
  const m = raw.match(/([A-Z0-9]{1,3})\s*$/);
  return m ? m[1].toUpperCase() : raw.toUpperCase();
}

function baseRow(lane, o, d, contact, weight) {
  return {
    "Pickup Earliest*": lane.earliest || lane.date || "",
    "Pickup Latest*": lane.latest || lane.date || "",
    "Length (ft)*": lane.length || lane.length_ft || "",
    "Weight (lbs)*": weight,
    "Full/Partial*": (lane.full_partial || "full").toLowerCase(),
    "Equipment*": getEquipmentCode(lane.equipment || lane.equipment_code),
    "Use Private Network*": "yes",
    "Private Network Rate": "",
    "Allow Private Network Booking": "no",
    "Allow Private Network Bidding": "no",
    "Use DAT Load Board*": "yes",
    "DAT Load Board Rate": "",
    "Allow DAT Load Board Booking": "yes",
    "Use Extended Network": "yes",
    "Contact Method*": contact,
    "Origin City*": o.city,
    "Origin State*": o.state,
    "Origin Postal Code": o.zip || "",
    "Destination City*": d.city,
    "Destination State*": d.state,
    "Destination Postal Code": d.zip || "",
    "Comment": lane.comment || "",
    "Commodity": lane.commodity || "",
    "Reference ID (unique per organization; max 8 chars)": "",
  };
}

function ensureWeight(lane) {
  // Pack 2 will wire per-posting randomize; for now use lane.weight as entered.
  if (!lane.weight) throw new Error("Weight is required");
  const n = Number(lane.weight);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid weight");
  return n;
}

export async function rowsForLane(lane, { preferFillTo10 = false } = {}) {
  const o = parseCityState(lane.origin);
  const d = parseCityState(lane.destination);

  const equipCode = getEquipmentCode(lane.equipment || lane.equipment_code);
  const equipment =
    equipCode === "R" ? "reefer" : (equipCode === "F" || equipCode === "FD") ? "flatbed" : "van";

  const { pairs, baseOrigin, baseDest, allowedDuplicates, shortfallReason } =
    await generateSmartCrawlCities({
      laneOriginText: `${o.city}, ${o.state}`,
      laneDestinationText: `${d.city}, ${d.state}`,
      equipment,
      maxPairs: 10,
      preferFillTo10,
    });

  if (!baseOrigin || !baseDest) throw new Error("Could not resolve base cities");

  const postings = [];
  postings.push({ o: baseOrigin, d: baseDest });
  for (const p of pairs) postings.push({ o: p.pickup, d: p.delivery });

  const rows = [];
  for (const post of postings) {
    for (const method of CONTACT_METHODS) {
      rows.push(baseRow(lane, post.o, post.d, method, ensureWeight(lane)));
    }
  }

  return {
    rows,
    totalPostings: postings.length,
    allowedDuplicates,
    shortfallReason,
  };
}
