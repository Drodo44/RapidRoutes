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
    <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow-lg">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="RapidRoutes Logo" width={40} height={40} />
        <span className="font-bold text-xl text-cyan-400">RapidRoutes</span>
      </div>
      <nav className="flex gap-5 text-sm">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <Link href="/lanes" className="hover:underline">Lanes</Link>
        <Link href="/recap" className="hover:underline">Recap</Link>
        <Link href="/admin" className="hover:underline">Admin</Link>
        <Link href="/settings" className="hover:underline">Settings</Link>
        <Link href="/profile" className="hover:underline">Profile</Link>
        <button onClick={handleLogout} className="text-red-400 hover:underline">Logout</button>
      </nav>
    </header>
  );
}
