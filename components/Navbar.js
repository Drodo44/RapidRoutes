import Link from "next/link";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();
  const currentPath = router.pathname;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/lanes", label: "Lanes" },
    { href: "/recap", label: "Recap" },
    { href: "/profile", label: "Profile" },
    { href: "/settings", label: "Settings" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <nav className="bg-[#0f172a] text-white px-4 py-3 shadow-md border-b border-blue-800">
      <ul className="flex space-x-6 justify-center">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>
              <span className={`cursor-pointer font-medium hover:text-cyan-400 transition ${currentPath === link.href ? "text-cyan-400" : ""}`}>
                {link.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
