// components/ProtectedRoute.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getUserAndProfile } from "../utils/getUserProfile";

export default function ProtectedRoute({ children, allow = [] }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { user, profile } = await getUserAndProfile();
      if (!user || !profile?.active) {
        router.push("/login");
        return;
      }

      if (allow.length > 0 && !allow.includes(profile.role)) {
        router.push("/unauthorized");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    check();
  }, [router, allow]);

  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-blue-400">Verifying access...</p>
      </div>
    );
  }

  return children;
}
