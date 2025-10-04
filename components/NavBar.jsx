import Link from "next/link";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();
  const currentPath = router.pathname;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/lanes", label: "Lanes", icon: "🛣️" },
    { href: "/recap", label: "Recap", icon: "📋" },
    { href: "/profile", label: "Profile", icon: "👤" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <nav style={{
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border-default)',
      padding: 'var(--space-3) var(--space-4)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ 
          textDecoration: 'none', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--space-2)',
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}>
          <span style={{ color: 'var(--primary)' }}>Rapid</span>
          <span>Routes</span>
        </Link>
        
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
      </div>
    </nav>
  );
}
