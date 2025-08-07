// pages/index.js
import Image from "next/image";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
      <div className="bg-[#111827] p-10 rounded-2xl shadow-2xl text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="RapidRoutes Logo"
            width={200}
            height={200}
            priority
          />
        </div>
        <h1 className="text-3xl font-bold text-cyan-400 mb-2">
          Welcome to RapidRoutes
        </h1>
        <p className="text-gray-300 text-base mb-6">
          <em>Where Algorithmic Precision Meets AI Strategy.</em>
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Your all-in-one, AI-powered freight brokerage platform.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-semibold"
          >
            Sign Up
          </button>
        </div>
      </div>
    </main>
  );
}
