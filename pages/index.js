// pages/index.js
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>RapidRoutes - Freight Intelligence</title>
      </Head>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#10151b',
        color: '#fff'
      }}>
        <img src="/logo.png" alt="RapidRoutes Logo" style={{ width: 220, marginBottom: 20 }} />
        <h1 style={{ fontSize: 36, fontWeight: 700 }}>RapidRoutes</h1>
        <p style={{ fontSize: 20, marginBottom: 40, opacity: 0.85 }}>
          Redefine the game. Outsmart the lane.
        </p>
        <a href="/login" style={{
          background: '#2ec4f1',
          color: '#10151b',
          fontWeight: 700,
          padding: '14px 40px',
          borderRadius: 12,
          textDecoration: 'none',
          fontSize: 20,
          boxShadow: '0 2px 18px #2ec4f175',
        }}>
          Login
        </a>
      </div>
    </>
  );
}

