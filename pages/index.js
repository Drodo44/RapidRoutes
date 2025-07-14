import Image from "next/image";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#0f172a",
      }}
    >
      <div
        style={{
          backgroundColor: "#111827",
          padding: "2.5rem 2rem",
          borderRadius: "1.2rem",
          boxShadow: "0 0 64px #22d3ee14",
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={230}
          height={230}
          priority
        />
        <h1
          style={{
            marginTop: "1.8rem",
            fontSize: "2.25rem",
            fontWeight: 800,
            color: "#22d3ee",
            letterSpacing: "0.02em",
            textShadow: "0 4px 24px #22d3ee25",
          }}
        >
          Welcome to RapidRoutes
        </h1>
        <p
          style={{
            marginTop: "1.1rem",
            fontSize: "1.2rem",
            color: "#e0eefd",
            fontWeight: 500,
            marginBottom: "2.2rem"
          }}
        >
          Redefine the game. Outsmart the lane.
          <br />
          Your all-in-one, AI-powered freight brokerage platform.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1.1rem",
          }}
        >
          <button
            onClick={() => router.push("/login")}
            style={{
              background: "#1E40AF",
              color: "#fff",
              padding: "0.82rem 2rem",
              borderRadius: "0.85rem",
              fontWeight: 700,
              border: "none",
              fontSize: "1.14rem",
              cursor: "pointer",
            }}
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup")}
            style={{
              background: "#22d3ee",
              color: "#10151b",
              padding: "0.82rem 2rem",
              borderRadius: "0.85rem",
              fontWeight: 700,
              border: "none",
              fontSize: "1.14rem",
              cursor: "pointer",
            }}
          >
            Sign Up
          </button>
        </div>
      </div>
    </main>
  );
}
