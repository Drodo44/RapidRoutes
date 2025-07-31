import "@/styles/globals.css";
import { useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      // Handles automatic user session persistence
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Component {...pageProps} />
    </main>
  );
}
