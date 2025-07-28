import Image from "next/image";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="card">
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={300}
          height={300}
          priority
        />
        <h1 className="mt-6 text-4xl font-bold text-cyan-400">Welcome to RapidRoutes</h1>
        <p className="mt-4 text-lg text-gray-300">
          <span className="block font-semibold text-cyan-400">
            Redefine the game. Outsmart the lane.
          </span>
          Your all-in-one, AI-powered freight brokerage platform.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup")}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl"
          >
            Sign Up
          </button>
        </div>
        <p className="mt-6 text-sm text-gray-400">
          Created by Andrew Connellan – Logistics Account Executive<br />at TQL HQ: Cincinnati, OH
        </p>
      </div>
    </div>
  );
}
