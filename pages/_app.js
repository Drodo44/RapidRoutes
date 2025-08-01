import "../styles/globals.css";
import { useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem("supabaseSession", JSON.stringify(session));
      } else {
        localStorage.removeItem("supabaseSession");
      }
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
