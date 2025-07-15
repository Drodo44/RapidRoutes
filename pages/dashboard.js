import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import supabase from "../utils/supabaseClient";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!data?.user || error) {
        router.push("/login");
      } else {
        setUser(data.user);
        fetchLanes(data.user.id);
      }
    };

    const fetchLanes = async (userId) => {
      setLoading(true);
      const { data, error } = await supabase.from("lanes").select("*").eq("user_id", userId);
      setLanes(error ? [] : data || []);
      setLoading(false);
    };

    fetchUser();
    // eslint-disable-next-line
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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
          onClick={handleLogout}
          style={{
            background: "linear-gradient(90deg,#15ffea 0%,#22d3ee 100%)",
            color: "#181c22",
            padding: "0.72rem 2.1rem",
            borderRadius: 12,
            fontWeight: 700,
            border: "none",
            fontSize: "1.07rem",
            cursor: "pointer",
            boxShadow: "0 2px 14px #22d3ee11",
            marginLeft: 18,
          }}
        >
          Logout
        </button>
      </header>
      <section style={{ flex: 1, padding: "2.2rem 5vw", maxWidth: 1150, margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 18, color: "#22d3ee", letterSpacing: "0.02em" }}>
          Your Lanes
        </h2>
        {loading ? (
          <div style={{ color: "#15ffea", fontWeight: 600 }}>Loading lanes...</div>
        ) : (
          <div style={{
            overflowX: "auto",
            background: "#151d2b",
            borderRadius: 19,
            boxShadow: "0 0 28px #22d3ee08",
            padding: "2.1rem",
            marginTop: 12
          }}>
            <table style={{ width: "100%", color: "#fff", fontSize: 17, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#233056", color: "#22d3ee" }}>
                  <th style={thStyle}>Origin</th>
                  <th style={thStyle}>Destination</th>
                  <th style={thStyle}>Equipment</th>
                  <th style={thStyle}>Weight</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {lanes.length === 0 ? (
                  <tr>
                    <td style={{ padding: 18, color: "#aaa", fontWeight: 600, textAlign: "center" }} colSpan={5}>
                      No lanes found.
                    </td>
                  </tr>
                ) : (
                  lanes.map((lane) => (
                    <tr key={lane.id} style={{ borderBottom: "1px solid #232b3a" }}>
                      <td style={tdStyle}>{lane.origin}{lane.origin_state ? `, ${lane.origin_state}` : ""}</td>
                      <td style={tdStyle}>{lane.destination}{lane.dest_state ? `, ${lane.dest_state}` : ""}</td>
                      <td style={tdStyle}>{lane.equipment}</td>
                      <td style={tdStyle}>{lane.weight}</td>
                      <td style={tdStyle}>{lane.status || "Active"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 32 }}>
          <button
            style={{
              background: "linear-gradient(90deg,#15ffea 0%,#22d3ee 100%)",
              color: "#10151b",
              padding: "0.93rem 2.2rem",
              borderRadius: 11,
              fontWeight: 700,
              border: "none",
              fontSize: "1.13rem",
              cursor: "pointer",
              marginTop: 8,
              boxShadow: "0 2px 12px #15ffea18",
            }}
            onClick={() => alert("DAT CSV export coming up!")}
          >
            Export DAT CSV
          </button>
        </div>
      </section>
    </main>
  );
}

const thStyle = {
  padding: "16px 8px",
  fontWeight: 800,
  fontSize: 18,
  textAlign: "left",
  borderBottom: "2px solid #101624",
  letterSpacing: "0.01em"
};

const tdStyle = {
  padding: "12px 8px",
  fontWeight: 500,
  fontSize: 17,
  letterSpacing: "0.01em"
};
