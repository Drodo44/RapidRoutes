// lib/datCsvBuilder.js
import { generateCrawlCities } from "./datcrawl.js";

export const DAT_HEADERS = [
  "Pickup Earliest*",
  "Pickup Latest*",
  "Length (ft)*",
  "Weight (lbs)*",
  "Full/Partial*",
  "Equipment*",
  "Use Private Network*",
  "Private Network Rate",
  "Allow Private Network Booking",
  "Allow Private Network Bidding",
  "Use DAT Load Board*",
  "DAT Load Board Rate",
  "Allow DAT Load Board Booking",
  "Use Extended Network",
  "Contact Method*",
  "Origin City*",
  "Origin State*",
  "Origin Postal Code",
  "Destination City*",
  "Destination State*",
  "Destination Postal Code",
  "Comment",
  "Commodity",
  "Reference ID (unique per organization; max 8 chars)",
];

const CONTACT_METHODS = ["email", "primary phone"];

function csvEscape(s) {
  if (s == null) return "";
  const str = String(s);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}
export function toCsv(headers, rows) {
  const lines = [];
  lines.push(headers.join(","));
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  return lines.join("\n");
}
export function chunkRows(rows, size = 499) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function parseCityState(text) {
  if (!text) return { city: "", state: "" };
  const [c, s] = String(text).split(",").map((x) => x.trim());
  return { city: c || "", state: (s || "").toUpperCase() };
}
function equipmentCode(txt) {
  if (!txt) throw new Error("Equipment required");
  const m = String(txt).trim().match(/([A-Z0-9]{1,3})\s*$/i);
  return (m ? m[1] : txt).toUpperCase();
}

function weightPicker(lane) {
  if (lane.randomize_weight) {
    const mi = Number(lane.weight_min), ma = Number(lane.weight_max);
    if (!Number.isFinite(mi) || !Number.isFinite(ma) || mi <= 0 || ma < mi)
      throw new Error("Invalid weight randomization range.");
    return () => Math.round(mi + Math.random() * (ma - mi));
  }
  const n = Number(lane.weight);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Weight is required");
  return () => n;
}

function baseRow(lane, o, d, contact, weight) {
  return {
    "Pickup Earliest*": lane.earliest || lane.date || lane.pickup_earliest || "",
    "Pickup Latest*": lane.latest || lane.date || lane.pickup_latest || "",
    "Length (ft)*": lane.length || lane.length_ft || "",
    "Weight (lbs)*": weight,
    "Full/Partial*": (lane.full_partial || "full").toLowerCase(),
    "Equipment*": equipmentCode(lane.equipment || lane.equipment_code),
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
    "Comment": lane.notes || lane.comment || "",
    "Commodity": lane.commodity || "",
    "Reference ID (unique per organization; max 8 chars)": "",
  };
}

export async function planPairsForLane(lane, { preferFillTo10 = false } = {}) {
  const { city: oCity, state: oState } = parseCityState(lane.origin);
  const { city: dCity, state: dState } = parseCityState(lane.destination);
  const eq = equipmentCode(lane.equipment || lane.equipment_code);

  const { baseOrigin, baseDest, pairs } = await generateCrawlCities(
    `${oCity}, ${oState}`,
    `${dCity}, ${dState}`,
    { equipment: eq, preferFillTo10 }
  );
  if (!baseOrigin || !baseDest) throw new Error("Could not resolve base cities");
  return { baseOrigin, baseDest, pairs };
}

export function rowsFromBaseAndPairs(lane, baseOrigin, baseDest, selectedPairs) {
  const weightFn = weightPicker(lane);
  const postings = [{ o: baseOrigin, d: baseDest }, ...selectedPairs.map((p) => ({ o: p.pickup, d: p.delivery }))];

  const rows = [];
  for (const post of postings) {
    for (const method of CONTACT_METHODS) {
      rows.push(baseRow(lane, post.o, post.d, method, weightFn()));
    }
  }
  return rows;
}

export async function buildRowsForLane(lane, { preferFillTo10 = false } = {}) {
  const plan = await planPairsForLane(lane, { preferFillTo10 });
  const selected = plan.pairs.slice(0, 10);
  return {
    rows: rowsFromBaseAndPairs(lane, plan.baseOrigin, plan.baseDest, selected),
    totalPostings: 1 + selected.length,
  };
}
