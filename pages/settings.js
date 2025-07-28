// /pages/settings.js
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Settings() {
  const [notification, setNotification] = useState(false);
  const [message, setMessage] = useState("");

  const saveSettings = async () => {
    const { error } = await supabase.from("settings").upsert([{ notifications: notification }]);
    setMessage(error ? "Failed to save settings." : "Settings saved!");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold mb-4 text-cyan-400">Settings</h1>
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center mb-6">
          <label htmlFor="notif-toggle" className="mr-3 font-semibold text-gray-300">
            Email Notifications
          </label>
          <input type="checkbox" id="notif-toggle" checked={notification}
            onChange={() => setNotification(!notification)} className="w-5 h-5" />
        </div>
        <button onClick={saveSettings}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
          Save Settings
        </button>
        {message && <p className="mt-4 text-cyan-400">{message}</p>}
      </div>
    </div>
  );
}
