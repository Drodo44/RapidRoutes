// pages/404.js
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center text-center p-10">
      <h1 className="text-5xl font-bold text-red-500 mb-4">404</h1>
      <p className="text-xl text-gray-300 mb-6">Page Not Found</p>
      <Link href="/" className="text-cyan-400 underline hover:text-cyan-200">Return Home</Link>
    </main>
  );
}
