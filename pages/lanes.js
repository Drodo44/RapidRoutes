import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import supabase from "../utils/supabaseClient";

export default function Lanes() {
  const [user, setUser] = useState(null);
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    origin: "",
    origin_state: "",
    destination: "",
    dest_state: "",
    equipment: "",
    weight: "",
    pickup_date: "",
    delivery_date: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
      const { data, error } = await supabase.from("lanes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      setLanes(error ? [] : data || []);
      setLoading(false);
    };

    fetchUser();
    // eslint-disable-next-line
  }, []);

  // Open modal to add or edit lane
  const openModal = (lane = null) => {
    setEditing(lane);
    setForm(
      lane
        ? { ...lane }
        : {
            origin: "",
            origin_state: "",
            destination: "",
            dest_state: "",
            equipment: "",
            weight: "",
            pickup_date: "",
            delivery_date: "",
            notes: "",
          }
    );
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm({
      origin: "",
      origin_state: "",
      destination: "",
      dest_state: "",
      equipment: "",
      weight: "",
      pickup_date: "",
      delivery_date: "",
      notes: "",
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    // Basic validation
    if (!form.origin || !form.destination || !form.equipment) {
      setError("Origin, Destination, and Equipment are required.");
      return;
    }
    setLoading(true);
    let res, err;
    if (editing) {
      // Edit lane
      const { error } = await supabase
        .from("lanes")
        .update({ ...form })
        .eq("id", editing.id);
      err = error;
    } else {
      // Create lane
      const { error } = await supabase.from("lanes").insert([
        {
          ...form,
          user_id: user.id,
        },
      ]);
      err = error;
    }
    setLoading(false);
    if (err) {
      setError(err.message || "Could not save lane.");
    } else {
      setSuccess("Lane saved!");
      fetchLanes(user.id);
      closeModal();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lane?")) return;
    setLoading(true);
    const { error } = await supabase.from("lanes").delete().eq("id", id);
    setLoading(false);
    if (!error) {
      setLanes((curr) => curr.filter((l) => l.id !== id));
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#22d3ee" }}>Manage Lanes</h2>
          <button
            style={{
              background: "linear-gradient(90deg,#15ffea 0%,#22d3ee 100%)",
              color: "#10151b",
              padding: "0.89rem 2.3rem",
              borderRadius: 11,
              fontWeight: 700,
              border: "none",
              fontSize: "1.14rem",
              cursor: "pointer",
              boxShadow: "0 2px 12px #15ffea18",
            }}
            onClick={() => openModal()}
          >
            + Add Lane
          </button>
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
                  <th style={thStyle}>Actions</th>
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
                      <td style={tdStyle}>
                        <button
                          style={{
                            background: "linear-gradient(90deg,#22d3ee 0%,#15ffea 100%)",
                            color: "#10151b",
                            border: "none",
                            borderRadius: 7,
                            padding: "6px 13px",
                            marginRight: 8,
                            cursor: "pointer",
                            fontWeight: 700
                          }}
                          onClick={() => openModal(lane)}
                        >
                          Edit
                        </button>
                        <button
                          style={{
                            background: "#ff3e3e",
                            color: "#fff",
                            border: "none",
                            borderRadius: 7,
                            padding: "6px 13px",
                            cursor: "pointer",
                            fontWeight: 700
                          }}
                          onClick={() => handleDelete(lane.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {modalOpen && (
        <div style={{
          position: "fixed",
          left: 0, top: 0, width: "100vw", height: "100vh",
          background: "#0008",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            background: "#182138",
            borderRadius: 18,
            boxShadow: "0 2px 36px #22d3ee28",
            maxWidth: 440,
            width: "94vw",
            padding: "2.3rem 1.7rem",
            position: "relative"
          }}>
            <button
              onClick={closeModal}
              style={{
                position: "absolute", right: 14, top: 14,
                background: "none", border: "none", color: "#22d3ee",
                fontWeight: 800, fontSize: 22, cursor: "pointer"
              }}
              aria-label="Close"
            >×</button>
            <h3 style={{ color: "#22d3ee", fontWeight: 800, fontSize: 22, marginBottom: 18 }}>
              {editing ? "Edit Lane" : "Add Lane"}
            </h3>
            <form onSubmit={handleSave}>
              <div style={{ display: "grid", gap: 12 }}>
                <input style={inputStyle} name="origin" placeholder="Origin City" value={form.origin} onChange={handleFormChange} required />
                <input style={inputStyle} name="origin_state" placeholder="Origin State" value={form.origin_state} onChange={handleFormChange} required />
                <input style={inputStyle} name="destination" placeholder="Destination City" value={form.destination} onChange={handleFormChange} required />
                <input style={inputStyle} name="dest_state" placeholder="Destination State" value={form.dest_state} onChange={handleFormChange} required />
                <input style={inputStyle} name="equipment" placeholder="Equipment Type" value={form.equipment} onChange={handleFormChange} required />
                <input style={inputStyle} name="weight" type="number" min={0} placeholder="Weight (lbs)" value={form.weight} onChange={handleFormChange} />
                <input style={inputStyle} name="pickup_date" type="date" placeholder="Pickup Date" value={form.pickup_date} onChange={handleFormChange} />
                <input style={inputStyle} name="delivery_date" type="date" placeholder="Delivery Date" value={form.delivery_date} onChange={handleFormChange} />
                <textarea style={inputStyle} name="notes" placeholder="Notes" value={form.notes} onChange={handleFormChange} />
              </div>
              {error && <div style={errorStyle}>{error}</div>}
              {success && <div style={successStyle}>{success}</div>}
              <button
                type="submit"
                style={{
                  ...buttonStyle,
                  marginTop: 14,
                  background: loading ? "#374151" : "linear-gradient(90deg,#15ffea 0%,#22d3ee 100%)",
                  color: "#10151b",
                }}
                disabled={loading}
              >
                {loading ? "Saving..." : (editing ? "Update Lane" : "Add Lane")}
              </button>
            </form>
          </div>
        </div>
      )}
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
