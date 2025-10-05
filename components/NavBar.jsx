import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const router = useRouter();
  const currentPath = router.pathname;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/lanes", label: "Lanes", icon: "🛣️" },
    { href: "/recap", label: "Recap", icon: "📋" },
    { href: "/post-options", label: "Post Options", icon: "🎯" },
    { href: "/admin", label: "Admin", icon: "🔧" },
    { href: "/profile", label: "Profile", icon: "👤" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <nav style={{
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border-default)',
      padding: 'var(--space-3) var(--space-4)',
      boxShadow: 'var(--shadow-sm)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ 
          textDecoration: 'none', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-3)',
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <img 
            src="/logo.png" 
            alt="RapidRoutes" 
            style={{ 
              height: '32px', 
              width: 'auto',
              filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
            }} 
          />
          <span style={{
            fontSize: '16px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            RapidRoutes
          </span>
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <ul style={{ display: 'flex', gap: 'var(--space-1)', listStyle: 'none', margin: 0, padding: 0 }}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-3)',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    color: currentPath === link.href ? 'var(--primary)' : 'var(--text-secondary)',
                    backgroundColor: currentPath === link.href ? 'var(--primary-light)' : 'transparent'
                  }}>
                    <span>{link.icon}</span>
                    {link.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          
          {/* Theme Toggle integrated into NavBar */}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
