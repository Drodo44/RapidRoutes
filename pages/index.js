// pages/index.js
import Image from "next/image";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#14181F] text-[#E2E8F0] px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* ⬆️ Increased logo size for better readability */}
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={260}
          height={260}
          priority
          className="mx-auto"
        />

        <h1 className="text-3xl font-bold">Welcome to RapidRoutes</h1>
        <p className="text-gray-400 text-sm">
          The only logistics platform where algorithmic intelligence meets AI automation
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-3 rounded-lg bg-[#4361EE] hover:bg-[#364db9] font-semibold shadow-md"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-md"
          >
            Sign Up
          </button>
        </div>
      </div>
    </main>
  );
}
