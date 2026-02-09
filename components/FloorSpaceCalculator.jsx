import { useState, useEffect } from "react";
import TrailerVisual from "./TrailerVisual";

export default function FloorSpaceCalculator() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [stackable, setStackable] = useState(false);
  const [count, setCount] = useState(1);
  const [capacities, setCapacities] = useState(null);
  const [visualLength, setVisualLength] = useState(0);

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
      setVisualLength(0);
    }
  }, [length, width, height, stackable, count]);

  const calculateCapacities = () => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    const h = parseFloat(height);
    const c = parseInt(count) || 1;

    if (!l || !w || !h) return;

    // Linear Foot Calculation for Visual
    // Assume standard loading (width-wise unless too wide)
    // If width > 48, must load lengthwise. Standard pallet 48x40 usually loads 40" side along length (2 wide).

    // simplified visual logic:
    // 1. Calculate base area needed: (l * w * c)
    // 2. Divide by truck width (approx 100") to get linear inches if packed perfectly?
    // 3. OR use standard "pallet spots" logic.
    // Let's stick to the linear loading logic which is common in freight.
    // If width <= 50, we can fit 2 wide.
    let widthFactor = 1;
    if (w <= 52) { // 52 allows for some wiggle room, standard is 48-50
      widthFactor = 0.5; // Fits 2 wide
    }

    let totalLinearInches = l * c * widthFactor;

    if (stackable) {
      // If stackable, we divide by layers.
      const stackLayers = Math.max(1, Math.floor(110 / h));
      totalLinearInches = totalLinearInches / stackLayers;
    }

    setVisualLength(totalLinearInches / 12); // Convert to feet for visual trailer

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
      let floorCapacity = Math.max(totalStraight, totalRotated);

      // Stackability
      let stackLayers = 1;
      if (stackable) {
        stackLayers = Math.floor(truck.height / h);
        if (stackLayers < 1) stackLayers = 1;
      }

      // Check if item is too tall for truck even once
      if (h > truck.height) return 0;

      return floorCapacity * stackLayers;
    };

    setCapacities({
      small: calculateForTruck(truckSpecs.small),
      medium: calculateForTruck(truckSpecs.medium),
      large: calculateForTruck(truckSpecs.large)
    });
  };

  return (
    <div className="p-6 rounded-2xl shadow-xl border border-gray-700 bg-gray-900/50 backdrop-blur-md h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
          Floor Space Calculator
        </h2>
        <div className="bg-gray-800 px-2 py-0.5 rounded text-[10px] text-gray-400 border border-gray-700">
          DYNAMIC
        </div>
      </div>

      {/* Visual Component */}
      <div className="mb-6 bg-gray-800/30 rounded-xl p-2 border border-blue-900/30">
        <TrailerVisual length={visualLength} overflow={visualLength > 53} />
        <div className="text-center text-xs text-gray-400 mt-[-10px]">
          {visualLength > 0 ? `${visualLength.toFixed(1)} linear feet used (est)` : 'Enter dimensions to see truck fill'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Length (in)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-1 focus:ring-blue-500 font-mono text-sm"
            placeholder="48"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Width (in)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-1 focus:ring-blue-500 font-mono text-sm"
            placeholder="40"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Height (in)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-1 focus:ring-blue-500 font-mono text-sm"
            placeholder="48"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Count</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-1 focus:ring-blue-500 font-mono text-sm"
            placeholder="1"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="flex items-center group cursor-pointer hover:bg-gray-800/50 p-2 rounded transition-colors -ml-2">
          <input
            type="checkbox"
            checked={stackable}
            onChange={(e) => setStackable(e.target.checked)}
            className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-cyan-500 focus:ring-offset-0 focus:ring-1 focus:ring-cyan-500"
          />
          <div className="ml-2">
            <span className="text-sm font-medium text-gray-300 group-hover:text-blue-400 transition-colors">Stackable?</span>
          </div>
        </label>
      </div>

      {capacities ? (
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* 26' Box Truck */}
          <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700 flex justify-between items-center group hover:border-blue-500/30 transition-all">
            <div className="flex items-center">
              <div className="text-xl mr-3 opacity-70">🚚</div>
              <div>
                <div className="font-bold text-gray-300 text-sm">26' Box Truck</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-cyan-400">{capacities.small} <span className="text-xs font-normal text-gray-500">plts</span></div>
            </div>
          </div>

          {/* 48' Dry Van */}
          <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700 flex justify-between items-center group hover:border-blue-500/30 transition-all">
            <div className="flex items-center">
              <div className="text-xl mr-3 opacity-70">🚛</div>
              <div>
                <div className="font-bold text-gray-300 text-sm">48' Dry Van</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-cyan-400">{capacities.medium} <span className="text-xs font-normal text-gray-500">plts</span></div>
            </div>
          </div>

          {/* 53' Dry Van */}
          <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700 flex justify-between items-center group hover:border-blue-500/30 transition-all">
            <div className="flex items-center">
              <div className="text-xl mr-3 opacity-70">🚛</div>
              <div>
                <div className="font-bold text-gray-300 text-sm">53' Dry Van</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-cyan-400">{capacities.large} <span className="text-xs font-normal text-gray-500">plts</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600 bg-gray-800/10 rounded-xl border border-dashed border-gray-800">
          <p className="text-xs">Capacity Est.</p>
        </div>
      )}
    </div>
  );
}
