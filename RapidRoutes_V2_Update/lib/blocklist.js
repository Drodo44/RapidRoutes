// lib/blocklist.js

const sampleBlockedZips = ["30301", "48201", "60601"]; // Example: Atlanta, Detroit, Chicago

export function isBlocked(zip = "") {
  return sampleBlockedZips.includes(zip);
}
