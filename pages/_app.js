// pages/_app.js
import "../styles/globals.css";
import { useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import TopNav from "../components/TopNav";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {});
    return () => authListener?.subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <TopNav />
      <div className="px-6 py-4">
        <Component {...pageProps} />
      </div>
    </main>
  );
}
