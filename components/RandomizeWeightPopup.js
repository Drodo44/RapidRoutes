export default function RandomizeWeightPopup({ onClose, setRange, setGlobal, setRandomize, defaultRange }) {
  const handleApply = (applyAll = false) => {
    setRange(range);
    setGlobal(applyAll);
    setRandomize(true);
    onClose();
  };

  const [range, updateRange] = useState(defaultRange || { min: 46750, max: 48000 });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-cyan-400 text-center">Randomize Weight</h2>

        <label className="block text-sm mb-2">Min (lbs):</label>
        <input
          type="number"
          value={range.min}
          onChange={(e) => updateRange({ ...range, min: Number(e.target.value) })}
          className="input mb-4"
        />

        <label className="block text-sm mb-2">Max (lbs):</label>
        <input
          type="number"
          value={range.max}
          onChange={(e) => updateRange({ ...range, max: Number(e.target.value) })}
          className="input mb-6"
        />

        <div className="flex justify-between">
          <button onClick={() => handleApply(false)} className="bg-blue-700 hover:bg-blue-800 text-white py-2 px-4 rounded-lg font-semibold">
            Apply to This Lane Only
          </button>
          <button onClick={() => handleApply(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white py-2 px-4 rounded-lg font-semibold">
            Apply to All New Lanes
          </button>
        </div>

        <button onClick={onClose} className="mt-4 text-sm text-gray-400 hover:text-white underline block text-center">Cancel</button>
      </div>
    </div>
  );
}
