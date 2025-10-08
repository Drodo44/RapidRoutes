// Header.js - Navigation component with links
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Header() {
  const router = useRouter();
  
  // Determine if a link is active
  const isActive = (path) => {
    return router.pathname === path ? 'text-blue-400' : 'text-gray-300 hover:text-white';
  };
  
  return (
    <header className="bg-gray-900 border-b border-gray-800 shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/dashboard">
            <span className="font-bold text-xl text-blue-500 cursor-pointer">RapidRoutes</span>
          </Link>
          
          <nav className="ml-8 hidden md:flex space-x-6">
            <Link href="/dashboard">
              <span className={`${isActive('/dashboard')} cursor-pointer text-sm font-medium`}>Dashboard</span>
            </Link>
            <Link href="/lanes">
              <span className={`${isActive('/lanes')} cursor-pointer text-sm font-medium`}>Lanes</span>
            </Link>
            <Link href="/post-options">
              <span className={`${isActive('/post-options')} cursor-pointer text-sm font-medium`}>Post Options</span>
            </Link>
            <Link href="/">
              <span className={`${isActive('/')} cursor-pointer text-sm font-medium`}>Analytics</span>
            </Link>
            <Link href="/tools">
              <span className={`${isActive('/tools')} cursor-pointer text-sm font-medium`}>Tools</span>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/profile">
            <span className="text-sm text-gray-300 hover:text-white cursor-pointer">Profile</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
