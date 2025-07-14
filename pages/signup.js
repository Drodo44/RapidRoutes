// pages/signup.js

import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Broker');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role }
      }
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Optionally: Show confirmation, or redirect to login
      router.push('/login');
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <img src="/logo.png" alt="RapidRoutes Logo" style={{ width: 160, marginBottom: 10 }} />
        <h2 style={styles.title}>Sign Up</h2>
        <form onSubmit={handleSignup} style={{ width: "100%", marginTop: 8 }}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <select value={role} onChange={e => setRole(e.target.value)} style={styles.input}>
            <option>Admin</option>
            <option>Broker</option>
            <option>Support</option>
            <option>Apprentice</option>
          </select>
          {error && <div style={styles.error}>{error}</div>}
          <button
            type="submit"
            style={{
              ...styles.button,
              background: loading ? "#374151" : "#22d3ee",
              color: "#10151b"
            }}
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <a href="/login" style={{ color: "#22d3ee", textAlign: "center", marginTop: 14, textDecoration: "underline", fontWeight: 600 }}>
          Already have an account? Login
        </a>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    background: '#18202b',
    padding: 38,
    borderRadius: 16,
    boxShadow: '0 0 32px #00e7ff14',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 350,
    maxWidth: 400,
    width: "100%",
  },
  title: {
    color: '#22d3ee',
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.75rem',
    border: '1px solid #22d3ee',
    background: "#151d2b",
    color: "#fff",
    fontSize: "1rem",
    marginBottom: "1rem",
    outline: "none"
  },
  button: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "0.75rem",
    border: "none",
    fontWeight: 700,
    fontSize: 18,
    marginBottom: "1rem",
    cursor: "pointer",
    transition: "background 0.2s"
  },
  error: { color: "#f87171", marginBottom: 10, fontWeight: 600 }
};
