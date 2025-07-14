// lib/ltlAdvisor.js

export function isLtlCandidate({ weight, equipment, pieces, miles }) {
  const maxLtlWeight = 15000;
  const maxLtlSkids = 6;
  const maxDistance = 1000;

  if (!weight || !equipment) return false;

  const isWeightOk = parseInt(weight) <= maxLtlWeight;
  const isSkidsOk = pieces ? parseInt(pieces) <= maxLtlSkids : true;
  const isDistanceOk = miles ? parseInt(miles) <= maxDistance : true;

  const equipmentText = equipment.toLowerCase();
  const isLikelyLtl = equipmentText.includes("box") || equipmentText.includes("van") || equipmentText.includes("ltl") || equipmentText.includes("partial");

  return isWeightOk && isSkidsOk && isDistanceOk && isLikelyLtl;
}
