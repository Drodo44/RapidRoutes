import Image from "next/image";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(120deg,#101624 60%,#172042 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(22,32,54,0.97)",
          borderRadius: "2rem",
          padding: "2.8rem 2.5rem 2.5rem 2.5rem",
          boxShadow: "0 6px 64px #22d3ee2a",
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          border: "1.2px solid #22d3ee33"
        }}
      >
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={220}
          height={220}
          priority
          style={{
            margin: "0 auto 0.8rem auto",
            borderRadius: "1rem",
            boxShadow: "0 0 44px #22d3ee18",
            background: "#151c29",
          }}
        />
        <h1
          style={{
            color: "#22d3ee",
            fontWeight: 800,
            fontSize: "2.8rem",
            marginBottom: "1.1rem",
            textShadow: "0 6px 24px #22d3ee29",
            letterSpacing: "0.01em"
          }}
        >
          Welcome to RapidRoutes
        </h1>
        <div
          style={{
            color: "#e0eefd",
            fontSize: "1.24rem",
            fontWeight: 500,
            marginBottom: "2.1rem",
            lineHeight: 1.7
          }}
        >
          <span style={{ color: "#15ffea", fontWeight: 700 }}>
            Redefine the game. Outsmart the lane.
          </span>
          <br />
          Your all-in-one, AI-powered freight brokerage platform.
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            gap: "1.4rem",
            marginTop: "1.4rem",
          }}
        >
          <button
            onClick={() => router.push("/login")}
            style={{
              background: "linear-gradient(90deg,#1E40AF 60%,#22d3ee 100%)",
              color: "#fff",
              padding: "0.97rem 2.1rem",
              borderRadius: "1.15rem",
              fontWeight: 700,
              border: "none",
              fontSize: "1.19rem",
              boxShadow: "0 4px 24px #22d3ee11",
              cursor: "pointer",
              transition: "background .22s, color .22s"
            }}
          >
            Login
          </button>
          <button
            onClick={() => router.push("/signup")}
            style={{
              background: "linear-gradient(90deg,#15ffea 10%,#047857 100%)",
              color: "#181c22",
              padding: "0.97rem 2.1rem",
              borderRadius: "1.15rem",
              fontWeight: 700,
              border: "none",
              fontSize: "1.19rem",
              boxShadow: "0 4px 24px #15ffea13",
              cursor: "pointer",
              transition: "background .22s, color .22s"
            }}
          >
            Sign Up
          </button>
        </div>
        <div
          style={{
            marginTop: "2.8rem",
            color: "#39ffd9",
            fontSize: "1.04rem",
            letterSpacing: ".01em",
            fontWeight: 500,
            opacity: 0.85
          }}
        >
          Created by Andrew Connellan – Logistics Account Executive at TQL HQ: Cincinnati, OH
        </div>
      </div>
    </main>
  );
}
