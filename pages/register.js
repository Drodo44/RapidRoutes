// pages/register.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getUserWithRole } from "../utils/authHelpers";

export default function Register() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { role } = await getUserWithRole();
      if (role === "Admin") {
        setAllowed(true);
      } else {
        router.push("/dashboard");
      }
    };
    check();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    if (email && password && name) {
      setTimeout(() => {
        setLoading(false);
        setMessage("Registered! (Demo placeholder)");
      }, 1400);
    } else {
      setLoading(false);
      setMessage("All fields are required.");
    }
  };

  if (!allowed) return null;

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0b0b0e" }}>
      <img src="/logo.png" alt="RapidRoutes Logo" style={{ width: 120, marginBottom: 18 }} />
      <h2 style={{ color: "#00e1ff", marginBottom: 8 }}>Register for RapidRoutes</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", width: 320, background: "#181826", padding: 28, borderRadius: 12, boxShadow: "0 0 16px #15ff6b22" }}>
        <label style={{ color: "#fff", marginBottom: 4 }}>Name</label>
        <input
          type="text"
          value={name}
          required
          onChange={e => setName(e.target.value)}
          style={{ marginBottom: 12, padding: 8, borderRadius: 4, border: "none" }}
        />
        <label style={{ color: "#fff", marginBottom: 4 }}>Email</label>
        <input
          type="email"
          value={email}
          required
          onChange={e => setEmail(e.target.value)}
          style={{ marginBottom: 12, padding: 8, borderRadius: 4, border: "none" }}
        />
        <label style={{ color: "#fff", marginBottom: 4 }}>Password</label>
        <input
          type="password"
          value={password}
          required
          onChange={e => setPassword(e.target.value)}
          style={{ marginBottom: 18, padding: 8, borderRadius: 4, border: "none" }}
        />
        <button type="submit" disabled={loading} style={{ padding: 10, background: "#15ff6b", color: "#111", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 17 }}>
          {loading ? "Registering..." : "Register"}
        </button>
        {message && (
          <div style={{ color: message.includes("Registered") ? "#15ff6b" : "#ff4569", marginTop: 10 }}>
            {message}
          </div>
        )}
      </form>
      <a href="/login" style={{ color: "#00e1ff", marginTop: 22, fontWeight: 600, fontSize: 16 }}>
        Already have an account? Login
      </a>
    </main>
  );
}
