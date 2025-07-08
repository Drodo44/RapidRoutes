import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>RapidRoutes – Outsmart The Lane</title>
        <meta name="description" content="RapidRoutes: The Gold Standard for Brokers" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <div style={{
        minHeight: "100vh",
        background: "#0a0f1c",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif"
      }}>
        <img src="/logo.png" alt="RapidRoutes Logo" style={{ width: 160, marginBottom: 32 }} />
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, marginBottom: 12 }}>RapidRoutes</h1>
        <p style={{ fontSize: "1.2rem", marginBottom: 32, textAlign: "center" }}>
          Redefine the game.<br />Outsmart the lane.<br />The Gold Standard for Brokers.
        </p>
        <a
          href="/login"
          style={{
            background: "#30A3FF",
            color: "#fff",
            padding: "0.75em 2em",
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: "none",
            fontSize: "1rem"
          }}
        >
          Login / Sign Up
        </a>
      </div>
    </>
  );
}
