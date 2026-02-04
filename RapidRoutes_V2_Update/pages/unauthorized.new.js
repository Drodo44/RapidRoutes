// pages/unauthorized.js
import Link from 'next/link';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111827] text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-red-500">Access Denied</h1>
        <p className="text-gray-300 mb-8">You do not have permission to view this page.</p>
        <Link 
          href="/dashboard" 
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
