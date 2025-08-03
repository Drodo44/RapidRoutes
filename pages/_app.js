// pages/_app.js
import "@/styles/globals.css";
import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <style>{`
          /* Force navbar links to off-white */
          .navbar a { color: #E2E8F0; }
          .navbar a:hover { color: #4361EE; }
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
