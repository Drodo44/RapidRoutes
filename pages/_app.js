// pages/login.js

import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState("magic"); // "magic" or "password"
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();

  // Cooldown logic for magic link
  function startCooldown() {
    setCooldown(60);
    let interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const handleMagicLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setIsSent(true);
      startCooldown();
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // User will be redirected by _app.js listener on SIGNED_IN
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <Image src="/logo.png" alt="Logo" width={200} height={200} />
        <h2 style={styles.title}>Login</h2>

        <div style={styles.toggleRow}>
          <button
            onClick={() => setMethod("magic")}
            style={{
              ...styles.toggleBtn,
              background: method === "magic" ? "#22d3ee" : "#1f2937",
              color: method === "magic" ? "#181826" : "#22d3ee"
            }}
            disabled={method === "magic"}
          >
            Magic Link
          </button>
          <button
            onClick={() => setMethod("password")}
            style={{
              ...styles.toggleBtn,
              background: method === "password" ? "#22d3ee" : "#1f2937",
              color: method === "password" ? "#181826" : "#22d3ee"
            }}
            disabled={method === "password"}
          >
            Password
          </button>
        </div>

        {method === "magic" ? (
          <>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isSent || loading}
              style={styles.input}
              autoFocus
            />
            <button
              onClick={handleMagicLogin}
              disabled={isSent || !email || loading || cooldown > 0}
              style={{
                ...styles.button,
                background: isSent || cooldown > 0 ? "#374151" : "#1E40AF"
              }}
            >
              {isSent ? "Link Sent" : loading ? "Sending..." : "Send Magic Link"}
            </button>
            {cooldown > 0 && (
              <div style={styles.cooldown}>
                For security purposes, you can only request this after {cooldown} seconds.
              </div>
            )}
            {error && <p style={styles.error}>{error}</p>}
            {isSent && (
              <p style={styles.success}>
                Magic login link sent! Check your email.
              </p>
            )}
          </>
        ) : (
          <form onSubmit={handlePasswordLogin} style={{ width: "100%" }}>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              autoFocus
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            <button
              type="submit"
              disabled={!email || !password || loading}
              style={{
                ...styles.button,
                background: loading ? "#374151" : "#1E40AF"
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            {error && <p style={styles.error}>{error}</p>}
          </form>
        )}

        <div style={{ marginTop: 18 }}>
          <span>
            Need an account?{" "}
            <a
              href="/signup"
              style={{ color: "#22d3ee", fontWeight: 600, textDecoration: "underline" }}
            >
              Sign Up
            </a>
          </span>
        </div>
        <button onClick={() => router.push("/")} style={styles.back}>
          Back to Home
        </button>
      </div>
    </main>
  );
}

const styles = {
  page: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#0f172a"
  },
  card: {
    backgroundColor: "#111827",
    padding: "2rem",
    borderRadius: "1rem",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    textAlign: "center",
    maxWidth: "24rem",
    width: "100%"
  },
  title: { color: "#22d3ee", margin: "1rem 0", fontSize: "1.75rem" },
  input: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "0.75rem",
    border: "1px solid #22d3ee",
    background: "#1f2937",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    marginBottom: "1rem"
  },
  button: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "0.75rem",
    background: "#1E40AF",
    color: "#fff",
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
    marginBottom: "1rem"
  },
  back: {
    marginTop: "1rem",
    background: "#374151",
    color: "#fff",
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "0.5rem",
    cursor: "pointer",
    fontSize: "0.875rem"
  },
  error: { color: "#f87171", marginTop: "1rem" },
  success: { color: "#22c55e", marginTop: "1rem" },
  cooldown: {
    color: "#ffdc6d",
    fontSize: "0.97rem",
    margin: "0.5rem 0",
    fontWeight: 600
  },
  toggleRow: {
    display: "flex",
    gap: 6,
    marginBottom: 20,
    justifyContent: "center"
  },
  toggleBtn: {
    flex: 1,
    padding: "0.55rem 0.5rem",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 16,
    cursor: "pointer"
  }
};
