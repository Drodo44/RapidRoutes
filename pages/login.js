// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError || !authData?.user) {
      setError(loginError?.message || "Login failed.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .eq("active", true)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setError("Access denied. Profile not active or missing.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={{ marginBottom: 20 }}>
          <Image
            src="/logo.png"
            alt="RapidRoutes Logo"
            width={200}
            height={200}
            style={{ display: "block", margin: "0 auto" }}
          />
        </div>
        <h2 style={styles.title}>Sign In to RapidRoutes</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        {error && <p style={styles.error}>{error}</p>}
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
  title: {
    color: "#22d3ee",
    margin: "1rem 0",
    fontSize: "1.75rem",
    fontWeight: "bold",
  },
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
};
