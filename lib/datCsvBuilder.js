// lib/datCsvBuilder.js
import { generateCrawlPairs } from "./datcrawl.js";

export const DAT_HEADERS = [
  "Pickup Earliest*",
  "Pickup Latest",
  "Length (ft)*",
  "Weight (lbs)*",
  "Full/Partial*",
  "Equipment*",
  "Use Private Network*",
  "Private Network Rate",
  "Allow Private Network Booking",
  "Allow Private Network Bidding",
  "Use DAT Loadboard*",
  "DAT Loadboard Rate",
  "Allow DAT Loadboard Booking",
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
  "Reference ID",
];

const CONTACT_METHODS = ["email", "primary phone"];
const USE_PRIVATE = "yes";
const PRIVATE_BOOK = "no";
const PRIVATE_BID = "no";
const USE_DAT = "yes";
const USE_EXT = "yes";

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function ensureDateLike(s) {
  return s || "";
}

function resolveWeight(lane) {
  if (lane.randomize_weight) {
    const min = Number(lane.weight_min);
    const max = Number(lane.weight_max);
    if (Number.isFinite(min) && Number.isFinite(max) && max >= min && min > 0) {
      return String(randInt(min, max));
    }
    throw new Error("Randomize is ON but weight_min/weight_max are invalid.");
  }
  const W = Number(lane.weight_lbs ?? lane.weight);
  if (!Number.isFinite(W) || W <= 0) throw new Error("Weight is required.");
  return String(W);
}

function cityObj(c) {
  return { city: c.city, state: c.state, zip: c.zip || null };
}

function rowForPosting(lane, origin, dest, contactMethod) {
  return {
    "Pickup Earliest*": ensureDateLike(lane.pickup_earliest || lane.date || ""),
    "Pickup Latest": ensureDateLike(lane.pickup_latest || lane.date || ""),
    "Length (ft)*": String(lane.length_ft ?? lane.length ?? 53),
    "Weight (lbs)*": resolveWeight(lane),
    "Full/Partial*": String(lane.full_partial || "full"),
    "Equipment*": String(lane.equipment_code ?? lane.equipment ?? "V").toUpperCase(),
    "Use Private Network*": USE_PRIVATE,
    "Private Network Rate": "",
    "Allow Private Network Booking": PRIVATE_BOOK,
    "Allow Private Network Bidding": PRIVATE_BID,
    "Use DAT Loadboard*": USE_DAT,
    "DAT Loadboard Rate": "",
    "Allow DAT Loadboard Booking": "no",
    "Use Extended Network": USE_EXT,
    "Contact Method*": contactMethod,
    "Origin City*": origin.city,
    "Origin State*": origin.state,
    "Origin Postal Code": origin.zip || "",
    "Destination City*": dest.city,
    "Destination State*": dest.state,
    "Destination Postal Code": dest.zip || "",
    "Comment": lane.comment || "",
    "Commodity": lane.commodity || "",
    "Reference ID": "",
  };
}

export function rowsFromBaseAndPairs(lane, baseOrigin, baseDest, pairs) {
  const postings = [];
  postings.push({ origin: cityObj(baseOrigin), dest: cityObj(baseDest) });
  for (const p of pairs.slice(0, 10)) {
    postings.push({ origin: cityObj(p.pickup), dest: cityObj(p.delivery) });
  }
  const out = [];
  for (const post of postings) {
    for (const cm of CONTACT_METHODS) out.push(rowForPosting(lane, post.origin, post.dest, cm));
  }
  return out;
}

export async function planPairsForLane(lane, { preferFillTo10 = false } = {}) {
  const originStr =
    lane.origin ?? (lane.origin_city && lane.origin_state ? `${lane.origin_city}, ${lane.origin_state}` : "");
  const destStr =
    lane.destination ?? (lane.dest_city && lane.dest_state ? `${lane.dest_city}, ${lane.dest_state}` : "");
  const equip = lane.equipment ?? lane.equipment_code ?? "V";
  const { baseOrigin, baseDest, pairs, shortfallReason, allowedDuplicates } = await generateCrawlPairs({
    origin: originStr,
    destination: destStr,
    equipment: equip,
    preferFillTo10,
  });
  return { baseOrigin, baseDest, pairs, shortfallReason, allowedDuplicates };
}

export function toCsv(headers, rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h] ?? "")).join(","));
  return lines.join("\n");
}

export function chunkRows(rows, max = 499) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += max) chunks.push(rows.slice(i, i + max));
  return chunks;
}
