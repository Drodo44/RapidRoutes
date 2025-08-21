// components/FloorSpaceCalculator.js
import { useState, useEffect } from "react";

export default function FloorSpaceCalculator() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [result, setResult] = useState("");
  const [squareFeet, setSquareFeet] = useState(null);
  const [totalPallets, setTotalPallets] = useState(null);
  const [detailedResult, setDetailedResult] = useState(null);

  // Calculate automatically when values change
  useEffect(() => {
    if (length && width && height) {
      calculateFit();
    }
  }, [length, width, height]);

  const calculateFit = () => {
    const inchesPerFoot = 12;
    const palletLength = parseInt(length);
    const palletWidth = parseInt(width);
    const palletHeight = parseInt(height);

    if (!palletLength || !palletWidth || !palletHeight) {
      setResult("Please fill all fields.");
      setDetailedResult(null);
      setSquareFeet(null);
      setTotalPallets(null);
      return;
    }

    // Calculate floor space in square feet
    const floorSpaceSqFt = (palletLength * palletWidth) / (inchesPerFoot * inchesPerFoot);
    setSquareFeet(floorSpaceSqFt.toFixed(2));

    // Calculate how many standard pallets this is equivalent to
    // Standard pallet is 40" x 48" = 1920 sq inches
    const standardPalletSqIn = 40 * 48;
    const itemSqIn = palletLength * palletWidth;
    const palletEquivalent = itemSqIn / standardPalletSqIn;
    setTotalPallets(palletEquivalent.toFixed(2));

    const totalLengthFt = palletLength / inchesPerFoot;
    const totalWidthFt = palletWidth / inchesPerFoot;
    const totalHeightFt = palletHeight / inchesPerFoot;

    setDetailedResult({
      dimensions: {
        feet: `${totalLengthFt.toFixed(1)}' × ${totalWidthFt.toFixed(1)}' × ${totalHeightFt.toFixed(1)}'`,
        inches: `${palletLength}" × ${palletWidth}" × ${palletHeight}"`
      },
      volume: {
        cubicFeet: ((palletLength * palletWidth * palletHeight) / Math.pow(inchesPerFoot, 3)).toFixed(2),
        cubicInches: (palletLength * palletWidth * palletHeight).toFixed(0)
      }
    });

    // Determine what truck it fits in
    if (totalLengthFt <= 26) {
      setResult("✅ Fits in 26ft Box Truck or Larger");
    } else if (totalLengthFt <= 53) {
      setResult("✅ Fits in 53ft Dry Van Only");
    } else {
      setResult("❌ Load Exceeds Dry Van Size — Oversize or Permit Required");
    }
  };

  return (
    <div className="bg-[#1a2236] p-6 rounded-2xl shadow-xl max-w-lg mx-auto mb-10 text-white">
      <h2 className="text-2xl font-bold text-cyan-400 mb-4">Floor Space Calculator</h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs mb-1 text-gray-300">Length (inches)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
          />
        </div>
        <div>
          <label className="block text-xs mb-1 text-gray-300">Width (inches)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
          />
        </div>
        <div>
          <label className="block text-xs mb-1 text-gray-300">Height (inches)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
          />
        </div>
      </div>
      
      <button
        onClick={calculateFit}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-semibold w-full"
      >
        Calculate
      </button>
      
      {result && (
        <div className="mt-6 border-t border-gray-700 pt-4">
          <p className="mb-4 font-semibold text-center text-lg">{result}</p>
          
          {detailedResult && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <h3 className="font-semibold text-gray-300 mb-1">Dimensions</h3>
                <p>Feet: {detailedResult.dimensions.feet}</p>
                <p>Inches: {detailedResult.dimensions.inches}</p>
              </div>
              
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <h3 className="font-semibold text-gray-300 mb-1">Floor Space</h3>
                <p>{squareFeet} sq ft</p>
                <p>{totalPallets} standard pallets</p>
              </div>
              
              <div className="bg-gray-800/50 p-3 rounded-lg col-span-2">
                <h3 className="font-semibold text-gray-300 mb-1">Volume</h3>
                <p>{detailedResult.volume.cubicFeet} cubic feet</p>
                <p>{detailedResult.volume.cubicInches} cubic inches</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
