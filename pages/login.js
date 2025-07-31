import { useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError) {
      setError('Error loading profile.');
      return;
    }

    if (!profile.active) {
      setError('Account not yet approved.');
      return;
    }

    // Store profile info and route by role
    localStorage.setItem('userRole', profile.role);
    if (profile.role === 'Admin') router.push('/admin');
    else if (profile.role === 'Broker') router.push('/dashboard');
    else if (profile.role === 'Support') router.push('/dashboard');
    else router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="bg-gray-900 p-8 rounded-lg shadow-lg max-w-md w-full"
      >
        <h2 className="text-2xl font-bold mb-4 text-cyan-400 text-center">Login</h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 mb-4 rounded text-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 mb-4 rounded text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full p-2 bg-blue-600 rounded hover:bg-blue-700">
          Login
        </button>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        <p className="text-cyan-400 text-sm mt-4 text-center">
          <a href="/reset-password">Forgot your password?</a>
        </p>
      </form>
    </main>
  );
}
