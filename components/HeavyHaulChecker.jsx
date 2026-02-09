// components/HeavyHaulCalculator.js (formerly HeavyHaulChecker)
import { useState, useEffect } from "react";

export default function HeavyHaulCalculator() {
  // State for inputs
  const [lengthFt, setLengthFt] = useState("");
  const [lengthIn, setLengthIn] = useState("");
  const [widthFt, setWidthFt] = useState("");
  const [widthIn, setWidthIn] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weight, setWeight] = useState("");
  const [overhangFront, setOverhangFront] = useState("");
  const [overhangRear, setOverhangRear] = useState("");
  const [divisible, setDivisible] = useState(false);
  const [westCoast, setWestCoast] = useState(false);

  const [status, setStatus] = useState(null); // 'legal', 'warning', 'illegal'
  const [message, setMessage] = useState("");
  const [equipment, setEquipment] = useState("");

  useEffect(() => {
    calculateStatus();
  }, [lengthFt, lengthIn, widthFt, widthIn, heightFt, heightIn, weight, overhangFront, overhangRear, divisible, westCoast]);

  const calculateStatus = () => {
    // 1. Convert everything to common units (Inches for dims, lbs for weight)
    const l = (parseInt(lengthFt) || 0) * 12 + (parseInt(lengthIn) || 0);
    const w = (parseInt(widthFt) || 0) * 12 + (parseInt(widthIn) || 0);
    const h = (parseInt(heightFt) || 0) * 12 + (parseInt(heightIn) || 0);
    const wt = parseInt(weight) || 0;
    const ohF = parseInt(overhangFront) || 0; // Feet
    const ohR = parseInt(overhangRear) || 0; // Feet

    if (l === 0 && w === 0 && h === 0 && wt === 0) {
      setStatus(null);
      setMessage("");
      setEquipment("");
      return;
    }

    // 2. Define Limits
    const MAX_WIDTH = 102; // 8'6"
    const MAX_HEIGHT = westCoast ? 168 : 162; // 14' vs 13'6"
    const MAX_LENGTH = 636; // 53'
    const MAX_WEIGHT_PAYLOAD = 48000; // Typical max payload for standard legal load (approx)
    // Note: Gross is 80k. We assume user inputs payload weight.

    // Overhang Limits (Standard allow without permit usually limited, but let's check flagrant violations)
    // Most states allow 3' front, 4' rear without permit or with simple marking.
    const MAX_OH_F = 3;
    const MAX_OH_R = 4;

    // 3. Check for Over-Limit Conditions
    let isOverDim = false;
    let isOverWeight = false;
    let reasons = [];

    if (w > MAX_WIDTH) { isOverDim = true; reasons.push(`Width (${(w / 12).toFixed(1)}') > 8'6"`); }
    if (h > MAX_HEIGHT) { isOverDim = true; reasons.push(`Height (${(h / 12).toFixed(1)}') > ${westCoast ? "14'" : "13'6\""}`); }
    if (l > MAX_LENGTH) { isOverDim = true; reasons.push(`Length (${(l / 12).toFixed(1)}') > 53'`); }
    if (wt > MAX_WEIGHT_PAYLOAD) { isOverWeight = true; reasons.push(`Weight (${wt} lbs) > 48,000 lbs`); }
    if (ohF > MAX_OH_F) { isOverDim = true; reasons.push(`Front Overhang (${ohF}') > 3'`); }
    if (ohR > MAX_OH_R) { isOverDim = true; reasons.push(`Rear Overhang (${ohR}') > 4'`); }

    // 4. Equipment Logic
    // Platform height assumptions:
    // Flatbed: ~60" (5') high. Load H + 60" <= 13'6" (162") => Load H <= 102" (8'6")
    // Stepdeck: ~40" (3'4") high. Load H + 40" <= 13'6" => Load H <= 122" (10'2")
    // Lowboy/RGN: ~18-24" (1.5-2') high. Load H + 24" <= 13'6" => Load H <= 138" (11'6")

    // Suggest equipment based on Height primarily
    let suggEquip = "Standard Flatbed";
    if (h > 102) suggEquip = "Stepdeck / Dropdeck";
    if (h > 122) suggEquip = "RGN / Lowboy";
    if (h > 138 && !westCoast) suggEquip = "Specialized RGN (Oversize Height)";

    // 5. Determine Status
    if (!isOverDim && !isOverWeight) {
      setStatus("legal");
      setMessage("✅ LEGAL LOAD");
      setEquipment(suggEquip);
    } else {
      // It IS Over something.
      if (divisible) {
        // Red Flag: Divisible loads cannot be Overweight or Overdimension usually (must be broken down).
        setStatus("illegal");
        setMessage("⛔ ILLEGAL LOAD (Must Break Down)");
        setEquipment(suggEquip + " (But Load is Illegal)");
      } else {
        // Not divisible, so it's a Permit Load.
        setStatus("warning");
        setMessage("⚠️ OVERSIZE/PERMIT REQUIRED");
        setEquipment(suggEquip);
      }
    }

    // Add reasons to message if not legal
    if (reasons.length > 0) {
      setMessage(prev => prev + " (" + reasons.join(", ") + ")");
    }
  };

  return (
    <div className="p-6 rounded-2xl shadow-xl border border-gray-700 bg-gray-900/50 backdrop-blur-md max-w-4xl mx-auto mb-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-400">
          Heavy Haul & Oversize Calculator
        </h2>
        <div className="flex gap-2">
          <div className="bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-400 border border-gray-700">
            L/W/H in Feet + Inches
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Dimensions */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-1">Dimensions</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Length (ft)</label>
              <input type="number" value={lengthFt} onChange={e => setLengthFt(e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="53" />
            </div>
            <div>
              <label className="text-xs text-gray-500">(in)</label>
              <input type="number" value={lengthIn} onChange={e => setLengthIn(e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Width (ft)</label>
              <input type="number" value={widthFt} onChange={e => setWidthFt(e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="8" />
            </div>
            <div>
              <label className="text-xs text-gray-500">(in)</label>
              <input type="number" value={widthIn} onChange={e => setWidthIn(e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="6" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Height (ft)</label>
              <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="8" />
            </div>
            <div>
              <label className="text-xs text-gray-500">(in)</label>
              <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="6" />
            </div>
          </div>
        </div>

        {/* Weight & Overhang */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-1">Load Details</h3>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Weight (lbs)</label>
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="45000" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Front Overhang (ft)</label>
              <input type="number" value={overhangFront} onChange={e => setOverhangFront(e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Rear Overhang (ft)</label>
              <input type="number" value={overhangRear} onChange={e => setOverhangRear(e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="0" />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 col-span-1 md:col-span-2 lg:col-span-1">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 pb-1">Configuration</h3>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-700 bg-gray-800/30 cursor-pointer hover:border-gray-500 transition-colors">
            <input type="checkbox" checked={divisible} onChange={e => setDivisible(e.target.checked)} className="mt-1 w-4 h-4 rounded bg-gray-700 border-gray-500 text-orange-500 focus:ring-orange-500" />
            <div>
              <div className="text-sm font-medium text-gray-200">Divisible Load?</div>
              <div className="text-xs text-gray-500">Can the item be broken down or separated?</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-700 bg-gray-800/30 cursor-pointer hover:border-gray-500 transition-colors">
            <input type="checkbox" checked={westCoast} onChange={e => setWestCoast(e.target.checked)} className="mt-1 w-4 h-4 rounded bg-gray-700 border-gray-500 text-blue-500 focus:ring-blue-500" />
            <div>
              <div className="text-sm font-medium text-gray-200">West Coast Route?</div>
              <div className="text-xs text-gray-500">Apply higher height limits (14' vs 13'6")</div>
            </div>
          </label>
        </div>

        {/* Results */}
        <div className="space-y-4 col-span-1 md:col-span-2 lg:col-span-1 bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex flex-col justify-center text-center">
          {!status ? (
            <div className="text-gray-500">
              <div className="text-3xl mb-2">⚖️</div>
              <div>Enter details to check calculation</div>
            </div>
          ) : (
            <div className={`space-y-3 animate-in fade-in zoom-in duration-300`}>
              <div className={`text-xl font-bold p-3 rounded-lg border ${status === 'legal' ? 'bg-green-900/30 border-green-500 text-green-400' :
                  status === 'warning' ? 'bg-yellow-900/30 border-yellow-500 text-yellow-500' :
                    'bg-red-900/40 border-red-500 text-red-500'
                }`}>
                {status === 'legal' && '✅ LEGAL'}
                {status === 'warning' && '⚠️ PERMIT REQUIRED'}
                {status === 'illegal' && '⛔ ILLEGAL'}
              </div>

              <div className="text-xs font-mono text-left text-gray-300 bg-gray-900 p-2 rounded border border-gray-700 h-32 overflow-y-auto">
                <div className="font-bold text-gray-400 mb-1">ANALYSIS:</div>
                {message}
              </div>

              <div className="text-sm">
                <div className="text-gray-400 text-xs uppercase mb-1">Recommended Equipment</div>
                <div className="font-bold text-blue-300">{equipment}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
