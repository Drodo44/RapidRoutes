// pages/dashboard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.push('/login');
      } else {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, [router]);

  if (loading) return <div style={{ color: '#fff', padding: 48 }}>Loading...</div>;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#10151b',
      color: '#fff',
      padding: 48
    }}>
      <img src="/logo.png" alt="RapidRoutes Logo" style={{ width: 120, marginBottom: 10 }} />
      <h1>Welcome to RapidRoutes</h1>
      <p>Account: <b>{user?.email}</b></p>
      <div style={{
        marginTop: 40,
        background: '#20242c',
        borderRadius: 14,
        padding: 30,
        fontSize: 18,
        color: '#aefcff',
        maxWidth: 400
      }}>
        Your dashboard is under construction.<br />
        All planned features—including lane creation, AI, DAT uploads, and more—will appear here.
      </div>
    </div>
  );
}
