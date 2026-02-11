import Link from "next/link";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();
  const currentPath = router.pathname;

  const navLinks = [
    { href: "/dashboard", label: "📊 Dashboard" },
    { href: "/lanes", label: "🛣️ Lanes" },
    { href: "/recap", label: "📋 Recap" },
    { href: "/sales-resources", label: "🛠️ Sales Resources" },
    { href: "/profile", label: "👤 Profile" },
    { href: "/settings", label: "⚙️ Settings" },
    { href: "/admin", label: "🔐 Admin" },
  ];

  return (
    <nav
      className="px-4 py-3 fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'var(--text-primary)'
      }}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo/Brand */}
        <Link href="/dashboard">
          <span
            className="font-bold text-lg cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            RapidRoutes
          </span>
        </Link>

        {/* Navigation Links */}
        <ul className="flex space-x-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch={link.href === '/sales-resources' ? false : undefined}
              >
                <span
                  className={`cursor-pointer font-medium transition text-sm`}
                  style={{
                    color: currentPath === link.href ? '#06B6D4' : 'var(--text-primary)',
                    opacity: currentPath === link.href ? 1 : 0.8
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#06B6D4'}
                  onMouseLeave={(e) => e.target.style.color = currentPath === link.href ? '#06B6D4' : 'var(--text-primary)'}
                >
                  {link.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
