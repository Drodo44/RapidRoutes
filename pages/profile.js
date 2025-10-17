// pages/profile.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Head from 'next/head';
import PreferredPickupsManager from '../components/PreferredPickupsManager';

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

  if (!prefs) return (
    <div className="container">
      <Head>
        <title>Profile | RapidRoutes</title>
      </Head>
      <div style={{ padding: 'var(--space-6)', fontSize: '13px', color: 'var(--text-secondary)' }}>Loading…</div>
    </div>
  );

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <Head>
        <title>Profile | RapidRoutes</title>
      </Head>

      <div className="page-header">
        <h1 className="page-title">Profile & Preferences</h1>
        <p className="page-subtitle">Manage your account settings and defaults</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 style={{ margin: 0 }}>User Preferences</h2>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label className="form-label">Theme</label>
            <select value={prefs.theme} onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })} className="form-input">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!prefs.show_rrsi}
              onChange={(e) => setPrefs({ ...prefs, show_rrsi: e.target.checked })}
            />
            Show RRSI overlays
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label className="form-label">Default Random Min (lbs)</label>
              <input
                type="number"
                value={prefs.default_weight_min || ''}
                onChange={(e) => setPrefs({ ...prefs, default_weight_min: e.target.value ? Number(e.target.value) : null })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Default Random Max (lbs)</label>
              <input
                type="number"
                value={prefs.default_weight_max || ''}
                onChange={(e) => setPrefs({ ...prefs, default_weight_max: e.target.value ? Number(e.target.value) : null })}
                className="form-input"
              />
            </div>
          </div>
          <div>
            <button onClick={save} className="btn btn-primary">Save Preferences</button>
            {msg && <span style={{ marginLeft: 'var(--space-3)', fontSize: '13px', color: 'var(--text-secondary)' }}>{msg}</span>}
          </div>
        </div>
      </div>

      {/* Preferred Pickup Locations */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>My Preferred Pickup Locations</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Your most common pickup cities</span>
        </div>
        <div className="card-body">
          <PreferredPickupsManager />
        </div>
      </div>
    </div>
  );
}
