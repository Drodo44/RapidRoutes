// components/TopNav.js
import Link from "next/link";

export default function TopNav() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 text-white p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img src="/logo.png" alt="RapidRoutes Logo" className="w-10 h-10" />
        <span className="text-xl font-bold text-cyan-400">RapidRoutes</span>
      </div>
      <div className="flex gap-6 text-sm">
        <Link href="/dashboard" className="hover:text-cyan-400">Dashboard</Link>
        <Link href="/lanes" className="hover:text-cyan-400">Lanes</Link>
        <Link href="/recap" className="hover:text-cyan-400">Recap</Link>
        <Link href="/settings" className="hover:text-cyan-400">Settings</Link>
        <Link href="/admin" className="hover:text-cyan-400">Admin</Link>
        <Link href="/profile" className="hover:text-cyan-400">Profile</Link>
      </div>
    </nav>
  );
}
