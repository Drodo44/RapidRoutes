import { useState } from 'react';
import supabase from '../utils/supabaseClient';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const sendMagicLink = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setMessage('Error sending link.');
    else setMessage('Check your email for a magic link.');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col justify-center items-center">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-cyan-400 mb-4">Login</h1>
        <input
          type="email"
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 bg-gray-800 text-white rounded-lg"
        />
        <button onClick={sendMagicLink} className="w-full bg-emerald-600 hover:bg-emerald-700 py-2 rounded-xl">
          Send Magic Link
        </button>
        {message && <p className="mt-4 text-gray-300">{message}</p>}
        <p className="mt-4">
          Don’t have an account? <a href="/signup" className="text-cyan-400">Sign Up</a>
        </p>
      </div>
    </main>
  );
}
