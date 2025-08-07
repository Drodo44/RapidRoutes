// pages/index.js
import Image from "next/image";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="bg-[#111827] p-10 rounded-2xl shadow-2xl text-center max-w-xl">
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={300}
          height={300}
          priority
        />
        <h1 className="mt-6 text-4xl font-bold text-cyan-400">Welcome to RapidRoutes</h1>
        <p className="mt-4 text-lg text-gray-300">
          Redefine the game. Outsmart the lane.
          <br />
          Your all-in-one, AI-powered freight brokerage platform.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Sign Up
          </button>
        </div>
      </div>
    </main>
  );
}
