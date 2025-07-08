import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>RapidRoutes | AI Freight Lane Genius</title>
        <meta name="description" content="The gold standard for intelligent freight brokers. DAT posting, AI-powered recap, lane management, and more." />
        <link rel="icon" href="/logo.png" />
      </Head>
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#111" }}>
        <img src="/logo.png" alt="RapidRoutes Logo" style={{ width: 150, marginBottom: 24 }} />
        <h1 style={{ color: "#00e1ff", fontSize: 36, textShadow: "0 0 8px #00e1ff" }}>RapidRoutes</h1>
        <p style={{ color: "#fff", fontSize: 20, maxWidth: 400, textAlign: "center", marginTop: 16 }}>
          Welcome to the next-gen, AI-powered freight lane platform. <br />
          <span style={{ color: "#15ff6b", fontWeight: 700 }}>
            Redefine the game. Outsmart the lane.
          </span>
        </p>
        <a href="/login" style={{ marginTop: 32, padding: "12px 28px", fontSize: 18, background: "#15ff6b", color: "#111", borderRadius: 8, textDecoration: "none", fontWeight: 700, boxShadow: "0 0 16px #15ff6b" }}>
          Login
        </a>
      </main>
    </>
  );
}
