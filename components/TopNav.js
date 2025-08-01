// components/TopNav.js
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lanes", label: "New Lane" },
  { href: "/recap", label: "Recap" },
  { href: "/settings", label: "Settings" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin" },
];

export default function TopNav() {
  const router = useRouter();

  const handleLogout = async () => {
    localStorage.clear();
    await fetch("/api/logout"); // optional endpoint if needed
    router.push("/");
  };

  return (
    <nav className="w-full bg-gray-900 shadow-md px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="RapidRoutes Logo" width={40} height={40} />
        <span className="text-white text-xl font-bold tracking-tight">
          RapidRoutes
        </span>
      </div>
      <div className="flex gap-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-semibold hover:text-cyan-400 transition ${
              router.pathname === link.href ? "text-cyan-400" : "text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="bg-blue-700 hover:bg-blue-800 px-4 py-1.5 rounded-xl text-white text-sm font-semibold"
      >
        Logout
      </button>
    </nav>
  );
}
