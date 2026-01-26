// pages/register.js
import { useRouter } from "next/router";

export default function Register() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center text-center" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="max-w-lg p-10 rounded-2xl shadow-2xl" style={{ background: 'var(--surface)' }}>
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--accent-primary)' }}>Register</h2>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>This page has been deprecated.</p>
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
