// lib/hazmatChecker.js

const hazmatKeywords = [
  "hazmat", "explosive", "flammable", "toxic", "corrosive", "dangerous", "compressed gas", "acid", "poison", "radioactive", "oxidizer"
];

export function isHazmat(comment = "", commodity = "") {
  const combined = `${comment} ${commodity}`.toLowerCase();
  return hazmatKeywords.some((word) => combined.includes(word));
}
