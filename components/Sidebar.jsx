// components/Sidebar.js
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lanes", label: "New Lane" },
  { href: "/recap", label: "Recap" },
  { href: "/smart-recap", label: "Smart Recap" },
  { href: "/settings", label: "Settings" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin" },
];

export default function Sidebar() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  };

  // Get display name and role
  const displayName = profile?.email?.split('@')[0] || user?.email?.split('@')[0] || 'User';
  const userRole = profile?.role || '';

  return (
    <nav className="bg-[#111827] text-white p-4 min-h-screen w-56 flex flex-col border-r border-gray-700">
      <div className="text-2xl font-bold mb-8 text-neon-blue text-center">
        RapidRoutes
      </div>
      
      {/* User Info Card */}
      {user && (
        <div className="mb-6 p-3 rounded-lg bg-gray-800 border border-gray-700">
          <div className="text-sm font-medium text-gray-200 truncate" title={profile?.email}>
            {displayName}
          </div>
          {userRole && (
            <div className="text-xs text-blue-400 mt-1">
              {userRole}
            </div>
          )}
        </div>
      )}
      
      {/* Navigation Links */}
      <div className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 rounded hover:bg-[#1f2937] transition-colors ${
              router.pathname === item.href ? "bg-[#1f2937]" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      
      {/* Logout Button */}
      {user && (
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-4 w-full px-4 py-2 rounded bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          title="Sign out of your account"
        >
          {loggingOut ? 'Logging out...' : '🚪 Logout'}
        </button>
      )}
    </nav>
  );
}
