import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Step 1: Catch the recovery token from URL and sign in
  useEffect(() => {
    const tryRecovery = async () => {
      if (!router.isReady) return;
      const { access_token, type } = router.query;
      if (type === "recovery" && access_token) {
        // Sets Supabase session with the recovery token from URL
        await supabase.auth.setSession({ access_token, refresh_token: access_token });
      }
      setSessionLoaded(true);
    };
    tryRecovery();
  }, [router.isReady, router.query]);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!password || !confirm) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setSuccess("Password reset successful! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    }
  };

  if (!sessionLoaded) return null;

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
        <h2
          style={{
            color: "#22d3ee",
            fontWeight: 800,
            fontSize: "2.1rem",
            marginBottom: "1.05rem",
            letterSpacing: "0.01em",
          }}
        >
          Reset Password
        </h2>
        <form onSubmit={handleReset} style={{ marginTop: 10 }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={inputStyle}
            autoFocus
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            style={inputStyle}
          />
          {error && <div style={errorStyle}>{error}</div>}
          {success && <div style={successStyle}>{success}</div>}
          <button
            type="submit"
            style={{
              ...buttonStyle,
              background: loading
                ? "#374151"
                : "linear-gradient(90deg,#15ffea 0%,#22d3ee 100%)",
              color: "#181c22",
            }}
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
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
