// lib/datCsvBuilder.js
import { DAT_HEADERS } from "./datHeaders.js";
import { generateCrawlCities } from "./datcrawl.js";

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

function extractEquipCode(txt) {
  if (!txt) throw new Error("Equipment required");
  const raw = String(txt).trim();
  const m = raw.match(/([A-Z0-9]{1,3})\s*$/i);
  return (m ? m[1] : raw).toUpperCase(); // works with "Van V / Dry Van V" → V
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

function makeRow(lane, o, d, contact, weight) {
  return {
    "Pickup Earliest*": lane.earliest || lane.date || "",
    "Pickup Latest*": lane.latest || lane.date || "",
    "Length (ft)*": lane.length || lane.length_ft || "",
    "Weight (lbs)*": weight,
    "Full/Partial*": (lane.full_partial || "full").toLowerCase(),
    "Equipment*": extractEquipCode(lane.equipment || lane.equipment_code),
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

/**
 * Returns { rows, totalPostings } for one lane.
 * Base (exact) + up to 10 smart pairs; duplicated across contact methods.
 */
export async function buildRowsForLane(lane, { preferFillTo10 = false } = {}) {
  const { city: oCity, state: oState } = parseCityState(lane.origin);
  const { city: dCity, state: dState } = parseCityState(lane.destination);

  const eq = extractEquipCode(lane.equipment || lane.equipment_code);

  const { baseOrigin, baseDest, pairs } = await generateCrawlCities(
    `${oCity}, ${oState}`,
    `${dCity}, ${dState}`,
    { equipment: eq, preferFillTo10 }
  );

  if (!baseOrigin || !baseDest) throw new Error("Could not resolve base cities");

  const postings = [{ o: baseOrigin, d: baseDest }, ...pairs.map((p) => ({ o: p.pickup, d: p.delivery }))];
  const weightFn = weightPicker(lane);

  const rows = [];
  for (const post of postings) {
    for (const method of CONTACT_METHODS) {
      rows.push(makeRow(lane, post.o, post.d, method, weightFn()));
    }
  }
  return { rows, totalPostings: postings.length };
}
