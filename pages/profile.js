// pages/profile.js
// User preferences: theme (dark-only placeholder toggle), RRSI overlay toggle, default weight randomization range.

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function Profile() {
  const [prefs, setPrefs] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function run() {
      const { data: user } = await supabase.auth.getUser();
      const uid = user?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from('user_prefs').select('*').eq('user_id', uid).maybeSingle();
      if (data) setPrefs(data);
      else setPrefs({ user_id: uid, theme: 'dark', show_rrsi: false, default_weight_min: null, default_weight_max: null });
    }
    run();
  }, []);

  async function save() {
    setMsg('');
    const { data: user } = await supabase.auth.getUser();
    const uid = user?.user?.id;
    if (!uid || !prefs) return;
    const payload = { ...prefs, user_id: uid };
    const { error } = await supabase.from('user_prefs').upsert(payload, { onConflict: 'user_id' });
    if (error) setMsg(error.message || 'Save failed');
    else setMsg('Saved.');
  }

  if (!prefs) return <div className="p-6 text-sm text-gray-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 space-y-6">
      <h1 className="text-lg font-semibold text-gray-100">Profile</h1>

      <div className="rounded-xl border border-gray-800 bg-[#0f1115] p-4 space-y-3">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Theme</label>
          <select value={prefs.theme} onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })} className="inp">
            <option value="dark">dark</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={!!prefs.show_rrsi}
            onChange={(e) => setPrefs({ ...prefs, show_rrsi: e.target.checked })}
            className="accent-gray-300"
          />
          Show RRSI overlays
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Default Random Min (lbs)</label>
            <input
              type="number"
              value={prefs.default_weight_min || ''}
              onChange={(e) => setPrefs({ ...prefs, default_weight_min: e.target.value ? Number(e.target.value) : null })}
              className="inp"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Default Random Max (lbs)</label>
            <input
              type="number"
              value={prefs.default_weight_max || ''}
              onChange={(e) => setPrefs({ ...prefs, default_weight_max: e.target.value ? Number(e.target.value) : null })}
              className="inp"
            />
          </div>
        </div>
        <div>
          <button onClick={save} className="btn-primary">Save</button>
          {msg && <span className="ml-3 text-sm text-gray-300">{msg}</span>}
        </div>
      </div>

      <style jsx>{`
        .inp { @apply w-full rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500; }
        .btn-primary { @apply rounded-lg bg-gray-100 text-black font-medium px-4 py-2 hover:bg-white disabled:opacity-60; }
      `}</style>
    </div>
  );
}
