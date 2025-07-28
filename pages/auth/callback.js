import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase will detect the session from URL
      const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
      if (!error) {
        router.replace("/dashboard");
      } else {
        router.replace("/login?error=auth");
      }
    };
    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p>Authenticating...</p>
    </div>
  );
}
