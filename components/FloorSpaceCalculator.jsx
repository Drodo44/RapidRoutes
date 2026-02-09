import { useState, useEffect } from "react";

export default function FloorSpaceCalculator() {
  const [length, setLength] = useState("48");
  const [width, setWidth] = useState("40");
  const [height, setHeight] = useState("48");
  const [count, setCount] = useState("1");
  const [weight, setWeight] = useState("");
  const [stackable, setStackable] = useState(false);
  const [capacities, setCapacities] = useState(null);
  const [suggestion, setSuggestion] = useState("");

  const truckSpecs = [
    { id: 'sprinter', name: "Sprinter Van", maxPallets: 3, maxWeight: 3000, emoji: "🚐" },
    { id: 'straight', name: "26' Straight Truck", maxPallets: 12, maxWeight: 10000, emoji: "🚚" },
    { id: 'dv48', name: "48' Dry Van", maxPallets: 24, maxWeight: 45000, emoji: "🚛" },
    { id: 'dv53', name: "53' Dry Van", maxPallets: 26, maxWeight: 45000, emoji: "🚛" }
  ];

  useEffect(() => {
    calculateCapacities();
  }, [length, width, height, count, weight, stackable]);

  const calculateCapacities = () => {
    const l = parseFloat(length) || 0;
    const w_dim = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    const c = parseInt(count) || 0;
    const w_total = parseFloat(weight) || 0;

    if (c === 0 && w_total === 0) {
      setCapacities(null);
      setSuggestion("");
      return;
    }

    // Calculate how many "Standard Pallet Spaces" (48x40) this takes
    // We'll use floor space area as a simple approximation, but also consider width.
    // Standard pallet is 48L x 40W.
    const standardPalletArea = 48 * 40;
    const itemArea = l * w_dim;
    let palletEquivalentPerItem = itemArea / standardPalletArea;

    // If width > 48, it likely takes a full row (2 standard pallet spaces)
    if (w_dim > 48) {
      palletEquivalentPerItem = Math.max(palletEquivalentPerItem, (l / 48) * 2);
    }

    const totalPalletSpaces = palletEquivalentPerItem * c;
    const effectivePalletSpaces = stackable ? totalPalletSpaces / 2 : totalPalletSpaces;

    const results = truckSpecs.map(truck => {
      const fitsPallets = effectivePalletSpaces <= truck.maxPallets;
      const fitsWeight = w_total <= truck.maxWeight;

      let reason = "";
      if (!fitsPallets) reason = "Over pallet limit";
      if (!fitsWeight) reason = reason ? reason + " & weight limit" : "Over weight limit";

      return {
        ...truck,
        fits: fitsPallets && fitsWeight,
        palletCapacity: truck.maxPallets,
        actualNeeded: effectivePalletSpaces.toFixed(1),
        reason
      };
    });

    setCapacities(results);

    // Suggestion logic
    if (w_total > 45000) {
      setSuggestion("Suggest using TWO TRUCKS. Weight exceeds maximum single truck capacity (45,000 lbs).");
    } else if (effectivePalletSpaces > 26) {
      setSuggestion("Suggest using TWO TRUCKS. Load exceeds maximum single truck floor space (26 pallets).");
    } else {
      const bestFit = results.find(r => r.fits);
      if (!bestFit) {
        setSuggestion("Suggest using TWO TRUCKS. Requirement exceeds maximum truck capacity.");
      } else {
        const index = results.indexOf(bestFit);
        if (index > 0) {
          const previous = results[index - 1];
          // If it didn't fit in the previous one, explain why
          if (effectivePalletSpaces > previous.maxPallets || w_total > previous.maxWeight) {
            const limitReason = w_total > previous.maxWeight ? "weight" : "floor space";
            setSuggestion(`The load exceeds ${previous.name} ${limitReason} limits. Suggested: ${bestFit.name}.`);
          } else {
            setSuggestion("");
          }
        } else {
          setSuggestion("");
        }
      }
    }
  };

  return (
    <div className="p-6 rounded-2xl shadow-xl border border-gray-700 bg-gray-900/50 backdrop-blur-md h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
          Floor Space Calculator
        </h2>
        <div className="bg-gray-800 px-2 py-0.5 rounded text-[10px] text-gray-400 border border-gray-700">
          ENTERPRISE
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Length (in)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-1 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Width (in)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-1 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Height (in)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-1 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Pallet Count</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-1 focus:ring-blue-500 font-mono text-sm"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Total Weight (lbs)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-1 focus:ring-blue-500 font-mono text-sm"
            placeholder="0"
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

      {suggestion && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-xs text-blue-300 animate-in fade-in slide-in-from-top-1">
          {suggestion}
        </div>
      )}

      {capacities ? (
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {capacities.map(truck => (
            <div
              key={truck.id}
              className={`p-3 rounded-lg border flex justify-between items-center transition-all ${
                truck.fits
                  ? 'bg-emerald-900/10 border-emerald-500/30 group hover:border-emerald-500/50'
                  : 'bg-red-900/10 border-red-500/20 opacity-60'
              }`}
            >
              <div className="flex items-center">
                <div className="text-xl mr-3 opacity-80">{truck.emoji}</div>
                <div>
                  <div className={`font-bold text-sm ${truck.fits ? 'text-emerald-400' : 'text-gray-400'}`}>{truck.name}</div>
                  {!truck.fits && <div className="text-[10px] text-red-400 font-medium">{truck.reason}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${truck.fits ? 'text-emerald-400' : 'text-gray-500'}`}>
                   {truck.palletCapacity} <span className="text-xs font-normal opacity-60">plts max</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  {truck.maxWeight.toLocaleString()} lbs limit
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600 bg-gray-800/10 rounded-xl border border-dashed border-gray-800">
          <p className="text-xs">Enter details to see fit</p>
        </div>
      )}
    </div>
  );
}
