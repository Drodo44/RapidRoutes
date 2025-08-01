// pages/_app.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Hydrate session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    // Realtime session tracking
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Component {...pageProps} user={user} />
    </main>
  );
}

export default MyApp;
