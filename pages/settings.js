// pages/settings.js

import { useState } from 'react';

export default function Settings() {
  const [notification, setNotification] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#111827] text-white">
      <h1 className="text-4xl font-bold mb-4 text-neon-blue">Settings</h1>
      <div className="bg-[#1a2236] p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center mb-6">
          <label className="mr-3 font-semibold text-gray-300" htmlFor="notif-toggle">
            Email Notifications
          </label>
          <input
            id="notif-toggle"
            type="checkbox"
            checked={notification}
            onChange={() => setNotification(!notification)}
            className="w-5 h-5"
          />
        </div>
        <button
          onClick={() => alert('Settings saved (placeholder)!')}
          className="bg-neon-blue text-white px-6 py-2 rounded-2xl mt-4 hover:bg-blue-500 transition"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
