// pages/index.js
import Image from "next/image";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="text-center">
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={300}
          height={300}
          priority
        />
        <h1 className="text-3xl mt-6 font-bold text-cyan-400">Welcome to RapidRoutes</h1>
        <p className="text-lg mt-2 text-gray-300">
          Redefine the game. Outsmart the lane. Your AI-powered freight OS.
        </p>
        <div className="flex justify-center gap-6 mt-6">
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-xl font-semibold"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-xl font-semibold"
          >
            Sign Up
          </button>
        </div>
      </div>
    </main>
  );
}
