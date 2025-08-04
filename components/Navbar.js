// components/Navbar.js

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" width={40} height={40} alt="RapidRoutes" />
        <h1 className="text-xl font-bold">RapidRoutes</h1>
      </div>
      <div className="flex gap-6">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <Link href="/lanes" className="hover:underline">Lanes</Link>
        <Link href="/recap" className="hover:underline">Recap</Link>
        <Link href="/admin" className="hover:underline">Admin</Link>
        <Link href="/settings" className="hover:underline">Settings</Link>
        <Link href="/profile" className="hover:underline">Profile</Link>
        <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded hover:bg-red-700">
          Logout
        </button>
      </div>
    </nav>
  );
}
