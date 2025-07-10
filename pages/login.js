// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError(error.message);
    } else {
      setIsSent(true);
    }
  };

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
          width: "100%",
          maxWidth: "24rem",
        }}
      >
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={200}
          height={200}
          priority
          style={{ margin: "0 auto" }}
        />
        <h2
          style={{
            marginTop: "1rem",
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "#22d3ee",
          }}
        >
          Sign In to RapidRoutes
        </h2>
        <form onSubmit={handleLogin} style={{ marginTop: "1.5rem" }}>
          <input
            type="email"
            placeholder="Your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSent}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              border: "1px solid #22d3ee",
              backgroundColor: "#1f2937",
              color: "#fff",
              fontSize: "1rem",
              outline: "none",
              marginBottom: "1rem",
            }}
          />
          <button
            type="submit"
            disabled={isSent}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              backgroundColor: "#1E40AF",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            {isSent ? "Link Sent" : "Send Login Link"}
          </button>
        </form>
        {isSent && (
          <p style={{ color: "#22c55e", marginTop: "1rem" }}>
            Check your email for the login link!
          </p>
        )}
        {error && (
          <p style={{ color: "#f87171", marginTop: "1rem" }}>{error}</p>
        )}
        <button
          onClick={() => router.push("/")}
          style={{
            marginTop: "1.5rem",
            backgroundColor: "#374151",
            color: "#fff",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Back to Home
        </button>
      </div>
    </main>
  );
}
