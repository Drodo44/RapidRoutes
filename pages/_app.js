// pages/_app.js
import "../styles/globals.css";
import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <style>{`
          /* force navbar links to off-white, indigo on hover */
          .navbar a       { color:#E2E8F0 !important; }
          .navbar a:hover { color:#4361EE !important; }
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
