// components/RandomizeWeightPopup.js
import { useEffect, useRef, useState } from "react";

export default function RandomizeWeightPopup({ open, initial, onClose }) {
  const [min, setMin] = useState(initial?.min || "");
  const [max, setMax] = useState(initial?.max || "");
  const [applyAll, setApplyAll] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setMin(initial?.min || "");
    setMax(initial?.max || "");
    setApplyAll(false);
  }, [initial, open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && open && onClose?.(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    const mi = Number(min), ma = Number(max);
    if (!Number.isFinite(mi) || !Number.isFinite(ma) || mi <= 0 || ma < mi) return;
    onClose?.({ min: mi, max: ma, applyAll });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div ref={ref} className="w-full max-w-sm rounded-xl border border-gray-700 bg-[#0f1115] p-4">
        <h2 className="text-lg font-semibold">Randomize Weight</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Min (lbs)" v={min} setV={setMin} />
          <Field label="Max (lbs)" v={max} setV={setMax} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
          Apply to all new lanes (this session only)
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => onClose?.(null)} className="rounded bg-gray-700 px-3 py-2 hover:bg-gray-600">
            Cancel
          </button>
          <button onClick={submit} className="rounded bg-green-600 px-3 py-2 font-semibold hover:bg-green-700">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, v, setV }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <input
        value={v}
        onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ""))}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
        inputMode="numeric"
      />
    </div>
  );
}
