// components/FloorSpaceCalculator.js
import { useState, useEffect } from "react";

export default function FloorSpaceCalculator() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [stackable, setStackable] = useState(false);
  const [capacities, setCapacities] = useState(null);

  // Standard truck dimensions in inches
  const truckSpecs = {
    small: { name: "26' Box Truck", length: 312, width: 96, height: 96 },
    medium: { name: "48' Dry Van", length: 576, width: 100, height: 110 },
    large: { name: "53' Dry Van", length: 636, width: 102, height: 110 }
  };

  useEffect(() => {
    if (length && width && height) {
      calculateCapacities();
    } else {
      setCapacities(null);
    }
  }, [length, width, height, stackable]);

  const calculateCapacities = () => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    const h = parseFloat(height);

    if (!l || !w || !h) return;

    const calculateForTruck = (truck) => {
      // Logic: Max pallets via straight loading or rotated loading
      // Case 1: Straight (L along Truck L)
      const rowsStraight = Math.floor(truck.length / l);
      const colsStraight = Math.floor(truck.width / w);
      const totalStraight = rowsStraight * colsStraight;

      // Case 2: Rotated (W along Truck L)
      const rowsRotated = Math.floor(truck.length / w);
      const colsRotated = Math.floor(truck.width / l);
      const totalRotated = rowsRotated * colsRotated;

      // Case 3: Pinwheel / Combination (Simplified: Just take max of Straight vs Rotated)
      // Note: Real pinwheeling is complex, but this covers 90% of cases
      let floorCapacity = Math.max(totalStraight, totalRotated);

      // Stackability
      let stackLayers = 1;
      if (stackable) {
        stackLayers = Math.floor(truck.height / h);
        if (stackLayers < 1) stackLayers = 1; // At least 1 layer if it fits vertically at all (assuming input H <= truck H)
      }

      // Check if item is too tall for truck even once
      if (h > truck.height) return 0;

      return floorCapacity * stackLayers;
    };

    setCapacities({
      small: calculateForTruck(truckSpecs.small),
      medium: calculateForTruck(truckSpecs.medium),
      large: calculateForTruck(truckSpecs.large),
      stackLayers: stackable ? Math.max(1, Math.floor(110 / h)) : 1
    });
  };

  return (
    <div className="p-6 rounded-2xl shadow-xl border border-gray-700 bg-gray-900/50 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
          Floor Space Calculator
        </h2>
        <div className="bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-400 border border-gray-700">
          Dimensions in Inches
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Length (in)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
            placeholder="48"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Width (in)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
            placeholder="40"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Height (in)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
            placeholder="48"
          />
        </div>
      </div>

      <div className="mb-8">
        <label className="flex items-center group cursor-pointer bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors">
          <input
            type="checkbox"
            checked={stackable}
            onChange={(e) => setStackable(e.target.checked)}
            className="w-5 h-5 rounded border-gray-500 bg-gray-700 text-cyan-500 focus:ring-offset-0 focus:ring-2 focus:ring-cyan-500 transition-all"
          />
          <div className="ml-3">
            <span className="block text-sm font-medium text-gray-200 group-hover:text-blue-400 transition-colors">Stackable Freight?</span>
            <span className="block text-xs text-gray-500">Enable if pallets can be stacked on top of each other</span>
          </div>
        </label>
      </div>

      {capacities ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700 pb-2">Estimated Capacity</h3>

          <div className="grid grid-cols-1 gap-4">
            {/* 26' Box Truck */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700 flex justify-between items-center group hover:border-blue-500/50 transition-all">
              <div className="flex items-center">
                <div className="bg-gray-700 p-2 rounded-lg mr-4 text-2xl group-hover:scale-110 transition-transform">🚚</div>
                <div>
                  <div className="font-bold text-gray-200">26' Box Truck</div>
                  <div className="text-xs text-gray-500">Max Length: 312"</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cyan-400">{capacities.small} <span className="text-sm font-normal text-gray-400">pallets</span></div>
                {stackable && <div className="text-xs text-green-400">Includes stacking</div>}
              </div>
            </div>

            {/* 48' Dry Van */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700 flex justify-between items-center group hover:border-blue-500/50 transition-all">
              <div className="flex items-center">
                <div className="bg-gray-700 p-2 rounded-lg mr-4 text-2xl group-hover:scale-110 transition-transform">🚛</div>
                <div>
                  <div className="font-bold text-gray-200">48' Dry Van</div>
                  <div className="text-xs text-gray-500">Max Length: 576"</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cyan-400">{capacities.medium} <span className="text-sm font-normal text-gray-400">pallets</span></div>
                {stackable && <div className="text-xs text-green-400">Includes stacking</div>}
              </div>
            </div>

            {/* 53' Dry Van */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl border border-gray-700 flex justify-between items-center group hover:border-blue-500/50 transition-all">
              <div className="flex items-center">
                <div className="bg-gray-700 p-2 rounded-lg mr-4 text-2xl group-hover:scale-110 transition-transform">🚛</div>
                <div>
                  <div className="font-bold text-gray-200">53' Dry Van</div>
                  <div className="text-xs text-gray-500">Max Length: 636"</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cyan-400">{capacities.large} <span className="text-sm font-normal text-gray-400">pallets</span></div>
                {stackable && <div className="text-xs text-green-400">Includes stacking</div>}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg text-xs text-blue-200">
            ℹ️ Calculations assume optimal loading configuration (straight or rotated). Actual capacity may vary based on door dimensions, wheel wells, and weight limits.
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-600 bg-gray-800/20 rounded-xl border border-dashed border-gray-700">
          <div className="text-4xl mb-2 opacity-30">📏</div>
          <p>Enter dimensions to see truck capacity</p>
        </div>
      )}
    </div>
  );
}
