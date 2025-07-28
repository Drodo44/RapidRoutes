import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase will detect the session from URL
      await supabase.auth.getSessionFromUrl({ storeSession: true });
      router.replace("/dashboard");
    };
    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <p>Authenticating...</p>
    </div>
  );
}
