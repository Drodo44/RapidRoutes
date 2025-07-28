// /pages/_app.js
import "../styles/globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

function Navigation({ onLogout }) {
  return (
    <nav className="flex items-center gap-6 px-8 py-4 bg-gray-900 text-white shadow-lg">
      <a href="/dashboard" className="hover:text-cyan-400">Dashboard</a>
      <a href="/lanes" className="hover:text-cyan-400">Lanes</a>
      <a href="/recap" className="hover:text-cyan-400">Recap</a>
      <a href="/settings" className="hover:text-cyan-400">Settings</a>
      <a href="/profile" className="hover:text-cyan-400">Profile</a>
      <button
        onClick={onLogout}
        className="ml-auto bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white"
      >
        Logout
      </button>
    </nav>
  );
}

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const authPages = ["/", "/login", "/signup", "/register"];

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {!authPages.includes(router.pathname) && user && (
        <Navigation onLogout={handleLogout} />
      )}
      <Component {...pageProps} />
    </main>
  );
}
