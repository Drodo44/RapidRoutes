// pages/_app.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import "../styles/globals.css";
import Layout from "../components/Layout";

function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Layout>
      <Component {...pageProps} user={user} />
    </Layout>
  );
}

export default MyApp;
