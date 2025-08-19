// components/NavBar.jsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { useState } from 'react';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/lanes', label: 'Lanes' },
  { href: '/recap', label: 'Recap' },
  { href: '/market-data', label: 'Admin Upload' },
  { href: '/admin/equipment', label: 'Equipment Codes' },
  { href: '/profile', label: 'Profile' },
];

export default function NavBar() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-800 bg-[#0f1115]/95 backdrop-blur">
      <nav className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold tracking-wide text-gray-100">RapidRoutes</span>
          <ul className="hidden md:flex items-center gap-4">
            {links.map((l) => {
              const active = router.pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`text-sm ${active ? 'text-white' : 'text-gray-300 hover:text-white'}`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <button
          onClick={logout}
          disabled={busy}
          className="text-sm rounded-lg border border-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-800 disabled:opacity-60"
          aria-busy={busy ? 'true' : 'false'}
        >
          {busy ? 'Signing out…' : 'Logout'}
        </button>
      </nav>
    </header>
  );
}
