import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only redirect to dashboard after login, or login after logout
        if (event === "SIGNED_IN" && session) {
          if (
            router.pathname === "/login" ||
            router.pathname === "/signup" ||
            router.pathname === "/"
          ) {
            router.push("/dashboard");
          }
        }
        if (event === "SIGNED_OUT") {
          router.push("/login");
        }
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

  return <Component {...pageProps} />;
}
