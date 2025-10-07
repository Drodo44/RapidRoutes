// components/HeaderComponent.jsx
import Image from 'next/image';
import Link from 'next/link';

export default function HeaderComponent() {
  return (
    <header className="bg-gray-900 border-b border-gray-700 py-3 px-6 flex items-center justify-between">
      <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <Image 
          src="/logo.png" 
          alt="RapidRoutes Logo" 
          width={48} 
          height={48}
          className="rounded-lg"
          priority
        />
        <div>
          <div className="text-2xl font-bold text-gray-100 tracking-tight">RapidRoutes</div>
          <div className="text-gray-400 text-xs">Freight Brokerage Platform</div>
        </div>
      </Link>
      <div className="text-gray-500 text-sm font-mono">TQL Production</div>
    </header>
  );
}