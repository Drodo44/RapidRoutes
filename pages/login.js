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
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(120deg,#101624 60%,#172042 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(22,32,54,0.98)",
          borderRadius: "2rem",
          padding: "2.6rem 2rem 2.1rem 2rem",
          boxShadow: "0 6px 48px #22d3ee22",
          maxWidth: 395,
          width: "100%",
          textAlign: "center",
          border: "1.2px solid #22d3ee33",
        }}
      >
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={120}
          height={120}
          priority
          style={{
            margin: "0 auto 0.7rem auto",
            borderRadius: "0.7rem",
            background: "#151c29",
            boxShadow: "0 0 24px #22d3ee15",
          }}
        />
        <h2
          style={{
            color: "#22d3ee",
            fontWeight: 800,
            fontSize: "2.1rem",
            marginBottom: "1.1rem",
            letterSpacing: "0.01em",
          }}
        >
          Login
        </h2>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => setMethod("magic")}
            style={{
              flex: 1,
              padding: "0.65rem",
              border: "none",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 17,
              cursor: "pointer",
              background:
                method === "magic"
                  ? "linear-gradient(90deg,#15ffea 0%,#22d3ee 100%)"
                  : "#1f2937",
              color: method === "magic" ? "#10151b" : "#22d3ee",
              transition: "background .16s, color .16s",
              boxShadow:
                method === "magic"
                  ? "0 2px 16px #22d3ee19"
                  : "0 0 0 transparent",
            }}
            disabled={method === "magic"}
          >
            Magic Link
          </button>
          <button
            onClick={() => setMethod("password")}
            style={{
              flex: 1,
              padding: "0.65rem",
              border: "none",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: 17,
              cursor: "pointer",
              background:
                method === "password"
                  ? "linear-gradient(90deg,#1E40AF 60%,#22d3ee 100%)"
                  : "#1f2937",
              color: method === "password" ? "#fff" : "#22d3ee",
              transition: "background .16s, color .16s",
              boxShadow:
                method === "password"
                  ? "0 2px 16px #1E40AF19"
                  : "0 0 0 transparent",
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
              style={inputStyle}
              autoFocus
            />
            <button
              onClick={handleMagicLogin}
              disabled={isSent || !email || loading || cooldown > 0}
              style={{
                ...buttonStyle,
                background:
                  isSent || cooldown > 0
                    ? "#374151"
                    : "linear-gradient(90deg,#1E40AF 60%,#22d3ee 100%)",
                color: "#fff",
              }}
            >
              {isSent ? "Link Sent" : loading ? "Sending..." : "Send Magic Link"}
            </button>
            {cooldown > 0 && (
              <div style={cooldownStyle}>
                For security, you can only request this after {cooldown} seconds.
              </div>
            )}
            {error && <p style={errorStyle}>{error}</p>}
            {isSent && (
              <p style={successStyle}>
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
              style={inputStyle}
              autoFocus
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
            <button
              type="submit"
              disabled={!email || !password || loading}
              style={{
                ...buttonStyle,
                background: loading
                  ? "#374151"
                  : "linear-gradient(90deg,#1E40AF 60%,#22d3ee 100%)",
                color: "#fff",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            {error && <p style={errorStyle}>{error}</p>}
          </form>
        )}

        <div style={{ marginTop: 18 }}>
          <span>
            Need an account?{" "}
            <a
              href="/signup"
              style={{
                color: "#22d3ee",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              Sign Up
            </a>
          </span>
        </div>
        <button
          onClick={() => router.push("/")}
          style={{
            marginTop: 20,
            background: "#192031",
            color: "#22d3ee",
            padding: "0.54rem 1.7rem",
            border: "none",
            borderRadius: 11,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "1.04rem",
            letterSpacing: ".01em",
            boxShadow: "0 2px 8px #22d3ee08",
          }}
        >
          Back to Home
        </button>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "0.75rem",
  border: "1.5px solid #22d3ee",
  background: "#181e2e",
  color: "#fff",
  fontSize: "1.07rem",
  outline: "none",
  marginBottom: "1rem",
  marginTop: "0.2rem",
  fontWeight: 600,
  letterSpacing: ".01em",
};

const buttonStyle = {
  width: "100%",
  padding: "0.8rem",
  borderRadius: "0.8rem",
  border: "none",
  fontWeight: 700,
  fontSize: "1.12rem",
  marginBottom: "1rem",
  marginTop: 0,
  cursor: "pointer",
  boxShadow: "0 2px 14px #22d3ee15",
  transition: "background .16s, color .16s",
};

const errorStyle = {
  color: "#f87171",
  marginTop: "0.7rem",
  fontWeight: 700,
  letterSpacing: ".01em",
};
const successStyle = {
  color: "#15ffea",
  marginTop: "0.7rem",
  fontWeight: 700,
  letterSpacing: ".01em",
};
const cooldownStyle = {
  color: "#ffdc6d",
  fontSize: "0.97rem",
  margin: "0.5rem 0",
  fontWeight: 600,
};
