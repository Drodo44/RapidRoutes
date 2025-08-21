// components/NavBar.jsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { useState, useEffect } from 'react';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/lanes', label: 'Lanes', icon: '🛣️' },
  { href: '/recap', label: 'Recap', icon: '📋' },
  { href: '/admin', label: 'Admin', icon: '⚙️', adminOnly: true },
];

export default function NavBar() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        
        // Check if user is an admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
          
        setIsAdmin(profile?.role === "Admin");
      }
    };
    
    getUser();
  }, []);

  async function logout() {
    try {
      setBusy(true);
      await supabase.auth.signOut();
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-700 bg-gray-900/95 backdrop-blur">
      <nav className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="RapidRoutes" className="h-8 w-8" />
            <div>
              <span className="font-bold text-xl tracking-wide text-blue-400">Rapid</span>
              <span className="font-bold text-xl tracking-wide text-gray-100">Routes</span>
            </div>
          </Link>
          
          {/* Desktop navigation */}
          <ul className="hidden md:flex items-center gap-6">
            {links.filter(l => !l.adminOnly || isAdmin).map((l) => {
              const active = router.pathname === l.href || 
                            (l.href !== '/dashboard' && router.pathname.startsWith(l.href));
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors
                    ${active 
                      ? 'bg-gray-800 text-white font-medium' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/60'}`}
                  >
                    <span className="inline-block text-sm mr-1">{l.icon}</span>
                    <span>{l.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden md:block text-sm text-gray-400">
              <span>{user.email?.split('@')[0]}</span>
            </div>
          )}
          
          <button
            onClick={logout}
            disabled={busy}
            className="text-sm rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-white font-medium disabled:opacity-60 transition-colors"
            aria-busy={busy ? 'true' : 'false'}
          >
            {busy ? 'Signing out…' : 'Logout'}
          </button>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden rounded-md bg-gray-800 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </nav>
      
      {/* Mobile navigation dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-900 border-b border-gray-700">
          <ul className="px-4 py-2 space-y-2">
            {links.map((l) => {
              const active = router.pathname === l.href || 
                            (l.href !== '/dashboard' && router.pathname.startsWith(l.href));
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                      active ? 'bg-gray-800 text-white font-medium' : 'text-gray-300'
                    }`}
                  >
                    <span>{l.icon}</span>
                    <span>{l.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
