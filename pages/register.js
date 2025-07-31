// /pages/register.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

export default function Register() {
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.data?.session?.user;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (profile) router.push("/dashboard");
        else router.push("/signup");
      } else {
        router.push("/login");
      }
    }
    checkUser();
  }, [router]);

  return <div className="min-h-screen bg-gray-950 text-white p-6">Redirecting...</div>;
}
