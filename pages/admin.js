import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import supabase from "../utils/supabaseClient";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [users, setUsers] = useState([]);
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
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
      }
    };
    fetchAll();
    // eslint-disable-next-line
  }, []);

  const fetchProfile = async (user_id) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user_id).single();
    if (!data || error) {
      router.push("/dashboard");
    } else if (data.role !== "Admin") {
      router.push("/dashboard");
    } else {
      setProfile(data);
      fetchUsers();
      fetchLanes();
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (data) setUsers(data);
  };

  const fetchLanes = async () => {
    const { data, error } = await supabase.from("lanes").select("*");
    if (data) setLanes(data);
    setLoading(false);
  };

  // KPIs (simple example, expand as needed)
  const totalUsers = users.length;
  const totalLanes = lanes.length;
  const totalBrokers = users.filter(u => u.role === "Broker").length;
  const totalAdmins = users.filter(u => u.role === "Admin").length;

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
            RapidRoutes — Admin Dashboard
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
      <section style={{ flex: 1, padding: "2.2rem 5vw", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#22d3ee", marginBottom: 24 }}>Admin KPIs & Management</h2>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginBottom: 36 }}>
          <div style={kpiCard}>
            <div style={kpiNumber}>{totalUsers}</div>
            <div style={kpiLabel}>Total Users</div>
          </div>
          <div style={kpiCard}>
            <div style={kpiNumber}>{totalLanes}</div>
            <div style={kpiLabel}>Total Lanes</div>
          </div>
          <div style={kpiCard}>
            <div style={kpiNumber}>{totalAdmins}</div>
            <div style={kpiLabel}>Admins</div>
          </div>
          <div style={kpiCard}>
            <div style={kpiNumber}>{totalBrokers}</div>
            <div style={kpiLabel}>Brokers</div>
          </div>
        </div>
        <div style={{ marginTop: 28 }}>
          <div style={{ color: "#22d3ee", fontWeight: 700, fontSize: 19, margin: "22px 0 10px 0" }}>
            All Users
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
        <div style={{ marginTop: 44 }}>
          <div style={{ color: "#22d3ee", fontWeight: 700, fontSize: 19, margin: "22px 0 10px 0" }}>
            All Lanes (Global)
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
                  <th style={thStyle}>Origin</th>
                  <th style={thStyle}>Origin State</th>
                  <th style={thStyle}>Destination</th>
                  <th style={thStyle}>Dest State</th>
                  <th style={thStyle}>Equipment</th>
                  <th style={thStyle}>Weight</th>
                  <th style={thStyle}>Pickup</th>
                  <th style={thStyle}>Delivery</th>
                  <th style={thStyle}>Notes</th>
                  <th style={thStyle}>User</th>
                </tr>
              </thead>
              <tbody>
                {lanes.length === 0 ? (
                  <tr>
                    <td style={{ padding: 18, color: "#aaa", fontWeight: 600, textAlign: "center" }} colSpan={10}>
                      No lanes found.
                    </td>
                  </tr>
                ) : (
                  lanes.map((lane) => (
                    <tr key={lane.id} style={{ borderBottom: "1px solid #232b3a" }}>
                      <td style={tdStyle}>{lane.origin}</td>
                      <td style={tdStyle}>{lane.origin_state}</td>
                      <td style={tdStyle}>{lane.destination}</td>
                      <td style={tdStyle}>{lane.dest_state}</td>
                      <td style={tdStyle}>{lane.equipment}</td>
                      <td style={tdStyle}>{lane.weight}</td>
                      <td style={tdStyle}>{lane.pickup_date ? lane.pickup_date : ""}</td>
                      <td style={tdStyle}>{lane.delivery_date ? lane.delivery_date : ""}</td>
                      <td style={tdStyle}>{lane.notes}</td>
                      <td style={tdStyle}>{lane.user_id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

const kpiCard = {
  background: "#151d2b",
  borderRadius: 13,
  padding: "2.2rem 2.3rem 1.4rem 2.3rem",
  minWidth: 140,
  marginBottom: 18,
  boxShadow: "0 0 24px #22d3ee13",
  textAlign: "center"
};

const kpiNumber = {
  fontSize: 32,
  fontWeight: 800,
  color: "#15ffea",
  letterSpacing: ".01em",
  marginBottom: 7
};

const kpiLabel = {
  color: "#22d3ee",
  fontWeight: 700,
  fontSize: 17
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
