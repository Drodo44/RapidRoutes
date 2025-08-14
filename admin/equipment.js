// pages/admin/equipment.js
import { useEffect, useMemo, useState } from "react";

function Row({ item, onSave, onDelete }) {
  const [code, setCode] = useState(item.code);
  const [label, setLabel] = useState(item.label);
  const [group, setGroup] = useState(item.group || "Other");
  const changed = code !== item.code || label !== item.label || (group || "Other") !== (item.group || "Other");

  return (
    <tr className="border-t border-gray-800">
      <td className="p-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-28 rounded border border-gray-700 bg-gray-900 p-2 text-white"
        />
      </td>
      <td className="p-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded border border-gray-700 bg-gray-900 p-2 text-white"
        />
      </td>
      <td className="p-2">
        <input
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="w-44 rounded border border-gray-700 bg-gray-900 p-2 text-white"
        />
      </td>
      <td className="p-2 text-right">
        <button
          onClick={() => onSave({ prevCode: item.code, code, label, group })}
          disabled={!changed || !code || !label}
          className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={() => onDelete(item.code)}
          className="ml-2 rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

export default function EquipmentAdminPage() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState({ code: "", label: "", group: "Other" });
  const [msg, setMsg] = useState("");

  const refresh = async () => {
    setMsg("");
    const r = await fetch("/api/admin/equipment");
    const j = await r.json();
    if (!r.ok) return setMsg(j.error || "Failed to load");
    setList(j.items || []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((x) => x.code.toLowerCase().includes(t) || (x.label || "").toLowerCase().includes(t));
  }, [q, list]);

  async function create() {
    setMsg("");
    const body = { code: creating.code.toUpperCase().trim(), label: creating.label.trim(), group: creating.group.trim() || "Other" };
    if (!body.code || !body.label) return setMsg("Code and label are required.");
    const r = await fetch("/api/admin/equipment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error || "Create failed");
    setCreating({ code: "", label: "", group: "Other" });
    refresh();
  }

  async function onSave(payload) {
    setMsg("");
    const { prevCode, code, label, group } = payload;
    const r = await fetch(`/api/admin/equipment/${encodeURIComponent(prevCode)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.toUpperCase(), label, group: group || "Other" }),
    });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error || "Save failed");
    refresh();
  }

  async function onDelete(code) {
    setMsg("");
    if (!confirm(`Delete equipment ${code}?`)) return;
    const r = await fetch(`/api/admin/equipment/${encodeURIComponent(code)}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error || "Delete failed");
    refresh();
  }

  return (
    <main className="mx-auto max-w-5xl p-6 text-gray-100">
      <h1 className="mb-4 text-2xl font-bold">Equipment Codes (Admin)</h1>

      <div className="mb-4 flex items-center gap-3">
        <input
          placeholder="Search code or label…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64 rounded border border-gray-700 bg-gray-900 p-2 text-white"
        />
        {msg && <div className="text-sm text-gray-300">{msg}</div>}
      </div>

      <div className="mb-4 rounded-xl border border-gray-700 bg-[#0f1115] p-4">
        <div className="mb-2 font-semibold">Add New</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            placeholder="Code (e.g., RGN)"
            value={creating.code}
            onChange={(e) => setCreating((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
            className="rounded border border-gray-700 bg-gray-900 p-2 text-white"
          />
          <input
            placeholder="Label"
            value={creating.label}
            onChange={(e) => setCreating((s) => ({ ...s, label: e.target.value }))}
            className="rounded border border-gray-700 bg-gray-900 p-2 text-white"
          />
          <input
            placeholder="Group"
            value={creating.group}
            onChange={(e) => setCreating((s) => ({ ...s, group: e.target.value }))}
            className="rounded border border-gray-700 bg-gray-900 p-2 text-white"
          />
          <button onClick={create} className="rounded bg-green-600 px-3 py-2 font-semibold text-white hover:bg-green-700">
            Add
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-gray-700">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-900">
            <tr>
              <th className="p-2 text-left font-semibold">Code</th>
              <th className="p-2 text-left font-semibold">Label</th>
              <th className="p-2 text-left font-semibold">Group</th>
              <th className="p-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <Row key={item.code} item={item} onSave={onSave} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
