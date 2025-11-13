import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const router = useRouter();
  const currentPath = router.pathname;
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState(null);

  // Fetch user profile data
  useEffect(() => {
    async function fetchProfile() {
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('email, role, team_role')
          .eq('id', session.user.id)
          .single();
        
        if (data && !error) {
          setProfile(data);
        }
      }
    }
    fetchProfile();
  }, [session]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/lanes", label: "Lanes", icon: "🛣️" },
    { href: "/recap", label: "Recap", icon: "📋" },
    { href: "/post-options", label: "Post Options", icon: "🎯" },
    { href: "/admin", label: "Admin", icon: "🔧" },
    { href: "/team", label: "Team", icon: "�" },
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
          
          {/* User Info and Logout */}
          {profile && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-2)',
              paddingLeft: 'var(--space-3)',
              borderLeft: '1px solid var(--border-default)'
            }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '2px'
              }}>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 500,
                  color: 'var(--text-primary)' 
                }}>
                  {profile.email?.split('@')[0]}
                </span>
                <span style={{ 
                  fontSize: '10px', 
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {profile.role} {profile.team_role && `• ${profile.team_role}`}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: '12px',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--danger)',
                  backgroundColor: 'transparent',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--danger)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--danger)';
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
