// pages/index.js
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center text-center p-8">
      <Image src="/logo.png" width={300} height={300} alt="RapidRoutes Logo" />
      <h1 className="text-4xl font-bold text-cyan-400 mt-4">Welcome to RapidRoutes</h1>
      <p className="mt-2 text-gray-300 text-lg">Redefine the game. Outsmart the lane. Your all-in-one freight intelligence engine.</p>

      <div className="mt-6 flex gap-4">
        <Link href="/login">
          <button className="bg-[#1E40AF] px-6 py-3 rounded-xl font-semibold hover:bg-blue-900">Login</button>
        </Link>
        <Link href="/signup">
          <button className="bg-[#047857] px-6 py-3 rounded-xl font-semibold hover:bg-emerald-800">Sign Up</button>
        </Link>
      </div>
    </main>
  );
}
