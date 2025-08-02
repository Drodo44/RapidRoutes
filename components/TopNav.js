// components/TopNav.js
import Link from "next/link";

export default function TopNav() {
  return (
    <nav className="bg-gray-900 text-white border-b border-gray-800 px-6 py-3 flex justify-between items-center">
      <div className="text-cyan-400 font-bold text-xl">🚛 RapidRoutes</div>
      <div className="flex gap-4">
        <Link href="/dashboard" className="hover:text-emerald-400">Dashboard</Link>
        <Link href="/lanes" className="hover:text-emerald-400">Lanes</Link>
        <Link href="/recap" className="hover:text-emerald-400">Recap</Link>
        <Link href="/settings" className="hover:text-emerald-400">Settings</Link>
        <Link href="/profile" className="hover:text-emerald-400">Profile</Link>
      </div>
    </nav>
  );
}
