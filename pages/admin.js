// pages/admin.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getUserWithRole } from "../utils/authHelpers";

export default function Admin() {
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      const { role } = await getUserWithRole();
      if (role === "Admin") {
        setAllowed(true);
      } else {
        router.push("/dashboard");
      }
    };
    checkAccess();
  }, []);

  if (!allowed) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#111827] text-white">
      <h1 className="text-4xl font-bold mb-6 text-neon-blue drop-shadow-lg">
        RapidRoutes Admin Dashboard
      </h1>
      <div className="bg-[#1a2236] rounded-2xl shadow-2xl p-8 w-full max-w-4xl">
        <div className="text-center text-lg font-medium text-gray-300">
          Admin features coming soon.
          <br />
          You will be able to manage users, roles, and app-wide settings here.
        </div>
      </div>
    </div>
  );
}
