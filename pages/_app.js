// pages/_app.js
import "../styles/globals.css";   // ← relative path; works out-of-the-box
import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <style>{`
          /* Navbar link color override */
          .navbar a { color: #E2E8F0 !important; }
          .navbar a:hover { color: #4361EE !important; }
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
