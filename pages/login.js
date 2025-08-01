import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient'; // ✅ fixed relative import
import Image from 'next/image';
import logo from '../public/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg('Invalid credentials.');
      return;
    }

    const user = data.user;
    if (!user) {
      setErrorMsg('Login failed.');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      setErrorMsg('Profile not found.');
      return;
    }

    if (!profile.active) {
      setErrorMsg('Account not yet approved.');
      return;
    }

    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="bg-gray-900 p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image src={logo} alt="RapidRoutes Logo" width={200} height={200} />
        </div>
        <h1 className="text-2xl font-bold text-center text-cyan-400 mb-4">Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white"
          />
          {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
          <button
            type="submit"
            className="w-full py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-cyan-300">
          <a href="/forgot" className="hover:underline">Forgot your password?</a>
        </p>
      </div>
    </main>
  );
}
