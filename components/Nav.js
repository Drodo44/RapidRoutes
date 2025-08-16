// components/Nav.js
import Link from "next/link";
import { useRouter } from "next/router";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lanes", label: "Lanes" },
  { href: "/recap", label: "Recap" },
  { href: "/market-data", label: "Admin Upload" },
  { href: "/profile", label: "Profile" },
];

export default function Nav() {
  const { pathname } = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-gray-800 bg-[#0b0d12]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-white">RapidRoutes</Link>
        <nav className="flex items-center gap-2">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded px-3 py-1.5 text-sm ${
                pathname.startsWith(t.href)
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {t.label}
            </Link>
          ))}
          <Link href="/api/logout" className="rounded bg-red-700 px-3 py-1.5 text-sm text-white hover:bg-red-800">Logout</Link>
        </nav>
      </div>
    </header>
  );
}
