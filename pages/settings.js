// pages/settings.js
import { useState } from "react";
import Head from "next/head";

export default function Settings() {
  const [notification, setNotification] = useState(false);

  return (
    <>
      <Head>
        <title>Settings | RapidRoutes</title>
      </Head>
      
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage application settings and preferences</p>
        </div>
        
        <div className="card" style={{ maxWidth: '600px' }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>Notification Preferences</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
              <input
                id="notif-toggle"
                type="checkbox"
                checked={notification}
                onChange={() => setNotification(!notification)}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Email Notifications</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Receive email updates about your lanes and loads</div>
              </div>
            </label>
            
            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              <button
                onClick={() => alert("Settings saved!")}
                className="btn btn-primary"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
