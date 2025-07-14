import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "../utils/supabaseClient";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Broker");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Signup successful! Check your email to confirm your account.");
      setTimeout(() => router.push("/login"), 2000);
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
          padding: "2.4rem 2rem 2.1rem 2rem",
          boxShadow: "0 6px 48px #22d3ee22",
          maxWidth: 410,
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
            marginBottom: "1.05rem",
            letterSpacing: "0.01em",
          }}
        >
          Create Your Account
        </h2>
        <form onSubmit={handleSignup} style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={inputStyle}
            autoFocus
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            style={{
              ...inputStyle,
              color: "#14ffe6",
              fontWeight: 700,
              background: "#162037",
              marginBottom: "1.1rem",
            }}
          >
            <option>Admin</option>
            <option>Broker</option>
            <option>Support</option>
            <option>Apprentice</option>
          </select>
          {error && <div style={errorStyle}>{error}</div>}
          {success && <div style={successStyle}>{success}</div>}
          <button
            type="submit"
            style={{
              ...buttonStyle,
              background:
                loading
                  ? "#374151"
                  : "linear-gradient(90deg,#15ffea 0%,#22d3ee 100%)",
              color: "#181c22",
            }}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>
        <div style={{ marginTop: 16 }}>
          <span>
            Already have an account?{" "}
            <a
              href="/login"
              style={{
                color: "#22d3ee",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              Login
            </a>
          </span>
        </div>
        <button
          onClick={() => router.push("/")}
          style={{
            marginTop: 18,
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
  marginBottom: "1.1rem",
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
  marginBottom: "0.7rem",
  fontWeight: 700,
  letterSpacing: ".01em",
};
const successStyle = {
  color: "#15ffea",
  marginBottom: "0.7rem",
  fontWeight: 700,
  letterSpacing: ".01em",
};
