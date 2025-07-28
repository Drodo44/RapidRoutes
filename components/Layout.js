// components/Layout.js
import Link from "next/link";
import { useRouter } from "next/router";

export default function Layout({ children }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a0f1a] to-[#101a2d] text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-cyan-600/40 bg-[#0b1322] shadow-lg">
        <div className="flex-1" />
        <ul className="flex justify-center space-x-12 text-lg font-semibold">
          <li><Link href="/dashboard" className="nav-link">Dashboard</Link></li>
          <li><Link href="/lanes" className="nav-link">Lanes</Link></li>
          <li><Link href="/recap" className="nav-link">Recap</Link></li>
          <li><Link href="/settings" className="nav-link">Settings</Link></li>
          <li><Link href="/profile" className="nav-link">Profile</Link></li>
        </ul>
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => router.push("/login")}
            className="logout-btn"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
