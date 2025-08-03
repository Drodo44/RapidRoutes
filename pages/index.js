// pages/index.js
import Image from "next/image";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-4 text-white">
      <div className="max-w-md w-full text-center">
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={300}
          height={300}
          className="mx-auto"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-cyan-400 mt-6">
          Welcome to RapidRoutes
        </h1>
        <div className="flex justify-center gap-4 mt-6">
          <button
            className="bg-blue-700 hover:bg-blue-800 px-6 py-2 rounded-lg text-white font-semibold shadow"
            onClick={() => router.push("/login")}
          >
            Login
          </button>
          <button
            className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-lg text-white font-semibold shadow"
            onClick={() => router.push("/signup")}
          >
            Sign Up
          </button>
        </div>
      </div>
    </main>
  );
}
