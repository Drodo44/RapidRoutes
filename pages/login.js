// pages/login.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    console.log("🚀 Login component mounted");
  }, []);

  const handleLogin = async () => {
    console.log("🔔 handleLogin fired, email:", email);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      console.log("❌ supabase error:", error.message);
      setError(error.message);
    } else {
      console.log("✅ link sent");
      setIsSent(true);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <Image src="/logo.png" alt="Logo" width={200} height={200} />
        <h2 style={styles.title}>Sign In to RapidRoutes</h2>
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSent}
          style={styles.input}
        />
        <button
          onClick={handleLogin}
          disabled={isSent}
          style={styles.button}
        >
          {isSent ? "Link Sent" : "Send Login Link"}
        </button>
        {error && <p style={styles.error}>{error}</p>}
        {isSent && <p style={styles.success}>Check your email!</p>}
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
    backgroundColor: "#0f172a",
  },
  card: {
    backgroundColor: "#111827",
    padding: "2rem",
    borderRadius: "1rem",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    textAlign: "center",
    maxWidth: "24rem",
    width: "100%",
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
    marginBottom: "1rem",
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
    marginBottom: "1rem",
  },
  back: {
    marginTop: "1rem",
    background: "#374151",
    color: "#fff",
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "0.5rem",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  error: { color: "#f87171", marginTop: "1rem" },
  success: { color: "#22c55e", marginTop: "1rem" },
};
