// pages/index.js

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b1623]">
      <img
        src="/logo.png"
        alt="RapidRoutes Logo"
        className="w-48 mb-8 rounded-2xl shadow-xl border border-neon-blue"
        style={{ background: "#0b1623" }}
      />
      <h1 className="text-5xl font-extrabold text-neon-blue mb-4 tracking-tight text-center">
        Welcome to RapidRoutes
      </h1>
      <p className="text-xl text-gray-300 mb-8 text-center max-w-2xl">
        Redefine the game. Outsmart the lane.<br />
        Your all-in-one, AI-powered freight brokerage platform.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/login">
          <button className="bg-neon-blue hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg text-xl transition-all">
            Login
          </button>
        </Link>
        <Link href="/signup">
          <button className="bg-neon-green hover:bg-green-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg text-xl transition-all">
            Sign Up
          </button>
        </Link>
      </div>
    </div>
  );
}
