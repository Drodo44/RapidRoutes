// pages/index.js
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
          padding: "2rem",
          borderRadius: "1rem",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          textAlign: "center",
          maxWidth: "28rem",
        }}
      >
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={300}
          height={300}
          priority
        />
        <h1
          style={{
            marginTop: "1.5rem",
            fontSize: "2.25rem",
            fontWeight: 700,
            color: "#22d3ee",
          }}
        >
          Welcome to RapidRoutes
        </h1>
        <p
          style={{
            marginTop: "1rem",
            fontSize: "1.125rem",
            color: "#d1d5db",
          }}
        >
          Redefine the game. Outsmart the lane.
          <br />
          Your all-in-one, AI-powered freight brokerage platform.
        </p>
        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
          }}
        >
          <button
            onClick={() => router.push("/login")}
            style={{
              backgroundColor: "#1E40AF",
              color: "#fff",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup")}
            style={{
              backgroundColor: "#047857",
              color: "#fff",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              fontWeight: 600,
              border: "none",
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
