import "@/styles/globals.css";
import { useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      // Optional: add analytics, session handling, etc.
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Component {...pageProps} />
    </main>
  );
}
