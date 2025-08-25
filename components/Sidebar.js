// components/Sidebar.js
import Link from "next/link";
import { useRouter } from "next/router";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lanes", label: "New Lane" },
  { href: "/recap", label: "Recap" },
  { href: "/smart-recap", label: "Smart Recap" },
  { href: "/settings", label: "Settings" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin" },
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <nav className="bg-[#111827] text-white p-4 min-h-screen w-56 flex flex-col gap-4 border-r border-gray-700">
      <div className="text-2xl font-bold mb-8 text-neon-blue text-center">
        RapidRoutes
      </div>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-4 py-2 rounded hover:bg-[#1f2937] ${
            router.pathname === item.href ? "bg-[#1f2937]" : ""
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
