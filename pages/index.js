// pages/index.js
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl text-center max-w-md">
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={300}        // ← increased from 200
          height={300}       // ← increased from 200
          priority
          className="mx-auto"
        />
        <h1 className="mt-6 text-4xl font-bold text-cyan-400">
          Welcome to RapidRoutes
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          Redefine the game. Outsmart the lane.
          <br />
          Your all-in-one, AI-powered freight brokerage platform.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/login">
            <a className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold">
              Login
            </a>
          </Link>
          <Link href="/signup">
            <a className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-semibold">
              Sign Up
            </a>
          </Link>
        </div>
      </div>
    </main>
  );
}
