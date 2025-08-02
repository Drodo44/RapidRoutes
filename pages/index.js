import Image from "next/image";
import logo from "../public/logo.png";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center text-center px-4">
      <div className="mb-6">
        <Image
          src={logo}
          alt="RapidRoutes Logo"
          width={300}
          height={300}
          className="mx-auto"
        />
      </div>
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">
        Welcome to RapidRoutes
      </h1>
      <div className="flex space-x-4">
        <button
          onClick={() => router.push("/login")}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          Login
        </button>
        <button
          onClick={() => router.push("/signup")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          Sign Up
        </button>
      </div>
    </main>
  );
}
