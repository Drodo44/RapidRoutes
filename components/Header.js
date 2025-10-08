// Header.js - Navigation component for RapidRoutes
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-gray-900 border-b border-gray-800 text-gray-100 py-3 px-6">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <Link href="/">
          <div className="font-bold text-blue-500 text-xl">RapidRoutes</div>
        </Link>
        <nav>
          <ul className="flex space-x-6">
            <li>
              <Link href="/dashboard" className="hover:text-blue-400">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/lanes" className="hover:text-blue-400">
                Lanes
              </Link>
            </li>
            <li>
              <Link href="/post-options" className="hover:text-blue-400 text-blue-500">
                Post Options
              </Link>
            </li>
            <li>
              <Link href="/exports" className="hover:text-blue-400">
                Exports
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
