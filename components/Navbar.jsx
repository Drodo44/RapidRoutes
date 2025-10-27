import Link from "next/link";
import { useRouter } from "next/router";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const currentPath = router.pathname;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { href: "/dashboard", label: "📊 Dashboard" },
    { href: "/lanes", label: "🛣️ Lanes" },
    { href: "/recap", label: "📋 Recap" },
    { href: "/profile", label: "👤 Profile" },
    { href: "/settings", label: "⚙️ Settings" },
    { href: "/admin", label: "🔐 Admin" },
  ];

  return (
    <nav className="bg-[#0f172a] text-white px-4 py-3 shadow-md border-b border-blue-800 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <ul className="flex space-x-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>
                <span className={`cursor-pointer font-medium hover:text-cyan-400 transition ${currentPath === link.href ? "text-cyan-400" : ""}`}>
                  {link.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Dark/Light Mode Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-gray-700 transition-all text-xl"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        )}
      </div>
    </nav>
  );
}
