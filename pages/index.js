// pages/index.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      router.replace(session ? "/dashboard" : "/login");
    })();
  }, [router]);
  return null;
}
