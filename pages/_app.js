// pages/_app.js
import "../styles/globals.css";
import TopNav from "../components/TopNav";
import { useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {});
    return () => listener?.subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <TopNav />
      <Component {...pageProps} />
    </main>
  );
}
