// lib/floorSpaceCalculator.js

export function calculatePalletSpace(pallets, length, width, height, stackable = false) {
  if (!pallets || !length || !width || !height) return null;

  const palletFootprint = (length * width) / 144; // in sqft
  const totalHeight = height;
  const stackFactor = stackable ? 0.5 : 1;  // 0.5 means half the linear space needed when stackable

  return {
    linearFeet: Math.ceil((pallets * length * stackFactor) / 12),
    cubicFeet: Math.ceil(pallets * length * width * height / 1728),
    squareFeet: Math.ceil(pallets * palletFootprint), // Square feet unchanged by stacking
    stackable
  };
}

export function checkEquipmentFit({ pallets, length, width, height, stackable }) {
  const { linearFeet } = calculatePalletSpace(pallets, length, width, height, stackable);

  return {
    boxTruck: linearFeet <= 20,
    hotshot: linearFeet <= 36,
    dryVan: linearFeet <= 52,
    flatbed: linearFeet <= 48,
  };
}
