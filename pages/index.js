export default function Home() {
  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0f1a",
      color: "#fff"
    }}>
      <img
        src="https://raw.githubusercontent.com/Drodo44/RapidRoutes/main/public/rapidroutes_logo.png"
        alt="RapidRoutes Logo"
        style={{ maxWidth: 300, marginBottom: 40 }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <h1 style={{ fontSize: "2.8rem", fontWeight: 700, marginBottom: 20 }}>Welcome to RapidRoutes</h1>
      <p style={{ fontSize: "1.2rem", maxWidth: 600, textAlign: "center" }}>
        The next-generation, AI-powered platform for intelligent freight management.
        <br />
        <br />
        Please <b>log in</b> or <b>sign up</b> to get started.
      </p>
    </div>
  );
}
