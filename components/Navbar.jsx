import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const router = useRouter();
  const currentPath = router.pathname;

  const navLinks = [
    { href: "/dashboard", label: "📊 Dashboard" },
    { href: "/lanes", label: "🛣️ Lanes" },
    { href: "/recap", label: "📋 Recap" },
    { href: "/profile", label: "👤 Profile" },
    { href: "/settings", label: "⚙️ Settings" },
    { href: "/admin", label: "🔐 Admin" },
  ];

  return (
    <nav 
      className="px-4 py-3 shadow-md fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border-default)',
        color: 'var(--text-primary)'
      }}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <ul className="flex space-x-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>
                <span 
                  className={`cursor-pointer font-medium transition`}
                  style={{
                    color: currentPath === link.href ? 'var(--primary)' : 'var(--text-primary)',
                    opacity: currentPath === link.href ? 1 : 0.8
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                  onMouseLeave={(e) => e.target.style.color = currentPath === link.href ? 'var(--primary)' : 'var(--text-primary)'}
                >
                  {link.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        
        {/* Theme Toggle */}
        <ThemeToggle compact />
      </div>
    </nav>
  );
}
