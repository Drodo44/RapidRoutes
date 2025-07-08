// pages/signup.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Broker');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    });
    if (error) {
      setError(error.message);
    } else {
      router.push('/login');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#10151b',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <img src="/logo.png" alt="RapidRoutes Logo" style={{ width: 180, marginBottom: 18 }} />
      <form onSubmit={handleSignup} style={{
        background: '#18202b',
        padding: 36,
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 2px 18px #2ec4f125'
      }}>
        <h2 style={{ color: '#fff', fontSize: 28 }}>Sign Up</h2>
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          style={{ padding: 12, borderRadius: 6, fontSize: 16, border: 'none' }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ padding: 12, borderRadius: 6, fontSize: 16, border: 'none' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ padding: 12, borderRadius: 6, fontSize: 16, border: 'none' }}
        />
        <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: 10, borderRadius: 6 }}>
          <option>Admin</option>
          <option>Broker</option>
          <option>Support</option>
          <option>Apprentice</option>
        </select>
        {error && <div style={{ color: '#ff6161', fontWeight: 600 }}>{error}</div>}
        <button type="submit" style={{
          background: '#2ec4f1',
          color: '#10151b',
          fontWeight: 700,
          padding: '12px 0',
          borderRadius: 10,
          fontSize: 18,
          border: 'none'
        }}>Sign Up</button>
        <a href="/login" style={{ color: '#82e0ff', textAlign: 'center', marginTop: 4, textDecoration: 'underline' }}>
          Already have an account? Login
        </a>
      </form>
    </div>
  );
}
