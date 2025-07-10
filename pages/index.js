// pages/index.js
import Image from "next/image";

export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#0f172a",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <Image
          src="/logo.png"
          alt="RapidRoutes Logo"
          width={200}
          height={200}
          priority
        />
        <p
          style={{
            marginTop: "1rem",
            fontSize: "1.25rem",
            color: "#d1d5db",
          }}
        >
          Redefine the game. Outsmart the lane.
        </p>
      </div>
    </main>
  );
}
