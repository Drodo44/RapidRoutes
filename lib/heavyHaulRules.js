// lib/heavyHaulRules.js

const stateRules = {
  default: {
    maxWeight: 80000, // lbs
    maxWidth: 102,    // inches
    maxHeight: 162,   // 13'6"
    maxLength: 636,   // 53 ft
  },
  // Sample overrides
  "CA": { maxHeight: 168 }, // California: 14'0"
  "NY": { maxLength: 480 }, // New York: 40 ft trailer
};

export function checkHeavyHaul({ weight, width, height, length, originState, destState }) {
  const oRules = stateRules[originState] || stateRules.default;
  const dRules = stateRules[destState] || stateRules.default;

  const issues = [];

  if (parseInt(weight) > oRules.maxWeight || parseInt(weight) > dRules.maxWeight) {
    issues.push("Weight exceeds legal limits");
  }
  if (parseInt(width) > oRules.maxWidth || parseInt(width) > dRules.maxWidth) {
    issues.push("Width exceeds legal limits");
  }
  if (parseInt(height) > oRules.maxHeight || parseInt(height) > dRules.maxHeight) {
    issues.push("Height exceeds legal limits");
  }
  if (parseInt(length) > oRules.maxLength || parseInt(length) > dRules.maxLength) {
    issues.push("Length exceeds legal trailer laws");
  }

  return {
    permitRequired: issues.length > 0,
    issues
  };
}
