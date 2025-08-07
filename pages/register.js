// pages/register.js
import { useRouter } from "next/router";

export default function Register() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white text-center">
      <div className="max-w-lg p-10 rounded-2xl shadow-2xl bg-[#111827]">
        <h2 className="text-3xl font-bold text-cyan-400 mb-4">Register</h2>
        <p className="text-gray-300 mb-6">This page has been deprecated.</p>
        <button
          onClick={() => router.push("/signup")}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold"
        >
          Go to Signup
        </button>
      </div>
    </main>
  );
}
