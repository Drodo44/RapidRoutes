import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import supabase from "../utils/supabaseClient";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [users, setUsers] = useState([]); // For admin role
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchAll = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!data?.user || error) {
        router.push("/login");
      } else {
        setUser(data.user);
        fetchProfile(data.user.id);
        // If admin, fetch all users
        fetchRole(data.user.id);
      }
    };
    fetchAll();
    // eslint-disable-next-line
  }, []);

  const fetchProfile = async (user_id) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user_id).single();
    if (data) setProfile(data);
  };

  const fetchRole = async (user_id) => {
    const { data, error } = await supabase.from("profiles").select("role").eq("id", user_id).single();
    if (data?.role === "Admin") {
      fetchAllUsers();
    }
  };

  const fetchAllUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (data) setUsers(data);
  };

  const handleChange = (e) => {
    setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const { error } = await supabase.from("profiles").update(profile).eq("id", profile.id);
    setLoading(false);
    if (error) setError(error.message || "Could not update profile.");
    else setSuccess("Profile updated!");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(120deg,#101624 60%,#172042 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.1rem 2.2rem",
          background: "#131c31",
          boxShadow: "0 3px 18px #00e7ff28",
          borderBottom: "1.5px solid #15ffea28",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image
            src="/logo.png"
            alt="RapidRoutes Logo"
            width={44}
            height={44}
            priority
            style={{
              borderRadius: "11px",
              background: "#101826",
              boxShadow: "0 2px 12px #22d3ee12",
            }}
          />
          <span style={{ fontSize: 25, fontWeight: 800, letterSpacing: ".02em", color: "#15ffea", marginLeft: 10 }}>
            RapidRoutes
          </span>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
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
          Back to Dashboard
        </button>
      </header>
      <section style={{ flex: 1, padding: "2.2rem 5vw", maxWidth: 700, margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#22d3ee", marginBottom: 26 }}>Settings & Profile</h2>
        <div style={{
          background: "#151d2b",
          borderRadius: 19,
          boxShadow: "0 0 28px #22d3ee08",
          padding: "2.2rem 2.3rem",
          margin: "0 auto",
          maxWidth: 530
        }}>
          <form onSubmit={handleUpdate} style={{ display: "grid", gap: 17 }}>
            <div style={{ color: "#22d3ee", fontWeight: 700, fontSize: 19, marginBottom: 10 }}>Your Profile</div>
            <input
              style={inputStyle}
              name="email"
              value={profile.email || ""}
              placeholder="Email"
              disabled
            />
            <input
              style={inputStyle}
              name="name"
              value={profile.name || ""}
              placeholder="Full Name"
              onChange={handleChange}
            />
            <input
              style={inputStyle}
              name="phone"
              value={profile.phone || ""}
              placeholder="Phone"
              onChange={handleChange}
            />
            <select
              style={inputStyle}
              name="role"
              value={profile.role || ""}
              onChange={handleChange}
              disabled={profile.role !== "Admin"}
              title={profile.role !== "Admin" ? "Only Admin can change role" : ""}
            >
              <option value="">Role</option>
              <option value="Admin">Admin</option>
              <option value="Broker">Broker</option>
              <option value="Support">Support</option>
              <option value="Apprentice">Apprentice</option>
            </select>
            <button
              type="submit"
              style={{
                ...buttonStyle,
                background: loading ? "#374151" : "linear-gradient(90deg,#15ffea 0%,#22d3ee 100%)",
                color: "#10151b",
              }}
              disabled={loading}
            >
              {loading ? "Saving..." : "Update Profile"}
            </button>
            {error && <div style={errorStyle}>{error}</div>}
            {success && <div style={successStyle}>{success}</div>}
          </form>
        </div>
        {/* Admin: Manage Users */}
        {profile.role === "Admin" && (
          <div style={{ marginTop: 44 }}>
            <div style={{ color: "#22d3ee", fontWeight: 700, fontSize: 19, margin: "22px 0 10px 0" }}>
              All Users (Admin Only)
            </div>
            <div style={{
              overflowX: "auto",
              background: "#151d2b",
              borderRadius: 19,
              boxShadow: "0 0 28px #22d3ee08",
              padding: "2.1rem",
              marginTop: 12
            }}>
              <table style={{ width: "100%", color: "#fff", fontSize: 15, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#233056", color: "#22d3ee" }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td style={{ padding: 18, color: "#aaa", fontWeight: 600, textAlign: "center" }} colSpan={4}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: "1px solid #232b3a" }}>
                        <td style={tdStyle}>{u.name || ""}</td>
                        <td style={tdStyle}>{u.email || ""}</td>
                        <td style={tdStyle}>{u.role || ""}</td>
                        <td style={tdStyle}>{u.phone || ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "0.77rem",
  borderRadius: "0.75rem",
  border: "1.4px solid #22d3ee",
  background: "#222d3e",
  color: "#fff",
  fontSize: "1.05rem",
  outline: "none",
  fontWeight: 600,
  marginBottom: 0,
};

const buttonStyle = {
  width: "100%",
  padding: "0.77rem",
  borderRadius: "0.8rem",
  border: "none",
  fontWeight: 700,
  fontSize: "1.12rem",
  cursor: "pointer",
  boxShadow: "0 2px 14px #22d3ee10",
  transition: "background .16s, color .16s",
};

const thStyle = {
  padding: "13px 7px",
  fontWeight: 800,
  fontSize: 15,
  textAlign: "left",
  borderBottom: "2px solid #101624",
  letterSpacing: "0.01em"
};

const tdStyle = {
  padding: "10px 7px",
  fontWeight: 500,
  fontSize: 14,
  letterSpacing: "0.01em"
};

const errorStyle = {
  color: "#f87171",
  marginTop: 12,
  marginBottom: 8,
  fontWeight: 700,
  letterSpacing: ".01em",
};
const successStyle = {
  color: "#15ffea",
  marginTop: 12,
  marginBottom: 8,
  fontWeight: 700,
  letterSpacing: ".01em",
};
