import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>RapidRoutes – Lane Intelligence Platform</title>
      </Head>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", background: "#101624"
      }}>
        <img src="/logo.png" alt="RapidRoutes Logo" style={{ maxWidth: 180, marginBottom: 24 }} />
        <h1 style={{ color: "#43c6ff", fontSize: 36, marginBottom: 12 }}>Welcome to RapidRoutes</h1>
        <p style={{ color: "#e0eefd", fontSize: 20 }}>The gold standard for intelligent freight brokers.</p>
        <div style={{ marginTop: 36 }}>
          <a href="/login" style={{
            padding: "12px 36px", borderRadius: 6, background: "#43c6ff",
            color: "#131c31", fontWeight: "bold", textDecoration: "none", fontSize: 18
          }}>
            Login to your account
          </a>
        </div>
      </div>
    </>
  );
}
