import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import supabase from "../utils/supabaseClient";

// Custom neon styles
const recapStyles = {
  tableWrap: {
    overflowX: "auto",
    background: "linear-gradient(110deg, #192031 50%, #132f43 100%)",
    borderRadius: 24,
    boxShadow: "0 0 40px #22d3ee25",
    padding: "2.4rem 2.1rem",
    marginTop: 18,
    marginBottom: 20,
  },
  table: {
    width: "100%",
    color: "#e0eefd",
    fontSize: 18,
    borderCollapse: "separate",
    borderSpacing: 0,
    minWidth: 950,
    background: "none"
  },
  th: {
    background: "linear-gradient(90deg,#22d3ee 50%,#15ffea 100%)",
    color: "#101826",
    fontWeight: 900,
    fontSize: 19,
    padding: "20px 9px",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottom: "3.5px solid #101624",
    letterSpacing: ".01em",
    textShadow: "0 4px 24px #22d3ee33",
  },
  td: {
    background: "rgba(31, 45, 75, 0.93)",
    color: "#fff",
    padding: "16px 8px",
    fontWeight: 600,
    fontSize: 17,
    borderBottom: "1.7px solid #22d3ee28",
    letterSpacing: ".01em",
    boxShadow: "0 1.5px 7px #15ffea12"
  },
  highlight: {
    background: "linear-gradient(90deg,#1E40AF 55%,#22d3ee 100%)",
    color: "#15ffea",
    borderRadius: 9,
    padding: "5px 8px",
    fontWeight: 900,
    letterSpacing: ".02em",
    fontSize: 17,
    textShadow: "0 2px 12px #15ffea45",
    margin: "0 2px"
  },
  equipment: {
    color: "#19ffe6",
    background: "#12273b",
    padding: "6px 11px",
    borderRadius: 8,
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: ".01em",
    boxShadow: "0 2px 8px #22d3ee10"
  },
  statusActive: {
    background: "linear-gradient(90deg,#00FFAC 40%,#18c2fc 100%)",
    color: "#13333a",
    fontWeight: 900,
    padding: "6px 13px",
    borderRadius: 10,
    fontSize: 15
  },
  notes: {
    background: "#1d2d44",
    color: "#15ffea",
    borderRadius: 8,
    padding: "7px 13px",
    fontWeight: 600,
    fontSize: 16
  }
};

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
          <h2 style={{ fontSize: 36, fontWeight: 900, color: "#22d3ee", textShadow: "0 6px 32px #22d3ee29" }}>Recap & Export</h2>
          <div>
            <button
              style={{
                background: "linear-gradient(90deg,#15ffea 0%,#22d3ee 100%)",
                color: "#10151b",
                padding: "0.98rem 2.5rem",
                borderRadius: 14,
                fontWeight: 900,
                border: "none",
                fontSize: "1.19rem",
                cursor: "pointer",
                marginRight: 16,
                boxShadow: "0 2px 14px #15ffea18",
              }}
              onClick={handleExportDAT}
            >
              Export DAT CSV
            </button>
            <button
              style={{
                background: "linear-gradient(90deg,#1E40AF 0%,#22d3ee 100%)",
                color: "#fff",
                padding: "0.98rem 2.5rem",
                borderRadius: 14,
                fontWeight: 900,
                border: "none",
                fontSize: "1.19rem",
                cursor: "pointer",
                boxShadow: "0 2px 14px #1E40AF18",
              }}
              onClick={handleExportRecap}
            >
              Export Recap Workbook
            </button>
          </div>
        </div>
        {/* Stunning Neon Recap Table */}
        <div style={recapStyles.tableWrap}>
          <table style={recapStyles.table}>
            <thead>
              <tr>
                <th style={recapStyles.th}>Origin</th>
                <th style={recapStyles.th}>Origin State</th>
                <th style={recapStyles.th}>Destination</th>
                <th style={recapStyles.th}>Dest State</th>
                <th style={recapStyles.th}>Equipment</th>
                <th style={recapStyles.th}>Weight</th>
                <th style={recapStyles.th}>Pickup</th>
                <th style={recapStyles.th}>Delivery</th>
                <th style={recapStyles.th}>Status</th>
                <th style={recapStyles.th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {lanes.length === 0 ? (
                <tr>
                  <td style={{ ...recapStyles.td, textAlign: "center" }} colSpan={10}>
                    No lanes found.
                  </td>
                </tr>
              ) : (
                lanes.map((lane, idx) => (
                  <tr key={lane.id || idx}>
                    <td style={recapStyles.td}><span style={recapStyles.highlight}>{lane.origin}</span></td>
                    <td style={recapStyles.td}>{lane.origin_state}</td>
                    <td style={recapStyles.td}><span style={recapStyles.highlight}>{lane.destination}</span></td>
                    <td style={recapStyles.td}>{lane.dest_state}</td>
                    <td style={recapStyles.td}><span style={recapStyles.equipment}>{lane.equipment}</span></td>
                    <td style={recapStyles.td}>{lane.weight}</td>
                    <td style={recapStyles.td}>{lane.pickup_date || ""}</td>
                    <td style={recapStyles.td}>{lane.delivery_date || ""}</td>
                    <td style={recapStyles.td}><span style={recapStyles.statusActive}>Active</span></td>
                    <td style={recapStyles.td}><span style={recapStyles.notes}>{lane.notes}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ color: "#aaa", marginTop: 38, fontSize: 16, textAlign: "center" }}>
          <hr style={{ border: "0", borderTop: "1.3px solid #22d3ee30", margin: "36px auto 18px auto", width: "52%" }} />
          <div>
            <Image src="/logo.png" alt="Logo" width={42} height={42} style={{ verticalAlign: "middle", borderRadius: 9, marginBottom: -10 }} />
          </div>
          <div style={{ margin: "18px 0 0 0", color: "#19ffe6", fontWeight: 700, fontSize: 17 }}>
            Created by Andrew Connellan – Logistics Account Executive at TQL HQ: Cincinnati, OH
          </div>
        </div>
      </section>
    </main>
  );
}
