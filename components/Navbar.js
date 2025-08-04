import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

export default function Navbar({ user }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="bg-gray-900 text-white flex items-center justify-between px-6 py-3 shadow-md">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="RapidRoutes Logo" className="h-10 w-auto" />
        <span className="text-xl font-bold tracking-wide">RapidRoutes</span>
      </div>
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="hover:text-emerald-400 transition">Dashboard</Link>
        <Link href="/lanes" className="hover:text-emerald-400 transition">Lanes</Link>
        <Link href="/recap" className="hover:text-emerald-400 transition">Recap</Link>
        <Link href="/admin" className="hover:text-emerald-400 transition">Admin</Link>
        <Link href="/settings" className="hover:text-emerald-400 transition">Settings</Link>
        <span className="text-sm font-medium italic text-gray-300">{user?.user_metadata?.name || user?.email}</span>
        <button
          onClick={handleLogout}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded transition text-sm"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
