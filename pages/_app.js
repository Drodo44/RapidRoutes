// pages/_app.js
import { useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        console.log("User signed in", session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Component {...pageProps} />
    </main>
  );
}

export default MyApp;
