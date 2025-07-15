import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import supabase from "../utils/supabaseClient";

export default function Recap() {
  const [user, setUser] = useState(null);
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndLanes = async () => {
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
      const { data, error } = await supabase.from("lanes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      setLanes(error ? [] : data || []);
      setLoading(false);
    };
    fetchUserAndLanes();
    // eslint-disable-next-line
  }, []);

  // --- EXPORT FUNCTIONS ---
  const handleExportDAT = async () => {
    try {
      if (!user?.id) return;
      const res = await fetch(`/api/export/dat?user_id=${user.id}`);
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "RapidRoutes_DAT.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("DAT export failed. Please try again.");
    }
  };

  const handleExportRecap = async () => {
    try {
      if (!user?.id) return;
      const res = await fetch(`/api/export/recap?user_id=${user.id}`);
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "RapidRoutes_Recap.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Recap export failed. Please try again.");
    }
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
      <section style={{ flex: 1, padding: "2.2rem 5vw", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#22d3ee" }}>Recap & Export</h2>
          <div>
            <button
              style={{
                background: "linear-gradient(90deg,#15ffea 0%,#22d3ee 100%)",
                color: "#10151b",
                padding: "0.8rem 2.2rem",
                borderRadius: 11,
                fontWeight: 700,
                border: "none",
                fontSize: "1.08rem",
                cursor: "pointer",
                marginRight: 10,
                boxShadow: "0 2px 12px #15ffea18",
              }}
              onClick={handleExportDAT}
            >
              Export DAT CSV
            </button>
            <button
              style={{
                background: "linear-gradient(90deg,#1E40AF 0%,#22d3ee 100%)",
                color: "#fff",
                padding: "0.8rem 2.2rem",
                borderRadius: 11,
                fontWeight: 700,
                border: "none",
                fontSize: "1.08rem",
                cursor: "pointer",
                boxShadow: "0 2px 12px #1E40AF18",
              }}
              onClick={handleExportRecap}
            >
              Export Recap Workbook
            </button>
          </div>
        </div>
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
                  <th style={thStyle}>Origin State</th>
                  <th style={thStyle}>Destination</th>
                  <th style={thStyle}>Dest State</th>
                  <th style={thStyle}>Equipment</th>
                  <th style={thStyle}>Weight</th>
                  <th style={thStyle}>Pickup</th>
                  <th style={thStyle}>Delivery</th>
                  <th style={thStyle}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {lanes.length === 0 ? (
                  <tr>
                    <td style={{ padding: 18, color: "#aaa", fontWeight: 600, textAlign: "center" }} colSpan={9}>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ color: "#aaa", marginTop: 36, fontSize: 15, textAlign: "center" }}>
          <hr style={{ border: "0", borderTop: "1.3px solid #22d3ee30", margin: "32px auto 18px auto", width: "55%" }} />
          <div>
            <Image src="/logo.png" alt="Logo" width={40} height={40} style={{ verticalAlign: "middle", borderRadius: 8, marginBottom: -10 }} />
          </div>
          <div style={{ margin: "16px 0 0 0", color: "#19ffe6", fontWeight: 600 }}>
            Created by Andrew Connellan – Logistics Account Executive at TQL HQ: Cincinnati, OH
          </div>
        </div>
      </section>
    </main>
  );
}

const thStyle = {
  padding: "16px 7px",
  fontWeight: 800,
  fontSize: 17,
  textAlign: "left",
  borderBottom: "2px solid #101624",
  letterSpacing: "0.01em"
};

const tdStyle = {
  padding: "11px 7px",
  fontWeight: 500,
  fontSize: 16,
  letterSpacing: "0.01em"
};
